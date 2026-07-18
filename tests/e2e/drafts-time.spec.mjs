import {test,expect} from '@playwright/test';

async function reset(page,path='/index.html'){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA?.clearAllData?.();});
  await page.goto(path);
}

test('registro diario restaura el borrador y lo borra al guardar',async({page})=>{
  await reset(page,'/index.html?module=home&view=register');
  await page.locator('#sleepHours').fill('7.5');
  await page.locator('.dailyDetails summary').click();
  await page.locator('#note').fill('Borrador local de prueba');
  await page.reload();
  await expect(page.locator('#sleepHours')).toHaveValue('7.5');
  await expect(page.locator('#note')).toHaveValue('Borrador local de prueba');
  await expect(page.locator('#appSnackbar')).toContainText('Borrador del registro diario restaurado');
  await page.locator('#saveBtn').click();
  expect(await page.evaluate(()=>window.APP_DRAFTS.list('protocol-entry').length)).toBe(0);
});

test('alimento sin guardar conserva paso, porcion y comida',async({page})=>{
  await reset(page,'/index.html?module=nutrition&view=meals');
  await page.locator('[data-open-nutrition-view="registrar"]').first().click();
  await page.locator('.nutritionFoodFallback summary').click();
  await page.locator('#nutritionFood').selectOption({index:1});
  await page.locator('#foodQuantity').fill('175');
  await page.locator('#foodAmountNextBtn').click();
  await page.locator('#nutritionMeal').selectOption('Cena');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#foodQuantity')).toHaveValue('175');
  await expect(page.locator('#nutritionMeal')).toHaveValue('Cena');
  expect(await page.evaluate(()=>({state:nutritionEntryFlow.state(),draft:window.APP_DRAFTS.list('nutrition-food')[0]?.payload?.state}))).toMatchObject({state:{step:'meal'},draft:{step:'meal'}});
  await expect(page.locator('[data-food-flow-step="meal"]')).toBeVisible();
  await page.locator('#foodMealNextBtn').click();
  await page.locator('#addFoodBtn').click();
  expect(await page.evaluate(()=>window.APP_DRAFTS.list('nutrition-food').length)).toBe(0);
});

test('serie Gym y formulario de Gym Party sobreviven una recarga',async({page})=>{
  await reset(page,'/index.html?module=gym&view=train');
  await expect(page.locator('#quickExerciseSelect')).toBeVisible();
  await page.evaluate(()=>{const result=window.WORKOUT_FEATURES.addManualExercisePayload({date:todayStr(),name:'Ejercicio borrador',muscle:'General',persistScope:'session'});window.openQuickSetLogger(result.exercise.id);});
  await page.locator('#quickReps').fill('11');
  await page.locator('#quickWeight').fill('42.5');
  await page.locator('.quickSecondaryDetails summary').click();
  await page.locator('#quickNote').fill('Mantener tecnica');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  expect(await page.evaluate(()=>window.APP_DRAFTS.list('gym-set')[0]?.payload)).toMatchObject({reps:'11',weight:'42.5',note:'Mantener tecnica'});
  await page.reload();
  await expect(page.locator('#quickReps')).toHaveValue('11');
  await expect(page.locator('#quickWeight')).toHaveValue('42.5');
  await expect(page.locator('#quickNote')).toHaveValue('Mantener tecnica');
  await page.locator('#saveQuickSetBtn').click();
  await page.locator('[data-quick-edit-set]').first().click();
  await page.locator('#quickWeight').fill('45');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#quickWeight')).toHaveValue('45');
  await expect(page.locator('#saveQuickSetBtn')).toHaveText('Guardar cambios');
  await page.locator('#saveQuickSetBtn').click();

  await page.goto('/index.html?module=gym-party');
  await page.locator('#gymPartyCreateAlias').fill('Nico');
  await page.locator('#gymPartyCreateName').fill('Sala pendiente');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#gymPartyCreateAlias')).toHaveValue('Nico');
  await expect(page.locator('#gymPartyCreateName')).toHaveValue('Sala pendiente');
  await page.locator('[data-gym-party-action="create"]').click();
  await page.locator('#partyWorkoutDateInput').fill('2026-07-13');
  await page.locator('#partyWorkoutDateInput').dispatchEvent('change');
  await page.locator('#partyQuickReps').fill('9');
  await page.locator('#partyQuickWeight').fill('30');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
  await page.locator('[data-gym-party-action="party-edit-set"]').first().click();
  await page.locator('#partyQuickWeight').fill('32.5');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#partyQuickWeight')).toHaveValue('32.5');
  await expect(page.locator('[data-gym-party-action="party-save-set"]')).toHaveText('Guardar cambios');
  await page.locator('[data-gym-party-action="party-save-set"]').click();
});

test('rutina y privacidad de Gym Party restauran y limpian sus borradores',async({page})=>{
  await reset(page,'/index.html?module=gym&view=routine');
  const config=page.locator('#workoutConfigPanel details.planAdvancedEditor').first();
  if(!(await config.evaluate(element=>element.open)))await config.locator('summary').click();
  await page.locator('#planEditorDay').selectOption('tuesday');
  await page.locator('#planEditorName').fill('Torso A ajustado');
  await page.locator('#planCustomExerciseName').fill('Remo de prueba');
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#planEditorDay')).toHaveValue('tuesday');
  await expect(page.locator('#planEditorName')).toHaveValue('Torso A ajustado');
  await expect(page.locator('#planCustomExerciseName')).toHaveValue('Remo de prueba');
  await page.locator('#savePlanDayBtn').click();
  expect(await page.evaluate(()=>window.APP_DRAFTS.list('gym-routine').length)).toBe(0);

  await page.goto('/index.html?module=gym-party');
  await page.locator('#gymPartyCreateAlias').fill('Yo');
  await page.locator('#gymPartyCreateName').fill('Sala privacidad');
  await page.locator('[data-gym-party-action="create"]').click();
  await expect(page.getByRole('heading',{name:'Entrenamiento compartido',level:2,exact:true})).toBeVisible();
  await page.locator('#partyPrivacyHideWeights').evaluate(element=>{element.checked=true;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.evaluate(()=>window.APP_DRAFTS.flushAll());
  await page.reload();
  await expect(page.locator('#partyPrivacyHideWeights')).toBeChecked();
  const savePrivacy=page.locator('[data-gym-party-action="save-privacy"]');
  await savePrivacy.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});
  await savePrivacy.click();
  expect(await page.evaluate(()=>window.APP_DRAFTS.list('gym-party-privacy').length)).toBe(0);
});

test('fecha elegida manualmente no cambia al detectar otro dia',async({page})=>{
  await reset(page,'/index.html?module=home&view=register');
  await page.locator('#entryDate').fill('2026-07-12');
  await page.locator('#entryDate').press('Tab');
  await page.evaluate(()=>window.APP_DATES.checkNow('2026-07-14T12:00:00-03:00'));
  await expect(page.locator('#entryDate')).toHaveValue('2026-07-12');
  await page.reload();
  await expect(page.locator('#entryDate')).toHaveValue('2026-07-12');
  expect(await page.evaluate(()=>window.APP_DATES.isManual('entryDate'))).toBe(true);
});

test('descarta borradores vencidos y avisa cambios entre pestanas',async({page,context})=>{
  await reset(page);
  await page.evaluate(()=>{
    localStorage.setItem(window.APP_DRAFTS.STORAGE_KEY,JSON.stringify({version:1,updatedAt:new Date().toISOString(),items:{expired:{id:'expired',domain:'protocol-entry',payload:{note:'viejo'},updatedAt:'2026-01-01T00:00:00.000Z',expiresAt:'2026-01-02T00:00:00.000Z'}}}));
  });
  expect(await page.evaluate(()=>window.APP_DRAFTS.get('expired'))).toBeNull();

  const second=await context.newPage();
  await second.goto('/index.html');
  await second.evaluate(()=>{window.__draftSignals=0;window.addEventListener('app-drafts-changed',()=>window.__draftSignals++);});
  await page.evaluate(()=>{window.APP_DRAFTS.schedule({id:'cross-tab',domain:'test',payload:{value:1}},{debounceMs:0});window.APP_DRAFTS.flushAll();});
  await expect.poll(()=>second.evaluate(()=>window.__draftSignals)).toBeGreaterThan(0);
  await second.close();
});
