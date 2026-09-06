import {test,expect} from '@playwright/test';
import {waitForAppReady} from './helpers/app-ready.mjs';

async function openGym(page){
  await page.clock.setFixedTime(new Date('2026-09-07T15:00:00Z'));
  await page.goto('/index.html?module=home&view=register');
  await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page).toHaveURL(/module=gym&view=train/);
}
async function snapshot(page){
  return page.evaluate(()=>{
    const w=window.WORKOUT_FEATURES;
    return Object.fromEntries(['workoutSessions','weeklyWorkoutPlan','exerciseLibrary','exerciseHistory','exercisePreferences'].map(key=>[key,localStorage.getItem(w.keys[key])]));
  });
}
async function chooseOwn(page){
  await page.locator('#startOwnWorkoutBtn').click();
  await expect(page.locator('#ownWorkoutEmpty')).toBeVisible();
  await expect(page.locator('#saveQuickSetBtn')).toBeHidden();
  await expect(page.locator('#saveQuickSetBtn')).toBeDisabled();
  await expect(page.locator('#quickReps')).toBeHidden();
}

test('eleccion propia es transitoria y salir no crea sesion ni otros datos Workout',async({page})=>{
  await openGym(page);
  await expect(page.locator('#startTodayWorkoutBtn')).toHaveText('Empezar Torso A');
  const before=await snapshot(page);
  const drafts=await page.evaluate(()=>localStorage.getItem(window.APP_DRAFTS.STORAGE_KEY));
  const widget=await page.evaluate(()=>localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutWidgetState));
  await chooseOwn(page);
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(()=>localStorage.getItem(window.APP_DRAFTS.STORAGE_KEY))).toEqual(drafts);
  expect(await page.evaluate(()=>localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutWidgetState))).toEqual(widget);
  await page.locator('#cancelOwnWorkoutBtn').click();
  expect(await snapshot(page)).toEqual(before);
  await chooseOwn(page);
  await page.evaluate(()=>window.APP_ROUTER.navigate({module:'home',view:'register'}));
  expect(await snapshot(page)).toEqual(before);
  await page.locator('#gymHomePrimaryAction').click();
  await expect(page.locator('#ownWorkoutEmpty')).toBeHidden();
  expect(await snapshot(page)).toEqual(before);
});

test('primer ejercicio propio crea una sola sesion y conserva set draft snapshot y reload',async({page})=>{
  await openGym(page);const before=await snapshot(page);
  await chooseOwn(page);
  await page.locator('#addOwnExerciseBtn').click();
  await expect(page.locator('#quickExerciseSelect')).toHaveValue('');
  await expect(page.locator('#quickExerciseSelect optgroup[label="Rutina de hoy"]')).toHaveCount(0);
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});
  await expect(page.locator('#quickWorkoutContext')).toContainText('Entrenamiento libre');
  await expect(page.locator('#startOwnWorkoutBtn')).toBeHidden();
  await expect(page.locator('#startTodayWorkoutBtn')).toBeHidden();
  const initial=JSON.parse((await snapshot(page)).workoutSessions);
  expect(initial).toHaveLength(1);expect(initial[0].exercises).toHaveLength(1);
  expect(initial[0].routine.name).toBe('Entrenamiento libre');
  expect(initial[0].exercises[0].name).toBe('Press de banca');
  expect((await snapshot(page)).weeklyWorkoutPlan).toEqual(before.weeklyWorkoutPlan);
  expect((await snapshot(page)).exerciseLibrary).toEqual(before.exerciseLibrary);
  await page.locator('#quickReps').fill('8');await page.locator('#quickWeight').fill('80');
  await page.locator('#saveQuickSetBtn').click();
  await expect(page.locator('#quickLoggedSets')).toContainText('8 reps');
  const saved=JSON.parse((await snapshot(page)).workoutSessions)[0];
  expect(saved.exercises[0].sets[0]).toMatchObject({reps:8,measurementMode:'reps',durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
  await page.locator('#quickWeight').fill('82');
  await page.evaluate(async()=>{window.APP_DRAFTS.flushAll();await window.APP_DATA.flush();});
  await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await expect(page.locator('#quickWeight')).toHaveValue('82');
  const resumed=JSON.parse((await snapshot(page)).workoutSessions);
  expect(resumed).toHaveLength(1);expect(resumed[0]).toEqual(saved);
  await page.evaluate(async()=>{
    const w=window.WORKOUT_FEATURES,plan=w.getWeeklyWorkoutPlan();plan.monday.name='Push';plan.monday.exercises=[];plan.monday.muscles=[];
    window.APP_REPOSITORIES.workout.set(w.keys.weeklyWorkoutPlan,plan);await window.APP_DATA.flush();
  });
  await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await expect(page.locator('#todayWorkoutTitle')).toContainText('Entrenamiento libre');
  await expect(page.locator('#quickExerciseSelect')).toHaveValue(saved.exercises[0].id);
  expect(JSON.parse((await snapshot(page)).workoutSessions)[0]).toEqual(saved);
  const widget=await page.evaluate(()=>window.WORKOUT_FEATURES.buildWorkoutWidgetState());
  expect(widget.routineName).toBe('Entrenamiento libre');expect(widget.exercises).toHaveLength(1);
  await page.locator('#openQuickLoggerBtn').click();
  expect(JSON.parse((await snapshot(page)).workoutSessions)).toHaveLength(1);
});

test('plan iniciado conserva snapshot y biblioteca personalizada funciona sin guardado semanal',async({page})=>{
  await openGym(page);
  await page.locator('#startTodayWorkoutBtn').click();
  const original=JSON.parse((await snapshot(page)).workoutSessions)[0];
  expect(original.exercises).toHaveLength(9);expect(original.routine.name).toBe('Torso A');
  await page.evaluate(async()=>{
    const w=window.WORKOUT_FEATURES,plan=w.getWeeklyWorkoutPlan();plan.monday.name='Push';plan.monday.exercises=[];
    window.APP_REPOSITORIES.workout.set(w.keys.weeklyWorkoutPlan,plan);await window.APP_DATA.flush();
  });
  await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  await expect(page.locator('#todayWorkoutTitle')).toContainText('Torso A');
  expect(JSON.parse((await snapshot(page)).workoutSessions)[0]).toEqual(original);
  expect(await page.evaluate(()=>window.WORKOUT_FEATURES.buildWorkoutWidgetState().routineName)).toBe('Torso A');
  // A synthetic pre-existing custom library entry, not a new creation UI.
  await page.evaluate(async()=>{
    const w=window.WORKOUT_FEATURES,library=w.getExerciseLibrary();library.push({id:'custom-existing',name:'Ejercicio existente',aliases:[],group:'General',type:'personalizado',unit:'kg',custom:true});
    window.APP_REPOSITORIES.workout.set(w.keys.exerciseLibrary,library);
    window.APP_REPOSITORIES.workout.set(w.keys.workoutSessions,[]);
    window.APP_REPOSITORIES.workout.set(w.keys.weeklyWorkoutPlan,w.defaultWeeklyPlan);await window.APP_DATA.flush();
  });
  await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
  const before=await snapshot(page);await chooseOwn(page);await page.locator('#addOwnExerciseBtn').click();
  await page.locator('#quickExerciseSelect').selectOption({label:'Ejercicio existente'});
  await expect(page.locator('#quickWorkoutContext')).toContainText('Ejercicio existente');
  expect((await snapshot(page)).exerciseLibrary).toEqual(before.exerciseLibrary);
  expect((await snapshot(page)).weeklyWorkoutPlan).toEqual(before.weeklyWorkoutPlan);
});

test('sesion vacia valida no usa el plan y corrupcion bloquea lectura y finalizacion sin reparar',async({page})=>{
  await openGym(page);await page.locator('#startTodayWorkoutBtn').click();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const value of [[],null,{},'missing']){
    await page.evaluate(async value=>{
      const w=window.WORKOUT_FEATURES,sessions=window.WORKOUT_STORE.read(w.keys.workoutSessions,[]);
      if(value==='missing')delete sessions[0].exercises;else sessions[0].exercises=value;
      sessions[0].routine.muscles=[];
      window.APP_REPOSITORIES.workout.set(w.keys.workoutSessions,sessions);await window.APP_DATA.flush();
    },value);
    const before=(await snapshot(page)).workoutSessions;
    await page.reload();await waitForAppReady(page,{features:['WORKOUT_FEATURES']});
    await expect(page.locator('#ownWorkoutEmpty')).toBeVisible();
    await expect(page.locator('#saveQuickSetBtn')).toBeHidden();
    await expect(page.locator('#nextQuickExerciseBtn')).toBeDisabled();
    const state=await page.evaluate(()=>window.WORKOUT_FEATURES.getQuickWorkoutState());
    expect(state.exercises).toEqual([]);
    if(!Array.isArray(value)){
      await expect(page.locator('#ownWorkoutEmptyMessage')).toContainText('No se puede leer');
      expect(await page.evaluate(()=>window.WORKOUT_FEATURES.finishWorkoutPayload().reason)).toBe('invalid-session');
      expect(await page.evaluate(()=>window.WORKOUT_FEATURES.buildWorkoutWidgetState().workoutSession)).toBeNull();
    }
    expect((await snapshot(page)).workoutSessions).toEqual(before);
  }
  expect(errors).toEqual([]);
});
