import {test,expect} from '@playwright/test';

async function clean(page){await page.goto('/index.html');await page.evaluate(async()=>{localStorage.clear();await window.APP_DATA.clearAllData();});await page.goto('/index.html?module=more&view=data');}

test('muestra preview, importa transaccionalmente y permite Deshacer',async ({page})=>{
  await clean(page);
  await page.evaluate(()=>{
    localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([{date:'2026-07-10',score:70,note:'anterior'}]));
    localStorage.setItem('protocolo_0_100_nutrition_entries_v1',JSON.stringify([{id:'food-kept',name:'Arroz'}]));
  });
  const backup={schemaVersion:3,startDate:'2026-07-01',entries:[{date:'2026-07-12',score:88,note:'<img src=x onerror=alert(1)>'}],unknownArea:{secret:'ignored'},gymPartySettings:{backendMode:'firebase',firebaseConfig:{apiKey:'omit'}}};
  await page.locator('#importFile').setInputFiles({name:'backup-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await expect(page.locator('#importPreviewBackdrop')).toBeVisible();
  await expect(page.locator('#importPreviewAdded')).toHaveText(/[1-9]/);
  await expect(page.locator('#importPreviewIgnored')).toContainText('unknownArea');
  expect(await page.locator('#importPreviewBackdrop img').count()).toBe(0);
  await page.locator('#confirmImportBtn').click();
  await expect(page.locator('#importPreviewBackdrop')).toBeHidden();
  await expect(page.locator('#importUndoPanel')).toBeVisible();
  const imported=await page.evaluate(()=>({entries:JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1')),nutrition:JSON.parse(localStorage.getItem('protocolo_0_100_nutrition_entries_v1')),party:JSON.parse(localStorage.getItem('protocolo_0_100_gym_party_settings_v1')),start:localStorage.getItem('protocolo_0_100_start_date_v1')}));
  expect(imported.entries[0].score).toBe(88);
  expect(imported.entries[0].note).toContain('<img');
  expect(imported.nutrition[0].id).toBe('food-kept');
  expect(imported.party).not.toHaveProperty('firebaseConfig');
  expect(imported.start).toBe('2026-07-01');
  await page.locator('#undoImportBtn').click();
  await expect(page.locator('#importUndoPanel')).toBeHidden();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1')));
  expect(restored[0].note).toBe('anterior');
});

test('rechaza JSON futuro sin modificar datos',async ({page})=>{
  await clean(page);
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([{date:'2026-07-12',score:77}])));
  await page.locator('#importFile').setInputFiles({name:'future.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:99,entries:[]}))});
  await expect(page.locator('#appSnackbar')).toContainText('posterior');
  await expect(page.locator('#importPreviewBackdrop')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1'))[0].score)).toBe(77);
});

test('fusiona por defecto y permite resolver un conflicto individual',async ({page})=>{
  await clean(page);
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([
    {id:'local-only',date:'2026-07-01',score:60},
    {id:'shared',date:'2026-07-02',score:70}
  ])));
  const backup={schemaVersion:3,entries:[
    {id:'shared',date:'2026-07-02',name:'<img src=x onerror=alert(1)>',score:80},
    {id:'incoming',date:'2026-07-03',score:90},
    {id:'incoming',date:'2026-07-03',score:91}
  ]};
  await page.locator('#importFile').setInputFiles({name:'merge.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  const protocol=page.locator('[data-import-domain="protocol"]');
  await expect(protocol).toBeVisible();
  await expect(page.locator('#importPreviewDuplicates')).toHaveText('1');
  await protocol.locator('[data-import-conflict-policy]').selectOption('review');
  await expect(protocol.locator('[data-import-conflict-review]')).toBeVisible();
  expect(await protocol.locator('[data-import-conflict-review] img').count()).toBe(0);
  await expect(protocol.locator('[data-import-conflict-review]')).toContainText('<img src=x');
  await protocol.locator('[data-import-conflict-decision]').first().selectOption('current');
  await page.locator('#confirmImportBtn').click();
  await expect(page.locator('#importPreviewBackdrop')).toBeHidden();
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1')));
  expect(result.map(item=>item.id).sort()).toEqual(['incoming','local-only','shared']);
  expect(result.find(item=>item.id==='shared').score).toBe(70);
  expect(result.find(item=>item.id==='incoming').score).toBe(91);
});

test('reemplazar muestra y aplica eliminaciones mientras conservar actual no escribe',async ({page})=>{
  await clean(page);
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([
    {id:'local-only',date:'2026-07-01',score:60},
    {id:'shared',date:'2026-07-02',score:70}
  ])));
  const backup={schemaVersion:3,entries:[{id:'shared',date:'2026-07-02',score:80},{id:'incoming',date:'2026-07-03',score:90}]};
  await page.locator('#importFile').setInputFiles({name:'replace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  const protocol=page.locator('[data-import-domain="protocol"]');
  await protocol.locator('[data-import-mode]').selectOption('keep');
  await expect(page.locator('#confirmImportBtn')).toBeDisabled();
  await protocol.locator('[data-import-mode]').selectOption('replace');
  await expect(page.locator('#importPreviewRemoved')).not.toHaveText('0');
  await expect(page.locator('#importReplaceWarning')).toContainText('no están en el archivo');
  await page.locator('#confirmImportBtn').click();
  await expect(page.locator('#importPreviewBackdrop')).toBeHidden();
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1')));
  expect(result.map(item=>item.id).sort()).toEqual(['incoming','shared']);
  expect(result.find(item=>item.id==='shared').score).toBe(80);
});

test('el diálogo cabe a 320 px y devuelve el foco al acceso que lo abrió',async ({page})=>{
  await page.setViewportSize({width:320,height:568});
  await clean(page);
  const trigger=page.locator('#settingsImportBtn'),chooserPromise=page.waitForEvent('filechooser');
  await trigger.click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'responsive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:3,entries:[{id:'one',date:'2026-07-01',score:75}],nutritionEntries:[{id:'food',name:'Arroz'}]}))});
  await expect(page.locator('#importPreviewBackdrop')).toBeVisible();
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth-window.innerWidth,dialog:document.querySelector('#importPreviewBackdrop .actionModal').scrollWidth-document.querySelector('#importPreviewBackdrop .actionModal').clientWidth}));
  expect(overflow.document).toBeLessThanOrEqual(0);
  expect(overflow.dialog).toBeLessThanOrEqual(0);
  await page.locator('#cancelImportBtn').click();
  await expect(trigger).toBeFocused();
});
