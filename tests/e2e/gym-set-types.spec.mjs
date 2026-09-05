import {test,expect} from '@playwright/test';

async function reset(page,path='/index.html'){
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    localStorage.clear();
    sessionStorage.clear();
    await window.APP_DATA.clearAllData();
  });
  await page.goto(path);
}

async function openQuickType(page){
  const details=page.locator('.quickSecondaryDetails');
  if(!(await details.evaluate(element=>element.open))) await details.locator('summary').click();
}

test('un descanso permite entrenar por decisión explícita sin cambiar el plan',async({page})=>{
  await reset(page,'/index.html?module=gym&view=train');
  const seeded=await page.evaluate(()=>{
    const workout=window.WORKOUT_FEATURES,date=todayStr(),dayKey=workout.dayKeyForDate(date);
    const plan=workout.getWeeklyWorkoutPlan();
    plan[dayKey]={dayKey,weekday:plan[dayKey].weekday,name:'Descanso de prueba',type:'rest',muscles:['Recuperación'],message:'Recuperación planificada.',suggestions:['caminar'],exercises:[]};
    window.APP_DATA.write(workout.keys.weeklyWorkoutPlan,plan);
    return {date,dayKey,plan};
  });
  await page.reload();

  const before=await page.evaluate(()=>({
    plan:window.WORKOUT_FEATURES.getWeeklyWorkoutPlan(),
    sessions:JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]')
  }));
  expect(before.sessions).toHaveLength(0);
  expect(before.plan).toEqual(seeded.plan);
  await expect(page.locator('#startTodayWorkoutBtn')).toBeVisible();
  await expect(page.locator('#startTodayWorkoutBtn')).toHaveText('Entrenar hoy');

  await page.locator('#startTodayWorkoutBtn').click();
  const started=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]'));
  expect(started).toHaveLength(1);
  expect(started[0]).toMatchObject({date:seeded.date,status:'en progreso',routine:{name:'Entrenamiento libre',exercises:[]}});
  await expect(page.locator('#openQuickLoggerBtn')).toBeVisible();

  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});
  await page.locator('#quickReps').fill('8');
  await page.locator('#quickWeight').fill('0');
  const sessionId=started[0].id;
  await page.reload();
  await expect(page.locator('#quickReps')).toHaveValue('8');
  const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]'));
  expect(resumed).toHaveLength(1);
  expect(resumed[0].id).toBe(sessionId);

  await page.locator('#saveQuickSetBtn').click();
  await expect(page.locator('#quickLoggedSets')).toContainText('8 reps');
  const after=await page.evaluate(()=>{
    const workout=window.WORKOUT_FEATURES;
    const sessions=JSON.parse(localStorage.getItem(workout.keys.workoutSessions)||'[]');
    const set=sessions[0].exercises.find(exercise=>exercise.name==='Press de banca').sets[0];
    return {plan:workout.getWeeklyWorkoutPlan(),sessions,set};
  });
  expect(after.sessions).toHaveLength(1);
  expect(after.set).toMatchObject({measurementMode:'reps',reps:8,durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
  expect(after.plan).toEqual(seeded.plan);
  expect(after.plan[seeded.dayKey].type).toBe('rest');
});

test('un set de repeticiones ignora tiempo y distancia ocultos',async({page})=>{
  await reset(page,'/index.html?module=gym&view=train');
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});

  await expect(page.locator('#quickMeasurementMode')).toHaveValue('reps');
  await expect(page.locator('#quickDurationSeconds')).toHaveValue('60');
  await expect(page.locator('#quickDistanceMeters')).toHaveValue('1000');
  await page.locator('#quickReps').fill('8');
  await page.locator('#quickWeight').fill('60');
  await page.locator('#saveQuickSetBtn').click();

  const stored=await page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]');
    const exercise=sessions[0].exercises.find(item=>item.name==='Press de banca');
    return {set:exercise.sets[0],summary:sessions[0].summary};
  });
  expect(stored.set).toMatchObject({measurementMode:'reps',reps:8,durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
  expect(stored.summary).toMatchObject({totalReps:8,durationSeconds:0,distanceMeters:0,bestPaceSecondsPerKm:0});
  await expect(page.locator('#todayWorkoutProgress')).not.toContainText('1 min');
  await expect(page.locator('#todayWorkoutProgress')).not.toContainText('1 km');

  await page.locator('#repeatLastSetBtn').click();
  await page.locator('#saveQuickSetBtn').click();
  const repeated=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]')[0].exercises.find(item=>item.name==='Press de banca').sets);
  expect(repeated).toHaveLength(2);
  expect(repeated[1]).toMatchObject({measurementMode:'reps',reps:8,durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
  await page.locator('#appSnackbarAction').click();
  const afterUndo=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]')[0].exercises.find(item=>item.name==='Press de banca').sets);
  expect(afterUndo).toHaveLength(1);
  expect(afterUndo[0]).toMatchObject({measurementMode:'reps',durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
});

test('un borrador restaurado no reintroduce dimensiones incompatibles al guardar',async({page})=>{
  await reset(page,'/index.html?module=gym&view=train');
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});
  await page.locator('#quickReps').fill('9');
  await page.locator('#quickWeight').fill('55');
  await page.reload();

  await expect(page.locator('#quickMeasurementMode')).toHaveValue('reps');
  await expect(page.locator('#quickReps')).toHaveValue('9');
  await expect(page.locator('#quickWeight')).toHaveValue('55');
  await page.locator('#saveQuickSetBtn').click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]')[0].exercises.find(item=>item.name==='Press de banca').sets[0]);
  expect(stored).toMatchObject({measurementMode:'reps',reps:9,durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0});
});

test('Gym separa calentamiento de volumen, progreso y records principales',async({page})=>{
  await reset(page,'/index.html?module=gym&view=train');
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});

  await openQuickType(page);
  await page.locator('#quickSetType').selectOption('warmup');
  await page.locator('#quickReps').fill('5');
  await page.locator('#quickWeight').fill('100');
  await page.locator('#saveQuickSetBtn').click();

  await openQuickType(page);
  await page.locator('#quickSetType').selectOption('working');
  await page.locator('#quickReps').fill('8');
  await page.locator('#quickWeight').fill('60');
  await page.locator('#saveQuickSetBtn').click();

  await expect(page.locator('#quickLoggedSets')).toContainText('Calentamiento');
  await expect(page.locator('#quickLoggedSets')).toContainText('Efectiva');
  await expect(page.locator('#quickSetStats')).toContainText('1 efectiva');

  const stored=await page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]');
    const exercise=sessions[0].exercises.find(item=>item.name==='Press de banca');
    return {types:exercise.sets.map(set=>set.setType),summary:sessions[0].summary};
  });
  expect(stored.types).toEqual(['warmup','working']);
  expect(stored.summary.totalSets).toBe(2);
  expect(stored.summary.workingSets).toBe(1);
  expect(stored.summary.warmupSets).toBe(1);
  expect(stored.summary.totalVolume).toBe(480);
  expect(stored.summary.bestByExercise['press-banca'].weight).toBe(60);

  await page.goto('/index.html?module=progress&view=gym&progressScope=muscle&muscle=chest');
  await expect(page.locator('#progressMuscleSummary')).toContainText('Series primarias esta semana1');
  await expect(page.locator('#progressMuscleChartSummary')).toContainText('1 series primarias');
});

test('Gym Party conserva y comparte el tipo de serie',async({page})=>{
  await reset(page,'/index.html?module=gym-party');
  await page.locator('#gymPartyCreateAlias').fill('Yo');
  await page.locator('#gymPartyCreateName').fill('Tipos de serie');
  await page.locator('[data-gym-party-action="create"]').click();
  await page.locator('#partyWorkoutDateInput').fill('2026-07-13');
  await page.locator('#partyWorkoutDateInput').dispatchEvent('change');

  const optional=page.locator('.partyWorkoutLogger details').filter({has:page.locator('summary',{hasText:'Opcional'})}).first();
  await optional.locator('summary').click();
  await page.locator('#partyQuickSetType').selectOption('drop');
  await page.locator('#partyQuickReps').fill('12');
  await page.locator('#partyQuickWeight').fill('30');
  await page.locator('[data-gym-party-action="party-save-set"]').click();

  await expect(page.locator('.partyLoggedSets')).toContainText('Drop');
  const stored=await page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem(window.WORKOUT_FEATURES.keys.workoutSessions)||'[]');
    const localSet=sessions[0].exercises.flatMap(exercise=>exercise.sets||[])[0];
    const shared=JSON.parse(localStorage.getItem('protocolo_0_100_shared_workout_sets_v1')||'[]')[0];
    return {localSet,shared};
  });
  expect(stored.localSet).toMatchObject({setType:'drop',completed:true,excludeFromRecords:false,excludeFromProgression:false});
  expect(stored.shared).toMatchObject({setType:'drop',completed:true,excludeFromRecords:false,excludeFromProgression:false});
});
