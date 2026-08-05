import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const styles=await readFile(new URL('../styles/modules.css',import.meta.url),'utf8');
const advanced=await readFile(new URL('../advanced-features.js',import.meta.url),'utf8');
const workout=await readFile(new URL('../workout-features.js',import.meta.url),'utf8');
const android=await readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8');
const homeStateSource=await readFile(new URL('../app/home-state.js',import.meta.url),'utf8');

for(const contract of ['homeStatusCard','homeCompactScore','homeCompactState','homeCompactStreak','homeCompactPending','renderHomeStatus','data-home-state','actionNextRecommendation']){
  assert.match(html,new RegExp(contract),`Falta Inicio adaptativo: ${contract}`);
}
for(const contract of ['settingsAppearance','settingsDensity','settingsExperienceMode','settingsUnit','saveUiSettingsBtn','lastBackupAt','localStorageEstimate','data-reset-scope','resetAllDataBtn']){
  assert.match(html,new RegExp(contract),`Falta Ajustes/Datos: ${contract}`);
}
assert.match(styles,/\.homeStatusCard/);
assert.match(styles,/\.actionFocus\.completed/);
assert.match(advanced,/uiPreferences:getLocalData\('protocolo_0_100_ui_preferences_v1'/);
assert.match(android,/getAppInfo\(\)/);
const homeContext={window:null};homeContext.window=homeContext;
vm.runInContext(homeStateSource,vm.createContext(homeContext),{filename:'app/home-state.js'});
const primaryAction=homeContext.HOME_STATE.primaryAction;
assert.equal(primaryAction({hasTodayRecord:false,hasDraft:false,isDirty:false,requiredMissing:['sleepHours'],isValid:false,hasStarted:false}),'start');
assert.equal(primaryAction({hasTodayRecord:false,hasDraft:false,isDirty:false,requiredMissing:['sleepHours'],isValid:false,hasStarted:true}),'continue');
assert.equal(primaryAction({hasTodayRecord:false,hasDraft:true,isDirty:true,requiredMissing:['sleepHours'],isValid:false,hasStarted:true}),'continue');
assert.equal(primaryAction({hasTodayRecord:true,hasDraft:true,isDirty:true,requiredMissing:[],isValid:true,hasStarted:true}),'save');
assert.equal(primaryAction({hasTodayRecord:true,hasDraft:false,isDirty:false,requiredMissing:[],isValid:true,hasStarted:false}),'summary');
assert.equal(primaryAction({hasTodayRecord:true,hasDraft:false,isDirty:false,requiredMissing:['sleepHours'],isValid:false,hasStarted:true,errors:['sleepHours']}),'continue');
assert.match(html,/document\.getElementById\('saveBtn'\)\.addEventListener\('click', saveCurrentDay\)/,'Ambos CTA deben compartir el mismo guardado');
assert.match(html,/navigate\(\{module:'progress',view:'overview'\}\)/,'Ver resumen debe abrir la vista real de Progreso');
assert.doesNotMatch(html,/conservan su snapshot|conservarán su snapshot/,'Las vistas normales no deben usar lenguaje tecnico de snapshots');
assert.doesNotMatch(workout,/conservan un snapshot|recibir un snapshot|agregarán snapshots/,'Gym debe describir la clasificacion historica en lenguaje cotidiano');
console.log('Inicio y Ajustes correctos: portada adaptativa, preferencias, copias, reset selectivo y versión Android.');
