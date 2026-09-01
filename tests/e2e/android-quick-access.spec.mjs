import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.clear());
});

test('la web explica el requisito APK sin mostrar diagnostico tecnico',async({page})=>{
  await page.goto('/index.html?module=gym&view=routine');
  await expect(page.locator('#workoutQuickAccessTitle')).toContainText('Acceso rápido durante el entrenamiento');
  await expect(page.locator('#workoutWidgetInstallStatus')).toContainText('Requiere el APK Android');
  await expect(page.locator('#workoutLockScreenStatus')).toContainText('No disponible en esta versión. Requiere el APK Android.');
  await expect(page.locator('#workoutNotificationStatus')).toContainText('No disponible en esta versión. Requiere el APK Android.');
  await expect(page.locator('#addWorkoutWidgetBtn')).toBeDisabled();
  await expect(page.locator('#enableWorkoutControlsBtn')).toBeDisabled();
  await expect(page.locator('#workoutConfigPanel')).not.toContainText('Puente Android');
  await expect(page.locator('#workoutConfigPanel')).not.toContainText('widget interno/nativo');
});

test('ajustes de rutina y acceso rapido no superponen controles en movil',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html?module=gym&view=routine');

  const access=page.locator('.workoutQuickAccess');
  if(!(await access.evaluate(element=>element.open)))await access.locator(':scope > summary').click();
  const accessItems=access.locator('.workoutQuickAccessItem');
  await expect(accessItems).toHaveCount(4);
  for(const item of await accessItems.all()){
    const box=await item.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x||0)+(box?.width||0)).toBeLessThanOrEqual(390);
    const textRows=await item.locator(':scope > div > strong, :scope > div > span').evaluateAll(elements=>elements.map(element=>{
      const rect=element.getBoundingClientRect();
      return{top:rect.top,bottom:rect.bottom};
    }));
    for(let index=1;index<textRows.length;index+=1)expect(textRows[index].top).toBeGreaterThanOrEqual(textRows[index-1].bottom);
  }

  const config=page.locator('#workoutConfigPanel details.planAdvancedEditor').first();
  if(!(await config.evaluate(element=>element.open)))await config.locator(':scope > summary').click();
  const checks=config.locator(':scope > .formGrid > label.check');
  expect(await checks.count()).toBeGreaterThanOrEqual(4);
  const boxes=await checks.evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    const text=element.querySelector('span')?.getBoundingClientRect();
    return{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,textRight:text?.right||0};
  }));
  for(let index=0;index<boxes.length;index+=1){
    expect(boxes[index].left).toBeGreaterThanOrEqual(0);
    expect(boxes[index].right).toBeLessThanOrEqual(390);
    expect(boxes[index].textRight).toBeLessThanOrEqual(boxes[index].right);
    if(index>0)expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index-1].bottom);
  }
});

test('el APK simulado instala y activa controles solo desde acciones explicitas',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-08-17T15:00:00.000Z'));
  await page.addInitScript(()=>{
    window.__quickAccessCalls={pin:0,permission:0,saves:0,states:[]};
    window.AndroidBridge={
      getAppInfo:()=>JSON.stringify({versionName:'2.7.0',versionCode:39}),
      getWorkoutQuickAccessCapabilities:()=>JSON.stringify({platform:'android-apk',widgetInstances:0,pinWidgetSupported:true,notificationPermission:'prompt'}),
      getWorkoutWidgetStatus:()=>JSON.stringify({code:'widget-not-added',instances:0,notificationCode:'waiting-for-session',queue:{pending:0,rejected:0}}),
      requestPinWorkoutWidget:()=>{window.__quickAccessCalls.pin++;return JSON.stringify({ok:true,code:'pin-requested'});},
      requestWorkoutNotificationPermission:()=>{window.__quickAccessCalls.permission++;return'requested';},
      saveWorkoutWidgetData:json=>{window.__quickAccessCalls.saves++;window.__quickAccessCalls.states.push(JSON.parse(json));},
      updateWorkoutWidget:()=>{}
    };
  });
  await page.goto('/index.html?module=gym&view=routine');
  await expect(page.locator('#workoutWidgetInstallStatus')).toContainText('Widget no agregado');
  await expect(page.locator('#workoutLockScreenStatus')).toContainText('Controles activados');
  await expect(page.locator('#workoutNotificationStatus')).toContainText('Controles preparados');
  await expect(page.locator('#nativeWorkoutLiveBar')).toBeVisible();
  await page.locator('#addWorkoutWidgetBtn').click();
  await page.locator('#enableWorkoutControlsBtn').click();
  const result=await page.evaluate(()=>({calls:window.__quickAccessCalls,flags:window.APP_FEATURE_FLAGS.all()}));
  expect(result.calls.pin).toBe(1);
  expect(result.calls.permission).toBe(1);
  expect(result.calls.saves).toBeGreaterThan(0);
  expect(result.flags.nativeWorkoutControlsV1).toBe(true);
  expect(result.flags.nativeRestTimer).toBe(true);
  expect(result.flags.lockScreenWorkoutControls).toBe(true);

  await page.locator('#startTodayWorkoutBtn').click();
  const active=await page.evaluate(()=>window.__quickAccessCalls.states.at(-1));
  expect(active.status).toBe('en progreso');
  expect(active.workoutSession?.status).toBe('en progreso');
});

test('el registro mantiene paso de 0,5, ofrece paso rapido y cambia ejercicio directamente',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html?module=gym&view=train');
  await expect(page.locator('.gymSummaryDetails')).not.toHaveAttribute('open','');
  const start=page.locator('#startTodayWorkoutBtn');
  if(await start.isVisible()&&await start.isEnabled())await start.click();
  const exercise=page.locator('#quickExerciseSelect');
  await expect(exercise).toBeVisible();
  await expect(exercise).toBeEnabled();
  await exercise.selectOption({label:'Press de banca'});
  await expect(exercise.locator('option:checked')).toHaveText('Press de banca');

  const weight=page.locator('#quickWeight');
  await weight.fill('0');
  await expect(page.locator('.quickWeightControls button')).toHaveCount(4);
  await page.locator('[data-quick-adjust="weight:0.5"]').click();
  await expect(weight).toHaveValue('0.5');
  await page.locator('[data-quick-adjust="weight:-0.5"]').click();
  await expect(weight).toHaveValue('0');
  await page.locator('[data-quick-adjust="weight:5"]').click();
  await expect(weight).toHaveValue('5');
  await page.locator('[data-quick-adjust="weight:-5"]').click();
  await expect(weight).toHaveValue('0');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  expect(await page.locator('.quickPrimaryInputs').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
});
