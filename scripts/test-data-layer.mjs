import fs from 'node:fs';
import assert from 'node:assert/strict';

const indexed=fs.readFileSync('data/indexeddb.js','utf8');
const dataEvents=fs.readFileSync('app/data-events.js','utf8');
const repositories=fs.readFileSync('data/repositories.js','utf8');
const registry=fs.readFileSync('data/schema-registry.js','utf8');
const backup=fs.readFileSync('data/backup-service.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const precache=fs.readFileSync('precache-manifest.js','utf8');
const sync=fs.readFileSync('scripts/sync-web-assets.ps1','utf8');
const qualityGate=fs.readFileSync('.github/workflows/quality-gate.yml','utf8');

for(const contract of ['protocolo_0_100_data',"mode:'shadow'",'PRIMARY_KEYS','primaryGroupForKey','hydratePrimaryDomain','setPrimaryDomain','primaryRawCache','applyRetention','retentionPrunedCount','divergenceCount','createRecoverySnapshot','restoreRecovery','replaceMany','purgeKeys','clearAllData','sanitizeRawForMirror','QuotaExceededError','BroadcastChannel','app-data-error','compatibilityAudit','verifyCompatibility','clearCompatibilityAudit','compatibilityAuditExport','MAX_COMPATIBILITY_AUDIT_EVENTS']){
  assert.ok(indexed.includes(contract),`Falta contrato de datos: ${contract}`);
}
for(const contract of ['app-data-change','protocol','workout','nutrition','import','occurredAt'])assert.ok(dataEvents.includes(contract),`Falta evento publico de datos: ${contract}`);
for(const forbidden of ['localChecksum:','indexedChecksum:','raw:','value:']){
  const auditExport=indexed.slice(indexed.indexOf('async function compatibilityAuditExport'),indexed.indexOf('async function hydratePrimaryDomain'));
  assert.ok(!auditExport.includes(forbidden),`El diagnostico de compatibilidad expone contenido tecnico sensible: ${forbidden}`);
}
for(const repository of ['ProtocolRepository','WorkoutRepository','NutritionRepository','GymPartyLocalRepository','SettingsRepository','BackupRepository']){
  assert.ok(repositories.includes(`class ${repository}`),`Falta ${repository}`);
}
assert.ok(!indexed.includes('protocolo_0_100_fdc_config_v1'),'La configuracion FDC no debe copiarse a IndexedDB.');
assert.ok(!indexed.includes('firebaseConfig.js'),'La configuracion Firebase no debe copiarse a IndexedDB.');
assert.ok(registry.includes("entry('equipmentProfiles','protocolo_0_100_equipment_profiles_v1','workout'"),'El equipo debe pertenecer al dominio Workout.');
assert.ok(!/protocolo_0_100_[a-z0-9_]+_v\d+/.test(repositories),'Los repositorios no deben mantener otra lista manual de claves.');
const indexedWithoutCoordinationIds=indexed.replaceAll('protocolo_0_100_data_changes_v1','');
assert.ok(!/protocolo_0_100_[a-z0-9_]+_v\d+/.test(indexedWithoutCoordinationIds),'IndexedDB debe derivar claves persistidas del registro.');
assert.ok(!/protocolo_0_100_[a-z0-9_]+_v\d+/.test(backup),'BackupService debe derivar claves del registro.');
assert.ok(indexed.includes("registry.domainKeys({mirrorOnly:true})"));
assert.ok(indexed.includes('registry.primaryGroupKeys()'));
assert.ok(backup.includes('registry.backupFieldMap()'));
assert.ok(html.indexOf('data/schema-registry.js')<html.indexOf('data/indexeddb.js'),'El registro debe cargar antes de IndexedDB.');
assert.ok(html.indexOf('app/data-events.js')<html.indexOf('data/indexeddb.js'),'El contrato de cambios debe cargar antes de IndexedDB.');
assert.ok(html.indexOf('data/indexeddb.js')<html.indexOf('fdc-client.js'),'La capa de datos debe cargar antes de los consumidores.');
assert.ok(html.includes('APP_REPOSITORIES?.protocol.get'),'El protocolo no usa el repositorio compatible.');
for(const asset of ['app/data-events.js','data/schema-registry.js','data/indexeddb.js','data/repositories.js','data/backup-service.js']){
  assert.ok(precache.includes(`"url": "./${asset}"`),`Precache no incluye ${asset}`);
  assert.ok(sync.includes(`'${asset}'`),`Android no sincroniza ${asset}`);
  assert.ok(qualityGate.includes('npm run build:web'),`El quality gate no construye el artifact que contiene ${asset}`);
}
console.log('Capa de datos correcta: repositorios por dominio, espejo IndexedDB, recuperacion y coordinacion entre pestanas.');
