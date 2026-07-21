import {test,expect} from '@playwright/test';

const NUTRITION_KEY='protocolo_0_100_nutrition_entries_v1';

async function clean(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
}

test('promueve solo Nutrición y conserva localStorage como respaldo',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async key=>{
    const entries=[{id:'nutrition-primary-1',date:'2026-07-19',name:'Mandioca',grams:180}];
    localStorage.setItem(key,JSON.stringify(entries));
    await window.APP_DATA.setPrimaryDomain('nutrition',true);
    const read=window.APP_DATA.readResult(key),indexed=await window.APP_DATA.readIndexedResult(key),diagnostics=await window.APP_DATA.diagnostics();
    return{read,indexed,diagnostics,local:JSON.parse(localStorage.getItem(key)),primaryKeys:window.APP_DATA.PRIMARY_KEYS.nutrition};
  },NUTRITION_KEY);
  expect(result.read.status).toBe('valid');
  expect(result.read.source).toBe('indexeddb');
  expect(result.read.value[0].id).toBe('nutrition-primary-1');
  expect(result.indexed.value[0].id).toBe('nutrition-primary-1');
  expect(result.local[0].id).toBe('nutrition-primary-1');
  expect(result.diagnostics.domains.nutrition.storageMode).toBe('primary');
  expect(result.diagnostics.domains.nutrition.primaryStatus).toBe('ready');
  expect(result.primaryKeys).not.toContain('protocolo_0_100_cached_fdc_foods_v1');
  expect(result.primaryKeys).not.toContain('protocolo_0_100_fdc_search_cache_v1');
});

test('reconcilia una escritura local pendiente y permite rollback',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'before',date:'2026-07-18',name:'Arroz'}]);await window.APP_DATA.flush();},NUTRITION_KEY);
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify([{id:'pending-local',date:'2026-07-19',name:'Pollo'}])),NUTRITION_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const reconciled=await page.evaluate(async key=>({read:window.APP_DATA.readResult(key),indexed:await window.APP_DATA.readIndexedResult(key),status:await window.APP_DATA.primaryDomainStatus('nutrition')}),NUTRITION_KEY);
  expect(reconciled.read.value[0].id).toBe('pending-local');
  expect(reconciled.indexed.value[0].id).toBe('pending-local');
  expect(reconciled.status.divergenceCount).toBeGreaterThanOrEqual(1);
  const rolledBack=await page.evaluate(async key=>{await window.APP_DATA.setPrimaryDomain('nutrition',false);localStorage.setItem(key,JSON.stringify([{id:'compatible-local',date:'2026-07-19',name:'Leche'}]));return{read:window.APP_DATA.readResult(key),config:window.APP_DATA.config()};},NUTRITION_KEY);
  expect(rolledBack.read.source).toBe('localStorage');
  expect(rolledBack.read.value[0].id).toBe('compatible-local');
  expect(rolledBack.config.primaryDomains.nutrition).toBe(false);
});

test('recupera desde IndexedDB cuando falta la copia compatible',async ({page})=>{
  await clean(page);
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'recover-me',date:'2026-07-19',name:'Banana'}]);await window.APP_DATA.flush();localStorage.removeItem(key);},NUTRITION_KEY);
  await page.reload();
  await page.evaluate(()=>window.APP_DATA.ready());
  const result=await page.evaluate(async key=>({read:window.APP_DATA.readResult(key),local:JSON.parse(localStorage.getItem(key)),status:await window.APP_DATA.primaryDomainStatus('nutrition')}),NUTRITION_KEY);
  expect(result.read.value[0].id).toBe('recover-me');
  expect(result.local[0].id).toBe('recover-me');
  expect(result.status.recoveredCount).toBeGreaterThanOrEqual(1);
});

test('coordina la lectura primaria entre dos pestañas',async ({page,context})=>{
  await clean(page);
  const second=await context.newPage();await second.goto('/index.html');await second.evaluate(()=>window.APP_DATA.ready());
  await page.evaluate(async key=>{window.APP_DATA.write(key,[{id:'cross-tab',date:'2026-07-19',name:'Yogur'}]);await window.APP_DATA.flush();},NUTRITION_KEY);
  await expect.poll(()=>second.evaluate(key=>window.APP_DATA.readResult(key).value?.[0]?.id||'',NUTRITION_KEY)).toBe('cross-tab');
  await second.close();
});

test('Datos y copias permite rollback y reactivación visibles',async ({page})=>{
  await clean(page);await page.goto('/index.html?module=more&view=data');
  await expect(page.locator('#nutritionStorageStatus')).toContainText('IndexedDB');
  await expect(page.locator('#toggleNutritionPrimaryBtn')).toHaveText('Usar modo compatible');
  await page.locator('#toggleNutritionPrimaryBtn').click();
  await expect(page.locator('#nutritionStorageStatus')).toContainText('Modo compatible');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutrition)).toBe(false);
  await page.reload();await page.evaluate(()=>window.APP_DATA.ready());
  await expect(page.locator('#toggleNutritionPrimaryBtn')).toHaveText('Reactivar IndexedDB');
  await page.locator('#toggleNutritionPrimaryBtn').click();
  await expect(page.locator('#nutritionStorageStatus')).toContainText('IndexedDB verificada');
  expect(await page.evaluate(()=>window.APP_DATA.config().primaryDomains.nutrition)).toBe(true);
});
