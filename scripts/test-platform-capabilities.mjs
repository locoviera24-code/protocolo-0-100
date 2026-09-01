import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app/platform-capabilities.js',import.meta.url),'utf8');

function capabilities(overrides={},options={}){
  const window={navigator:{},matchMedia:()=>({matches:false}),...overrides};
  vm.runInContext(source,vm.createContext({window}),{filename:'app/platform-capabilities.js'});
  return window.APP_PLATFORM_CAPABILITIES.detect(options);
}

const browser=capabilities();
assert.equal(browser.runtimeMode,'browser');
assert.equal(browser.installationStatus,'unknown');
assert.equal(browser.workoutWidget,'apk-only');
assert.equal(browser.workoutNotification,'apk-only');
assert.equal(browser.lockScreenControls,'apk-only');

const installable=capabilities({}, {installPromptAvailable:true});
assert.equal(installable.installationStatus,'install-available');

const standalone=capabilities({matchMedia:query=>({matches:query==='(display-mode: standalone)'})});
assert.equal(standalone.runtimeMode,'standalone-pwa');
assert.equal(standalone.installationStatus,'running-installed');
assert.equal(standalone.workoutNotification,'apk-only');
assert.equal(standalone.lockScreenControls,'apk-only');

const ios=capabilities({navigator:{standalone:true}});
assert.equal(ios.runtimeMode,'standalone-pwa');

assert.equal(capabilities({AndroidBridge:{}}).runtimeMode,'browser','Un objeto global sin el contrato nativo no identifica el APK');
assert.equal(capabilities({AndroidBridge:{getWorkoutQuickAccessCapabilities:()=>'{"platform":"android-apk"}',startWorkoutNotification:()=>{}}}).runtimeMode,'browser','Métodos parciales no identifican un APK confiable');
assert.equal(capabilities({AndroidBridge:{getAppInfo:'{"versionName":"2.7.0"}',requestWorkoutNotificationPermission:()=>{}}}).runtimeMode,'browser','getAppInfo debe ser una función nativa');
const apk=capabilities({AndroidBridge:{getAppInfo:()=>'{"versionName":"2.7.0"}'}});
assert.equal(apk.runtimeMode,'android-apk');
assert.equal(apk.installationStatus,'running-installed');
assert.equal(apk.workoutWidget,'available');
assert.equal(apk.automaticPhoneUsage,'requires-permission');
assert.equal(apk.workoutNotification,'requires-permission');
assert.equal(apk.lockScreenControls,'available');

const comparisonWindow={navigator:{},matchMedia:()=>({matches:false})};
vm.runInContext(source,vm.createContext({window:comparisonWindow}),{filename:'app/platform-capabilities.js'});
const comparison=comparisonWindow.APP_PLATFORM_CAPABILITIES.comparisonRows();
const notification=comparison.find(row=>row.key==='workoutNotification');
const lockScreen=comparison.find(row=>row.key==='lockScreenControls');
assert.deepEqual(
  {webState:notification.webState,androidState:notification.androidState,webLabel:notification.webLabel,androidLabel:notification.androidLabel},
  {webState:'apk-only',androidState:'requires-permission',webLabel:'Solo APK',androidLabel:'Disponible · puede requerir permiso'}
);
assert.deepEqual(
  {webState:lockScreen.webState,androidState:lockScreen.androidState,webLabel:lockScreen.webLabel,androidLabel:lockScreen.androidLabel},
  {webState:'apk-only',androidState:'available',webLabel:'Solo APK',androidLabel:'Disponible mediante notificación · depende del sistema'}
);
assert.equal(comparison.some(row=>row.webState==='pending'||row.androidState==='pending'),false);

console.log('Capacidades correctas: navegador, instalacion PWA, standalone y APK sin promesas falsas.');
