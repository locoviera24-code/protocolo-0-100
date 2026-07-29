package com.protocolo.cien;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

import org.json.JSONObject;

public final class WorkoutTimerController {
    public static final String ACTION_TIMER_START = "com.protocolo.cien.ACTION_TIMER_START";
    public static final String ACTION_TIMER_PAUSE = "com.protocolo.cien.ACTION_TIMER_PAUSE";
    public static final String ACTION_TIMER_RESUME = "com.protocolo.cien.ACTION_TIMER_RESUME";
    public static final String ACTION_TIMER_STOP = "com.protocolo.cien.ACTION_TIMER_STOP";
    public static final String ACTION_TIMER_ADD_15 = "com.protocolo.cien.ACTION_TIMER_ADD_15";
    public static final String ACTION_TIMER_SUBTRACT_15 = "com.protocolo.cien.ACTION_TIMER_SUBTRACT_15";
    public static final String ACTION_TIMER_FINISHED = "com.protocolo.cien.ACTION_TIMER_FINISHED";
    private static final int TIMER_REQUEST_CODE = 6200;
    private static final int DEFAULT_SECONDS = 90;
    private static final int MIN_SECONDS = 15;
    private static final int MAX_SECONDS = 60 * 60;

    private WorkoutTimerController() {}

    public static synchronized boolean handleAction(Context context, String action) {
        if (!NativeWorkoutControlRepository.featureEnabled(context, "nativeRestTimer")) return false;
        JSONObject timer = currentState(context);
        if (ACTION_TIMER_START.equals(action)) {
            start(context, timer.optInt("configuredSeconds", configuredSeconds(context)));
        } else if (ACTION_TIMER_PAUSE.equals(action)) {
            pause(context, timer);
        } else if (ACTION_TIMER_RESUME.equals(action)) {
            resume(context, timer);
        } else if (ACTION_TIMER_STOP.equals(action)) {
            stop(context);
        } else if (ACTION_TIMER_ADD_15.equals(action)) {
            adjust(context, timer, 15_000L);
        } else if (ACTION_TIMER_SUBTRACT_15.equals(action)) {
            adjust(context, timer, -15_000L);
        } else if (ACTION_TIMER_FINISHED.equals(action)) {
            finish(context, timer);
        } else {
            return false;
        }
        if (ACTION_TIMER_FINISHED.equals(action)) {
            WorkoutWidgetUpdateService.updateAll(context);
            WorkoutControlNotificationManager.notifyTimerFinished(context);
        } else {
            refreshSurfaces(context);
        }
        return true;
    }

    public static void startAfterSavedSetIfEnabled(Context context) {
        JSONObject settings = NativeWorkoutControlRepository.nativeSettings(context);
        if (!NativeWorkoutControlRepository.featureEnabled(context, "nativeRestTimer")
                || !settings.optBoolean("autoStartRestTimer", false)) return;
        start(context, settings.optInt("restSeconds", DEFAULT_SECONDS));
    }

    public static synchronized void start(Context context, int seconds) {
        int safeSeconds = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, seconds));
        long now = SystemClock.elapsedRealtime();
        JSONObject timer = baseState();
        put(timer, "timerMode", "rest_countdown");
        put(timer, "timerStatus", "running");
        put(timer, "startedAtElapsedRealtime", now);
        put(timer, "endsAtElapsedRealtime", now + safeSeconds * 1000L);
        put(timer, "pausedRemainingMs", 0L);
        put(timer, "configuredSeconds", safeSeconds);
        put(timer, "updatedAtElapsedRealtime", now);
        NativeWorkoutControlRepository.updateTimer(context, timer);
        scheduleFinish(context, now + safeSeconds * 1000L);
        refreshSurfaces(context);
    }

    public static JSONObject currentState(Context context) {
        JSONObject timer = NativeWorkoutControlRepository.readControlState(context).optJSONObject("timer");
        JSONObject value = timer == null ? baseState() : cloneObject(timer);
        if ("running".equals(value.optString("timerStatus")) && remainingMs(value) <= 0) {
            put(value, "timerStatus", "finished");
            put(value, "pausedRemainingMs", 0L);
            put(value, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
            NativeWorkoutControlRepository.updateTimer(context, value);
        }
        return value;
    }

    public static long remainingMs(JSONObject timer) {
        if (timer == null) return 0;
        String status = timer.optString("timerStatus", "idle");
        if ("paused".equals(status)) return Math.max(0L, timer.optLong("pausedRemainingMs", 0L));
        if (!"running".equals(status)) return 0;
        return Math.max(0L, timer.optLong("endsAtElapsedRealtime", 0L) - SystemClock.elapsedRealtime());
    }

    private static void pause(Context context, JSONObject timer) {
        if (!"running".equals(timer.optString("timerStatus"))) return;
        put(timer, "pausedRemainingMs", remainingMs(timer));
        put(timer, "timerStatus", "paused");
        put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
        NativeWorkoutControlRepository.updateTimer(context, timer);
        cancelFinish(context);
    }

    private static void resume(Context context, JSONObject timer) {
        if (!"paused".equals(timer.optString("timerStatus"))) return;
        long remaining = Math.max(1_000L, timer.optLong("pausedRemainingMs", configuredSeconds(context) * 1000L));
        long now = SystemClock.elapsedRealtime();
        put(timer, "timerStatus", "running");
        put(timer, "startedAtElapsedRealtime", now);
        put(timer, "endsAtElapsedRealtime", now + remaining);
        put(timer, "pausedRemainingMs", 0L);
        put(timer, "updatedAtElapsedRealtime", now);
        NativeWorkoutControlRepository.updateTimer(context, timer);
        scheduleFinish(context, now + remaining);
    }

    private static void stop(Context context) {
        JSONObject timer = baseState();
        put(timer, "timerStatus", "idle");
        put(timer, "configuredSeconds", configuredSeconds(context));
        put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
        NativeWorkoutControlRepository.updateTimer(context, timer);
        cancelFinish(context);
    }

    private static void finish(Context context, JSONObject timer) {
        if (!"running".equals(timer.optString("timerStatus")) || remainingMs(timer) > 1_000L) {
            if ("running".equals(timer.optString("timerStatus"))) scheduleFinish(context, timer.optLong("endsAtElapsedRealtime", 0L));
            return;
        }
        put(timer, "timerStatus", "finished");
        put(timer, "pausedRemainingMs", 0L);
        put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
        NativeWorkoutControlRepository.updateTimer(context, timer);
    }

    private static void adjust(Context context, JSONObject timer, long deltaMs) {
        String status = timer.optString("timerStatus", "idle");
        if ("running".equals(status)) {
            long now = SystemClock.elapsedRealtime();
            long nextEnd = Math.max(now + 1_000L, timer.optLong("endsAtElapsedRealtime", now) + deltaMs);
            put(timer, "endsAtElapsedRealtime", nextEnd);
            put(timer, "updatedAtElapsedRealtime", now);
            NativeWorkoutControlRepository.updateTimer(context, timer);
            scheduleFinish(context, nextEnd);
        } else if ("paused".equals(status)) {
            put(timer, "pausedRemainingMs", Math.max(1_000L, timer.optLong("pausedRemainingMs", 0L) + deltaMs));
            put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
            NativeWorkoutControlRepository.updateTimer(context, timer);
        } else {
            start(context, Math.max(MIN_SECONDS, configuredSeconds(context) + (int) (deltaMs / 1000L)));
        }
    }

    private static int configuredSeconds(Context context) {
        return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS,
                NativeWorkoutControlRepository.nativeSettings(context).optInt("restSeconds", DEFAULT_SECONDS)));
    }

    private static JSONObject baseState() {
        JSONObject timer = new JSONObject();
        put(timer, "schemaVersion", 1);
        put(timer, "timerMode", "rest_countdown");
        put(timer, "timerStatus", "idle");
        put(timer, "startedAtElapsedRealtime", 0L);
        put(timer, "endsAtElapsedRealtime", 0L);
        put(timer, "pausedRemainingMs", 0L);
        put(timer, "configuredSeconds", DEFAULT_SECONDS);
        put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
        return timer;
    }

    private static void scheduleFinish(Context context, long triggerAtElapsed) {
        if (triggerAtElapsed <= 0) return;
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtElapsed, finishIntent(context));
    }

    private static void cancelFinish(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.cancel(finishIntent(context));
    }

    private static PendingIntent finishIntent(Context context) {
        Intent intent = new Intent(context, WorkoutControlReceiver.class).setAction(ACTION_TIMER_FINISHED);
        return PendingIntent.getBroadcast(context, TIMER_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void refreshSurfaces(Context context) {
        WorkoutWidgetUpdateService.updateAll(context);
        WorkoutControlNotificationManager.update(context);
    }

    private static JSONObject cloneObject(JSONObject value) {
        try { return value == null ? new JSONObject() : new JSONObject(value.toString()); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value); } catch (Exception ignored) {}
    }
}
