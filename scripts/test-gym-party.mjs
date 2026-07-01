import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../gym-party.js', import.meta.url), 'utf8');

function createContext() {
  const store = new Map();
  const context = {
    console,
    window: null,
    document: {
      getElementById() { return null; },
      addEventListener() {},
      head: {appendChild() {}},
      createElement() { return {id: '', textContent: '', style: {}, appendChild() {}}; }
    },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    navigator: {onLine: true},
    alert() {},
    confirm() { return true; },
    todayStr() { return '2026-06-24'; },
    uid(prefix) { return `${prefix}_test`; },
    escapeHtml(value) { return String(value ?? ''); },
    flash() {},
    addEventListener() {}
  };
  context.window = context;
  vm.runInContext(source, vm.createContext(context), {filename: 'gym-party.js'});
  return {context, store};
}

const {context} = createContext();
const party = context.GYM_PARTY_FEATURES;

assert.equal(party.MAX_GYM_PARTY_MEMBERS, 10);
assert.equal(party.hasFirebaseConfig({}), false);
assert.equal(party.hasFirebaseConfig({
  apiKey: 'api',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: 'app'
}), true);
assert.equal(party.firebaseConfigSource(), 'missing');
context.GYM_PARTY_FIREBASE_CONFIG = {
  apiKey: 'api',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  appId: 'app'
};
assert.equal(party.firebaseConfigSource(), 'bundled');
assert.equal(party.effectiveFirebaseConfig().projectId, 'demo');

const demo2 = party.buildDemoData(2);
assert.equal(demo2.members.length, 2);
assert.equal(demo2.party.inviteCode, 'DEMO100');
assert.ok(demo2.sessions.length > 0);
assert.ok(demo2.sets.length > 0);

const stats2 = party.calculatePartyStats(demo2, '2026-06-24');
assert.equal(stats2.length, 2);
assert.ok(stats2.every(row => row.current.sessionsCount >= 1));
assert.ok(stats2.every(row => row.current.totalSets >= 1));
assert.ok(stats2.every(row => typeof row.changeVsPreviousWeek.volumePct === 'number'));
const muscleModel = party.muscleInsightModel(demo2, stats2, 'Pecho', '2026-06-24');
assert.equal(muscleModel.selected, 'Pecho');
assert.ok(muscleModel.currentTotal.sets >= 1);
assert.ok(muscleModel.exerciseRows.some(row => row.name === 'Press de banca'));
assert.equal(muscleModel.memberRows.length, 2);
assert.ok(muscleModel.totalMusclesWithData >= 2);
assert.equal(muscleModel.weeklyRows.length, 6);
assert.ok(muscleModel.weeklyRows.some(row => row.bestWeight >= 50));
const pressRow = muscleModel.exerciseRows.find(row => row.name === 'Press de banca');
assert.ok(pressRow.currentSets >= 1);
assert.ok(pressRow.currentBestWeight >= 50);
assert.equal(typeof pressRow.bestWeightDelta, 'number');

const demo5 = party.buildDemoData(5);
assert.equal(demo5.members.length, 5);
assert.equal(party.calculatePartyStats(demo5, '2026-06-24').length, 5);

party.importState({
  gymPartySettings: {localUserId: 'user_test', firebaseConfig: {apiKey: 'should-not-export'}},
  gymPartyMembership: {partyId: 'party_test', userId: 'user_test', active: true},
  sharedWorkoutSessions: [{id: 'session_test', partyId: 'party_test', userId: 'user_test', date: '2026-06-24'}],
  sharedWorkoutSets: [{id: 'set_test', partyId: 'party_test', sessionId: 'session_test', userId: 'user_test', reps: 8, weightKg: 20}],
  syncQueue: [{id: 'session:session_test'}],
  lastGymPartySyncAt: '2026-06-24T12:00:00.000Z',
  gymPartyDemoData: demo2
});
const exported = party.exportState();
assert.equal(exported.gymPartySettings.localUserId, 'user_test');
assert.equal(Object.hasOwn(exported.gymPartySettings, 'firebaseConfig'), false);
assert.equal(exported.gymPartyMembership.partyId, 'party_test');
assert.equal(exported.sharedWorkoutSessions[0].id, 'session_test');
assert.equal(exported.sharedWorkoutSets[0].id, 'set_test');
assert.equal(exported.syncQueue[0].id, 'session:session_test');
assert.equal(exported.gymPartyDemoData.party.id, 'demo_party');

console.log('Gym Party correcto: demo 2 miembros, demo multi-miembro, estadisticas y backup/importacion.');
