(function(global){
  'use strict';

  const data=global.APP_DATA;
  if(!data)return;

  class BaseRepository{
    constructor(domain,keys){
      this.domain=domain;
      this.keys=Object.freeze({...keys});
      this.allowedKeys=Object.freeze(Object.values(keys));
    }
    owns(key){return this.allowedKeys.includes(key);}
    get(key,fallback){return data.read(key,fallback);}
    getByName(name,fallback){return this.get(this.keys[name],fallback);}
    getAsync(key,fallback){return data.readIndexed(key,fallback);}
    set(key,value){return data.write(key,value);}
    setByName(name,value){return this.set(this.keys[name],value);}
    remove(key){return data.remove(key);}
    removeByName(name){return this.remove(this.keys[name]);}
    migrate(){return data.migrateDomain(this.domain);}
    snapshot(reason=`manual:${this.domain}`){return data.createRecoverySnapshot(this.allowedKeys,reason);}
    replace(changes,reason=`replace:${this.domain}`){return data.replaceMany(changes,{reason});}
  }

  class ProtocolRepository extends BaseRepository{
    constructor(){super('protocol',{
      dailyLogs:'protocolo_0_100_tracker_v1',
      legacyGymSessions:'protocolo_0_100_gym_sessions_v1'
    });}
  }
  class WorkoutRepository extends BaseRepository{
    constructor(){super('workout',{
      weeklyPlan:'protocolo_0_100_weekly_workout_plan_v1',
      sessions:'protocolo_0_100_workout_sessions_v1',
      exerciseHistory:'protocolo_0_100_exercise_history_v1',
      exerciseLibrary:'protocolo_0_100_exercise_library_v1',
      exerciseLibraryMeta:'protocolo_0_100_exercise_library_meta_v1',
      exercisePreferences:'protocolo_0_100_exercise_preferences_v1',
      settings:'protocolo_0_100_gym_settings_v1',
      widgetState:'protocolo_0_100_workout_widget_state_v1'
    });}
  }
  class NutritionRepository extends BaseRepository{
    constructor(){super('nutrition',{
      entries:'protocolo_0_100_nutrition_entries_v1',
      targets:'protocolo_0_100_nutrition_targets_v1',
      bodyMetrics:'protocolo_0_100_body_metrics_v1',
      customFoods:'protocolo_0_100_custom_foods_v1',
      aliases:'protocolo_0_100_nutrition_aliases_v1',
      profile:'protocolo_0_100_nutrition_profile_v1',
      savedMeals:'protocolo_0_100_saved_meals_v1',
      cachedFdcFoods:'protocolo_0_100_cached_fdc_foods_v1',
      fdcSearchCache:'protocolo_0_100_fdc_search_cache_v1'
    });}
  }
  class GymPartyLocalRepository extends BaseRepository{
    constructor(){super('gymParty',{
      settings:'protocolo_0_100_gym_party_settings_v1',
      membership:'protocolo_0_100_gym_party_membership_v1',
      sharedSessions:'protocolo_0_100_shared_workout_sessions_v1',
      sharedSets:'protocolo_0_100_shared_workout_sets_v1',
      syncQueue:'protocolo_0_100_gym_party_sync_queue_v1',
      lastSyncAt:'protocolo_0_100_last_gym_party_sync_at_v1',
      lastRemoteSyncAt:'protocolo_0_100_gym_party_last_remote_sync_at_v1',
      demoData:'protocolo_0_100_gym_party_demo_data_v1'
    });}
  }
  class SettingsRepository extends BaseRepository{
    constructor(){super('settings',{
      uiPreferences:'protocolo_0_100_ui_preferences_v1',
      backupMeta:'protocolo_0_100_backup_meta_v1'
    });}
  }
  class BackupRepository extends BaseRepository{
    constructor(){super('backup',{versionedState:'protocolo_0_100_state_v2'});}
    createRecovery(keys,reason='backup-before-change'){return data.createRecoverySnapshot(keys,reason);}
    restoreRecovery(snapshotId){return data.restoreRecovery(snapshotId);}
    diagnostics(){return data.diagnostics();}
  }

  const repositories={
    protocol:new ProtocolRepository(),
    workout:new WorkoutRepository(),
    nutrition:new NutritionRepository(),
    gymParty:new GymPartyLocalRepository(),
    settings:new SettingsRepository(),
    backup:new BackupRepository()
  };
  function forKey(key){return Object.values(repositories).find(repository=>repository.owns(key))||null;}

  global.ProtocolRepository=ProtocolRepository;
  global.WorkoutRepository=WorkoutRepository;
  global.NutritionRepository=NutritionRepository;
  global.GymPartyLocalRepository=GymPartyLocalRepository;
  global.SettingsRepository=SettingsRepository;
  global.BackupRepository=BackupRepository;
  global.APP_REPOSITORIES=Object.freeze({...repositories,forKey,initialize:()=>data.initialize()});
})(window);
