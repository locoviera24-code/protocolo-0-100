(function(global){
  'use strict';

  const SCHEMA_VERSION=1;
  const PAYLOAD_VERSION=1;
  const MAX_PAYLOAD_BYTES=16*1024;
  const ACTION_TYPES=Object.freeze([
    'ADJUST_REPS','ADJUST_WEIGHT','SAVE_SET','UNDO_SET','REPEAT_LAST_SET',
    'PREVIOUS_EXERCISE','NEXT_EXERCISE','COMPLETE_TIME_SET','COMPLETE_DISTANCE_SET'
  ]);
  const SOURCES=Object.freeze(['web','android-widget','android-notification']);
  const RESULT_STATUSES=Object.freeze(['applied','rejected','ignored']);
  const ERROR_CODES=Object.freeze([
    'INVALID_ACTION','UNSUPPORTED_SCHEMA','UNSUPPORTED_PAYLOAD','INVALID_PAYLOAD',
    'REVISION_CONFLICT','NOT_FOUND','ALREADY_APPLIED','EXPIRED','INTERNAL_ERROR'
  ]);
  const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const DANGEROUS_KEYS=new Set(['__proto__','prototype','constructor']);

  function isRecord(value){return Object.prototype.toString.call(value)==='[object Object]';}
  function isNonEmptyString(value,max=160){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
  function isRevision(value){return value===null||(Number.isInteger(value)&&value>=0);}
  function isUtcTimestamp(value){
    return typeof value==='string'&&value.endsWith('Z')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
  }
  function utf8Bytes(value){
    if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(value).length;
    return encodeURIComponent(value).replace(/%[0-9A-F]{2}|./gi,'x').length;
  }
  function inspectJsonValue(value,options={}){
    const path=options.path||'payload',seen=options.seen||new Set(),depth=options.depth||0,errors=[];
    if(depth>12)return[path+':max-depth'];
    if(value===null||typeof value==='string'||typeof value==='boolean')return errors;
    if(typeof value==='number')return Number.isFinite(value)?errors:[path+':non-finite-number'];
    if(typeof value!=='object')return[path+':unsupported-value'];
    if(seen.has(value))return[path+':circular-reference'];
    if(!Array.isArray(value)&&!isRecord(value))return[path+':unsupported-object'];
    seen.add(value);
    for(const key of Object.keys(value)){
      if(DANGEROUS_KEYS.has(key)){errors.push(path+'.'+key+':dangerous-key');continue;}
      errors.push(...inspectJsonValue(value[key],{path:path+'.'+key,seen,depth:depth+1}));
    }
    seen.delete(value);
    return errors;
  }
  function sanitizedClone(value){
    if(value===null||typeof value!=='object')return value;
    if(Array.isArray(value))return value.map(sanitizedClone);
    const result=Object.create(null);
    for(const [key,item] of Object.entries(value))result[key]=sanitizedClone(item);
    return result;
  }
  function payloadErrors(type,payload){
    if(!isRecord(payload))return['payload:object-required'];
    const errors=inspectJsonValue(payload);
    if(errors.length)return errors;
    let serialized;
    try{serialized=JSON.stringify(sanitizedClone(payload));}catch(error){return['payload:not-serializable'];}
    if(utf8Bytes(serialized)>MAX_PAYLOAD_BYTES)errors.push('payload:size-limit');
    const finite=value=>typeof value==='number'&&Number.isFinite(value);
    const setId=()=>{if(!isNonEmptyString(payload.setId))errors.push('payload.setId:required');};
    if(type==='ADJUST_REPS'&&(!Number.isInteger(payload.delta)||payload.delta===0))errors.push('payload.delta:non-zero-integer');
    if(type==='ADJUST_WEIGHT'&&(!finite(payload.delta)||Number(payload.delta)===0))errors.push('payload.delta:non-zero-number');
    if(type==='ADJUST_WEIGHT'&&payload.unit!==undefined&&!['kg','lb'].includes(payload.unit))errors.push('payload.unit:unsupported');
    if(type==='SAVE_SET'){
      setId();
      if(!isRecord(payload.values))errors.push('payload.values:object-required');
    }
    if(type==='UNDO_SET')setId();
    if(type==='REPEAT_LAST_SET'&&!isNonEmptyString(payload.sourceSetId))errors.push('payload.sourceSetId:required');
    if(type==='COMPLETE_TIME_SET'){
      setId();if(!finite(payload.durationSeconds)||Number(payload.durationSeconds)<=0)errors.push('payload.durationSeconds:positive-number');
    }
    if(type==='COMPLETE_DISTANCE_SET'){
      setId();if(!finite(payload.distanceMeters)||Number(payload.distanceMeters)<=0)errors.push('payload.distanceMeters:positive-number');
      if(payload.durationSeconds!==undefined&&(!finite(payload.durationSeconds)||Number(payload.durationSeconds)<0))errors.push('payload.durationSeconds:non-negative-number');
    }
    return errors;
  }
  function validation(ok,code=null,errors=[]){return Object.freeze({ok,code,errors:Object.freeze([...errors])});}
  function validateAction(action){
    const errors=[];
    if(!isRecord(action))return validation(false,'INVALID_ACTION',['action:object-required']);
    if(action.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion:unsupported');
    if(action.payloadVersion!==PAYLOAD_VERSION)errors.push('payloadVersion:unsupported');
    if(!ACTION_TYPES.includes(action.type))errors.push('type:unsupported');
    if(!UUID_V4.test(String(action.actionId||'')))errors.push('actionId:uuid-v4-required');
    if(!UUID_V4.test(String(action.mutationId||'')))errors.push('mutationId:uuid-v4-required');
    if(!SOURCES.includes(action.source))errors.push('source:unsupported');
    if(!isNonEmptyString(action.sessionId))errors.push('sessionId:required');
    if(!isNonEmptyString(action.exerciseId))errors.push('exerciseId:required');
    if(!isUtcTimestamp(action.createdAt))errors.push('createdAt:utc-iso-required');
    if(!isRevision(action.expectedRevision))errors.push('expectedRevision:non-negative-integer-or-null');
    if(!isNonEmptyString(action.clientVersion,80))errors.push('clientVersion:required');
    if(ACTION_TYPES.includes(action.type))errors.push(...payloadErrors(action.type,action.payload));
    const schemaError=errors.some(error=>error.startsWith('schemaVersion'));
    const payloadSchemaError=errors.some(error=>error.startsWith('payloadVersion'));
    const payloadError=errors.some(error=>error.startsWith('payload.'));
    return validation(!errors.length,schemaError?'UNSUPPORTED_SCHEMA':payloadSchemaError?'UNSUPPORTED_PAYLOAD':payloadError?'INVALID_PAYLOAD':'INVALID_ACTION',errors);
  }
  function defaultUuid(){
    if(typeof global.crypto?.randomUUID==='function')return global.crypto.randomUUID();
    if(typeof global.crypto?.getRandomValues!=='function')throw Object.assign(new Error('Secure UUID generation is unavailable.'),{code:'INTERNAL_ERROR'});
    const bytes=new Uint8Array(16);global.crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  function createAction(input={},dependencies={}){
    const now=dependencies.now||(()=>new Date().toISOString()),uuid=dependencies.uuid||defaultUuid;
    const action={
      schemaVersion:SCHEMA_VERSION,
      payloadVersion:PAYLOAD_VERSION,
      actionId:input.actionId||uuid(),
      mutationId:input.mutationId||uuid(),
      type:input.type,
      source:input.source||'web',
      sessionId:String(input.sessionId||''),
      exerciseId:String(input.exerciseId||''),
      createdAt:input.createdAt||now(),
      clientVersion:String(input.clientVersion||global.APP_VERSION_INFO?.version||'unknown'),
      expectedRevision:input.expectedRevision??null,
      payload:input.payload||{}
    };
    const result=validateAction(action);
    if(!result.ok)throw Object.assign(new TypeError('Invalid workout quick action: '+result.errors.join(', ')),{code:result.code,errors:result.errors});
    return Object.freeze({...action,payload:sanitizedClone(action.payload)});
  }
  function validateResult(result){
    const errors=[];
    if(!isRecord(result))return validation(false,'INVALID_ACTION',['result:object-required']);
    if(result.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion:unsupported');
    if(!UUID_V4.test(String(result.actionId||'')))errors.push('actionId:uuid-v4-required');
    if(!UUID_V4.test(String(result.mutationId||'')))errors.push('mutationId:uuid-v4-required');
    if(!RESULT_STATUSES.includes(result.status))errors.push('status:unsupported');
    if(!isRevision(result.resultingRevision))errors.push('resultingRevision:non-negative-integer-or-null');
    if(result.errorCode!==null&&!ERROR_CODES.includes(result.errorCode))errors.push('errorCode:unsupported');
    if(result.status==='applied'&&result.errorCode!==null)errors.push('errorCode:must-be-null-when-applied');
    if(result.status==='rejected'&&result.errorCode===null)errors.push('errorCode:required-when-rejected');
    if(result.errorMessage!==undefined&&(typeof result.errorMessage!=='string'||result.errorMessage.length>500))errors.push('errorMessage:invalid');
    if(!isUtcTimestamp(result.appliedAt))errors.push('appliedAt:utc-iso-required');
    const schemaError=errors.some(error=>error.startsWith('schemaVersion'));
    return validation(!errors.length,schemaError?'UNSUPPORTED_SCHEMA':'INVALID_ACTION',errors);
  }
  function createResult(action,input={},dependencies={}){
    const actionValidation=validateAction(action);
    if(!actionValidation.ok)throw Object.assign(new TypeError('Cannot create a result for an invalid action.'),{code:actionValidation.code,errors:actionValidation.errors});
    const result={
      schemaVersion:SCHEMA_VERSION,
      actionId:action.actionId,
      mutationId:action.mutationId,
      status:input.status||'applied',
      resultingRevision:input.resultingRevision??null,
      errorCode:input.errorCode??null,
      appliedAt:input.appliedAt||(dependencies.now||(()=>new Date().toISOString()))()
    };
    if(input.errorMessage!==undefined)result.errorMessage=String(input.errorMessage);
    const validationResult=validateResult(result);
    if(!validationResult.ok)throw Object.assign(new TypeError('Invalid workout quick action result: '+validationResult.errors.join(', ')),{code:validationResult.code,errors:validationResult.errors});
    return Object.freeze(result);
  }

  global.WORKOUT_QUICK_ACTIONS=Object.freeze({
    SCHEMA_VERSION,PAYLOAD_VERSION,MAX_PAYLOAD_BYTES,ACTION_TYPES,SOURCES,
    RESULT_STATUSES,ERROR_CODES,createAction,validateAction,createResult,validateResult
  });
})(typeof window!=='undefined'?window:globalThis);
