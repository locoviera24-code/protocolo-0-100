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
  await expect(page.locator('#toast')).toContainText('posterior');
  await expect(page.locator('#importPreviewBackdrop')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1'))[0].score)).toBe(77);
});
