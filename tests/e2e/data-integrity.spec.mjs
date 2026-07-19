import {test,expect} from '@playwright/test';

async function clean(page){
  await page.goto('/index.html');
  await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto('/index.html?module=more&view=data');
}

test('aparta, muestra y permite reparar datos corruptos sin perder el raw',async ({page})=>{
  await clean(page);
  const result=await page.evaluate(async()=>{
    const key=window.APP_SCHEMA_REGISTRY.getByName('workout','sessions').key;
    localStorage.setItem(key,'[');
    const inspected=window.APP_DATA.readResult(key);
    await window.APP_DATA.flush();
    return{status:inspected.status,active:localStorage.getItem(key),items:await window.APP_DATA.quarantineList({includeRaw:true})};
  });
  expect(result.status).toBe('corrupt');
  expect(result.active).toBeNull();
  expect(result.items).toHaveLength(1);
  expect(result.items[0].raw).toBe('[');
  await expect(page.locator('#dataIntegrityCard')).toBeVisible();
  await expect(page.locator('#dataIntegrityCount')).toHaveText('1');
  await page.locator('[data-quarantine-action="repair"]').click();
  await expect(page.locator('#appFormDialogBackdrop')).toBeVisible();
  await page.locator('#appFormField-raw').fill('[]');
  await page.locator('#appFormDialogSubmit').click();
  await expect(page.locator('#appFormDialogBackdrop')).toBeHidden();
  await expect(page.locator('#dataIntegrityCard')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('protocolo_0_100_workout_sessions_v1'))).toBe('[]');
});

test('redacta secretos y no los incluye al exportar cuarentena',async ({page})=>{
  await clean(page);
  const exported=await page.evaluate(async()=>{
    const key=window.APP_SCHEMA_REGISTRY.getByName('nutrition','fdcConfig').key;
    localStorage.setItem(key,'{"apiKey":"NO_EXPORTAR"');
    window.APP_DATA.readResult(key);
    await window.APP_DATA.flush();
    return window.APP_DATA.quarantineExport();
  });
  expect(JSON.stringify(exported)).not.toContain('NO_EXPORTAR');
  expect(exported.entries).toHaveLength(1);
  expect(exported.entries[0].redacted).toBe(true);
  expect(exported.entries[0].raw).toBeNull();
  await expect(page.locator('#dataIntegrityCard')).toBeVisible();
  await expect(page.locator('[data-quarantine-action="repair"]')).toBeDisabled();
});
