import {test,expect} from '@playwright/test';
import {waitForAppReady} from './helpers/app-ready.mjs';

async function clean(page,path='/index.html'){
  await page.goto('/index.html');await waitForAppReady(page);
  await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();await window.APP_DATA.clearAllData();});
  await page.goto(path);await waitForAppReady(page);
}

test('Acerca de distingue navegador, PWA y APK sin afirmar una instalacion desconocida',async({page})=>{
  await clean(page,'/index.html?module=more&view=about');
  await expect(page.getByRole('heading',{name:'Qué funciona en cada versión'})).toBeVisible();
  await expect(page.locator('#platformCapabilitiesTable')).toContainText('Widget');
  await expect(page.locator('#platformCapabilitiesTable')).toContainText('Solo APK');
  await expect(page.locator('#platformCapabilitiesTable')).toContainText('En desarrollo');
  await expect(page.locator('#platformInstallationStatus')).toHaveText(/No se puede comprobar|Podés instalarla|Ejecutándose/);
  const capabilities=await page.evaluate(()=>window.APP_PLATFORM_CAPABILITIES.detect());
  expect(['browser','standalone-pwa','android-apk']).toContain(capabilities.runtimeMode);
  expect(['running-installed','install-available','unknown']).toContain(capabilities.installationStatus);
});

test('Experimental permanece inerte al abrirse y no concede recompensas anteriores al activarse',async({page})=>{
  await clean(page);
  await page.evaluate(async()=>{
    const today=new Date().toISOString().slice(0,10);
    const preferencesKey='protocolo_0_100_ui_preferences_v1',protocolKey='protocolo_0_100_tracker_v1';
    window.APP_REPOSITORIES.forKey(preferencesKey).set(preferencesKey,{appearance:'dark',sentinel:1});
    window.APP_REPOSITORIES.forKey(protocolKey).set(protocolKey,[{date:today,day:1,score:80,readingMins:25}]);
    localStorage.setItem('protocolo_0_100_coin_ledger_v1',JSON.stringify([{id:'preserved',date:today,amount:7,reason:'Anterior'}]));
    await window.APP_DATA.flush();
  });
  await page.goto('/index.html?module=more&view=experimental');await waitForAppReady(page);
  await expect(page.locator('#experimentalFeaturesContent')).toBeHidden();
  let state=await page.evaluate(()=>({
    preferences:JSON.parse(localStorage.getItem('protocolo_0_100_ui_preferences_v1')),
    ledger:JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1'))
  }));
  expect(state.preferences).toEqual({appearance:'dark',sentinel:1});
  expect(state.ledger).toHaveLength(1);
  await expect(page.locator('#experimentalLegacyDecision')).toBeVisible();
  await page.getByRole('button',{name:'Seguir usando funciones experimentales'}).click();
  await expect(page.locator('#experimentalFeaturesContent')).toBeVisible();
  state=await page.evaluate(()=>({
    preferences:JSON.parse(localStorage.getItem('protocolo_0_100_ui_preferences_v1')),
    ledger:JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1'))
  }));
  expect(state.preferences.experimentalFeaturesEnabled).toBe(true);
  expect(state.preferences.experimentalFeaturesEnabledAt).toMatch(/Z$/);
  expect(state.preferences.experimentalRewardBaselineIds).toBeUndefined();
  expect(state.ledger).toHaveLength(1);
});

test('Experimental nuevo no escribe al leer y una pausa explicita conserva el historial',async({page})=>{
  await clean(page,'/index.html?module=more&view=experimental');
  const before=await page.evaluate(()=>localStorage.getItem('protocolo_0_100_ui_preferences_v1'));
  await expect(page.locator('#experimentalFeaturesContent')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('protocolo_0_100_ui_preferences_v1'))).toBe(before);
  await page.evaluate(()=>localStorage.setItem('protocolo_0_100_coin_ledger_v1',JSON.stringify([{id:'legacy',date:'2026-01-01',amount:5,reason:'Anterior'}])));
  await page.reload();await waitForAppReady(page);
  await page.getByRole('button',{name:'Mantenerlas pausadas'}).click();
  const state=await page.evaluate(()=>(
    {preferences:JSON.parse(localStorage.getItem('protocolo_0_100_ui_preferences_v1')),ledger:JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1'))}
  ));
  expect(state.preferences.experimentalFeaturesEnabled).toBe(false);
  expect(state.ledger).toEqual([{id:'legacy',date:'2026-01-01',amount:5,reason:'Anterior'}]);
});

test('Experimental activado incorpora eventos futuros una sola vez',async({page})=>{
  await clean(page,'/index.html?module=more&view=experimental');
  await page.locator('#experimentalFeaturesEnabled').check();
  const future=await page.evaluate(()=>{const date=new Date();date.setDate(date.getDate()+1);return date.toISOString().slice(0,10);});
  await page.evaluate(date=>window.APP_REPOSITORIES.protocol.set('protocolo_0_100_tracker_v1',[{date,day:1,score:80,readingMins:25}]),future);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')||'[]').length)).toBeGreaterThan(0);
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')));
  await page.evaluate(date=>window.APP_REPOSITORIES.protocol.set('protocolo_0_100_tracker_v1',[{date,day:1,score:80,readingMins:25}]),future);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')||'[]').length)).toBe(first.length);
  const ids=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')).map(item=>item.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('Experimental incorpora un evento posterior del mismo dia sin recalcular datos anteriores',async({page})=>{
  await clean(page,'/index.html?module=more&view=experimental');
  await page.locator('#experimentalFeaturesEnabled').check();
  const state=await page.evaluate(()=>{
    const preferences=JSON.parse(localStorage.getItem('protocolo_0_100_ui_preferences_v1'));
    const enabledAt=new Date(preferences.experimentalFeaturesEnabledAt),savedAt=new Date(enabledAt.getTime()+1000).toISOString(),date=enabledAt.toISOString().slice(0,10);
    window.APP_REPOSITORIES.protocol.set('protocolo_0_100_tracker_v1',[{date,day:1,score:80,readingMins:25,savedAt}]);
    return{date};
  });
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')||'[]').filter(item=>item.id.startsWith('day-')).length)).toBe(1);
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('protocolo_0_100_coin_ledger_v1')));
  expect(ledger.some(item=>item.id===`day-${state.date}`)).toBe(true);
  expect(ledger.every(item=>item.occurredAt===undefined)).toBe(true);
});

test('Progreso renderiza bajo demanda e invalida por dominio',async({page})=>{
  await clean(page,'/index.html?module=progress&view=overview');
  let state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.overview.rendered).toBe(true);
  expect(state.gym.rendered).toBe(false);
  expect(state.nutrition.rendered).toBe(false);
  await page.evaluate(()=>window.APP_ROUTER.navigate({module:'progress',view:'gym'}));
  await expect(page.locator('#progressGymHeading')).toBeFocused();
  state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.gym.rendered).toBe(true);expect(state.gym.dirty).toBe(false);
  await page.evaluate(()=>window.APP_DATA_EVENTS.emit({domain:'nutrition',operation:'create',entityId:'meal-1'}));
  state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.nutrition.dirty).toBe(true);expect(state.history.dirty).toBe(true);
  await page.evaluate(()=>window.APP_ROUTER.navigate({module:'progress',view:'nutrition'}));
  await expect(page.locator('#progressNutritionHeading')).toBeFocused();
  state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.nutrition.rendered).toBe(true);expect(state.nutrition.dirty).toBe(false);
  await page.evaluate(()=>window.APP_DATA_EVENTS.emit({domain:'import',operation:'restore',entityId:null}));
  state=await page.evaluate(()=>window.PROGRESS_VIEW.state());
  expect(state.overview.dirty).toBe(true);expect(state.gym.dirty).toBe(true);expect(state.history.dirty).toBe(true);
});

test('Funciones experimentales se navega con teclado y conserva foco accesible',async({page})=>{
  await clean(page,'/index.html?module=more&view=root');
  const experimental=page.getByRole('button',{name:/Funciones experimentales/});
  await experimental.focus();await expect(experimental).toBeFocused();
  await experimental.press('Enter');
  await expect(page).toHaveURL(/module=more&view=experimental/);
  await expect(page.locator('#experimentalViewTitle')).toBeFocused();
  await page.locator('#experimentalFeaturesEnabled').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#experimentalFeaturesEnabled')).toBeChecked();
});

test('Acceso rapido explica shortcut, APK y controles pendientes',async({page})=>{
  await clean(page,'/index.html?module=gym&view=routine');
  const section=page.locator('.workoutQuickAccess');
  await expect(section).toContainText('Serie rápida');
  await expect(section).toContainText('Requiere el APK Android');
  await expect(section).toContainText('En desarrollo para el APK Android');
  await expect(section).toContainText('pendiente de integración y validación física');
  await expect(section).not.toContainText('puente Android');
  await expect(section).not.toContainText('widget interno');
});

test('Gym movil prioriza Entrenar antes del resumen',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await clean(page,'/index.html?module=gym&view=train');
  const quick=page.locator('#quickSetLoggerPanel'),summary=page.locator('.gymSummaryDetails');
  await expect(quick).toBeVisible();
  const positions=await page.evaluate(()=>({
    quick:document.getElementById('quickSetLoggerPanel')?.getBoundingClientRect().top,
    summary:document.querySelector('.gymSummaryDetails')?.getBoundingClientRect().top,
    save:document.getElementById('saveQuickSetBtn')?.getBoundingClientRect().top
  }));
  expect(positions.quick).toBeLessThan(positions.summary);
  expect(positions.quick).toBeLessThan(220);
  expect(positions.save).toBeLessThan(844);
  await expect(summary).not.toHaveAttribute('open','');
});
