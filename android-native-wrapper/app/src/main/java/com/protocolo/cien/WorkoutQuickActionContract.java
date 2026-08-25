package com.protocolo.cien;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

/** Native implementation of gym/workout-quick-actions.js schema 1. */
public final class WorkoutQuickActionContract {
    public static final int SCHEMA_VERSION = 1;
    public static final int PAYLOAD_VERSION = 1;
    public static final int MAX_PAYLOAD_BYTES = 16 * 1024;

    public static final String ADJUST_REPS = "ADJUST_REPS";
    public static final String ADJUST_WEIGHT = "ADJUST_WEIGHT";
    public static final String SAVE_SET = "SAVE_SET";
    public static final String UNDO_SET = "UNDO_SET";
    public static final String REPEAT_LAST_SET = "REPEAT_LAST_SET";
    public static final String PREVIOUS_EXERCISE = "PREVIOUS_EXERCISE";
    public static final String NEXT_EXERCISE = "NEXT_EXERCISE";
    public static final String COMPLETE_TIME_SET = "COMPLETE_TIME_SET";
    public static final String COMPLETE_DISTANCE_SET = "COMPLETE_DISTANCE_SET";

    public static final String SOURCE_WEB = "web";
    public static final String SOURCE_WIDGET = "android-widget";
    public static final String SOURCE_NOTIFICATION = "android-notification";

    private static final Set<String> ACTION_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            ADJUST_REPS, ADJUST_WEIGHT, SAVE_SET, UNDO_SET, REPEAT_LAST_SET,
            PREVIOUS_EXERCISE, NEXT_EXERCISE, COMPLETE_TIME_SET, COMPLETE_DISTANCE_SET
    )));
    private static final Set<String> SOURCES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            SOURCE_WEB, SOURCE_WIDGET, SOURCE_NOTIFICATION
    )));
    private static final Set<String> ACTION_FIELDS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "schemaVersion", "payloadVersion", "actionType", "mutationId", "source", "sessionId",
            "exerciseId", "createdAt", "clientVersion", "expectedRevision", "payload"
    )));
    private static final Set<String> DANGEROUS_KEYS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "__proto__", "prototype", "constructor"
    )));
    private static final Pattern UUID_V4 = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CLIENT_VERSION = Pattern.compile("^\\d+\\.\\d+\\.\\d+\\+\\d+$");

    private WorkoutQuickActionContract() {}

    public static Validation validate(JSONObject action) {
        if (action == null) return Validation.error("INVALID_PAYLOAD", "action:object-required");
        Iterator<String> keys = action.keys();
        while (keys.hasNext()) {
            if (!ACTION_FIELDS.contains(keys.next())) return Validation.error("INVALID_PAYLOAD", "action:unknown-field");
        }
        if (action.optInt("schemaVersion", -1) != SCHEMA_VERSION || action.optInt("payloadVersion", -1) != PAYLOAD_VERSION) {
            return Validation.error("INVALID_SCHEMA", "schemaVersion:unsupported");
        }
        String actionType = action.optString("actionType", "");
        if (!ACTION_TYPES.contains(actionType)) return Validation.error("UNSUPPORTED_ACTION", "actionType:unsupported");
        if (!UUID_V4.matcher(action.optString("mutationId", "")).matches()) return Validation.error("INVALID_PAYLOAD", "mutationId:uuid-v4-required");
        if (!SOURCES.contains(action.optString("source", ""))) return Validation.error("INVALID_PAYLOAD", "source:unsupported");
        if (!nonEmpty(action.optString("sessionId", ""), 180)) return Validation.error("INVALID_PAYLOAD", "sessionId:required");
        if (!nonEmpty(action.optString("exerciseId", ""), 180)) return Validation.error("INVALID_PAYLOAD", "exerciseId:required");
        if (!isUtcTimestamp(action.optString("createdAt", ""))) return Validation.error("INVALID_PAYLOAD", "createdAt:utc-iso-required");
        if (!CLIENT_VERSION.matcher(action.optString("clientVersion", "")).matches()) return Validation.error("INVALID_PAYLOAD", "clientVersion:invalid");
        Object revision = action.opt("expectedRevision");
        if (revision != null && revision != JSONObject.NULL && (!(revision instanceof Number) || ((Number) revision).longValue() < 0 || ((Number) revision).doubleValue() != ((Number) revision).longValue())) {
            return Validation.error("INVALID_PAYLOAD", "expectedRevision:non-negative-integer-or-null");
        }
        JSONObject payload = action.optJSONObject("payload");
        if (payload == null) return Validation.error("INVALID_PAYLOAD", "payload:object-required");
        String structuralError = inspectJson(payload, "payload", Collections.newSetFromMap(new IdentityHashMap<>()), 0);
        if (!structuralError.isEmpty()) return Validation.error("INVALID_PAYLOAD", structuralError);
        if (payload.toString().getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) return Validation.error("INVALID_PAYLOAD", "payload:size-limit");
        String payloadError = validatePayload(actionType, payload);
        return payloadError.isEmpty() ? Validation.ok() : Validation.error("INVALID_PAYLOAD", payloadError);
    }

    public static JSONObject create(String actionType, String mutationId, String source, String sessionId,
                                    String exerciseId, String createdAt, String clientVersion,
                                    Long expectedRevision, JSONObject payload) {
        if (payload == null) return null;
        String structuralError = inspectJson(payload, "payload", Collections.newSetFromMap(new IdentityHashMap<>()), 0);
        if (!structuralError.isEmpty() || payload.toString().getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) return null;
        JSONObject action = new JSONObject();
        put(action, "schemaVersion", SCHEMA_VERSION);
        put(action, "payloadVersion", PAYLOAD_VERSION);
        put(action, "actionType", actionType);
        put(action, "mutationId", mutationId);
        put(action, "source", source);
        put(action, "sessionId", sessionId);
        put(action, "exerciseId", exerciseId);
        put(action, "createdAt", createdAt);
        put(action, "clientVersion", clientVersion);
        put(action, "expectedRevision", expectedRevision == null ? JSONObject.NULL : expectedRevision);
        put(action, "payload", cloneObject(payload));
        return validate(action).ok ? action : null;
    }

    /** Converts persisted pre-schema-1 records in memory without mutating the queue. */
    public static JSONObject adaptLegacy(JSONObject record) {
        if (record == null) return null;
        JSONObject nested = record.optJSONObject("action");
        if (nested != null) return validate(nested).ok ? cloneObject(nested) : null;
        if (record.has("actionType") || record.has("schemaVersion")) return validate(record).ok ? cloneObject(record) : null;

        String legacyType = record.optString("type", "");
        String actionType;
        if ("save_set".equals(legacyType) || SAVE_SET.equals(legacyType)) actionType = SAVE_SET;
        else if ("undo_set".equals(legacyType) || "UNDO_LAST_SET".equals(legacyType) || UNDO_SET.equals(legacyType)) actionType = UNDO_SET;
        else return null;

        JSONObject oldPayload = record.optJSONObject("payload");
        if (oldPayload == null) return null;
        JSONObject payload = cloneObject(oldPayload);
        String setId;
        if (SAVE_SET.equals(actionType)) {
            JSONObject set = oldPayload.optJSONObject("set");
            setId = firstNonEmpty(record.optString("setId", ""), set == null ? "" : set.optString("id", ""));
            payload.remove("set");
            put(payload, "setId", setId);
            put(payload, "values", cloneObject(set));
        } else {
            setId = firstNonEmpty(oldPayload.optString("targetSetId", ""), record.optString("setId", ""));
            payload.remove("targetSetId");
            put(payload, "setId", setId);
        }

        String createdAt = record.optString("createdAt", "");
        if (!isUtcTimestamp(createdAt)) createdAt = isoFromEpoch(record.optLong("createdAtEpochMs", 0L));
        Object revision = record.has("expectedRevision") ? record.opt("expectedRevision") : JSONObject.NULL;
        Long expectedRevision = revision instanceof Number && ((Number) revision).longValue() >= 0 ? ((Number) revision).longValue() : null;
        return create(
                actionType,
                firstNonEmpty(record.optString("mutationId", ""), record.optString("id", "")),
                normalizeSource(record.optString("source", SOURCE_WIDGET)),
                record.optString("sessionId", ""),
                firstNonEmpty(record.optString("exerciseId", ""), oldPayload.optString("exerciseId", "")),
                createdAt,
                CLIENT_VERSION.matcher(record.optString("clientVersion", "")).matches() ? record.optString("clientVersion") : "2.7.0+93",
                expectedRevision,
                payload
        );
    }

    public static boolean isPublicAction(String actionType) {
        return ACTION_TYPES.contains(actionType);
    }

    public static String normalizeSource(String source) {
        return SOURCE_NOTIFICATION.equals(source) ? SOURCE_NOTIFICATION : SOURCE_WIDGET.equals(source) ? SOURCE_WIDGET : SOURCE_WEB.equals(source) ? SOURCE_WEB : SOURCE_WIDGET;
    }

    private static String validatePayload(String actionType, JSONObject payload) {
        if (ADJUST_REPS.equals(actionType)) {
            Object delta = payload.opt("delta");
            if (!(delta instanceof Number) || ((Number) delta).doubleValue() != ((Number) delta).intValue() || ((Number) delta).intValue() == 0) return "payload.delta:non-zero-integer";
        } else if (ADJUST_WEIGHT.equals(actionType)) {
            if (!nonZeroFinite(payload.opt("deltaKg"))) return "payload.deltaKg:non-zero-number";
        } else if (SAVE_SET.equals(actionType)) {
            if (!nonEmpty(payload.optString("setId", ""), 180)) return "payload.setId:required";
            if (payload.optJSONObject("values") == null) return "payload.values:object-required";
        } else if (UNDO_SET.equals(actionType)) {
            if (!nonEmpty(payload.optString("setId", ""), 180)) return "payload.setId:required";
        } else if (REPEAT_LAST_SET.equals(actionType)) {
            if (!nonEmpty(payload.optString("sourceSetId", ""), 180)) return "payload.sourceSetId:required";
        } else if (PREVIOUS_EXERCISE.equals(actionType) || NEXT_EXERCISE.equals(actionType)) {
            if (payload.length() != 0) return "payload:must-be-empty";
        } else if (COMPLETE_TIME_SET.equals(actionType)) {
            if (!nonEmpty(payload.optString("setId", ""), 180)) return "payload.setId:required";
            if (!positiveFinite(payload.opt("durationSeconds"))) return "payload.durationSeconds:positive-number";
        } else if (COMPLETE_DISTANCE_SET.equals(actionType)) {
            if (!nonEmpty(payload.optString("setId", ""), 180)) return "payload.setId:required";
            if (!positiveFinite(payload.opt("distanceMeters"))) return "payload.distanceMeters:positive-number";
            if (payload.has("durationSeconds") && !nonNegativeFinite(payload.opt("durationSeconds"))) return "payload.durationSeconds:non-negative-number";
        }
        return "";
    }

    private static String inspectJson(Object value, String path, Set<Object> seen, int depth) {
        if (depth > 12) return path + ":max-depth";
        if (value == null || value == JSONObject.NULL || value instanceof String || value instanceof Boolean) return "";
        if (value instanceof Number) return Double.isFinite(((Number) value).doubleValue()) ? "" : path + ":non-finite-number";
        if (!(value instanceof JSONObject) && !(value instanceof JSONArray)) return path + ":unsupported-value";
        if (!seen.add(value)) return path + ":circular-reference";
        if (value instanceof JSONObject) {
            JSONObject object = (JSONObject) value;
            Iterator<String> keys = object.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                if (DANGEROUS_KEYS.contains(key)) return path + "." + key + ":dangerous-key";
                String error = inspectJson(object.opt(key), path + "." + key, seen, depth + 1);
                if (!error.isEmpty()) return error;
            }
        } else {
            JSONArray array = (JSONArray) value;
            for (int index = 0; index < array.length(); index++) {
                String error = inspectJson(array.opt(index), path + "[" + index + "]", seen, depth + 1);
                if (!error.isEmpty()) return error;
            }
        }
        seen.remove(value);
        return "";
    }

    private static boolean nonEmpty(String value, int max) {
        return value != null && !value.trim().isEmpty() && value.length() <= max;
    }

    private static boolean nonZeroFinite(Object value) {
        return value instanceof Number && Double.isFinite(((Number) value).doubleValue()) && ((Number) value).doubleValue() != 0d;
    }

    private static boolean positiveFinite(Object value) {
        return value instanceof Number && Double.isFinite(((Number) value).doubleValue()) && ((Number) value).doubleValue() > 0d;
    }

    private static boolean nonNegativeFinite(Object value) {
        return value instanceof Number && Double.isFinite(((Number) value).doubleValue()) && ((Number) value).doubleValue() >= 0d;
    }

    private static boolean isUtcTimestamp(String value) {
        if (value == null || !value.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$")) return false;
        SimpleDateFormat format = utcFormat();
        ParsePosition position = new ParsePosition(0);
        Date parsed = format.parse(value, position);
        return parsed != null && position.getIndex() == value.length() && format.format(parsed).equals(value);
    }

    private static String isoFromEpoch(long epochMs) {
        return utcFormat().format(new Date(Math.max(0L, epochMs)));
    }

    private static SimpleDateFormat utcFormat() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setLenient(false);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format;
    }

    private static String firstNonEmpty(String first, String second) {
        return first == null || first.trim().isEmpty() ? second == null ? "" : second : first;
    }

    private static JSONObject cloneObject(JSONObject value) {
        try { return value == null ? new JSONObject() : new JSONObject(value.toString()); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    private static void put(JSONObject target, String key, Object value) {
        try { target.put(key, value == null ? JSONObject.NULL : value); } catch (Exception ignored) {}
    }

    public static final class Validation {
        public final boolean ok;
        public final String errorCode;
        public final String error;

        private Validation(boolean ok, String errorCode, String error) {
            this.ok = ok;
            this.errorCode = errorCode;
            this.error = error;
        }

        static Validation ok() { return new Validation(true, "OK", ""); }
        static Validation error(String code, String error) { return new Validation(false, code, error); }
    }
}
