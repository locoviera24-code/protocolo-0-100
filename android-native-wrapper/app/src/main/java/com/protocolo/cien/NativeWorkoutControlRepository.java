package com.protocolo.cien;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class NativeWorkoutControlRepository {
    static final String KEY_CONTROL_STATE = WorkoutNativeRepository.KEY_CONTROL_STATE;
    static final String KEY_MUTATION_QUEUE = WorkoutMutationQueue.KEY_MUTATION_QUEUE;
    private static final String KEY_LAST_SAVE_FINGERPRINT = "native_last_save_fingerprint_v1";
    private static final String KEY_LAST_SAVE_ELAPSED = "native_last_save_elapsed_v1";
    private static final int SCHEMA_VERSION = 1;
    private static final long DOUBLE_TAP_WINDOW_MS = 650L;

    private NativeWorkoutControlRepository() {}

    public static boolean isEnabled(JSONObject widgetState) {
        JSONObject flags = widgetState == null ? null : widgetState.optJSONObject("featureFlags");
        return flags != null && flags.optBoolean("nativeWorkoutControlsV1", false);
    }

    public static synchronized void syncFromWidgetState(Context context, JSONObject widgetState) {
        if (!isEnabled(widgetState)) return;
        JSONObject control = readControlState(context);
        JSONObject quick = widgetState.optJSONObject("quickLog");
        JSONObject session = widgetState.optJSONObject("workoutSession");
        put(control, "schemaVersion", SCHEMA_VERSION);
        put(control, "sessionId", session == null ? "" : session.optString("id", ""));
        put(control, "sessionStatus", session == null ? "" : session.optString("status", ""));
        put(control, "exerciseId", widgetState.optString("currentExerciseId", ""));
        put(control, "exerciseName", widgetState.optString("currentExerciseName", ""));
        put(control, "setNumber", quick == null ? 1 : Math.max(1, quick.optInt("setNumber", 1)));
        put(control, "draftReps", quick == null ? 8 : Math.max(0, quick.optInt("reps", 8)));
        put(control, "draftWeight", quick == null ? 0 : Math.max(0, quick.optDouble("weight", 0)));
        put(control, "measurementMode", quick == null ? "reps" : quick.optString("measurementMode", "reps"));
        put(control, "loadMode", quick == null ? "total" : quick.optString("loadMode", "total"));
        put(control, "unit", widgetState.optString("unit", "kg"));
        put(control, "lastComparableSet", cloneObject(widgetState.optJSONObject("lastComparableSet")));
        put(control, "historicalLoadRecord", cloneObject(widgetState.optJSONObject("historicalLoadRecord")));
        put(control, "loadGuidanceSnapshot", cloneObject(widgetState.optJSONObject("loadGuidanceSnapshot")));
        put(control, "featureFlags", cloneObject(widgetState.optJSONObject("featureFlags")));
        put(control, "settings", cloneObject(widgetState.optJSONObject("nativeWorkoutSettings")));
        put(control, "shareTargets", cloneArray(widgetState.optJSONArray("nativeShareTargets")));
        put(control, "syncState", cloneObject(widgetState.optJSONObject("nativeSyncState")));
        put(control, "clientVersion", clientVersion(widgetState));
        put(control, "pendingMutationCount", WorkoutMutationQueue.summary(context).optInt("pending", 0));
        put(control, "revision", WorkoutNativeRepository.revision(widgetState));
        put(control, "updatedAt", nowIso());
        WorkoutNativeRepository.writeControlState(context, control);
    }

    public static synchronized EnqueueResult enqueueSaveSet(
            Context context,
            JSONObject widgetState,
            JSONObject session,
            JSONObject exercise,
            JSONObject quick,
            double canonicalWeight
    ) {
        return enqueueSaveSet(context, widgetState, session, exercise, quick, canonicalWeight,
                WorkoutQuickActionReducer.SOURCE_WIDGET, WorkoutNativeRepository.revision(widgetState));
    }

    public static synchronized EnqueueResult enqueueSaveSet(
            Context context,
            JSONObject widgetState,
            JSONObject session,
            JSONObject exercise,
            JSONObject quick,
            double canonicalWeight,
            String source,
            long expectedRevision
    ) {
        if (!isEnabled(widgetState)) return EnqueueResult.disabled();
        if (WorkoutNativeRepository.revision(widgetState) != Math.max(0L, expectedRevision)) {
            return EnqueueResult.error("revision-conflict");
        }
        if (session == null || exercise == null || quick == null) return EnqueueResult.error("missing-context");
        int reps = Math.max(0, quick.optInt("reps", 0));
        String measurementMode = quick.optString("measurementMode", exercise.optString("measurementMode", "reps"));
        double durationSeconds = Math.max(0, quick.optDouble("durationSeconds", 0));
        double distanceMeters = Math.max(0, quick.optDouble("distanceMeters", 0));
        if (("reps".equals(measurementMode) || "assistance".equals(measurementMode)) && reps <= 0) return EnqueueResult.error("invalid-reps");
        if ("time".equals(measurementMode) && durationSeconds <= 0) return EnqueueResult.error("invalid-duration");
        if ("distance".equals(measurementMode) && distanceMeters <= 0) return EnqueueResult.error("invalid-distance");

        String sessionId = session.optString("id", "");
        String exerciseId = exercise.optString("exerciseId", exercise.optString("id", ""));
        int setNumber = Math.max(1, quick.optInt("setNumber", 1));
        // setNumber advances in widget state immediately after a save. Excluding it keeps
        // a repeated PendingIntent tap idempotent across that state transition.
        String fingerprint = sessionId + "|" + exerciseId + "|" + reps + "|" + canonicalWeight;
        SharedPreferences prefs = preferences(context);
        long elapsed = SystemClock.elapsedRealtime();
        long previousElapsed = prefs.getLong(KEY_LAST_SAVE_ELAPSED, Long.MIN_VALUE);
        if (isAccidentalDuplicate(fingerprint, prefs.getString(KEY_LAST_SAVE_FINGERPRINT, ""), elapsed, previousElapsed)) {
            return EnqueueResult.duplicate(findByFingerprint(readMutations(context), fingerprint));
        }

        JSONArray queue = readMutations(context);
        if (queue.length() >= WorkoutMutationQueue.MAX_MUTATIONS) return EnqueueResult.error("queue-full");
        String uuid = WorkoutNativeRepository.newMutationId();
        String setId = "set_native_" + uuid;
        JSONObject set = new JSONObject();
        put(set, "id", setId);
        put(set, "setNumber", setNumber);
        put(set, "reps", reps);
        put(set, "weight", Math.max(0, canonicalWeight));
        put(set, "weightKg", Math.max(0, canonicalWeight));
        put(set, "measurementMode", measurementMode);
        put(set, "loadMode", quick.optString("loadMode", quick.optBoolean("bodyweight", false) ? "bodyweight" : "total"));
        put(set, "durationSeconds", durationSeconds);
        put(set, "distanceMeters", distanceMeters);
        put(set, "barWeightKg", Math.max(0, quick.optDouble("barWeightKg", quick.optDouble("barWeight", 0))));
        put(set, "rir", JSONObject.NULL);
        put(set, "rpe", JSONObject.NULL);
        put(set, "bodyweight", quick.optBoolean("bodyweight", exercise.optBoolean("bodyweight", false)));
        copyIfPresent(quick, set, "measurementMode");
        copyIfPresent(quick, set, "loadMode");
        copyIfPresent(quick, set, "equipmentId");
        copyIfPresent(quick, set, "equipmentName");
        copyIfPresent(quick, set, "laterality");
        if ("assistance".equals(set.optString("loadMode", ""))) put(set, "assistanceKg", Math.max(0, canonicalWeight));
        if ("addedLoad".equals(set.optString("loadMode", ""))) put(set, "addedLoadKg", Math.max(0, canonicalWeight));
        put(set, "setType", quick.optString("setType", "working"));
        put(set, "completed", true);
        put(set, "excludeFromRecords", false);
        put(set, "excludeFromProgression", false);
        String comparisonKey = comparisonKey(widgetState, exerciseId, quick);
        put(set, "comparisonKey", comparisonKey);
        put(set, "recordEligible", true);
        put(set, "progressionEligible", true);
        put(set, "note", "Guardado desde control nativo Android");
        put(set, "savedAt", nowIso());

        JSONObject exerciseContext = new JSONObject();
        for (String key : new String[]{"id","exerciseId","name","muscle","type","unit","bodyweight","measurementMode","defaultLoadMode","equipmentId","primaryMuscles","secondaryMuscles","muscleClassificationSnapshot"}) {
            copyIfPresent(exercise, exerciseContext, key);
        }
        JSONObject payload = new JSONObject();
        put(payload, "date", session.optString("date", widgetState.optString("date", "")));
        put(payload, "dayKey", session.optString("dayKey", widgetState.optString("dayKey", "")));
        put(payload, "weekday", session.optString("weekday", widgetState.optString("weekday", "")));
        put(payload, "routine", cloneObject(session.optJSONObject("routine")));
        put(payload, "startedAt", session.optString("startedAt", nowIso()));
        put(payload, "currentExerciseIndex", Math.max(0, session.optInt("currentExerciseIndex", 0)));
        put(payload, "exercise", exerciseContext);
        put(payload, "setId", setId);
        put(payload, "values", set);
        JSONObject history = widgetState.optJSONObject("exerciseHistory");
        put(payload, "previousHistory", cloneObject(history == null ? null : history.optJSONObject(exerciseId)));
        JSONObject mutation = WorkoutQuickActionContract.create(
                WorkoutQuickActionContract.SAVE_SET,
                uuid,
                WorkoutQuickActionContract.normalizeSource(source),
                sessionId,
                exerciseId,
                nowIso(),
                clientVersion(widgetState),
                Math.max(0L, expectedRevision),
                payload
        );
        if (mutation == null) return EnqueueResult.error("invalid-payload");
        JSONObject transport = new JSONObject();
        put(transport, "dedupeFingerprint", fingerprint);
        put(transport, "undoUntilEpochMs", System.currentTimeMillis() + 10_000L);
        put(transport, "shareTargets", cloneArray(widgetState.optJSONArray("nativeShareTargets")));

        JSONObject control = readControlState(context);
        put(control, "schemaVersion", SCHEMA_VERSION);
        put(control, "sessionId", sessionId);
        put(control, "exerciseId", exerciseId);
        put(control, "exerciseName", exercise.optString("name", "Ejercicio"));
        put(control, "setNumber", setNumber + 1);
        put(control, "draftReps", reps);
        put(control, "draftWeight", quick.optDouble("weight", 0));
        put(control, "unit", widgetState.optString("unit", "kg"));
        updateProvisionalGuidance(control, set, exerciseId, comparisonKey, payload.optString("date", ""));
        put(control, "privateImportState", "pending");
        put(control, "pendingMutationCount", WorkoutMutationQueue.summary(context).optInt("pending", 0) + 1);
        put(control, "undoMutationId", uuid);
        put(control, "undoUntilEpochMs", transport.optLong("undoUntilEpochMs", 0L));
        put(control, "updatedAt", nowIso());

        if (!WorkoutMutationQueue.append(context, mutation, transport)) return EnqueueResult.error("queue-write-failed");
        boolean committed = prefs.edit()
                .putString(KEY_CONTROL_STATE, control.toString())
                .putString(KEY_LAST_SAVE_FINGERPRINT, fingerprint)
                .putLong(KEY_LAST_SAVE_ELAPSED, elapsed)
                .commit();
        return committed ? EnqueueResult.created(mutation) : EnqueueResult.error("commit-failed");
    }

    public static synchronized String bridgePayload(Context context) {
        JSONObject payload = new JSONObject();
        JSONObject state = readControlState(context);
        JSONObject timer = state.optJSONObject("timer");
        JSONObject timerRuntime = new JSONObject();
        put(timerRuntime, "timerStatus", timer == null ? "idle" : timer.optString("timerStatus", "idle"));
        put(timerRuntime, "remainingMs", WorkoutTimerController.remainingMs(timer));
        put(payload, "schemaVersion", SCHEMA_VERSION);
        put(payload, "state", state);
        put(payload, "timerRuntime", timerRuntime);
        put(payload, "mutations", WorkoutMutationQueue.pending(context));
        put(payload, "generatedAt", nowIso());
        return payload.toString();
    }

    public static synchronized boolean acknowledge(Context context, String mutationId, String importState, String error) {
        String status = "imported".equals(importState) ? "imported" : "error".equals(importState) ? "rejected" : "pending";
        if (!WorkoutMutationQueue.setStatus(context, mutationId, status, error)) return false;
        JSONObject control = readControlState(context);
        put(control, "privateImportState", importState);
        put(control, "pendingMutationCount", WorkoutMutationQueue.summary(context).optInt("pending", 0));
        put(control, "updatedAt", nowIso());
        return WorkoutNativeRepository.writeControlState(context, control);
    }

    public static synchronized EnqueueResult enqueueUndoLastSet(Context context, JSONObject widgetState, String source, long expectedRevision) {
        if (!isEnabled(widgetState)) return EnqueueResult.disabled();
        if (WorkoutNativeRepository.revision(widgetState) != Math.max(0L, expectedRevision)) {
            return EnqueueResult.error("revision-conflict");
        }
        JSONObject original = WorkoutMutationQueue.latestUndoableSave(context, System.currentTimeMillis());
        if (original == null) return EnqueueResult.error("undo-expired");
        JSONObject originalAction = WorkoutMutationQueue.action(original);
        JSONObject originalPayload = originalAction == null ? null : originalAction.optJSONObject("payload");
        String sessionId = originalAction == null ? "" : originalAction.optString("sessionId", "");
        String exerciseId = originalAction == null ? "" : originalAction.optString("exerciseId", "");
        String targetSetId = originalPayload == null ? "" : originalPayload.optString("setId", "");
        if (targetSetId.isEmpty()) return EnqueueResult.error("undo-target-missing");

        JSONObject payload = new JSONObject();
        put(payload, "setId", targetSetId);
        put(payload, "targetMutationId", WorkoutMutationQueue.id(original));
        put(payload, "previousHistory", cloneObject(originalPayload == null ? null : originalPayload.optJSONObject("previousHistory")));
        String mutationId = WorkoutNativeRepository.newMutationId();
        JSONObject compensation = WorkoutQuickActionContract.create(
                WorkoutQuickActionContract.UNDO_SET,
                mutationId,
                WorkoutQuickActionContract.normalizeSource(source),
                sessionId,
                exerciseId,
                nowIso(),
                clientVersion(widgetState),
                Math.max(0L, expectedRevision),
                payload
        );
        if (compensation == null) return EnqueueResult.error("invalid-payload");
        JSONObject transport = new JSONObject();
        put(transport, "compensatesMutationId", WorkoutMutationQueue.id(original));
        put(transport, "shareTargets", WorkoutMutationQueue.transport(original).optJSONArray("shareTargets"));
        if (!WorkoutMutationQueue.append(context, compensation, transport)) return EnqueueResult.error("queue-write-failed");
        if (!WorkoutMutationQueue.setStatus(context, WorkoutMutationQueue.id(original), "undone", "")) {
            return EnqueueResult.error("undo-status-failed");
        }
        JSONObject control = readControlState(context);
        put(control, "privateImportState", "pending");
        put(control, "pendingMutationCount", WorkoutMutationQueue.summary(context).optInt("pending", 0));
        put(control, "undoMutationId", JSONObject.NULL);
        put(control, "undoUntilEpochMs", 0L);
        put(control, "updatedAt", nowIso());
        WorkoutNativeRepository.writeControlState(context, control);
        return EnqueueResult.created(compensation);
    }

    public static synchronized void syncPendingSummary(Context context) {
        JSONObject control = readControlState(context);
        JSONObject summary = WorkoutMutationQueue.summary(context);
        put(control, "pendingMutationCount", summary.optInt("pending", 0));
        if (summary.optInt("rejected", 0) > 0) put(control, "privateImportState", "error");
        else if (summary.optInt("pending", 0) > 0) put(control, "privateImportState", "pending");
        else put(control, "privateImportState", "imported");
        put(control, "updatedAt", nowIso());
        WorkoutNativeRepository.writeControlState(context, control);
    }

    static synchronized JSONObject readControlState(Context context) {
        return WorkoutNativeRepository.readControlState(context);
    }

    static synchronized boolean updateTimer(Context context, JSONObject timer) {
        JSONObject control = readControlState(context);
        put(control, "timer", cloneObject(timer));
        put(control, "updatedAt", nowIso());
        return WorkoutNativeRepository.writeControlState(context, control);
    }

    static boolean featureEnabled(Context context, String name) {
        JSONObject flags = readControlState(context).optJSONObject("featureFlags");
        return flags != null && flags.optBoolean(name, false);
    }

    static JSONObject nativeSettings(Context context) {
        return cloneObject(readControlState(context).optJSONObject("settings"));
    }

    static synchronized JSONArray readMutations(Context context) {
        return WorkoutMutationQueue.readAll(context);
    }

    private static JSONObject defaultControlState() {
        JSONObject state = new JSONObject();
        put(state, "schemaVersion", SCHEMA_VERSION);
        put(state, "timer", new JSONObject());
        put(state, "shareTargets", new JSONArray());
        put(state, "syncState", new JSONObject());
        put(state, "pendingMutationCount", 0);
        put(state, "updatedAt", nowIso());
        return state;
    }

    private static JSONObject findByFingerprint(JSONArray queue, String fingerprint) {
        for (int index = queue.length() - 1; index >= 0; index--) {
            JSONObject record = queue.optJSONObject(index);
            if (record != null && fingerprint.equals(WorkoutMutationQueue.transport(record).optString("dedupeFingerprint", ""))) {
                return WorkoutMutationQueue.action(record);
            }
        }
        return null;
    }

    static boolean isAccidentalDuplicate(String fingerprint, String previousFingerprint, long elapsed, long previousElapsed) {
        return fingerprint != null && fingerprint.equals(previousFingerprint)
                && previousElapsed >= 0
                && elapsed >= previousElapsed
                && elapsed - previousElapsed <= DOUBLE_TAP_WINDOW_MS;
    }

    private static String clientVersion(JSONObject widgetState) {
        String explicit = widgetState == null ? "" : widgetState.optString("clientVersion", "");
        return explicit.matches("^\\d+\\.\\d+\\.\\d+\\+\\d+$") ? explicit : "2.7.0+93";
    }

    private static String comparisonKey(JSONObject widgetState, String exerciseId, JSONObject quick) {
        JSONObject snapshot = widgetState.optJSONObject("loadGuidanceSnapshot");
        if (snapshot != null && exerciseId.equals(snapshot.optString("exerciseId", ""))) {
            String existing = snapshot.optString("comparisonKey", "");
            if (existing.length() > 0) return existing;
        }
        return exerciseId + "|" + quick.optString("measurementMode", "reps") + "|"
                + quick.optString("loadMode", quick.optBoolean("bodyweight", false) ? "bodyweight" : "total") + "|"
                + quick.optString("equipmentId", "unspecified") + "||"
                + quick.optString("laterality", "bilateral") + "|" + quick.optString("repsMode", "total");
    }

    private static void updateProvisionalGuidance(JSONObject control, JSONObject set, String exerciseId, String comparisonKey, String date) {
        JSONObject compact = new JSONObject();
        String mode = set.optString("loadMode", set.optBoolean("bodyweight", false) ? "bodyweight" : "total");
        int reps = Math.max(0, set.optInt("reps", 0));
        double weight = Math.max(0, set.optDouble("weightKg", set.optDouble("weight", 0)));
        put(compact, "setId", set.optString("id", ""));
        put(compact, "exerciseId", exerciseId);
        put(compact, "comparisonKey", comparisonKey);
        put(compact, "date", date);
        put(compact, "reps", reps);
        put(compact, "weightKg", weight);
        put(compact, "addedLoadKg", "addedLoad".equals(mode) ? weight : 0);
        put(compact, "assistanceKg", "assistance".equals(mode) ? weight : 0);
        put(compact, "measurementMode", set.optString("measurementMode", "reps"));
        put(compact, "loadMode", mode);
        put(compact, "equipmentId", set.optString("equipmentId", ""));
        put(compact, "equipmentName", set.optString("equipmentName", ""));
        put(compact, "laterality", set.optString("laterality", "bilateral"));
        put(compact, "label", provisionalLabel(mode, weight, reps));
        put(control, "lastComparableSet", compact);

        JSONObject snapshot = control.optJSONObject("loadGuidanceSnapshot");
        JSONObject previousRecord = snapshot != null && comparisonKey.equals(snapshot.optString("comparisonKey", ""))
                ? snapshot.optJSONObject("record") : null;
        JSONObject record = isBetterRecord(compact, previousRecord) ? compact : cloneObject(previousRecord);
        put(control, "historicalLoadRecord", record);
        JSONObject nextSnapshot = snapshot == null ? new JSONObject() : cloneObject(snapshot);
        put(nextSnapshot, "exerciseId", exerciseId);
        put(nextSnapshot, "comparisonKey", comparisonKey);
        put(nextSnapshot, "last", compact);
        put(nextSnapshot, "record", record);
        put(nextSnapshot, "calculatedAt", nowIso());
        put(nextSnapshot, "policyVersion", 1);
        put(nextSnapshot, "provisional", true);
        put(control, "loadGuidanceSnapshot", nextSnapshot);
    }

    private static boolean isBetterRecord(JSONObject candidate, JSONObject previous) {
        if (candidate == null) return false;
        if (previous == null || previous.length() == 0) return true;
        String mode = candidate.optString("loadMode", "total");
        if ("assistance".equals(mode)) {
            double current = candidate.optDouble("assistanceKg", 0);
            double before = previous.optDouble("assistanceKg", 0);
            return current > 0 && (before <= 0 || current < before || current == before && candidate.optInt("reps", 0) > previous.optInt("reps", 0));
        }
        if ("bodyweight".equals(mode)) return candidate.optInt("reps", 0) > previous.optInt("reps", 0);
        double current = candidate.optDouble("weightKg", 0);
        double before = previous.optDouble("weightKg", 0);
        return current > before || current == before && candidate.optInt("reps", 0) > previous.optInt("reps", 0);
    }

    private static String provisionalLabel(String mode, double weight, int reps) {
        if ("bodyweight".equals(mode)) return reps + " reps · peso corporal";
        if ("assistance".equals(mode)) return formatWeight(weight) + " kg de asistencia × " + reps;
        String suffix = "perHand".equals(mode) ? " por mano" : "perSide".equals(mode) ? " por lado" : "addedLoad".equals(mode) ? " de lastre" : "";
        return formatWeight(weight) + " kg" + suffix + " × " + reps;
    }

    private static String formatWeight(double value) {
        double rounded = Math.round(Math.max(0, value) * 2d) / 2d;
        return rounded == Math.rint(rounded) ? String.valueOf((long) rounded) : String.valueOf(rounded);
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static JSONObject cloneObject(JSONObject value) {
        if (value == null) return new JSONObject();
        try { return new JSONObject(value.toString()); } catch (Exception ignored) { return new JSONObject(); }
    }

    private static JSONArray cloneArray(JSONArray value) {
        if (value == null) return new JSONArray();
        try { return new JSONArray(value.toString()); } catch (Exception ignored) { return new JSONArray(); }
    }

    private static void copyIfPresent(JSONObject source, JSONObject target, String key) {
        if (source != null && source.has(key)) put(target, key, source.opt(key));
    }

    private static String nowIso() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value == null ? JSONObject.NULL : value); } catch (Exception ignored) {}
    }

    public static final class EnqueueResult {
        public final boolean ok;
        public final boolean duplicate;
        public final boolean disabled;
        public final String error;
        public final JSONObject mutation;

        private EnqueueResult(boolean ok, boolean duplicate, boolean disabled, String error, JSONObject mutation) {
            this.ok = ok;
            this.duplicate = duplicate;
            this.disabled = disabled;
            this.error = error == null ? "" : error;
            this.mutation = mutation;
        }

        static EnqueueResult created(JSONObject mutation) { return new EnqueueResult(true, false, false, "", cloneObject(mutation)); }
        static EnqueueResult duplicate(JSONObject mutation) { return new EnqueueResult(true, true, false, "", cloneObject(mutation)); }
        static EnqueueResult disabled() { return new EnqueueResult(false, false, true, "disabled", null); }
        static EnqueueResult error(String error) { return new EnqueueResult(false, false, false, error, null); }
        public String setId() {
            JSONObject payload = mutation == null ? null : mutation.optJSONObject("payload");
            return payload == null ? "" : payload.optString("setId", "");
        }
    }
}
