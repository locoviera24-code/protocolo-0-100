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
assert.equal(browser.workoutNotification,'pending');
assert.equal(browser.lockScreenControls,'pending');

const installable=capabilities({}, {installPromptAvailable:true});
assert.equal(installable.installationStatus,'install-available');

const standalone=capabilities({matchMedia:query=>({matches:query==='(display-mode: standalone)'})});
assert.equal(standalone.runtimeMode,'standalone-pwa');
assert.equal(standalone.installationStatus,'running-installed');

const ios=capabilities({navigator:{standalone:true}});
assert.equal(ios.runtimeMode,'standalone-pwa');

const apk=capabilities({AndroidBridge:{}});
assert.equal(apk.runtimeMode,'android-apk');
assert.equal(apk.installationStatus,'running-installed');
assert.equal(apk.workoutWidget,'available');
assert.equal(apk.automaticPhoneUsage,'requires-permission');

console.log('Capacidades correctas: navegador, instalacion PWA, standalone y APK sin promesas falsas.');
