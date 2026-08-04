(function(global){
  'use strict';

  const SCHEMA_VERSION=1;
  const PAYLOAD_VERSION=1;
  const MAX_PAYLOAD_BYTES=16*1024;
  const ACTION_TYPES=Object.freeze([
    'ADJUST_REPS','ADJUST_WEIGHT','SAVE_SET','UNDO_SET','REPEAT_LAST_SET',
    'PREVIOUS_EXERCISE','NEXT_EXERCISE','COMPLETE_TIME_SET','COMPLETE_DISTANCE_SET'
  ]);
  const ACTION_SOURCES=Object.freeze(['web','android-widget','android-notification']);
  const RESULT_STATUSES=Object.freeze(['applied','rejected','ignored']);
  const ERROR_CODES=Object.freeze([
    'OK','INVALID_SCHEMA','INVALID_PAYLOAD','REVISION_CONFLICT','DUPLICATE_MUTATION',
    'SESSION_NOT_FOUND','EXERCISE_NOT_FOUND','SET_NOT_FOUND','UNSUPPORTED_ACTION'
  ]);
  const ACTION_FIELDS=Object.freeze(['schemaVersion','payloadVersion','actionType','mutationId','source','sessionId','exerciseId','createdAt','clientVersion','expectedRevision','payload']);
  const RESULT_FIELDS=Object.freeze(['schemaVersion','mutationId','status','resultingRevision','errorCode','errorMessage','appliedAt']);
  const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const CLIENT_VERSION=/^\d+\.\d+\.\d+\+\d+$/;
  const DANGEROUS_KEYS=new Set(['__proto__','prototype','constructor']);

  function isRecord(value){return Object.prototype.toString.call(value)==='[object Object]';}
  function isNonEmptyString(value,max=180){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
  function isRevision(value){return value===null||(Number.isInteger(value)&&value>=0);}
  function isUtcTimestamp(value){return typeof value==='string'&&value.endsWith('Z')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
  function utf8Bytes(value){return typeof TextEncoder!=='undefined'?new TextEncoder().encode(value).length:encodeURIComponent(value).replace(/%[0-9A-F]{2}|./gi,'x').length;}
  function inspectJson(value,{path='payload',seen=new Set(),depth=0}={}){
    if(depth>12)return[`${path}:max-depth`];
    if(value===null||typeof value==='string'||typeof value==='boolean')return[];
    if(typeof value==='number')return Number.isFinite(value)?[]:[`${path}:non-finite-number`];
    if(typeof value!=='object')return[`${path}:unsupported-value`];
    if(seen.has(value))return[`${path}:circular-reference`];
    if(!Array.isArray(value)&&!isRecord(value))return[`${path}:unsupported-object`];
    seen.add(value);const errors=[];
    for(const key of Object.keys(value)){
      if(DANGEROUS_KEYS.has(key)){errors.push(`${path}.${key}:dangerous-key`);continue;}
      errors.push(...inspectJson(value[key],{path:`${path}.${key}`,seen,depth:depth+1}));
    }
    seen.delete(value);return errors;
  }
  function safeClone(value){
    if(value===null||typeof value!=='object')return value;
    if(Array.isArray(value))return value.map(safeClone);
    const copy=Object.create(null);for(const [key,item] of Object.entries(value))copy[key]=safeClone(item);return copy;
  }
  function payloadErrors(actionType,payload){
    if(!isRecord(payload))return['payload:object-required'];
    const errors=inspectJson(payload);if(errors.length)return errors;
    let serialized='';try{serialized=JSON.stringify(safeClone(payload));}catch(error){return['payload:not-serializable'];}
    if(utf8Bytes(serialized)>MAX_PAYLOAD_BYTES)errors.push('payload:size-limit');
    const finite=value=>typeof value==='number'&&Number.isFinite(value);
    const requireSetId=()=>{if(!isNonEmptyString(payload.setId))errors.push('payload.setId:required');};
    if(actionType==='ADJUST_REPS'&&(!Number.isInteger(payload.delta)||payload.delta===0))errors.push('payload.delta:non-zero-integer');
    if(actionType==='ADJUST_WEIGHT'&&(!finite(payload.deltaKg)||payload.deltaKg===0))errors.push('payload.deltaKg:non-zero-number');
    if(actionType==='SAVE_SET'){
      requireSetId();if(!isRecord(payload.values))errors.push('payload.values:object-required');
    }
    if(actionType==='UNDO_SET')requireSetId();
    if(actionType==='REPEAT_LAST_SET'&&!isNonEmptyString(payload.sourceSetId))errors.push('payload.sourceSetId:required');
    if(['PREVIOUS_EXERCISE','NEXT_EXERCISE'].includes(actionType)&&Object.keys(payload).length)errors.push('payload:must-be-empty');
    if(actionType==='COMPLETE_TIME_SET'){
      requireSetId();if(!finite(payload.durationSeconds)||payload.durationSeconds<=0)errors.push('payload.durationSeconds:positive-number');
    }
    if(actionType==='COMPLETE_DISTANCE_SET'){
      requireSetId();if(!finite(payload.distanceMeters)||payload.distanceMeters<=0)errors.push('payload.distanceMeters:positive-number');
      if(payload.durationSeconds!==undefined&&(!finite(payload.durationSeconds)||payload.durationSeconds<0))errors.push('payload.durationSeconds:non-negative-number');
    }
    return errors;
  }
  function validation(ok,errorCode='OK',errors=[]){return Object.freeze({ok,errorCode,code:errorCode,errors:Object.freeze([...errors])});}
  function validateAction(action){
    if(!isRecord(action))return validation(false,'INVALID_PAYLOAD',['action:object-required']);
    const errors=[];
    if(Object.keys(action).some(key=>!ACTION_FIELDS.includes(key)))errors.push('action:unknown-field');
    if(action.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion:unsupported');
    if(action.payloadVersion!==PAYLOAD_VERSION)errors.push('payloadVersion:unsupported');
    if(!ACTION_TYPES.includes(action.actionType))errors.push('actionType:unsupported');
    if(!UUID_V4.test(String(action.mutationId||'')))errors.push('mutationId:uuid-v4-required');
    if(!ACTION_SOURCES.includes(action.source))errors.push('source:unsupported');
    if(!isNonEmptyString(action.sessionId))errors.push('sessionId:required');
    if(!isNonEmptyString(action.exerciseId))errors.push('exerciseId:required');
    if(!isUtcTimestamp(action.createdAt))errors.push('createdAt:utc-iso-required');
    if(!CLIENT_VERSION.test(String(action.clientVersion||'')))errors.push('clientVersion:invalid');
    if(!isRevision(action.expectedRevision))errors.push('expectedRevision:non-negative-integer-or-null');
    if(ACTION_TYPES.includes(action.actionType))errors.push(...payloadErrors(action.actionType,action.payload));
    const code=errors.some(error=>error.startsWith('schemaVersion')||error.startsWith('payloadVersion'))?'INVALID_SCHEMA':errors.some(error=>error.startsWith('actionType'))?'UNSUPPORTED_ACTION':'INVALID_PAYLOAD';
    return validation(errors.length===0,errors.length?code:'OK',errors);
  }
  function defaultUuid(){
    if(typeof global.crypto?.randomUUID==='function')return global.crypto.randomUUID();
    if(typeof global.crypto?.getRandomValues!=='function')throw Object.assign(new Error('Secure UUID generation is unavailable.'),{code:'INVALID_PAYLOAD'});
    const bytes=new Uint8Array(16);global.crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  function currentClientVersion(){const info=global.APP_VERSION_INFO||{};return`${info.version||'0.0.0'}+${Number(info.build)||0}`;}
  function createAction(input={},dependencies={}){
    const now=typeof dependencies.now==='function'?dependencies.now:()=>new Date().toISOString(),uuid=typeof dependencies.uuid==='function'?dependencies.uuid:defaultUuid;
    const action={schemaVersion:SCHEMA_VERSION,payloadVersion:PAYLOAD_VERSION,actionType:input.actionType,mutationId:input.mutationId||uuid(),source:input.source||'web',sessionId:String(input.sessionId||''),exerciseId:String(input.exerciseId||''),createdAt:input.createdAt||now(),clientVersion:String(input.clientVersion||currentClientVersion()),expectedRevision:input.expectedRevision??null,payload:input.payload||{}};
    const checked=validateAction(action);if(!checked.ok)throw Object.assign(new TypeError(`Invalid workout quick action: ${checked.errors.join(', ')}`),{code:checked.errorCode,errors:checked.errors});
    return Object.freeze({...action,payload:safeClone(action.payload)});
  }
  function validateResult(result){
    if(!isRecord(result))return validation(false,'INVALID_PAYLOAD',['result:object-required']);
    const errors=[];
    if(Object.keys(result).some(key=>!RESULT_FIELDS.includes(key)))errors.push('result:unknown-field');
    if(result.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion:unsupported');
    if(!UUID_V4.test(String(result.mutationId||'')))errors.push('mutationId:uuid-v4-required');
    if(!RESULT_STATUSES.includes(result.status))errors.push('status:unsupported');
    if(!isRevision(result.resultingRevision))errors.push('resultingRevision:non-negative-integer-or-null');
    if(!ERROR_CODES.includes(result.errorCode))errors.push('errorCode:unsupported');
    if(result.status==='applied'&&result.errorCode!=='OK')errors.push('errorCode:applied-requires-ok');
    if(['rejected','ignored'].includes(result.status)&&result.errorCode==='OK')errors.push('errorCode:non-applied-requires-error');
    if(result.status==='applied'&&!isUtcTimestamp(result.appliedAt))errors.push('appliedAt:utc-iso-required');
    if(result.status!=='applied'&&result.appliedAt!==null)errors.push('appliedAt:must-be-null');
    if(result.errorMessage!==undefined&&(typeof result.errorMessage!=='string'||result.errorMessage.length>500))errors.push('errorMessage:invalid');
    const code=errors.some(error=>error.startsWith('schemaVersion'))?'INVALID_SCHEMA':'INVALID_PAYLOAD';
    return validation(errors.length===0,errors.length?code:'OK',errors);
  }
  function createResult(input={},dependencies={}){
    const now=typeof dependencies.now==='function'?dependencies.now:()=>new Date().toISOString(),status=input.status||'applied';
    const result={schemaVersion:SCHEMA_VERSION,mutationId:input.mutationId,status,resultingRevision:input.resultingRevision??null,errorCode:input.errorCode||(status==='applied'?'OK':null),appliedAt:input.appliedAt!==undefined?input.appliedAt:status==='applied'?now():null};
    if(input.errorMessage!==undefined)result.errorMessage=String(input.errorMessage);
    const checked=validateResult(result);if(!checked.ok)throw Object.assign(new TypeError(`Invalid workout quick action result: ${checked.errors.join(', ')}`),{code:checked.errorCode,errors:checked.errors});
    return Object.freeze(result);
  }

  global.WORKOUT_QUICK_ACTIONS=Object.freeze({SCHEMA_VERSION,PAYLOAD_VERSION,MAX_PAYLOAD_BYTES,ACTION_TYPES,ACTION_SOURCES,RESULT_STATUSES,ERROR_CODES,createAction,validateAction,createResult,validateResult});
})(typeof window!=='undefined'?window:globalThis);
