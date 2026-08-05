(function(global){
  'use strict';

  const DOMAINS=Object.freeze(['protocol','workout','nutrition','import']);
  const OPERATIONS=Object.freeze(['create','update','delete','restore']);
  const FIELDS=Object.freeze(['domain','operation','entityId','occurredAt']);

  function isUtcIso(value){
    if(typeof value!=='string'||!value.endsWith('Z'))return false;
    const parsed=Date.parse(value);
    return Number.isFinite(parsed)&&new Date(parsed).toISOString()===value;
  }
  function validate(change){
    const errors=[];
    if(!change||typeof change!=='object'||Array.isArray(change))return{ok:false,errors:['change-object-required']};
    if(Object.keys(change).some(key=>!FIELDS.includes(key)))errors.push('unknown-field');
    if(!DOMAINS.includes(change.domain))errors.push('invalid-domain');
    if(!OPERATIONS.includes(change.operation))errors.push('invalid-operation');
    if(change.entityId!==null&&(typeof change.entityId!=='string'||!change.entityId.trim()))errors.push('invalid-entity-id');
    if(!isUtcIso(change.occurredAt))errors.push('invalid-occurred-at');
    return{ok:errors.length===0,errors};
  }
  function create(input={},options={}){
    const now=typeof options.now==='function'?options.now:()=>new Date().toISOString();
    const current=now(),occurredAt=current instanceof Date?current.toISOString():String(current);
    const change={domain:input.domain,operation:input.operation,entityId:input.entityId??null,occurredAt:input.occurredAt??occurredAt};
    const result=validate(change);
    if(!result.ok)throw new TypeError(`Cambio de datos invalido: ${result.errors.join(',')}`);
    return Object.freeze(change);
  }
  function emit(input,options){
    const detail=create(input,options);
    global.dispatchEvent(new CustomEvent('app-data-change',{detail}));
    return detail;
  }

  global.APP_DATA_EVENTS=Object.freeze({DOMAINS,OPERATIONS,create,validate,emit});
})(window);
