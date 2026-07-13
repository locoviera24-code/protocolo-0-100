import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const files=['workout-store.js','workout-plan.js','workout-ui.js','firebase-service.js','gym-party-metrics.js','gym-party-ui.js'];
const sources=Object.fromEntries(await Promise.all(files.map(async file=>[file,await readFile(new URL(`../${file}`,import.meta.url),'utf8')])));
const storage=new Map();
const context={
  window:null,
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  },
  document:{getElementById:()=>null},
  requestAnimationFrame:callback=>callback()
};
context.window=context;
const sandbox=vm.createContext(context);
for(const file of files) vm.runInContext(sources[file],sandbox,{filename:file});

const store=context.WORKOUT_STORE;
assert.equal(store.read('missing',{value:1}).value,1);
store.write('settings',{unit:'kg'});
assert.equal(store.read('settings',{}).unit,'kg');
store.update('settings',{},value=>({...value,mode:'simple'}));
assert.equal(store.read('settings',{}).mode,'simple');
assert.equal(store.ensure('sessions',[]).length,0);

const plan=context.WORKOUT_PLAN;
assert.equal(plan.dayKeyForDate('2026-07-13'),'monday');
assert.equal(plan.sameExercise({exerciseId:'bench'},{exerciseId:'bench'}),true);
assert.equal(plan.dedupe([{id:'a',name:'Press'},{id:'a',name:'Press'}]).length,1);
const inserted=plan.insert([{id:'a',exerciseId:'a',name:'A'}],{id:'b',exerciseId:'b',name:'B'},'a');
assert.equal(inserted.inserted,true);
assert.equal(JSON.stringify(inserted.items.map(item=>item.id)),JSON.stringify(['a','b']));

const workoutUi=context.WORKOUT_UI;
assert.match(workoutUi.groupedOptions([{label:'Hoy',items:[{name:'Press',id:'press'}]}],(item,escape)=>`<option>${escape(item.name)}</option>`),/<optgroup label="Hoy"><option>Press<\/option><\/optgroup>/);
assert.match(workoutUi.statCard('Series','3'),/<strong>3<\/strong>/);

const firebase=context.FIREBASE_SERVICE;
const config={apiKey:'api',authDomain:'demo.firebaseapp.com',projectId:'demo',appId:'app'};
assert.equal(firebase.hasConfig(config),true);
assert.equal(firebase.configSource({},config),'bundled');
assert.equal(firebase.moduleUrls('12.0.0').firestore,'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

const metrics=context.GYM_PARTY_METRICS;
const aggregate=metrics.aggregateSets([
  {exerciseId:'bench',muscleGroup:'Pecho',reps:8,weightKg:60},
  {exerciseId:'pull-up',muscleGroup:'Espalda',reps:10,weightKg:0,isBodyweight:true},
  {exerciseId:'pull-up',muscleGroup:'Espalda',reps:6,weightKg:10,isBodyweight:true}
]);
assert.equal(aggregate.totalSets,3);
assert.equal(aggregate.totalReps,24);
assert.equal(aggregate.totalVolume,540);
assert.equal(aggregate.bodyweightReps,10);
assert.equal(aggregate.addedLoadVolume,60);
assert.equal(metrics.changes({sessionsCount:3,totalVolume:1200,totalSets:10},{sessionsCount:2,totalVolume:1000,totalSets:8}).volumePct,20);

const partyUi=context.GYM_PARTY_UI;
assert.equal(partyUi.syncLabel({backendMode:'firebase',pending:2,conflicts:1}),'Conflicto resuelto');
assert.equal(partyUi.syncState({backendMode:'firebase',pending:2,conflicts:1}).pending,2);
assert.match(partyUi.helpButton('volume'),/aria-label="Ayuda sobre volume"/);

const workoutSource=await readFile(new URL('../workout-features.js',import.meta.url),'utf8');
const partySource=await readFile(new URL('../gym-party.js',import.meta.url),'utf8');
for(const contract of ['WORKOUT_STORE','WORKOUT_PLAN','WORKOUT_UI']) assert.match(workoutSource,new RegExp(contract));
for(const contract of ['FIREBASE_SERVICE','GYM_PARTY_METRICS','GYM_PARTY_UI']) assert.match(partySource,new RegExp(contract));

console.log('Limites modulares correctos: almacenamiento, plan, UI, Firebase y metricas compartidas.');
