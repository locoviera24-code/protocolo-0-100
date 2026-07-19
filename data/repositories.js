(function(global){
  'use strict';

  const data=global.APP_DATA;
  const registry=global.APP_SCHEMA_REGISTRY;
  if(!data||!registry)return;

  function keysFor(domain){return Object.fromEntries(registry.records({domain}).map(record=>[record.name,record.key]));}

  class BaseRepository{
    constructor(domain){
      this.domain=domain;
      this.keys=Object.freeze(keysFor(domain));
      this.allowedKeys=Object.freeze(Object.values(this.keys));
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
    constructor(){super('protocol');}
  }
  class WorkoutRepository extends BaseRepository{
    constructor(){super('workout');}
  }
  class NutritionRepository extends BaseRepository{
    constructor(){super('nutrition');}
  }
  class GymPartyLocalRepository extends BaseRepository{
    constructor(){super('gymParty');}
  }
  class SettingsRepository extends BaseRepository{
    constructor(){super('settings');}
  }
  class BackupRepository extends BaseRepository{
    constructor(){super('backup');}
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
  function forKey(key){const record=registry.get(key);return record?repositories[record.domain]||null:null;}

  global.ProtocolRepository=ProtocolRepository;
  global.WorkoutRepository=WorkoutRepository;
  global.NutritionRepository=NutritionRepository;
  global.GymPartyLocalRepository=GymPartyLocalRepository;
  global.SettingsRepository=SettingsRepository;
  global.BackupRepository=BackupRepository;
  global.APP_REPOSITORIES=Object.freeze({...repositories,forKey,initialize:()=>data.initialize()});
})(window);
