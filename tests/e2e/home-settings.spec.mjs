import {test,expect} from '@playwright/test';

async function clean(page,path='/index.html'){
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
  await page.goto(path);
}

test('Inicio movil adapta score, pendientes y acción completada',async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=='android-chromium');
  await page.setViewportSize({width:390,height:844});
  await clean(page,'/index.html?module=home&view=register');
  await expect(page.locator('#homeStatusCard')).toBeVisible();
  await expect(page.locator('.grid > aside.protocolOnly')).toBeHidden();
  await expect(page.locator('#homeCompactState')).toHaveText('Sin datos');
  await page.locator('#nonEssential').fill('2');
  await page.locator('#sleepHours').fill('8');
  await page.locator('#readingMins').fill('25');
  await page.locator('#offlineMins').fill('20');
  await page.locator('#keyActionDone').check();
  await expect(page.locator('#homeCompactState')).toHaveText('Listo para guardar');
  await expect(page.locator('#homeCompactActionBtn')).toHaveText('Guardar día');
  await page.locator('#homeCompactActionBtn').click();
  await expect(page.locator('#homeCompactState')).toHaveText('Día guardado');
  await expect(page.locator('#homeCompactActionBtn')).toHaveText('Ver resumen');
  await expect(page.locator('#actionFocusCard')).toHaveClass(/completed/);
  await expect(page.locator('#actionNextRecommendation')).toBeVisible();
});

test('Ajustes persisten y se incluyen en backup',async ({page})=>{
  await clean(page,'/index.html?module=more&view=settings');
  await page.locator('#settingsDensity').selectOption('compact');
  await page.locator('#settingsExperienceMode').selectOption('compact');
  await page.locator('#settingsUnit').selectOption('lb');
  await page.locator('#settingsShowRir').uncheck();
  await page.locator('#saveUiSettingsBtn').click();
  await expect(page.locator('body')).toHaveAttribute('data-density','compact');
  await page.reload();
  await expect(page.locator('#settingsDensity')).toHaveValue('compact');
  await expect(page.locator('#settingsExperienceMode')).toHaveValue('compact');
  const backup=await page.evaluate(()=>window.buildCompleteBackup());
  expect(backup.uiPreferences.density).toBe('compact');
  expect(backup.uiPreferences.unit).toBe('lb');
});

test('Seguir sistema, modo compacto y orientación tienen efecto real',async ({page})=>{
  await page.emulateMedia({colorScheme:'light'});
  await clean(page,'/index.html?module=more&view=settings');
  await page.locator('#settingsAppearance').selectOption('system');
  await page.locator('#settingsDensity').selectOption('compact');
  await page.locator('#settingsExperienceMode').selectOption('compact');
  await page.locator('#settingsNutritionGuidance').uncheck();
  await page.locator('#saveUiSettingsBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.locator('body')).toHaveAttribute('data-density','compact');
  await expect(page.locator('body')).toHaveAttribute('data-experience-mode','compact');
  await page.goto('/index.html?module=nutrition&view=meals');
  await expect(page.locator('#nutritionDiagnosisCard')).toHaveClass(/preferenceHidden/);
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('Recordatorio habilitado funciona solo al abrir la app',async ({page})=>{
  await page.goto('/index.html');
  await page.evaluate(()=>{
    localStorage.clear();sessionStorage.clear();
    localStorage.setItem('protocolo_0_100_ui_preferences_v1',JSON.stringify({notifications:true}));
  });
  await page.reload();
  await expect(page.locator('#appSnackbar')).toContainText('Recordatorio interno');
});

test('lb se muestra sin alterar el peso canónico guardado en kg',async ({page})=>{
  await clean(page,'/index.html?module=more&view=settings');
  await page.locator('#settingsUnit').selectOption('lb');
  await page.locator('#saveUiSettingsBtn').click();
  await page.goto('/index.html?module=gym&view=train');
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});
  await page.locator('#quickReps').fill('8');
  await page.locator('#quickWeight').fill('132.5');
  await page.locator('#saveQuickSetBtn').click();
  await expect(page.locator('#quickLoggedSets')).toContainText('132.5 lb');
  const storedKg=await page.evaluate(()=>{
    const sessions=JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1'))||[];
    return sessions[0].exercises.find(exercise=>exercise.name==='Press de banca').sets[0].weight;
  });
  expect(storedKg).toBeGreaterThan(60);
  expect(storedKg).toBeLessThan(60.2);
  await page.goto('/index.html?module=more&view=settings');
  await page.locator('#settingsUnit').selectOption('kg');
  await page.locator('#saveUiSettingsBtn').click();
  await page.goto('/index.html?module=gym&view=train');
  await page.locator('#quickExerciseSelect').selectOption({label:'Press de banca'});
  await expect(page.locator('#quickLoggedSets')).toContainText('60 kg');
  const storedAgain=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_workout_sessions_v1'))[0].exercises.find(exercise=>exercise.name==='Press de banca').sets[0].weight);
  expect(storedAgain).toBe(storedKg);
});

test('Datos muestra almacenamiento y restablece solo un área',async ({page})=>{
  await clean(page,'/index.html?module=more&view=data');
  await page.evaluate(()=>{
    localStorage.setItem('protocolo_0_100_tracker_v1','[]');
    localStorage.setItem('protocolo_0_100_nutrition_entries_v1','[{"id":"food"}]');
  });
  await page.reload();
  await expect(page.locator('#dataHealthTitle')).toContainText('guardados');
  await expect(page.locator('#dataAdvancedDiagnostics')).not.toHaveAttribute('open','');
  await expect(page.locator('#toggleProtocolPrimaryBtn')).toBeHidden();
  await expect(page.locator('#localStorageEstimate')).not.toHaveText('0 KB');
  await expect(page.locator('#dataSchemaVersion')).toHaveText('3');
  await page.locator('#dataAdvancedDiagnostics > summary').click();
  await expect(page.locator('#toggleProtocolPrimaryBtn')).toBeVisible();
  await page.locator('[data-reset-scope="protocol"]').click();
  await expect(page.locator('#appConfirmationBackdrop')).toBeVisible();
  await expect(page.locator('#appConfirmationCancel')).toBeFocused();
  await page.locator('#appConfirmationConfirm').click();
  await expect(page.locator('#appConfirmationBackdrop')).toBeHidden();
  await expect(page.locator('#appSnackbar')).toContainText('eliminados');
  const values=await page.evaluate(()=>({protocol:localStorage.getItem('protocolo_0_100_tracker_v1'),nutrition:localStorage.getItem('protocolo_0_100_nutrition_entries_v1')}));
  expect(values.protocol).toBeNull();
  expect(values.nutrition).not.toBeNull();
});

test('Acerca de expone versiones sin depender de Android',async ({page})=>{
  await clean(page,'/index.html?module=more&view=about');
  const version=await page.evaluate(()=>window.APP_VERSION_INFO);
  await expect(page.locator('#aboutWebVersion')).toHaveText(version.version);
  await expect(page.locator('#aboutCacheVersion')).toHaveText(version.cacheLabel);
  await expect(page.locator('#aboutAndroidVersion')).toHaveText('Web/PWA');
});
