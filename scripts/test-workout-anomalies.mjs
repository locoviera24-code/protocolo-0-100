import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={};
const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON});
for(const file of ['gym/equipment.js','gym/set-model.js','workout-metrics.js','gym/anomaly-detector.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const detector=window.WORKOUT_ANOMALY_DETECTOR,exercise={id:'press',exerciseId:'press'},base={measurementMode:'reps',loadMode:'total',equipmentId:'barbell-20',laterality:'bilateral',setType:'working',completed:true};
let sequence=0;
const set=(reps,weight,extra={})=>({id:`set-${++sequence}`,...base,reps,weight,weightKg:weight,originalWeight:weight,originalUnit:'kg',...extra});
const history=[set(8,60),set(10,60),set(8,62.5),set(10,62.5)];

assert.equal(detector.VERSION,1);
assert.equal(detector.analyze({candidate:set(10,65),history,exercise}).suspicious,false);
const jump=detector.analyze({candidate:set(8,120),history,exercise});
assert.equal(jump.suspicious,true);assert.ok(jump.issues.some(item=>item.code==='load-jump'));
const units=detector.analyze({candidate:set(8,137.5),history,exercise});
assert.ok(units.issues.some(item=>item.code==='possible-unit-error'));
const reps=detector.analyze({candidate:set(250,20),history,exercise});
assert.ok(reps.issues.some(item=>item.code==='reps-improbable'));
const warmup=detector.analyze({candidate:set(8,300,{setType:'warmup'}),history,exercise});
assert.equal(warmup.suspicious,false);
const time=detector.analyze({candidate:set(0,0,{measurementMode:'time',loadMode:'bodyweight',durationSeconds:90000}),history:[],exercise});
assert.ok(time.issues.some(item=>item.code==='duration-improbable'));
const distance=detector.analyze({candidate:set(0,0,{measurementMode:'distance',loadMode:'bodyweight',distanceMeters:600000}),history:[],exercise});
assert.ok(distance.issues.some(item=>item.code==='distance-improbable'));

const perHandHistory=[set(10,20,{loadMode:'perHand',equipmentId:'dumbbell'}),set(10,20,{loadMode:'perHand',equipmentId:'dumbbell'})];
const mode=detector.analyze({candidate:set(10,20,{loadMode:'total',equipmentId:'dumbbell'}),history:perHandHistory,exercise});
assert.ok(mode.issues.some(item=>item.code==='load-mode-change'));
const assistanceHistory=[set(8,30,{measurementMode:'assistance',loadMode:'assistance',assistanceKg:30,equipmentId:'assisted-pullup'}),set(9,30,{measurementMode:'assistance',loadMode:'assistance',assistanceKg:30,equipmentId:'assisted-pullup'})];
const assistance=detector.analyze({candidate:set(8,30,{measurementMode:'reps',loadMode:'addedLoad',equipmentId:'assisted-pullup'}),history:assistanceHistory,exercise});
assert.ok(assistance.issues.some(item=>item.code==='assistance-load-change'));

const confirmed=detector.applyDecision(set(8,120),jump,'confirm',{now:'2026-07-18T12:00:00.000Z'});
assert.equal(confirmed.excludeFromRecords,false);assert.equal(confirmed.excludeFromProgression,false);assert.equal(confirmed.anomalyReview.status,'confirmed');
const withoutRecord=detector.applyDecision(set(8,120),jump,'exclude-record');
assert.equal(withoutRecord.excludeFromRecords,true);assert.notEqual(withoutRecord.excludeFromProgression,true);assert.equal(window.WORKOUT_SET_MODEL.countsForRecords(withoutRecord),false);assert.equal(window.WORKOUT_SET_MODEL.countsForProgression(withoutRecord),true);
const excluded=detector.applyDecision(set(8,120),jump,'exclude-progression');
assert.equal(excluded.excludeFromRecords,true);assert.equal(excluded.excludeFromProgression,true);assert.equal(window.WORKOUT_SET_MODEL.countsForProgression(excluded),false);
const pending=detector.markPending(set(8,120),jump,{now:'2026-07-18T12:00:00.000Z'});
assert.equal(pending.anomalyReview.status,'pending');assert.equal(pending.excludeFromRecords,true);assert.equal(pending.excludeFromProgression,true);

console.log('Anomalias de Gym correctas: carga, unidades, reps, modalidades, decisiones y exclusiones.');
