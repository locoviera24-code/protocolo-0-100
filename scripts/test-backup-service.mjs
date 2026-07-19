import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const storage=new Map(),events=[],transactions=[];
const window={
  APP_DATA:{
    read:(key,fallback)=>storage.has(key)?structuredClone(storage.get(key)):fallback,
    write:(key,value)=>{storage.set(key,structuredClone(value));return value;},
    replaceMany:async(changes,options)=>{transactions.push({changes,options});Object.entries(changes).forEach(([key,value])=>storage.set(key,structuredClone(value)));return {ok:true,snapshotId:'recovery-before-import'};},
    restoreRecovery:async snapshotId=>({ok:snapshotId==='recovery-before-import'})
  },
  dispatchEvent:event=>events.push(event)
};
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const context=vm.createContext({window,Blob,CustomEvent,structuredClone,console,setTimeout,Date,Math,JSON,Object,Array,Set,Map,String,Number,RegExp});
vm.runInContext(fs.readFileSync('data/backup-service.js','utf8'),context);
const service=window.BACKUP_SERVICE;

assert.throws(()=>service.prepareText(''),'vacio');
assert.throws(()=>service.prepareText('{no-json'),'JSON valido');
assert.throws(()=>service.prepareText(JSON.stringify({schemaVersion:99,entries:[]})),'posterior');
assert.throws(()=>service.prepareText(JSON.stringify({hello:'world'})),'compatible');

const legacy=service.prepareText(JSON.stringify({entries:[{date:'2026-07-12',note:'<img src=x onerror=alert(1)>\u0000'}],unknownField:'ignored',__protoField:'safe'}));
assert.equal(legacy.schemaVersion,1);
assert.equal(legacy.changes.protocolo_0_100_tracker_v1[0].note,'<img src=x onerror=alert(1)>');
assert.ok(legacy.ignored.includes('unknownField'));

const payload='{"schemaVersion":3,"entries":[],"recipes":[{"id":"recipe-1","name":"Guiso","ingredients":[]}],"foodPortions":{"rice":{"lastAmount":180,"lastUnit":"g"}},"workoutSessions":[{"id":"workout-1","exercises":[{"id":"press","muscleClassificationSnapshot":{"taxonomyVersion":3,"primaryMuscles":["chest"],"secondaryMuscles":["triceps"],"classificationStatus":"official","classificationSource":"official-library","classificationConfidence":"high","capturedAt":"2026-07-18T10:00:00.000Z"},"sets":[{"id":"set-1","setType":"warmup","completed":true,"excludeFromRecords":true}]}]}],"constructor":{"polluted":true},"gymPartySettings":{"backendMode":"firebase","firebaseConfig":{"apiKey":"omit"}}}';
const prepared=service.prepareText(payload,{fileName:'safe.json'});
assert.ok(prepared.ignored.includes('constructor'));
assert.equal(prepared.changes.protocolo_0_100_gym_party_settings_v1.firebaseConfig,undefined);
assert.equal(prepared.changes.protocolo_0_100_recipes_v1[0].name,'Guiso');
assert.equal(prepared.changes.protocolo_0_100_food_portions_v1.rice.lastAmount,180);
assert.equal(prepared.changes.protocolo_0_100_workout_sessions_v1[0].exercises[0].sets[0].setType,'warmup');
assert.deepEqual(Array.from(prepared.changes.protocolo_0_100_workout_sessions_v1[0].exercises[0].muscleClassificationSnapshot.primaryMuscles),['chest']);
assert.equal(prepared.changes.protocolo_0_100_workout_sessions_v1[0].exercises[0].muscleClassificationSnapshot.classificationStatus,'official');
const result=await service.apply(prepared);
assert.equal(result.snapshotId,'recovery-before-import');
assert.ok(transactions[0].options.reason.startsWith('import:'));
assert.equal(service.history()[0].status,'applied');
await service.undo(result.snapshotId);
assert.equal(service.history()[0].status,'undone');
assert.equal(events.filter(event=>event.type==='app-backup-imported').length,2);

await assert.rejects(()=>service.prepareFile({size:service.MAX_FILE_BYTES+1,name:'huge.json',text:async()=>''}),'8 MB');
console.log('Importacion segura correcta: schema, limites, sanitizacion, preview, transaccion, historial y Deshacer.');
