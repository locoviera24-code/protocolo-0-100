import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});

const STABLE_BUILD={schemaVersion:1,version:'2.7.0',versionCode:33,build:88,commit:'abcdef1234567890',artifactCreatedAt:'2026-07-28T12:00:00.000Z',channel:'stable'};

async function reset(page,path){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto(path);
  await expect.poll(()=>page.evaluate(()=>document.getElementById('nutritionExpandedSearchLabel')?.textContent)).not.toContain('Comprobando');
}

test('un build estable oculta herramientas nutricionales tecnicas y no habilita claves del navegador',async({page})=>{
  await page.route('**/build-info.json*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(STABLE_BUILD)}));
  await reset(page,'/index.html?module=more&view=settings');
  await expect(page.locator('#nutritionExpandedSearchLabel')).toHaveText('Búsqueda ampliada no disponible');
  await expect(page.locator('#fdcSettingsCard')).toBeHidden();
  const settingsText=await page.locator('#nutritionSettingsSection').innerText();
  for(const term of ['USDA','FoodData Central','FDC','API key','endpoint','dataset'])expect(settingsText).not.toContain(term);
  const access=await page.evaluate(()=>{window.FDC_CLIENT.saveConfig({apiKey:'legacy-browser-key',backendUrl:''});return{browserKey:window.APP_NUTRITION_ALLOW_BROWSER_KEY,remote:window.FDC_CLIENT.hasRemoteAccess()};});
  expect(access).toEqual({browserKey:false,remote:false});
});

test('sin metadatos de build el diagnostico permanece cerrado',async({page})=>{
  await page.route('**/build-info.json*',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));
  await reset(page,'/index.html?module=more&view=settings');
  await expect(page.locator('#fdcSettingsCard')).toBeHidden();
  expect(await page.evaluate(()=>window.APP_NUTRITION_ALLOW_BROWSER_KEY)).toBe(false);
});

test('desarrollo o soporte explicito conserva el diagnostico sin mezclarlo con Ajustes',async({page})=>{
  await reset(page,'/index.html?module=more&view=data&diagnostics=1');
  await page.locator('#dataAdvancedDiagnostics > summary').click();
  await expect(page.locator('#supportDiagnosticsMount #fdcSettingsCard')).toBeVisible();
  expect(await page.evaluate(()=>window.APP_NUTRITION_ALLOW_BROWSER_KEY)).toBe(true);
});

test('el estado simple informa modo offline sin bloquear alimentos guardados',async({page,context})=>{
  await page.route('**/build-info.json*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(STABLE_BUILD)}));
  await reset(page,'/index.html?module=more&view=settings');
  await context.setOffline(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
  await expect(page.locator('#nutritionExpandedSearchLabel')).toHaveText('Modo offline');
  await expect(page.locator('#nutritionExpandedSearchDescription')).toContainText('alimentos guardados');
});
