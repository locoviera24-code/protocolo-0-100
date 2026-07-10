import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../gym-party.js', import.meta.url), 'utf8');
const syncSource=await readFile(new URL('../gym-party-sync.js',import.meta.url),'utf8');
const firebaseServiceSource=await readFile(new URL('../firebase-service.js',import.meta.url),'utf8');
const metricsSource=await readFile(new URL('../gym-party-metrics.js',import.meta.url),'utf8');
const uiSource=await readFile(new URL('../gym-party-ui.js',import.meta.url),'utf8');
assert.match(source, /browserLocalPersistence/);
assert.match(source, /setPersistence/);
assert.match(source, /onAuthStateChanged/);
assert.match(source, /resumeFirebaseMembership/);
assert.match(source, /EmailAuthProvider/);
assert.match(source, /linkWithCredential/);
assert.match(source, /signInWithEmailAndPassword/);
assert.match(source, /restoreFirebaseMembershipForCurrentUser/);
assert.match(source, /history\?\.replaceState/);
assert.match(source, /searchParams\.delete\('gymPartyCode'\)/);
assert.match(source, /regenerateInvite/);
assert.match(source, /revokeInvite/);
assert.match(source, /deactivateFirebaseMembership/);
assert.match(source, /deleteSharedDataAndLeave/);
assert.match(source, /tombstoneOwnSharedCollection/);
assert.match(source,/batch\.set\(firestoreMod\.doc\(db,op\.collection,op\.payload\.id\),\{\.\.\.firestorePayload\(op\.payload\),updatedAt:timestamp\}\)/);
assert.doesNotMatch(source,/firestorePayload\(op\.payload\),updatedAt:timestamp\},\{merge:true\}/);

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
    setTimeout,
    clearTimeout,
    todayStr() { return '2026-06-24'; },
    uid(prefix) { return `${prefix}_test`; },
    escapeHtml(value) { return String(value ?? ''); },
    flash() {},
    addEventListener() {}
  };
  context.window = context;
  const vmContext=vm.createContext(context);
  vm.runInContext(firebaseServiceSource,vmContext,{filename:'firebase-service.js'});
  vm.runInContext(syncSource,vmContext,{filename:'gym-party-sync.js'});
  vm.runInContext(metricsSource,vmContext,{filename:'gym-party-metrics.js'});
  vm.runInContext(uiSource,vmContext,{filename:'gym-party-ui.js'});
  vm.runInContext(source,vmContext,{filename:'gym-party.js'});
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
assert.doesNotThrow(() => party.assertFirebaseSessionMatchesMembership({currentUser: {uid: 'user_ok'}}, {backendMode: 'firebase', userId: 'user_ok'}));
assert.throws(() => party.assertFirebaseSessionMatchesMembership({currentUser: {uid: 'other_user'}}, {backendMode: 'firebase', userId: 'user_ok'}), /sesion anonima original/);
const restoredAuth = await party.waitForInitialAuth({
  onAuthStateChanged(auth, next) {
    next({uid: 'restored_user'});
    return () => {};
  }
}, {currentUser: null});
assert.equal(restoredAuth.uid, 'restored_user');
const privacyFromMember = party.privacyFromMember({shareGymData: true, shareSetDetails: false, hideAbsoluteWeights: true});
assert.equal(privacyFromMember.shareGymData, true);
assert.equal(privacyFromMember.shareSetDetails, false);
assert.equal(privacyFromMember.hideAbsoluteWeights, true);

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
const noPrevious=party.calculatePartyStats({
  members:[{userId:'solo',aliasInParty:'Yo'}],
  sessions:[{id:'current',userId:'solo',date:'2026-06-24',totalSets:1,totalReps:8,totalVolume:160}],
  sets:[{id:'current-set',sessionId:'current',userId:'solo',date:'2026-06-24',reps:8,weightKg:20}]
},'2026-06-24');
assert.equal(noPrevious[0].changeVsPreviousWeek.volumePct,null);

party.importState({
  gymPartySettings: {localUserId: 'user_test', firebaseConfig: {apiKey: 'should-not-export'}, portableAccessEmail: 'private@example.com',pendingInviteCode:'SECRET10'},
  gymPartyMembership: {partyId: 'party_test', userId: 'user_test', active: true},
  sharedWorkoutSessions: [{id: 'session_test', partyId: 'party_test', userId: 'user_test', date: '2026-06-24'}],
  sharedWorkoutSets: [{id: 'set_test', partyId: 'party_test', sessionId: 'session_test', userId: 'user_test', reps: 8, weightKg: 20}],
  syncQueue: [{id: 'session:session_test'}],
  lastGymPartySyncAt: '2026-06-24T12:00:00.000Z',
  lastGymPartyRemoteSyncAt:'2026-06-24T11:59:00.000Z',
  gymPartyDemoData: demo2
});
const exported = party.exportState();
assert.equal(exported.gymPartySettings.localUserId, 'user_test');
assert.equal(Object.hasOwn(exported.gymPartySettings, 'firebaseConfig'), false);
assert.equal(Object.hasOwn(exported.gymPartySettings, 'portableAccessEmail'), false);
assert.equal(Object.hasOwn(exported.gymPartySettings, 'pendingInviteCode'), false);
assert.equal(exported.gymPartyMembership.partyId, 'party_test');
assert.equal(exported.sharedWorkoutSessions[0].id, 'session_test');
assert.equal(exported.sharedWorkoutSets[0].id, 'set_test');
assert.equal(exported.syncQueue[0].id, 'session:session_test');
assert.equal(exported.lastGymPartyRemoteSyncAt,'2026-06-24T11:59:00.000Z');
assert.equal(exported.gymPartyDemoData.party.id, 'demo_party');

const {context: syncContext, store: syncStore} = createContext();
const syncParty = syncContext.GYM_PARTY_FEATURES;
const localSession = {
  id: 'local_session',
  date: '2026-06-24',
  weekday: 'Miercoles',
  routine: {name: 'Torso B'},
  startedAt: '2026-06-24T10:00:00.000Z',
  status: 'en progreso',
  summary: {totalSets: 2, totalReps: 18, totalVolume: 560, exercisesCompleted: 1},
  exercises: [{
    id: 'press-banca-row',
    exerciseId: 'press-banca',
    name: 'Press de banca',
    muscle: 'Pecho',
    sets: [{id: 'set_keep', setNumber: 1, reps: 8, weight: 20, savedAt: '2026-06-24T10:05:00.000Z'}]
  }]
};
syncStore.set('protocolo_0_100_workout_sessions_v1', JSON.stringify([localSession]));
syncParty.importState({
  gymPartySettings: {localUserId: 'user_test'},
  gymPartyMembership: {
    partyId: 'party_test',
    userId: 'user_test',
    active: true,
    backendMode: 'firebase',
    privacy: {shareGymData: true, shareSetDetails: true}
  },
  sharedWorkoutSessions: [],
  sharedWorkoutSets: [
    {
      id: 'party_test_user_test_local_session_press-banca-row_set_keep',
      partyId: 'party_test',
      sessionId: 'party_test_user_test_local_session',
      userId: 'user_test',
      exerciseId: 'press-banca',
      reps: 8,
      weightKg: 20,
      source: 'firebase'
    },
    {
      id: 'party_test_user_test_local_session_press-banca-row_set_deleted',
      partyId: 'party_test',
      sessionId: 'party_test_user_test_local_session',
      userId: 'user_test',
      exerciseId: 'press-banca',
      reps: 10,
      weightKg: 40,
      source: 'firebase'
    }
  ],
  syncQueue: []
});
syncParty.syncFromLocalWorkouts({silent: true});
const synced = syncParty.exportState();
const deletedSet = synced.sharedWorkoutSets.find(row => row.id.endsWith('set_deleted'));
assert.equal(deletedSet.deleted, true);
assert.equal(deletedSet.pendingSync, true);
assert.ok(synced.syncQueue.some(op => op.id === `set:${deletedSet.id}` && op.payload.deleted === true));
localSession.exercises[0].sets.push({id:'set_deleted',setNumber:2,reps:10,weight:40,savedAt:'2026-06-24T10:08:00.000Z'});
syncStore.set('protocolo_0_100_workout_sessions_v1',JSON.stringify([localSession]));
syncParty.syncFromLocalWorkouts({silent:true});
const restoredSync=syncParty.exportState();
const restoredSet=restoredSync.sharedWorkoutSets.find(row=>row.id.endsWith('set_deleted'));
assert.equal(restoredSet.deleted,false);
assert.equal(restoredSet.reps,10);
assert.ok(restoredSync.syncQueue.some(op=>op.id===`set:${restoredSet.id}`&&op.payload.deleted===false));
const visibleStats = syncParty.calculatePartyStats({
  party: {id: 'party_test'},
  members: [{id: 'party_test_user_test', partyId: 'party_test', userId: 'user_test', aliasInParty: 'Yo'}],
  sessions: synced.sharedWorkoutSessions,
  sets: synced.sharedWorkoutSets
}, '2026-06-24');
assert.equal(visibleStats[0].current.totalSets, 1);
assert.equal(visibleStats[0].current.totalVolume, 160);

console.log('Gym Party correcto: demo, estadisticas, tombstones, restauracion sin resurreccion incorrecta y backup.');
