package com.protocolo.cien;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;

/** Owns the compact native snapshot, revisions and PendingIntent redelivery ledger. */
public final class WorkoutNativeRepository {
    static final String KEY_CONTROL_STATE = "native_control_state_v1";
    private static final String KEY_PROCESSED_DELIVERIES = "native_processed_deliveries_v1";
    private static final String KEY_CORRUPT_SNAPSHOT = "native_snapshot_corrupt_v1";
    private static final int MAX_DELIVERIES = 120;

    private WorkoutNativeRepository() {}

    public static synchronized JSONObject readWidgetSnapshot(Context context) {
        SharedPreferences prefs = preferences(context);
        String raw = prefs.getString(WorkoutWidgetUpdateService.KEY_STATE_JSON, "");
        if (raw == null || raw.trim().isEmpty()) return new JSONObject();
        try { return new JSONObject(raw); }
        catch (Exception error) {
            prefs.edit().putString(KEY_CORRUPT_SNAPSHOT, raw.substring(0, Math.min(raw.length(), 512 * 1024))).commit();
            return new JSONObject();
        }
    }

    public static synchronized boolean writeWidgetSnapshot(Context context, JSONObject state) {
        if (state == null) return false;
        return preferences(context).edit()
                .putString(WorkoutWidgetUpdateService.KEY_STATE_JSON, state.toString())
                .commit();
    }

    public static synchronized JSONObject readControlState(Context context) {
        String raw = preferences(context).getString(KEY_CONTROL_STATE, "");
        try { return raw == null || raw.isEmpty() ? defaultControlState() : new JSONObject(raw); }
        catch (Exception error) { return defaultControlState(); }
    }

    public static synchronized boolean writeControlState(Context context, JSONObject control) {
        return control != null && preferences(context).edit().putString(KEY_CONTROL_STATE, control.toString()).commit();
    }

    public static long revision(JSONObject state) {
        if (state == null) return 0L;
        return Math.max(0L, state.optLong("nativeRevision", state.optLong("revision", 0L)));
    }

    public static long advanceRevision(JSONObject state) {
        long next = revision(state) + 1L;
        put(state, "nativeRevision", next);
        return next;
    }

    public static String deliveryId(JSONObject state, String source, String action, int surfaceId) {
        return source + ":" + action + ":" + surfaceId + ":" + revision(state);
    }

    public static synchronized boolean claimDelivery(Context context, String deliveryId) {
        if (deliveryId == null || deliveryId.trim().isEmpty()) return true;
        if (deliveryId.length() > 240) return false;
        SharedPreferences prefs = preferences(context);
        JSONArray source;
        try { source = new JSONArray(prefs.getString(KEY_PROCESSED_DELIVERIES, "[]")); }
        catch (Exception ignored) { source = new JSONArray(); }
        JSONArray next = appendDelivery(source, deliveryId);
        if (next == null) return false;
        return prefs.edit().putString(KEY_PROCESSED_DELIVERIES, next.toString()).commit();
    }

    static JSONArray appendDelivery(JSONArray source, String deliveryId) {
        if (deliveryId == null || deliveryId.trim().isEmpty() || deliveryId.length() > 240) return null;
        for (int index = 0; index < source.length(); index++) {
            if (deliveryId.equals(source.optString(index, ""))) return null;
        }
        JSONArray next = new JSONArray();
        int start = Math.max(0, source.length() - MAX_DELIVERIES + 1);
        for (int index = start; index < source.length(); index++) next.put(source.optString(index, ""));
        next.put(deliveryId);
        return next;
    }

    public static String newMutationId() {
        return UUID.randomUUID().toString();
    }

    public static void haptic(Context context) {
        JSONObject settings = NativeWorkoutControlRepository.nativeSettings(context);
        if (!settings.optBoolean("hapticEnabled", settings.optBoolean("timerVibration", true))) return;
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createOneShot(35L, VibrationEffect.DEFAULT_AMPLITUDE));
        else vibrator.vibrate(35L);
    }

    private static JSONObject defaultControlState() {
        JSONObject state = new JSONObject();
        put(state, "schemaVersion", 1);
        put(state, "revision", 0);
        put(state, "timer", new JSONObject());
        put(state, "pendingMutationCount", 0);
        return state;
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value == null ? JSONObject.NULL : value); } catch (Exception ignored) {}
    }
}
