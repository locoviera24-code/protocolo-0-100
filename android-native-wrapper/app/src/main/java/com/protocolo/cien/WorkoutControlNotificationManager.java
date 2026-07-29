package com.protocolo.cien;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;

import org.json.JSONObject;

public final class WorkoutControlNotificationManager {
    public static final String CHANNEL_ID = "workout_controls_v1";
    private static final String CHANNEL_TIMER_VIBRATE = "workout_timer_vibrate_v1";
    private static final String CHANNEL_TIMER_SOUND = "workout_timer_sound_v1";
    private static final int NOTIFICATION_ID = 7100;

    private WorkoutControlNotificationManager() {}

    public static boolean hasPermission(Context context) {
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null && (Build.VERSION.SDK_INT < 24 || manager.areNotificationsEnabled());
    }

    public static void update(Context context) {
        JSONObject nativeSettings = NativeWorkoutControlRepository.nativeSettings(context);
        if (!NativeWorkoutControlRepository.featureEnabled(context, "lockScreenWorkoutControls")
                || !nativeSettings.optBoolean("showWorkoutOnLockScreen", true)
                || !hasPermission(context)) {
            cancel(context);
            return;
        }
        JSONObject control = NativeWorkoutControlRepository.readControlState(context);
        JSONObject timer = WorkoutTimerController.currentState(context);
        boolean activeTimer = "running".equals(timer.optString("timerStatus")) || "paused".equals(timer.optString("timerStatus"));
        if (!"en progreso".equals(control.optString("sessionStatus", "")) && !activeTimer) {
            cancel(context);
            return;
        }
        NotificationManager manager = manager(context);
        if (manager == null) return;
        createChannel(manager);
        manager.notify(NOTIFICATION_ID, build(context, control, timer));
    }

    public static void notifyTimerFinished(Context context) {
        if (!NativeWorkoutControlRepository.featureEnabled(context, "lockScreenWorkoutControls") || !hasPermission(context)) return;
        NotificationManager manager = manager(context);
        if (manager == null) return;
        createChannel(manager);
        JSONObject control = NativeWorkoutControlRepository.readControlState(context);
        JSONObject settings = NativeWorkoutControlRepository.nativeSettings(context);
        boolean sound = settings.optBoolean("timerSound", false);
        boolean vibration = settings.optBoolean("timerVibration", true);
        Notification.Builder builder = builder(context, sound ? CHANNEL_TIMER_SOUND : vibration ? CHANNEL_TIMER_VIBRATE : CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_workout_notification)
                .setContentTitle("Descanso terminado")
                .setContentText(control.optString("exerciseName", "Entrenamiento") + " · Listo para la siguiente serie")
                .setContentIntent(openIntent(context, control.optString("exerciseId", "")))
                .setAutoCancel(false)
                .setOngoing(false)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(lockVisibility(context))
                .setOnlyAlertOnce(false);
        if (settings.optBoolean("timerVibration", true)) builder.setVibrate(new long[]{0, 180, 100, 180});
        if (!settings.optBoolean("timerSound", false)) builder.setSound(null);
        manager.notify(NOTIFICATION_ID, builder.build());
    }

    public static void cancel(Context context) {
        NotificationManager manager = manager(context);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
    }

    private static Notification build(Context context, JSONObject control, JSONObject timer) {
        JSONObject settings = NativeWorkoutControlRepository.nativeSettings(context);
        boolean showWeight = settings.optBoolean("showWeightOnLockScreen", true);
        boolean showRecord = settings.optBoolean("showRecordOnLockScreen", true);
        int reps = Math.max(0, control.optInt("draftReps", 0));
        String unit = control.optString("unit", "kg");
        String exercise = control.optString("exerciseName", "Entrenamiento");
        int setNumber = Math.max(1, control.optInt("setNumber", 1));
        String line = reps + " reps";
        if (showWeight) line += " · " + formatWeight(control.optDouble("draftWeight", 0)) + " " + unit;
        String detail = guidanceText(control, showRecord);
        String sync = syncText(control);
        if (sync.length() > 0) detail = detail.length() == 0 ? sync : detail + " · " + sync;

        Notification.Builder builder = builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_workout_notification)
                .setContentTitle(exercise + " · Serie " + setNumber)
                .setContentText(line)
                .setStyle(new Notification.BigTextStyle().bigText(detail.length() == 0 ? line : line + "\n" + detail))
                .setContentIntent(openIntent(context, control.optString("exerciseId", "")))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Build.VERSION.SDK_INT >= 31 ? Notification.CATEGORY_STOPWATCH : Notification.CATEGORY_STATUS)
                .setVisibility(lockVisibility(context));

        String timerStatus = timer.optString("timerStatus", "idle");
        if ("running".equals(timerStatus)) {
            long end = timer.optLong("endsAtElapsedRealtime", SystemClock.elapsedRealtime());
            builder.setWhen(System.currentTimeMillis() + Math.max(0L, end - SystemClock.elapsedRealtime()))
                    .setUsesChronometer(true)
                    .addAction(0, "-15 s", actionIntent(context, WorkoutTimerController.ACTION_TIMER_SUBTRACT_15))
                    .addAction(0, "Pausar", actionIntent(context, WorkoutTimerController.ACTION_TIMER_PAUSE))
                    .addAction(0, "+15 s", actionIntent(context, WorkoutTimerController.ACTION_TIMER_ADD_15));
            if (Build.VERSION.SDK_INT >= 24) builder.setChronometerCountDown(true);
        } else if ("paused".equals(timerStatus)) {
            builder.addAction(0, "-15 s", actionIntent(context, WorkoutTimerController.ACTION_TIMER_SUBTRACT_15))
                    .addAction(0, "Continuar", actionIntent(context, WorkoutTimerController.ACTION_TIMER_RESUME))
                    .addAction(0, "+15 s", actionIntent(context, WorkoutTimerController.ACTION_TIMER_ADD_15));
        } else {
            builder.addAction(0, "Reps -", actionIntent(context, MainActivity.ACTION_WIDGET_REPS_DOWN))
                    .addAction(0, "Guardar", actionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET))
                    .addAction(0, "Reps +", actionIntent(context, MainActivity.ACTION_WIDGET_REPS_UP));
        }
        return builder.build();
    }

    private static String guidanceText(JSONObject control, boolean showRecord) {
        JSONObject last = control.optJSONObject("lastComparableSet");
        JSONObject record = control.optJSONObject("historicalLoadRecord");
        String text = last == null || last.length() == 0 ? "" : "Última: " + compactSet(last);
        if (showRecord && record != null && record.length() > 0) {
            String recordText = "Mejor: " + compactSet(record);
            text = text.length() == 0 ? recordText : text + " · " + recordText;
        }
        return text;
    }

    private static String compactSet(JSONObject value) {
        String label = value.optString("label", "");
        if (label.length() > 0) return label;
        double weight = value.optDouble("weightKg", value.optDouble("weight", 0));
        int reps = value.optInt("reps", 0);
        return formatWeight(weight) + " kg" + (reps > 0 ? " × " + reps : "");
    }

    private static String syncText(JSONObject control) {
        String privateState = control.optString("privateImportState", "pending");
        int pending = Math.max(0, control.optInt("pendingMutationCount", 0));
        String privateText = "imported".equals(privateState) ? "Privado ✓" : pending > 0 ? "Privado pendiente" : "Privado local";
        JSONObject sync = control.optJSONObject("syncState");
        int total = sync == null ? 0 : Math.max(0, sync.optInt("total", 0));
        int done = sync == null ? 0 : Math.max(0, sync.optInt("synced", 0));
        return total > 0 ? privateText + " · Grupos " + done + "/" + total : privateText;
    }

    private static int lockVisibility(Context context) {
        String visibility = NativeWorkoutControlRepository.nativeSettings(context).optString("lockScreenVisibility", "private");
        if ("public".equals(visibility)) return Notification.VISIBILITY_PUBLIC;
        if ("hidden".equals(visibility)) return Notification.VISIBILITY_SECRET;
        return Notification.VISIBILITY_PRIVATE;
    }

    private static Notification.Builder builder(Context context, String channelId) {
        return Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, channelId) : new Notification.Builder(context);
    }

    private static void createChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Controles de entrenamiento", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Serie actual y temporizador de descanso");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);

        NotificationChannel vibrate = new NotificationChannel(CHANNEL_TIMER_VIBRATE, "Fin del descanso · vibración", NotificationManager.IMPORTANCE_DEFAULT);
        vibrate.setDescription("Aviso por vibración al finalizar el descanso");
        vibrate.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        vibrate.setSound(null, null);
        vibrate.enableVibration(true);
        vibrate.setVibrationPattern(new long[]{0, 180, 100, 180});
        manager.createNotificationChannel(vibrate);

        NotificationChannel sound = new NotificationChannel(CHANNEL_TIMER_SOUND, "Fin del descanso · sonido", NotificationManager.IMPORTANCE_DEFAULT);
        sound.setDescription("Aviso audible al finalizar el descanso");
        sound.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        sound.enableVibration(true);
        manager.createNotificationChannel(sound);
    }

    private static PendingIntent actionIntent(Context context, String action) {
        Intent intent = new Intent(context, WorkoutControlReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(context, stableRequestCode(action), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openIntent(Context context, String exerciseId) {
        Intent intent = new Intent(context, MainActivity.class)
                .setAction(MainActivity.ACTION_QUICK_LOG_SET)
                .putExtra("exerciseId", exerciseId == null ? "" : exerciseId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 7199, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int stableRequestCode(String action) {
        return 7200 + Math.abs(action.hashCode() % 500);
    }

    private static NotificationManager manager(Context context) {
        return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    private static String formatWeight(double value) {
        double rounded = Math.round(Math.max(0, value) * 2d) / 2d;
        return rounded == Math.rint(rounded) ? String.valueOf((long) rounded) : String.valueOf(rounded);
    }
}
