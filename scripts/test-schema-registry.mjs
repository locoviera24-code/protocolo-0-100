import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const values=new Map();
const localStorage={
  get length(){return values.size;},
  key:index=>[...values.keys()][index]??null,
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key)
};
const window={localStorage,indexedDB:null,navigator:{},addEventListener(){},dispatchEvent(){},setTimeout};
const context=vm.createContext({window,localStorage,console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,Set,Map,String,Number,RegExp,Promise,Error,CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}});
vm.runInContext(fs.readFileSync('data/schema-registry.js','utf8'),context);
const registry=window.APP_SCHEMA_REGISTRY,records=registry.all();

assert.ok(records.length>=50,'El registro debe cubrir todos los dominios persistidos actuales');
assert.equal(new Set(records.map(record=>record.key)).size,records.length,'Cada clave debe pertenecer a un solo registro');
for(const record of records){
  for(const property of ['key','name','domain','schemaVersion','defaultValue','validator','migration','backup','sensitive','storageMode','mirrorEnabled','primaryEligible','primaryGroup','resetGroup','retention','legacyKeys'])assert.ok(Object.hasOwn(record,property),`Falta ${property} en ${record.key}`);
  if(record.backup&&!record.sensitive)assert.ok(record.backupField,`Falta backupField en ${record.key}`);
  if(record.sensitive)assert.equal(record.backup,false,`Una clave sensible no puede entrar en backup: ${record.key}`);
}
const equipment=registry.get('protocolo_0_100_equipment_profiles_v1');
assert.equal(equipment.domain,'workout');
assert.equal(equipment.backupField,'equipmentProfiles');
assert.ok(registry.domainKeys({mirrorOnly:true}).workout.includes(equipment.key));
assert.equal(registry.get('protocolo_0_100_recipes_v1').domain,'nutrition');
assert.equal(registry.get('protocolo_0_100_food_portions_v1').domain,'nutrition');
assert.notEqual(registry.get('protocolo_0_100_cached_fdc_foods_v1').retention,'indefinite');
assert.notEqual(registry.get('protocolo_0_100_fdc_search_cache_v1').retention,'indefinite');
assert.equal(registry.get('protocolo_0_100_cached_fdc_foods_v1').primaryEligible,true);
assert.equal(registry.get('protocolo_0_100_fdc_search_cache_v1').primaryEligible,true);
assert.equal(registry.get('protocolo_0_100_cached_fdc_foods_v1').primaryGroup,'nutritionCache');
assert.equal(registry.get('protocolo_0_100_fdc_search_cache_v1').primaryGroup,'nutritionCache');
assert.deepEqual([...registry.primaryGroupKeys().nutritionCache],['protocolo_0_100_cached_fdc_foods_v1','protocolo_0_100_fdc_search_cache_v1']);
assert.deepEqual([...registry.primaryGroupKeys().gymParty],[
  'protocolo_0_100_gym_party_settings_v1',
  'protocolo_0_100_gym_party_membership_v1',
  'protocolo_0_100_shared_workout_sessions_v1',
  'protocolo_0_100_shared_workout_sets_v1',
  'protocolo_0_100_gym_party_sync_queue_v1',
  'protocolo_0_100_last_gym_party_sync_at_v1',
  'protocolo_0_100_gym_party_last_remote_sync_at_v1',
  'protocolo_0_100_gym_party_demo_data_v1'
]);
assert.ok(registry.domainKeys({primaryOnly:true}).nutrition.includes('protocolo_0_100_nutrition_entries_v1'));
assert.ok(registry.get('protocolo_0_100_workout_sessions_v1').legacyKeys.includes('protocolo_0_100_gym_sessions_v1'));
assert.equal(registry.validate('protocolo_0_100_workout_sessions_v1',[]).status,'valid');
assert.equal(registry.validate('protocolo_0_100_workout_sessions_v1',{}).status,'corrupt');
assert.equal(registry.validate('protocolo_0_100_unknown_v1',{}).status,'unsupported');

function sourceFiles(directory='.'){
  const ignored=new Set(['.git','android-native-wrapper','dist-pages','node_modules','test-results','playwright-report','scripts','tests']);
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>{
    if(ignored.has(item.name))return[];
    const path=directory==='.'?item.name:`${directory}/${item.name}`;
    if(item.isDirectory())return sourceFiles(path);
    return /\.(?:html|js)$/.test(item.name)&&path!=='data/schema-registry.js'?[path]:[];
  });
}
const referenced=new Set(sourceFiles().flatMap(file=>fs.readFileSync(file,'utf8').match(/protocolo_0_100_[a-z0-9_]+_v\d+/g)||[]));
referenced.delete('protocolo_0_100_data_changes_v1');
for(const key of referenced)assert.ok(registry.get(key),`Clave usada fuera del registro: ${key}`);

vm.runInContext(fs.readFileSync('data/indexeddb.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/repositories.js','utf8'),context);
assert.ok(window.APP_DATA.DOMAIN_KEYS.workout.includes('protocolo_0_100_equipment_profiles_v1'));
for(const repository of Object.values(window.APP_REPOSITORIES).filter(value=>value&&Array.isArray(value.allowedKeys))){
  for(const key of repository.allowedKeys)assert.ok(registry.get(key),`Repositorio usa clave no registrada: ${key}`);
}
assert.throws(()=>window.APP_DATA.write('protocolo_0_100_unknown_v1',{}),/no registrada/);
assert.equal(window.APP_REPOSITORIES.workout.keys.equipmentProfiles,'protocolo_0_100_equipment_profiles_v1');
assert.equal(window.APP_REPOSITORIES.gymParty.keys.syncQueue,'protocolo_0_100_gym_party_sync_queue_v1');
assert.equal(window.APP_DATA.config().primaryDomains.gymParty,true);

const html=fs.readFileSync('index.html','utf8'),sync=fs.readFileSync('scripts/sync-web-assets.ps1','utf8'),precache=fs.readFileSync('precache-manifest.js','utf8');
assert.ok(html.indexOf('data/schema-registry.js')<html.indexOf('data/indexeddb.js'));
assert.ok(sync.includes("'data/schema-registry.js'"));
assert.ok(precache.includes('"url": "./data/schema-registry.js"'));
console.log(`Registro de schemas correcto: ${records.length} claves con dominio, backup, sensibilidad, retencion y storage definidos.`);
