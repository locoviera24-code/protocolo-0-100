package com.protocolo.cien;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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
    public static final String MODE_COUNTDOWN = "rest_countdown";
    public static final String MODE_STOPWATCH = "stopwatch";
    private static final int TIMER_REQUEST_CODE = 6200;
    private static final int DEFAULT_SECONDS = 90;
    private static final int MIN_SECONDS = 15;
    private static final int MAX_SECONDS = 60 * 60;
    private static final long MAX_TIMER_MS = MAX_SECONDS * 1000L;
    private static final long MAX_STOPWATCH_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final long BOOT_CLOCK_TOLERANCE_MS = 2L * 60L * 1000L;

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
                || !settings.optBoolean("autoStartRestTimer", false)
                || !MODE_COUNTDOWN.equals(configuredMode(context))) return;
        start(context, settings.optInt("restSeconds", DEFAULT_SECONDS));
    }

    public static synchronized void start(Context context, int seconds) {
        int safeSeconds = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, seconds));
        long nowElapsed = SystemClock.elapsedRealtime();
        long nowEpoch = System.currentTimeMillis();
        String mode = configuredMode(context);
        JSONObject timer = baseState();
        put(timer, "timerMode", mode);
        put(timer, "timerStatus", "running");
        put(timer, "startedAtElapsedRealtime", nowElapsed);
        put(timer, "startedAtEpochMs", nowEpoch);
        put(timer, "bootEpochMs", nowEpoch - nowElapsed);
        put(timer, "configuredSeconds", safeSeconds);
        put(timer, "updatedAtElapsedRealtime", nowElapsed);
        put(timer, "updatedAtEpochMs", nowEpoch);
        if (MODE_STOPWATCH.equals(mode)) {
            put(timer, "endsAtElapsedRealtime", 0L);
            put(timer, "endsAtEpochMs", 0L);
            put(timer, "elapsedBeforeStartMs", 0L);
            cancelFinish(context);
        } else {
            long duration = safeSeconds * 1000L;
            put(timer, "endsAtElapsedRealtime", nowElapsed + duration);
            put(timer, "endsAtEpochMs", nowEpoch + duration);
        }
        NativeWorkoutControlRepository.updateTimer(context, timer);
        if (MODE_COUNTDOWN.equals(mode)) scheduleFinish(context, timer.optLong("endsAtElapsedRealtime", 0L));
        refreshSurfaces(context);
    }

    public static JSONObject currentState(Context context) {
        JSONObject stored = NativeWorkoutControlRepository.readControlState(context).optJSONObject("timer");
        JSONObject value = stored == null ? baseState() : cloneObject(stored);
        boolean changed = reconcileRuntimeClock(value);
        if (MODE_COUNTDOWN.equals(mode(value))
                && "running".equals(value.optString("timerStatus"))
                && remainingMs(value) <= 0) {
            put(value, "timerStatus", "finished");
            put(value, "pausedRemainingMs", 0L);
            put(value, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
            put(value, "updatedAtEpochMs", System.currentTimeMillis());
            changed = true;
        }
        if (changed) {
            NativeWorkoutControlRepository.updateTimer(context, value);
            if (MODE_COUNTDOWN.equals(mode(value)) && "running".equals(value.optString("timerStatus"))) {
                long remaining = remainingMs(value);
                if (remaining > 0L) scheduleFinish(context, SystemClock.elapsedRealtime() + remaining);
            }
        }
        return value;
    }

    public static long remainingMs(JSONObject timer) {
        if (timer == null || !MODE_COUNTDOWN.equals(mode(timer))) return 0L;
        String status = timer.optString("timerStatus", "idle");
        if ("paused".equals(status)) return Math.max(0L, timer.optLong("pausedRemainingMs", 0L));
        if (!"running".equals(status)) return 0L;
        return Math.max(0L, timer.optLong("endsAtElapsedRealtime", 0L) - SystemClock.elapsedRealtime());
    }

    public static long elapsedMs(JSONObject timer) {
        if (timer == null || !MODE_STOPWATCH.equals(mode(timer))) return 0L;
        long accumulated = Math.max(0L, timer.optLong("elapsedBeforeStartMs", 0L));
        if (!"running".equals(timer.optString("timerStatus", "idle"))) return accumulated;
        long started = timer.optLong("startedAtElapsedRealtime", SystemClock.elapsedRealtime());
        return accumulated + Math.max(0L, SystemClock.elapsedRealtime() - started);
    }

    public static synchronized void restoreAfterBoot(Context context) {
        if (!NativeWorkoutControlRepository.featureEnabled(context, "nativeRestTimer")) return;
        JSONObject timer = currentState(context);
        if (MODE_COUNTDOWN.equals(mode(timer)) && "running".equals(timer.optString("timerStatus"))) {
            long remaining = remainingMs(timer);
            if (remaining > 0L) scheduleFinish(context, SystemClock.elapsedRealtime() + remaining);
        }
        refreshSurfaces(context);
    }

    private static boolean reconcileRuntimeClock(JSONObject timer) {
        String status = timer.optString("timerStatus", "idle");
        if (!"running".equals(status)) return false;
        long nowElapsed = SystemClock.elapsedRealtime();
        long nowEpoch = System.currentTimeMillis();
        long currentBootEpoch = nowEpoch - nowElapsed;
        long storedBootEpoch = timer.optLong("bootEpochMs", 0L);
        boolean bootChanged = storedBootEpoch <= 0L
                || Math.abs(storedBootEpoch - currentBootEpoch) > BOOT_CLOCK_TOLERANCE_MS
                || timer.optLong("startedAtElapsedRealtime", 0L) > nowElapsed;
        if (!bootChanged) return false;

        if (MODE_STOPWATCH.equals(mode(timer))) {
            long accumulated = Math.max(0L, timer.optLong("elapsedBeforeStartMs", 0L));
            long startedEpoch = timer.optLong("startedAtEpochMs", nowEpoch);
            long wallElapsed = Math.max(0L, Math.min(MAX_STOPWATCH_MS, nowEpoch - startedEpoch));
            put(timer, "elapsedBeforeStartMs", Math.min(MAX_STOPWATCH_MS, accumulated + wallElapsed));
            put(timer, "startedAtElapsedRealtime", nowElapsed);
            put(timer, "startedAtEpochMs", nowEpoch);
        } else {
            long endsEpoch = timer.optLong("endsAtEpochMs", 0L);
            long fallback = Math.max(0L, timer.optLong("endsAtElapsedRealtime", 0L) - nowElapsed);
            long remaining = endsEpoch > 0L ? Math.max(0L, endsEpoch - nowEpoch) : fallback;
            remaining = Math.min(MAX_TIMER_MS, remaining);
            put(timer, "startedAtElapsedRealtime", nowElapsed);
            put(timer, "startedAtEpochMs", nowEpoch);
            put(timer, "endsAtElapsedRealtime", nowElapsed + remaining);
            put(timer, "endsAtEpochMs", nowEpoch + remaining);
        }
        put(timer, "bootEpochMs", currentBootEpoch);
        put(timer, "updatedAtElapsedRealtime", nowElapsed);
        put(timer, "updatedAtEpochMs", nowEpoch);
        return true;
    }

    private static void pause(Context context, JSONObject timer) {
        if (!"running".equals(timer.optString("timerStatus"))) return;
        if (MODE_STOPWATCH.equals(mode(timer))) {
            put(timer, "elapsedBeforeStartMs", elapsedMs(timer));
        } else {
            put(timer, "pausedRemainingMs", remainingMs(timer));
        }
        put(timer, "timerStatus", "paused");
        touch(timer);
        NativeWorkoutControlRepository.updateTimer(context, timer);
        cancelFinish(context);
    }

    private static void resume(Context context, JSONObject timer) {
        if (!"paused".equals(timer.optString("timerStatus"))) return;
        long nowElapsed = SystemClock.elapsedRealtime();
        long nowEpoch = System.currentTimeMillis();
        put(timer, "timerStatus", "running");
        put(timer, "startedAtElapsedRealtime", nowElapsed);
        put(timer, "startedAtEpochMs", nowEpoch);
        put(timer, "bootEpochMs", nowEpoch - nowElapsed);
        if (MODE_STOPWATCH.equals(mode(timer))) {
            cancelFinish(context);
        } else {
            long remaining = Math.max(1_000L, timer.optLong("pausedRemainingMs", configuredSeconds(context) * 1000L));
            put(timer, "endsAtElapsedRealtime", nowElapsed + remaining);
            put(timer, "endsAtEpochMs", nowEpoch + remaining);
            put(timer, "pausedRemainingMs", 0L);
        }
        touch(timer);
        NativeWorkoutControlRepository.updateTimer(context, timer);
        if (MODE_COUNTDOWN.equals(mode(timer))) scheduleFinish(context, timer.optLong("endsAtElapsedRealtime", 0L));
    }

    private static void stop(Context context) {
        JSONObject timer = baseState();
        put(timer, "timerMode", configuredMode(context));
        put(timer, "timerStatus", "idle");
        put(timer, "configuredSeconds", configuredSeconds(context));
        touch(timer);
        NativeWorkoutControlRepository.updateTimer(context, timer);
        cancelFinish(context);
    }

    private static void finish(Context context, JSONObject timer) {
        if (!MODE_COUNTDOWN.equals(mode(timer))) return;
        if (!"running".equals(timer.optString("timerStatus")) || remainingMs(timer) > 1_000L) {
            if ("running".equals(timer.optString("timerStatus"))) scheduleFinish(context, timer.optLong("endsAtElapsedRealtime", 0L));
            return;
        }
        put(timer, "timerStatus", "finished");
        put(timer, "pausedRemainingMs", 0L);
        touch(timer);
        NativeWorkoutControlRepository.updateTimer(context, timer);
    }

    private static void adjust(Context context, JSONObject timer, long deltaMs) {
        if (MODE_STOPWATCH.equals(mode(timer))) return;
        String status = timer.optString("timerStatus", "idle");
        if ("running".equals(status)) {
            long nowElapsed = SystemClock.elapsedRealtime();
            long nowEpoch = System.currentTimeMillis();
            long nextEndElapsed = Math.max(nowElapsed + 1_000L, timer.optLong("endsAtElapsedRealtime", nowElapsed) + deltaMs);
            long remaining = Math.min(MAX_TIMER_MS, nextEndElapsed - nowElapsed);
            put(timer, "endsAtElapsedRealtime", nowElapsed + remaining);
            put(timer, "endsAtEpochMs", nowEpoch + remaining);
            touch(timer);
            NativeWorkoutControlRepository.updateTimer(context, timer);
            scheduleFinish(context, nowElapsed + remaining);
        } else if ("paused".equals(status)) {
            put(timer, "pausedRemainingMs", Math.max(1_000L, Math.min(MAX_TIMER_MS, timer.optLong("pausedRemainingMs", 0L) + deltaMs)));
            touch(timer);
            NativeWorkoutControlRepository.updateTimer(context, timer);
        } else {
            start(context, Math.max(MIN_SECONDS, configuredSeconds(context) + (int) (deltaMs / 1000L)));
        }
    }

    private static int configuredSeconds(Context context) {
        return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS,
                NativeWorkoutControlRepository.nativeSettings(context).optInt("restSeconds", DEFAULT_SECONDS)));
    }

    private static String configuredMode(Context context) {
        String value = NativeWorkoutControlRepository.nativeSettings(context).optString("timerMode", MODE_COUNTDOWN);
        return MODE_STOPWATCH.equals(value) ? MODE_STOPWATCH : MODE_COUNTDOWN;
    }

    private static String mode(JSONObject timer) {
        return MODE_STOPWATCH.equals(timer.optString("timerMode", MODE_COUNTDOWN)) ? MODE_STOPWATCH : MODE_COUNTDOWN;
    }

    private static JSONObject baseState() {
        long nowElapsed = SystemClock.elapsedRealtime();
        long nowEpoch = System.currentTimeMillis();
        JSONObject timer = new JSONObject();
        put(timer, "schemaVersion", 2);
        put(timer, "timerMode", MODE_COUNTDOWN);
        put(timer, "timerStatus", "idle");
        put(timer, "startedAtElapsedRealtime", 0L);
        put(timer, "endsAtElapsedRealtime", 0L);
        put(timer, "startedAtEpochMs", 0L);
        put(timer, "endsAtEpochMs", 0L);
        put(timer, "bootEpochMs", nowEpoch - nowElapsed);
        put(timer, "pausedRemainingMs", 0L);
        put(timer, "elapsedBeforeStartMs", 0L);
        put(timer, "configuredSeconds", DEFAULT_SECONDS);
        put(timer, "updatedAtElapsedRealtime", nowElapsed);
        put(timer, "updatedAtEpochMs", nowEpoch);
        return timer;
    }

    private static void touch(JSONObject timer) {
        put(timer, "updatedAtElapsedRealtime", SystemClock.elapsedRealtime());
        put(timer, "updatedAtEpochMs", System.currentTimeMillis());
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
