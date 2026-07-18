import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={};
const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON});
vm.runInContext(fs.readFileSync('gym/progression-engine.js','utf8'),context);
const engine=window.WORKOUT_PROGRESSION;
const key='press|reps|total|barbell-20||bilateral|total';
let setSequence=0;
const set=(reps,weight=60,extra={})=>({id:`set-${++setSequence}`,reps,weight,weightKg:weight,recordLoadKg:weight,comparisonKey:key,completed:true,progressionEligible:true,setType:'working',rir:2,...extra});
const session=(id,date,sets,comparisonKey=key)=>({sessionId:id,date,comparisonKey,rows:[{sets:sets.map(item=>({...item,comparisonKey:item.comparisonKey||comparisonKey}))}]});
const prescription={targetSets:3,repsMin:8,repsMax:12,targetRirMin:1,targetRirMax:3,progressionMode:'doubleProgression',incrementKg:2.5,measurementMode:'reps',loadMode:'total'};

assert.equal(engine.VERSION,1);
assert.deepEqual(Array.from(engine.MODES),['doubleProgression','loadProgression','repProgression','timeProgression','distanceProgression','assistanceReduction','maintainTechnique']);
const load=engine.recommend({history:[session('new','2026-07-12',[set(12),set(12),set(12)]),session('old','2026-07-05',[set(12),set(12),set(12)])],prescription});
assert.equal(load.kind,'load');
assert.equal(load.suggested.weightKg,62.5);
assert.equal(load.confidence,'high');
assert.equal(load.sessionsCompared.length,2);
assert.equal(load.dataUsed.targetSets,3);
const unsorted=engine.recommend({history:[session('old','2026-07-05',[set(12),set(12),set(12)]),session('new','2026-07-12',[set(12),set(12),set(12)])],prescription});
assert.equal(unsorted.sessionsCompared[0].id,'new');

const directLoad=engine.recommend({history:[session('new','2026-07-12',[set(8),set(8),set(8)]),session('old','2026-07-05',[set(8),set(8),set(8)])],prescription:{...prescription,progressionMode:'loadProgression'}});
assert.equal(directLoad.kind,'load');
const technique=engine.recommend({history:[session('new','2026-07-12',[set(8),set(8),set(8)]),session('old','2026-07-05',[set(8),set(8),set(8)])],prescription:{...prescription,progressionMode:'maintainTechnique'}});
assert.equal(technique.kind,'maintain');

const missingRirSets=[set(12,60,{rir:null}),set(12,60,{rir:null}),set(12,60,{rir:null})];
assert.equal(engine.recommend({history:[session('new','2026-07-12',missingRirSets),session('old','2026-07-05',missingRirSets)],prescription}).kind,'repeat');
const rep=engine.recommend({history:[session('new','2026-07-12',[set(10),set(10),set(10)]),session('old','2026-07-05',[set(9),set(9),set(9)])],prescription});
assert.equal(rep.kind,'rep');
assert.equal(rep.suggested.reps,11);
const warmupOnly=session('warm','2026-07-12',[set(12,20,{setType:'warmup',progressionEligible:false})]);
assert.equal(engine.recommend({history:[warmupOnly,session('old','2026-07-05',[set(8),set(8),set(8)])],prescription}).kind,'insufficient');
const pain=engine.recommend({history:[session('new','2026-07-12',[set(10,60,{note:'molestia de hombro'}),set(10),set(10)]),session('old','2026-07-05',[set(10),set(10),set(10)])],prescription});
assert.equal(pain.kind,'maintain');
assert.deepEqual(Array.from(pain.blockers),['pain']);
const changed=session('old','2026-07-05',[set(10)],'press|reps|total|smith||bilateral|total');
assert.equal(engine.recommend({history:[session('new','2026-07-12',[set(10)]),changed],prescription}).kind,'insufficient');

const timeSet=seconds=>set(0,0,{measurementMode:'time',loadMode:'bodyweight',durationSeconds:seconds});
const time=engine.recommend({history:[session('time-new','2026-07-12',[timeSet(60)]),session('time-old','2026-07-05',[timeSet(50)])],prescription:{targetSets:1,progressionMode:'timeProgression',measurementMode:'time'}});
assert.equal(time.kind,'time');assert.equal(time.suggested.durationSeconds,65);
const distanceSet=meters=>set(0,0,{measurementMode:'distance',loadMode:'bodyweight',distanceMeters:meters});
const distance=engine.recommend({history:[session('distance-new','2026-07-12',[distanceSet(1200)]),session('distance-old','2026-07-05',[distanceSet(1000)])],prescription:{targetSets:1,progressionMode:'distanceProgression',measurementMode:'distance',distanceIncrementMeters:200}});
assert.equal(distance.kind,'distance');assert.equal(distance.suggested.distanceMeters,1400);
const assistedSet=(reps,assistance)=>set(reps,0,{measurementMode:'assistance',loadMode:'assistance',assistanceKg:assistance});
const assistance=engine.recommend({history:[session('assist-new','2026-07-12',[assistedSet(10,30),assistedSet(10,30),assistedSet(10,30)]),session('assist-old','2026-07-05',[assistedSet(10,30),assistedSet(10,30),assistedSet(10,30)])],prescription:{...prescription,progressionMode:'assistanceReduction',measurementMode:'assistance',loadMode:'assistance',incrementKg:2.5}});
assert.equal(assistance.kind,'assistance');assert.equal(assistance.suggested.assistanceKg,27.5);

const plan={monday:{exercises:[{exerciseId:'press',targetSets:3,repsMin:6,repsMax:10,targetRirMin:1,targetRirMax:2,progressionMode:'doubleProgression',incrementKg:1.25}]},friday:{exercises:[{exerciseId:'press',targetSets:4,repsMin:8,repsMax:12,targetRirMin:2,targetRirMax:3,progressionMode:'doubleProgression',incrementKg:2.5}]}};
const resolved=engine.resolvePrescription({exerciseId:'press',library:[{id:'press',measurementMode:'reps'}],plan,context:{loadMode:'total'}});
assert.equal(resolved.targetSets,4);assert.equal(resolved.repRangeMin,6);assert.equal(resolved.repRangeMax,12);assert.equal(resolved.targetRirMin,2);assert.equal(resolved.targetRirMax,2);assert.equal(resolved.incrementKg,1.25);

console.log('Motor de progresion correcto: prescripcion, comparabilidad, RIR, carga, reps, tiempo, distancia y asistencia.');
