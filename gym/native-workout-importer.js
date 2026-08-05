(function(global){
  'use strict';

  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function string(value,max=180){return String(value||'').trim().slice(0,max);}
  function allSetIds(sessions){return new Set((sessions||[]).flatMap(session=>(session.exercises||[]).flatMap(exercise=>(exercise.sets||[]).map(set=>String(set.id||'')))).filter(Boolean));}
  function legacyTimestamp(mutation){
    const value=string(mutation?.createdAt,64);
    if(value.endsWith('Z')&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();
    const epoch=Number(mutation?.createdAtEpochMs);
    return new Date(Number.isFinite(epoch)&&epoch>=0?epoch:0).toISOString();
  }
  function legacySource(value){return value==='android-notification'?'android-notification':'android-widget';}

  /** Read-only compatibility adapter. It never writes the transformed envelope back to Android. */
  function adaptLegacy(mutation){
    if(!mutation||typeof mutation!=='object'||Array.isArray(mutation))return null;
    const contract=global.WORKOUT_QUICK_ACTIONS;
    if(!contract)return null;
    if(mutation.schemaVersion!==undefined||mutation.actionType!==undefined)return clone(mutation);
    const legacyType=String(mutation.type||'');
    const actionType=legacyType==='save_set'||legacyType==='SAVE_SET'?'SAVE_SET'
      :legacyType==='undo_set'||legacyType==='UNDO_LAST_SET'||legacyType==='UNDO_SET'?'UNDO_SET':'';
    if(!actionType)return null;
    const oldPayload=clone(mutation.payload||{}),legacySet=oldPayload?.set;
    const setId=string(actionType==='SAVE_SET'?(mutation.setId||legacySet?.id):(oldPayload?.targetSetId||mutation.setId));
    if(!setId)return null;
    delete oldPayload.set;delete oldPayload.targetSetId;
    oldPayload.setId=setId;
    if(actionType==='SAVE_SET')oldPayload.values=clone(legacySet);
    const action={
      schemaVersion:1,payloadVersion:1,actionType,
      mutationId:string(mutation.mutationId||mutation.id),source:legacySource(mutation.source),
      sessionId:string(mutation.sessionId),exerciseId:string(mutation.exerciseId||mutation.payload?.exerciseId),
      createdAt:legacyTimestamp(mutation),clientVersion:/^\d+\.\d+\.\d+\+\d+$/.test(String(mutation.clientVersion||''))?String(mutation.clientVersion):'2.7.0+93',
      expectedRevision:Number.isInteger(mutation.expectedRevision)&&mutation.expectedRevision>=0?mutation.expectedRevision:null,
      payload:oldPayload
    };
    return contract.validateAction(action).ok?action:null;
  }

  function canonicalAction(mutation){
    const contract=global.WORKOUT_QUICK_ACTIONS;
    if(!contract)return{ok:false,error:'contract-unavailable',errorCode:'INVALID_SCHEMA'};
    const action=mutation?.schemaVersion===1&&mutation?.actionType?clone(mutation):adaptLegacy(mutation);
    if(!action)return{ok:false,error:'mutation-invalid',errorCode:'INVALID_SCHEMA'};
    const checked=contract.validateAction(action);
    if(!checked.ok)return{ok:false,error:checked.errors.join(','),errorCode:checked.errorCode};
    return{ok:true,action};
  }

  function validate(mutation){
    const canonical=canonicalAction(mutation);if(!canonical.ok)return canonical;
    const action=canonical.action,payload=action.payload||{},setId=string(payload.setId);
    if(action.actionType==='UNDO_SET')return{ok:true,action,type:'UNDO_SET',mutationId:action.mutationId,sessionId:action.sessionId,exerciseId:action.exerciseId,setId,payload};
    if(action.actionType!=='SAVE_SET')return{ok:false,error:'action-not-importable',errorCode:'UNSUPPORTED_ACTION',action};
    const set=payload.values,exercise=payload.exercise;
    if(!set||typeof set!=='object'||!exercise||typeof exercise!=='object')return{ok:false,error:'payload-invalid',errorCode:'INVALID_PAYLOAD',action};
    if(string(set.id)!==setId)return{ok:false,error:'set-id-mismatch',errorCode:'INVALID_PAYLOAD',action};
    return{ok:true,action,type:'SAVE_SET',mutationId:action.mutationId,sessionId:action.sessionId,exerciseId:action.exerciseId,setId,payload,set,exercise};
  }

  function invalidResult(error,errorCode,sessions,extra={}){return{status:'invalid',error,errorCode,sessions:clone(sessions||[]),...extra};}
  function apply(sessions,mutation,{protectSet}={}){
    const checked=validate(mutation);if(!checked.ok)return invalidResult(checked.error,checked.errorCode,sessions,{action:checked.action});
    const next=clone(Array.isArray(sessions)?sessions:[]);
    if(checked.type==='UNDO_SET'){
      const session=next.find(item=>String(item.id||'')===checked.sessionId);
      if(!session)return invalidResult('session-not-found','SESSION_NOT_FOUND',next,{sessionId:checked.sessionId,setId:checked.setId});
      const exercise=session.exercises?.find(item=>String(item.exerciseId||item.id||'')===checked.exerciseId);
      if(!exercise)return invalidResult('exercise-not-found','EXERCISE_NOT_FOUND',next,{sessionId:checked.sessionId,exerciseId:checked.exerciseId,setId:checked.setId});
      const index=exercise.sets?.findIndex(set=>String(set.id||'')===checked.setId)??-1;
      if(index<0)return{status:'duplicate',errorCode:'SET_NOT_FOUND',operation:'undo',sessionId:checked.sessionId,exerciseId:checked.exerciseId,setId:checked.setId,sessions:next};
      exercise.sets.splice(index,1);
      return{status:'applied',errorCode:'OK',operation:'undo',sessionId:checked.sessionId,exerciseId:checked.exerciseId,setId:checked.setId,previousHistory:clone(checked.payload.previousHistory),sessions:next};
    }
    const ids=allSetIds(next);
    if(ids.has(checked.setId))return{status:'duplicate',errorCode:'DUPLICATE_MUTATION',sessionId:checked.sessionId,setId:checked.setId,sessions:next};
    let session=next.find(item=>String(item.id||'')===checked.sessionId);
    if(!session){
      session={
        id:checked.sessionId,date:string(checked.payload.date,32),dayKey:string(checked.payload.dayKey,32),weekday:string(checked.payload.weekday,32),
        routine:clone(checked.payload.routine)||{name:'Entrenamiento Android',exercises:[]},startedAt:string(checked.payload.startedAt,64)||checked.action.createdAt,
        finishedAt:null,status:'en progreso',currentExerciseIndex:Math.max(0,Number(checked.payload.currentExerciseIndex)||0),exercises:[],notes:'',summary:null
      };
      next.push(session);
    }
    let exercise=session.exercises.find(item=>String(item.exerciseId||item.id||'')===checked.exerciseId);
    if(!exercise){
      exercise={...clone(checked.exercise),id:string(checked.exercise.id)||checked.exerciseId,exerciseId:checked.exerciseId,name:string(checked.exercise.name,180)||'Ejercicio',sets:[],completed:false};
      session.exercises.push(exercise);
    }
    let set={...clone(checked.set),id:checked.setId,nativeMutationId:checked.mutationId,privateImportState:'imported'};
    if(typeof protectSet==='function')set=protectSet(set,exercise,session)||set;
    exercise.sets=Array.isArray(exercise.sets)?exercise.sets:[];
    exercise.sets.push(set);
    session.currentExerciseIndex=Math.max(0,session.exercises.indexOf(exercise));
    return{status:'applied',errorCode:'OK',sessionId:session.id,exerciseId:exercise.exerciseId,setId:set.id,sessions:next};
  }

  global.NATIVE_WORKOUT_IMPORTER=Object.freeze({adaptLegacy,canonicalAction,validate,apply,allSetIds});
})(window);
