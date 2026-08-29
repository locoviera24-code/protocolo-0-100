import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const styles=await readFile(new URL('../styles/modules.css',import.meta.url),'utf8');
const advanced=await readFile(new URL('../advanced-features.js',import.meta.url),'utf8');
const workout=await readFile(new URL('../workout-features.js',import.meta.url),'utf8');
const android=await readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8');
const homeStateSource=await readFile(new URL('../app/home-state.js',import.meta.url),'utf8');
const gymHomeStateSource=await readFile(new URL('../app/gym-home-state.js',import.meta.url),'utf8');
const gymHomeController=await readFile(new URL('../app/gym-home-controller.js',import.meta.url),'utf8');

for(const contract of ['gymHomeHero','gymHomeTitle','gymHomeDescription','gymHomeFacts','gymHomePrimaryAction','homeStatusCard','homeCompactScore','homeCompactState','homeCompactStreak','homeCompactPending','renderHomeStatus','data-home-state','actionNextRecommendation']){
  assert.match(html,new RegExp(contract),`Falta Inicio adaptativo: ${contract}`);
}
for(const contract of ['settingsAppearance','settingsDensity','settingsExperienceMode','settingsUnit','saveUiSettingsBtn','lastBackupAt','localStorageEstimate','data-reset-scope','resetAllDataBtn']){
  assert.match(html,new RegExp(contract),`Falta Ajustes/Datos: ${contract}`);
}
assert.match(styles,/\.homeStatusCard/);
assert.match(styles,/\.gymHomeHero/);
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
assert.match(html,/<script src="app\/gym-home-state\.js"><\/script>/,'Inicio debe cargar el selector Gym-first');
assert.match(html,/<script src="app\/gym-home-controller\.js"><\/script>/,'Inicio debe cargar el controlador Gym-first');
assert.match(gymHomeStateSource,/ACTIVE_SESSION[\s\S]*COMPLETED_TODAY[\s\S]*PLANNED_TODAY[\s\S]*REST_DAY[\s\S]*SETUP_REQUIRED/,'Falta la precedencia Gym-first');
assert.doesNotMatch(gymHomeStateSource,/localStorage|APP_DATA|WORKOUT_STORE|AndroidBridge|navigate\(/,'El selector Gym Home debe ser puro');
assert.match(gymHomeController,/openQuickSetLogger\(state\.exerciseId\)/,'ACTIVE debe reutilizar el logger existente');
assert.match(gymHomeController,/navigate\(\{module:'gym',view:'train'\}\)/,'PLANNED debe reutilizar el flujo Gym existente');
assert.match(gymHomeController,/navigate\(\{module:'progress',view:'gym'\}\)/,'COMPLETED debe abrir Progreso Gym');
assert.doesNotMatch(gymHomeController,/setItem\(|WORKOUT_STORE\?*\.write|ensureSession|saveSessions/,'Renderizar Home no debe escribir ni crear sesiones');
assert.doesNotMatch(html,/conservan su snapshot|conservarán su snapshot/,'Las vistas normales no deben usar lenguaje tecnico de snapshots');
assert.doesNotMatch(workout,/conservan un snapshot|recibir un snapshot|agregarán snapshots/,'Gym debe describir la clasificacion historica en lenguaje cotidiano');
console.log('Inicio y Ajustes correctos: portada adaptativa, preferencias, copias, reset selectivo y versión Android.');
