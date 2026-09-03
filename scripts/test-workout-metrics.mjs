import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../workout-metrics.js',import.meta.url),'utf8');
const setModelSource=await readFile(new URL('../gym/set-model.js',import.meta.url),'utf8');
const equipmentSource=await readFile(new URL('../gym/equipment.js',import.meta.url),'utf8');
const context={window:null};context.window=context;
const vmContext=vm.createContext(context);
vm.runInContext(equipmentSource,vmContext,{filename:'gym/equipment.js'});
vm.runInContext(setModelSource,vmContext,{filename:'gym/set-model.js'});
vm.runInContext(source,vmContext,{filename:'workout-metrics.js'});
const metrics=context.WORKOUT_METRICS;

const bodyweight=metrics.calculateSetsMetrics([
  {reps:10,weight:0,bodyweight:true},
  {reps:12,weight:0,bodyweight:true},
  {reps:10,weight:0,bodyweight:true}
]);
assert.equal(bodyweight.totalSets,3);
assert.equal(bodyweight.totalReps,32);
assert.equal(bodyweight.bodyweightReps,32);
assert.equal(bodyweight.externalLoadVolume,0);
assert.equal(metrics.formatProgress(bodyweight),'32 reps de peso corporal');

const weighted=metrics.calculateSetsMetrics([{reps:8,weight:5,bodyweight:true},{reps:8,weight:5,bodyweight:true}]);
assert.equal(weighted.addedLoadVolume,80);
assert.equal(weighted.addedLoadReps,16);
assert.equal(metrics.percentChange(100,0),null);
assert.equal(metrics.percentChange(120,100),20);
assert.equal(metrics.estimatedOneRepMax(60,8),76);
const historicalDirty={measurementMode:'reps',reps:8,weight:60,durationSeconds:60,distanceMeters:1000,paceSecondsPerKm:60};
const historicalSnapshot=structuredClone(historicalDirty);
const historicalMetrics=metrics.calculateSetsMetrics([historicalDirty]);
assert.equal(historicalMetrics.totalReps,8);
assert.equal(historicalMetrics.durationSeconds,0);
assert.equal(historicalMetrics.distanceMeters,0);
assert.equal(historicalMetrics.bestPaceSecondsPerKm,0);
assert.equal(metrics.formatProgress(historicalMetrics),'480 kg de volumen externo');
assert.deepEqual(historicalDirty,historicalSnapshot,'Las metricas no deben reescribir una serie historica incompatible');
const typed=metrics.calculateSetsMetrics([
  {reps:10,weight:20,setType:'warmup'},
  {reps:8,weight:60,setType:'working'},
  {reps:10,weight:50,setType:'backoff'},
  {reps:12,weight:40,setType:'drop'}
]);
assert.equal(typed.totalSets,4);
assert.equal(typed.workingSets,1);
assert.equal(typed.warmupSets,1);
assert.equal(typed.supplementarySets,2);
assert.equal(typed.totalReps,8);
assert.equal(typed.allReps,40);
assert.equal(typed.externalLoadVolume,480);
assert.equal(typed.allExternalLoadVolume,1660);
assert.equal(typed.bestWeight,60);
assert.equal(typed.bestSetVolume,500);
assert.equal(context.WORKOUT_SET_MODEL.normalize({reps:8}).setType,'working');
assert.equal(context.WORKOUT_SET_MODEL.countsForRecords({setType:'warmup'}),false);
assert.equal(context.WORKOUT_SET_MODEL.countsForRecords({setType:'backoff'}),true);
assert.equal(context.WORKOUT_SET_MODEL.countsForProgression({setType:'working',excludeFromProgression:true}),false);
const consistency=metrics.consistency({plannedSessions:5,registeredSessions:3,plannedExercises:9,completedExercises:7,scheduledRestDays:2});
assert.equal(consistency.scheduledRestDays,2);
assert.ok(consistency.score>0&&consistency.score<100);

console.log('Metricas de gym correctas: tipos de serie, volumen efectivo, records, peso corporal, 1RM y constancia.');
