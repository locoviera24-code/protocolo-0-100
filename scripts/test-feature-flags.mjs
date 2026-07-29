import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const values=new Map();
const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
const writes=[];
const window={localStorage,APP_DATA:{read:(key,fallback)=>values.has(key)?JSON.parse(values.get(key)):fallback,write:(key,value)=>{values.set(key,JSON.stringify(value));writes.push({key,value});}},dispatchEvent(){}};
const context=vm.createContext({window,localStorage,console,JSON,Object,Array,Set,Map,String,Number,Boolean,CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}});
vm.runInContext(fs.readFileSync('app/feature-flags.js','utf8'),context);

const flags=window.APP_FEATURE_FLAGS;
assert.deepEqual({...flags.all()},{schemaVersion:1,nativeWorkoutControlsV1:false,lockScreenWorkoutControls:false,nativeRestTimer:false,multiPartyWorkoutSharing:false});
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),false);
flags.set({nativeWorkoutControlsV1:true,unknownFlag:true});
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),true);
assert.equal(Object.hasOwn(flags.all(),'unknownFlag'),false);
assert.equal(writes.length,1);
flags.reset();
assert.equal(flags.isEnabled('nativeWorkoutControlsV1'),false);
console.log('Feature flags correctas: defaults apagados, persistencia versionada, allowlist y rollback.');
