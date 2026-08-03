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
    addEventListener('app-data-change',event=>window.__dataEvents.push(event.detail));
  });
  await page.evaluate(()=>window.APP_REPOSITORIES.protocol.set('protocolo_0_100_tracker_v1',[{date:'2026-07-11',score:82,note:'actualizado'}]));
  await expect.poll(()=>second.evaluate(()=>window.__dataEvents.find(event=>event.domain==='protocol')||null)).not.toBeNull();
  const detail=await second.evaluate(()=>window.__dataEvents.find(event=>event.domain==='protocol'));
  expect(detail).toMatchObject({domain:'protocol',operation:'update',entityId:null});
  expect(detail.occurredAt).toMatch(/Z$/);
  expect(Object.keys(detail).sort()).toEqual(['domain','entityId','occurredAt','operation'].sort());
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

test('borrar todos espera la inicializacion y no permite que una escritura pendiente reaparezca',async ({page})=>{
  await page.goto('/index.html');
  const result=await page.evaluate(async()=>{
    const key=window.APP_SCHEMA_REGISTRY.getByName('gymParty','syncQueue').key;
    window.APP_DATA.write(key,[{id:'pending-before-clear',pendingSync:true}]);
    await window.APP_DATA.clearAllData();
    await window.APP_DATA.flush();
    return{
      local:localStorage.getItem(key),
      active:window.APP_DATA.readResult(key),
      indexed:await window.APP_DATA.readIndexedResult(key)
    };
  });
  expect(result.local).toBeNull();
  expect(result.active.status).toBe('missing');
  expect(result.indexed.status).toBe('missing');
});
