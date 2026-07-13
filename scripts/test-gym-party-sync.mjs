import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../gym-party-sync.js',import.meta.url),'utf8');
const setModelSource=await readFile(new URL('../gym/set-model.js',import.meta.url),'utf8');
const context={window:null,Intl,Date};context.window=context;
const vmContext=vm.createContext(context);
vm.runInContext(setModelSource,vmContext,{filename:'gym/set-model.js'});
vm.runInContext(source,vmContext,{filename:'gym-party-sync.js'});
const sync=context.GYM_PARTY_SYNC;

const base={id:'set-1',partyId:'party',userId:'me',reps:8,weightKg:20,revision:1,updatedAt:'2026-07-10T10:00:00.000Z'};
const prepared=sync.prepareLocalRows([base],[])[0];
assert.equal(prepared.syncState,'pending');
assert.equal(prepared.dirty,true);
assert.equal(prepared.revision,1);
const synced=sync.markRowsSynced([prepared],['set-1'])[0];
assert.equal(synced.syncState,'synced');
const unchanged=sync.prepareLocalRows([base],[synced])[0];
assert.equal(unchanged.dirty,false);
assert.equal(unchanged.revision,1);
const changed=sync.prepareLocalRows([{...base,reps:9}],[synced])[0];
assert.equal(changed.revision,2);
assert.equal(changed.syncState,'pending');

const remoteNewer={...base,reps:10,revision:3,updatedAt:{seconds:1783681200,nanoseconds:0}};
const conflict=sync.mergeRemoteRows([changed],[remoteNewer]).find(row=>row.id==='set-1');
assert.equal(conflict.reps,10);
assert.equal(conflict.syncState,'conflict');
assert.equal(conflict.conflict.resolution,'remote-newer');

const tombstone={...changed,deleted:true,deletedAt:'2026-07-10T11:00:00.000Z',revision:4};
const noResurrection=sync.mergeRemoteRows([tombstone],[{...remoteNewer,deleted:false,revision:3}]).find(row=>row.id==='set-1');
assert.equal(noResurrection.deleted,true);
const remoteDelete=sync.mergeRemoteRows([synced],[{...remoteNewer,deleted:true,deletedAt:{seconds:1783684800,nanoseconds:0},revision:4}]).find(row=>row.id==='set-1');
assert.equal(remoteDelete.deleted,true);

const time=sync.timeContext('2026-07-10');
assert.equal(time.localDate,'2026-07-10');
assert.equal(typeof time.timeZone,'string');
assert.equal(typeof time.utcOffset,'number');
assert.equal(sync.backoffDelay(1),1000);
assert.ok(sync.backoffDelay(12)<=300000);

const localWorkout={id:'local-session',date:'2026-07-10',routine:{name:'Torso'},exercises:[{id:'bench',exerciseId:'bench',name:'Press banca',muscle:'Pecho',sets:[{id:'set-local',setNumber:1,reps:8,weight:20}]}]};
const sharedSession={id:'party_me_local-session',localSessionId:'local-session',date:'2026-07-10',weekday:'viernes',routineName:'Torso',startedAt:'2026-07-10T10:00:00.000Z'};
const reconciled=sync.reconcileWorkoutSessions([localWorkout],[sharedSession],[{...remoteNewer,id:'remote-set',sessionId:sharedSession.id,localExerciseId:'bench',localSetId:'set-local',exerciseId:'bench',exerciseName:'Press banca',muscleGroup:'Pecho',setNumber:1,reps:10,weightKg:22.5,isBodyweight:false,setType:'backoff',completed:true,excludeFromRecords:false,excludeFromProgression:true,createdAt:'2026-07-10T10:05:00.000Z'}]);
assert.deepEqual(Array.from(reconciled.changedIds),['local-session']);
assert.equal(reconciled.sessions[0].exercises[0].sets[0].weight,22.5);
assert.equal(reconciled.sessions[0].exercises[0].sets[0].reps,10);
assert.equal(reconciled.sessions[0].exercises[0].sets[0].setType,'backoff');
assert.equal(reconciled.sessions[0].exercises[0].sets[0].excludeFromProgression,true);
const deleted=sync.reconcileWorkoutSessions(reconciled.sessions,[sharedSession],[{id:'remote-set',sessionId:sharedSession.id,localExerciseId:'bench',localSetId:'set-local',exerciseId:'bench',deleted:true,deletedReason:'set-deleted',deletedAt:'2026-07-10T12:00:00.000Z'}]);
assert.equal(deleted.sessions[0].exercises[0].sets.length,0);
const privacyRemoval=sync.reconcileWorkoutSessions([localWorkout],[sharedSession],[{id:'remote-set',sessionId:sharedSession.id,localExerciseId:'bench',localSetId:'set-local',exerciseId:'bench',deleted:true,deletedReason:'privacy-removal',deletedAt:'2026-07-10T12:00:00.000Z'}]);
assert.equal(privacyRemoval.sessions[0].exercises[0].sets.length,1);

console.log('Sync incremental correcto: dirty flags, conflicto LWW, tombstones, reconciliacion local, backoff y timeContext.');
