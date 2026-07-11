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
  await expect(page.locator('#homeCompactActionBtn')).toHaveText('Ver progreso');
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

test('Datos muestra almacenamiento y restablece solo un área',async ({page})=>{
  await clean(page,'/index.html?module=more&view=data');
  await page.evaluate(()=>{
    localStorage.setItem('protocolo_0_100_tracker_v1','[]');
    localStorage.setItem('protocolo_0_100_nutrition_entries_v1','[{"id":"food"}]');
  });
  await page.reload();
  await expect(page.locator('#localStorageEstimate')).not.toHaveText('0 KB');
  await expect(page.locator('#dataSchemaVersion')).toHaveText('3');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-reset-scope="protocol"]').click();
  await page.waitForLoadState('domcontentloaded');
  const values=await page.evaluate(()=>({protocol:localStorage.getItem('protocolo_0_100_tracker_v1'),nutrition:localStorage.getItem('protocolo_0_100_nutrition_entries_v1')}));
  expect(values.protocol).toBeNull();
  expect(values.nutrition).not.toBeNull();
});

test('Acerca de expone versiones sin depender de Android',async ({page})=>{
  await clean(page,'/index.html?module=more&view=about');
  await expect(page.locator('#aboutWebVersion')).toHaveText('2.7.0');
  await expect(page.locator('#aboutCacheVersion')).toHaveText('v50');
  await expect(page.locator('#aboutAndroidVersion')).toHaveText('Web/PWA');
});
