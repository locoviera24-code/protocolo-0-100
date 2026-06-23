package com.protocolo.cien;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
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
    private static final double WEIGHT_STEP = 0.5;

    private WorkoutWidgetUpdateService() {}

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, WorkoutWidgetProvider.class);
        updateWidgets(context, manager, manager.getAppWidgetIds(component));
    }

    public static void updateWidgets(Context context, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        WidgetState state = WidgetState.fromJson(readStateJson(context));
        for (int id : ids) {
            RemoteViews views = buildViews(context, manager, id, state);
            manager.updateAppWidget(id, views);
        }
    }

    public static boolean handleWidgetAction(Context context, String action) {
        if (!isDirectAction(action)) return false;
        JSONObject state = readStateJson(context);
        applyDirectAction(state, action);
        saveStateJson(context, state);
        updateAll(context);
        return true;
    }

    static WidgetState readState(Context context) {
        return WidgetState.fromJson(readStateJson(context));
    }

    private static JSONObject readStateJson(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_STATE_JSON, "");
        if (raw != null && raw.trim().length() > 0) {
            try {
                JSONObject json = new JSONObject(raw);
                if (!todayDate().equals(json.optString("date", todayDate()))) return jsonForTodayFromSource(json);
                return json;
            } catch (Exception ignored) {
            }
        }
        return defaultJsonForToday();
    }

    private static void saveStateJson(Context context, JSONObject state) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_STATE_JSON, state == null ? "" : state.toString())
                .apply();
    }

    private static RemoteViews buildViews(Context context, AppWidgetManager manager, int widgetId, WidgetState state) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        int minWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int layout = minWidth > 0 && minWidth < 230 ? R.layout.widget_workout_small : R.layout.widget_workout_medium;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);

        views.setTextViewText(R.id.widgetTitle, state.title);
        views.setTextViewText(R.id.widgetSummary, state.summary);
        views.setTextViewText(R.id.widgetExercises, state.exerciseText);
        views.setTextViewText(R.id.widgetProgress, state.progressText);
        views.setTextViewText(R.id.widgetCurrentExercise, state.currentExerciseName);
        views.setTextViewText(R.id.widgetQuickReps, state.quickRepsText);
        views.setTextViewText(R.id.widgetQuickWeight, state.quickWeightText);
        views.setTextViewText(R.id.widgetActionStatus, state.actionStatus);

        boolean restDay = "rest".equals(state.type);
        views.setViewVisibility(R.id.widgetDirectPanel, restDay ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widgetQuickButton, restDay ? View.GONE : View.VISIBLE);
        views.setTextViewText(R.id.widgetQuickButton, restDay ? "Descanso" : "Abrir registro");

        views.setOnClickPendingIntent(R.id.widgetRoot, openIntent(context, MainActivity.ACTION_OPEN_TODAY_WORKOUT, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetOpenButton, openIntent(context, MainActivity.ACTION_OPEN_TODAY_WORKOUT, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetQuickButton, openIntent(context, MainActivity.ACTION_QUICK_LOG_SET, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetRefreshButton, refreshIntent(context));

        views.setOnClickPendingIntent(R.id.widgetRepsMinusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_REPS_DOWN));
        views.setOnClickPendingIntent(R.id.widgetRepsPlusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_REPS_UP));
        views.setOnClickPendingIntent(R.id.widgetWeightMinusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_DOWN));
        views.setOnClickPendingIntent(R.id.widgetWeightPlusButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_UP));
        views.setOnClickPendingIntent(R.id.widgetSaveSetButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET));
        views.setOnClickPendingIntent(R.id.widgetRepeatButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_REPEAT_LAST));
        views.setOnClickPendingIntent(R.id.widgetPreviousButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE));
        views.setOnClickPendingIntent(R.id.widgetNextButton, widgetActionIntent(context, MainActivity.ACTION_WIDGET_NEXT_EXERCISE));
        return views;
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

    private static PendingIntent widgetActionIntent(Context context, String action) {
        Intent intent = new Intent(context, WorkoutWidgetProvider.class);
        intent.setAction(action);
        int requestCode = Math.abs(action.hashCode());
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static boolean isDirectAction(String action) {
        return MainActivity.ACTION_WIDGET_REPS_DOWN.equals(action)
                || MainActivity.ACTION_WIDGET_REPS_UP.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_DOWN.equals(action)
                || MainActivity.ACTION_WIDGET_WEIGHT_UP.equals(action)
                || MainActivity.ACTION_WIDGET_SAVE_SET.equals(action)
                || MainActivity.ACTION_WIDGET_REPEAT_LAST.equals(action)
                || MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE.equals(action)
                || MainActivity.ACTION_WIDGET_NEXT_EXERCISE.equals(action);
    }

    private static void applyDirectAction(JSONObject state, String action) {
        if ("rest".equals(state.optString("type", "workout"))) {
            put(state, "lastWidgetActionText", "Hoy toca descanso. La recuperacion tambien cuenta.");
            touchDirect(state);
            return;
        }
        if (MainActivity.ACTION_WIDGET_REPS_DOWN.equals(action)) {
            adjustQuick(state, "reps", -1);
        } else if (MainActivity.ACTION_WIDGET_REPS_UP.equals(action)) {
            adjustQuick(state, "reps", 1);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_DOWN.equals(action)) {
            adjustQuick(state, "weight", -WEIGHT_STEP);
        } else if (MainActivity.ACTION_WIDGET_WEIGHT_UP.equals(action)) {
            adjustQuick(state, "weight", WEIGHT_STEP);
        } else if (MainActivity.ACTION_WIDGET_REPEAT_LAST.equals(action)) {
            repeatLast(state);
        } else if (MainActivity.ACTION_WIDGET_PREVIOUS_EXERCISE.equals(action)) {
            moveToPreviousExercise(state);
        } else if (MainActivity.ACTION_WIDGET_NEXT_EXERCISE.equals(action)) {
            moveToNextExercise(state);
        } else if (MainActivity.ACTION_WIDGET_SAVE_SET.equals(action)) {
            saveSet(state);
        }
        touchDirect(state);
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
        put(quick, "weight", roundHalf(Math.max(0, last.optDouble("weight", last.optDouble("lastWeight", 0)))));
        put(quick, "bodyweight", last.optBoolean("bodyweight", quick.optBoolean("bodyweight", false)));
        put(state, "quickLog", quick);
        put(state, "lastWidgetActionText", "Ultima serie cargada. Toca Guardar serie para repetirla.");
    }

    private static void saveSet(JSONObject state) {
        JSONObject session = ensureSession(state);
        JSONObject exercise = currentExercise(state, session);
        if (session == null || exercise == null) {
            put(state, "lastWidgetActionText", "No hay ejercicio activo para registrar.");
            return;
        }
        JSONObject quick = ensureQuickLog(state, exercise);
        int reps = Math.max(0, quick.optInt("reps", 8));
        double weight = roundHalf(Math.max(0, quick.optDouble("weight", 0)));
        if (reps <= 0) {
            put(state, "lastWidgetActionText", "Subi las repeticiones antes de guardar.");
            return;
        }

        JSONArray sets = exercise.optJSONArray("sets");
        if (sets == null) sets = new JSONArray();
        int setNumber = sets.length() + 1;
        JSONObject set = new JSONObject();
        put(set, "id", "set_android_" + System.currentTimeMillis());
        put(set, "setNumber", setNumber);
        put(set, "reps", reps);
        put(set, "weight", weight);
        put(set, "rir", JSONObject.NULL);
        put(set, "rpe", JSONObject.NULL);
        put(set, "bodyweight", quick.optBoolean("bodyweight", exercise.optBoolean("bodyweight", false)));
        put(set, "note", "Guardado desde widget Android");
        put(set, "savedAt", nowIso());
        put(set, "volume", Math.round(reps * weight));
        sets.put(set);
        put(exercise, "sets", sets);

        int index = indexOfExercise(session.optJSONArray("exercises"), exerciseIdOf(exercise));
        put(session, "currentExerciseIndex", Math.max(0, index));
        put(session, "summary", sessionSummary(session));
        put(state, "workoutSession", session);
        updateHistory(state, session, exercise);
        refreshStateFromSession(state, session, exercise);
        put(state, "lastWidgetActionText", "Serie guardada: " + shortName(exercise.optString("name", "Ejercicio")) + " · " + reps + " reps · " + formatWeight(weight) + " kg.");
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
            put(quick, "weight", last == null ? 0 : roundHalf(Math.max(0, last.optDouble("weight", last.optDouble("lastWeight", 0)))));
            put(quick, "bodyweight", last == null ? (exercise != null && exercise.optBoolean("bodyweight", false)) : last.optBoolean("bodyweight", exercise != null && exercise.optBoolean("bodyweight", false)));
        }
        put(quick, "currentExerciseId", currentId);
        put(quick, "exerciseName", exercise == null ? "Ejercicio actual" : exercise.optString("name", "Ejercicio actual"));
        put(quick, "setNumber", setNumber);
        put(quick, "unit", state.optString("unit", "kg"));
        put(quick, "weightStep", WEIGHT_STEP);
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
        put(state, "progressText", summary.optInt("completedExercises", 0) + "/" + summary.optInt("totalExercises", 0)
                + " ejercicios · " + summary.optInt("totalSets", 0) + " series · "
                + Math.round(summary.optDouble("totalVolume", 0)) + " " + state.optString("unit", "kg"));
        ensureQuickLog(state, selectedExercise);
    }

    private static JSONObject sessionSummary(JSONObject session) {
        JSONObject summary = new JSONObject();
        JSONArray exercises = session.optJSONArray("exercises");
        int completed = 0;
        int totalSets = 0;
        double totalVolume = 0;
        JSONObject bestByExercise = new JSONObject();
        if (exercises != null) {
            for (int i = 0; i < exercises.length(); i++) {
                JSONObject exercise = exercises.optJSONObject(i);
                if (exercise == null) continue;
                JSONArray sets = exercise.optJSONArray("sets");
                int setCount = sets == null ? 0 : sets.length();
                if (exercise.optBoolean("completed", false) || setCount > 0) completed++;
                totalSets += setCount;
                JSONObject best = null;
                double bestVolume = -1;
                for (int j = 0; j < setCount; j++) {
                    JSONObject set = sets.optJSONObject(j);
                    if (set == null) continue;
                    double volume = Math.max(0, set.optDouble("reps", 0)) * Math.max(0, set.optDouble("weight", 0));
                    totalVolume += volume;
                    if (volume > bestVolume) {
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
        JSONObject last = sets.optJSONObject(sets.length() - 1);
        JSONObject best = last;
        double bestVolume = -1;
        double volumeTotal = 0;
        for (int i = 0; i < sets.length(); i++) {
            JSONObject set = sets.optJSONObject(i);
            if (set == null) continue;
            double volume = Math.max(0, set.optDouble("reps", 0)) * Math.max(0, set.optDouble("weight", 0));
            volumeTotal += volume;
            if (volume > bestVolume) {
                bestVolume = volume;
                best = set;
            }
        }
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
        put(row, "lastSets", sets.length());
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
        return sets == null || sets.length() == 0 ? null : sets.optJSONObject(sets.length() - 1);
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
        put(exercise, "completed", false);
        put(exercise, "sets", new JSONArray());
        return exercise;
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
        String quickRepsText;
        String quickWeightText;
        String actionStatus;
        String type;

        static WidgetState fromJson(JSONObject json) {
            WidgetState state = new WidgetState();
            state.title = opt(json, "title", "Entrenamiento de hoy");
            state.type = opt(json, "type", "workout");
            state.currentExerciseId = opt(json, "currentExerciseId", "");
            state.currentExerciseName = opt(json, "currentExerciseName", "Ejercicio actual");
            state.progressText = opt(json, "progressText", "Sin progreso registrado");

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
                state.quickRepsText = quick.optInt("reps", 8) + " reps";
                state.quickWeightText = formatWeight(quick.optDouble("weight", 0)) + " " + opt(quick, "unit", json.optString("unit", "kg"));
            } else {
                state.quickRepsText = "8 reps";
                state.quickWeightText = "0 " + json.optString("unit", "kg");
            }
            state.actionStatus = opt(json, "lastWidgetActionText", "Ajusta reps/kg y guarda desde el widget.");
            return state;
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
