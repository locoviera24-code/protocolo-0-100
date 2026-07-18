(function(global){
  'use strict';

  const MAX_FILE_BYTES=8*1024*1024;
  const MAX_STRING_LENGTH=20000;
  const MAX_ARRAY_ITEMS=50000;
  const CURRENT_SCHEMA=3;
  const START_KEY='protocolo_0_100_start_date_v1';
  const ACTIVE_MODULE_KEY='protocolo_0_100_active_module_v1';
  const HISTORY_KEY='protocolo_0_100_import_history_v1';
  const DANGEROUS_KEYS=new Set(['__proto__','prototype','constructor']);
  const FIELD_MAP=Object.freeze({
    entries:'protocolo_0_100_tracker_v1',dailyLogs:'protocolo_0_100_tracker_v1',gymSessions:'protocolo_0_100_gym_sessions_v1',
    weeklyWorkoutPlan:'protocolo_0_100_weekly_workout_plan_v1',workoutSessions:'protocolo_0_100_workout_sessions_v1',exerciseHistory:'protocolo_0_100_exercise_history_v1',exerciseLibrary:'protocolo_0_100_exercise_library_v1',exerciseLibraryMeta:'protocolo_0_100_exercise_library_meta_v1',equipmentProfiles:'protocolo_0_100_equipment_profiles_v1',exercisePreferences:'protocolo_0_100_exercise_preferences_v1',gymSettings:'protocolo_0_100_gym_settings_v1',workoutWidgetState:'protocolo_0_100_workout_widget_state_v1',
    nutritionEntries:'protocolo_0_100_nutrition_entries_v1',meals:'protocolo_0_100_nutrition_entries_v1',nutritionTargets:'protocolo_0_100_nutrition_targets_v1',bodyMetrics:'protocolo_0_100_body_metrics_v1',customFoods:'protocolo_0_100_custom_foods_v1',nutritionAliases:'protocolo_0_100_nutrition_aliases_v1',savedMeals:'protocolo_0_100_saved_meals_v1',recipes:'protocolo_0_100_recipes_v1',foodPortions:'protocolo_0_100_food_portions_v1',cachedFdcFoods:'protocolo_0_100_cached_fdc_foods_v1',uiPreferences:'protocolo_0_100_ui_preferences_v1',
    gymPartySettings:'protocolo_0_100_gym_party_settings_v1',gymPartyMembership:'protocolo_0_100_gym_party_membership_v1',sharedWorkoutSessions:'protocolo_0_100_shared_workout_sessions_v1',sharedWorkoutSets:'protocolo_0_100_shared_workout_sets_v1',syncQueue:'protocolo_0_100_gym_party_sync_queue_v1',lastGymPartySyncAt:'protocolo_0_100_last_gym_party_sync_at_v1',lastGymPartyRemoteSyncAt:'protocolo_0_100_gym_party_last_remote_sync_at_v1',gymPartyDemoData:'protocolo_0_100_gym_party_demo_data_v1',
    referralCodes:'protocolo_0_100_referral_codes_v1',userReferral:'protocolo_0_100_user_referral_v1',coinLedger:'protocolo_0_100_coin_ledger_v1',monthlyRankings:'protocolo_0_100_monthly_rankings_v1',rewards:'protocolo_0_100_rewards_v1'
  });
  const META_FIELDS=new Set(['schemaVersion','appVersion','updatedAt','exportedAt','settings','startDate']);

  function cleanString(value){return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,MAX_STRING_LENGTH);}
  function sanitize(value,depth=0,stats={ignored:[]}){
    if(depth>12)throw new Error('El backup supera la profundidad permitida.');
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    if(typeof value==='string')return cleanString(value);
    if(Array.isArray(value)){
      if(value.length>MAX_ARRAY_ITEMS)throw new Error('El backup contiene una lista demasiado grande.');
      return value.map(item=>sanitize(item,depth+1,stats));
    }
    if(typeof value==='object'){
      const output=Object.create(null);
      Object.entries(value).forEach(([key,item])=>{
        if(DANGEROUS_KEYS.has(key)){stats.ignored.push(key);return;}
        output[cleanString(key).slice(0,120)]=sanitize(item,depth+1,stats);
      });
      return output;
    }
    return null;
  }
  function validateRoot(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('El archivo no contiene un objeto de backup.');
    const schema=Number(data.schemaVersion||0);
    if(schema>CURRENT_SCHEMA)throw new Error(`Este backup usa schema ${schema}, posterior al schema ${CURRENT_SCHEMA} de la app.`);
    if(!schema&&!Array.isArray(data.entries))throw new Error('El JSON no contiene un backup compatible ni registros antiguos.');
    return schema||1;
  }
  function sanitizeGymPartySettings(value){
    if(!value||typeof value!=='object')return value;
    const output={...value};delete output.firebaseConfig;return output;
  }
  function buildChanges(data){
    const changes={},usedFields=new Set(),rawKeys=[];
    Object.entries(FIELD_MAP).forEach(([field,key])=>{
      if(!Object.prototype.hasOwnProperty.call(data,field))return;
      usedFields.add(field);
      if(Object.prototype.hasOwnProperty.call(changes,key))return;
      let value=data[field];
      if(field==='gymPartySettings')value=sanitizeGymPartySettings(value);
      changes[key]=value;
    });
    if(typeof data.startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)){
      changes[START_KEY]=data.startDate;rawKeys.push(START_KEY);usedFields.add('startDate');
    }
    const settings=data.settings&&typeof data.settings==='object'?data.settings:null;
    if(settings){
      if(typeof settings.activeModule==='string'){
        changes[ACTIVE_MODULE_KEY]=cleanString(settings.activeModule).slice(0,40);rawKeys.push(ACTIVE_MODULE_KEY);
      }
      if(settings.nutritionProfile)changes.protocolo_0_100_nutrition_profile_v1=settings.nutritionProfile;
      if(settings.ranking)changes.protocolo_0_100_ranking_settings_v1=settings.ranking;
      usedFields.add('settings');
    }
    const ignored=Object.keys(data).filter(field=>!usedFields.has(field)&&!META_FIELDS.has(field));
    return {changes,rawKeys,ignored};
  }
  function itemIdentity(item,index){return String(item?.id||item?.date||item?.exerciseId||item?.fdcId||index);}
  function compareValue(existing,incoming){
    if(Array.isArray(incoming)){
      const current=Array.isArray(existing)?existing:[],currentMap=new Map(current.map((item,index)=>[itemIdentity(item,index),item]));
      let added=0,replaced=0,conflicts=0;
      incoming.forEach((item,index)=>{const id=itemIdentity(item,index),old=currentMap.get(id);if(old===undefined)added+=1;else{replaced+=1;if(JSON.stringify(old)!==JSON.stringify(item))conflicts+=1;}});
      return {records:incoming.length,added,replaced,conflicts};
    }
    const exists=existing!==null&&existing!==undefined;
    return {records:1,added:exists?0:1,replaced:exists?1:0,conflicts:exists&&JSON.stringify(existing)!==JSON.stringify(incoming)?1:0};
  }
  function previewFor(changes){
    return Object.entries(changes).reduce((summary,[key,value])=>{
      const part=compareValue(global.APP_DATA.read(key,null),value);
      summary.keys+=1;summary.records+=part.records;summary.added+=part.added;summary.replaced+=part.replaced;summary.conflicts+=part.conflicts;
      return summary;
    },{keys:0,records:0,added:0,replaced:0,conflicts:0});
  }
  async function prepareFile(file){
    if(!file)throw new Error('Selecciona un archivo JSON.');
    if(Number(file.size)>MAX_FILE_BYTES)throw new Error('El backup supera el limite de 8 MB.');
    return prepareText(await file.text(),{fileName:cleanString(file.name||'backup.json'),fileSize:Number(file.size)||0});
  }
  function prepareText(text,meta={}){
    if(!String(text||'').trim())throw new Error('El archivo esta vacio.');
    if(new Blob([text]).size>MAX_FILE_BYTES)throw new Error('El backup supera el limite de 8 MB.');
    let parsed;try{parsed=JSON.parse(text);}catch(error){throw new Error('El archivo no contiene JSON valido.');}
    const stats={ignored:[]},data=sanitize(parsed,0,stats),schemaVersion=validateRoot(data),mapped=buildChanges(data);
    if(!Object.keys(mapped.changes).length)throw new Error('El backup no contiene areas reconocidas para importar.');
    return {id:`import_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,data,changes:mapped.changes,rawKeys:mapped.rawKeys,schemaVersion,ignored:[...new Set([...stats.ignored,...mapped.ignored])],summary:previewFor(mapped.changes),meta};
  }
  function history(){return global.APP_DATA.read(HISTORY_KEY,[]);}
  function saveHistory(entry){global.APP_DATA.write(HISTORY_KEY,[entry,...history()].slice(0,10));}
  async function apply(prepared){
    if(!prepared?.changes)throw new Error('No hay una importacion preparada.');
    const result=await global.APP_DATA.replaceMany(prepared.changes,{reason:`import:${prepared.id}`,rawKeys:prepared.rawKeys});
    const entry={id:prepared.id,at:new Date().toISOString(),schemaVersion:prepared.schemaVersion,status:result.ok?'applied':'rolled-back',keys:prepared.summary.keys,records:prepared.summary.records,snapshotId:result.snapshotId};
    saveHistory(entry);
    if(!result.ok)throw new Error('La importacion no pudo completarse y se restauro el estado anterior.');
    global.dispatchEvent(new CustomEvent('app-backup-imported',{detail:{...entry,ignored:prepared.ignored.length}}));
    return {...result,entry};
  }
  async function undo(snapshotId){
    if(!snapshotId)throw new Error('No hay una importacion para deshacer.');
    const result=await global.APP_DATA.restoreRecovery(snapshotId);
    if(!result.ok)throw new Error('No se pudo restaurar la copia previa.');
    saveHistory({id:`undo_${Date.now()}`,at:new Date().toISOString(),status:'undone',snapshotId,records:0,keys:0,schemaVersion:CURRENT_SCHEMA});
    global.dispatchEvent(new CustomEvent('app-backup-imported',{detail:{status:'undone'}}));
    return result;
  }

  global.BACKUP_SERVICE=Object.freeze({MAX_FILE_BYTES,CURRENT_SCHEMA,HISTORY_KEY,prepareFile,prepareText,apply,undo,history});
})(window);
