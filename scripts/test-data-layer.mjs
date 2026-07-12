import fs from 'node:fs';
import assert from 'node:assert/strict';

const indexed=fs.readFileSync('data/indexeddb.js','utf8');
const repositories=fs.readFileSync('data/repositories.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const sync=fs.readFileSync('scripts/sync-web-assets.ps1','utf8');
const deploy=fs.readFileSync('.github/workflows/deploy-pages.yml','utf8');

for(const contract of ['protocolo_0_100_data',"mode:'shadow'",'createRecoverySnapshot','restoreRecovery','replaceMany','purgeKeys','clearAllData','sanitizeRawForMirror','QuotaExceededError','BroadcastChannel','app-data-change','app-data-error']){
  assert.ok(indexed.includes(contract),`Falta contrato de datos: ${contract}`);
}
for(const repository of ['ProtocolRepository','WorkoutRepository','NutritionRepository','GymPartyLocalRepository','SettingsRepository','BackupRepository']){
  assert.ok(repositories.includes(`class ${repository}`),`Falta ${repository}`);
}
assert.ok(!indexed.includes('protocolo_0_100_fdc_config_v1'),'La configuracion FDC no debe copiarse a IndexedDB.');
assert.ok(!indexed.includes('firebaseConfig.js'),'La configuracion Firebase no debe copiarse a IndexedDB.');
assert.ok(html.indexOf('data/indexeddb.js')<html.indexOf('fdc-client.js'),'La capa de datos debe cargar antes de los consumidores.');
assert.ok(html.includes('APP_REPOSITORIES?.protocol.get'),'El protocolo no usa el repositorio compatible.');
for(const asset of ['data/indexeddb.js','data/repositories.js','data/backup-service.js']){
  assert.ok(sw.includes(`'./${asset}'`),`Service worker no incluye ${asset}`);
  assert.ok(sync.includes(`'${asset}'`),`Android no sincroniza ${asset}`);
  assert.ok(deploy.includes('data/*.js'),`Pages no publica ${asset}`);
}
console.log('Capa de datos correcta: repositorios por dominio, espejo IndexedDB, recuperacion y coordinacion entre pestanas.');
