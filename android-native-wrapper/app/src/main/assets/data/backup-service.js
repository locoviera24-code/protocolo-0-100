(function(global){
  'use strict';

  const MAX_FILE_BYTES=8*1024*1024;
  const MAX_STRING_LENGTH=20000;
  const MAX_ARRAY_ITEMS=50000;
  const CURRENT_SCHEMA=3;
  const registry=global.APP_SCHEMA_REGISTRY;
  if(!registry)throw new Error('APP_SCHEMA_REGISTRY debe cargar antes de BackupService.');
  const ACTIVE_MODULE_KEY=registry.getByName('settings','activeModule').key;
  const HISTORY_KEY=registry.getByName('backup','importHistory').key;
  const DANGEROUS_KEYS=new Set(['__proto__','prototype','constructor']);
  const FIELD_MAP=registry.backupFieldMap();
  const META_FIELDS=new Set(['schemaVersion','appVersion','updatedAt','exportedAt','settings','startDate']);
  const IMPORT_MODES=Object.freeze({MERGE:'merge',REPLACE:'replace',KEEP:'keep'});
  const CONFLICT_POLICIES=Object.freeze({INCOMING:'incoming',CURRENT:'current',REVIEW:'review'});
  const DOMAIN_LABELS=Object.freeze({protocol:'Registro diario',workout:'Gym',nutrition:'Nutrición',gymParty:'Gym Party',settings:'Preferencias',laboratory:'Laboratorio'});

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
  function sanitizeForRecord(record,value){
    if(record?.redaction!=='firebase-config')return value;
    if(!value||typeof value!=='object')return value;
    const output={...value};delete output.firebaseConfig;return output;
  }
  function withoutLocalRedactions(record,value){
    if(record?.redaction!=='firebase-config'||!isRecord(value))return value;
    const output={...value};delete output.firebaseConfig;return output;
  }
  function restoreLocalRedactions(record,existing,value){
    if(record?.redaction!=='firebase-config'||!isRecord(existing)||!Object.prototype.hasOwnProperty.call(existing,'firebaseConfig'))return value;
    const output=isRecord(value)?clone(value):{};output.firebaseConfig=clone(existing.firebaseConfig);return output;
  }
  function validateForImport(record,value,field){
    const result=registry.validate(record.key,value);
    if(!['valid','legacy'].includes(result.status))throw new Error(`El área ${field} no tiene una estructura compatible (${result.error||result.status}).`);
    return result.value;
  }
  function buildChanges(data){
    const changes={},usedFields=new Set(),rawKeys=[];
    Object.entries(FIELD_MAP).forEach(([field,key])=>{
      if(!Object.prototype.hasOwnProperty.call(data,field))return;
      usedFields.add(field);
      if(Object.prototype.hasOwnProperty.call(changes,key))return;
      const record=registry.get(key);if(!record||record.sensitive||!record.backup)return;
      let value=sanitizeForRecord(record,data[field]);
      if(record===registry.getByName('protocol','startDate')&&!(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)))return;
      changes[key]=validateForImport(record,value,field);
      if(record.serialization==='raw')rawKeys.push(key);
    });
    const settings=data.settings&&typeof data.settings==='object'?data.settings:null;
    if(settings){
      if(typeof settings.activeModule==='string'){
        const value=cleanString(settings.activeModule).slice(0,40);changes[ACTIVE_MODULE_KEY]=validateForImport(registry.get(ACTIVE_MODULE_KEY),value,'settings.activeModule');rawKeys.push(ACTIVE_MODULE_KEY);
      }
      if(settings.nutritionProfile){const record=registry.getByName('nutrition','profile');changes[record.key]=validateForImport(record,settings.nutritionProfile,'settings.nutritionProfile');}
      if(settings.ranking){const record=registry.getByName('laboratory','rankingSettings');changes[record.key]=validateForImport(record,settings.ranking,'settings.ranking');}
      usedFields.add('settings');
    }
    const ignored=Object.keys(data).filter(field=>!usedFields.has(field)&&!META_FIELDS.has(field));
    return {changes,rawKeys,ignored};
  }
  function clone(value){return value===undefined?undefined:typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
  function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
  function canonical(value){
    if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;
    if(isRecord(value))return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  function sameValue(left,right){return canonical(left)===canonical(right);}
  function itemIdentity(item){
    if(item&&typeof item==='object'){
      const stable=item.id??item.date??item.exerciseId??item.fdcId??item.uid??item.key;
      if(stable!==undefined&&stable!==null&&String(stable)!=='')return String(stable);
      const name=item.name??item.alias??item.label;
      if(name!==undefined&&name!==null&&String(name)!=='')return `name:${String(name).trim().toLocaleLowerCase('es')}`;
      return `value:${canonical(item)}`;
    }
    return `value:${canonical(item)}`;
  }
  function itemLabel(item,identity){
    if(item&&typeof item==='object')return cleanString(item.name||item.alias||item.date||item.exerciseName||item.id||identity).slice(0,120);
    return cleanString(String(item??identity)).slice(0,120);
  }
  function emptySummary(){return{keys:0,records:0,added:0,replaced:0,conflicts:0,removed:0,duplicates:0,unchanged:0,kept:0};}
  function addSummary(target,part){Object.keys(emptySummary()).forEach(field=>{target[field]+=Number(part[field])||0;});return target;}
  function conflictId(key,identity){return `${key}::${encodeURIComponent(String(identity))}`;}
  function conflictChoice(options,domain,id){
    const settings=options?.domains?.[domain]||{},decision=settings.conflictDecisions?.[id];
    if(decision===CONFLICT_POLICIES.CURRENT||decision===CONFLICT_POLICIES.INCOMING)return decision;
    return settings.conflictPolicy===CONFLICT_POLICIES.INCOMING?CONFLICT_POLICIES.INCOMING:CONFLICT_POLICIES.CURRENT;
  }
  function uniqueIncoming(items){
    const order=[],values=new Map();let duplicates=0;
    items.forEach((item,index)=>{const id=itemIdentity(item,index);if(values.has(id))duplicates+=1;else order.push(id);values.set(id,item);});
    return{order,values,duplicates};
  }
  function planArray(record,existing,incoming,mode,options){
    const current=Array.isArray(existing)?existing:[],next=Array.isArray(incoming)?incoming:[];
    const currentMap=new Map(current.map((item,index)=>[itemIdentity(item,index),item]));
    const unique=uniqueIncoming(next),incomingIds=new Set(unique.order),summary=emptySummary(),conflicts=[];
    summary.records=unique.order.length;summary.duplicates=unique.duplicates;
    unique.order.forEach(identity=>{
      const item=unique.values.get(identity),old=currentMap.get(identity);
      if(old===undefined){summary.added+=1;return;}
      if(sameValue(old,item)){summary.unchanged+=1;return;}
      const id=conflictId(record.key,identity);summary.conflicts+=1;
      if(mode===IMPORT_MODES.MERGE&&conflictChoice(options,record.domain,id)===CONFLICT_POLICIES.CURRENT)summary.kept+=1;else summary.replaced+=1;
      conflicts.push({id,key:record.key,recordName:record.name,identity,label:itemLabel(item,identity)});
    });
    if(mode===IMPORT_MODES.REPLACE)summary.removed=current.filter((item,index)=>!incomingIds.has(itemIdentity(item,index))).length;
    if(mode===IMPORT_MODES.KEEP){summary.kept=current.length;return{value:clone(existing),summary:emptySummary(),conflicts:[]};}
    if(mode===IMPORT_MODES.REPLACE)return{value:unique.order.map(identity=>clone(unique.values.get(identity))),summary,conflicts};
    const merged=unique.order.map(identity=>{
      const item=unique.values.get(identity),old=currentMap.get(identity);
      if(old!==undefined&&!sameValue(old,item)&&conflictChoice(options,record.domain,conflictId(record.key,identity))===CONFLICT_POLICIES.CURRENT)return clone(old);
      return clone(item);
    });
    current.forEach((item,index)=>{if(!incomingIds.has(itemIdentity(item,index)))merged.push(clone(item));});
    return{value:merged,summary,conflicts};
  }
  function planObject(record,existing,incoming,mode,options){
    const current=isRecord(existing)?existing:{},next=isRecord(incoming)?incoming:{},summary=emptySummary(),conflicts=[];
    const incomingKeys=Object.keys(next),currentKeys=Object.keys(current);summary.records=incomingKeys.length;
    incomingKeys.forEach(identity=>{
      if(!Object.prototype.hasOwnProperty.call(current,identity)){summary.added+=1;return;}
      if(sameValue(current[identity],next[identity])){summary.unchanged+=1;return;}
      const id=conflictId(record.key,identity);summary.conflicts+=1;
      if(mode===IMPORT_MODES.MERGE&&conflictChoice(options,record.domain,id)===CONFLICT_POLICIES.CURRENT)summary.kept+=1;else summary.replaced+=1;
      conflicts.push({id,key:record.key,recordName:record.name,identity,label:cleanString(identity).slice(0,120)});
    });
    if(mode===IMPORT_MODES.REPLACE)summary.removed=currentKeys.filter(identity=>!Object.prototype.hasOwnProperty.call(next,identity)).length;
    if(mode===IMPORT_MODES.KEEP){summary.kept=currentKeys.length;return{value:clone(existing),summary:emptySummary(),conflicts:[]};}
    if(mode===IMPORT_MODES.REPLACE)return{value:clone(next),summary,conflicts};
    const merged=clone(current);
    incomingKeys.forEach(identity=>{
      const id=conflictId(record.key,identity);
      if(Object.prototype.hasOwnProperty.call(current,identity)&&!sameValue(current[identity],next[identity])&&conflictChoice(options,record.domain,id)===CONFLICT_POLICIES.CURRENT)return;
      merged[identity]=clone(next[identity]);
    });
    return{value:merged,summary,conflicts};
  }
  function planScalar(record,existing,incoming,mode,options){
    if(mode===IMPORT_MODES.REPLACE&&incoming===undefined){const summary=emptySummary();summary.removed=existing!==null&&existing!==undefined?1:0;return{value:undefined,summary,conflicts:[]};}
    const summary=emptySummary(),exists=existing!==null&&existing!==undefined,changed=exists&&!sameValue(existing,incoming),id=conflictId(record.key,'value');
    summary.records=1;if(!exists)summary.added=1;else if(changed){summary.conflicts=1;if(mode===IMPORT_MODES.MERGE&&conflictChoice(options,record.domain,id)===CONFLICT_POLICIES.CURRENT)summary.kept=1;else summary.replaced=1;}else summary.unchanged=1;
    const conflicts=changed?[{id,key:record.key,recordName:record.name,identity:'value',label:record.backupField||record.name}]:[];
    if(mode===IMPORT_MODES.KEEP){summary.kept=exists?1:0;return{value:clone(existing),summary:emptySummary(),conflicts:[]};}
    if(mode===IMPORT_MODES.MERGE&&changed&&conflictChoice(options,record.domain,id)===CONFLICT_POLICIES.CURRENT)return{value:clone(existing),summary,conflicts};
    return{value:clone(incoming),summary,conflicts};
  }
  function planValue(record,existing,incoming,mode,options){
    if(Array.isArray(incoming))return planArray(record,existing,incoming,mode,options);
    if(isRecord(incoming))return planObject(record,existing,incoming,mode,options);
    return planScalar(record,existing,incoming,mode,options);
  }
  function normalizeMode(value){return Object.values(IMPORT_MODES).includes(value)?value:IMPORT_MODES.MERGE;}
  function createPlan(prepared,options={}){
    if(!prepared?.changes)throw new Error('No hay una importación preparada.');
    const inputDomains=[...new Set(Object.keys(prepared.changes).map(key=>registry.get(key)?.domain).filter(Boolean))],changes={},rawKeys=[],domains=[],summary=emptySummary();
    inputDomains.forEach(domain=>{
      const settings=options.domains?.[domain]||{},mode=normalizeMode(settings.mode),domainSummary=emptySummary(),conflicts=[];
      const records=mode===IMPORT_MODES.REPLACE?registry.records({domain,backupOnly:true}):Object.keys(prepared.changes).map(key=>registry.get(key)).filter(record=>record?.domain===domain);
      records.forEach(record=>{
        const supplied=Object.prototype.hasOwnProperty.call(prepared.changes,record.key),incoming=supplied?prepared.changes[record.key]:clone(record.defaultValue);
        if(!supplied&&mode!==IMPORT_MODES.REPLACE)return;
        const stored=global.APP_DATA.read(record.key,undefined),existing=withoutLocalRedactions(record,stored),planned=planValue(record,existing,incoming,mode,options);
        if(mode!==IMPORT_MODES.KEEP){const selected=supplied?planned.value:undefined;changes[record.key]=restoreLocalRedactions(record,stored,selected);if(record.serialization==='raw')rawKeys.push(record.key);domainSummary.keys+=1;}
        addSummary(domainSummary,planned.summary);conflicts.push(...planned.conflicts);
      });
      if(mode===IMPORT_MODES.KEEP)domainSummary.kept=Object.keys(prepared.changes).filter(key=>registry.get(key)?.domain===domain).length;
      addSummary(summary,domainSummary);
      domains.push({domain,label:DOMAIN_LABELS[domain]||domain,mode,conflictPolicy:settings.conflictPolicy||CONFLICT_POLICIES.INCOMING,summary:domainSummary,conflicts});
    });
    return{changes,rawKeys:[...new Set(rawKeys)],summary,domains,options};
  }
  function readForExport(record){
    if(record.serialization==='raw'){
      const raw=global.localStorage?.getItem?.(record.key);
      return raw===null||raw===undefined?record.defaultValue:raw;
    }
    return global.APP_DATA.read(record.key,record.defaultValue);
  }
  function buildExport(seed={}){
    const output={...seed};
    registry.records({backupOnly:true}).forEach(record=>{
      const value=sanitizeForRecord(record,readForExport(record));
      if(value!==undefined)output[record.backupField]=value;
    });
    output.schemaVersion=CURRENT_SCHEMA;
    output.exportedAt=seed.exportedAt||new Date().toISOString();
    return output;
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
    const prepared={id:`import_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,data,changes:mapped.changes,rawKeys:mapped.rawKeys,schemaVersion,ignored:[...new Set([...stats.ignored,...mapped.ignored])],meta};
    const plan=createPlan(prepared);prepared.summary=plan.summary;prepared.domains=plan.domains;return prepared;
  }
  function history(){return global.APP_DATA.read(HISTORY_KEY,[]);}
  function saveHistory(entry){global.APP_DATA.write(HISTORY_KEY,[entry,...history()].slice(0,10));}
  async function apply(prepared,options={}){
    if(!prepared?.changes)throw new Error('No hay una importacion preparada.');
    const plan=createPlan(prepared,options);if(!Object.keys(plan.changes).length)throw new Error('Elegiste conservar todas las áreas; no hay cambios para importar.');
    const result=await global.APP_DATA.replaceMany(plan.changes,{reason:`import:${prepared.id}`,rawKeys:plan.rawKeys});
    const modes=Object.fromEntries(plan.domains.map(item=>[item.domain,item.mode]));
    const entry={id:prepared.id,at:new Date().toISOString(),schemaVersion:prepared.schemaVersion,status:result.ok?'applied':'rolled-back',keys:plan.summary.keys,records:plan.summary.records,removed:plan.summary.removed,conflicts:plan.summary.conflicts,modes,snapshotId:result.snapshotId};
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

  global.BACKUP_SERVICE=Object.freeze({MAX_FILE_BYTES,CURRENT_SCHEMA,HISTORY_KEY,FIELD_MAP,IMPORT_MODES,CONFLICT_POLICIES,DOMAIN_LABELS,buildExport,prepareFile,prepareText,createPlan,apply,undo,history});
})(window);
