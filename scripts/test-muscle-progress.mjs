import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={};
const context=vm.createContext({window,console,Date,Math,Number,String,Object,Array,Set,Map,JSON});
for(const file of ['progress-data-model.js','gym-progress-model.js','muscle-progress.js'])vm.runInContext(fs.readFileSync(`progress/${file}`,'utf8'),context);

const library=[
  {id:'press-banca',name:'Press de banca',group:'Pecho',primaryMuscles:['Pecho'],secondaryMuscles:['Tríceps']},
  {id:'dominadas',name:'Dominadas',group:'Espalda',unit:'peso corporal',primaryMuscles:['Espalda'],secondaryMuscles:['Bíceps']}
];
const exercise=(id,name,muscle,sets,bodyweight=false)=>({id:`${id}-${muscle}`,exerciseId:id,name,muscle,bodyweight,sets});
const sessions=[
  {id:'current',date:'2026-07-10',exercises:[exercise('press-banca','Press de banca','Pecho',[{reps:8,weight:60},{reps:8,weight:60},{reps:7,weight:60}]),exercise('dominadas','Dominadas','Espalda',[{reps:8,weight:0,isBodyweight:true},{reps:7,weight:0,isBodyweight:true}],true)]},
  {id:'previous',date:'2026-07-03',exercises:[exercise('press-banca','Press de banca','Pecho',[{reps:8,weight:55},{reps:8,weight:55}])]}
];
const model=window.MUSCLE_PROGRESS.build({sessions,library,days:7,today:'2026-07-12'});
const chest=model.muscles.find(item=>item.name==='Pecho'),back=model.muscles.find(item=>item.name==='Espalda');
assert.equal(chest.current.sets,3);assert.equal(chest.previous.sets,2);assert.equal(chest.setsChange,50);assert.equal(chest.thisWeek.sets,3);assert.equal(chest.current.volume,1380);
assert.equal(back.current.sets,2);assert.equal(back.current.volume,0);assert.equal(back.current.reps,15);
assert.equal(model.muscles.some(item=>item.name==='Tríceps'),false,'Los secundarios no deben sumarse como grupo principal');
assert.equal(window.MUSCLE_PROGRESS.stateFor({sets:0,sessions:0,exercises:[]}), 'no-data');
assert.equal(window.MUSCLE_PROGRESS.stateFor({sets:2,sessions:1,exercises:[]}), 'insufficient');
const all=window.MUSCLE_PROGRESS.build({sessions,library,days:'all',today:'2026-07-12'});assert.equal(all.period.currentStart,'2026-07-03');
console.log('Progreso muscular correcto: periodo real, grupo primario unico, peso corporal, cambios y estados de datos.');
