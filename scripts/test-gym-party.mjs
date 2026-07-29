import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../gym-party.js', import.meta.url), 'utf8');
const membershipsSource=await readFile(new URL('../gym-party-memberships.js',import.meta.url),'utf8');
const fanoutSource=await readFile(new URL('../gym-party-fanout.js',import.meta.url),'utf8');
const equipmentSource=await readFile(new URL('../gym/equipment.js',import.meta.url),'utf8');
const setModelSource=await readFile(new URL('../gym/set-model.js',import.meta.url),'utf8');
const workoutMetricsSource=await readFile(new URL('../workout-metrics.js',import.meta.url),'utf8');
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
assert.match(source,/membershipRevision:Number\(party\.membershipRevision\|\|0\)/);
assert.match(source,/lastMembershipMutation:mutation/);
assert.match(source,/deactivationReason:'left'/);
assert.match(source,/deactivationReason:'archived'/);
assert.match(source,/MEMBERSHIP_REACTIVATION_DENIED/);
assert.match(source,/operation==='reactivate'/);
assert.match(source,/transaction\.update\(inviteRef,\{membersCount:membersCount\+1,uses:uses\+1,membershipRevision:revision/);
assert.match(source,/batch\.set\(firestoreMod\.doc\(db,op\.collection,op\.payload\.id\),\{\.\.\.firestorePayload\(op\.payload,op\.collection\),updatedAt:timestamp\}\)/);
assert.doesNotMatch(source,/firestorePayload\(op\.payload,op\.collection\),updatedAt:timestamp\},\{merge:true\}/);

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
  vm.runInContext(equipmentSource,vmContext,{filename:'gym/equipment.js'});
  vm.runInContext(setModelSource,vmContext,{filename:'gym/set-model.js'});
  vm.runInContext(workoutMetricsSource,vmContext,{filename:'workout-metrics.js'});
  vm.runInContext(firebaseServiceSource,vmContext,{filename:'firebase-service.js'});
  vm.runInContext(syncSource,vmContext,{filename:'gym-party-sync.js'});
  vm.runInContext(metricsSource,vmContext,{filename:'gym-party-metrics.js'});
  vm.runInContext(membershipsSource,vmContext,{filename:'gym-party-memberships.js'});
  vm.runInContext(fanoutSource,vmContext,{filename:'gym-party-fanout.js'});
  vm.runInContext(uiSource,vmContext,{filename:'gym-party-ui.js'});
  vm.runInContext(source,vmContext,{filename:'gym-party.js'});
  return {context, store};
}

const {context} = createContext();
const party = context.GYM_PARTY_FEATURES;
const membershipModel=context.GYM_PARTY_MEMBERSHIPS;
const fanoutModel=context.GYM_PARTY_FANOUT;

const normalizedMemberships=membershipModel.normalizeMemberships([
  {partyId:'party_a',userId:'user',active:true,joinedAt:'2026-07-01',privacy:{shareGymData:true}},
  {partyId:'party_a',userId:'user',active:true,joinedAt:'2026-07-02',privacy:{hideAbsoluteWeights:true}},
  {partyId:'party_b',userId:'user',active:true,joinedAt:'2026-07-03',privacy:{shareGymData:false}}
]);
assert.equal(normalizedMemberships.length,2);
assert.equal(normalizedMemberships.find(item=>item.partyId==='party_a').privacy.hideAbsoluteWeights,true);
assert.equal(membershipModel.resolveSelectedPartyId(normalizedMemberships,'missing'),'party_b');
assert.equal(membershipModel.shareable(normalizedMemberships).map(item=>item.partyId).join(','),'party_a');
assert.equal(fanoutModel.destinationMemberships(normalizedMemberships,{sharingDestination:'private-only'}).length,0);
assert.equal(fanoutModel.destinationMemberships(normalizedMemberships,{sharingDestination:'selected-parties',selectedSharePartyIds:['party_a']}).length,1);
const modeledTargets=fanoutModel.targets(normalizedMemberships,{originSessionId:'session',originSetId:'set',sharingDestination:'all-active-parties'});
assert.equal(modeledTargets.length,1);
assert.equal(modeledTargets[0].id,'party_a_user_set');
assert.equal(fanoutModel.stricterPrivacy({hideAbsoluteWeights:false,shareSetDetails:true},{hideAbsoluteWeights:true,shareSetDetails:false}).hideAbsoluteWeights,true);
const targetStates=[{partyId:'done',originSetId:'set',syncState:'synced'},{partyId:'wait',originSetId:'set',syncState:'pending'},{partyId:'broken',originSetId:'set',syncState:'error'}];
assert.deepEqual({...fanoutModel.status(targetStates,[])},{total:3,synced:1,pending:1,errors:1});

assert.equal(party.MAX_GYM_PARTY_MEMBERS, 10);
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'local'}).id,'local');
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'firebase',pending:2,online:false}).id,'pending');
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'firebase',syncing:true,pending:2}).id,'syncing');
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'firebase',error:'network'}).id,'error');
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'firebase',requiresAccess:true}).id,'requires-access');
assert.equal(context.GYM_PARTY_UI.syncState({backendMode:'firebase',lastSyncAt:'2026-07-12T10:00:00.000Z'}).id,'synced');
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
const cleanLegacySession=party.firestorePayload({
  id:'shared_session',partyId:'party',userId:'user',localSessionId:'local',date:'2026-06-24',weekday:'Miercoles',routineName:'Torso',totalSets:3,
  source:'local',pendingSync:true,dirty:true,legacyField:'remove',deleted:true
},party.collections.sessions);
assert.equal(cleanLegacySession.totalSets,3);
assert.equal(Object.hasOwn(cleanLegacySession,'legacyField'),false);
assert.equal(Object.hasOwn(cleanLegacySession,'deleted'),false);
assert.equal(Object.hasOwn(cleanLegacySession,'source'),false);
const sharedEquipmentSet=party.sanitizeWorkoutSets({id:'local-session',date:'2026-07-12',startedAt:'2026-07-12T10:00:00.000Z',exercises:[{id:'press',exerciseId:'press',name:'Press banca',muscle:'Pecho',sets:[{id:'set-1',reps:8,weight:30,loadMode:'perSide',barWeightKg:20,equipmentId:'barbell-20',measurementMode:'reps'}]}]},{partyId:'party',userId:'user',backendMode:'firebase'},{shareAggregateOnly:false,shareSetDetails:true,hideAbsoluteWeights:false})[0];
assert.equal(sharedEquipmentSet.loadMode,'perSide');
assert.equal(context.WORKOUT_EQUIPMENT.normalizeSet(sharedEquipmentSet).normalizedTotalKg,80);
assert.equal(sharedEquipmentSet.equipmentId,'barbell-20');
const sharedTimedSet=party.sanitizeWorkoutSets({id:'timed',date:'2026-07-12',exercises:[{id:'plank',name:'Plancha',sets:[{id:'time-1',measurementMode:'time',loadMode:'bodyweight',durationSeconds:60}]}]},{partyId:'party',userId:'user',backendMode:'firebase'},{shareAggregateOnly:false,shareSetDetails:true,hideAbsoluteWeights:false})[0];
assert.equal(sharedTimedSet.durationSeconds,60);
assert.equal(party.normalizeSessionsFromSets([{id:'party_user_timed'}],[{...sharedTimedSet,sessionId:'party_user_timed'}])[0].totalVolume,0);

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
  sets:[{id:'current-set',sessionId:'current',userId:'solo',date:'2026-06-24',reps:8,weightKg:20,setType:'working'},{id:'warmup-set',sessionId:'current',userId:'solo',date:'2026-06-24',reps:5,weightKg:100,setType:'warmup'}]
},'2026-06-24');
assert.equal(noPrevious[0].changeVsPreviousWeek.volumePct,null);
assert.equal(noPrevious[0].current.totalSets,2);
assert.equal(noPrevious[0].current.totalVolume,160);

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
assert.equal(exported.gymPartyMembershipsV2.length,1);
assert.equal(exported.selectedPartyId,'party_test');
assert.equal(exported.sharedWorkoutSessions[0].id, 'session_test');
assert.equal(exported.sharedWorkoutSets[0].id, 'set_test');
assert.equal(exported.syncQueue[0].id, 'session:session_test');
assert.equal(exported.lastGymPartyRemoteSyncAt,'2026-06-24T11:59:00.000Z');
assert.equal(exported.gymPartyDemoData.party.id, 'demo_party');

const {context: multiContext}=createContext();
multiContext.APP_FEATURE_FLAGS={isEnabled:name=>name==='multiPartyWorkoutSharing'};
const multiParty=multiContext.GYM_PARTY_FEATURES;
multiParty.importState({
  gymPartyMembershipsV2:[
    {partyId:'party_one',userId:'user_multi',active:true,backendMode:'firebase',joinedAt:'2026-07-01',privacy:{shareGymData:true},party:{id:'party_one',name:'Uno'}},
    {partyId:'party_two',userId:'user_multi',active:true,backendMode:'firebase',joinedAt:'2026-07-02',privacy:{shareGymData:false},party:{id:'party_two',name:'Dos'}}
  ],
  selectedPartyId:'party_one'
});
assert.equal(multiParty.activeMemberships().length,2);
assert.equal(multiParty.selectedMembership().partyId,'party_one');
assert.equal(multiParty.shareableMemberships().length,1);
multiParty.selectMembership('party_two',{render:false});
assert.equal(multiParty.selectedMembership().partyId,'party_two');
assert.equal(multiParty.exportState().gymPartyMembership.partyId,'party_two');

const {context: fanoutContext,store: fanoutStore}=createContext();
fanoutContext.APP_FEATURE_FLAGS={isEnabled:name=>name==='multiPartyWorkoutSharing'};
const fanoutParty=fanoutContext.GYM_PARTY_FEATURES;
const fanoutSession={id:'native_session',date:'2026-07-20',weekday:'Lunes',routine:{name:'Torso'},startedAt:'2026-07-20T10:00:00.000Z',status:'en progreso',summary:{totalSets:1,totalReps:8,totalVolume:480},exercises:[{id:'press-row',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'native_set',setNumber:1,reps:8,weight:60,weightKg:60,setType:'working',completed:true}]}]};
fanoutStore.set('protocolo_0_100_workout_sessions_v1',JSON.stringify([fanoutSession]));
fanoutParty.importState({
  gymPartySettings:{localUserId:'fanout_user',sharingDestination:'all-active-parties'},
  gymPartyMembershipsV2:[
    {partyId:'party_alpha',userId:'fanout_user',active:true,backendMode:'firebase',privacy:{shareGymData:true,shareSetDetails:true},party:{id:'party_alpha',name:'Alpha'}},
    {partyId:'party_beta',userId:'fanout_user',active:true,backendMode:'firebase',privacy:{shareGymData:true,shareSetDetails:true,hideAbsoluteWeights:true},party:{id:'party_beta',name:'Beta'}},
    {partyId:'party_aggregate',userId:'fanout_user',active:true,backendMode:'firebase',privacy:{shareGymData:true,shareAggregateOnly:true,shareSetDetails:false},party:{id:'party_aggregate',name:'Agregado'}},
    {partyId:'party_private',userId:'fanout_user',active:true,backendMode:'firebase',privacy:{shareGymData:false},party:{id:'party_private',name:'Privada'}}
  ],
  selectedPartyId:'party_alpha',sharedWorkoutSessions:[],sharedWorkoutSets:[],syncQueue:[]
});
const preparedFanout=fanoutParty.syncFromLocalWorkouts({silent:true});
assert.equal(preparedFanout.destinations.length,3);
let fanoutExport=fanoutParty.exportState();
assert.equal(fanoutExport.sharedWorkoutSessions.length,3);
assert.equal(fanoutExport.sharedWorkoutSets.length,2);
assert.equal(fanoutExport.sharedWorkoutSets.find(item=>item.partyId==='party_alpha').weightKg,60);
assert.equal(fanoutExport.sharedWorkoutSets.find(item=>item.partyId==='party_beta').weightKg,null);
assert.equal(fanoutExport.syncQueue.length,5);
const nativeTargets=fanoutParty.nativeShareTargets({originSessionId:'native_session',originSetId:'native_set'});
const nativeFanout=await fanoutParty.enqueueNativeMutationShare({id:'mutation',sessionId:'native_session',exerciseId:'press-banca',setId:'native_set',shareTargets:nativeTargets},[fanoutSession]);
assert.equal(nativeFanout.total,3);
fanoutExport=fanoutParty.exportState();
assert.equal(fanoutExport.sharedWorkoutSets.length,2,'El reintento nativo no duplica filas por destino');

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
    sets: [{id: 'set_keep', setNumber: 1, reps: 8, weight: 20, setType:'working', completed:true, savedAt: '2026-06-24T10:05:00.000Z'}]
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
assert.equal(synced.sharedWorkoutSessions[0].durationMinutes,0);
const keptSet=synced.sharedWorkoutSets.find(row=>row.id.endsWith('set_keep'));
assert.equal(keptSet.setType,'working');
assert.equal(keptSet.completed,true);
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
