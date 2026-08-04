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
vm.runInContext(fs.readFileSync('app/data-events.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/indexeddb.js','utf8'),context);

const data=window.APP_DATA,registry=window.APP_SCHEMA_REGISTRY;
const sessions=registry.getByName('workout','sessions').key;
const equipment=registry.getByName('workout','equipmentProfiles').key;
const recipes=registry.getByName('nutrition','recipes').key;
const versionedState=registry.getByName('backup','versionedState').key;

assert.equal(data.readResult(sessions).status,'missing');
localStorage.setItem(sessions,'[]');
assert.equal(data.readResult(sessions).status,'valid');
localStorage.setItem(sessions,'[');
assert.equal(data.readResult(sessions,{quarantine:false}).status,'corrupt');
assert.deepEqual(data.read(sessions,[]),[],'La API compatible conserva fallback, pero la lectura estructurada expone corrupcion.');
localStorage.setItem(versionedState,JSON.stringify({schemaVersion:2,entries:[]}));
assert.equal(data.readResult(versionedState,{quarantine:false}).status,'legacy');
localStorage.setItem(versionedState,JSON.stringify({schemaVersion:99,entries:[]}));
assert.equal(data.readResult(versionedState,{quarantine:false}).status,'unsupported');
assert.equal(data.inspectRaw(equipment,JSON.stringify([{id:'barbell'}])).status,'valid');
assert.equal(data.inspectRaw(equipment,JSON.stringify([null])).status,'corrupt');
assert.equal(data.inspectRaw(recipes,JSON.stringify([{id:'recipe-1',name:'Tortilla'}])).status,'valid');
assert.equal(data.inspectRaw(recipes,JSON.stringify({id:'recipe-1'})).status,'corrupt');
assert.throws(()=>data.write(sessions,{}),/Datos invalidos/);
assert.throws(()=>data.write('protocolo_0_100_unknown_v1',{}),/no registrada/);

for(const contract of ['QUARANTINE_STORE','captureQuarantine','quarantineList','quarantineRestore','quarantineExport','review-needed'])assert.ok(fs.readFileSync('data/indexeddb.js','utf8').includes(contract),`Falta contrato de integridad: ${contract}`);
console.log('Integridad correcta: estados estructurados, schemas futuros, legacy, validacion de escritura y cuarentena recuperable.');
