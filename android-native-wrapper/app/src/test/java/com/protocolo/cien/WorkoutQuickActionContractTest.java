package com.protocolo.cien;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONObject;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class WorkoutQuickActionContractTest {
    private static final String UUID = "11111111-1111-4111-8111-111111111111";
    private static final String CREATED_AT = "2026-08-05T12:00:00.000Z";

    @Test
    public void validatesNineActionsAndThreeSources() throws Exception {
        List<String> actions = Arrays.asList(
                WorkoutQuickActionContract.ADJUST_REPS,
                WorkoutQuickActionContract.ADJUST_WEIGHT,
                WorkoutQuickActionContract.SAVE_SET,
                WorkoutQuickActionContract.UNDO_SET,
                WorkoutQuickActionContract.REPEAT_LAST_SET,
                WorkoutQuickActionContract.PREVIOUS_EXERCISE,
                WorkoutQuickActionContract.NEXT_EXERCISE,
                WorkoutQuickActionContract.COMPLETE_TIME_SET,
                WorkoutQuickActionContract.COMPLETE_DISTANCE_SET
        );
        List<String> sources = Arrays.asList(
                WorkoutQuickActionContract.SOURCE_WEB,
                WorkoutQuickActionContract.SOURCE_WIDGET,
                WorkoutQuickActionContract.SOURCE_NOTIFICATION
        );
        assertEquals(9, actions.size());
        for (String actionType : actions) {
            for (String source : sources) {
                JSONObject action = action(actionType, source, payload(actionType));
                assertNotNull(action);
                assertTrue(actionType + ":" + source, WorkoutQuickActionContract.validate(action).ok);
                assertFalse(action.has("type"));
            }
        }
    }

    @Test
    public void rejectsInvalidSchemaIdentityTimeRevisionAndPayload() throws Exception {
        JSONObject saved = action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, payload(WorkoutQuickActionContract.SAVE_SET));
        saved.put("schemaVersion", 2);
        assertEquals("INVALID_SCHEMA", WorkoutQuickActionContract.validate(saved).errorCode);
        saved.put("schemaVersion", 1).put("mutationId", "not-a-uuid");
        assertEquals("INVALID_PAYLOAD", WorkoutQuickActionContract.validate(saved).errorCode);
        saved.put("mutationId", UUID).put("createdAt", "2026-08-05");
        assertEquals("INVALID_PAYLOAD", WorkoutQuickActionContract.validate(saved).errorCode);
        saved.put("createdAt", CREATED_AT).put("expectedRevision", -1);
        assertEquals("INVALID_PAYLOAD", WorkoutQuickActionContract.validate(saved).errorCode);

        JSONObject dangerous = payload(WorkoutQuickActionContract.SAVE_SET);
        dangerous.getJSONObject("values").put("constructor", new JSONObject());
        assertNull(action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, dangerous));

        JSONObject oversized = payload(WorkoutQuickActionContract.SAVE_SET);
        oversized.getJSONObject("values").put("note", "á".repeat(WorkoutQuickActionContract.MAX_PAYLOAD_BYTES));
        assertNull(action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, oversized));

        JSONObject circular = payload(WorkoutQuickActionContract.SAVE_SET);
        circular.getJSONObject("values").put("self", circular);
        assertNull(action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, circular));
    }

    @Test
    public void adaptsLegacySaveAndUndoWithoutMutatingRecords() throws Exception {
        JSONObject legacySave = new JSONObject()
                .put("id", UUID)
                .put("type", "save_set")
                .put("source", "android-widget")
                .put("sessionId", "session-1")
                .put("exerciseId", "press")
                .put("setId", "set-1")
                .put("createdAt", CREATED_AT)
                .put("expectedRevision", 3)
                .put("payload", new JSONObject()
                        .put("exercise", new JSONObject().put("id", "press").put("exerciseId", "press"))
                        .put("set", new JSONObject().put("id", "set-1").put("reps", 8).put("weightKg", 80)));
        String original = legacySave.toString();
        JSONObject adaptedSave = WorkoutQuickActionContract.adaptLegacy(legacySave);
        assertNotNull(adaptedSave);
        assertEquals(WorkoutQuickActionContract.SAVE_SET, adaptedSave.getString("actionType"));
        assertEquals("set-1", adaptedSave.getJSONObject("payload").getString("setId"));
        assertEquals(original, legacySave.toString());

        JSONObject legacyUndo = new JSONObject(legacySave.toString())
                .put("type", "UNDO_LAST_SET")
                .put("payload", new JSONObject().put("targetSetId", "set-1"));
        JSONObject adaptedUndo = WorkoutQuickActionContract.adaptLegacy(legacyUndo);
        assertNotNull(adaptedUndo);
        assertEquals(WorkoutQuickActionContract.UNDO_SET, adaptedUndo.getString("actionType"));
        assertEquals("set-1", adaptedUndo.getJSONObject("payload").getString("setId"));
        assertNull(WorkoutQuickActionContract.adaptLegacy(new JSONObject(legacySave.toString()).put("type", "unknown")));
    }

    @Test
    public void queueExtractsCanonicalActionFromNewAndLegacyRecords() throws Exception {
        JSONObject canonical = action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, payload(WorkoutQuickActionContract.SAVE_SET));
        JSONObject record = record(canonical, "pending", 1_000L);
        record.getJSONObject("transport").put("dedupeFingerprint", "x");
        assertEquals(UUID, WorkoutMutationQueue.action(record).getString("mutationId"));
        assertEquals("x", WorkoutMutationQueue.transport(record).getString("dedupeFingerprint"));
    }

    @Test
    public void queueRecoversPartialCorruptionAndPreservesOrderAcrossRestart() throws Exception {
        JSONObject first = action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, payload(WorkoutQuickActionContract.SAVE_SET));
        JSONObject second = new JSONObject(first.toString()).put("mutationId", "22222222-2222-4222-8222-222222222222");
        String persisted = new org.json.JSONArray()
                .put(record(first, "pending", 1_000L))
                .put(new JSONObject().put("broken", true))
                .put(record(second, "pending", 2_000L))
                .toString();
        WorkoutMutationQueue.ParseResult parsed = WorkoutMutationQueue.parse(persisted, 3_000L);
        assertTrue(parsed.corrupt);
        assertEquals("invalid-entry", parsed.reason);
        assertEquals(2, parsed.records.length());
        org.json.JSONArray pending = WorkoutMutationQueue.canonicalPending(parsed.records);
        assertEquals(UUID, pending.getJSONObject(0).getString("mutationId"));
        assertEquals("22222222-2222-4222-8222-222222222222", pending.getJSONObject(1).getString("mutationId"));
        assertEquals(0, WorkoutMutationQueue.parse("not-json", 3_000L).records.length());
        assertFalse(WorkoutMutationQueue.parse("[]", 3_000L).corrupt);
    }

    @Test
    public void queueAcknowledgesPartiallyAndNeverRevivesUndoneRecords() throws Exception {
        JSONObject first = action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, payload(WorkoutQuickActionContract.SAVE_SET));
        JSONObject second = new JSONObject(first.toString()).put("mutationId", "22222222-2222-4222-8222-222222222222");
        org.json.JSONArray queue = new org.json.JSONArray()
                .put(record(first, "pending", 1_000L))
                .put(record(second, "undone", 2_000L));
        assertTrue(WorkoutMutationQueue.markImported(queue, Collections.singleton(UUID), CREATED_AT));
        assertEquals("imported", WorkoutMutationQueue.status(queue.getJSONObject(0)));
        assertFalse(WorkoutMutationQueue.markImported(queue, Collections.singleton("22222222-2222-4222-8222-222222222222"), CREATED_AT));
        assertEquals("undone", WorkoutMutationQueue.status(queue.getJSONObject(1)));
        assertEquals(0, WorkoutMutationQueue.canonicalPending(queue).length());
        assertTrue(WorkoutMutationQueue.containsId(queue, UUID));
        assertFalse(WorkoutMutationQueue.containsId(queue, "33333333-3333-4333-8333-333333333333"));
    }

    @Test
    public void queueRetainsPendingAndExpiresOldImportedRecords() throws Exception {
        JSONObject first = action(WorkoutQuickActionContract.SAVE_SET, WorkoutQuickActionContract.SOURCE_WIDGET, payload(WorkoutQuickActionContract.SAVE_SET));
        JSONObject second = new JSONObject(first.toString()).put("mutationId", "22222222-2222-4222-8222-222222222222");
        long now = 8L * 24L * 60L * 60L * 1000L;
        org.json.JSONArray pruned = WorkoutMutationQueue.prune(new org.json.JSONArray()
                .put(record(first, "imported", 0L))
                .put(record(second, "pending", 0L)), now);
        assertEquals(1, pruned.length());
        assertEquals("22222222-2222-4222-8222-222222222222", WorkoutMutationQueue.id(pruned.getJSONObject(0)));
    }

    @Test
    public void duplicateProtectionBlocksRedeliveryButAllowsLaterLegitimateSave() throws Exception {
        org.json.JSONArray deliveries = WorkoutNativeRepository.appendDelivery(new org.json.JSONArray(), "widget:SAVE_SET:1:3");
        assertNotNull(deliveries);
        assertNull(WorkoutNativeRepository.appendDelivery(deliveries, "widget:SAVE_SET:1:3"));
        assertNotNull(WorkoutNativeRepository.appendDelivery(deliveries, "widget:SAVE_SET:1:4"));
        assertTrue(NativeWorkoutControlRepository.isAccidentalDuplicate("session|press|8|80", "session|press|8|80", 1_500L, 1_000L));
        assertFalse(NativeWorkoutControlRepository.isAccidentalDuplicate("session|press|8|80", "session|press|8|80", 2_000L, 1_000L));
        assertFalse(NativeWorkoutControlRepository.isAccidentalDuplicate("session|press|8|85", "session|press|8|80", 1_100L, 1_000L));
    }

    private static JSONObject action(String actionType, String source, JSONObject payload) {
        return WorkoutQuickActionContract.create(actionType, UUID, source, "session-1", "press", CREATED_AT, "2.7.0+94", 3L, payload);
    }

    private static JSONObject record(JSONObject action, String status, long createdAtEpochMs) throws Exception {
        return new JSONObject()
                .put("queueRecordVersion", 1)
                .put("action", new JSONObject(action.toString()))
                .put("status", status)
                .put("privateImportState", status)
                .put("createdAtEpochMs", createdAtEpochMs)
                .put("transport", new JSONObject());
    }

    private static JSONObject payload(String actionType) throws Exception {
        switch (actionType) {
            case WorkoutQuickActionContract.ADJUST_REPS: return new JSONObject().put("delta", 1);
            case WorkoutQuickActionContract.ADJUST_WEIGHT: return new JSONObject().put("deltaKg", 0.5);
            case WorkoutQuickActionContract.SAVE_SET: return new JSONObject().put("setId", "set-1").put("values", new JSONObject().put("id", "set-1").put("reps", 8).put("weightKg", 80));
            case WorkoutQuickActionContract.UNDO_SET: return new JSONObject().put("setId", "set-1");
            case WorkoutQuickActionContract.REPEAT_LAST_SET: return new JSONObject().put("sourceSetId", "set-0");
            case WorkoutQuickActionContract.COMPLETE_TIME_SET: return new JSONObject().put("setId", "set-time").put("durationSeconds", 60);
            case WorkoutQuickActionContract.COMPLETE_DISTANCE_SET: return new JSONObject().put("setId", "set-distance").put("distanceMeters", 1000).put("durationSeconds", 300);
            default: return new JSONObject();
        }
    }
}
