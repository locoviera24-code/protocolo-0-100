(function(global){
  'use strict';

  const DB_NAME='protocolo_0_100_data';
  const DB_VERSION=1;
  const RECORDS_STORE='records';
  const META_STORE='meta';
  const RECOVERY_STORE='recovery';
  const CONFIG_KEY='protocolo_0_100_data_layer_v1';
  const CHANNEL_NAME='protocolo_0_100_data_changes_v1';
  const MAX_RECOVERY_SNAPSHOTS=5;
  const DOMAIN_KEYS=Object.freeze({
    protocol:[
      'protocolo_0_100_tracker_v1',
      'protocolo_0_100_gym_sessions_v1'
    ],
    workout:[
      'protocolo_0_100_weekly_workout_plan_v1',
      'protocolo_0_100_workout_sessions_v1',
      'protocolo_0_100_exercise_history_v1',
      'protocolo_0_100_exercise_library_v1',
      'protocolo_0_100_exercise_library_meta_v1',
      'protocolo_0_100_exercise_preferences_v1',
      'protocolo_0_100_gym_settings_v1',
      'protocolo_0_100_workout_widget_state_v1'
    ],
    nutrition:[
      'protocolo_0_100_nutrition_entries_v1',
      'protocolo_0_100_nutrition_targets_v1',
      'protocolo_0_100_body_metrics_v1',
      'protocolo_0_100_custom_foods_v1',
      'protocolo_0_100_nutrition_aliases_v1',
      'protocolo_0_100_nutrition_profile_v1',
      'protocolo_0_100_saved_meals_v1',
      'protocolo_0_100_cached_fdc_foods_v1',
      'protocolo_0_100_fdc_search_cache_v1'
    ],
    gymParty:[
      'protocolo_0_100_gym_party_settings_v1',
      'protocolo_0_100_gym_party_membership_v1',
      'protocolo_0_100_shared_workout_sessions_v1',
      'protocolo_0_100_shared_workout_sets_v1',
      'protocolo_0_100_gym_party_sync_queue_v1',
      'protocolo_0_100_last_gym_party_sync_at_v1',
      'protocolo_0_100_gym_party_last_remote_sync_at_v1',
      'protocolo_0_100_gym_party_demo_data_v1'
    ],
    settings:[
      'protocolo_0_100_ui_preferences_v1',
      'protocolo_0_100_backup_meta_v1'
    ],
    backup:[
      'protocolo_0_100_state_v2'
    ]
  });
  const KEY_DOMAINS=Object.freeze(Object.entries(DOMAIN_KEYS).reduce((map,[domain,keys])=>{
    keys.forEach(key=>{map[key]=domain;});
    return map;
  },{}));
  const DEFAULT_CONFIG=Object.freeze({
    schemaVersion:1,
    enabled:true,
    mode:'shadow',
    domains:Object.freeze(Object.fromEntries(Object.keys(DOMAIN_KEYS).map(domain=>[domain,true])))
  });

  let databasePromise=null;
  let initializationPromise=null;
  let mirrorQueue=Promise.resolve();
  let channel=null;
  let lastError=null;

  function clone(value){
    if(value===undefined)return undefined;
    try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
    catch(error){return value;}
  }
  function config(){
    try{
      const stored=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')||{};
      return {...DEFAULT_CONFIG,...stored,domains:{...DEFAULT_CONFIG.domains,...(stored.domains||{})}};
    }catch(error){return {...DEFAULT_CONFIG,domains:{...DEFAULT_CONFIG.domains}};}
  }
  function domainForKey(key){return KEY_DOMAINS[key]||'';}
  function shouldMirror(key){
    const domain=domainForKey(key),current=config();
    return !!(domain&&current.enabled&&current.mode==='shadow'&&current.domains[domain]!==false);
  }
  function sanitizeRawForMirror(key,raw){
    if(key!=='protocolo_0_100_gym_party_settings_v1')return raw;
    try{
      const value=JSON.parse(raw);
      if(value&&typeof value==='object'&&!Array.isArray(value))delete value.firebaseConfig;
      return JSON.stringify(value);
    }catch(error){return raw;}
  }
  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB no pudo completar la operacion.'));
    });
  }
  function transactionDone(transaction){
    return new Promise((resolve,reject)=>{
      transaction.oncomplete=()=>resolve();
      transaction.onabort=()=>reject(transaction.error||new Error('La transaccion de datos fue cancelada.'));
      transaction.onerror=()=>reject(transaction.error||new Error('La transaccion de datos fallo.'));
    });
  }
  function openDatabase(){
    if(databasePromise)return databasePromise;
    if(!global.indexedDB)return Promise.reject(new Error('IndexedDB no esta disponible en este navegador.'));
    databasePromise=new Promise((resolve,reject)=>{
      const request=global.indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const database=request.result;
        if(!database.objectStoreNames.contains(RECORDS_STORE))database.createObjectStore(RECORDS_STORE,{keyPath:'key'});
        if(!database.objectStoreNames.contains(META_STORE))database.createObjectStore(META_STORE,{keyPath:'id'});
        if(!database.objectStoreNames.contains(RECOVERY_STORE)){
          const store=database.createObjectStore(RECOVERY_STORE,{keyPath:'id'});
          store.createIndex('createdAt','createdAt');
        }
      };
      request.onsuccess=()=>{
        const database=request.result;
        database.onversionchange=()=>database.close();
        resolve(database);
      };
      request.onblocked=()=>reject(new Error('Otra pestana mantiene abierta una version anterior de los datos.'));
      request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB.'));
    });
    return databasePromise;
  }
  function classifyError(error){
    const name=String(error?.name||'');
    if(name==='QuotaExceededError')return 'quota';
    if(name==='VersionError'||name==='InvalidStateError')return 'database';
    return 'storage';
  }
  function emit(name,detail){
    try{global.dispatchEvent(new CustomEvent(name,{detail}));}catch(error){/* No DOM event target in static tests. */}
  }
  function reportError(error,operation,key=''){
    lastError={type:classifyError(error),operation,key,message:String(error?.message||error||'Error de almacenamiento'),at:new Date().toISOString()};
    emit('app-data-error',{...lastError,userMessage:lastError.type==='quota'?'No queda espacio local suficiente. Exporta una copia antes de liberar almacenamiento.':'No se pudo completar una operacion local. Tus datos existentes no se borraron.'});
  }
  function notifyChange(key,source='local'){
    const detail={key,domain:domainForKey(key),source,at:new Date().toISOString()};
    emit('app-data-change',detail);
    if(source==='local'){
      try{channel?.postMessage(detail);}catch(error){/* Storage event remains as fallback. */}
    }
  }
  function read(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw===null?clone(fallback):(JSON.parse(raw)??clone(fallback));
    }catch(error){return clone(fallback);}
  }
  function enqueueMirror(task,operation,key){
    mirrorQueue=mirrorQueue.then(task).catch(error=>{reportError(error,operation,key);});
    return mirrorQueue;
  }
  async function putRawRecord(key,raw){
    const database=await openDatabase();
    const transaction=database.transaction(RECORDS_STORE,'readwrite');
    transaction.objectStore(RECORDS_STORE).put({key,domain:domainForKey(key),raw:sanitizeRawForMirror(key,raw),updatedAt:new Date().toISOString()});
    await transactionDone(transaction);
  }
  async function deleteRecord(key){
    const database=await openDatabase();
    const transaction=database.transaction(RECORDS_STORE,'readwrite');
    transaction.objectStore(RECORDS_STORE).delete(key);
    await transactionDone(transaction);
  }
  function writeRaw(key,raw,{notify=true,mirror=true}={}){
    try{localStorage.setItem(key,String(raw));}
    catch(error){reportError(error,'local-write',key);throw error;}
    if(notify)notifyChange(key);
    if(mirror&&shouldMirror(key))enqueueMirror(()=>putRawRecord(key,String(raw)),'mirror-write',key);
    return raw;
  }
  function write(key,value,options){
    let raw;
    try{raw=JSON.stringify(value);}
    catch(error){reportError(error,'serialize',key);throw error;}
    writeRaw(key,raw,options);
    return value;
  }
  function remove(key,{notify=true,mirror=true}={}){
    try{localStorage.removeItem(key);}
    catch(error){reportError(error,'local-remove',key);throw error;}
    if(notify)notifyChange(key);
    if(mirror&&shouldMirror(key))enqueueMirror(()=>deleteRecord(key),'mirror-remove',key);
  }
  async function readIndexed(key,fallback){
    try{
      const database=await openDatabase();
      const transaction=database.transaction(RECORDS_STORE,'readonly');
      const done=transactionDone(transaction);
      const record=await requestResult(transaction.objectStore(RECORDS_STORE).get(key));
      await done;
      if(!record)return clone(fallback);
      return JSON.parse(record.raw)??clone(fallback);
    }catch(error){reportError(error,'indexed-read',key);return clone(fallback);}
  }
  async function getMeta(id){
    const database=await openDatabase();
    const transaction=database.transaction(META_STORE,'readonly');
    const done=transactionDone(transaction);
    const value=await requestResult(transaction.objectStore(META_STORE).get(id));
    await done;
    return value||null;
  }
  async function trimRecoverySnapshots(database){
    const transaction=database.transaction(RECOVERY_STORE,'readwrite');
    const done=transactionDone(transaction);
    const store=transaction.objectStore(RECOVERY_STORE);
    const snapshots=await requestResult(store.getAll());
    snapshots.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(MAX_RECOVERY_SNAPSHOTS).forEach(item=>store.delete(item.id));
    await done;
  }
  async function createRecoverySnapshot(keys,reason='migration'){
    const rawByKey={};
    keys.forEach(key=>{const raw=localStorage.getItem(key);rawByKey[key]=raw===null?null:raw;});
    const snapshot={id:`recovery_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,reason,createdAt:new Date().toISOString(),keys:[...keys],rawByKey};
    const database=await openDatabase();
    const transaction=database.transaction(RECOVERY_STORE,'readwrite');
    transaction.objectStore(RECOVERY_STORE).put(snapshot);
    await transactionDone(transaction);
    await trimRecoverySnapshots(database);
    return snapshot;
  }
  function restoreLocalSnapshot(snapshot){
    Object.entries(snapshot?.rawByKey||{}).forEach(([key,raw])=>{
      if(raw===null)localStorage.removeItem(key);
      else localStorage.setItem(key,raw);
    });
  }
  async function migrateDomain(domain){
    const keys=DOMAIN_KEYS[domain];
    if(!keys)throw new Error(`Dominio de datos desconocido: ${domain}`);
    const currentConfig=config();
    if(!currentConfig.enabled||currentConfig.domains[domain]===false)return {domain,status:'disabled'};
    const targetVersion=1,metaId=`domain:${domain}`,previous=await getMeta(metaId);
    if(previous?.status==='complete'&&Number(previous.version)>=targetVersion)return previous;
    const snapshot=await createRecoverySnapshot(keys,`migration:${domain}:v${targetVersion}`);
    try{
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,META_STORE],'readwrite');
      const records=transaction.objectStore(RECORDS_STORE);
      let keyCount=0;
      keys.forEach(key=>{
        const raw=localStorage.getItem(key);
        if(raw===null)return;
        records.put({key,domain,raw:sanitizeRawForMirror(key,raw),updatedAt:new Date().toISOString()});
        keyCount+=1;
      });
      const result={id:metaId,domain,version:targetVersion,status:'complete',mode:'shadow',keyCount,snapshotId:snapshot.id,completedAt:new Date().toISOString()};
      transaction.objectStore(META_STORE).put(result);
      await transactionDone(transaction);
      emit('app-data-migrated',result);
      return result;
    }catch(error){
      restoreLocalSnapshot(snapshot);
      reportError(error,'migration',domain);
      throw error;
    }
  }
  async function migrateAll(){
    const results=[];
    for(const domain of Object.keys(DOMAIN_KEYS)){
      try{results.push(await migrateDomain(domain));}
      catch(error){results.push({domain,status:'rolled-back',error:classifyError(error)});}
    }
    return results;
  }
  function schedule(task){
    if(typeof global.requestIdleCallback==='function')global.requestIdleCallback(()=>task(),{timeout:1200});
    else setTimeout(task,0);
  }
  function initialize(){
    if(initializationPromise)return initializationPromise;
    initializationPromise=new Promise(resolve=>schedule(async()=>{
      if(!global.indexedDB||!config().enabled){resolve([]);return;}
      try{resolve(await migrateAll());}
      catch(error){reportError(error,'initialize');resolve([]);}
    }));
    return initializationPromise;
  }
  async function flush(){await mirrorQueue;}
  async function replaceMany(changes,{reason='transaction'}={}){
    const entries=Object.entries(changes||{});
    const keys=entries.map(([key])=>key);
    const snapshot=await createRecoverySnapshot(keys,reason);
    try{
      const rawEntries=entries.map(([key,value])=>[key,value===undefined?null:JSON.stringify(value)]);
      rawEntries.forEach(([key,raw])=>{
        if(raw===null)localStorage.removeItem(key);
        else localStorage.setItem(key,raw);
      });
      const mirrored=rawEntries.filter(([key])=>shouldMirror(key));
      if(mirrored.length){
        const database=await openDatabase();
        const transaction=database.transaction(RECORDS_STORE,'readwrite');
        const records=transaction.objectStore(RECORDS_STORE);
        mirrored.forEach(([key,raw])=>{
          if(raw===null)records.delete(key);
          else records.put({key,domain:domainForKey(key),raw:sanitizeRawForMirror(key,raw),updatedAt:new Date().toISOString()});
        });
        await transactionDone(transaction);
      }
      keys.forEach(key=>notifyChange(key));
      return {ok:true,snapshotId:snapshot.id,keys};
    }catch(error){
      restoreLocalSnapshot(snapshot);
      reportError(error,'replace-many');
      return {ok:false,snapshotId:snapshot.id,error:classifyError(error),keys};
    }
  }
  async function restoreRecovery(snapshotId){
    const database=await openDatabase();
    const transaction=database.transaction(RECOVERY_STORE,'readonly');
    const done=transactionDone(transaction);
    const snapshot=await requestResult(transaction.objectStore(RECOVERY_STORE).get(snapshotId));
    await done;
    if(!snapshot)return false;
    const changes={};
    Object.entries(snapshot.rawByKey||{}).forEach(([key,raw])=>{changes[key]=raw===null?undefined:JSON.parse(raw);});
    const result=await replaceMany(changes,{reason:`restore:${snapshotId}`});
    return result.ok;
  }
  async function purgeKeys(keys){
    const selected=[...new Set((keys||[]).filter(Boolean))];
    selected.forEach(key=>localStorage.removeItem(key));
    if(global.indexedDB&&selected.length){
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,RECOVERY_STORE],'readwrite');
      const done=transactionDone(transaction);
      const records=transaction.objectStore(RECORDS_STORE),recovery=transaction.objectStore(RECOVERY_STORE);
      selected.forEach(key=>records.delete(key));
      const snapshots=await requestResult(recovery.getAll());
      snapshots.forEach(snapshot=>{
        selected.forEach(key=>delete snapshot.rawByKey?.[key]);
        snapshot.keys=(snapshot.keys||[]).filter(key=>!selected.includes(key));
        if(snapshot.keys.length)recovery.put(snapshot);
        else recovery.delete(snapshot.id);
      });
      await done;
    }
    selected.forEach(key=>notifyChange(key));
    return selected.length;
  }
  async function clearAllData(){
    const localKeys=[];
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index);
      if(key?.startsWith('protocolo_0_100_'))localKeys.push(key);
    }
    localKeys.forEach(key=>localStorage.removeItem(key));
    if(global.indexedDB){
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,META_STORE,RECOVERY_STORE],'readwrite');
      transaction.objectStore(RECORDS_STORE).clear();
      transaction.objectStore(META_STORE).clear();
      transaction.objectStore(RECOVERY_STORE).clear();
      await transactionDone(transaction);
    }
    localKeys.forEach(key=>notifyChange(key));
    return localKeys.length;
  }
  async function diagnostics(){
    const output={database:DB_NAME,version:DB_VERSION,mode:config().mode,enabled:config().enabled,indexedDB:!!global.indexedDB,lastError:lastError?{...lastError}:null,domains:{}};
    if(!global.indexedDB)return output;
    for(const domain of Object.keys(DOMAIN_KEYS)){
      try{const meta=await getMeta(`domain:${domain}`);output.domains[domain]=meta?{status:meta.status,version:meta.version,keyCount:meta.keyCount,completedAt:meta.completedAt}:{status:'pending'};}
      catch(error){output.domains[domain]={status:'unavailable'};}
    }
    if(global.navigator?.storage?.estimate){
      try{const estimate=await global.navigator.storage.estimate();output.storage={usage:estimate.usage||0,quota:estimate.quota||0};}catch(error){/* Optional browser API. */}
    }
    return output;
  }
  function setupCrossTabChannel(){
    if(typeof global.BroadcastChannel==='function'){
      try{
        channel=new BroadcastChannel(CHANNEL_NAME);
        channel.addEventListener('message',event=>notifyChange(event.data?.key||'', 'broadcast'));
      }catch(error){channel=null;}
    }
    global.addEventListener?.('storage',event=>{
      if(event.storageArea===localStorage&&event.key?.startsWith('protocolo_0_100_'))notifyChange(event.key,'storage');
    });
  }

  global.APP_DATA=Object.freeze({
    DB_NAME,DB_VERSION,CONFIG_KEY,DOMAIN_KEYS,domainForKey,config,read,write,writeRaw,remove,
    readIndexed,migrateDomain,migrateAll,initialize,ready:initialize,flush,replaceMany,
    createRecoverySnapshot,restoreRecovery,purgeKeys,clearAllData,diagnostics
  });
  setupCrossTabChannel();
  initialize();
})(window);
