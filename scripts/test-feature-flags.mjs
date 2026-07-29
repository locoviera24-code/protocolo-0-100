import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadFlags(channel='development'){
  const values=new Map(),writes=[];
  const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const window={localStorage,APP_ARTIFACT_CHANNEL:channel,APP_DATA:{read:(key,fallback)=>values.has(key)?JSON.parse(values.get(key)):fallback,write:(key,value)=>{values.set(key,JSON.stringify(value));writes.push({key,value});}},dispatchEvent(){}};
  const context=vm.createContext({window,localStorage,console,JSON,Object,Array,Set,Map,String,Number,Boolean,CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}});
  vm.runInContext(fs.readFileSync('app/feature-flags.js','utf8'),context);
  return{flags:window.APP_FEATURE_FLAGS,values,writes};
}

const {flags,writes}=loadFlags();
assert.deepEqual({...flags.all()},{schemaVersion:1,nativeWorkoutControlsV1:false,lockScreenWorkoutControls:false,nativeRestTimer:false,multiPartyWorkoutSharing:false});
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),false);
flags.set({nativeWorkoutControlsV1:true,unknownFlag:true});
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),true);
assert.equal(Object.hasOwn(flags.all(),'unknownFlag'),false);
assert.equal(writes.length,1);
flags.reset();
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),false);

const beta=loadFlags('beta');
assert.deepEqual({...beta.flags.all()},{schemaVersion:1,nativeWorkoutControlsV1:true,lockScreenWorkoutControls:true,nativeRestTimer:true,multiPartyWorkoutSharing:true});
beta.flags.set({nativeWorkoutControlsV1:false,lockScreenWorkoutControls:false,nativeRestTimer:false,multiPartyWorkoutSharing:false});
assert.equal(beta.flags.isEnabled('nativeWorkoutControlsV1'),false,'Una preferencia guardada debe prevalecer sobre el default beta');

console.log('Feature flags correctas: stable apagado, beta nativo activo, persistencia versionada, allowlist y rollback.');
