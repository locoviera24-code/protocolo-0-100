import {test,expect} from '@playwright/test';

test('los controles nativos exponen privacidad contextual y conservan sus ajustes',async({page})=>{
  await page.addInitScript(()=>{
    window.__nativePermission='prompt';
    window.AndroidBridge={
      workoutNotificationPermissionState(){return window.__nativePermission;},
      workoutNotificationStatus(){return JSON.stringify({channelEnabled:true,activeSession:false,activeTimer:false,visible:false});},
      requestWorkoutNotificationPermission(){
        window.__nativePermission='granted';
        window.dispatchEvent(new CustomEvent('native-workout-notification-permission',{detail:{granted:true}}));
        return'granted';
      },
      refreshWorkoutNotification(){return false;},
      saveWorkoutWidgetData(value){window.__nativeWidgetState=value;},
      updateWorkoutWidget(){return true;},
      getNativeWorkoutControlData(){return JSON.stringify({state:{timer:{timerMode:'stopwatch',timerStatus:'paused',elapsedBeforeStartMs:65000}},timerRuntime:{timerMode:'stopwatch',timerStatus:'paused',elapsedMs:65000,remainingMs:0},mutations:[]});},
      handleNativeWorkoutTimerAction(){return true;}
    };
  });
  await page.goto('/index.html');
  await page.evaluate(async()=>{
    localStorage.clear();
    sessionStorage.clear();
    await window.APP_DATA.clearAllData();
    window.APP_FEATURE_FLAGS.set({nativeWorkoutControlsV1:true,lockScreenWorkoutControls:true,nativeRestTimer:true});
  });
  await page.goto('/index.html?module=gym&view=routine');

  const settings=page.locator('#nativeWorkoutControlSettings');
  await expect(settings).toBeVisible();
  await settings.locator('summary').click();
  await page.locator('#gymNativeTimerMode').selectOption('stopwatch');
  await page.locator('#gymShowWeightLock').uncheck();
  await page.locator('#gymShowRecordLock').uncheck();
  await page.locator('#gymLockVisibility').selectOption('hidden');
  await page.getByRole('button',{name:'Activar controles en bloqueo'}).click();
  await expect(page.locator('#workoutNotificationPermissionStatus')).toContainText('Empezá un entrenamiento');

  const result=await page.evaluate(()=>({settings:window.WORKOUT_FEATURES.getGymSettings(),widget:JSON.parse(window.__nativeWidgetState||'{}')}));
  expect(result.settings.timerMode).toBe('stopwatch');
  expect(result.settings.showWeightOnLockScreen).toBe(false);
  expect(result.settings.showRecordOnLockScreen).toBe(false);
  expect(result.settings.lockScreenVisibility).toBe('hidden');
  expect(result.widget.nativeWorkoutSettings.timerMode).toBe('stopwatch');
  expect(result.widget.nativeWorkoutSettings.showWeightOnLockScreen).toBe(false);
});

test('una preferencia beta anterior desactivada se puede reactivar sin borrar datos',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('protocolo_0_100_feature_flags_v1',JSON.stringify({schemaVersion:1,nativeWorkoutControlsV1:false,lockScreenWorkoutControls:false,nativeRestTimer:false,multiPartyWorkoutSharing:false}));
    window.__nativePermission='prompt';
    window.AndroidBridge={
      workoutNotificationPermissionState(){return window.__nativePermission;},
      workoutNotificationStatus(){return JSON.stringify({channelEnabled:true,activeSession:false,activeTimer:false,visible:false});},
      requestWorkoutNotificationPermission(){window.__nativePermission='granted';window.dispatchEvent(new CustomEvent('native-workout-notification-permission'));return'requested';},
      refreshWorkoutNotification(){return false;},
      saveWorkoutWidgetData(value){window.__nativeWidgetState=value;},
      updateWorkoutWidget(){return true;},
      getNativeWorkoutControlData(){return JSON.stringify({state:{},timerRuntime:{timerStatus:'idle'},mutations:[]});},
      handleNativeWorkoutTimerAction(){return true;}
    };
  });
  await page.goto('/index.html?module=gym&view=train');

  await expect(page.getByRole('button',{name:'Controles en pantalla bloqueada'})).toBeVisible();
  await page.getByRole('button',{name:'Controles en pantalla bloqueada'}).click();
  await expect(page.locator('#workoutConfigDetails')).toHaveAttribute('open','');
  await expect(page.locator('#nativeWorkoutControlSettings')).toHaveAttribute('open','');
  await expect(page.locator('#gymNativeControlsEnabled')).not.toBeChecked();
  await page.getByRole('button',{name:'Activar controles en bloqueo'}).click();
  await expect(page.locator('#gymNativeControlsEnabled')).toBeChecked();
  await expect(page.locator('#workoutNotificationPermissionStatus')).toContainText('Empezá un entrenamiento');

  const result=await page.evaluate(()=>({flags:window.APP_FEATURE_FLAGS.all(),widget:JSON.parse(window.__nativeWidgetState||'{}')}));
  expect(result.flags.nativeWorkoutControlsV1).toBe(true);
  expect(result.flags.lockScreenWorkoutControls).toBe(true);
  expect(result.flags.nativeRestTimer).toBe(true);
  expect(result.widget.featureFlags.nativeWorkoutControlsV1).toBe(true);
});
