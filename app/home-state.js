(function(global){
  'use strict';

  function primaryAction({hasTodayRecord=false,hasDraft=false,isDirty=false,requiredMissing=[],isValid=false,hasStarted=false,errors=[]}={}){
    const missing=Array.isArray(requiredMissing)?requiredMissing:[];
    const invalid=Array.isArray(errors)?errors:[];
    if(isDirty&&isValid&&missing.length===0&&invalid.length===0)return'save';
    if(hasDraft||isDirty||(hasStarted&&(!isValid||missing.length>0||invalid.length>0)))return'continue';
    if(hasTodayRecord)return'summary';
    return'start';
  }

  global.HOME_STATE=Object.freeze({primaryAction});
})(window);
