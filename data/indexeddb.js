(function(global){
  'use strict';

  const registry=global.APP_SCHEMA_REGISTRY;
  if(!registry)throw new Error('APP_SCHEMA_REGISTRY debe cargar antes de IndexedDB.');
  const DB_NAME='protocolo_0_100_data';
  const DB_VERSION=2;
  const RECORDS_STORE='records';
  const META_STORE='meta';
  const RECOVERY_STORE='recovery';
  const QUARANTINE_STORE='quarantine';
  const CONFIG_KEY=registry.getByName('diagnostics','dataLayerConfig').key;
  const CHANNEL_NAME='protocolo_0_100_data_changes_v1';
  const MAX_RECOVERY_SNAPSHOTS=5;
  const DOMAIN_KEYS=registry.domainKeys({mirrorOnly:true});
  const PRIMARY_KEYS=registry.primaryGroupKeys();
  const DEFAULT_CONFIG=Object.freeze({
    schemaVersion:1,
    enabled:true,
    mode:'shadow',
    domains:Object.freeze(Object.fromEntries(Object.keys(DOMAIN_KEYS).map(domain=>[domain,true]))),
    primaryDomains:Object.freeze({nutrition:true,workout:true,nutritionCache:true,gymParty:true})
  });

  let databasePromise=null;
  let initializationPromise=null;
  let mirrorQueue=Promise.resolve();
  let quarantineQueue=Promise.resolve();
  let channel=null;
  let lastError=null;
  const primaryRawCache=new Map();
  const primaryReadyDomains=new Set();

  function clone(value){
    if(value===undefined)return undefined;
    try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
    catch(error){return value;}
  }
  function config(){
    try{
      const stored=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')||{};
      return {...DEFAULT_CONFIG,...stored,domains:{...DEFAULT_CONFIG.domains,...(stored.domains||{})},primaryDomains:{...DEFAULT_CONFIG.primaryDomains,...(stored.primaryDomains||{})}};
    }catch(error){return {...DEFAULT_CONFIG,domains:{...DEFAULT_CONFIG.domains},primaryDomains:{...DEFAULT_CONFIG.primaryDomains}};}
  }
  function saveConfig(next){
    const current=config(),value={...current,...next,domains:{...current.domains,...(next.domains||{})},primaryDomains:{...current.primaryDomains,...(next.primaryDomains||{})}};
    localStorage.setItem(CONFIG_KEY,JSON.stringify(value));emit('app-data-config-change',{mode:value.mode,primaryDomains:{...value.primaryDomains}});return value;
  }
  function recordForKey(key){
    const record=registry.get(key);
    if(!record)throw new Error(`Clave persistida no registrada: ${key}`);
    return record;
  }
  function domainForKey(key){return registry.get(key)?.domain||'';}
  function primaryGroupForKey(key){const record=registry.get(key);return record?.primaryGroup||record?.domain||'';}
  function isPrimaryDomain(domain,current=config()){return !!(current.enabled&&current.primaryDomains?.[domain]&&PRIMARY_KEYS[domain]);}
  function isPrimaryReady(domain){return primaryReadyDomains.has(domain);}
  function shouldMirror(key){
    const record=registry.get(key),domain=record?.domain,primaryGroup=record?.primaryGroup||domain,current=config();
    return !!(record?.mirrorEnabled&&domain&&current.enabled&&(current.mode==='shadow'||isPrimaryDomain(primaryGroup,current))&&current.domains[domain]!==false);
  }
  function sanitizeRawForMirror(key,raw){
    const record=recordForKey(key);
    if(record.redaction!=='firebase-config')return raw;
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
        if(!database.objectStoreNames.contains(QUARANTINE_STORE)){
          const store=database.createObjectStore(QUARANTINE_STORE,{keyPath:'id'});
          store.createIndex('createdAt','createdAt');
          store.createIndex('key','key');
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
  function hashRaw(value){
    let hash=2166136261;for(let index=0;index<String(value).length;index++){hash^=String(value).charCodeAt(index);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');
  }
  function rawForQuarantine(record,raw){
    if(record.sensitive)return null;
    if(record.redaction!=='firebase-config')return raw;
    try{const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value))delete value.firebaseConfig;return JSON.stringify(value);}
    catch(error){return null;}
  }
  function inspectRaw(key,raw){
    const record=registry.get(key);
    if(!record)return{status:'unsupported',key,raw,error:'unregistered-key'};
    if(raw===null||raw===undefined)return{status:'missing',key,record,raw:null};
    let value;
    try{value=record.serialization==='raw'?String(raw):JSON.parse(raw);}
    catch(error){return{status:'corrupt',key,record,raw:String(raw),error:'invalid-json'};}
    return{...registry.validate(key,value),raw:String(raw)};
  }
  function retentionMilliseconds(value){
    const match=String(value||'').match(/^ttl:(\d+)(m|h|d)$/);if(!match)return 0;
    const multiplier={m:60000,h:3600000,d:86400000}[match[2]]||0;return Number(match[1])*multiplier;
  }
  function applyRetention(key,value,{now=Date.now()}={}){
    const record=recordForKey(key),policy=String(record.retention||'indefinite');let next=value,removedCount=0;
    const ttl=retentionMilliseconds(policy);
    if(ttl&&value&&typeof value==='object'&&!Array.isArray(value)){
      next={};Object.entries(value).forEach(([entryKey,entry])=>{
        const cachedAt=Number(entry?.cachedAt);if(Number.isFinite(cachedAt)&&cachedAt>0&&now-cachedAt<ttl)next[entryKey]=entry;else removedCount+=1;
      });
    }else{
      const lru=policy.match(/^least-recently-used:(\d+)$/),limit=lru?Math.max(1,Number(lru[1])||0):0;
      if(limit&&Array.isArray(value)&&value.length>limit){removedCount=value.length-limit;next=value.slice(-limit);}
    }
    return{value:next,changed:removedCount>0,removedCount,policy};
  }
  function retainResult(result,now=Date.now()){
    if(!['valid','legacy'].includes(result?.status))return result;
    const retained=applyRetention(result.key,result.value,{now});if(!retained.changed)return{...result,retention:retained};
    return{...result,value:retained.value,raw:JSON.stringify(retained.value),retention:retained};
  }
  async function captureQuarantine(result){
    if(!global.indexedDB||!result?.record||!['corrupt','unsupported'].includes(result.status))return null;
    const safeRaw=rawForQuarantine(result.record,result.raw),fingerprint=hashRaw(`${result.key}:${result.raw}`),id=`quarantine_${fingerprint}`;
    const database=await openDatabase(),transaction=database.transaction([QUARANTINE_STORE,RECORDS_STORE],'readwrite'),done=transactionDone(transaction),store=transaction.objectStore(QUARANTINE_STORE),records=transaction.objectStore(RECORDS_STORE),existing=await requestResult(store.get(id)),indexedRecord=await requestResult(records.get(result.key)),now=new Date().toISOString();
    const entry={id,key:result.key,name:result.record.name,domain:result.record.domain,status:result.status,error:result.error||'schema-validation',schemaVersion:result.record.schemaVersion,storedVersion:result.storedVersion||null,createdAt:existing?.createdAt||now,lastSeenAt:now,occurrences:Number(existing?.occurrences||0)+1,raw:safeRaw,redacted:safeRaw===null};
    store.put(entry);if(!indexedRecord||!['valid','legacy'].includes(inspectRaw(result.key,indexedRecord.raw).status))records.delete(result.key);await done;
    if(localStorage.getItem(result.key)===result.raw)localStorage.removeItem(result.key);
    notifyChange(result.key,'quarantine');
    emit('app-data-quarantined',{id,key:entry.key,domain:entry.domain,status:entry.status,error:entry.error,redacted:entry.redacted});
    return entry;
  }
  function scheduleQuarantine(result){
    quarantineQueue=quarantineQueue.then(()=>captureQuarantine(result)).catch(error=>reportError(error,'quarantine',result?.key||''));
    return quarantineQueue;
  }
  function notifyChange(key,source='local'){
    const detail={key,domain:domainForKey(key),primaryGroup:primaryGroupForKey(key),source,at:new Date().toISOString()};
    if(source!=='local'&&primaryReadyDomains.has(detail.primaryGroup)&&PRIMARY_KEYS[detail.primaryGroup]?.includes(key)){
      const result=inspectRaw(key,localStorage.getItem(key));
      if(['valid','legacy'].includes(result.status))primaryRawCache.set(key,result.raw);else primaryRawCache.delete(key);
    }
    emit('app-data-change',detail);
    if(source==='local'){
      try{channel?.postMessage(detail);}catch(error){/* Storage event remains as fallback. */}
    }
  }
  function readResult(key,{quarantine=true}={}){
    recordForKey(key);
    const primaryGroup=primaryGroupForKey(key),usePrimary=isPrimaryDomain(primaryGroup)&&primaryReadyDomains.has(primaryGroup);let raw=usePrimary?(primaryRawCache.has(key)?primaryRawCache.get(key):null):localStorage.getItem(key),source=usePrimary?'indexeddb':'localStorage';
    if(usePrimary){
      const localRaw=localStorage.getItem(key);
      if(localRaw!==null&&localRaw!==raw){
        const localResult=inspectRaw(key,localRaw);
        if(['valid','legacy'].includes(localResult.status)){
          raw=localRaw;source='localStorage-write-ahead';primaryRawCache.set(key,localRaw);
          if(shouldMirror(key))enqueueMirror(()=>putRawRecord(key,localRaw),'write-ahead-reconcile',key);
        }else{
          raw=localRaw;source='localStorage-write-ahead';
          if(quarantine)scheduleQuarantine(localResult);
        }
      }
    }
    const result={...retainResult(inspectRaw(key,raw)),source};
    if(result.retention?.changed){
      localStorage.setItem(key,result.raw);if(usePrimary)primaryRawCache.set(key,result.raw);
      if(shouldMirror(key))enqueueMirror(()=>putRawRecord(key,result.raw),'retention-prune',key);
      emit('app-data-retention',{key,domain:domainForKey(key),primaryGroup,removedCount:result.retention.removedCount,policy:result.retention.policy});
    }
    if(quarantine&&['corrupt','unsupported'].includes(result.status))scheduleQuarantine(result);
    return result;
  }
  function read(key,fallback){
    const result=readResult(key);
    return ['valid','legacy'].includes(result.status)?clone(result.value):clone(fallback);
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
    const result=retainResult(inspectRaw(key,String(raw))),normalizedRaw=result.raw;
    if(!['valid','legacy'].includes(result.status))throw new Error(`Datos invalidos para ${key}: ${result.error||result.status}`);
    try{localStorage.setItem(key,normalizedRaw);}
    catch(error){reportError(error,'local-write',key);throw error;}
    if(notify)notifyChange(key);
    if(isPrimaryDomain(primaryGroupForKey(key))){primaryRawCache.set(key,normalizedRaw);}
    if(mirror&&shouldMirror(key))enqueueMirror(()=>putRawRecord(key,normalizedRaw),'mirror-write',key);
    if(result.retention?.changed)emit('app-data-retention',{key,domain:domainForKey(key),primaryGroup:primaryGroupForKey(key),removedCount:result.retention.removedCount,policy:result.retention.policy});
    return normalizedRaw;
  }
  function write(key,value,options){
    const record=recordForKey(key);let raw;
    try{raw=record.serialization==='raw'?String(value):JSON.stringify(value);}
    catch(error){reportError(error,'serialize',key);throw error;}
    writeRaw(key,raw,options);
    return value;
  }
  function remove(key,{notify=true,mirror=true}={}){
    recordForKey(key);
    try{localStorage.removeItem(key);}
    catch(error){reportError(error,'local-remove',key);throw error;}
    if(notify)notifyChange(key);
    primaryRawCache.delete(key);
    if(mirror&&shouldMirror(key))enqueueMirror(()=>deleteRecord(key),'mirror-remove',key);
  }
  async function readIndexedResult(key,{quarantine=true}={}){
    recordForKey(key);
    try{
      const database=await openDatabase();
      const transaction=database.transaction(RECORDS_STORE,'readonly');
      const done=transactionDone(transaction);
      const record=await requestResult(transaction.objectStore(RECORDS_STORE).get(key));
      await done;
      if(!record)return{status:'missing',key,record:recordForKey(key),raw:null};
      const result=retainResult(inspectRaw(key,record.raw));
      if(quarantine&&['corrupt','unsupported'].includes(result.status))scheduleQuarantine(result);
      if(result.retention?.changed)enqueueMirror(()=>putRawRecord(key,result.raw),'indexed-retention-prune',key);
      return result;
    }catch(error){reportError(error,'indexed-read',key);return{status:'corrupt',key,record:recordForKey(key),error:'indexed-read',raw:null};}
  }
  async function readIndexed(key,fallback){
    const result=await readIndexedResult(key);
    return ['valid','legacy'].includes(result.status)?clone(result.value):clone(fallback);
  }
  async function getMeta(id){
    const database=await openDatabase();
    const transaction=database.transaction(META_STORE,'readonly');
    const done=transactionDone(transaction);
    const value=await requestResult(transaction.objectStore(META_STORE).get(id));
    await done;
    return value||null;
  }
  async function putMeta(value){
    const database=await openDatabase(),transaction=database.transaction(META_STORE,'readwrite');transaction.objectStore(META_STORE).put(value);await transactionDone(transaction);return value;
  }
  async function hydratePrimaryDomain(domain){
    if(!isPrimaryDomain(domain))return{domain,status:'disabled',storageMode:'shadow'};
    const keys=PRIMARY_KEYS[domain];if(!keys)throw new Error(`Dominio primario desconocido: ${domain}`);
    const database=await openDatabase(),readTransaction=database.transaction(RECORDS_STORE,'readonly'),readDone=transactionDone(readTransaction),stored=await requestResult(readTransaction.objectStore(RECORDS_STORE).getAll());await readDone;
    const indexedByKey=new Map(stored.filter(item=>keys.includes(item.key)).map(item=>[item.key,item])),writes=[],divergences=[],recovered=[],retention=[];keys.forEach(key=>primaryRawCache.delete(key));
    const now=Date.now();
    for(const key of keys){
      const localRaw=localStorage.getItem(key),localResult=retainResult(inspectRaw(key,localRaw),now),indexedRecord=indexedByKey.get(key),indexedResult=retainResult(inspectRaw(key,indexedRecord?.raw??null),now);
      if(['corrupt','unsupported'].includes(localResult.status))await captureQuarantine(localResult);
      if(['corrupt','unsupported'].includes(indexedResult.status))await captureQuarantine(indexedResult);
      const localValid=['valid','legacy'].includes(localResult.status),indexedValid=['valid','legacy'].includes(indexedResult.status);let selectedRaw=null;
      if(localResult.retention?.changed){localStorage.setItem(key,localResult.raw);retention.push({key,source:'localStorage',removedCount:localResult.retention.removedCount,policy:localResult.retention.policy});}
      if(indexedResult.retention?.changed)retention.push({key,source:'indexeddb',removedCount:indexedResult.retention.removedCount,policy:indexedResult.retention.policy});
      if(localValid){
        selectedRaw=localResult.raw;
        if(!indexedValid||hashRaw(localResult.raw)!==hashRaw(indexedResult.raw)){
          if(indexedValid)divergences.push({key,name:recordForKey(key).name,localChecksum:hashRaw(localResult.raw),indexedChecksum:hashRaw(indexedResult.raw),resolution:'local-write-ahead'});
          writes.push({key,domain:domainForKey(key),raw:sanitizeRawForMirror(key,localResult.raw),updatedAt:new Date().toISOString()});
        }
      }else if(indexedValid){
        selectedRaw=indexedResult.raw;localStorage.setItem(key,indexedResult.raw);recovered.push({key,name:recordForKey(key).name,source:'indexeddb'});notifyChange(key,'primary-recovery');
        if(indexedResult.retention?.changed)writes.push({key,domain:domainForKey(key),raw:indexedResult.raw,updatedAt:new Date().toISOString()});
      }
      if(selectedRaw===null)primaryRawCache.delete(key);else primaryRawCache.set(key,selectedRaw);
    }
    if(writes.length){const transaction=database.transaction(RECORDS_STORE,'readwrite'),store=transaction.objectStore(RECORDS_STORE);writes.forEach(item=>store.put(item));await transactionDone(transaction);}
    primaryReadyDomains.add(domain);
    const result={id:`primary:${domain}`,domain,status:'ready',storageMode:'primary',keyCount:keys.length,cachedKeys:keys.filter(key=>primaryRawCache.has(key)).length,divergenceCount:divergences.length,divergences,recoveredCount:recovered.length,recovered,retentionPrunedCount:retention.reduce((sum,item)=>sum+item.removedCount,0),retention,hydratedAt:new Date().toISOString()};await putMeta(result);emit('app-data-primary-ready',result);return result;
  }
  async function setPrimaryDomain(domain,enabled){
    if(!PRIMARY_KEYS[domain])throw new Error(`Dominio primario desconocido: ${domain}`);
    const previous=config().primaryDomains?.[domain]===true;
    if(enabled){
      const snapshot=await createRecoverySnapshot(PRIMARY_KEYS[domain],`primary-enable:${domain}`);
      try{
        saveConfig({primaryDomains:{[domain]:true}});await requestPersistentStorage({request:true});
        const sourceDomains=[...new Set(PRIMARY_KEYS[domain].map(domainForKey))];for(const sourceDomain of sourceDomains)await migrateDomain(sourceDomain);
        const result=await hydratePrimaryDomain(domain);result.activationSnapshotId=snapshot.id;await putMeta(result);return result;
      }catch(error){restoreLocalSnapshot(snapshot);saveConfig({primaryDomains:{[domain]:previous}});PRIMARY_KEYS[domain].forEach(key=>primaryRawCache.delete(key));primaryReadyDomains.delete(domain);reportError(error,'primary-enable',domain);throw error;}
    }
    saveConfig({primaryDomains:{[domain]:false}});
    PRIMARY_KEYS[domain].forEach(key=>primaryRawCache.delete(key));primaryReadyDomains.delete(domain);
    const result={id:`primary:${domain}`,domain,status:'rolled-back',storageMode:'shadow',rolledBackAt:new Date().toISOString()};await putMeta(result);emit('app-data-primary-ready',result);return result;
  }
  async function primaryDomainStatus(domain){return getMeta(`primary:${domain}`);}
  async function requestPersistentStorage({request=false}={}){
    if(!global.navigator?.storage)return{supported:false,persisted:false};
    let persisted=false;try{persisted=typeof global.navigator.storage.persisted==='function'&&await global.navigator.storage.persisted();if(request&&!persisted&&typeof global.navigator.storage.persist==='function')persisted=await global.navigator.storage.persist();}
    catch(error){return{supported:true,persisted:false,error:'unavailable'};}
    return{supported:typeof global.navigator.storage.persist==='function',persisted:!!persisted};
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
    keys.forEach(recordForKey);
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
      if(isPrimaryDomain(primaryGroupForKey(key))){if(raw===null)primaryRawCache.delete(key);else primaryRawCache.set(key,raw);}
    });
  }
  async function migrateDomain(domain){
    const keys=DOMAIN_KEYS[domain];
    if(!keys)throw new Error(`Dominio de datos desconocido: ${domain}`);
    const currentConfig=config();
    if(!currentConfig.enabled||currentConfig.domains[domain]===false)return {domain,status:'disabled'};
    const targetVersion=2,metaId=`domain:${domain}`,previous=await getMeta(metaId);
    if(previous?.status==='complete'&&Number(previous.version)>=targetVersion)return previous;
    const snapshot=await createRecoverySnapshot(keys,`migration:${domain}:v${targetVersion}`);
    try{
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,META_STORE],'readwrite');
      const records=transaction.objectStore(RECORDS_STORE);
      let keyCount=0;const invalidKeys=[];
      keys.forEach(key=>{
        const raw=localStorage.getItem(key);
        if(raw===null)return;
        const result=inspectRaw(key,raw);
        if(!['valid','legacy'].includes(result.status)){invalidKeys.push(key);scheduleQuarantine(result);return;}
        records.put({key,domain,raw:sanitizeRawForMirror(key,raw),updatedAt:new Date().toISOString()});
        keyCount+=1;
      });
      const result={id:metaId,domain,version:targetVersion,status:invalidKeys.length?'review-needed':'complete',mode:'shadow',keyCount,invalidKeys,snapshotId:snapshot.id,completedAt:new Date().toISOString()};
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
      try{
        const results=await migrateAll();
        for(const domain of Object.keys(config().primaryDomains||{}))if(isPrimaryDomain(domain))await hydratePrimaryDomain(domain);
        resolve(results);
      }
      catch(error){reportError(error,'initialize');resolve([]);}
    }));
    return initializationPromise;
  }
  async function flush(){await mirrorQueue;await quarantineQueue;}
  async function replaceMany(changes,{reason='transaction',rawKeys=[]}={}){
    const entries=Object.entries(changes||{});
    const keys=entries.map(([key])=>key);
    let snapshot=null;
    try{
      keys.forEach(recordForKey);
      const rawSet=new Set(rawKeys);
      const rawEntries=entries.map(([key,value])=>[key,value===undefined?null:rawSet.has(key)?String(value):recordForKey(key).serialization==='raw'?String(value):JSON.stringify(value)]);
      rawEntries.forEach(([key,raw])=>{if(raw===null)return;const result=inspectRaw(key,raw);if(!['valid','legacy'].includes(result.status))throw new Error(`Datos invalidos para ${key}: ${result.error||result.status}`);});
      snapshot=await createRecoverySnapshot(keys,reason);
      rawEntries.forEach(([key,raw])=>{
        if(raw===null)localStorage.removeItem(key);
        else localStorage.setItem(key,raw);
        if(isPrimaryDomain(primaryGroupForKey(key))){if(raw===null)primaryRawCache.delete(key);else primaryRawCache.set(key,raw);}
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
      if(snapshot)restoreLocalSnapshot(snapshot);
      reportError(error,'replace-many');
      return {ok:false,snapshotId:snapshot?.id||null,error:classifyError(error),keys};
    }
  }
  async function restoreRecovery(snapshotId){
    const database=await openDatabase();
    const transaction=database.transaction(RECOVERY_STORE,'readonly');
    const done=transactionDone(transaction);
    const snapshot=await requestResult(transaction.objectStore(RECOVERY_STORE).get(snapshotId));
    await done;
    if(!snapshot)return false;
    const current=await createRecoverySnapshot(snapshot.keys||[],`before-restore:${snapshotId}`);
    try{
      restoreLocalSnapshot(snapshot);
      const mirrored=Object.entries(snapshot.rawByKey||{}).filter(([key])=>shouldMirror(key));
      if(mirrored.length){
        const database=await openDatabase();
        const writeTransaction=database.transaction(RECORDS_STORE,'readwrite');
        const records=writeTransaction.objectStore(RECORDS_STORE);
        mirrored.forEach(([key,raw])=>{
          if(raw===null)records.delete(key);
          else records.put({key,domain:domainForKey(key),raw:sanitizeRawForMirror(key,raw),updatedAt:new Date().toISOString()});
        });
        await transactionDone(writeTransaction);
      }
      (snapshot.keys||[]).forEach(key=>notifyChange(key));
      return {ok:true,snapshotId,currentSnapshotId:current.id};
    }catch(error){
      restoreLocalSnapshot(current);
      reportError(error,'restore-recovery');
      return {ok:false,snapshotId,error:classifyError(error)};
    }
  }
  async function purgeKeys(keys){
    const selected=[...new Set((keys||[]).filter(Boolean))];
    selected.forEach(key=>{if(registry.get(key))return;throw new Error(`Clave persistida no registrada: ${key}`);});
    selected.forEach(key=>localStorage.removeItem(key));
    selected.forEach(key=>primaryRawCache.delete(key));
    if(global.indexedDB&&selected.length){
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,RECOVERY_STORE,QUARANTINE_STORE],'readwrite');
      const done=transactionDone(transaction);
      const records=transaction.objectStore(RECORDS_STORE),recovery=transaction.objectStore(RECOVERY_STORE),quarantine=transaction.objectStore(QUARANTINE_STORE);
      selected.forEach(key=>records.delete(key));
      const snapshots=await requestResult(recovery.getAll());
      snapshots.forEach(snapshot=>{
        selected.forEach(key=>delete snapshot.rawByKey?.[key]);
        snapshot.keys=(snapshot.keys||[]).filter(key=>!selected.includes(key));
        if(snapshot.keys.length)recovery.put(snapshot);
        else recovery.delete(snapshot.id);
      });
      const quarantined=await requestResult(quarantine.getAll());
      quarantined.filter(entry=>selected.includes(entry.key)).forEach(entry=>quarantine.delete(entry.id));
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
    primaryRawCache.clear();primaryReadyDomains.clear();
    if(global.indexedDB){
      const database=await openDatabase();
      const transaction=database.transaction([RECORDS_STORE,META_STORE,RECOVERY_STORE,QUARANTINE_STORE],'readwrite');
      transaction.objectStore(RECORDS_STORE).clear();
      transaction.objectStore(META_STORE).clear();
      transaction.objectStore(RECOVERY_STORE).clear();
      transaction.objectStore(QUARANTINE_STORE).clear();
      await transactionDone(transaction);
    }
    localKeys.forEach(key=>notifyChange(key));
    return localKeys.length;
  }
  async function diagnostics(){
    const unknownLocalKeys=[];
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index);
      if(key?.startsWith('protocolo_0_100_')&&!registry.get(key))unknownLocalKeys.push(key);
    }
    const output={database:DB_NAME,version:DB_VERSION,mode:config().mode,enabled:config().enabled,indexedDB:!!global.indexedDB,lastError:lastError?{...lastError}:null,schemaRegistry:{version:registry.REGISTRY_VERSION,registeredKeys:registry.all().length,unknownLocalKeys},quarantine:{count:0},domains:{},primaryGroups:{}};
    if(!global.indexedDB)return output;
    try{output.quarantine.count=(await quarantineList()).length;}catch(error){output.quarantine={count:0,status:'unavailable'};}
    for(const domain of Object.keys(DOMAIN_KEYS)){
      try{
        const meta=await getMeta(`domain:${domain}`),primary=await getMeta(`primary:${domain}`),storageMode=isPrimaryDomain(domain)?'primary':'shadow';
        output.domains[domain]=meta?{status:meta.status,version:meta.version,keyCount:meta.keyCount,completedAt:meta.completedAt,storageMode,primaryStatus:primary?.status||'pending',divergenceCount:primary?.divergenceCount||0,recoveredCount:primary?.recoveredCount||0,hydratedAt:primary?.hydratedAt||null}:{status:'pending',storageMode};
      }
      catch(error){output.domains[domain]={status:'unavailable'};}
    }
    if(global.navigator?.storage?.estimate){
      try{const estimate=await global.navigator.storage.estimate();output.storage={usage:estimate.usage||0,quota:estimate.quota||0};}catch(error){/* Optional browser API. */}
    }
    for(const group of Object.keys(PRIMARY_KEYS)){
      try{
        const primary=await getMeta(`primary:${group}`);output.primaryGroups[group]={storageMode:isPrimaryDomain(group)?'primary':'shadow',status:primary?.status||'pending',keyCount:PRIMARY_KEYS[group].length,divergenceCount:primary?.divergenceCount||0,recoveredCount:primary?.recoveredCount||0,retentionPrunedCount:primary?.retentionPrunedCount||0,hydratedAt:primary?.hydratedAt||null};
      }catch(error){output.primaryGroups[group]={storageMode:isPrimaryDomain(group)?'primary':'shadow',status:'unavailable',keyCount:PRIMARY_KEYS[group].length};}
    }
    if(global.navigator?.storage)output.persistence=await requestPersistentStorage();
    return output;
  }
  async function quarantineList({includeRaw=false}={}){
    if(!global.indexedDB)return[];
    const database=await openDatabase(),transaction=database.transaction(QUARANTINE_STORE,'readonly'),done=transactionDone(transaction),items=await requestResult(transaction.objectStore(QUARANTINE_STORE).getAll());await done;
    return items.sort((a,b)=>String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))).map(item=>includeRaw?{...item}:{...item,raw:undefined});
  }
  async function quarantineGet(id,{includeRaw=false}={}){
    const database=await openDatabase(),transaction=database.transaction(QUARANTINE_STORE,'readonly'),done=transactionDone(transaction),item=await requestResult(transaction.objectStore(QUARANTINE_STORE).get(id));await done;
    return item?(includeRaw?{...item}:{...item,raw:undefined}):null;
  }
  async function quarantineDelete(id){
    const database=await openDatabase(),transaction=database.transaction(QUARANTINE_STORE,'readwrite');transaction.objectStore(QUARANTINE_STORE).delete(id);await transactionDone(transaction);emit('app-data-quarantine-change',{id,action:'deleted'});return true;
  }
  async function quarantineRestore(id,repairedRaw){
    const item=await quarantineGet(id,{includeRaw:true});if(!item)throw new Error('El registro en cuarentena ya no existe.');
    const raw=repairedRaw===undefined?item.raw:String(repairedRaw);if(raw===null)throw new Error('Este registro fue redactado por seguridad y no puede restaurarse.');
    const result=inspectRaw(item.key,raw);if(!['valid','legacy'].includes(result.status))throw new Error(`Los datos aun no son validos: ${result.error||result.status}`);
    const snapshot=await createRecoverySnapshot([item.key],`quarantine-restore:${id}`);writeRaw(item.key,raw);await flush();await quarantineDelete(id);emit('app-data-quarantine-change',{id,key:item.key,action:'restored'});return{ok:true,key:item.key,snapshotId:snapshot.id,status:result.status};
  }
  async function quarantineExport(){return{schemaVersion:1,exportedAt:new Date().toISOString(),entries:await quarantineList({includeRaw:true})};}
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
    DB_NAME,DB_VERSION,CONFIG_KEY,DOMAIN_KEYS,PRIMARY_KEYS,domainForKey,primaryGroupForKey,config,saveConfig,isPrimaryDomain,isPrimaryReady,read,write,writeRaw,remove,
    readResult,readIndexed,readIndexedResult,inspectRaw,migrateDomain,migrateAll,initialize,ready:initialize,flush,replaceMany,
    createRecoverySnapshot,restoreRecovery,purgeKeys,clearAllData,diagnostics,
    hydratePrimaryDomain,setPrimaryDomain,primaryDomainStatus,requestPersistentStorage,
    quarantineList,quarantineGet,quarantineDelete,quarantineRestore,quarantineExport,applyRetention
  });
  setupCrossTabChannel();
  initialize();
})(window);
