(function(){
  'use strict';
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function read(key,fallback){
    if(window.APP_DATA)return window.APP_DATA.read(key,fallback);
    try{const raw=localStorage.getItem(key);return raw===null?clone(fallback):(JSON.parse(raw)??clone(fallback));}catch(error){return clone(fallback);}
  }
  function write(key,value){if(window.APP_DATA)return window.APP_DATA.write(key,value);localStorage.setItem(key,JSON.stringify(value));return value;}
  function update(key,fallback,updater){const current=read(key,fallback),next=updater(clone(current));return write(key,next===undefined?current:next);}
  function ensure(key,defaults){
    const result=window.APP_DATA?.readResult?.(key);
    if(result){if(result.status==='missing')write(key,clone(defaults));return ['valid','legacy'].includes(result.status)?clone(result.value):clone(defaults);}
    if(localStorage.getItem(key)===null)write(key,clone(defaults));
    return read(key,defaults);
  }
  function migrate({key,metaKey,version,defaults,merge}){
    const current=read(key,defaults),meta=read(metaKey,{version:0});
    if(Number(meta.version)>=Number(version))return current;
    const next=typeof merge==='function'?merge(clone(current),clone(defaults),meta):current;
    write(key,next);write(metaKey,{...meta,version,migratedAt:new Date().toISOString()});return next;
  }
  window.WORKOUT_STORE={clone,read,write,update,ensure,migrate};
})();
