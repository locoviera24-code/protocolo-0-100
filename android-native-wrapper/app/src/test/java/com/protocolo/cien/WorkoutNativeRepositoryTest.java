package com.protocolo.cien;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowSystemClock;

import java.time.Duration;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class WorkoutNativeRepositoryTest {
    private Context context;
    private JSONObject widgetState;
    private JSONObject session;
    private JSONObject exercise;
    private JSONObject quick;

    @Before
    public void setUp() throws Exception {
        context = RuntimeEnvironment.getApplication();
        preferences().edit().clear().commit();
        widgetState = new JSONObject()
                .put("featureFlags", new JSONObject().put("nativeWorkoutControlsV1", true))
                .put("nativeRevision", 3)
                .put("unit", "kg")
                .put("date", "2026-07-30")
                .put("dayKey", "thursday")
                .put("weekday", "Jueves");
        session = new JSONObject()
                .put("id", "session-test")
                .put("date", "2026-07-30")
                .put("dayKey", "thursday")
                .put("weekday", "Jueves")
                .put("status", "en progreso")
                .put("routine", new JSONObject().put("name", "Rutina de prueba"));
        exercise = new JSONObject()
                .put("id", "bench")
                .put("exerciseId", "bench")
                .put("name", "Press de banca")
                .put("measurementMode", "reps");
        quick = new JSONObject()
                .put("setNumber", 1)
                .put("reps", 8)
                .put("weight", 60)
                .put("measurementMode", "reps")
                .put("loadMode", "total");
    }

    @Test
    public void immediateDuplicateIsRejectedButLaterSaveIsAllowed() {
        NativeWorkoutControlRepository.EnqueueResult first = enqueue();
        NativeWorkoutControlRepository.EnqueueResult duplicate = enqueue();

        assertTrue(first.ok);
        assertTrue(duplicate.ok);
        assertTrue(duplicate.duplicate);
        assertEquals(1, WorkoutMutationQueue.pending(context).length());

        ShadowSystemClock.advanceBy(Duration.ofMillis(700));
        NativeWorkoutControlRepository.EnqueueResult later = enqueue();

        assertTrue(later.ok);
        assertFalse(later.duplicate);
        assertNotEquals(first.setId(), later.setId());
        assertEquals(2, WorkoutMutationQueue.pending(context).length());
    }

    @Test
    public void deliveryLedgerMakesPendingIntentRedeliveryIdempotent() {
        assertTrue(WorkoutNativeRepository.claimDelivery(context, "widget:SAVE_SET:7:3"));
        assertFalse(WorkoutNativeRepository.claimDelivery(context, "widget:SAVE_SET:7:3"));
        assertTrue(WorkoutNativeRepository.claimDelivery(context, "widget:SAVE_SET:7:4"));
    }

    @Test
    public void acknowledgementCanImportOnlySelectedMutation() throws Exception {
        NativeWorkoutControlRepository.EnqueueResult first = enqueue();
        quick.put("reps", 9);
        NativeWorkoutControlRepository.EnqueueResult second = enqueue();

        assertTrue(WorkoutMutationQueue.acknowledgeImported(
                context,
                new JSONArray().put(first.mutation.getString("mutationId"))
        ));

        JSONArray pending = WorkoutMutationQueue.pending(context);
        assertEquals(1, pending.length());
        assertEquals(second.mutation.getString("mutationId"), pending.getJSONObject(0).getString("mutationId"));
        assertEquals("imported", WorkoutMutationQueue.find(context, first.mutation.getString("mutationId")).getString("status"));
    }

    @Test
    public void undoCreatesCompensationAndDoesNotDeleteQueueHistory() throws Exception {
        NativeWorkoutControlRepository.EnqueueResult saved = enqueue();
        NativeWorkoutControlRepository.EnqueueResult undone = NativeWorkoutControlRepository.enqueueUndoLastSet(
                context,
                widgetState,
                WorkoutQuickActionReducer.SOURCE_WIDGET,
                3
        );

        assertTrue(undone.ok);
        assertEquals("undo_set", undone.mutation.getString("type"));
        assertEquals(saved.setId(), undone.mutation.getJSONObject("payload").getString("targetSetId"));
        assertEquals("undone", WorkoutMutationQueue.find(
                context,
                saved.mutation.getString("mutationId")
        ).getString("status"));
        assertEquals(1, WorkoutMutationQueue.pending(context).length());
    }

    @Test
    public void corruptEntryIsQuarantinedWithoutDiscardingValidEntry() {
        NativeWorkoutControlRepository.EnqueueResult saved = enqueue();
        String mixed = new JSONArray()
                .put(new JSONObject())
                .put(saved.mutation)
                .toString();
        preferences().edit().putString(WorkoutMutationQueue.KEY_MUTATION_QUEUE, mixed).commit();

        JSONArray recovered = WorkoutMutationQueue.readAll(context);

        assertEquals(1, recovered.length());
        assertTrue(WorkoutMutationQueue.summary(context).optBoolean("hasQuarantine", false));
    }

    @Test
    public void widgetLayoutUsesWidthAndHeightBudgets() {
        assertEquals(1, WorkoutWidgetUpdateService.selectLayout(widgetSize(190, 250)));
        assertEquals(2, WorkoutWidgetUpdateService.selectLayout(widgetSize(300, 340)));
        assertEquals(3, WorkoutWidgetUpdateService.selectLayout(widgetSize(420, 430)));
    }

    @Test
    public void timerPersistsCountdownPauseAndResume() throws Exception {
        JSONObject control = WorkoutNativeRepository.readControlState(context)
                .put("featureFlags", new JSONObject().put("nativeRestTimer", true));
        assertTrue(WorkoutNativeRepository.writeControlState(context, control));
        WorkoutTimerController.start(context, 90);
        JSONObject running = WorkoutTimerController.currentState(context);
        assertEquals("running", running.optString("timerStatus"));
        assertTrue(WorkoutTimerController.remainingMs(running) > 0);

        assertTrue(WorkoutTimerController.handleAction(context, WorkoutTimerController.ACTION_TIMER_PAUSE));
        JSONObject paused = WorkoutTimerController.currentState(context);
        assertEquals("paused", paused.optString("timerStatus"));
        assertTrue(paused.optLong("pausedRemainingMs", 0) > 0);

        assertTrue(WorkoutTimerController.handleAction(context, WorkoutTimerController.ACTION_TIMER_RESUME));
        assertEquals("running", WorkoutTimerController.currentState(context).optString("timerStatus"));
    }

    @Test
    @Config(sdk = 32)
    public void notificationHasThreePrivateActionsAndSafePublicVersion() throws Exception {
        JSONObject control = new JSONObject()
                .put("featureFlags", new JSONObject().put("lockScreenWorkoutControls", true))
                .put("settings", new JSONObject()
                        .put("showWorkoutOnLockScreen", true)
                        .put("lockScreenVisibility", "public"))
                .put("sessionStatus", "en progreso")
                .put("exerciseId", "bench")
                .put("exerciseName", "Press de banca")
                .put("setNumber", 3)
                .put("draftReps", 8)
                .put("draftWeight", 80)
                .put("unit", "kg");
        assertTrue(WorkoutNativeRepository.writeControlState(context, control));

        WorkoutControlNotificationManager.update(context);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        assertEquals(1, manager.getActiveNotifications().length);
        Notification notification = manager.getActiveNotifications()[0].getNotification();
        assertEquals(Notification.VISIBILITY_PRIVATE, notification.visibility);
        assertEquals(3, notification.actions.length);
        assertEquals("Entrenamiento en curso", notification.publicVersion.extras.getString(Notification.EXTRA_TITLE));
        assertFalse(notification.publicVersion.extras.getString(Notification.EXTRA_TITLE).contains("Press"));
        NotificationChannel channel = manager.getNotificationChannel(WorkoutControlNotificationManager.CHANNEL_ID);
        assertEquals(NotificationManager.IMPORTANCE_LOW, channel.getImportance());
    }

    private NativeWorkoutControlRepository.EnqueueResult enqueue() {
        return NativeWorkoutControlRepository.enqueueSaveSet(
                context,
                widgetState,
                session,
                exercise,
                quick,
                quick.optDouble("weight", 0),
                WorkoutQuickActionReducer.SOURCE_WIDGET,
                3
        );
    }

    private SharedPreferences preferences() {
        return context.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private Bundle widgetSize(int width, int height) {
        Bundle options = new Bundle();
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, width);
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, width);
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, height);
        options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, height);
        return options;
    }
}
