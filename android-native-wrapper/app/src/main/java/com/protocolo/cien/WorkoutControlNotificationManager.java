package com.protocolo.cien;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

public final class WorkoutControlNotificationManager {
    // Channel settings are immutable after creation. V5 identifies the expanded
    // direct-control layout and avoids inheriting a suppressed OEM channel.
    public static final String CHANNEL_ID = "workout_controls_v5";
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

    public static boolean isPosted(Context context) {
        NotificationManager manager = manager(context);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT < 23) return hasPermission(context);
        try {
            for (StatusBarNotification notification : manager.getActiveNotifications()) {
                if (notification.getId() == NOTIFICATION_ID) return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public static void ensureChannel(Context context) {
        NotificationManager manager = manager(context);
        if (manager != null) createChannel(manager);
    }

    public static boolean isChannelEnabled(Context context) {
        if (Build.VERSION.SDK_INT < 26) return hasPermission(context);
        NotificationManager manager = manager(context);
        if (manager == null) return false;
        NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
        return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
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
        if (!"en progreso".equals(control.optString("sessionStatus", ""))) {
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
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPublicVersion(publicVersion(context))
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
                .setContentIntent(openIntent(context, control.optString("exerciseId", "")))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setCategory(Build.VERSION.SDK_INT >= 31 ? Notification.CATEGORY_STOPWATCH : Notification.CATEGORY_STATUS)
                .setVisibility(lockVisibility(context))
                .setPublicVersion(publicVersion(context));

        if (Build.VERSION.SDK_INT >= 24) {
            builder.setCustomBigContentView(expandedControls(context, control, showWeight, showRecord, detail))
                    .setStyle(new Notification.DecoratedCustomViewStyle());
        } else {
            builder.setStyle(new Notification.BigTextStyle().bigText(detail));
        }

        String timerStatus = timer.optString("timerStatus", "idle");
        if ("running".equals(timerStatus)) {
            long end = timer.optLong("endsAtElapsedRealtime", SystemClock.elapsedRealtime());
            builder.setWhen(System.currentTimeMillis() + Math.max(0L, end - SystemClock.elapsedRealtime()))
                    .setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= 24) builder.setChronometerCountDown(true);
        }
        boolean canUndo = System.currentTimeMillis() <= control.optLong("undoUntilEpochMs", 0L);
        if (canUndo) {
            builder.addAction(0, "Deshacer", actionIntent(context, MainActivity.ACTION_WIDGET_UNDO_LAST_SET, control))
                    .addAction(0, "Guardar", actionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET, control))
                    .addAction(0, "Ejercicio", exercisePickerIntent(context, control));
        } else {
            builder.addAction(0, "-0,5", actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_DOWN, control))
                    .addAction(0, "Guardar", actionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET, control))
                    .addAction(0, "+0,5", actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_UP, control));
        }
        return builder.build();
    }

    private static RemoteViews expandedControls(Context context, JSONObject control, boolean showWeight, boolean showRecord, String detail) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.notification_workout_controls);
        String exercise = control.optString("exerciseName", "Elegir ejercicio");
        int reps = Math.max(0, control.optInt("draftReps", 0));
        String unit = control.optString("unit", "kg");
        String loadMode = control.optString("loadMode", "total");
        String measurementMode = control.optString("measurementMode", "reps");
        boolean editableWeight = showWeight && !"time".equals(measurementMode) && !"distance".equals(measurementMode);
        String weight = formatWeight(control.optDouble("draftWeight", 0)) + " " + unit;
        if ("bodyweight".equals(loadMode) && control.optDouble("draftWeight", 0) <= 0) weight = "Peso corporal";
        else if ("assistance".equals(loadMode)) weight += " asistencia";
        else if ("addedLoad".equals(loadMode)) weight = "+" + weight + " lastre";

        views.setTextViewText(R.id.notificationExerciseButton, "Elegir · " + exercise);
        views.setContentDescription(R.id.notificationExerciseButton, "Elegir ejercicio. Actual: " + exercise);
        views.setOnClickPendingIntent(R.id.notificationExerciseButton, exercisePickerIntent(context, control));
        views.setTextViewText(R.id.notificationGuidance, detail.length() == 0 ? guidanceText(control, showRecord) : detail);
        views.setTextViewText(R.id.notificationQuickReps, reps + " reps");
        views.setTextViewText(R.id.notificationQuickWeight, weight);
        views.setViewVisibility(R.id.notificationWeightPanel, editableWeight ? View.VISIBLE : View.GONE);
        views.setOnClickPendingIntent(R.id.notificationRepsMinusButton, actionIntent(context, MainActivity.ACTION_WIDGET_REPS_DOWN, control));
        views.setOnClickPendingIntent(R.id.notificationRepsPlusButton, actionIntent(context, MainActivity.ACTION_WIDGET_REPS_UP, control));
        views.setOnClickPendingIntent(R.id.notificationWeightMinusButton, actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_DOWN, control));
        views.setOnClickPendingIntent(R.id.notificationWeightPlusButton, actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_UP, control));
        views.setOnClickPendingIntent(R.id.notificationWeightFastMinusButton, actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_DOWN, control));
        views.setOnClickPendingIntent(R.id.notificationWeightFastPlusButton, actionIntent(context, MainActivity.ACTION_WIDGET_WEIGHT_FAST_UP, control));
        views.setOnClickPendingIntent(R.id.notificationSaveSetButton, actionIntent(context, MainActivity.ACTION_WIDGET_SAVE_SET, control));
        return views;
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
        if ("error".equals(privateState)) return "Necesita atencion";
        if (pending > 0) return "Guardado en el dispositivo · Pendiente de importar";
        return "imported".equals(privateState) ? "Incorporado al historial" : "Guardado en el dispositivo";
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
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Controles de entrenamiento", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Registro rapido visible durante una sesion activa");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
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

    private static PendingIntent actionIntent(Context context, String action, JSONObject control) {
        Intent intent = new Intent(context, WorkoutControlReceiver.class).setAction(action);
        String deliveryId = WorkoutNativeRepository.deliveryId(control, WorkoutQuickActionReducer.SOURCE_NOTIFICATION, action, NOTIFICATION_ID);
        intent.setData(Uri.parse("protocolo://notification-action/" + Uri.encode(deliveryId)));
        intent.putExtra("deliveryId", deliveryId);
        return PendingIntent.getBroadcast(context, stableRequestCode(action), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent exercisePickerIntent(Context context, JSONObject control) {
        Intent intent = new Intent(context, WorkoutExercisePickerActivity.class)
                .putExtra("exerciseId", control.optString("exerciseId", ""))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 7299, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Notification publicVersion(Context context) {
        return builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_workout_notification)
                .setContentTitle("Entrenamiento en curso")
                .setContentText("Controles disponibles al desbloquear")
                .setCategory(Notification.CATEGORY_STATUS)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .build();
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
