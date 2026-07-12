import {test,expect} from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('protocolo_0_100_tracker_v1',JSON.stringify([{date:'2026-07-11',score:81,note:'dato previo'}]));
    localStorage.setItem('protocolo_0_100_workout_sessions_v1',JSON.stringify([{id:'existing-session',date:'2026-07-11',exercises:[]}]));
  });
  await page.goto('/?module=more&view=data');
});

test('migra por dominio sin retirar las claves historicas',async ({page})=>{
  const result=await page.evaluate(async ()=>{
    await window.APP_DATA.ready();
    const local=JSON.parse(localStorage.getItem('protocolo_0_100_tracker_v1'));
    const indexed=await window.APP_REPOSITORIES.protocol.getAsync('protocolo_0_100_tracker_v1',[]);
    const first=await window.APP_DATA.migrateDomain('protocol');
    const second=await window.APP_DATA.migrateDomain('protocol');
    const diagnostics=await window.APP_DATA.diagnostics();
    return {local,indexed,first,second,diagnostics};
  });
  expect(result.local[0].score).toBe(81);
  expect(result.indexed[0].note).toBe('dato previo');
  expect(result.first.completedAt).toBe(result.second.completedAt);
  expect(result.diagnostics.domains.protocol.status).toBe('complete');
  await expect(page.locator('#indexedDbStatus')).toHaveText('Lista');
});

test('replica escrituras nuevas y revierte una transaccion invalida',async ({page})=>{
  const result=await page.evaluate(async ()=>{
    await window.APP_DATA.ready();
    const key='protocolo_0_100_nutrition_entries_v1';
    window.__dataError=null;
    addEventListener('app-data-error',event=>{window.__dataError=event.detail;},{once:true});
    window.APP_REPOSITORIES.nutrition.set(key,[{id:'meal-safe',name:'Arroz'}]);
    await window.APP_DATA.flush();
    const indexed=await window.APP_REPOSITORIES.nutrition.getAsync(key,[]);
    const cyclic={id:'invalid'};cyclic.self=cyclic;
    const transaction=await window.APP_DATA.replaceMany({[key]:cyclic},{reason:'test-invalid-import'});
    return {indexed,transaction,local:JSON.parse(localStorage.getItem(key)),dataError:window.__dataError};
  });
  expect(result.indexed).toEqual([{id:'meal-safe',name:'Arroz'}]);
  expect(result.transaction.ok).toBe(false);
  expect(result.local).toEqual([{id:'meal-safe',name:'Arroz'}]);
  expect(result.dataError.userMessage).toContain('Tus datos existentes no se borraron');
  expect(result.dataError).not.toHaveProperty('value');
});

test('avisa cambios entre dos pestanas sin compartir el contenido',async ({context,page})=>{
  const second=await context.newPage();
  await second.goto('/?module=home&view=register');
  await Promise.all([page.evaluate(()=>window.APP_DATA.ready()),second.evaluate(()=>window.APP_DATA.ready())]);
  await second.evaluate(()=>{
    window.__dataEvents=[];
    addEventListener('app-data-change',event=>{
      if(event.detail?.source!=='local')window.__dataEvents.push(event.detail);
    });
  });
  await page.evaluate(()=>window.APP_REPOSITORIES.settings.setByName('uiPreferences',{density:'compact'}));
  await expect.poll(()=>second.evaluate(()=>window.__dataEvents.find(event=>event.key==='protocolo_0_100_ui_preferences_v1')||null)).not.toBeNull();
  const detail=await second.evaluate(()=>window.__dataEvents.find(event=>event.key==='protocolo_0_100_ui_preferences_v1'));
  expect(detail).toMatchObject({domain:'settings'});
  expect(detail).not.toHaveProperty('value');
});

test('excluye Firebase del espejo y purga copias internas al borrar',async ({page})=>{
  const result=await page.evaluate(async ()=>{
    await window.APP_DATA.ready();
    const key='protocolo_0_100_gym_party_settings_v1';
    window.APP_DATA.write(key,{backendMode:'firebase',firebaseConfig:{apiKey:'public-test-key'},localParties:{}});
    await window.APP_DATA.flush();
    const localBefore=JSON.parse(localStorage.getItem(key));
    const indexedBefore=await window.APP_DATA.readIndexed(key,null);
    await window.APP_DATA.purgeKeys([key]);
    const indexedAfter=await window.APP_DATA.readIndexed(key,null);
    return {localBefore,indexedBefore,indexedAfter,localAfter:localStorage.getItem(key)};
  });
  expect(result.localBefore.firebaseConfig.apiKey).toBe('public-test-key');
  expect(result.indexedBefore).not.toHaveProperty('firebaseConfig');
  expect(result.localAfter).toBeNull();
  expect(result.indexedAfter).toBeNull();
});
