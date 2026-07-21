(function(global){
  'use strict';

  const REGISTRY_VERSION=1;
  const identity=value=>value;
  const validators=Object.freeze({
    any:()=>true,
    array:Array.isArray,
    recordArray:value=>Array.isArray(value)&&value.every(item=>!!item&&typeof item==='object'&&!Array.isArray(item)),
    object:value=>!!value&&typeof value==='object'&&!Array.isArray(value),
    nullableObject:value=>value===null||(!!value&&typeof value==='object'&&!Array.isArray(value)),
    nullableArray:value=>value===null||Array.isArray(value),
    nullableString:value=>value===null||typeof value==='string',
    string:value=>typeof value==='string',
    nullableDate:value=>value===null||(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)),
    drafts:value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Number(value.version||1)>=1&&!!value.items&&typeof value.items==='object'&&!Array.isArray(value.items)
  });
  function entry(name,key,domain,options={}){
    const storageMode=options.storageMode||'shadow';
    const retention=options.retention||'indefinite';
    const mirrorEnabled=options.mirrorEnabled===undefined?storageMode==='shadow':!!options.mirrorEnabled;
    return Object.freeze({
      key,name,domain,
      schemaVersion:Number(options.schemaVersion)||1,
      versionField:options.versionField||'',
      defaultValue:options.defaultValue===undefined?null:options.defaultValue,
      validator:options.validator||validators.any,
      migration:options.migration||identity,
      backup:options.backup!==false,
      backupField:options.backupField||'',
      backupAliases:Object.freeze([...(options.backupAliases||[])]),
      sensitive:!!options.sensitive,
      storageMode,
      mirrorEnabled,
      primaryEligible:options.primaryEligible===undefined?mirrorEnabled&&storageMode!=='legacy'&&retention==='indefinite':!!options.primaryEligible,
      resetGroup:options.resetGroup||domain,
      retention,
      legacyKeys:Object.freeze([...(options.legacyKeys||[])]),
      serialization:options.serialization||'json',
      redaction:options.redaction||''
    });
  }

  const ENTRIES=Object.freeze([
    entry('dailyLogs','protocolo_0_100_tracker_v1','protocol',{defaultValue:[],validator:validators.recordArray,backupField:'entries',backupAliases:['dailyLogs']}),
    entry('legacyGymSessions','protocolo_0_100_gym_sessions_v1','protocol',{defaultValue:[],validator:validators.recordArray,backupField:'gymSessions',storageMode:'legacy',mirrorEnabled:true,resetGroup:'workout',retention:'migration-only'}),
    entry('startDate','protocolo_0_100_start_date_v1','protocol',{defaultValue:null,validator:validators.nullableDate,backupField:'startDate',storageMode:'local',mirrorEnabled:false,serialization:'raw'}),
    entry('actionDismissed','protocolo_0_100_action_dismissed_v1','protocol',{defaultValue:{},validator:validators.object,backup:false,storageMode:'local',mirrorEnabled:false}),

    entry('weeklyPlan','protocolo_0_100_weekly_workout_plan_v1','workout',{defaultValue:null,validator:validators.nullableObject,backupField:'weeklyWorkoutPlan'}),
    entry('sessions','protocolo_0_100_workout_sessions_v1','workout',{defaultValue:[],validator:validators.recordArray,backupField:'workoutSessions',legacyKeys:['protocolo_0_100_gym_sessions_v1']}),
    entry('exerciseHistory','protocolo_0_100_exercise_history_v1','workout',{defaultValue:{},validator:validators.object,backupField:'exerciseHistory'}),
    entry('exerciseLibrary','protocolo_0_100_exercise_library_v1','workout',{defaultValue:[],validator:validators.recordArray,backupField:'exerciseLibrary'}),
    entry('exerciseLibraryMeta','protocolo_0_100_exercise_library_meta_v1','workout',{defaultValue:null,validator:validators.nullableObject,backupField:'exerciseLibraryMeta'}),
    entry('equipmentProfiles','protocolo_0_100_equipment_profiles_v1','workout',{defaultValue:[],validator:validators.recordArray,backupField:'equipmentProfiles'}),
    entry('exercisePreferences','protocolo_0_100_exercise_preferences_v1','workout',{defaultValue:{schemaVersion:1,exercises:{}},validator:validators.object,backupField:'exercisePreferences',versionField:'schemaVersion'}),
    entry('settings','protocolo_0_100_gym_settings_v1','workout',{defaultValue:{},validator:validators.object,backupField:'gymSettings'}),
    entry('widgetState','protocolo_0_100_workout_widget_state_v1','workout',{defaultValue:null,validator:validators.nullableObject,backupField:'workoutWidgetState'}),
    entry('legacyMigration','protocolo_0_100_gym_legacy_migration_v1','workout',{defaultValue:null,validator:validators.nullableObject,backup:false,storageMode:'local',mirrorEnabled:false}),

    entry('entries','protocolo_0_100_nutrition_entries_v1','nutrition',{defaultValue:[],validator:validators.recordArray,backupField:'nutritionEntries',backupAliases:['meals']}),
    entry('targets','protocolo_0_100_nutrition_targets_v1','nutrition',{defaultValue:{},validator:validators.object,backupField:'nutritionTargets'}),
    entry('bodyMetrics','protocolo_0_100_body_metrics_v1','nutrition',{defaultValue:{},validator:validators.object,backupField:'bodyMetrics'}),
    entry('customFoods','protocolo_0_100_custom_foods_v1','nutrition',{defaultValue:[],validator:validators.recordArray,backupField:'customFoods'}),
    entry('aliases','protocolo_0_100_nutrition_aliases_v1','nutrition',{defaultValue:{},validator:validators.object,backupField:'nutritionAliases'}),
    entry('profile','protocolo_0_100_nutrition_profile_v1','nutrition',{defaultValue:{},validator:validators.object,backupField:'nutritionProfile'}),
    entry('savedMeals','protocolo_0_100_saved_meals_v1','nutrition',{defaultValue:[],validator:validators.recordArray,backupField:'savedMeals'}),
    entry('recipes','protocolo_0_100_recipes_v1','nutrition',{defaultValue:[],validator:validators.recordArray,backupField:'recipes'}),
    entry('portions','protocolo_0_100_food_portions_v1','nutrition',{defaultValue:{},validator:validators.object,backupField:'foodPortions'}),
    entry('cachedFdcFoods','protocolo_0_100_cached_fdc_foods_v1','nutrition',{defaultValue:[],validator:validators.array,backupField:'cachedFdcFoods',retention:'least-recently-used:750'}),
    entry('fdcSearchCache','protocolo_0_100_fdc_search_cache_v1','nutrition',{defaultValue:{},validator:validators.object,backup:false,retention:'ttl:24h'}),
    entry('fdcConfig','protocolo_0_100_fdc_config_v1','nutrition',{defaultValue:{},validator:validators.object,backup:false,sensitive:true,storageMode:'local',mirrorEnabled:false,resetGroup:'developer',retention:'until-user-removes'}),

    entry('settings','protocolo_0_100_gym_party_settings_v1','gymParty',{defaultValue:{},validator:validators.object,backupField:'gymPartySettings',redaction:'firebase-config'}),
    entry('membership','protocolo_0_100_gym_party_membership_v1','gymParty',{defaultValue:null,validator:validators.nullableObject,backupField:'gymPartyMembership'}),
    entry('sharedSessions','protocolo_0_100_shared_workout_sessions_v1','gymParty',{defaultValue:[],validator:validators.recordArray,backupField:'sharedWorkoutSessions'}),
    entry('sharedSets','protocolo_0_100_shared_workout_sets_v1','gymParty',{defaultValue:[],validator:validators.recordArray,backupField:'sharedWorkoutSets'}),
    entry('syncQueue','protocolo_0_100_gym_party_sync_queue_v1','gymParty',{defaultValue:[],validator:validators.recordArray,backupField:'syncQueue'}),
    entry('lastSyncAt','protocolo_0_100_last_gym_party_sync_at_v1','gymParty',{defaultValue:null,validator:validators.nullableString,backupField:'lastGymPartySyncAt'}),
    entry('lastRemoteSyncAt','protocolo_0_100_gym_party_last_remote_sync_at_v1','gymParty',{defaultValue:null,validator:validators.nullableString,backupField:'lastGymPartyRemoteSyncAt'}),
    entry('demoData','protocolo_0_100_gym_party_demo_data_v1','gymParty',{defaultValue:null,validator:value=>value===null||Array.isArray(value)||validators.object(value),backupField:'gymPartyDemoData'}),

    entry('uiPreferences','protocolo_0_100_ui_preferences_v1','settings',{defaultValue:{},validator:validators.object,backupField:'uiPreferences'}),
    entry('backupMeta','protocolo_0_100_backup_meta_v1','settings',{defaultValue:{},validator:validators.object,backup:false,resetGroup:'backup'}),
    entry('activeModule','protocolo_0_100_active_module_v1','settings',{defaultValue:null,validator:validators.nullableString,backupField:'activeModule',storageMode:'local',mirrorEnabled:false,serialization:'raw'}),
    entry('onboardingComplete','protocolo_0_100_onboarding_complete_v1','settings',{defaultValue:null,validator:validators.nullableString,backup:false,storageMode:'local',mirrorEnabled:false,serialization:'raw',resetGroup:'onboarding'}),
    entry('manualDates','protocolo_0_100_manual_dates_v1','settings',{defaultValue:{},validator:validators.object,backup:false,storageMode:'local',mirrorEnabled:false}),

    entry('drafts','protocolo_0_100_drafts_v1','drafts',{defaultValue:{version:1,updatedAt:'',items:{}},validator:validators.drafts,backup:false,storageMode:'local',mirrorEnabled:false,retention:'ttl:14d',versionField:'version'}),
    entry('draftSignal','protocolo_0_100_drafts_signal_v1','drafts',{defaultValue:null,validator:validators.nullableString,backup:false,storageMode:'transient',mirrorEnabled:false,retention:'event-only',serialization:'raw'}),
    entry('timeSignal','protocolo_0_100_time_signal_v1','drafts',{defaultValue:null,validator:validators.nullableString,backup:false,storageMode:'transient',mirrorEnabled:false,retention:'event-only',serialization:'raw'}),

    entry('versionedState','protocolo_0_100_state_v2','backup',{schemaVersion:3,defaultValue:{},validator:validators.object,backup:false,versionField:'schemaVersion'}),
    entry('importHistory','protocolo_0_100_import_history_v1','backup',{defaultValue:[],validator:validators.array,backup:false,retention:'last:10'}),

    entry('rankingSettings','protocolo_0_100_ranking_settings_v1','laboratory',{defaultValue:{},validator:validators.object,backupField:'rankingSettings',storageMode:'local',mirrorEnabled:false}),
    entry('referralCodes','protocolo_0_100_referral_codes_v1','laboratory',{defaultValue:[],validator:validators.array,backupField:'referralCodes',storageMode:'local',mirrorEnabled:false}),
    entry('userReferral','protocolo_0_100_user_referral_v1','laboratory',{defaultValue:null,validator:validators.nullableObject,backupField:'userReferral',storageMode:'local',mirrorEnabled:false}),
    entry('coinLedger','protocolo_0_100_coin_ledger_v1','laboratory',{defaultValue:[],validator:validators.array,backupField:'coinLedger',storageMode:'local',mirrorEnabled:false}),
    entry('monthlyRankings','protocolo_0_100_monthly_rankings_v1','laboratory',{defaultValue:{},validator:validators.object,backupField:'monthlyRankings',storageMode:'local',mirrorEnabled:false}),
    entry('rewards','protocolo_0_100_rewards_v1','laboratory',{defaultValue:{},validator:validators.object,backupField:'rewards',storageMode:'local',mirrorEnabled:false}),

    entry('dataLayerConfig','protocolo_0_100_data_layer_v1','diagnostics',{defaultValue:{},validator:validators.object,backup:false,storageMode:'local',mirrorEnabled:false,versionField:'schemaVersion'}),
    entry('errorLog','protocolo_0_100_error_log_v1','diagnostics',{defaultValue:[],validator:validators.array,backup:false,storageMode:'local',mirrorEnabled:false,retention:'circular:30'}),
    entry('safeMode','protocolo_0_100_safe_mode_v1','diagnostics',{defaultValue:null,validator:validators.nullableString,backup:false,storageMode:'local',mirrorEnabled:false,serialization:'raw'})
  ]);

  const BY_KEY=new Map(),BY_DOMAIN_NAME=new Map();
  ENTRIES.forEach(record=>{
    if(BY_KEY.has(record.key))throw new Error(`Clave persistida duplicada: ${record.key}`);
    const identity=`${record.domain}:${record.name}`;
    if(BY_DOMAIN_NAME.has(identity))throw new Error(`Nombre persistido duplicado: ${identity}`);
    BY_KEY.set(record.key,record);BY_DOMAIN_NAME.set(identity,record);
  });
  function get(key){return BY_KEY.get(String(key||''))||null;}
  function getByName(domain,name){return BY_DOMAIN_NAME.get(`${domain}:${name}`)||null;}
  function records({domain='',mirrorOnly=false,primaryOnly=false,backupOnly=false}={}){
    return ENTRIES.filter(record=>(!domain||record.domain===domain)&&(!mirrorOnly||record.mirrorEnabled)&&(!primaryOnly||record.primaryEligible)&&(!backupOnly||record.backup&&!record.sensitive));
  }
  function domains(){return[...new Set(ENTRIES.map(record=>record.domain))];}
  function domainKeys({mirrorOnly=false,primaryOnly=false}={}){
    return Object.freeze(Object.fromEntries(domains().map(domain=>[domain,Object.freeze(records({domain,mirrorOnly,primaryOnly}).map(record=>record.key))]).filter(([,keys])=>keys.length)));
  }
  function backupFieldMap(){
    const output={};records({backupOnly:true}).forEach(record=>{
      if(!record.backupField)throw new Error(`Falta backupField para ${record.key}`);
      [record.backupField,...record.backupAliases].forEach(field=>{if(output[field]&&output[field]!==record.key)throw new Error(`Campo de backup duplicado: ${field}`);output[field]=record.key;});
    });return Object.freeze(output);
  }
  function validate(key,value){
    const record=get(key);
    if(!record)return{status:'unsupported',key,error:'unregistered-key'};
    if(value===undefined)return{status:'missing',key,record};
    try{
      const storedVersion=record.versionField&&value&&typeof value==='object'?Number(value[record.versionField]||0):0;
      if(storedVersion>record.schemaVersion)return{status:'unsupported',key,record,value,error:'future-schema',storedVersion,supportedVersion:record.schemaVersion};
      const migrated=storedVersion>0&&storedVersion<record.schemaVersion?record.migration(value,{from:storedVersion,to:record.schemaVersion}):value;
      if(!record.validator(migrated))return{status:'corrupt',key,record,error:'schema-validation'};
      return storedVersion>0&&storedVersion<record.schemaVersion?{status:'legacy',key,record,value:migrated,originalValue:value,storedVersion,supportedVersion:record.schemaVersion}:{status:'valid',key,record,value:migrated};
    }
    catch(error){return{status:'corrupt',key,record,error:String(error?.message||error)};}
  }

  global.APP_SCHEMA_REGISTRY=Object.freeze({REGISTRY_VERSION,validators,get,getByName,records,domains,domainKeys,backupFieldMap,validate,all:()=>ENTRIES.slice()});
})(window);
