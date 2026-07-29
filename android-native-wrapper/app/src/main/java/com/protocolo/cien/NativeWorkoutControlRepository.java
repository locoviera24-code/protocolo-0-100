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
import java.util.UUID;

public final class NativeWorkoutControlRepository {
    static final String KEY_CONTROL_STATE = "native_control_state_v1";
    static final String KEY_MUTATION_QUEUE = "native_mutation_queue_v1";
    private static final String KEY_LAST_SAVE_FINGERPRINT = "native_last_save_fingerprint_v1";
    private static final String KEY_LAST_SAVE_ELAPSED = "native_last_save_elapsed_v1";
    private static final int SCHEMA_VERSION = 1;
    private static final int MAX_MUTATIONS = 200;
    private static final int MAX_SHARE_TARGETS = 20;
    private static final int MAX_PAYLOAD_BYTES = 64 * 1024;
    private static final long IMPORTED_RETENTION_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final long DOUBLE_TAP_WINDOW_MS = 1_200L;

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
        put(control, "unit", widgetState.optString("unit", "kg"));
        put(control, "lastComparableSet", cloneObject(widgetState.optJSONObject("lastComparableSet")));
        put(control, "historicalLoadRecord", cloneObject(widgetState.optJSONObject("historicalLoadRecord")));
        put(control, "loadGuidanceSnapshot", cloneObject(widgetState.optJSONObject("loadGuidanceSnapshot")));
        put(control, "featureFlags", cloneObject(widgetState.optJSONObject("featureFlags")));
        put(control, "settings", cloneObject(widgetState.optJSONObject("nativeWorkoutSettings")));
        put(control, "shareTargets", cloneArray(widgetState.optJSONArray("nativeShareTargets")));
        put(control, "syncState", cloneObject(widgetState.optJSONObject("nativeSyncState")));
        put(control, "pendingMutationCount", pendingCount(readMutations(context)));
        put(control, "updatedAt", nowIso());
        preferences(context).edit().putString(KEY_CONTROL_STATE, control.toString()).commit();
    }

    public static synchronized EnqueueResult enqueueSaveSet(
            Context context,
            JSONObject widgetState,
            JSONObject session,
            JSONObject exercise,
            JSONObject quick,
            double canonicalWeight
    ) {
        if (!isEnabled(widgetState)) return EnqueueResult.disabled();
        if (session == null || exercise == null || quick == null) return EnqueueResult.error("missing-context");
        int reps = Math.max(0, quick.optInt("reps", 0));
        if (reps <= 0) return EnqueueResult.error("invalid-reps");

        String sessionId = session.optString("id", "");
        String exerciseId = exercise.optString("exerciseId", exercise.optString("id", ""));
        int setNumber = Math.max(1, quick.optInt("setNumber", 1));
        // setNumber advances in widget state immediately after a save. Excluding it keeps
        // a repeated PendingIntent tap idempotent across that state transition.
        String fingerprint = sessionId + "|" + exerciseId + "|" + reps + "|" + canonicalWeight;
        SharedPreferences prefs = preferences(context);
        long elapsed = SystemClock.elapsedRealtime();
        long previousElapsed = prefs.getLong(KEY_LAST_SAVE_ELAPSED, Long.MIN_VALUE);
        if (fingerprint.equals(prefs.getString(KEY_LAST_SAVE_FINGERPRINT, ""))
                && previousElapsed >= 0
                && elapsed >= previousElapsed
                && elapsed - previousElapsed <= DOUBLE_TAP_WINDOW_MS) {
            return EnqueueResult.duplicate(findByFingerprint(readMutations(context), fingerprint));
        }

        JSONArray queue = prune(readMutations(context), System.currentTimeMillis());
        if (queue.length() >= MAX_MUTATIONS) return EnqueueResult.error("queue-full");
        String uuid = UUID.randomUUID().toString();
        String setId = "set_native_" + uuid;
        JSONObject set = new JSONObject();
        put(set, "id", setId);
        put(set, "setNumber", setNumber);
        put(set, "reps", reps);
        put(set, "weight", Math.max(0, canonicalWeight));
        put(set, "weightKg", Math.max(0, canonicalWeight));
        put(set, "rir", JSONObject.NULL);
        put(set, "rpe", JSONObject.NULL);
        put(set, "bodyweight", quick.optBoolean("bodyweight", exercise.optBoolean("bodyweight", false)));
        copyIfPresent(quick, set, "measurementMode");
        copyIfPresent(quick, set, "loadMode");
        copyIfPresent(quick, set, "equipmentId");
        copyIfPresent(quick, set, "equipmentName");
        copyIfPresent(quick, set, "laterality");
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
        put(payload, "set", set);
        if (payload.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
            return EnqueueResult.error("payload-too-large");
        }

        JSONArray mutationShareTargets = mutationShareTargets(widgetState.optJSONArray("nativeShareTargets"), sessionId, setId);
        NativeWorkoutMutation model = new NativeWorkoutMutation(
                "native_mutation_" + uuid,
                "save_set",
                sessionId,
                exerciseId,
                setId,
                payload,
                mutationShareTargets
        );
        JSONObject mutation = model.toJson();
        put(mutation, "dedupeFingerprint", fingerprint);
        if (mutation.toString().getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
            return EnqueueResult.error("payload-too-large");
        }
        queue.put(mutation);

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
        put(control, "shareTargets", cloneArray(mutationShareTargets));
        JSONObject shareState = new JSONObject();
        put(shareState, "total", mutationShareTargets.length());
        put(shareState, "synced", 0);
        put(shareState, "pending", mutationShareTargets.length());
        put(shareState, "errors", 0);
        put(control, "syncState", shareState);
        put(control, "pendingMutationCount", pendingCount(queue));
        put(control, "updatedAt", nowIso());

        boolean committed = prefs.edit()
                .putString(KEY_MUTATION_QUEUE, queue.toString())
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
        put(payload, "mutations", readMutations(context));
        put(payload, "generatedAt", nowIso());
        return payload.toString();
    }

    public static synchronized boolean acknowledge(Context context, String mutationId, String importState, String error) {
        if (mutationId == null || mutationId.length() == 0) return false;
        JSONArray queue = readMutations(context);
        boolean found = false;
        for (int index = 0; index < queue.length(); index++) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutation == null || !mutationId.equals(mutation.optString("id", ""))) continue;
            put(mutation, "privateImportState", validImportState(importState));
            put(mutation, "attempts", Math.max(0, mutation.optInt("attempts", 0)) + 1);
            put(mutation, "lastError", error == null || error.trim().length() == 0 ? JSONObject.NULL : error.trim());
            put(mutation, "updatedAt", nowIso());
            found = true;
            break;
        }
        if (!found) return false;
        queue = prune(queue, System.currentTimeMillis());
        JSONObject control = readControlState(context);
        put(control, "privateImportState", validImportState(importState));
        put(control, "pendingMutationCount", pendingCount(queue));
        put(control, "updatedAt", nowIso());
        return preferences(context).edit()
                .putString(KEY_MUTATION_QUEUE, queue.toString())
                .putString(KEY_CONTROL_STATE, control.toString())
                .commit();
    }

    static synchronized JSONObject readControlState(Context context) {
        String raw = preferences(context).getString(KEY_CONTROL_STATE, "");
        try { return raw == null || raw.length() == 0 ? defaultControlState() : new JSONObject(raw); }
        catch (Exception ignored) { return defaultControlState(); }
    }

    static synchronized boolean updateTimer(Context context, JSONObject timer) {
        JSONObject control = readControlState(context);
        put(control, "timer", cloneObject(timer));
        put(control, "updatedAt", nowIso());
        return preferences(context).edit().putString(KEY_CONTROL_STATE, control.toString()).commit();
    }

    static boolean featureEnabled(Context context, String name) {
        JSONObject flags = readControlState(context).optJSONObject("featureFlags");
        return flags != null && flags.optBoolean(name, false);
    }

    static JSONObject nativeSettings(Context context) {
        return cloneObject(readControlState(context).optJSONObject("settings"));
    }

    static synchronized JSONArray readMutations(Context context) {
        String raw = preferences(context).getString(KEY_MUTATION_QUEUE, "");
        try { return raw == null || raw.length() == 0 ? new JSONArray() : new JSONArray(raw); }
        catch (Exception ignored) { return new JSONArray(); }
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

    private static JSONArray prune(JSONArray source, long now) {
        JSONArray retained = new JSONArray();
        for (int index = 0; index < source.length(); index++) {
            JSONObject mutation = source.optJSONObject(index);
            if (mutation == null) continue;
            boolean imported = "imported".equals(mutation.optString("privateImportState", "pending"));
            long createdAt = mutation.optLong("createdAtEpochMs", now);
            if (imported && now - createdAt > IMPORTED_RETENTION_MS) continue;
            retained.put(mutation);
        }
        if (retained.length() <= MAX_MUTATIONS) return retained;
        JSONArray limited = new JSONArray();
        int start = retained.length() - MAX_MUTATIONS;
        for (int index = start; index < retained.length(); index++) limited.put(retained.opt(index));
        return limited;
    }

    private static int pendingCount(JSONArray queue) {
        int count = 0;
        for (int index = 0; index < queue.length(); index++) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutation != null && !"imported".equals(mutation.optString("privateImportState", "pending"))) count++;
        }
        return count;
    }

    private static JSONObject findByFingerprint(JSONArray queue, String fingerprint) {
        for (int index = queue.length() - 1; index >= 0; index--) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutation != null && fingerprint.equals(mutation.optString("dedupeFingerprint", ""))) return cloneObject(mutation);
        }
        return null;
    }

    private static String validImportState(String value) {
        if ("imported".equals(value) || "error".equals(value) || "pending".equals(value)) return value;
        return "pending";
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

    private static JSONArray mutationShareTargets(JSONArray source, String sessionId, String setId) {
        JSONArray output = new JSONArray();
        if (source == null) return output;
        for (int index = 0; index < source.length() && output.length() < MAX_SHARE_TARGETS; index++) {
            JSONObject raw = source.optJSONObject(index);
            if (raw == null) continue;
            String partyId = safeId(raw.optString("partyId", ""));
            String userId = safeId(raw.optString("userId", ""));
            if (partyId.length() == 0 || userId.length() == 0) continue;
            JSONObject target = new JSONObject();
            put(target, "id", partyId + "_" + userId + "_" + safeId(setId));
            put(target, "partyId", partyId);
            put(target, "userId", userId);
            put(target, "backendMode", "firebase".equals(raw.optString("backendMode", "")) ? "firebase" : "local");
            put(target, "originSessionId", safeId(sessionId));
            put(target, "originSetId", safeId(setId));
            put(target, "privacySnapshot", mutationPrivacySnapshot(raw.optJSONObject("privacySnapshot")));
            put(target, "syncState", "pending");
            put(target, "attempts", 0);
            put(target, "lastError", JSONObject.NULL);
            output.put(target);
        }
        return output;
    }

    private static JSONObject mutationPrivacySnapshot(JSONObject raw) {
        JSONObject value = raw == null ? new JSONObject() : raw;
        JSONObject output = new JSONObject();
        put(output, "shareGymData", value.optBoolean("shareGymData", true));
        put(output, "shareAggregateOnly", value.optBoolean("shareAggregateOnly", false));
        put(output, "shareSetDetails", value.optBoolean("shareSetDetails", true));
        put(output, "hideAbsoluteWeights", value.optBoolean("hideAbsoluteWeights", false));
        put(output, "anonymousAlias", value.optBoolean("anonymousAlias", false));
        put(output, "shareGeneralScore", value.optBoolean("shareGeneralScore", false));
        return output;
    }

    private static String safeId(String value) {
        String clean = value == null ? "" : value.trim().replaceAll("[^A-Za-z0-9_-]", "_");
        return clean.length() > 180 ? clean.substring(0, 180) : clean;
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
        public String setId() { return mutation == null ? "" : mutation.optString("setId", ""); }
    }

    static final class NativeWorkoutMutation {
        final String id;
        final String type;
        final String sessionId;
        final String exerciseId;
        final String setId;
        final JSONObject payload;
        final String createdAt;
        final long createdAtEpochMs;
        final JSONArray shareTargets;

        NativeWorkoutMutation(String id, String type, String sessionId, String exerciseId, String setId, JSONObject payload, JSONArray shareTargets) {
            this.id = id;
            this.type = type;
            this.sessionId = sessionId;
            this.exerciseId = exerciseId;
            this.setId = setId;
            this.payload = cloneObject(payload);
            this.createdAt = nowIso();
            this.createdAtEpochMs = System.currentTimeMillis();
            this.shareTargets = cloneArray(shareTargets);
        }

        JSONObject toJson() {
            JSONObject output = new JSONObject();
            put(output, "id", id);
            put(output, "type", type);
            put(output, "sessionId", sessionId);
            put(output, "exerciseId", exerciseId);
            put(output, "setId", setId);
            put(output, "payload", cloneObject(payload));
            put(output, "createdAt", createdAt);
            put(output, "createdAtEpochMs", createdAtEpochMs);
            put(output, "privateImportState", "pending");
            put(output, "shareTargets", cloneArray(shareTargets));
            put(output, "attempts", 0);
            put(output, "lastError", JSONObject.NULL);
            return output;
        }
    }
}
