import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={};
const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON});
for(const file of ['muscle-taxonomy.js','progress-data-model.js','gym-progress-model.js','muscle-progress.js'])vm.runInContext(fs.readFileSync(`progress/${file}`,'utf8'),context);

const taxonomy=window.MUSCLE_TAXONOMY;
const expectedIds=['chest','lats','upper-back','traps','front-delts','side-delts','rear-delts','biceps','brachialis','triceps','forearms','core','lower-back','glutes','quads','hamstrings','adductors','abductors','calves','tibialis'];
assert.deepEqual(Array.from(taxonomy.definitions(),item=>item.id),expectedIds);
assert.equal(taxonomy.canonicalId('Pecho'),'chest');
assert.equal(taxonomy.canonicalId('Deltoides lateral'),'side-delts');
assert.equal(taxonomy.canonicalId('Sóleo'),'calves');

const library=[
  {id:'press-banca',name:'Press de banca',group:'Pecho',primaryMuscles:['Pecho'],secondaryMuscles:['Tríceps','Hombro anterior']},
  {id:'dominadas',name:'Dominadas',group:'Espalda',unit:'peso corporal',primaryMuscles:['Espalda'],secondaryMuscles:['Bíceps']},
  {id:'laterales-polea',name:'Laterales',group:'Hombro',primaryMuscles:['side-delts'],secondaryMuscles:['traps']}
];
const exercise=(id,name,muscle,sets,bodyweight=false)=>({id:`${id}-${muscle}`,exerciseId:id,name,muscle,bodyweight,sets});
const sessions=[
  {id:'current',date:'2026-07-10',exercises:[exercise('press-banca','Press de banca','Pecho',[{reps:8,weight:60},{reps:8,weight:60},{reps:7,weight:60}]),exercise('dominadas','Dominadas','Espalda',[{reps:8,weight:0,isBodyweight:true},{reps:7,weight:0,isBodyweight:true}],true),exercise('laterales-polea','Laterales','Hombro',[{reps:12,weight:7.5},{reps:11,weight:7.5}])]},
  {id:'previous',date:'2026-07-03',exercises:[exercise('press-banca','Press de banca','Pecho',[{reps:8,weight:55},{reps:8,weight:55}])]}
];
const model=window.MUSCLE_PROGRESS.build({sessions,library,days:7,today:'2026-07-12'});
const chest=model.byId.chest,lats=model.byId.lats,sideDelts=model.byId['side-delts'],triceps=model.byId.triceps;
assert.equal(model.muscles.length,20);
assert.equal(model.primarySets,9,'Cada serie debe contarse una sola vez en el total primario');
assert.equal(chest.current.sets,3);assert.equal(chest.previous.sets,2);assert.equal(chest.setsChange,50);assert.equal(chest.current.volume,1380);
assert.equal(lats.current.sets,2);assert.equal(lats.current.volume,0);assert.equal(lats.current.reps,15);
assert.equal(sideDelts.current.sets,2);assert.equal(sideDelts.current.volume,172.5);
assert.equal(triceps.current.sets,0,'Los secundarios no deben sumarse al total principal');
assert.equal(triceps.secondaryCurrent.sets,3,'Los secundarios deben quedar disponibles por separado');
assert.equal(window.GYM_PROGRESS_MODEL.flatten(sessions,library).find(row=>row.exerciseId==='dominadas').muscleId,'lats','El ID conocido debe corregir la etiqueta legacy amplia');
assert.equal(window.MUSCLE_PROGRESS.stateFor({sets:0,sessions:0,exercises:[]}), 'no-data');
assert.equal(window.MUSCLE_PROGRESS.stateFor({sets:2,sessions:1,exercises:[]}), 'insufficient');
const all=window.MUSCLE_PROGRESS.build({sessions,library,days:'all',today:'2026-07-12'});assert.equal(all.period.currentStart,'2026-07-03');
const empty=window.MUSCLE_PROGRESS.build({sessions:[],library,days:30,today:'2026-07-12'});assert.equal(empty.hasData,false);assert.equal(empty.byId.chest.state,'no-data');
console.log('Taxonomia muscular correcta: 20 IDs estables, migracion legacy, primarios unicos y secundarios separados.');
