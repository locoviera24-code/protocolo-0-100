package com.protocolo.cien;

import android.content.Context;

import org.json.JSONObject;

/** Single reducer used by widget and notification quick actions. */
public final class WorkoutQuickActionReducer {
    public static final String ADJUST_REPS = WorkoutQuickActionContract.ADJUST_REPS;
    public static final String ADJUST_WEIGHT = WorkoutQuickActionContract.ADJUST_WEIGHT;
    public static final String SAVE_SET = WorkoutQuickActionContract.SAVE_SET;
    public static final String UNDO_SET = WorkoutQuickActionContract.UNDO_SET;
    public static final String REPEAT_LAST_SET = WorkoutQuickActionContract.REPEAT_LAST_SET;
    public static final String PREVIOUS_EXERCISE = WorkoutQuickActionContract.PREVIOUS_EXERCISE;
    public static final String NEXT_EXERCISE = WorkoutQuickActionContract.NEXT_EXERCISE;
    public static final String COMPLETE_TIME_SET = WorkoutQuickActionContract.COMPLETE_TIME_SET;
    public static final String COMPLETE_DISTANCE_SET = WorkoutQuickActionContract.COMPLETE_DISTANCE_SET;
    public static final String SOURCE_WIDGET = WorkoutQuickActionContract.SOURCE_WIDGET;
    public static final String SOURCE_NOTIFICATION = WorkoutQuickActionContract.SOURCE_NOTIFICATION;
    static final String COMMAND_SELECT_EXERCISE = "SELECT_EXERCISE";
    static final String COMMAND_TOGGLE_WEIGHT_STEP = "TOGGLE_WEIGHT_STEP";

    private WorkoutQuickActionReducer() {}

    public static synchronized Result dispatch(Context context, String rawAction, String source, String deliveryId) {
        return dispatch(context, rawAction, source, deliveryId, "");
    }

    public static synchronized Result dispatch(Context context, String rawAction, String source, String deliveryId, String exerciseId) {
        String action = normalize(rawAction);
        if (action.isEmpty()) return Result.unhandled();
        String safeSource = SOURCE_NOTIFICATION.equals(source) ? SOURCE_NOTIFICATION : SOURCE_WIDGET;
        if (!WorkoutNativeRepository.claimDelivery(context, deliveryId)) return Result.duplicate();

        JSONObject state = WorkoutWidgetUpdateService.readStateJson(context);
        long expectedRevision = WorkoutNativeRepository.revision(state);
        put(state, "_nativeActionSource", safeSource);
        put(state, "_nativeExpectedRevision", expectedRevision);
        put(state, "_nativeReducerAction", action);
        if (exerciseId != null && !exerciseId.trim().isEmpty()) put(state, "_nativeSelectedExerciseId", exerciseId.trim());
        String code = WorkoutWidgetUpdateService.applyDirectAction(context, state, rawAction);
        state.remove("_nativeActionSource");
        state.remove("_nativeExpectedRevision");
        state.remove("_nativeReducerAction");
        state.remove("_nativeSelectedExerciseId");
        if ("unhandled".equals(code)) return Result.unhandled();

        long revision = WorkoutNativeRepository.advanceRevision(state);
        if (!WorkoutNativeRepository.writeWidgetSnapshot(context, state)) return Result.error("snapshot-write-failed");
        NativeWorkoutControlRepository.syncFromWidgetState(context, state);
        if ("saved".equals(code)) WorkoutTimerController.startAfterSavedSetIfEnabled(context);
        if ("saved".equals(code) || "undone".equals(code)) WorkoutNativeRepository.haptic(context);
        WorkoutWidgetUpdateService.updateAll(context);
        WorkoutControlNotificationManager.update(context);
        if ("revision-conflict".equals(code)) return Result.rejected(code, "REVISION_CONFLICT", revision);
        if ("missing-context".equals(code)) return Result.rejected(code, "SESSION_NOT_FOUND", revision);
        if (code.startsWith("invalid") || "requires-editor".equals(code)) return Result.rejected(code, "INVALID_PAYLOAD", revision);
        return Result.applied(code, revision);
    }

    public static boolean supports(String rawAction) {
        return !normalize(rawAction).isEmpty();
    }

    private static String normalize(String action) {
        if (action == null) return "";
        if (MainActivity.ACTION_WIDGET_REPS_DOWN.equals(action) || MainActivity.ACTION_WIDGET_REPS_UP.equals(action)) return ADJUST_REPS;
        if (MainActivity.ACTION_WIDGET_WEIGHT_DOWN.equals(action) || MainActivity.ACTION_WIDGET_WEIGHT_UP.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN.equals(action) || MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP.equals(action)) return ADJUST_WEIGHT;
        if (MainActivity.ACTION_WIDGET_SAVE_SET.equals(action)) return SAVE_SET;
        if (MainActivity.ACTION_WIDGET_UNDO_LAST_SET.equals(action)) return UNDO_SET;
        if (MainActivity.ACTION_WIDGET_REPEAT_LAST.equals(action)) return REPEAT_LAST_SET;
        if (MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE.equals(action)) return PREVIOUS_EXERCISE;
        if (MainActivity.ACTION_WIDGET_NEXT_EXERCISE.equals(action)) return NEXT_EXERCISE;
        if (MainActivity.ACTION_WIDGET_SELECT_EXERCISE.equals(action)) return COMMAND_SELECT_EXERCISE;
        if (MainActivity.ACTION_WIDGET_TOGGLE_WEIGHT_STEP.equals(action)) return COMMAND_TOGGLE_WEIGHT_STEP;
        if (MainActivity.ACTION_WIDGET_COMPLETE_TIME_SET.equals(action)) return COMPLETE_TIME_SET;
        if (MainActivity.ACTION_WIDGET_COMPLETE_DISTANCE_SET.equals(action)) return COMPLETE_DISTANCE_SET;
        return "";
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value); } catch (Exception ignored) {}
    }

    public static final class Result {
        public final boolean handled;
        public final boolean duplicate;
        public final String code;
        public final long revision;
        public final String status;
        public final String errorCode;

        Result(boolean handled, boolean duplicate, String code, long revision, String status, String errorCode) {
            this.handled = handled;
            this.duplicate = duplicate;
            this.code = code;
            this.revision = revision;
            this.status = status;
            this.errorCode = errorCode;
        }

        static Result applied(String code, long revision) { return new Result(true, false, code, revision, "applied", "OK"); }
        static Result rejected(String code, String errorCode, long revision) { return new Result(true, false, code, revision, "rejected", errorCode); }
        static Result unhandled() { return new Result(false, false, "unhandled", 0L, "rejected", "UNSUPPORTED_ACTION"); }
        static Result duplicate() { return new Result(true, true, "duplicate-delivery", 0L, "ignored", "DUPLICATE_MUTATION"); }
        static Result error(String code) { return new Result(true, false, code, 0L, "rejected", "INVALID_PAYLOAD"); }
    }
}
