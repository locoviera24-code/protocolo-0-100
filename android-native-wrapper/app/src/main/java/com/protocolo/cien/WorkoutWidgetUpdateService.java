package com.protocolo.cien;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public final class WorkoutWidgetUpdateService {
    public static final String PREFS_NAME = "protocolo_workout_widget";
    public static final String KEY_STATE_JSON = "state_json";

    private static final int REQUEST_REFRESH = 1004;
    private static final int LAYOUT_COMPACT = 1;
    private static final int LAYOUT_STANDARD = 2;
    private static final int LAYOUT_EXPANDED = 3;
    private static final double WEIGHT_STEP = 0.5;
    private static final double WEIGHT_FAST_STEP = 5.0;

    private WorkoutWidgetUpdateService() {}

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, WorkoutWidgetProvider.class);
        updateWidgets(context, manager, manager.getAppWidgetIds(component));
    }

    public static void updateWidgets(Context context, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        WidgetState state = WidgetState.fromJson(readStateJson(context));
        state.applyNativeControl(NativeWorkoutControlRepository.readControlState(context));
        for (int id : ids) {
            RemoteViews views = buildViews(context, manager, id, state);
            manager.updateAppWidget(id, views);
        }
    }

    public static synchronized boolean handleWidgetAction(Context context, String action) {
        return WorkoutQuickActionReducer.dispatch(context, action, WorkoutQuickActionReducer.SOURCE_WIDGET, "").handled;
    }

    public static synchronized boolean handleWidgetAction(Context context, Intent intent, String source) {
        if (intent == null) return false;
        return WorkoutQuickActionReducer.dispatch(context, intent.getAction(), source, intent.getStringExtra("deliveryId")).handled;
    }

    static WidgetState readState(Context context) {
        return WidgetState.fromJson(readStateJson(context));
    }

    static JSONObject readStateJson(Context context) {
        JSONObject json = WorkoutNativeRepository.readWidgetSnapshot(context);
        if (json.length() > 0) {
            if (!todayDate().equals(json.optString("date", todayDate()))) return jsonForTodayFromSource(json);
            return json;
        }
        return defaultJsonForToday();
    }

    static void saveStateJson(Context context, JSONObject state) {
        WorkoutNativeRepository.writeWidgetSnapshot(context, state);
    }

    private static RemoteViews buildViews(Context context, AppWidgetManager manager, int widgetId, WidgetState state) {
        int kind = selectLayout(manager.getAppWidgetOptions(widgetId));
        int layout = kind == LAYOUT_COMPACT ? R.layout.widget_workout_compact
                : kind == LAYOUT_STANDARD ? R.layout.widget_workout_standard : R.layout.widget_workout_expanded;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);

        views.setTextViewText(R.id.widgetCurrentExercise, state.currentExerciseName);
        views.setTextViewText(R.id.widgetSetStats, state.setStatsText);
        views.setTextViewText(R.id.widgetQuickReps, state.quickRepsText);
        views.setTextViewText(R.id.widgetQuickWeight, state.quickWeightText);
        views.setContentDescription(R.id.widgetQuickReps, state.quickRepsDescription);
        views.setContentDescription(R.id.widgetQuickWeight, state.quickWeightDescription);
        views.setTextViewText(R.id.widgetActionStatus, state.actionStatus);
        bindTimer(context, views, state, kind == LAYOUT_COMPACT);

        views.setViewVisibility(R.id.widgetDirectPanel, View.VISIBLE);
        views.setOnClickPendingIntent(R.id.widgetRoot, openIntent(context, MainActivity.ACTION_OPEN_TODAY_WORKOUT, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetSaveSetButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET, state.nativeRevision, widgetId));
        if (kind == LAYOUT_COMPACT) {
            views.setTextViewText(R.id.widgetWeightFastMinusButton, "-5");
            views.setTextViewText(R.id.widgetWeightFastPlusButton, "+5");
            views.setContentDescription(R.id.widgetWeightFastMinusButton, "Disminuir carga 5 " + state.unit);
            views.setContentDescription(R.id.widgetWeightFastPlusButton, "Aumentar carga 5 " + state.unit);
            views.setOnClickPendingIntent(R.id.widgetWeightFastMinusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN, state.nativeRevision, widgetId));
            views.setOnClickPendingIntent(R.id.widgetWeightFastPlusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP, state.nativeRevision, widgetId));
            views.setOnClickPendingIntent(R.id.widgetQuickReps, openIntent(context, MainActivity.ACTION_QUICK_LOG_SET, state.currentExerciseId));
            views.setOnClickPendingIntent(R.id.widgetQuickWeight, openIntent(context, MainActivity.ACTION_QUICK_LOG_SET, state.currentExerciseId));
        }

        if (kind >= LAYOUT_STANDARD) {
            views.setTextViewText(R.id.widgetLoadGuidance, state.loadGuidanceText);
            int adjustmentVisibility = state.requiresEditor ? View.GONE : View.VISIBLE;
            views.setViewVisibility(R.id.widgetRepsMinusButton, adjustmentVisibility);
            views.setViewVisibility(R.id.widgetRepsPlusButton, adjustmentVisibility);
            views.setViewVisibility(R.id.widgetWeightMinusButton, adjustmentVisibility);
            views.setViewVisibility(R.id.widgetWeightPlusButton, adjustmentVisibility);
            if (!state.requiresEditor) {
                views.setOnClickPendingIntent(R.id.widgetRepsMinusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_REPS_DOWN, state.nativeRevision, widgetId));
                views.setOnClickPendingIntent(R.id.widgetRepsPlusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_REPS_UP, state.nativeRevision, widgetId));
                views.setTextViewText(R.id.widgetWeightMinusButton, "-5");
                views.setTextViewText(R.id.widgetWeightPlusButton, "+5");
                views.setContentDescription(R.id.widgetWeightMinusButton, "Disminuir carga 5 " + state.unit);
                views.setContentDescription(R.id.widgetWeightPlusButton, "Aumentar carga 5 " + state.unit);
                views.setOnClickPendingIntent(R.id.widgetWeightMinusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN, state.nativeRevision, widgetId));
                views.setOnClickPendingIntent(R.id.widgetWeightPlusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP, state.nativeRevision, widgetId));
            }
            String contextualAction = state.requiresEditor ? MainActivity.ACTION_QUICK_LOG_SET
                    : state.canUndo ? MainActivity.ACTION_WIDGET_UNDO_LAST_SET : MainActivity.ACTION_WIDGET_REPEAT_LAST;
            views.setTextViewText(R.id.widgetRepeatButton, state.requiresEditor ? "Editar" : state.canUndo ? "Deshacer" : "Repetir");
            views.setOnClickPendingIntent(R.id.widgetRepeatButton, state.requiresEditor
                    ? openIntent(context, contextualAction, state.currentExerciseId)
                    : widgetActionIntent(context, contextualAction, state.nativeRevision, widgetId));
            views.setOnClickPendingIntent(R.id.widgetNextButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_NEXT_EXERCISE, state.nativeRevision, widgetId));
        }
        if (kind == LAYOUT_EXPANDED) {
            views.setTextViewText(R.id.widgetTitle, state.title);
            views.setTextViewText(R.id.widgetProgress, state.progressText);
        }
        return views;
    }

    static int selectLayout(Bundle options) {
        int minWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int maxWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth);
        int minHeight = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        int maxHeight = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minHeight);
        // maxWidth/maxHeight can describe another orientation. Using them made
        // the first action replace a compact widget with the expanded layout.
        int width = minWidth > 0 ? minWidth : maxWidth;
        int height = minHeight > 0 ? minHeight : maxHeight;
        if ((width > 0 && width < 240) || (height > 0 && height < 170)) return LAYOUT_COMPACT;
        if ((width > 0 && width < 360) || (height > 0 && height < 320)) return LAYOUT_STANDARD;
        return LAYOUT_EXPANDED;
    }

    private static PendingIntent openIntent(Context context, String action, String exerciseId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(action);
        intent.putExtra("exerciseId", exerciseId == null ? "" : exerciseId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int requestCode = Math.abs((action + ":" + exerciseId).hashCode());
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, WorkoutWidgetProvider.class);
        intent.setAction(MainActivity.ACTION_REFRESH_WORKOUT_WIDGET);
        return PendingIntent.getBroadcast(context, REQUEST_REFRESH, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent widgetActionIntent(Context context, String action, long revision, int widgetId) {
        Intent intent = new Intent(context, WorkoutWidgetProvider.class);
        intent.setAction(action);
        String deliveryId = WorkoutQuickActionReducer.SOURCE_WIDGET + ":" + action + ":" + widgetId + ":" + revision;
        intent.setData(Uri.parse("protocolo://workout-action/" + Uri.encode(deliveryId)));
        intent.putExtra("deliveryId", deliveryId);
        int requestCode = Math.abs(action.hashCode());
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean isDirectAction(String action) {
        return MainActivity.ACTION_WIDGET_REPS_DOWN.equals(action)
                || MainActivity.ACTION_WIDGET_REPS_UP.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_DOWN.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_UP.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP.equals(action)
                || MainActivity.ACTION_WIDGET_SAVE_SET.equals(action)
                || MainActivity.ACTION_WIDGET_REPEAT_LAST.equals(action)
                || MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE.equals(action)
                || MainActivity.ACTION_WIDGET_NEXT_EXERCISE.equals(action)
                || MainActivity.ACTION_WIDGET_UNDO_LAST_SET.equals(action)
                || MainActivity.ACTION_WIDGET_COMPLETE_TIME_SET.equals(action);
    }

    static String applyDirectAction(Context context, JSONObject state, String action) {
        if (!isDirectAction(action)) return "unhandled";
        if ("rest".equals(state.optString("type", "workout"))) {
            put(state, "lastWidgetActionText", "Hoy toca descanso. La recuperacion tambien cuenta.");
            touchDirect(state);
            return "rest-day";
        }
        String code = "updated";
        if (MainActivity.ACTION_WIDGET_REPS_DOWN.equals(action)) {
            adjustQuick(state, "reps", -1);
        } else if (MainActivity.ACTION_WIDGET_REPS_UP.equals(action)) {
            adjustQuick(state, "reps", 1);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_DOWN.equals(action)) {
            adjustQuick(state, "weight", -WEIGHT_STEP);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_UP.equals(action)) {
            adjustQuick(state, "weight", WEIGHT_STEP);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN.equals(action)) {
            adjustQuick(state, "weight", -WEIGHT_FAST_STEP);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP.equals(action)) {
            adjustQuick(state, "weight", WEIGHT_FAST_STEP);
        } else if (MainActivity.ACTION_WIDGET_REPEAT_LAST.equals(action)) {
            repeatLast(state);
            code = "repeated";
        } else if (MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE.equals(action)) {
            moveToPreviousExercise(state);
            code = "previous-exercise";
        } else if (MainActivity.ACTION_WIDGET_NEXT_EXERCISE.equals(action)) {
            moveToNextExercise(state);
            code = "next-exercise";
        } else if (MainActivity.ACTION_WIDGET_SAVE_SET.equals(action) || MainActivity.ACTION_WIDGET_COMPLETE_TIME_SET.equals(action)) {
            code = saveSet(context, state);
        } else if (MainActivity.ACTION_WIDGET_UNDO_LAST_SET.equals(action)) {
            code = undoLastSet(context, state);
        }
        touchDirect(state);
        return code;
    }

    private static void adjustQuick(JSONObject state, String key, double delta) {
        JSONObject session = ensureSession(state);
        JSONObject exercise = currentExercise(state, session);
        JSONObject quick = ensureQuickLog(state, exercise);
        double current = quick.optDouble(key, "reps".equals(key) ? 8 : 0);
        double next = Math.max(0, current + delta);
        if ("reps".equals(key)) next = Math.round(next);
        put(quick, key, roundHalf(next));
        put(state, "quickLog", quick);
        put(state, "lastWidgetActionText", "Ajuste listo. Toca Guardar serie para registrar.");
    }

    private static void repeatLast(JSONObject state) {
        JSONObject session = ensureSession(state);
        JSONObject exercise = currentExercise(state, session);
        JSONObject quick = ensureQuickLog(state, exercise);
        JSONObject last = lastSet(exercise);
        if (last == null) last = historyForExercise(state, exercise == null ? "" : exercise.optString("exerciseId", ""));
        if (last == null) {
            put(state, "lastWidgetActionText", "Todavia no hay una serie anterior para repetir.");
            return;
        }
        put(quick, "reps", Math.max(0, last.optInt("reps", last.optInt("lastReps", 8))));
        put(quick, "weight", displayWeight(state, last.optDouble("weight", last.optDouble("lastWeight", 0))));
        put(quick, "bodyweight", last.optBoolean("bodyweight", quick.optBoolean("bodyweight", false)));
        put(state, "quickLog", quick);
        put(state, "lastWidgetActionText", "Ultima serie cargada. Toca Guardar serie para repetirla.");
    }

    private static String saveSet(Context context, JSONObject state) {
        JSONObject session = ensureSession(state);
        JSONObject exercise = currentExercise(state, session);
        if (session == null || exercise == null) {
            put(state, "lastWidgetActionText", "No hay ejercicio activo para registrar.");
            return "missing-context";
        }
        JSONObject quick = ensureQuickLog(state, exercise);
        int reps = Math.max(0, quick.optInt("reps", 8));
        double displayWeight = roundHalf(Math.max(0, quick.optDouble("weight", 0)));
        double weight = canonicalWeight(state, displayWeight);
        String measurementMode = quick.optString("measurementMode", exercise.optString("measurementMode", "reps"));
        double durationSeconds = Math.max(0, quick.optDouble("durationSeconds", 0));
        double distanceMeters = Math.max(0, quick.optDouble("distanceMeters", 0));
        if (("reps".equals(measurementMode) || "assistance".equals(measurementMode)) && reps <= 0) {
            put(state, "lastWidgetActionText", "Subi las repeticiones antes de guardar.");
            return "invalid-reps";
        }
        if ("time".equals(measurementMode) && durationSeconds <= 0) {
            put(state, "lastWidgetActionText", "Abri el registro para indicar la duracion.");
            return "requires-editor";
        }
        if ("distance".equals(measurementMode) && distanceMeters <= 0) {
            put(state, "lastWidgetActionText", "Abri el registro para indicar la distancia.");
            return "requires-editor";
        }

        JSONArray sets = exercise.optJSONArray("sets");
        if (sets == null) sets = new JSONArray();
        int setNumber = sets.length() + 1;
        String source = state.optString("_nativeActionSource", WorkoutQuickActionReducer.SOURCE_WIDGET);
        long expectedRevision = state.optLong("_nativeExpectedRevision", WorkoutNativeRepository.revision(state));
        put(quick, "barWeightKg", canonicalWeight(state, quick.optDouble("barWeight", 0)));
        NativeWorkoutControlRepository.EnqueueResult nativeResult = NativeWorkoutControlRepository.enqueueSaveSet(context, state, session, exercise, quick, weight, source, expectedRevision);
        if (!nativeResult.disabled && !nativeResult.ok) {
            put(state, "lastWidgetActionText", "No se pudo guardar en el telefono. Intenta nuevamente.");
            return nativeResult.error.length() == 0 ? "mutation-write-failed" : nativeResult.error;
        }
        if (nativeResult.duplicate) {
            put(state, "lastWidgetActionText", "La serie ya se guardo. Se ignoro el toque repetido.");
            return "duplicate";
        }
        JSONObject set = new JSONObject();
        put(set, "id", nativeResult.ok ? nativeResult.setId() : "set_android_" + System.currentTimeMillis());
        put(set, "setNumber", setNumber);
        put(set, "reps", reps);
        put(set, "weight", weight);
        put(set, "weightKg", weight);
        put(set, "measurementMode", measurementMode);
        put(set, "loadMode", quick.optString("loadMode", quick.optBoolean("bodyweight", false) ? "bodyweight" : "total"));
        put(set, "equipmentId", quick.optString("equipmentId", exercise.optString("equipmentId", "")));
        put(set, "barWeightKg", Math.max(0, quick.optDouble("barWeightKg", canonicalWeight(state, quick.optDouble("barWeight", 0)))));
        put(set, "laterality", quick.optString("laterality", "bilateral"));
        put(set, "durationSeconds", durationSeconds);
        put(set, "distanceMeters", distanceMeters);
        if ("assistance".equals(set.optString("loadMode", ""))) put(set, "assistanceKg", weight);
        if ("addedLoad".equals(set.optString("loadMode", ""))) put(set, "addedLoadKg", weight);
        put(set, "rir", JSONObject.NULL);
        put(set, "rpe", JSONObject.NULL);
        put(set, "bodyweight", quick.optBoolean("bodyweight", exercise.optBoolean("bodyweight", false)));
        put(set, "setType", "working");
        put(set, "completed", true);
        put(set, "excludeFromRecords", false);
        put(set, "excludeFromProgression", false);
        put(set, "note", "Guardado desde widget Android");
        put(set, "savedAt", nowIso());
        if (nativeResult.ok) {
            put(set, "nativeMutationId", nativeResult.mutation.optString("id", ""));
            put(set, "privateImportState", "pending");
        }
        put(set, "volume", Math.round(reps * weight));
        sets.put(set);
        put(exercise, "sets", sets);

        int index = indexOfExercise(session.optJSONArray("exercises"), exerciseIdOf(exercise));
        put(session, "currentExerciseIndex", Math.max(0, index));
        put(session, "summary", sessionSummary(session));
        put(state, "workoutSession", session);
        updateHistory(state, session, exercise);
        refreshStateFromSession(state, session, exercise);
        String valueText = "time".equals(measurementMode) ? formatDuration(Math.round(durationSeconds * 1000d))
                : "distance".equals(measurementMode) ? formatWeight(distanceMeters) + " m"
                : reps + " reps" + (set.optBoolean("bodyweight", false) && weight <= 0 ? "" : " · " + formatWeight(displayWeight) + " " + state.optString("unit", "kg"));
        put(state, "lastWidgetActionText", "Serie " + setNumber + " guardada · " + valueText + " · Deshacer disponible");
        return "saved";
    }

    private static String undoLastSet(Context context, JSONObject state) {
        String source = state.optString("_nativeActionSource", WorkoutQuickActionReducer.SOURCE_WIDGET);
        long expectedRevision = state.optLong("_nativeExpectedRevision", WorkoutNativeRepository.revision(state));
        NativeWorkoutControlRepository.EnqueueResult result = NativeWorkoutControlRepository.enqueueUndoLastSet(context, state, source, expectedRevision);
        if (!result.ok) {
            put(state, "lastWidgetActionText", "undo-expired".equals(result.error) ? "La ventana para deshacer ya termino." : "No hay una serie reciente para deshacer.");
            return result.error.length() == 0 ? "nothing-to-undo" : result.error;
        }
        JSONObject payload = result.mutation.optJSONObject("payload");
        String targetSetId = payload == null ? "" : payload.optString("targetSetId", "");
        JSONObject session = state.optJSONObject("workoutSession");
        JSONObject affectedExercise = null;
        if (session != null) {
            JSONArray exercises = session.optJSONArray("exercises");
            for (int exerciseIndex = 0; exercises != null && exerciseIndex < exercises.length(); exerciseIndex++) {
                JSONObject exercise = exercises.optJSONObject(exerciseIndex);
                JSONArray sets = exercise == null ? null : exercise.optJSONArray("sets");
                for (int setIndex = sets == null ? -1 : sets.length() - 1; setIndex >= 0; setIndex--) {
                    JSONObject set = sets.optJSONObject(setIndex);
                    if (set != null && targetSetId.equals(set.optString("id", ""))) {
                        sets.remove(setIndex);
                        affectedExercise = exercise;
                        break;
                    }
                }
                if (affectedExercise != null) break;
            }
            put(session, "summary", sessionSummary(session));
            put(state, "workoutSession", session);
        }
        JSONObject previousHistory = payload == null ? null : payload.optJSONObject("previousHistory");
        String exerciseId = payload == null ? "" : payload.optString("exerciseId", "");
        JSONObject history = state.optJSONObject("exerciseHistory");
        if (history == null) history = new JSONObject();
        if (previousHistory != null && previousHistory.length() > 0) put(history, exerciseId, previousHistory);
        else history.remove(exerciseId);
        put(state, "exerciseHistory", history);
        if (affectedExercise != null) refreshStateFromSession(state, session, affectedExercise);
        put(state, "lastWidgetActionText", "Serie eliminada · Guardado en el dispositivo");
        return "undone";
    }

    private static void moveToNextExercise(JSONObject state) {
        JSONObject session = ensureSession(state);
        if (session == null) return;
        JSONArray exercises = session.optJSONArray("exercises");
        if (exercises == null || exercises.length() == 0) return;
        JSONObject current = currentExercise(state, session);
        int index = indexOfExercise(exercises, exerciseIdOf(current));
        int nextIndex = Math.min(exercises.length() - 1, Math.max(0, index) + 1);
        JSONObject next = exercises.optJSONObject(nextIndex);
        put(session, "currentExerciseIndex", nextIndex);
        put(state, "workoutSession", session);
        refreshStateFromSession(state, session, next);
        put(state, "lastWidgetActionText", "Siguiente ejercicio: " + shortName(next == null ? "" : next.optString("name", "")) + ".");
    }

    private static void moveToPreviousExercise(JSONObject state) {
        JSONObject session = ensureSession(state);
        if (session == null) return;
        JSONArray exercises = session.optJSONArray("exercises");
        if (exercises == null || exercises.length() == 0) return;
        JSONObject current = currentExercise(state, session);
        int index = indexOfExercise(exercises, exerciseIdOf(current));
        int previousIndex = Math.max(0, Math.max(0, index) - 1);
        JSONObject previous = exercises.optJSONObject(previousIndex);
        put(session, "currentExerciseIndex", previousIndex);
        put(state, "workoutSession", session);
        refreshStateFromSession(state, session, previous);
        put(state, "lastWidgetActionText", "Ejercicio anterior: " + shortName(previous == null ? "" : previous.optString("name", "")) + ".");
    }

    private static JSONObject ensureSession(JSONObject state) {
        JSONObject session = state.optJSONObject("workoutSession");
        if (session != null && "en progreso".equals(session.optString("status", "en progreso"))) {
            return session;
        }
        JSONArray sourceExercises = state.optJSONArray("exercises");
        if (sourceExercises == null || sourceExercises.length() == 0) return null;

        JSONArray exercises = new JSONArray();
        for (int i = 0; i < sourceExercises.length(); i++) {
            JSONObject source = sourceExercises.optJSONObject(i);
            if (source == null) continue;
            JSONObject exercise = cloneJson(source);
            if (exercise.optJSONArray("sets") == null) put(exercise, "sets", new JSONArray());
            put(exercise, "order", i + 1);
            put(exercise, "completed", exercise.optBoolean("completed", false));
            exercises.put(exercise);
        }

        JSONObject routine = new JSONObject();
        put(routine, "dayKey", state.optString("dayKey", ""));
        put(routine, "name", state.optString("routineName", "Entrenamiento"));
        put(routine, "muscles", state.optJSONArray("muscles") == null ? new JSONArray() : cloneArray(state.optJSONArray("muscles")));
        put(routine, "exercises", cloneArray(exercises));

        JSONObject created = new JSONObject();
        put(created, "id", "workout_android_" + System.currentTimeMillis());
        put(created, "date", state.optString("date", todayDate()));
        put(created, "dayKey", state.optString("dayKey", ""));
        put(created, "weekday", state.optString("weekday", ""));
        put(created, "routine", routine);
        put(created, "startedAt", nowIso());
        put(created, "finishedAt", JSONObject.NULL);
        put(created, "status", "en progreso");
        put(created, "currentExerciseIndex", Math.max(0, indexOfExercise(exercises, state.optString("currentExerciseId", ""))));
        put(created, "exercises", exercises);
        put(created, "notes", "");
        put(created, "subjectiveNote", "");
        put(created, "summary", sessionSummary(created));
        put(state, "workoutSession", created);
        put(state, "status", "en progreso");
        return created;
    }

    private static JSONObject currentExercise(JSONObject state, JSONObject session) {
        if (session == null) return null;
        JSONArray exercises = session.optJSONArray("exercises");
        if (exercises == null || exercises.length() == 0) return null;
        String currentId = state.optString("currentExerciseId", "");
        int byId = indexOfExercise(exercises, currentId);
        if (byId >= 0) return exercises.optJSONObject(byId);
        int index = Math.max(0, Math.min(exercises.length() - 1, session.optInt("currentExerciseIndex", 0)));
        JSONObject selected = exercises.optJSONObject(index);
        if (selected != null) return selected;
        for (int i = 0; i < exercises.length(); i++) {
            JSONObject exercise = exercises.optJSONObject(i);
            if (exercise != null && !exercise.optBoolean("completed", false)) return exercise;
        }
        return exercises.optJSONObject(0);
    }

    private static JSONObject ensureQuickLog(JSONObject state, JSONObject exercise) {
        JSONObject quick = state.optJSONObject("quickLog");
        if (quick == null) quick = new JSONObject();
        String currentId = exerciseIdOf(exercise);
        String quickId = quick.optString("currentExerciseId", "");
        JSONArray sets = exercise == null ? null : exercise.optJSONArray("sets");
        int setNumber = sets == null ? 1 : sets.length() + 1;
        if (!currentId.equals(quickId)) {
            JSONObject last = lastSet(exercise);
            if (last == null) last = historyForExercise(state, exercise == null ? "" : exercise.optString("exerciseId", ""));
            put(quick, "reps", last == null ? 8 : Math.max(0, last.optInt("reps", last.optInt("lastReps", 8))));
            put(quick, "weight", last == null ? 0 : displayWeight(state, last.optDouble("weight", last.optDouble("lastWeight", 0))));
            put(quick, "bodyweight", last == null ? (exercise != null && exercise.optBoolean("bodyweight", false)) : last.optBoolean("bodyweight", exercise != null && exercise.optBoolean("bodyweight", false)));
            put(quick, "measurementMode", last == null ? (exercise == null ? "reps" : exercise.optString("measurementMode", "reps")) : last.optString("measurementMode", "reps"));
            put(quick, "loadMode", last == null ? (exercise == null ? "total" : exercise.optString("defaultLoadMode", exercise.optBoolean("bodyweight", false) ? "bodyweight" : "total")) : last.optString("loadMode", "total"));
            put(quick, "durationSeconds", last == null ? 60 : Math.max(0, last.optDouble("durationSeconds", 60)));
            put(quick, "distanceMeters", last == null ? 1000 : Math.max(0, last.optDouble("distanceMeters", 1000)));
            put(quick, "equipmentId", last == null ? (exercise == null ? "" : exercise.optString("equipmentId", "")) : last.optString("equipmentId", ""));
            put(quick, "barWeight", last == null ? 0 : displayWeight(state, last.optDouble("barWeightKg", 0)));
            put(quick, "laterality", last == null ? "bilateral" : last.optString("laterality", "bilateral"));
        }
        put(quick, "currentExerciseId", currentId);
        put(quick, "exerciseName", exercise == null ? "Ejercicio actual" : exercise.optString("name", "Ejercicio actual"));
        put(quick, "setNumber", setNumber);
        put(quick, "setType", "working");
        put(quick, "unit", state.optString("unit", "kg"));
        put(quick, "weightStep", WEIGHT_STEP);
        put(quick, "weightFastStep", WEIGHT_FAST_STEP);
        putCurrentSetStats(quick, state, exercise);
        put(quick, "hintText", "Ajusta reps/kg y guarda desde el widget.");
        put(state, "quickLog", quick);
        return quick;
    }

    private static void refreshStateFromSession(JSONObject state, JSONObject session, JSONObject selectedExercise) {
        if (session == null) return;
        JSONArray exercises = session.optJSONArray("exercises");
        put(state, "exercises", cloneArray(exercises == null ? new JSONArray() : exercises));
        JSONObject summary = sessionSummary(session);
        put(session, "summary", summary);
        put(state, "workoutSession", session);
        put(state, "completedExercises", summary.optInt("completedExercises", 0));
        put(state, "totalExercises", summary.optInt("totalExercises", 0));
        put(state, "totalSets", summary.optInt("totalSets", 0));
        put(state, "totalVolume", summary.optDouble("totalVolume", 0));
        put(state, "status", session.optString("status", "en progreso"));
        if (selectedExercise == null) selectedExercise = currentExercise(state, session);
        put(state, "currentExerciseId", exerciseIdOf(selectedExercise));
        put(state, "currentExerciseName", selectedExercise == null ? "" : selectedExercise.optString("name", ""));
        putCurrentSetStats(state, state, selectedExercise);
        put(state, "progressText", summary.optInt("completedExercises", 0) + "/" + summary.optInt("totalExercises", 0)
                + " ejercicios · " + summary.optInt("totalSets", 0) + " series · "
                + Math.round(displayVolume(state, summary.optDouble("totalVolume", 0))) + " " + state.optString("unit", "kg"));
        ensureQuickLog(state, selectedExercise);
    }

    private static void putCurrentSetStats(JSONObject target, JSONObject state, JSONObject selectedExercise) {
        int exerciseSets = setCount(selectedExercise);
        String muscle = selectedExercise == null ? "" : selectedExercise.optString("muscle", "");
        int muscleSets = muscleSetCount(state.optJSONArray("exercises"), muscle);
        put(target, "currentExerciseSets", exerciseSets);
        put(target, "currentMuscleSets", muscleSets);
        put(target, "currentMuscleName", muscle);
    }

    private static String setType(JSONObject set) {
        if (set == null) return "working";
        String value = set.optString("setType", "working");
        if (value.equals("warmup") || value.equals("working") || value.equals("backoff") || value.equals("drop") || value.equals("technique") || value.equals("failure") || value.equals("assisted")) return value;
        return "working";
    }

    private static PendingIntent timerActionIntent(Context context, String action) {
        Intent intent = new Intent(context, WorkoutControlReceiver.class).setAction(action);
        int requestCode = 6300 + Math.abs(action.hashCode() % 500);
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void bindTimer(Context context, RemoteViews views, WidgetState state, boolean interactive) {
        views.setViewVisibility(R.id.widgetTimerPanel, state.timerEnabled ? View.VISIBLE : View.GONE);
        if (!state.timerEnabled) return;
        String status = state.timerStatus;
        if ("running".equals(status)) {
            if (Build.VERSION.SDK_INT >= 24) {
                views.setChronometer(R.id.widgetTimerChronometer, state.timerEndsAtElapsed, "Descanso %s", true);
                views.setChronometerCountDown(R.id.widgetTimerChronometer, true);
            } else {
                views.setTextViewText(R.id.widgetTimerChronometer, "Descanso " + formatDuration(Math.max(0L, state.timerEndsAtElapsed - SystemClock.elapsedRealtime())));
            }
            if (interactive) {
                views.setTextViewText(R.id.widgetTimerButton, "Pausar");
                views.setOnClickPendingIntent(R.id.widgetTimerButton, timerActionIntent(context, WorkoutTimerController.ACTION_TIMER_PAUSE));
            }
        } else if ("paused".equals(status)) {
            views.setTextViewText(R.id.widgetTimerChronometer, "Pausa " + formatDuration(state.timerPausedRemainingMs));
            if (interactive) {
                views.setTextViewText(R.id.widgetTimerButton, "Continuar");
                views.setOnClickPendingIntent(R.id.widgetTimerButton, timerActionIntent(context, WorkoutTimerController.ACTION_TIMER_RESUME));
            }
        } else if ("finished".equals(status)) {
            views.setTextViewText(R.id.widgetTimerChronometer, "Descanso listo");
            if (interactive) {
                views.setTextViewText(R.id.widgetTimerButton, "Reiniciar");
                views.setOnClickPendingIntent(R.id.widgetTimerButton, timerActionIntent(context, WorkoutTimerController.ACTION_TIMER_START));
            }
        } else {
            views.setTextViewText(R.id.widgetTimerChronometer, "Descanso " + formatDuration(state.timerConfiguredSeconds * 1000L));
            if (interactive) {
                views.setTextViewText(R.id.widgetTimerButton, "Iniciar");
                views.setOnClickPendingIntent(R.id.widgetTimerButton, timerActionIntent(context, WorkoutTimerController.ACTION_TIMER_START));
            }
        }
    }

    private static String formatDuration(long milliseconds) {
        long totalSeconds = Math.max(0L, milliseconds / 1000L);
        return String.format(Locale.US, "%02d:%02d", totalSeconds / 60L, totalSeconds % 60L);
    }

    private static boolean completedSet(JSONObject set) {
        return set != null && set.optBoolean("completed", true);
    }

    private static boolean mainVolumeSet(JSONObject set) {
        return completedSet(set) && "working".equals(setType(set));
    }

    private static boolean recordSet(JSONObject set) {
        String type = setType(set);
        return completedSet(set) && !set.optBoolean("excludeFromRecords", false) && ("working".equals(type) || "backoff".equals(type));
    }

    private static boolean progressionSet(JSONObject set) {
        return mainVolumeSet(set) && !set.optBoolean("excludeFromProgression", false);
    }

    private static int setCount(JSONObject exercise) {
        JSONArray sets = exercise == null ? null : exercise.optJSONArray("sets");
        return sets == null ? 0 : sets.length();
    }

    private static int muscleSetCount(JSONArray exercises, String muscle) {
        if (exercises == null || muscle == null || muscle.length() == 0) return 0;
        int total = 0;
        for (int i = 0; i < exercises.length(); i++) {
            JSONObject exercise = exercises.optJSONObject(i);
            if (exercise != null && muscle.equals(exercise.optString("muscle", ""))) {
                total += setCount(exercise);
            }
        }
        return total;
    }

    private static JSONObject sessionSummary(JSONObject session) {
        JSONObject summary = new JSONObject();
        JSONArray exercises = session.optJSONArray("exercises");
        int completed = 0;
        int totalSets = 0;
        int workingSets = 0;
        int warmupSets = 0;
        int supplementarySets = 0;
        int totalReps = 0;
        double totalVolume = 0;
        JSONObject bestByExercise = new JSONObject();
        if (exercises != null) {
            for (int i = 0; i < exercises.length(); i++) {
                JSONObject exercise = exercises.optJSONObject(i);
                if (exercise == null) continue;
                JSONArray sets = exercise.optJSONArray("sets");
                int setCount = sets == null ? 0 : sets.length();
                if (exercise.optBoolean("completed", false) || setCount > 0) completed++;
                JSONObject best = null;
                double bestVolume = -1;
                for (int j = 0; j < setCount; j++) {
                    JSONObject set = sets.optJSONObject(j);
                    if (!completedSet(set)) continue;
                    totalSets++;
                    String type = setType(set);
                    if ("working".equals(type)) workingSets++;
                    else if ("warmup".equals(type)) warmupSets++;
                    else supplementarySets++;
                    double volume = Math.max(0, set.optDouble("reps", 0)) * Math.max(0, set.optDouble("weight", 0));
                    if (mainVolumeSet(set)) {
                        totalReps += Math.max(0, set.optInt("reps", 0));
                        totalVolume += volume;
                    }
                    if (recordSet(set) && volume > bestVolume) {
                        bestVolume = volume;
                        best = set;
                    }
                }
                if (best != null) {
                    JSONObject row = new JSONObject();
                    put(row, "reps", best.optInt("reps", 0));
                    put(row, "weight", roundHalf(best.optDouble("weight", 0)));
                    put(row, "volume", Math.round(bestVolume));
                    put(row, "bodyweight", best.optBoolean("bodyweight", false));
                    put(row, "date", session.optString("date", todayDate()));
                    put(bestByExercise, exercise.optString("exerciseId", exerciseIdOf(exercise)), row);
                }
            }
        }
        int totalExercises = exercises == null ? 0 : exercises.length();
        put(summary, "durationMinutes", 0);
        put(summary, "completedExercises", completed);
        put(summary, "totalExercises", totalExercises);
        put(summary, "totalSets", totalSets);
        put(summary, "workingSets", workingSets);
        put(summary, "warmupSets", warmupSets);
        put(summary, "supplementarySets", supplementarySets);
        put(summary, "totalReps", totalReps);
        put(summary, "totalVolume", Math.round(totalVolume));
        put(summary, "bestByExercise", bestByExercise);
        put(summary, "compliance", totalExercises == 0 ? 0 : Math.round((completed * 100.0) / totalExercises));
        put(summary, "subjectiveNote", session.optString("subjectiveNote", ""));
        return summary;
    }

    private static void updateHistory(JSONObject state, JSONObject session, JSONObject exercise) {
        if (exercise == null) return;
        JSONArray sets = exercise.optJSONArray("sets");
        if (sets == null || sets.length() == 0) return;
        JSONObject last = null;
        JSONObject best = null;
        int workingSets = 0;
        double bestVolume = -1;
        double volumeTotal = 0;
        for (int i = 0; i < sets.length(); i++) {
            JSONObject set = sets.optJSONObject(i);
            if (!completedSet(set)) continue;
            double volume = Math.max(0, set.optDouble("reps", 0)) * Math.max(0, set.optDouble("weight", 0));
            if (progressionSet(set)) {
                last = set;
                workingSets++;
            }
            if (mainVolumeSet(set)) volumeTotal += volume;
            if (recordSet(set) && volume > bestVolume) {
                bestVolume = volume;
                best = set;
            }
        }
        if (last == null) last = sets.optJSONObject(sets.length() - 1);
        JSONObject bestSet = new JSONObject();
        put(bestSet, "reps", best == null ? 0 : best.optInt("reps", 0));
        put(bestSet, "weight", best == null ? 0 : roundHalf(best.optDouble("weight", 0)));
        put(bestSet, "volume", Math.round(Math.max(0, bestVolume)));
        put(bestSet, "bodyweight", best != null && best.optBoolean("bodyweight", false));

        JSONObject row = new JSONObject();
        put(row, "exerciseId", exercise.optString("exerciseId", exerciseIdOf(exercise)));
        put(row, "name", exercise.optString("name", "Ejercicio"));
        put(row, "lastWeight", last == null ? 0 : roundHalf(last.optDouble("weight", 0)));
        put(row, "lastReps", last == null ? 0 : last.optInt("reps", 0));
        put(row, "lastSets", workingSets);
        put(row, "totalLoggedSets", sets.length());
        put(row, "bestSet", bestSet);
        put(row, "previousVolume", Math.round(volumeTotal));
        put(row, "lastDate", session.optString("date", todayDate()));
        put(row, "bodyweight", exercise.optBoolean("bodyweight", false) || (last != null && last.optBoolean("bodyweight", false)));

        JSONObject history = state.optJSONObject("exerciseHistory");
        if (history == null) history = new JSONObject();
        put(history, row.optString("exerciseId", exerciseIdOf(exercise)), row);
        put(state, "exerciseHistory", history);
    }

    private static int indexOfExercise(JSONArray exercises, String id) {
        if (exercises == null || id == null || id.length() == 0) return -1;
        for (int i = 0; i < exercises.length(); i++) {
            JSONObject exercise = exercises.optJSONObject(i);
            if (exercise == null) continue;
            if (id.equals(exercise.optString("id", "")) || id.equals(exercise.optString("exerciseId", ""))) return i;
        }
        return -1;
    }

    private static JSONObject lastSet(JSONObject exercise) {
        JSONArray sets = exercise == null ? null : exercise.optJSONArray("sets");
        if (sets == null || sets.length() == 0) return null;
        for (int i = sets.length() - 1; i >= 0; i--) {
            JSONObject set = sets.optJSONObject(i);
            if (progressionSet(set)) return set;
        }
        return sets.optJSONObject(sets.length() - 1);
    }

    private static JSONObject historyForExercise(JSONObject state, String exerciseId) {
        JSONObject history = state.optJSONObject("exerciseHistory");
        return history == null || exerciseId == null ? null : history.optJSONObject(exerciseId);
    }

    private static String exerciseIdOf(JSONObject exercise) {
        if (exercise == null) return "";
        String id = exercise.optString("id", "");
        return id.length() > 0 ? id : exercise.optString("exerciseId", "");
    }

    private static void touch(JSONObject state) {
        put(state, "schemaVersion", Math.max(2, state.optInt("schemaVersion", 1)));
        put(state, "updatedAt", nowIso());
    }

    private static void touchDirect(JSONObject state) {
        touch(state);
        put(state, "lastNativeMutationAt", nowIso());
        put(state, "lastNativeMutationSource", "android-widget-direct");
    }

    private static JSONObject defaultJsonForToday() {
        Calendar calendar = Calendar.getInstance();
        int day = calendar.get(Calendar.DAY_OF_WEEK);
        JSONObject state = new JSONObject();
        put(state, "schemaVersion", 2);
        put(state, "date", todayDate());
        put(state, "unit", "kg");
        put(state, "exerciseHistory", new JSONObject());
        put(state, "status", "sin iniciar");
        put(state, "type", (day == Calendar.SATURDAY || day == Calendar.SUNDAY) ? "rest" : "workout");
        switch (day) {
            case Calendar.MONDAY:
                seedWorkout(state, "monday", "Lunes", "Torso A", torsoExercises());
                break;
            case Calendar.TUESDAY:
                seedWorkout(state, "tuesday", "Martes", "Pierna A", legExercises());
                break;
            case Calendar.WEDNESDAY:
                seedWorkout(state, "wednesday", "Miercoles", "Torso B", torsoExercises());
                break;
            case Calendar.THURSDAY:
                seedWorkout(state, "thursday", "Jueves", "Pierna B", legExercises());
                break;
            case Calendar.FRIDAY:
                seedWorkout(state, "friday", "Viernes", "Torso C", torsoExercises());
                break;
            case Calendar.SATURDAY:
                seedRest(state, "saturday", "Sabado", "Descanso / actividad suave", "Hoy toca descanso o actividad suave.",
                        new String[]{"caminar", "movilidad", "estiramiento suave", "recuperacion"});
                break;
            default:
                seedRest(state, "sunday", "Domingo", "Descanso / revision semanal", "Hoy toca descanso o revision semanal.",
                        new String[]{"revisar entrenamientos", "revisar progresion", "preparar semana", "movilidad suave"});
                break;
        }
        put(state, "lastWidgetActionText", "Ajusta reps/kg y guarda desde el widget.");
        refreshStateFromSession(state, ensureSession(state), null);
        touch(state);
        return state;
    }

    private static JSONObject jsonForTodayFromSource(JSONObject source) {
        JSONObject weekly = source.optJSONObject("weeklyWorkoutPlan");
        JSONObject plan = weekly == null ? null : weekly.optJSONObject(dayKeyForToday());
        if (plan == null) return defaultJsonForToday();

        JSONObject state = new JSONObject();
        put(state, "schemaVersion", 2);
        put(state, "date", todayDate());
        put(state, "unit", source.optString("unit", "kg"));
        put(state, "exerciseHistory", source.optJSONObject("exerciseHistory") == null ? new JSONObject() : cloneJson(source.optJSONObject("exerciseHistory")));
        put(state, "weeklyWorkoutPlan", cloneJson(weekly));
        put(state, "dayKey", plan.optString("dayKey", dayKeyForToday()));
        put(state, "weekday", plan.optString("weekday", weekdayForToday()));
        put(state, "routineName", plan.optString("name", "Entrenamiento"));
        put(state, "title", plan.optString("weekday", weekdayForToday()) + " — " + plan.optString("name", "Entrenamiento"));
        put(state, "type", plan.optString("type", "workout"));
        put(state, "muscles", plan.optJSONArray("muscles") == null ? new JSONArray() : cloneArray(plan.optJSONArray("muscles")));
        if ("rest".equals(plan.optString("type", "workout"))) {
            String message = plan.optString("message", "Hoy toca descanso.");
            put(state, "message", message);
            put(state, "suggestions", plan.optJSONArray("suggestions") == null ? new JSONArray() : cloneArray(plan.optJSONArray("suggestions")));
            put(state, "exercises", new JSONArray());
            put(state, "currentExerciseId", "");
            put(state, "currentExerciseName", "");
            put(state, "progressText", message);
            put(state, "lastWidgetActionText", "Hoy toca descanso. La recuperacion tambien cuenta.");
            touch(state);
            return state;
        }

        JSONArray exercises = plan.optJSONArray("exercises") == null ? new JSONArray() : cloneArray(plan.optJSONArray("exercises"));
        for (int i = 0; i < exercises.length(); i++) {
            JSONObject exercise = exercises.optJSONObject(i);
            if (exercise == null) continue;
            if (exercise.optJSONArray("sets") == null) put(exercise, "sets", new JSONArray());
            put(exercise, "completed", false);
            put(exercise, "order", i + 1);
        }
        put(state, "exercises", exercises);
        put(state, "currentExerciseId", exercises.optJSONObject(0) == null ? "" : exercises.optJSONObject(0).optString("id", exercises.optJSONObject(0).optString("exerciseId", "")));
        put(state, "currentExerciseName", exercises.optJSONObject(0) == null ? "" : exercises.optJSONObject(0).optString("name", ""));
        put(state, "progressText", "0/" + exercises.length() + " ejercicios · 0 series · 0 " + state.optString("unit", "kg"));
        put(state, "lastWidgetActionText", "Nuevo dia listo para registrar desde el widget.");
        refreshStateFromSession(state, ensureSession(state), null);
        touch(state);
        return state;
    }

    private static String dayKeyForToday() {
        int day = Calendar.getInstance().get(Calendar.DAY_OF_WEEK);
        switch (day) {
            case Calendar.MONDAY:
                return "monday";
            case Calendar.TUESDAY:
                return "tuesday";
            case Calendar.WEDNESDAY:
                return "wednesday";
            case Calendar.THURSDAY:
                return "thursday";
            case Calendar.FRIDAY:
                return "friday";
            case Calendar.SATURDAY:
                return "saturday";
            default:
                return "sunday";
        }
    }

    private static String weekdayForToday() {
        int day = Calendar.getInstance().get(Calendar.DAY_OF_WEEK);
        switch (day) {
            case Calendar.MONDAY:
                return "Lunes";
            case Calendar.TUESDAY:
                return "Martes";
            case Calendar.WEDNESDAY:
                return "Miercoles";
            case Calendar.THURSDAY:
                return "Jueves";
            case Calendar.FRIDAY:
                return "Viernes";
            case Calendar.SATURDAY:
                return "Sabado";
            default:
                return "Domingo";
        }
    }

    private static void seedWorkout(JSONObject state, String dayKey, String weekday, String routineName, JSONArray exercises) {
        put(state, "dayKey", dayKey);
        put(state, "weekday", weekday);
        put(state, "routineName", routineName);
        put(state, "title", weekday + " — " + routineName);
        put(state, "type", "workout");
        put(state, "muscles", routineName.startsWith("Pierna")
                ? array("Cuadriceps / pierna", "Aductores", "Pantorrillas", "Tibial anterior")
                : array("Pecho", "Espalda", "Hombro", "Biceps", "Triceps"));
        put(state, "exercises", exercises);
        put(state, "currentExerciseId", exercises.optJSONObject(0) == null ? "" : exercises.optJSONObject(0).optString("id", ""));
        put(state, "currentExerciseName", exercises.optJSONObject(0) == null ? "" : exercises.optJSONObject(0).optString("name", ""));
        put(state, "progressText", "0/" + exercises.length() + " ejercicios · 0 series · 0 kg");
    }

    private static void seedRest(JSONObject state, String dayKey, String weekday, String name, String message, String[] suggestions) {
        put(state, "dayKey", dayKey);
        put(state, "weekday", weekday);
        put(state, "routineName", name);
        put(state, "title", weekday + " — " + name);
        put(state, "type", "rest");
        put(state, "muscles", array("Recuperacion"));
        put(state, "message", message);
        put(state, "suggestions", array(suggestions));
        put(state, "exercises", new JSONArray());
        put(state, "currentExerciseId", "");
        put(state, "currentExerciseName", "");
        put(state, "progressText", message);
    }

    private static JSONArray torsoExercises() {
        JSONArray exercises = new JSONArray();
        exercises.put(exercise("peck-deck-pecho", "peck-deck", "Apertura sentado / Peck deck", "Pecho", false));
        exercises.put(exercise("press-banca-pecho", "press-banca", "Press de banca", "Pecho", false));
        exercises.put(exercise("dominadas-espalda", "dominadas", "Dominadas", "Espalda", true));
        exercises.put(exercise("jalon-pecho-sentado-espalda", "jalon-pecho-sentado", "Jalon al pecho sentado", "Espalda", false));
        exercises.put(exercise("laterales-polea-hombro", "laterales-polea", "Elevaciones laterales en polea", "Hombro", false));
        exercises.put(exercise("press-militar-maquina-hombro", "press-militar-maquina", "Press militar en maquina", "Hombro", false));
        exercises.put(exercise("curl-martillo-biceps", "curl-martillo", "Curl martillo", "Biceps", false));
        exercises.put(exercise("curl-barra-z-sentado-biceps", "curl-barra-z-sentado", "Curl con barra Z sentado", "Biceps", false));
        exercises.put(exercise("extension-triceps-polea-triceps", "extension-triceps-polea", "Extension de triceps en polea", "Triceps", false));
        return exercises;
    }

    private static JSONArray legExercises() {
        JSONArray exercises = new JSONArray();
        exercises.put(exercise("prensa-cuadriceps-pierna", "prensa", "Prensa", "Cuadriceps / pierna", false));
        exercises.put(exercise("extension-cuadriceps-cuadriceps-pierna", "extension-cuadriceps", "Extension de cuadriceps", "Cuadriceps / pierna", false));
        exercises.put(exercise("aductores-maquina-aductores", "aductores-maquina", "Maquina de aductores, cerrar piernas", "Aductores", false));
        exercises.put(exercise("pantorrillas-sentado-pantorrillas", "pantorrillas-sentado", "Elevacion de pantorrillas sentado", "Pantorrillas", false));
        exercises.put(exercise("tibial-anterior-tibial-anterior", "tibial-anterior", "Elevacion de punta del pie / tibial anterior", "Tibial anterior", false));
        return exercises;
    }

    private static JSONObject exercise(String id, String exerciseId, String name, String muscle, boolean bodyweight) {
        JSONObject exercise = new JSONObject();
        put(exercise, "id", id);
        put(exercise, "exerciseId", exerciseId);
        put(exercise, "name", name);
        put(exercise, "muscle", muscle);
        put(exercise, "type", bodyweight ? "peso corporal" : "maquina");
        put(exercise, "unit", bodyweight ? "peso corporal" : "kg");
        put(exercise, "bodyweight", bodyweight);
        JSONArray primaryMuscles = primaryMuscles(exerciseId);
        JSONArray secondaryMuscles = secondaryMuscles(exerciseId);
        put(exercise, "primaryMuscles", primaryMuscles);
        put(exercise, "secondaryMuscles", secondaryMuscles);
        put(exercise, "classificationStatus", "official");
        put(exercise, "classificationSource", "official-library");
        put(exercise, "classificationConfidence", "high");
        JSONObject snapshot = new JSONObject();
        put(snapshot, "taxonomyVersion", 3);
        put(snapshot, "primaryMuscles", cloneArray(primaryMuscles));
        put(snapshot, "secondaryMuscles", cloneArray(secondaryMuscles));
        put(snapshot, "classificationStatus", "official");
        put(snapshot, "classificationSource", "official-library");
        put(snapshot, "classificationConfidence", "high");
        put(snapshot, "capturedAt", nowIso());
        put(exercise, "muscleClassificationSnapshot", snapshot);
        put(exercise, "completed", false);
        put(exercise, "sets", new JSONArray());
        return exercise;
    }

    private static JSONArray primaryMuscles(String exerciseId) {
        if ("peck-deck".equals(exerciseId) || "press-banca".equals(exerciseId)) return array("chest");
        if ("dominadas".equals(exerciseId) || "jalon-pecho-sentado".equals(exerciseId)) return array("lats");
        if ("laterales-polea".equals(exerciseId)) return array("side-delts");
        if ("press-militar-maquina".equals(exerciseId)) return array("front-delts");
        if ("curl-martillo".equals(exerciseId)) return array("brachialis");
        if ("curl-barra-z-sentado".equals(exerciseId)) return array("biceps");
        if ("extension-triceps-polea".equals(exerciseId)) return array("triceps");
        if ("prensa".equals(exerciseId) || "extension-cuadriceps".equals(exerciseId)) return array("quads");
        if ("aductores-maquina".equals(exerciseId)) return array("adductors");
        if ("pantorrillas-sentado".equals(exerciseId)) return array("calves");
        if ("tibial-anterior".equals(exerciseId)) return array("tibialis");
        return array("other");
    }

    private static JSONArray secondaryMuscles(String exerciseId) {
        if ("peck-deck".equals(exerciseId)) return array("front-delts");
        if ("press-banca".equals(exerciseId)) return array("triceps", "front-delts");
        if ("dominadas".equals(exerciseId)) return array("biceps", "upper-back");
        if ("jalon-pecho-sentado".equals(exerciseId)) return array("biceps");
        if ("laterales-polea".equals(exerciseId)) return array("traps");
        if ("press-militar-maquina".equals(exerciseId)) return array("triceps", "side-delts");
        if ("curl-martillo".equals(exerciseId)) return array("biceps", "forearms");
        if ("curl-barra-z-sentado".equals(exerciseId)) return array("brachialis", "forearms");
        if ("prensa".equals(exerciseId)) return array("glutes", "hamstrings");
        return new JSONArray();
    }

    private static JSONArray array(String... values) {
        JSONArray array = new JSONArray();
        for (String value : values) array.put(value);
        return array;
    }

    private static JSONObject cloneJson(JSONObject source) {
        if (source == null) return new JSONObject();
        try {
            return new JSONObject(source.toString());
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private static JSONArray cloneArray(JSONArray source) {
        if (source == null) return new JSONArray();
        try {
            return new JSONArray(source.toString());
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private static void put(JSONObject object, String key, Object value) {
        try {
            object.put(key, value);
        } catch (Exception ignored) {
        }
    }

    private static String todayDate() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static String nowIso() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date());
    }

    private static double roundHalf(double value) {
        return Math.round(value * 2.0) / 2.0;
    }

    private static double displayWeight(JSONObject state, double weightKg) {
        double value = Math.max(0, weightKg);
        return roundHalf("lb".equalsIgnoreCase(state.optString("unit", "kg")) ? value * 2.2046226218 : value);
    }

    private static double canonicalWeight(JSONObject state, double displayedWeight) {
        double value = Math.max(0, displayedWeight);
        double kg = "lb".equalsIgnoreCase(state.optString("unit", "kg")) ? value / 2.2046226218 : value;
        return Math.round(kg * 100.0) / 100.0;
    }

    private static double displayVolume(JSONObject state, double volumeKg) {
        double value = Math.max(0, volumeKg);
        return "lb".equalsIgnoreCase(state.optString("unit", "kg")) ? value * 2.2046226218 : value;
    }

    private static String formatWeight(double value) {
        if (Math.abs(value - Math.round(value)) < 0.001) return String.valueOf(Math.round(value));
        return String.format(Locale.US, "%.1f", value);
    }

    private static String shortName(String name) {
        if (name == null) return "";
        return name
                .replace("Apertura sentado / ", "")
                .replace("Jalon al pecho sentado", "Jalon")
                .replace("Jalón al pecho sentado", "Jalon")
                .replace("Elevaciones laterales en polea", "Laterales")
                .replace("Maquina de aductores, cerrar piernas", "Aductores")
                .replace("Máquina de aductores, cerrar piernas", "Aductores")
                .replace("Elevacion de pantorrillas sentado", "Pantorrillas")
                .replace("Elevación de pantorrillas sentado", "Pantorrillas")
                .replace("Elevacion de punta del pie / tibial anterior", "Tibial")
                .replace("Elevación de punta del pie / tibial anterior", "Tibial")
                .trim();
    }

    static class WidgetState {
        String title;
        String summary;
        String exerciseText;
        String progressText;
        String currentExerciseId;
        String currentExerciseName;
        String setStatsText;
        String quickRepsText;
        String quickWeightText;
        String unit;
        String quickRepsDescription;
        String quickWeightDescription;
        String actionStatus;
        String loadGuidanceText;
        String type;
        boolean timerEnabled;
        String timerStatus;
        long timerEndsAtElapsed;
        long timerPausedRemainingMs;
        int timerConfiguredSeconds;
        long nativeRevision;
        boolean canUndo;
        boolean requiresEditor;

        static WidgetState fromJson(JSONObject json) {
            WidgetState state = new WidgetState();
            state.title = opt(json, "title", "Entrenamiento de hoy");
            state.nativeRevision = WorkoutNativeRepository.revision(json);
            state.type = opt(json, "type", "workout");
            state.unit = opt(json, "unit", "kg");
            state.currentExerciseId = opt(json, "currentExerciseId", "");
            state.currentExerciseName = opt(json, "currentExerciseName", "Ejercicio actual");
            state.progressText = opt(json, "progressText", "Sin progreso registrado");
            state.setStatsText = setStatsText(json, null);

            JSONArray muscles = json.optJSONArray("muscles");
            state.summary = muscles == null || muscles.length() == 0 ? opt(json, "message", "") : join(muscles, " · ", 5);
            if (state.summary.length() == 0) state.summary = opt(json, "routineName", "");

            JSONArray exercises = json.optJSONArray("exercises");
            if (exercises == null || exercises.length() == 0) {
                JSONArray suggestions = json.optJSONArray("suggestions");
                state.exerciseText = suggestions == null ? opt(json, "message", "Abri la app para preparar la sesion.") : join(suggestions, " · ", 4);
            } else {
                state.exerciseText = joinExerciseNames(exercises, 8);
            }

            JSONObject quick = json.optJSONObject("quickLog");
            if (quick != null) {
                state.currentExerciseName = opt(quick, "exerciseName", state.currentExerciseName);
                String mode = quick.optString("measurementMode", "reps");
                String loadMode = quick.optString("loadMode", quick.optBoolean("bodyweight", false) ? "bodyweight" : "total");
                state.requiresEditor = "time".equals(mode) || "distance".equals(mode);
                if ("time".equals(mode)) {
                    state.quickRepsText = formatDuration(Math.round(Math.max(0, quick.optDouble("durationSeconds", 0)) * 1000d));
                    state.quickWeightText = "Duracion";
                    state.quickRepsDescription = "Duracion preparada " + state.quickRepsText;
                    state.quickWeightDescription = "Ejercicio medido por tiempo";
                } else if ("distance".equals(mode)) {
                    state.quickRepsText = formatWeight(quick.optDouble("distanceMeters", 0)) + " m";
                    state.quickWeightText = quick.optDouble("durationSeconds", 0) > 0
                            ? formatDuration(Math.round(quick.optDouble("durationSeconds", 0) * 1000d)) : "Distancia";
                    state.quickRepsDescription = "Distancia preparada " + state.quickRepsText;
                    state.quickWeightDescription = "Duracion opcional " + state.quickWeightText;
                } else {
                    state.quickRepsText = quick.optInt("reps", 8) + " reps";
                    double weight = Math.max(0, quick.optDouble("weight", 0));
                    String unit = opt(quick, "unit", state.unit);
                    state.unit = unit;
                    if ((quick.optBoolean("bodyweight", false) || "bodyweight".equals(loadMode)) && weight <= 0) state.quickWeightText = "Peso corporal";
                    else if ("assistance".equals(loadMode)) state.quickWeightText = formatWeight(weight) + " " + unit + " asistencia";
                    else if ("addedLoad".equals(loadMode)) state.quickWeightText = "+" + formatWeight(weight) + " " + unit;
                    else state.quickWeightText = formatWeight(weight) + " " + unit;
                    state.quickRepsDescription = "Repeticiones preparadas " + state.quickRepsText;
                    state.quickWeightDescription = "Carga preparada " + state.quickWeightText;
                }
                state.setStatsText = setStatsText(json, quick);
            } else {
                state.quickRepsText = "8 reps";
                state.quickWeightText = "0 " + json.optString("unit", "kg");
                state.quickRepsDescription = "Repeticiones preparadas 8";
                state.quickWeightDescription = "Carga preparada " + state.quickWeightText;
            }
            state.actionStatus = opt(json, "lastWidgetActionText", "Ajusta reps/kg y guarda desde el widget.");
            state.loadGuidanceText = loadGuidanceText(json);
            return state;
        }

        private static String loadGuidanceText(JSONObject json) {
            JSONObject last = json.optJSONObject("lastComparableSet");
            JSONObject record = json.optJSONObject("historicalLoadRecord");
            String lastText = last == null ? "sin datos" : last.optString("label", "sin datos");
            String recordText = record == null ? "sin datos" : record.optString("label", "sin datos");
            return "Última: " + lastText + " · Mejor: " + recordText;
        }

        void applyNativeControl(JSONObject control) {
            JSONObject flags = control == null ? null : control.optJSONObject("featureFlags");
            timerEnabled = flags != null && flags.optBoolean("nativeRestTimer", false);
            JSONObject timer = control == null ? null : control.optJSONObject("timer");
            timerStatus = timer == null ? "idle" : timer.optString("timerStatus", "idle");
            timerEndsAtElapsed = timer == null ? 0L : timer.optLong("endsAtElapsedRealtime", 0L);
            timerPausedRemainingMs = timer == null ? 0L : timer.optLong("pausedRemainingMs", 0L);
            timerConfiguredSeconds = timer == null ? 90 : Math.max(15, timer.optInt("configuredSeconds", 90));
            canUndo = control != null && System.currentTimeMillis() <= control.optLong("undoUntilEpochMs", 0L);
        }

        private static String setStatsText(JSONObject state, JSONObject quick) {
            JSONObject source = quick == null ? state : quick;
            int exerciseSets = source == null ? 0 : source.optInt("currentExerciseSets", state == null ? 0 : state.optInt("currentExerciseSets", 0));
            int muscleSets = source == null ? 0 : source.optInt("currentMuscleSets", state == null ? 0 : state.optInt("currentMuscleSets", 0));
            String muscle = opt(source == null ? state : source, "currentMuscleName", state == null ? "" : state.optString("currentMuscleName", ""));
            if (muscle.length() == 0) muscle = "musculo";
            return "Ejercicio: " + exerciseSets + " series · " + muscle + ": " + muscleSets + " series";
        }

        private static String opt(JSONObject json, String key, String fallback) {
            String value = json == null ? fallback : json.optString(key, fallback);
            return value == null || value.trim().length() == 0 || "null".equals(value) ? fallback : value;
        }

        private static String join(JSONArray array, String separator, int limit) {
            StringBuilder builder = new StringBuilder();
            int count = Math.min(array.length(), limit);
            for (int i = 0; i < count; i++) {
                if (i > 0) builder.append(separator);
                builder.append(array.optString(i));
            }
            return builder.toString();
        }

        private static String joinExerciseNames(JSONArray exercises, int limit) {
            StringBuilder builder = new StringBuilder();
            int count = Math.min(exercises.length(), limit);
            for (int i = 0; i < count; i++) {
                JSONObject exercise = exercises.optJSONObject(i);
                String name = exercise == null ? exercises.optString(i) : exercise.optString("name", "");
                if (name.length() == 0) continue;
                if (builder.length() > 0) builder.append(" · ");
                builder.append(shortName(name));
            }
            if (exercises.length() > limit) builder.append("...");
            return builder.toString();
        }
    }
}
