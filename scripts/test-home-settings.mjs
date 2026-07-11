import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const styles=await readFile(new URL('../styles/modules.css',import.meta.url),'utf8');
const advanced=await readFile(new URL('../advanced-features.js',import.meta.url),'utf8');
const android=await readFile(new URL('../android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java',import.meta.url),'utf8');

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
console.log('Inicio y Ajustes correctos: portada adaptativa, preferencias, copias, reset selectivo y versión Android.');
