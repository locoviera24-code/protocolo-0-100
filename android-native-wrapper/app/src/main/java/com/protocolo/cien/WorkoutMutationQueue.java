package com.protocolo.cien;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

/** Durable append-only transport between Android quick controls and the WebView. */
public final class WorkoutMutationQueue {
    static final String KEY_MUTATION_QUEUE = "native_mutation_queue_v1";
    static final String KEY_CORRUPT_QUEUE = "native_mutation_queue_corrupt_v1";
    static final int MAX_MUTATIONS = 200;
    private static final long IMPORTED_RETENTION_MS = 7L * 24L * 60L * 60L * 1000L;

    private WorkoutMutationQueue() {}

    public static synchronized JSONArray readAll(Context context) {
        SharedPreferences prefs = preferences(context);
        String raw = prefs.getString(KEY_MUTATION_QUEUE, "");
        if (raw == null || raw.trim().isEmpty()) return new JSONArray();
        try {
            JSONArray parsed = new JSONArray(raw);
            JSONArray valid = new JSONArray();
            boolean partiallyCorrupt = false;
            for (int index = 0; index < parsed.length(); index++) {
                JSONObject mutation = parsed.optJSONObject(index);
                if (isValid(mutation)) valid.put(mutation);
                else partiallyCorrupt = true;
            }
            if (partiallyCorrupt) quarantine(prefs, raw, "invalid-entry");
            return prune(valid, System.currentTimeMillis());
        } catch (Exception error) {
            quarantine(prefs, raw, "invalid-json");
            return new JSONArray();
        }
    }

    public static synchronized JSONArray pending(Context context) {
        JSONArray source = readAll(context);
        JSONArray output = new JSONArray();
        for (int index = 0; index < source.length(); index++) {
            JSONObject mutation = source.optJSONObject(index);
            if (mutation != null && "pending".equals(status(mutation))) output.put(cloneObject(mutation));
        }
        return output;
    }

    public static synchronized boolean append(Context context, JSONObject mutation) {
        if (!isValid(mutation)) return false;
        JSONArray queue = readAll(context);
        String id = id(mutation);
        if (find(queue, id) != null) return true;
        if (queue.length() >= MAX_MUTATIONS) return false;
        queue.put(cloneObject(mutation));
        return write(context, queue);
    }

    public static synchronized boolean acknowledgeImported(Context context, JSONArray ids) {
        if (ids == null || ids.length() == 0) return false;
        Set<String> requested = new HashSet<>();
        for (int index = 0; index < ids.length(); index++) {
            String value = ids.optString(index, "").trim();
            if (!value.isEmpty() && value.length() <= 160) requested.add(value);
        }
        if (requested.isEmpty()) return false;
        JSONArray queue = readAll(context);
        boolean changed = false;
        for (int index = 0; index < queue.length(); index++) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutation == null || !requested.contains(id(mutation))) continue;
            if (!"pending".equals(status(mutation))) continue;
            put(mutation, "status", "imported");
            put(mutation, "privateImportState", "imported");
            put(mutation, "importedAt", nowIso());
            put(mutation, "updatedAt", nowIso());
            changed = true;
        }
        return changed && write(context, prune(queue, System.currentTimeMillis()));
    }

    public static synchronized boolean setStatus(Context context, String mutationId, String nextStatus, String error) {
        if (mutationId == null || mutationId.isEmpty() || !isStatus(nextStatus)) return false;
        JSONArray queue = readAll(context);
        JSONObject mutation = find(queue, mutationId);
        if (mutation == null) return false;
        put(mutation, "status", nextStatus);
        put(mutation, "privateImportState", "imported".equals(nextStatus) ? "imported" : "rejected".equals(nextStatus) ? "error" : nextStatus);
        if ("imported".equals(nextStatus)) put(mutation, "importedAt", nowIso());
        put(mutation, "lastError", error == null || error.trim().isEmpty() ? JSONObject.NULL : error.trim());
        put(mutation, "attempts", Math.max(0, mutation.optInt("attempts", 0)) + 1);
        put(mutation, "updatedAt", nowIso());
        return write(context, prune(queue, System.currentTimeMillis()));
    }

    public static synchronized JSONObject latestUndoableSave(Context context, long nowEpochMs) {
        JSONArray queue = readAll(context);
        for (int index = queue.length() - 1; index >= 0; index--) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutation == null || !"save_set".equals(mutation.optString("type", ""))) continue;
            String state = status(mutation);
            if (!("pending".equals(state) || "imported".equals(state))) continue;
            if (nowEpochMs <= mutation.optLong("undoUntilEpochMs", 0L)) return cloneObject(mutation);
        }
        return null;
    }

    public static synchronized JSONObject find(Context context, String mutationId) {
        return cloneObject(find(readAll(context), mutationId));
    }

    public static synchronized JSONObject summary(Context context) {
        JSONArray queue = readAll(context);
        JSONObject output = new JSONObject();
        int pending = 0, imported = 0, rejected = 0, undone = 0;
        for (int index = 0; index < queue.length(); index++) {
            String state = status(queue.optJSONObject(index));
            if ("pending".equals(state)) pending++;
            else if ("imported".equals(state)) imported++;
            else if ("rejected".equals(state)) rejected++;
            else if ("undone".equals(state)) undone++;
        }
        put(output, "pending", pending);
        put(output, "imported", imported);
        put(output, "rejected", rejected);
        put(output, "undone", undone);
        put(output, "total", queue.length());
        put(output, "hasQuarantine", preferences(context).contains(KEY_CORRUPT_QUEUE));
        return output;
    }

    static String id(JSONObject mutation) {
        if (mutation == null) return "";
        String value = mutation.optString("mutationId", "");
        return value.isEmpty() ? mutation.optString("id", "") : value;
    }

    static String status(JSONObject mutation) {
        if (mutation == null) return "rejected";
        String value = mutation.optString("status", "");
        if (isStatus(value)) return value;
        String legacy = mutation.optString("privateImportState", "pending");
        return "imported".equals(legacy) ? "imported" : "error".equals(legacy) ? "rejected" : "pending";
    }

    private static JSONObject find(JSONArray queue, String mutationId) {
        if (queue == null || mutationId == null || mutationId.isEmpty()) return null;
        for (int index = 0; index < queue.length(); index++) {
            JSONObject mutation = queue.optJSONObject(index);
            if (mutationId.equals(id(mutation))) return mutation;
        }
        return null;
    }

    private static boolean isValid(JSONObject mutation) {
        if (mutation == null) return false;
        String mutationId = id(mutation);
        String type = mutation.optString("type", "");
        return !mutationId.isEmpty() && mutationId.length() <= 160
                && !type.isEmpty() && type.length() <= 80
                && mutation.optJSONObject("payload") != null;
    }

    private static boolean isStatus(String value) {
        return "pending".equals(value) || "imported".equals(value) || "rejected".equals(value) || "undone".equals(value);
    }

    private static JSONArray prune(JSONArray source, long nowEpochMs) {
        JSONArray retained = new JSONArray();
        for (int index = 0; index < source.length(); index++) {
            JSONObject mutation = source.optJSONObject(index);
            if (mutation == null) continue;
            long createdAt = mutation.optLong("createdAtEpochMs", nowEpochMs);
            if ("imported".equals(status(mutation)) && nowEpochMs - createdAt > IMPORTED_RETENTION_MS) continue;
            retained.put(mutation);
        }
        if (retained.length() <= MAX_MUTATIONS) return retained;
        JSONArray limited = new JSONArray();
        for (int index = retained.length() - MAX_MUTATIONS; index < retained.length(); index++) limited.put(retained.opt(index));
        return limited;
    }

    private static boolean write(Context context, JSONArray queue) {
        return preferences(context).edit().putString(KEY_MUTATION_QUEUE, queue.toString()).commit();
    }

    private static void quarantine(SharedPreferences prefs, String raw, String reason) {
        JSONObject record = new JSONObject();
        put(record, "reason", reason);
        put(record, "capturedAt", nowIso());
        put(record, "raw", raw == null ? "" : raw.substring(0, Math.min(raw.length(), 256 * 1024)));
        prefs.edit().putString(KEY_CORRUPT_QUEUE, record.toString()).commit();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(WorkoutWidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static JSONObject cloneObject(JSONObject value) {
        try { return value == null ? null : new JSONObject(value.toString()); }
        catch (Exception ignored) { return null; }
    }

    private static String nowIso() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value == null ? JSONObject.NULL : value); } catch (Exception ignored) {}
    }
}
