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

import java.util.Calendar;
import java.util.Locale;

public final class WorkoutWidgetUpdateService {
    public static final String PREFS_NAME = "protocolo_workout_widget";
    public static final String KEY_STATE_JSON = "state_json";

    private WorkoutWidgetUpdateService() {}

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, WorkoutWidgetProvider.class);
        updateWidgets(context, manager, manager.getAppWidgetIds(component));
    }

    public static void updateWidgets(Context context, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        WidgetState state = readState(context);
        for (int id : ids) {
            RemoteViews views = buildViews(context, manager, id, state);
            manager.updateAppWidget(id, views);
        }
    }

    static WidgetState readState(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_STATE_JSON, "");
        if (raw != null && raw.trim().length() > 0) {
            try {
                return WidgetState.fromJson(new JSONObject(raw));
            } catch (Exception ignored) {
            }
        }
        return WidgetState.defaultForToday();
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

        boolean restDay = "rest".equals(state.type);
        views.setViewVisibility(R.id.widgetQuickButton, restDay ? View.GONE : View.VISIBLE);
        views.setTextViewText(R.id.widgetQuickButton, restDay ? "Descanso" : "Registrar serie");

        views.setOnClickPendingIntent(R.id.widgetRoot, openIntent(context, MainActivity.ACTION_OPEN_TODAY_WORKOUT, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetOpenButton, openIntent(context, MainActivity.ACTION_OPEN_TODAY_WORKOUT, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetQuickButton, openIntent(context, MainActivity.ACTION_QUICK_LOG_SET, state.currentExerciseId));
        views.setOnClickPendingIntent(R.id.widgetRefreshButton, refreshIntent(context));
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
        return PendingIntent.getBroadcast(context, 1004, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static class WidgetState {
        String title;
        String summary;
        String exerciseText;
        String progressText;
        String currentExerciseId;
        String type;

        static WidgetState fromJson(JSONObject json) {
            WidgetState state = new WidgetState();
            state.title = opt(json, "title", "Entrenamiento de hoy");
            state.type = opt(json, "type", "workout");
            state.currentExerciseId = opt(json, "currentExerciseId", "");
            state.progressText = opt(json, "progressText", "Sin progreso registrado");

            JSONArray muscles = json.optJSONArray("muscles");
            state.summary = muscles == null || muscles.length() == 0 ? opt(json, "message", "") : join(muscles, " · ", 5);
            if (state.summary.length() == 0) state.summary = opt(json, "routineName", "");

            JSONArray exercises = json.optJSONArray("exercises");
            if (exercises == null || exercises.length() == 0) {
                JSONArray suggestions = json.optJSONArray("suggestions");
                state.exerciseText = suggestions == null ? opt(json, "message", "Abrí la app para preparar la sesión.") : join(suggestions, " · ", 4);
            } else {
                state.exerciseText = joinExerciseNames(exercises, 8);
            }
            return state;
        }

        static WidgetState defaultForToday() {
            Calendar calendar = Calendar.getInstance();
            int day = calendar.get(Calendar.DAY_OF_WEEK);
            WidgetState state = new WidgetState();
            state.type = (day == Calendar.SATURDAY || day == Calendar.SUNDAY) ? "rest" : "workout";
            switch (day) {
                case Calendar.MONDAY:
                    state.title = "Lunes — Torso A";
                    state.summary = "Pecho · Espalda · Hombro · Bíceps · Tríceps";
                    state.exerciseText = "Peck deck · Press banca · Dominadas · Jalón · Laterales · Press militar";
                    state.currentExerciseId = "peck-deck-pecho";
                    break;
                case Calendar.TUESDAY:
                    state.title = "Martes — Pierna A";
                    state.summary = "Cuádriceps · Aductores · Pantorrillas · Tibial anterior";
                    state.exerciseText = "Prensa · Extensión de cuádriceps · Aductores · Pantorrillas · Tibial anterior";
                    state.currentExerciseId = "prensa-cu-driceps-pierna";
                    break;
                case Calendar.WEDNESDAY:
                    state.title = "Miércoles — Torso B";
                    state.summary = "Pecho · Espalda · Hombro · Bíceps · Tríceps";
                    state.exerciseText = "Peck deck · Press banca · Dominadas · Jalón · Laterales · Press militar";
                    state.currentExerciseId = "peck-deck-pecho";
                    break;
                case Calendar.THURSDAY:
                    state.title = "Jueves — Pierna B";
                    state.summary = "Cuádriceps · Aductores · Pantorrillas · Tibial anterior";
                    state.exerciseText = "Prensa · Extensión de cuádriceps · Aductores · Pantorrillas · Tibial anterior";
                    state.currentExerciseId = "prensa-cu-driceps-pierna";
                    break;
                case Calendar.FRIDAY:
                    state.title = "Viernes — Torso C";
                    state.summary = "Pecho · Espalda · Hombro · Bíceps · Tríceps";
                    state.exerciseText = "Peck deck · Press banca · Dominadas · Jalón · Laterales · Press militar";
                    state.currentExerciseId = "peck-deck-pecho";
                    break;
                case Calendar.SATURDAY:
                    state.title = "Sábado — Descanso / actividad suave";
                    state.summary = "Recuperación";
                    state.exerciseText = "Caminar · movilidad · estiramiento suave · recuperación";
                    state.currentExerciseId = "";
                    break;
                default:
                    state.title = "Domingo — Descanso / revisión semanal";
                    state.summary = "Revisión semanal";
                    state.exerciseText = "Revisar entrenamientos · progresión · preparar semana · movilidad suave";
                    state.currentExerciseId = "";
                    break;
            }
            state.progressText = "Abrí la app para registrar la sesión";
            return state;
        }

        private static String opt(JSONObject json, String key, String fallback) {
            String value = json.optString(key, fallback);
            return value == null || value.trim().length() == 0 ? fallback : value;
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
            if (exercises.length() > limit) builder.append("…");
            return builder.toString();
        }

        private static String shortName(String name) {
            return name
                    .replace("Apertura sentado / ", "")
                    .replace("Jalón al pecho sentado", "Jalón")
                    .replace("Elevaciones laterales en polea", "Laterales")
                    .replace("Máquina de aductores, cerrar piernas", "Aductores")
                    .replace("Elevación de pantorrillas sentado", "Pantorrillas")
                    .replace("Elevación de punta del pie / tibial anterior", "Tibial")
                    .trim();
        }
    }
}
