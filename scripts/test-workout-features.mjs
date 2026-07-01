import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../workout-features.js', import.meta.url), 'utf8');

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
  vm.runInContext(source, vm.createContext(context), {filename: 'workout-features.js'});
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
assert.equal(widgetState.schemaVersion, 2);
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
const quickAfterSave = quickWorkout.getQuickWorkoutState({date: '2026-06-22', exerciseId: quickState.currentExerciseId});
assert.equal(quickAfterSave.currentExerciseSets, 1);
assert.equal(quickAfterSave.currentSets.length, 1);
const quickUpdated = quickWorkout.updateQuickSetPayload({
  date: '2026-06-22',
  exerciseId: quickState.currentExerciseId,
  setId: quickSaved.set.id,
  reps: 9,
  weight: 22.5,
  bodyweight: false
});
assert.equal(quickUpdated.ok, true);
assert.equal(quickUpdated.set.reps, 9);
assert.equal(quickUpdated.set.weight, 22.5);
assert.equal(quickWorkout.getQuickWorkoutState({date: '2026-06-22', exerciseId: quickState.currentExerciseId}).currentSets[0].weight, 22.5);
const quickDeleted = quickWorkout.deleteQuickSetPayload({
  date: '2026-06-22',
  exerciseId: quickState.currentExerciseId,
  setId: quickSaved.set.id
});
assert.equal(quickDeleted.ok, true);
assert.equal(quickDeleted.state.currentExerciseSets, 0);
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].routine.name, 'Torso A');
const manualExercise = quickWorkout.addManualExercisePayload({
  date: '2026-06-22',
  name: 'Face pull',
  muscle: 'Hombro',
  bodyweight: false
});
assert.equal(manualExercise.ok, true);
assert.equal(manualExercise.exercise.name, 'Face pull');
assert.equal(manualExercise.state.currentExerciseName, 'Face pull');
assert.equal(manualExercise.state.currentExerciseMuscle, 'Hombro');
const manualSaved = quickWorkout.saveQuickSetPayload({
  date: '2026-06-22',
  exerciseId: manualExercise.exercise.id,
  reps: 15,
  weight: 12.5
});
assert.equal(manualSaved.ok, true);
assert.equal(manualSaved.set.weight, 12.5);
assert.equal(JSON.parse(quickStore.get(quickWorkout.keys.workoutSessions))[0].exercises.some(exercise => exercise.manual && exercise.name === 'Face pull'), true);

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

console.log('Workout features correcto: plan semanal, descanso, widget state, editar/eliminar serie, ejercicio manual, importacion directa y no sobrescritura.');
