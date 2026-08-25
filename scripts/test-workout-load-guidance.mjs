import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const window={};const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON,Intl});
for(const file of ['gym/equipment.js','gym/set-model.js','workout-metrics.js','gym/workout-load-guidance.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const exercise={id:'press',exerciseId:'press',name:'Press banca'};
const ex=(sets)=>({...exercise,sets});
const sessions=[
  {id:'old',date:'2026-07-01',exercises:[ex([{id:'warm',reps:5,weight:100,setType:'warmup',equipmentId:'barbell-20'},{id:'old-work',reps:9,weight:75,setType:'working',equipmentId:'machine'}])]},
  {id:'new',date:'2026-07-10',exercises:[ex([{id:'bar',reps:8,weight:90,setType:'working',equipmentId:'barbell-20'},{id:'new-work',reps:8,weight:80,setType:'working',equipmentId:'machine'},{id:'bad',reps:5,weight:200,setType:'working',equipmentId:'machine',anomalyReview:{status:'pending',decision:'pending'}}])]},
  {id:'latest',date:'2026-07-12',exercises:[ex([{id:'latest-work',reps:10,weight:77.5,setType:'working',equipmentId:'machine'}])]}
];
const guidance=window.WORKOUT_LOAD_GUIDANCE.calculate({sessions,exercise,candidateSet:{reps:8,weight:80,loadMode:'total',equipmentId:'machine'}});
assert.equal(guidance.lastComparableSet.setId,'latest-work');
assert.equal(guidance.historicalLoadRecord.setId,'new-work');
assert.equal(guidance.historicalLoadRecord.weightKg,80);
assert.equal(guidance.comparableSetCount,3);
assert.equal(guidance.confidence,'high');
assert.ok(!guidance.comparisonKey.includes('barbell-20'));
const bodyweight=window.WORKOUT_LOAD_GUIDANCE.calculate({sessions:[{id:'pull',date:'2026-07-12',exercises:[{id:'pullup',exerciseId:'pullup',sets:[{id:'bw',reps:12,loadMode:'bodyweight',setType:'working'}]}]}],exercise:{id:'pullup',exerciseId:'pullup',bodyweight:true},candidateSet:{loadMode:'bodyweight'}});
assert.equal(bodyweight.recordKind,'bodyweight-reps');assert.equal(bodyweight.historicalLoadRecord.reps,12);
const assisted=window.WORKOUT_LOAD_GUIDANCE.calculate({sessions:[{id:'assist',date:'2026-07-12',exercises:[{id:'pullup',exerciseId:'pullup',sets:[{id:'a1',reps:8,loadMode:'assistance',measurementMode:'assistance',assistanceKg:30,setType:'working'},{id:'a2',reps:8,loadMode:'assistance',measurementMode:'assistance',assistanceKg:25,setType:'working'}]}]}],exercise:{id:'pullup',exerciseId:'pullup'},candidateSet:{loadMode:'assistance',measurementMode:'assistance'}});
assert.equal(assisted.recordKind,'assistance');assert.equal(assisted.historicalLoadRecord.assistanceKg,25);
console.log('Orientación de carga correcta: última serie y récord respetan equipo, modalidad, tipo, anomalías y peso corporal.');
