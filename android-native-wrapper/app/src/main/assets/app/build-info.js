(function(global){
  'use strict';

  const UPDATE_PARAM='__pwa_update_check';
  let activeInfo=null;
  let lastCheckAt='';

  function fallback(){
    const version=global.APP_VERSION_INFO||{};
    return{schemaVersion:1,version:String(version.version||'desconocida'),versionCode:Number(version.versionCode)||0,build:Number(version.build)||0,commit:'development',artifactCreatedAt:String(version.updatedAt||''),channel:'development'};
  }
  function normalize(value){
    if(!value||Number(value.schemaVersion)!==1||!value.version||!Number.isFinite(Number(value.build)))throw new Error('BUILD_INFO_INVALID');
    return{schemaVersion:1,version:String(value.version),versionCode:Number(value.versionCode)||0,build:Number(value.build),commit:String(value.commit||'desconocido').slice(0,40),artifactCreatedAt:String(value.artifactCreatedAt||''),channel:['beta','stable','development'].includes(value.channel)?value.channel:'development'};
  }
  async function fetchJson(path,{network=false}={}){
    const url=new URL(path,global.location.href);
    if(network)url.searchParams.set(UPDATE_PARAM,String(Date.now()));
    const response=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`BUILD_INFO_HTTP_${response.status}`);
    return response.json();
  }
  async function active({refresh=false}={}){
    if(activeInfo&&!refresh)return activeInfo;
    try{activeInfo=normalize(await fetchJson('./build-info.json'));}
    catch{activeInfo=fallback();}
    return activeInfo;
  }
  function newer(published,current){
    if(Number(published.build)!==Number(current.build))return Number(published.build)>Number(current.build);
    const parse=value=>String(value||'0').split('.').map(part=>Number(part)||0);
    const left=parse(published.version),right=parse(current.version),length=Math.max(left.length,right.length);
    for(let index=0;index<length;index++){if((left[index]||0)!==(right[index]||0))return(left[index]||0)>(right[index]||0);}
    return false;
  }
  async function check(){
    lastCheckAt=new Date().toISOString();
    try{
      const [published,version]=await Promise.all([fetchJson('./build-info.json',{network:true}).then(normalize),fetchJson('./app-version.json',{network:true})]);
      if(String(version.version)!==published.version||Number(version.build)!==published.build)throw new Error('PUBLISHED_VERSION_MISMATCH');
      const current=await active();
      return{status:newer(published,current)?'available':'current',checkedAt:lastCheckAt,current,published};
    }catch(error){return{status:'error',checkedAt:lastCheckAt,current:await active(),error:String(error?.message||error)};}
  }
  function unsafeReasons(){
    const reasons=[];
    if(global.APP_DRAFTS?.list?.().length)reasons.push('Hay borradores sin guardar.');
    const extra=global.APP_HAS_UNSAVED_WORK?.();
    if(Array.isArray(extra))reasons.push(...extra.filter(Boolean).map(String));
    else if(extra)reasons.push(String(extra));
    return[...new Set(reasons)];
  }
  async function activate(registration,worker){
    const reasons=unsafeReasons();
    if(reasons.length)return{ok:false,reasons};
    try{global.APP_DRAFTS?.flushAll?.();await global.APP_DATA?.flush?.();}
    catch{return{ok:false,reasons:['Hay escrituras locales pendientes.']};}
    const waiting=registration?.waiting||worker;
    if(!waiting)return{ok:false,reasons:['La actualización todavía no está lista.']};
    global.__pwaUpdateAccepted=true;
    sessionStorage.setItem('protocolo_pwa_update_accepted','1');
    waiting.postMessage({type:'SKIP_WAITING'});
    return{ok:true,reasons:[]};
  }
  async function serviceWorkerState(){
    if(!('serviceWorker'in navigator))return{label:'No disponible',controlled:false,waiting:false};
    try{const registration=await navigator.serviceWorker.getRegistration();return{label:registration?.waiting?'Actualización preparada':navigator.serviceWorker.controller?'Activo':'Preparando',controlled:!!navigator.serviceWorker.controller,waiting:!!registration?.waiting};}
    catch{return{label:'No disponible',controlled:false,waiting:false};}
  }

  global.APP_BUILD_INFO=Object.freeze({UPDATE_PARAM,active,check,newer,unsafeReasons,activate,serviceWorkerState,get lastCheckAt(){return lastCheckAt;}});
})(window);
