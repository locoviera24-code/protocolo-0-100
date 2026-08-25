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
    private static final int RECORD_VERSION = 1;
    private static final long IMPORTED_RETENTION_MS = 7L * 24L * 60L * 60L * 1000L;

    private WorkoutMutationQueue() {}

    /** Returns persisted transport records without rewriting legacy entries. */
    public static synchronized JSONArray readAll(Context context) {
        SharedPreferences prefs = preferences(context);
        String raw = prefs.getString(KEY_MUTATION_QUEUE, "");
        ParseResult parsed = parse(raw, System.currentTimeMillis());
        if (parsed.corrupt) quarantine(prefs, raw, parsed.reason);
        return parsed.records;
    }

    /** Exposes only canonical schema-1 actions to the WebView. */
    public static synchronized JSONArray pending(Context context) {
        return canonicalPending(readAll(context));
    }

    public static synchronized boolean append(Context context, JSONObject action, JSONObject transport) {
        if (!WorkoutQuickActionContract.validate(action).ok) return false;
        JSONArray queue = readAll(context);
        String mutationId = action.optString("mutationId", "");
        if (containsId(queue, mutationId)) return true;
        if (queue.length() >= MAX_MUTATIONS) return false;
        JSONObject record = new JSONObject();
        put(record, "queueRecordVersion", RECORD_VERSION);
        put(record, "action", cloneObject(action));
        put(record, "status", "pending");
        put(record, "privateImportState", "pending");
        put(record, "importedAt", JSONObject.NULL);
        put(record, "createdAtEpochMs", System.currentTimeMillis());
        put(record, "transport", cloneObject(transport));
        put(record, "attempts", 0);
        put(record, "lastError", JSONObject.NULL);
        queue.put(record);
        return write(context, queue);
    }

    public static synchronized boolean append(Context context, JSONObject action) {
        return append(context, action, new JSONObject());
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
        boolean changed = markImported(queue, requested, nowIso());
        return changed && write(context, prune(queue, System.currentTimeMillis()));
    }

    public static synchronized boolean setStatus(Context context, String mutationId, String nextStatus, String error) {
        if (mutationId == null || mutationId.isEmpty() || !isStatus(nextStatus)) return false;
        JSONArray queue = readAll(context);
        JSONObject record = find(queue, mutationId);
        if (record == null) return false;
        put(record, "status", nextStatus);
        put(record, "privateImportState", "imported".equals(nextStatus) ? "imported" : "rejected".equals(nextStatus) ? "error" : nextStatus);
        if ("imported".equals(nextStatus)) put(record, "importedAt", nowIso());
        put(record, "lastError", error == null || error.trim().isEmpty() ? JSONObject.NULL : error.trim());
        put(record, "attempts", Math.max(0, record.optInt("attempts", 0)) + 1);
        put(record, "updatedAt", nowIso());
        return write(context, prune(queue, System.currentTimeMillis()));
    }

    public static synchronized JSONObject latestUndoableSave(Context context, long nowEpochMs) {
        JSONArray queue = readAll(context);
        for (int index = queue.length() - 1; index >= 0; index--) {
            JSONObject record = queue.optJSONObject(index);
            JSONObject action = action(record);
            if (record == null || action == null || !WorkoutQuickActionContract.SAVE_SET.equals(action.optString("actionType", ""))) continue;
            String state = status(record);
            if (!("pending".equals(state) || "imported".equals(state))) continue;
            if (nowEpochMs <= transport(record).optLong("undoUntilEpochMs", 0L)) return cloneObject(record);
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

    static JSONObject action(JSONObject record) {
        return WorkoutQuickActionContract.adaptLegacy(record);
    }

    static ParseResult parse(String raw, long nowEpochMs) {
        if (raw == null || raw.trim().isEmpty()) return new ParseResult(new JSONArray(), false, "");
        try {
            JSONArray parsed = new JSONArray(raw);
            JSONArray valid = new JSONArray();
            boolean partiallyCorrupt = false;
            for (int index = 0; index < parsed.length(); index++) {
                JSONObject record = parsed.optJSONObject(index);
                if (isValidRecord(record)) valid.put(record);
                else partiallyCorrupt = true;
            }
            return new ParseResult(prune(valid, nowEpochMs), partiallyCorrupt, partiallyCorrupt ? "invalid-entry" : "");
        } catch (Exception error) {
            return new ParseResult(new JSONArray(), true, "invalid-json");
        }
    }

    static JSONArray canonicalPending(JSONArray source) {
        JSONArray output = new JSONArray();
        for (int index = 0; source != null && index < source.length(); index++) {
            JSONObject record = source.optJSONObject(index);
            if (record == null || !"pending".equals(status(record))) continue;
            JSONObject action = action(record);
            if (action != null) output.put(action);
        }
        return output;
    }

    static boolean markImported(JSONArray queue, Set<String> requested, String importedAt) {
        boolean changed = false;
        for (int index = 0; queue != null && index < queue.length(); index++) {
            JSONObject record = queue.optJSONObject(index);
            if (record == null || requested == null || !requested.contains(id(record)) || !"pending".equals(status(record))) continue;
            put(record, "status", "imported");
            put(record, "privateImportState", "imported");
            put(record, "importedAt", importedAt);
            put(record, "updatedAt", importedAt);
            changed = true;
        }
        return changed;
    }

    static JSONObject transport(JSONObject record) {
        if (record == null) return new JSONObject();
        JSONObject nested = record.optJSONObject("transport");
        if (nested != null) return cloneObject(nested);
        JSONObject legacy = new JSONObject();
        for (String key : new String[]{"dedupeFingerprint", "undoUntilEpochMs", "compensatesMutationId", "shareTargets"}) {
            if (record.has(key)) put(legacy, key, record.opt(key));
        }
        return legacy;
    }

    static String id(JSONObject record) {
        if (record == null) return "";
        JSONObject nested = record.optJSONObject("action");
        if (nested != null) return nested.optString("mutationId", "");
        String value = record.optString("mutationId", "");
        return value.isEmpty() ? record.optString("id", "") : value;
    }

    static String status(JSONObject record) {
        if (record == null) return "rejected";
        String value = record.optString("status", "");
        if (isStatus(value)) return value;
        String legacy = record.optString("privateImportState", "pending");
        return "imported".equals(legacy) ? "imported" : "error".equals(legacy) ? "rejected" : "pending";
    }

    private static JSONObject find(JSONArray queue, String mutationId) {
        if (queue == null || mutationId == null || mutationId.isEmpty()) return null;
        for (int index = 0; index < queue.length(); index++) {
            JSONObject record = queue.optJSONObject(index);
            if (mutationId.equals(id(record))) return record;
        }
        return null;
    }

    static boolean containsId(JSONArray queue, String mutationId) {
        return find(queue, mutationId) != null;
    }

    private static boolean isValidRecord(JSONObject record) {
        return record != null && !id(record).isEmpty() && action(record) != null;
    }

    private static boolean isStatus(String value) {
        return "pending".equals(value) || "imported".equals(value) || "rejected".equals(value) || "undone".equals(value);
    }

    static JSONArray prune(JSONArray source, long nowEpochMs) {
        JSONArray retained = new JSONArray();
        for (int index = 0; index < source.length(); index++) {
            JSONObject record = source.optJSONObject(index);
            if (record == null) continue;
            long createdAt = record.optLong("createdAtEpochMs", nowEpochMs);
            if ("imported".equals(status(record)) && nowEpochMs - createdAt > IMPORTED_RETENTION_MS) continue;
            retained.put(record);
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

    static final class ParseResult {
        final JSONArray records;
        final boolean corrupt;
        final String reason;

        ParseResult(JSONArray records, boolean corrupt, String reason) {
            this.records = records;
            this.corrupt = corrupt;
            this.reason = reason;
        }
    }
}
