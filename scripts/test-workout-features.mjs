import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../workout-features.js', import.meta.url), 'utf8');
const taxonomySource = await readFile(new URL('../progress/muscle-taxonomy.js', import.meta.url), 'utf8');
const setModelSource = await readFile(new URL('../gym/set-model.js', import.meta.url), 'utf8');
const metricsSource = await readFile(new URL('../workout-metrics.js', import.meta.url), 'utf8');
const anomalySource = await readFile(new URL('../gym/anomaly-detector.js', import.meta.url), 'utf8');
const rankingSource = await readFile(new URL('../workout-ranking.js', import.meta.url), 'utf8');
const storeSource = await readFile(new URL('../workout-store.js', import.meta.url), 'utf8');
const planSource = await readFile(new URL('../workout-plan.js', import.meta.url), 'utf8');
const uiSource = await readFile(new URL('../workout-ui.js', import.meta.url), 'utf8');
assert.match(source,/planExerciseEditorCard/);
assert.match(source,/Edición avanzada en texto/);
assert.match(source,/data-plan-field="targetSets"/);
assert.match(source,/data-plan-field="repsMin"/);
assert.match(source,/data-plan-field="targetRirMin"/);
assert.match(source,/data-plan-field="targetRirMax"/);
assert.match(source,/data-plan-field="progressionMode"/);
assert.match(source,/data-plan-field="incrementKg"/);
assert.match(source,/data-plan-field="restSeconds"/);
assert.match(source,/undoPlanExerciseDelete/);
assert.match(source,/addPlanLibraryExercise/);
assert.match(source,/EXERCISE_LIBRARY_VERSION/);
assert.match(source,/migrateExerciseLibrary/);
assert.match(source,/exerciseLibraryEditor/);
assert.match(source,/data-quick-adjust="weight:5"/);
assert.match(source,/quickStickyActions/);
assert.match(source,/restTimerEnabled/);
assert.match(source,/hapticEnabled/);
assert.match(source,/undoDeleteQuickSetPayload/);

function createContext(preloaded = {}, today = '2026-06-22') {
  const store = new Map(Object.entries(preloaded));
  const context = {
    console,
    window: null,
    document: {
      getElementById() { return null; },
      head: { appendChild() {} },
      createElement() { return {id: '', textContent: ''}; }
    },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    getLocalData(key, fallback) {
      try {
        const raw = store.has(key) ? store.get(key) : null;
        return raw === null ? fallback : JSON.parse(raw) ?? fallback;
      } catch {
        return fallback;
      }
    },
    setLocalData(key, value) { store.set(key, JSON.stringify(value)); },
    uid(prefix) { return `${prefix}_test`; },
    todayStr() { return today; },
    escapeHtml(value) { return String(value ?? ''); },
    flash() {},
    setModule() {},
    renderGym() {},
    GYM_SESSIONS_KEY: 'protocolo_0_100_gym_sessions_v1'
  };
  context.window = context;
  const vmContext=vm.createContext(context);
  vm.runInContext(taxonomySource, vmContext, {filename: 'progress/muscle-taxonomy.js'});
  vm.runInContext(setModelSource, vmContext, {filename: 'gym/set-model.js'});
  vm.runInContext(storeSource, vmContext, {filename: 'workout-store.js'});
  vm.runInContext(planSource, vmContext, {filename: 'workout-plan.js'});
  vm.runInContext(metricsSource, vmContext, {filename: 'workout-metrics.js'});
  vm.runInContext(anomalySource, vmContext, {filename: 'gym/anomaly-detector.js'});
  vm.runInContext(uiSource, vmContext, {filename: 'workout-ui.js'});
  vm.runInContext(rankingSource, vmContext, {filename: 'workout-ranking.js'});
  vm.runInContext(source, vmContext, {filename: 'workout-features.js'});
  return {context, store};
}

const {context, store} = createContext();
const workout = context.WORKOUT_FEATURES;
assert.equal(workout.planForDate('2026-06-22').name, 'Torso A');
assert.equal(workout.planForDate('2026-06-23').name, 'Pierna A');
assert.equal(workout.planForDate('2026-06-24').name, 'Torso B');
assert.equal(workout.planForDate('2026-06-25').name, 'Pierna B');
assert.equal(workout.planForDate('2026-06-26').name, 'Torso C');
assert.equal(workout.planForDate('2026-06-27').message, 'Hoy toca descanso o actividad suave.');
assert.equal(workout.planForDate('2026-06-28').message, 'Hoy toca descanso o revisión semanal.');
assert.ok(workout.planForDate('2026-06-22').exercises.some(exercise => exercise.name === 'Press de banca'));
assert.ok(workout.planForDate('2026-06-22').exercises.some(exercise => exercise.name === 'Dominadas' && exercise.bodyweight));
assert.ok(workout.planForDate('2026-06-23').exercises.some(exercise => exercise.name === 'Máquina de aductores, cerrar piernas'));
assert.ok(workout.planForDate('2026-06-23').exercises.some(exercise => exercise.name === 'Elevación de punta del pie / tibial anterior'));

const widgetState = workout.buildWorkoutWidgetState('2026-06-22');
assert.equal(widgetState.title, 'Lunes — Torso A');
assert.equal(widgetState.schemaVersion, 3);
assert.equal(widgetState.currentExerciseName, 'Apertura sentado / Peck deck');
assert.equal(widgetState.quickLog.reps, 8);
assert.equal(widgetState.quickLog.unit, 'kg');
assert.equal(widgetState.quickLog.weightStep, 0.5);
assert.equal(widgetState.quickLog.weightFastStep, 5);
assert.equal(widgetState.currentExerciseSets, 0);
assert.equal(widgetState.currentMuscleSets, 0);
assert.equal(widgetState.currentMuscleName, 'Pecho');
assert.ok(widgetState.weeklyWorkoutPlan.monday);
assert.ok(widgetState.exerciseHistory);
assert.ok(widgetState.exercises.length >= 9);
assert.equal(store.has(workout.keys.weeklyWorkoutPlan), true);

const {context: quickContext, store: quickStore} = createContext();
const quickWorkout = quickContext.WORKOUT_FEATURES;
const quickState = quickWorkout.getQuickWorkoutState({date: '2026-06-22'});
assert.equal(quickState.title, widgetState.title);
assert.equal(quickState.currentExerciseName, 'Apertura sentado / Peck deck');
const quickSaved = quickWorkout.saveQuickSetPayload({
  date: '2026-06-22',
  exerciseId: quickState.currentExerciseId,
  reps: 10,
  weight: 20.5,
  bodyweight: false
});
assert.equal(quickSaved.ok, true);
assert.equal(quickSaved.set.weight, 20.5);
assert.equal(quickSaved.set.setType, 'working');
assert.equal(quickSaved.set.completed, true);
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.exercisePreferences)).exercises['peck-deck'].totalUses, 1);
const quickAfterSave = quickWorkout.getQuickWorkoutState({date: '2026-06-22', exerciseId: quickState.currentExerciseId});
assert.equal(quickAfterSave.currentExerciseSets, 1);
assert.equal(quickAfterSave.currentSets.length, 1);
const quickUpdated = quickWorkout.updateQuickSetPayload({
  date: '2026-06-22',
  exerciseId: quickState.currentExerciseId,
  setId: quickSaved.set.id,
  reps: 9,
  weight: 22.5,
  setType: 'backoff',
  bodyweight: false
});
assert.equal(quickUpdated.ok, true);
assert.equal(quickUpdated.set.reps, 9);
assert.equal(quickUpdated.set.weight, 22.5);
assert.equal(quickUpdated.set.setType, 'backoff');
assert.equal(quickWorkout.getQuickWorkoutState({date: '2026-06-22', exerciseId: quickState.currentExerciseId}).currentSets[0].weight, 22.5);
const quickDeleted = quickWorkout.deleteQuickSetPayload({
  date: '2026-06-22',
  exerciseId: quickState.currentExerciseId,
  setId: quickSaved.set.id
});
assert.equal(quickDeleted.ok, true);
assert.equal(quickDeleted.state.currentExerciseSets, 0);
assert.equal(quickWorkout.canUndoQuickSetDelete(),true);
const quickRestored=quickWorkout.undoDeleteQuickSetPayload();
assert.equal(quickRestored.ok,true);
assert.equal(quickRestored.state.currentExerciseSets,1);
assert.equal(quickRestored.state.currentSets[0].weight,22.5);
assert.equal(quickWorkout.canUndoQuickSetDelete(),false);
assert.equal(quickWorkout.updateGymSettings({restTimerEnabled:true,restSeconds:75,hapticEnabled:false}).restSeconds,75);
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].routine.name, 'Torso A');
const manualExercise = quickWorkout.addManualExercisePayload({
  date: '2026-06-22',
  name: 'Face pull',
  muscle: 'Hombro',
  bodyweight: false,
  persistScope: 'weekday',
  rememberForWeekday: true,
  saveToLibrary: true,
  targetDayKey: 'monday'
});
assert.equal(manualExercise.ok, true);
assert.equal(manualExercise.exercise.name, 'Face pull');
assert.equal(manualExercise.state.currentExerciseName, 'Face pull');
assert.equal(manualExercise.state.currentExerciseMuscle, 'Hombro');
assert.equal(manualExercise.remembered, true);
assert.equal(manualExercise.savedToLibrary, true);
assert.deepEqual(Array.from(manualExercise.exercise.primaryMuscles),['other']);
assert.equal(manualExercise.exercise.muscleClassificationConfidence,'needs-review');
assert.ok(quickWorkout.getPendingMuscleClassifications().some(exercise=>exercise.id===manualExercise.exercise.exerciseId));
assert.match(manualExercise.message, /proximos lunes/);
const rememberedMonday = quickWorkout.planForDate('2026-06-29').exercises.filter(exercise => exercise.exerciseId === manualExercise.exercise.exerciseId);
assert.equal(rememberedMonday.length, 1);
assert.equal(rememberedMonday[0].name, 'Face pull');
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.exerciseLibrary)).some(exercise => exercise.id === manualExercise.exercise.exerciseId && exercise.origin === 'custom'), true);
const duplicateManual = quickWorkout.addManualExercisePayload({
  date: '2026-06-22',
  name: 'face   pull',
  muscle: 'Hombro',
  persistScope: 'weekday',
  rememberForWeekday: true,
  targetDayKey: 'monday'
});
assert.equal(duplicateManual.reused, true);
assert.equal(quickWorkout.planForDate('2026-06-29').exercises.filter(exercise => exercise.exerciseId === manualExercise.exercise.exerciseId).length, 1);
const manualSaved = quickWorkout.saveQuickSetPayload({
  date: '2026-06-22',
  exerciseId: manualExercise.exercise.id,
  reps: 15,
  weight: 12.5
});
assert.equal(manualSaved.ok, true);
assert.equal(manualSaved.set.weight, 12.5);
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].exercises.some(exercise => exercise.manual && exercise.name === 'Face pull'), true);
const historicalManualBefore=JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].exercises.find(exercise=>exercise.name==='Face pull');
const reviewedClassification=quickWorkout.confirmExerciseClassificationPayload({exerciseId:manualExercise.exercise.exerciseId,primaryMuscles:['side-delts','rear-delts'],secondaryMuscles:['traps']});
assert.equal(reviewedClassification.ok,true);
assert.deepEqual(Array.from(reviewedClassification.exercise.primaryMuscles),['side-delts','rear-delts']);
assert.deepEqual(Array.from(reviewedClassification.exercise.secondaryMuscles),['traps']);
assert.equal(reviewedClassification.exercise.muscleClassificationConfidence,'confirmed');
assert.equal(quickWorkout.getPendingMuscleClassifications().some(exercise=>exercise.id===manualExercise.exercise.exerciseId),false);
assert.deepEqual(Array.from(quickWorkout.planForDate('2026-06-29').exercises.find(exercise=>exercise.exerciseId===manualExercise.exercise.exerciseId).primaryMuscles),['side-delts','rear-delts'],'La rutina futura debe usar la clasificacion confirmada');
const historicalManualAfter=JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].exercises.find(exercise=>exercise.name==='Face pull');
assert.deepEqual(historicalManualAfter,historicalManualBefore,'Confirmar la biblioteca no debe reescribir sesiones históricas');
assert.equal(quickWorkout.confirmExerciseClassificationPayload({exerciseId:'press-banca',primaryMuscles:['chest']}).reason,'official-exercise');

const {context:typeContext,store:typeStore}=createContext();
const typeWorkout=typeContext.WORKOUT_FEATURES,typeState=typeWorkout.getQuickWorkoutState({date:'2026-06-22'});
typeWorkout.saveQuickSetPayload({date:'2026-06-22',exerciseId:typeState.currentExerciseId,reps:10,weight:20,setType:'warmup'});
typeWorkout.saveQuickSetPayload({date:'2026-06-22',exerciseId:typeState.currentExerciseId,reps:8,weight:60,setType:'working'});
const typedSession=JSON.parse(typeStore.get(typeWorkout.keys.workoutSessions))[0];
assert.equal(typedSession.summary.totalSets,2);
assert.equal(typedSession.summary.workingSets,1);
assert.equal(typedSession.summary.warmupSets,1);
assert.equal(typedSession.summary.totalVolume,480);
assert.equal(JSON.parse(typeStore.get(typeWorkout.keys.exerciseHistory))['peck-deck'].lastWeight,60);

const legacySetSession={id:'legacy-set-session',date:'2026-06-22',status:'en progreso',currentExerciseIndex:0,startedAt:'2026-06-22T10:00:00.000Z',routine:{name:'Legacy'},exercises:[{id:'legacy-press',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:[{id:'legacy-set',setNumber:1,reps:8,weight:50}]}]};
const {context:legacySetContext,store:legacySetStore}=createContext({protocolo_0_100_workout_sessions_v1:JSON.stringify([legacySetSession])});
assert.equal(legacySetContext.WORKOUT_FEATURES.getQuickWorkoutState({date:'2026-06-22',exerciseId:'legacy-press'}).currentSets[0].setType,'working');
assert.equal(Object.hasOwn(JSON.parse(legacySetStore.get('protocolo_0_100_workout_sessions_v1'))[0].exercises[0].sets[0],'setType'),false,'La lectura no debe reescribir series legacy');

const {context: poundsContext,store:poundsStore}=createContext({
  protocolo_0_100_gym_settings_v1:JSON.stringify({unit:'lb'})
});
const poundsWorkout=poundsContext.WORKOUT_FEATURES;
const poundsExercise=poundsWorkout.planForDate('2026-06-22').exercises[1];
const poundsSaved=poundsWorkout.saveQuickSetPayload({date:'2026-06-22',exerciseId:poundsExercise.id,reps:8,weight:132.5});
assert.equal(poundsSaved.ok,true);
assert.ok(Math.abs(poundsSaved.set.weight-60.1)<0.02,'Las libras deben persistirse como kg canónicos');
assert.equal(poundsWorkout.getQuickWorkoutState({date:'2026-06-22',exerciseId:poundsExercise.id}).currentSets[0].weight,132.5);
poundsWorkout.updateGymSettings({unit:'kg'});
assert.equal(poundsWorkout.getQuickWorkoutState({date:'2026-06-22',exerciseId:poundsExercise.id}).currentSets[0].weight,60);
assert.ok(Math.abs(JSON.parse(poundsStore.get(poundsWorkout.keys.workoutSessions))[0].exercises[1].sets[0].weight-60.1)<0.02);

const nativeExercise = {...workout.planForDate('2026-06-22').exercises[1], sets: [{
  id: 'set_android_test',
  setNumber: 1,
  reps: 8,
  weight: 60,
  bodyweight: false,
  savedAt: '2026-06-22T12:00:00.000Z',
  volume: 480
}]};
const nativeSession = {
  id: 'workout_android_test',
  date: '2026-06-22',
  dayKey: 'monday',
  weekday: 'Lunes',
  routine: {name: 'Torso A', exercises: []},
  startedAt: '2026-06-22T11:55:00.000Z',
  status: 'en progreso',
  currentExerciseIndex: 0,
  exercises: [nativeExercise],
  summary: {totalSets: 1, totalVolume: 480}
};
assert.equal(workout.importWidgetStateFromAndroid({
  schemaVersion: 2,
  date: '2026-06-22',
  currentExerciseId: nativeExercise.id,
  lastNativeMutationAt: '2026-06-22T12:00:00.000Z',
  lastNativeMutationSource: 'android-widget-direct',
  workoutSession: nativeSession,
  exerciseHistory: {}
}), true);
assert.equal(JSON.parse(store.get(workout.keys.workoutSessions))[0].id, 'workout_android_test');
assert.equal(JSON.parse(store.get(workout.keys.exerciseHistory))['press-banca'].lastWeight, 60);

const customPlan = {monday: {dayKey: 'monday', weekday: 'Lunes', name: 'Rutina propia', type: 'workout', muscles: ['Test'], exercises: []}};
const {context: customContext} = createContext({
  protocolo_0_100_weekly_workout_plan_v1: JSON.stringify(customPlan)
});
assert.equal(customContext.WORKOUT_FEATURES.planForDate('2026-06-22').name, 'Rutina propia');

const legacyLibrary=[
  {id:'press-banca',name:'Banca editada',aliases:['mi banca'],group:'Pectoral propio',type:'peso libre',unit:'kg',notes:'nota personal'},
  {id:'custom-face-pull',name:'Face pull',aliases:['facepull'],group:'Hombro',type:'polea',unit:'kg',custom:true,origin:'custom'}
];
const historical=[{id:'old',date:'2025-01-01',exercises:[{exerciseId:'press-banca',name:'Nombre histórico',sets:[]}]}];
const {context: migrationContext,store:migrationStore}=createContext({
  protocolo_0_100_exercise_library_v1:JSON.stringify(legacyLibrary),
  protocolo_0_100_workout_sessions_v1:JSON.stringify(historical)
});
const migratedLibrary=migrationContext.WORKOUT_FEATURES.getExerciseLibrary();
assert.equal(migratedLibrary.find(exercise=>exercise.id==='press-banca').name,'Banca editada');
assert.ok(migratedLibrary.find(exercise=>exercise.id==='press-banca').aliases.includes('press banca'));
assert.deepEqual(Array.from(migratedLibrary.find(exercise=>exercise.id==='press-banca').primaryMuscles),['chest']);
assert.ok(migratedLibrary.find(exercise=>exercise.id==='press-banca').secondaryMuscles.includes('triceps'));
assert.ok(migratedLibrary.find(exercise=>exercise.id==='press-banca').legacyPrimaryMuscles.includes('Pectoral propio'));
assert.deepEqual(Array.from(migratedLibrary.find(exercise=>exercise.id==='dominadas').primaryMuscles),['lats']);
assert.equal(migratedLibrary.filter(exercise=>exercise.name==='Face pull').length,1);
assert.deepEqual(Array.from(migratedLibrary.find(exercise=>exercise.name==='Face pull').primaryMuscles),['other']);
assert.equal(migratedLibrary.find(exercise=>exercise.name==='Face pull').muscleClassificationConfidence,'needs-review');
assert.equal(migratedLibrary.some(exercise=>exercise.id==='tibial-anterior'),true);
assert.equal(JSON.parse(migrationStore.get('protocolo_0_100_workout_sessions_v1'))[0].exercises[0].name,'Nombre histórico');
assert.equal(JSON.parse(migrationStore.get('protocolo_0_100_exercise_library_meta_v1')).libraryVersion,migrationContext.WORKOUT_FEATURES.EXERCISE_LIBRARY_VERSION);

const {context: rankContext,store:rankStore}=createContext({},'2026-08-10');
for(const date of ['2026-07-13','2026-07-20','2026-07-27','2026-08-03','2026-08-10']) rankContext.WORKOUT_RANKING.recordExerciseUse({exerciseId:'press-banca',date,dayKey:'monday',routineName:'Torso A'});
rankContext.WORKOUT_RANKING.recordExerciseUse({exerciseId:'curl-martillo',date:'2026-08-04',dayKey:'tuesday',routineName:'Extra'});
const rankedMonday=rankContext.WORKOUT_FEATURES.rankExercisesForContext({date:'2026-08-10',currentPlan:{name:'Lunes libre',exercises:[]}});
assert.ok(rankedMonday.items.findIndex(item=>item.exerciseId==='press-banca')<rankedMonday.items.findIndex(item=>item.exerciseId==='curl-martillo'));
assert.equal(rankedMonday.items.find(item=>item.exerciseId==='curl-martillo').weekdayUses,0);
const rankedPlan=rankContext.WORKOUT_FEATURES.rankExercisesForContext({date:'2026-08-10',currentPlan:rankContext.WORKOUT_FEATURES.defaultWeeklyPlan.monday});
assert.equal(rankedPlan.groups[0].label,'Rutina de hoy');
assert.ok(rankedPlan.groups[0].items.some(item=>item.exerciseId==='peck-deck'));
assert.ok(rankStore.get('protocolo_0_100_exercise_preferences_v1'));

const {context: anomalyContext}=createContext({},'2026-08-10');
const anomalyWorkout=anomalyContext.WORKOUT_FEATURES,anomalyExercise=anomalyWorkout.getQuickWorkoutState({date:'2026-08-10'}).currentExerciseId;
for(const weight of [60,60,62.5,62.5])assert.equal(anomalyWorkout.saveQuickSetPayload({date:'2026-08-10',exerciseId:anomalyExercise,reps:8,weight}).ok,true);
const reviewRequired=anomalyWorkout.saveQuickSetPayload({date:'2026-08-10',exerciseId:anomalyExercise,reps:8,weight:140});
assert.equal(reviewRequired.reason,'confirmation-required');
assert.ok(reviewRequired.analysis.issues.some(issue=>issue.code==='possible-unit-error'||issue.code==='load-jump'));
const reviewed=anomalyWorkout.saveQuickSetPayload({date:'2026-08-10',exerciseId:anomalyExercise,reps:8,weight:140,anomalyDecision:'exclude-progression'});
assert.equal(reviewed.ok,true);assert.equal(reviewed.set.anomalyReview.status,'excluded');assert.equal(reviewed.set.excludeFromRecords,true);assert.equal(reviewed.set.excludeFromProgression,true);

const baselineNativeSets=[60,60,62.5,62.5].map((weight,index)=>({id:`native-base-${index}`,setNumber:index+1,reps:8,weight,weightKg:weight,measurementMode:'reps',loadMode:'total',equipmentId:'barbell-20',setType:'working',completed:true}));
const baselineNativeSession={id:'native-anomaly-session',date:'2026-08-10',status:'en progreso',currentExerciseIndex:0,routine:{name:'Torso A'},exercises:[{id:'press-current',exerciseId:'press-banca',name:'Press de banca',muscle:'Pecho',sets:baselineNativeSets}]};
const {context:nativeAnomalyContext,store:nativeAnomalyStore}=createContext({protocolo_0_100_workout_sessions_v1:JSON.stringify([baselineNativeSession])},'2026-08-10');
const importedNative={...baselineNativeSession,exercises:[{...baselineNativeSession.exercises[0],sets:[...baselineNativeSets,{id:'native-suspicious',setNumber:5,reps:8,weight:140,weightKg:140,measurementMode:'reps',loadMode:'total',equipmentId:'barbell-20',setType:'working',completed:true}]}]};
assert.equal(nativeAnomalyContext.WORKOUT_FEATURES.importWidgetStateFromAndroid({lastNativeMutationAt:'2026-08-10T12:00:00.000Z',lastNativeMutationSource:'android-widget-direct',workoutSession:importedNative}),true);
const pendingNative=JSON.parse(nativeAnomalyStore.get('protocolo_0_100_workout_sessions_v1'))[0].exercises[0].sets.at(-1);
assert.equal(pendingNative.anomalyReview.status,'pending');assert.equal(pendingNative.excludeFromRecords,true);assert.equal(pendingNative.excludeFromProgression,true);
const correctedNative=nativeAnomalyContext.WORKOUT_FEATURES.updateQuickSetPayload({date:'2026-08-10',exerciseId:'press-current',setId:'native-suspicious',reps:8,weight:65});
assert.equal(correctedNative.ok,true);assert.equal(correctedNative.set.anomalyReview,undefined);assert.equal(correctedNative.set.excludeFromRecords,false);assert.equal(correctedNative.set.excludeFromProgression,false);

console.log('Workout features correcto: plan semanal, widget, series, anomalias, ajustes rapidos y preferencias UX.');
