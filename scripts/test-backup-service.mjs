import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const storage=new Map(),rawStorage=new Map(),events=[],transactions=[];
const window={
  localStorage:{getItem:key=>rawStorage.has(key)?rawStorage.get(key):null,setItem:(key,value)=>rawStorage.set(key,String(value)),removeItem:key=>rawStorage.delete(key)},
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
vm.runInContext(fs.readFileSync('data/schema-registry.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/backup-service.js','utf8'),context);
const service=window.BACKUP_SERVICE;

assert.throws(()=>service.prepareText(''),'vacio');
assert.throws(()=>service.prepareText('{no-json'),'JSON valido');
assert.throws(()=>service.prepareText(JSON.stringify({schemaVersion:99,entries:[]})),'posterior');
assert.throws(()=>service.prepareText(JSON.stringify({hello:'world'})),'compatible');
assert.throws(()=>service.prepareText(JSON.stringify({schemaVersion:3,entries:{date:'2026-07-12'}})),'estructura compatible');
assert.throws(()=>service.prepareText(JSON.stringify({schemaVersion:3,entries:[],equipmentProfiles:[null]})),'estructura compatible');

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
const trackerKey='protocolo_0_100_tracker_v1';
storage.set(trackerKey,[{id:'local-only',date:'2026-07-01',score:60},{id:'shared',date:'2026-07-02',score:70}]);
const modesPrepared=service.prepareText(JSON.stringify({schemaVersion:3,entries:[{id:'shared',date:'2026-07-02',score:80},{id:'incoming',date:'2026-07-03',score:90},{id:'incoming',date:'2026-07-03',score:91}]}));
assert.equal(modesPrepared.summary.added,1);
assert.equal(modesPrepared.summary.conflicts,1);
assert.equal(modesPrepared.summary.duplicates,1);
const mergedPlan=service.createPlan(modesPrepared,{domains:{protocol:{mode:'merge',conflictPolicy:'current'}}});
assert.equal(mergedPlan.summary.removed,0);
assert.equal(mergedPlan.changes[trackerKey].length,3);
assert.equal(mergedPlan.changes[trackerKey].find(item=>item.id==='shared').score,70);
assert.equal(mergedPlan.changes[trackerKey].find(item=>item.id==='incoming').score,91);
const reviewedConflict=modesPrepared.domains.find(item=>item.domain==='protocol').conflicts[0];
const reviewedPlan=service.createPlan(modesPrepared,{domains:{protocol:{mode:'merge',conflictPolicy:'review',conflictDecisions:{[reviewedConflict.id]:'incoming'}}}});
assert.equal(reviewedPlan.changes[trackerKey].find(item=>item.id==='shared').score,80);
const replacedPlan=service.createPlan(modesPrepared,{domains:{protocol:{mode:'replace'}}});
assert.equal(replacedPlan.summary.removed,1);
assert.equal(replacedPlan.changes[trackerKey].length,2);
assert.equal(replacedPlan.changes.protocolo_0_100_start_date_v1,undefined);
const keptPlan=service.createPlan(modesPrepared,{domains:{protocol:{mode:'keep'}}});
assert.equal(Object.keys(keptPlan.changes).length,0);
const primitivePrepared=service.prepareText(JSON.stringify({schemaVersion:3,referralCodes:['A','A','B']}));
assert.equal(primitivePrepared.summary.duplicates,1);
assert.deepEqual(Array.from(service.createPlan(primitivePrepared).changes.protocolo_0_100_referral_codes_v1),['A','B']);
storage.set('protocolo_0_100_ui_preferences_v1',{theme:'dark',density:'compact'});
const orderedObject=service.prepareText('{"schemaVersion":3,"uiPreferences":{"density":"compact","theme":"dark"}}');
assert.equal(orderedObject.summary.conflicts,0);
storage.set('protocolo_0_100_equipment_profiles_v1',[{id:'barbell-20',name:'Barra 20 kg'}]);
storage.set('protocolo_0_100_gym_party_settings_v1',{backendMode:'firebase',firebaseConfig:{apiKey:'omit'},localUserId:'local'});
storage.set('protocolo_0_100_fdc_config_v1',{apiKey:'never-export'});
const partyReplace=service.createPlan(prepared,{domains:{gymParty:{mode:'replace'}}});
assert.equal(partyReplace.changes.protocolo_0_100_gym_party_settings_v1.firebaseConfig.apiKey,'omit');
assert.equal(partyReplace.domains.find(item=>item.domain==='gymParty').conflicts.some(item=>item.label==='firebaseConfig'),false);
rawStorage.set('protocolo_0_100_start_date_v1','2026-07-01');
const exported=service.buildExport({appVersion:'2.7.0'});
assert.equal(exported.equipmentProfiles[0].id,'barbell-20');
assert.equal(exported.gymPartySettings.firebaseConfig,undefined);
assert.equal(exported.startDate,'2026-07-01');
assert.equal(Object.hasOwn(exported,'fdcConfig'),false);
const result=await service.apply(prepared);
assert.equal(result.snapshotId,'recovery-before-import');
assert.ok(transactions[0].options.reason.startsWith('import:'));
assert.equal(service.history()[0].status,'applied');
await service.undo(result.snapshotId);
assert.equal(service.history()[0].status,'undone');
assert.equal(events.filter(event=>event.type==='app-backup-imported').length,2);

await assert.rejects(()=>service.prepareFile({size:service.MAX_FILE_BYTES+1,name:'huge.json',text:async()=>''}),'8 MB');
console.log('Importacion segura correcta: schema, limites, sanitizacion, preview, transaccion, historial y Deshacer.');
