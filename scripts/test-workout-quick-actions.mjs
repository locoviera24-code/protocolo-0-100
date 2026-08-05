import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../gym/workout-quick-actions.js',import.meta.url),'utf8');
const appVersion=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8'));
const window={APP_VERSION_INFO:{version:appVersion.version,build:appVersion.build}};
vm.runInContext(source,vm.createContext({window,TextEncoder,Uint8Array,Date,Math,Number,String,Object,Array,Set,JSON,encodeURIComponent,console}),{filename:'gym/workout-quick-actions.js'});
const contract=window.WORKOUT_QUICK_ACTIONS;
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
let idIndex=0;
const dependencies={now:()=> '2026-08-03T12:00:00.000Z',uuid:()=>ids[idIndex++%ids.length]};
const payloads={
  ADJUST_REPS:{delta:1},ADJUST_WEIGHT:{deltaKg:.5},SAVE_SET:{setId:'set-3',values:{reps:8,weightKg:60,setType:'working'}},UNDO_SET:{setId:'set-3'},REPEAT_LAST_SET:{sourceSetId:'set-2'},PREVIOUS_EXERCISE:{},NEXT_EXERCISE:{},COMPLETE_TIME_SET:{setId:'set-time',durationSeconds:60},COMPLETE_DISTANCE_SET:{setId:'set-distance',distanceMeters:1000,durationSeconds:300}
};

for(const actionType of contract.ACTION_TYPES){
  for(const sourceName of contract.ACTION_SOURCES){
    const action=contract.createAction({actionType,source:sourceName,sessionId:'session-1',exerciseId:'press',expectedRevision:3,payload:payloads[actionType]},dependencies);
    assert.equal(contract.validateAction(action).ok,true,`${actionType}:${sourceName}`);
    assert.equal(action.schemaVersion,1);assert.equal(action.payloadVersion,1);assert.equal(action.clientVersion,`${appVersion.version}+${appVersion.build}`);assert.equal(action.actionId,undefined);
  }
}

idIndex=0;
const saved=contract.createAction({actionType:'SAVE_SET',source:'android-widget',sessionId:'session-1',exerciseId:'press',expectedRevision:3,payload:payloads.SAVE_SET},dependencies);
assert.equal(saved.mutationId,ids[0]);assert.equal(saved.createdAt,'2026-08-03T12:00:00.000Z');
const applied=contract.createResult({mutationId:saved.mutationId,status:'applied',resultingRevision:4},dependencies);
assert.equal(applied.errorCode,'OK');assert.equal(applied.resultingRevision,4);assert.equal(contract.validateResult(applied).ok,true);
for(const [status,errorCode] of [['rejected','REVISION_CONFLICT'],['ignored','DUPLICATE_MUTATION']]){
  const result=contract.createResult({mutationId:saved.mutationId,status,resultingRevision:3,errorCode,errorMessage:'Texto solo para interfaz.'},dependencies);
  assert.equal(result.appliedAt,null);assert.equal(contract.validateResult(result).ok,true);
}
for(const errorCode of contract.ERROR_CODES){
  if(errorCode==='OK')continue;
  assert.equal(contract.validateResult(contract.createResult({mutationId:saved.mutationId,status:'rejected',errorCode},dependencies)).ok,true,errorCode);
}

assert.equal(contract.validateAction({...saved,schemaVersion:2}).errorCode,'INVALID_SCHEMA');
assert.equal(contract.validateAction({...saved,payloadVersion:2}).errorCode,'INVALID_SCHEMA');
assert.equal(contract.validateAction({...saved,actionType:'SELECT_EXERCISE'}).errorCode,'UNSUPPORTED_ACTION');
assert.equal(contract.validateAction({...saved,actionId:ids[1]}).errorCode,'INVALID_PAYLOAD');
assert.equal(contract.validateAction({...saved,mutationId:'not-a-uuid'}).ok,false);
assert.equal(contract.validateAction({...saved,createdAt:'2026-08-03'}).ok,false);
assert.equal(contract.validateAction({...saved,clientVersion:'2.7.0'}).ok,false);
assert.equal(contract.validateAction({...saved,expectedRevision:-1}).ok,false);
assert.equal(contract.validateAction({...saved,payload:{setId:'x',values:{weightKg:Number.NaN}}}).errorCode,'INVALID_PAYLOAD');
assert.equal(contract.validateAction({...saved,payload:JSON.parse('{"setId":"x","values":{"__proto__":{"polluted":true}}}')}).ok,false);
assert.equal(contract.validateAction({...saved,payload:{setId:'x',values:{note:'á'.repeat(contract.MAX_PAYLOAD_BYTES)}}}).ok,false,'El limite debe medirse en bytes UTF-8');
const circular={setId:'x',values:{}};circular.values.self=circular;
assert.equal(contract.validateAction({...saved,payload:circular}).ok,false);
assert.throws(()=>contract.createAction({actionType:'SAVE_SET',sessionId:'s',exerciseId:'e',payload:circular},dependencies),error=>error.code==='INVALID_PAYLOAD');
assert.throws(()=>contract.createAction({actionType:'ADJUST_WEIGHT',sessionId:'s',exerciseId:'e',payload:{delta:.5,unit:'lb'}},dependencies),error=>error.code==='INVALID_PAYLOAD');
assert.throws(()=>contract.createResult({mutationId:saved.mutationId,status:'ignored',errorCode:'OK'},dependencies),error=>error.code==='INVALID_PAYLOAD');
assert.throws(()=>contract.createResult({mutationId:saved.mutationId,status:'rejected',errorCode:'REVISION_CONFLICT',appliedAt:dependencies.now()},dependencies),error=>error.code==='INVALID_PAYLOAD');
assert.doesNotMatch(source,/localStorage|indexedDB|APP_REPOSITORIES|APP_DATA\.write/);

console.log('Acciones rapidas correctas: nueve tipos, tres fuentes, unidades canonicas, payload seguro y resultados estables.');
