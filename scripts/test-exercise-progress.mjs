import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const window={};const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON});
vm.runInContext(fs.readFileSync('gym/equipment.js','utf8'),context);
vm.runInContext(fs.readFileSync('gym/set-model.js','utf8'),context);
vm.runInContext(fs.readFileSync('workout-metrics.js','utf8'),context);
vm.runInContext(fs.readFileSync('gym/progression-engine.js','utf8'),context);
for(const file of ['muscle-taxonomy.js','progress-data-model.js','gym-progress-model.js','exercise-progress.js','personal-records.js'])vm.runInContext(fs.readFileSync(`progress/${file}`,'utf8'),context);
const library=[{id:'press',name:'Press banca',group:'Pecho'},{id:'press-inclinado',name:'Press inclinado',group:'Pecho'},{id:'dominadas',name:'Dominadas',group:'Espalda',unit:'peso corporal'}];
const ex=(id,name,sets,bodyweight=false)=>({id,exerciseId:id,name,muscle:id==='dominadas'?'Espalda':'Pecho',bodyweight,sets});
const sessions=[{id:'a',date:'2026-07-10',exercises:[ex('press','Press banca',[{reps:5,weight:100,setType:'warmup'},{reps:8,weight:60},{reps:9,weight:60},{reps:9,weight:60}]),ex('press-inclinado','Press inclinado',[{reps:8,weight:40}]),ex('dominadas','Dominadas',[{reps:10,weight:0,isBodyweight:true}],true)]},{id:'b',date:'2026-07-03',exercises:[ex('press','Press banca',[{reps:8,weight:60},{reps:8,weight:60},{reps:8,weight:60}])]}];
const model=window.EXERCISE_PROGRESS.build({sessions,library,days:30,today:'2026-07-12'}),press=model.byId.press,pull=model.byId.dominadas;
assert.equal(model.exercises.length,3);assert.equal(press.all.bestWeight,60);assert.equal(press.all.bestE1RM,78);assert.equal(window.EXERCISE_PROGRESS.e1rm(60,13),null);assert.equal(pull.all.bodyweightMaxReps,10);assert.equal(pull.all.bestE1RM,null);assert.equal(press.recommendation.kind,'rep');assert.equal(press.recommendation.dataUsed.targetSets,3);
assert.equal(press.all.sets,6);assert.equal(press.all.loggedSets,7);assert.equal(press.all.warmupSets,1);
const painful=window.EXERCISE_PROGRESS.recommendation([{bestWeight:60,maxReps:8,rows:[{sets:[{note:'dolor de hombro'}]}]},{bestWeight:60,maxReps:8,rows:[]}]);assert.equal(painful.kind,'maintain');
const records=window.PERSONAL_RECORDS.build(model);assert.equal(records.filter(item=>item.exerciseId==='press'&&item.type==='weight').length,1);assert.ok(records.some(item=>item.type==='reps-bodyweight'));assert.ok(!records.some(item=>item.type==='e1rm'&&item.exerciseId==='dominadas'));
const reviewed=window.PERSONAL_RECORDS.reviewQueue([{id:'reviewed',date:'2026-07-12',exercises:[ex('press','Press banca',[{id:'review-set',setNumber:1,reps:8,weight:140,anomalyReview:{decision:'exclude-progression',status:'excluded',codes:['load-jump']}}])]}]);assert.equal(reviewed.length,1);assert.equal(reviewed[0].decision,'exclude-progression');
const equipmentSessions=[
  {id:'bar',date:'2026-07-01',exercises:[ex('press','Press banca',[{reps:8,weight:30,loadMode:'perSide',barWeightKg:20,equipmentId:'barbell-20'}])]},
  {id:'smith',date:'2026-07-11',exercises:[ex('press','Press banca',Array.from({length:3},()=>({reps:8,weight:40,loadMode:'perSide',barWeightKg:0,equipmentId:'smith'})))]},
  {id:'smith-2',date:'2026-07-12',exercises:[ex('press','Press banca',Array.from({length:3},()=>({reps:9,weight:40,loadMode:'perSide',barWeightKg:0,equipmentId:'smith'})))]}
];
const equipmentModel=window.EXERCISE_PROGRESS.build({sessions:equipmentSessions,library,days:30,today:'2026-07-12'}).byId.press;
assert.equal(equipmentModel.all.equipmentId,'smith');assert.equal(equipmentModel.all.bestWeight,80);assert.equal(equipmentModel.history.length,2);assert.equal(equipmentModel.recommendation.kind,'rep');
const modalitySessions=[
  {id:'time-1',date:'2026-07-10',exercises:[ex('plancha','Plancha',[{measurementMode:'time',loadMode:'bodyweight',durationSeconds:45}])]},
  {id:'time-2',date:'2026-07-12',exercises:[ex('plancha','Plancha',[{measurementMode:'time',loadMode:'bodyweight',durationSeconds:60}])]}
];
const timeModel=window.EXERCISE_PROGRESS.build({sessions:modalitySessions,library:[...library,{id:'plancha',name:'Plancha',measurementMode:'time',unit:'tiempo'}],days:30,today:'2026-07-12'}).byId.plancha;
assert.equal(timeModel.all.bestDurationSeconds,60);assert.equal(timeModel.all.bestE1RM,null);assert.equal(timeModel.recommendation.kind,'time');
console.log('Progreso por ejercicio correcto: variantes, e1RM conservador, peso corporal, recomendacion y records derivados.');
