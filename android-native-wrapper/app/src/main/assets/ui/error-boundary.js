(function(global){
  'use strict';
  const LOG_KEY='protocolo_0_100_error_log_v1',MAX_LOGS=20;
  function sanitize(value){return String(value||'Error desconocido').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[email]').replace(/(?:api[_-]?key|password|token|secret)\s*[:=]\s*[^\s,;]+/gi,'credencial=[oculto]').slice(0,500);}
  function logs(){try{const value=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return[];}}
  function record(error,{area='app',fatal=false}={}){const list=logs(),item={at:new Date().toISOString(),area:sanitize(area),message:sanitize(error?.message||error),name:sanitize(error?.name||'Error'),fatal:!!fatal};list.push(item);try{localStorage.setItem(LOG_KEY,JSON.stringify(list.slice(-MAX_LOGS)));}catch(storageError){}if(fatal)global.APP_RECOVERY?.show?.(item);return item;}
  function guard(callback,context={}){try{return callback();}catch(error){record(error,context);if(context.rethrow)throw error;return context.fallback;}}
  global.APP_ERROR_BOUNDARY=Object.freeze({record,guard,logs:()=>logs().map(item=>({...item})),clear:()=>localStorage.removeItem(LOG_KEY)});
  global.addEventListener('error',event=>record(event.error||event.message,{area:document.readyState==='loading'?'initialization':'window',fatal:document.readyState==='loading'}));
  global.addEventListener('unhandledrejection',event=>record(event.reason,{area:'promise'}));
})(window);
