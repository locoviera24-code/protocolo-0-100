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
