(function(global){
  'use strict';

  const KEY='protocolo_0_100_feature_flags_v1';
  const DEFAULTS=Object.freeze({
    schemaVersion:1,
    nativeWorkoutControlsV1:false,
    lockScreenWorkoutControls:false,
    nativeRestTimer:false,
    multiPartyWorkoutSharing:false
  });
  const FLAG_NAMES=Object.freeze(Object.keys(DEFAULTS).filter(key=>key!=='schemaVersion'));

  function normalize(value={}){
    const next={schemaVersion:1};
    FLAG_NAMES.forEach(name=>{next[name]=value?.[name]===true;});
    return next;
  }
  function read(){
    try{
      const value=global.APP_DATA?.read?.(KEY,null);
      if(value&&typeof value==='object'&&!Array.isArray(value))return normalize(value);
      const raw=global.localStorage?.getItem?.(KEY);
      return raw?normalize(JSON.parse(raw)):normalize(DEFAULTS);
    }catch(error){return normalize(DEFAULTS);}
  }
  function write(value){
    const next=normalize(value);
    if(global.APP_DATA?.write)global.APP_DATA.write(KEY,next);
    else global.localStorage?.setItem?.(KEY,JSON.stringify(next));
    try{global.dispatchEvent?.(new CustomEvent('app-feature-flags-change',{detail:{...next}}));}catch(error){/* Entornos de prueba sin DOM. */}
    return next;
  }
  function all(){return read();}
  function isEnabled(name){return FLAG_NAMES.includes(name)&&read()[name]===true;}
  function set(patch={}){return write({...read(),...Object.fromEntries(FLAG_NAMES.filter(name=>Object.hasOwn(patch,name)).map(name=>[name,patch[name]===true]))});}
  function reset(){return write(DEFAULTS);}

  global.APP_FEATURE_FLAGS=Object.freeze({KEY,DEFAULTS,FLAG_NAMES,all,isEnabled,set,reset,normalize});
})(window);
