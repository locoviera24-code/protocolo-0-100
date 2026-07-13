(function(global){
  'use strict';

  const STORAGE_KEY='protocolo_0_100_drafts_v1';
  const SIGNAL_KEY='protocolo_0_100_drafts_signal_v1';
  const CHANNEL_NAME='protocolo-0-100-drafts-v1';
  const VERSION=1;
  const DEFAULT_TTL_MS=14*24*60*60*1000;
  const MAX_DRAFT_BYTES=256*1024;
  const MAX_DRAFTS=40;
  const timers=new Map();
  const pending=new Map();
  const listeners=new Set();
  const instanceId=`drafts-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let memoryStore={version:VERSION,updatedAt:'',items:{}};
  let channel=null;

  function nowIso(){return new Date().toISOString();}
  function emptyStore(){return{version:VERSION,updatedAt:'',items:{}};}
  function safeClone(value){
    const blocked=/^(?:__proto__|prototype|constructor)$|password|passphrase|secret|token|credential|service.?account|firebase.?config|api.?key/i;
    function clean(input,depth=0){
      if(depth>12||input===null||input===undefined)return input??null;
      if(Array.isArray(input))return input.slice(0,500).map(item=>clean(item,depth+1));
      if(typeof input==='object'){
        const output={};
        Object.entries(input).forEach(([key,item])=>{if(!blocked.test(key))output[key]=clean(item,depth+1);});
        return output;
      }
      if(typeof input==='string')return input.slice(0,20000);
      if(['number','boolean'].includes(typeof input))return input;
      return String(input).slice(0,20000);
    }
    return clean(value);
  }
  function validItem(item){
    return !!(item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.domain==='string'&&item.payload&&typeof item.payload==='object'&&Date.parse(item.updatedAt)&&Date.parse(item.expiresAt));
  }
  function parseStore(raw){
    try{
      const value=typeof raw==='string'?JSON.parse(raw):raw;
      if(!value||value.version!==VERSION||!value.items||typeof value.items!=='object')return emptyStore();
      return{version:VERSION,updatedAt:String(value.updatedAt||''),items:Object.fromEntries(Object.entries(value.items).filter(([,item])=>validItem(item)))};
    }catch(error){return emptyStore();}
  }
  function readStore(){
    try{const stored=parseStore(global.localStorage?.getItem(STORAGE_KEY));memoryStore={version:VERSION,updatedAt:stored.updatedAt||memoryStore.updatedAt,items:{...stored.items,...memoryStore.items}};}
    catch(error){memoryStore=parseStore(memoryStore);}
    return memoryStore;
  }
  function draftBytes(value){try{return new Blob([JSON.stringify(value)]).size;}catch(error){return Number.MAX_SAFE_INTEGER;}}
  function notifyStorageFailure(error){
    global.APP_NOTIFICATIONS?.showBanner?.({id:'draft-storage',title:'No se pudo guardar el borrador',message:'El formulario sigue abierto, pero el dispositivo rechazó el guardado local. Revisá el espacio disponible.',tone:'warning',priority:80});
    global.dispatchEvent?.(new CustomEvent('app-draft-error',{detail:{code:error?.name||'STORAGE_ERROR'}}));
  }
  function compact(store){
    const rows=Object.values(store.items).filter(validItem).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,MAX_DRAFTS);
    store.items=Object.fromEntries(rows.map(item=>[item.id,item]));
    return store;
  }
  function broadcast(detail){
    const message={...detail,source:instanceId,at:Date.now()};
    try{channel?.postMessage(message);}catch(error){}
    try{global.localStorage?.setItem(SIGNAL_KEY,JSON.stringify(message));}catch(error){}
    emit(message);
  }
  function emit(detail){
    listeners.forEach(listener=>{try{listener(detail);}catch(error){}});
    global.dispatchEvent?.(new CustomEvent('app-drafts-changed',{detail}));
  }
  function writeStore(store,detail){
    const next=compact({...store,version:VERSION,updatedAt:nowIso()});
    try{
      global.localStorage?.setItem(STORAGE_KEY,JSON.stringify(next));
      memoryStore=next;
      global.APP_NOTIFICATIONS?.hideBanner?.('draft-storage');
      if(detail)broadcast(detail);
      return true;
    }catch(error){memoryStore=next;notifyStorageFailure(error);return false;}
  }
  function makeItem({id,domain,payload,baseUpdatedAt='',ttlMs=DEFAULT_TTL_MS}){
    const updatedAt=nowIso();
    return{id:String(id).slice(0,240),domain:String(domain||'general').slice(0,80),payload:safeClone(payload||{}),baseUpdatedAt:String(baseUpdatedAt||''),updatedAt,expiresAt:new Date(Date.now()+Math.max(60000,Number(ttlMs)||DEFAULT_TTL_MS)).toISOString()};
  }
  function saveItem(item){
    if(!validItem(item)||draftBytes(item)>MAX_DRAFT_BYTES){notifyStorageFailure({name:'DRAFT_TOO_LARGE'});return false;}
    const store=readStore();store.items[item.id]=item;
    return writeStore(store,{type:'saved',id:item.id,domain:item.domain,updatedAt:item.updatedAt});
  }
  function schedule(options,{debounceMs=350}={}){
    if(!options?.id||!options?.domain)return null;
    const item=makeItem(options);pending.set(item.id,item);
    clearTimeout(timers.get(item.id));
    timers.set(item.id,setTimeout(()=>flush(item.id),Math.max(0,Number(debounceMs)||0)));
    return item;
  }
  function flush(id){
    const item=pending.get(id);if(!item)return false;
    clearTimeout(timers.get(id));timers.delete(id);pending.delete(id);
    return saveItem(item);
  }
  function flushAll(){return[...pending.keys()].map(flush).every(result=>result!==false);}
  function remove(id,{silent=false}={}){
    clearTimeout(timers.get(id));timers.delete(id);pending.delete(id);
    const store=readStore();const item=store.items[id];if(!item)return false;
    delete store.items[id];writeStore(store,silent?null:{type:'removed',id,domain:item.domain});return true;
  }
  function purgeExpired(){
    const store=readStore(),now=Date.now();let changed=false;
    Object.entries(store.items).forEach(([id,item])=>{if(!validItem(item)||Date.parse(item.expiresAt)<=now){delete store.items[id];changed=true;}});
    if(changed)writeStore(store,{type:'purged'});return changed;
  }
  function get(id,{newerThan='',removeStale=true}={}){
    purgeExpired();
    const item=pending.get(id)||readStore().items[id]||null;if(!item)return null;
    if(newerThan&&Date.parse(item.updatedAt)<=Date.parse(newerThan)){
      if(removeStale)remove(id,{silent:true});return null;
    }
    return safeClone(item);
  }
  function list(domain=''){
    purgeExpired();
    return Object.values(readStore().items).filter(item=>!domain||item.domain===domain).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).map(safeClone);
  }
  function announceRestored({id,label='Borrador restaurado',onDiscard=null}={}){
    global.APP_NOTIFICATIONS?.showSnackbar?.(label,{tone:'info',duration:7000,actionLabel:'Descartar',onAction:()=>{remove(id);if(typeof onDiscard==='function')onDiscard();}});
  }
  function onChange(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);}
  function receive(message){if(!message||message.source===instanceId)return;memoryStore=emptyStore();emit(message);}
  function init(){
    purgeExpired();
    if('BroadcastChannel'in global){try{channel=new BroadcastChannel(CHANNEL_NAME);channel.addEventListener('message',event=>receive(event.data));}catch(error){channel=null;}}
    global.addEventListener?.('storage',event=>{if(event.key!==STORAGE_KEY&&event.key!==SIGNAL_KEY)return;try{receive(event.newValue&&event.key===SIGNAL_KEY?JSON.parse(event.newValue):{type:'external-change'});}catch(error){receive({type:'external-change'});}});
    global.addEventListener?.('pagehide',flushAll);
    global.document?.addEventListener?.('visibilitychange',()=>{if(global.document.visibilityState==='hidden')flushAll();});
  }

  global.APP_DRAFTS=Object.freeze({STORAGE_KEY,VERSION,DEFAULT_TTL_MS,schedule,flush,flushAll,get,list,remove,discard:remove,purgeExpired,announceRestored,onChange});
  init();
})(window);
