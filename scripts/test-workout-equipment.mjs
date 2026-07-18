import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const context={window:null};context.window=context;
const sandbox=vm.createContext(context);
for(const file of ['gym/equipment.js','gym/set-model.js','workout-metrics.js']){
  vm.runInContext(await readFile(new URL(`../${file}`,import.meta.url),'utf8'),sandbox,{filename:file});
}

const equipment=context.WORKOUT_EQUIPMENT;
const metrics=context.WORKOUT_METRICS;
assert.equal(equipment.VERSION,1);
assert.equal(equipment.normalizeSet({reps:8,weight:60}).loadMode,'total');
assert.equal(equipment.normalizeSet({reps:8,weight:60}).measurementMode,'reps');

const perHand=equipment.normalizeSet({reps:8,weight:20,loadMode:'perHand',laterality:'bilateral',equipmentId:'dumbbells'});
assert.equal(perHand.weightKg,20);
assert.equal(perHand.normalizedTotalKg,40);
assert.equal(perHand.recordLoadKg,20);
assert.equal(metrics.calculateSetMetrics(perHand).externalLoadVolume,320);

const unilateral=equipment.normalizeSet({reps:10,weight:12,loadMode:'perHand',laterality:'left',equipmentId:'dumbbells'});
assert.equal(unilateral.normalizedTotalKg,12);
assert.notEqual(equipment.comparisonKey(perHand,'curl'),equipment.comparisonKey(unilateral,'curl'));

const perSide=equipment.normalizeSet({reps:8,weight:20,loadMode:'perSide',barWeightKg:20,equipmentId:'barbell-20'});
assert.equal(perSide.normalizedTotalKg,60);
assert.equal(perSide.recordLoadKg,60);
assert.equal(metrics.calculateSetMetrics(perSide).externalLoadVolume,480);

const bodyweight=metrics.calculateSetMetrics({reps:12,weight:0,bodyweight:true});
assert.equal(bodyweight.loadMode,'bodyweight');
assert.equal(bodyweight.bodyweightReps,12);
assert.equal(bodyweight.estimated1RM,null);

const added=metrics.calculateSetMetrics({reps:8,weight:10,bodyweight:true});
assert.equal(added.loadMode,'addedLoad');
assert.equal(added.addedLoadVolume,80);

const assisted=metrics.calculateSetsMetrics([{reps:8,loadMode:'assistance',measurementMode:'assistance',assistanceKg:30},{reps:8,loadMode:'assistance',measurementMode:'assistance',assistanceKg:25}]);
assert.equal(assisted.externalLoadVolume,0);
assert.equal(assisted.lowestAssistanceKg,25);
assert.equal(assisted.estimated1RM,null);

const timed=metrics.calculateSetsMetrics([{measurementMode:'time',durationSeconds:90},{measurementMode:'time',durationSeconds:60}]);
assert.equal(timed.durationSeconds,150);
assert.equal(timed.totalReps,0);
assert.equal(timed.estimated1RM,null);

const distance=metrics.calculateSetsMetrics([{measurementMode:'distance',distanceMeters:5000,durationSeconds:1500}]);
assert.equal(distance.distanceMeters,5000);
assert.equal(distance.bestPaceSecondsPerKm,300);
assert.equal(distance.externalLoadVolume,0);

const barbellKey=equipment.comparisonKey(perSide,'press');
const smithKey=equipment.comparisonKey({...perSide,equipmentId:'smith'},'press');
assert.notEqual(barbellKey,smithKey);
console.log('Equipo y modalidades correctos: total, mano, lado, lastre, asistencia, tiempo y distancia.');
