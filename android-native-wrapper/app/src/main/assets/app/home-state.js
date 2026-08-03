(function(global){
  'use strict';

  function primaryAction({hasTodayRecord=false,hasDraft=false,isDirty=false,requiredMissing=[],isValid=false}={}){
    if(hasTodayRecord&&!isDirty&&!hasDraft)return'summary';
    if(isDirty&&isValid&&requiredMissing.length===0)return'save';
    if(hasDraft||isDirty)return'continue';
    return'start';
  }

  global.HOME_STATE=Object.freeze({primaryAction});
})(window);
