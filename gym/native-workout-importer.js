(function(global){
  'use strict';

  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function string(value,max=160){return String(value||'').trim().slice(0,max);}
  function allSetIds(sessions){return new Set((sessions||[]).flatMap(session=>(session.exercises||[]).flatMap(exercise=>(exercise.sets||[]).map(set=>String(set.id||'')))).filter(Boolean));}
  function validate(mutation){
    if(!mutation||typeof mutation!=='object')return{ok:false,error:'mutation-invalid'};
    const mutationId=string(mutation.mutationId||mutation.id);
    if(!mutationId)return{ok:false,error:'mutation-id-missing'};
    if(mutation.type==='undo_set'){
      const payload=mutation.payload,targetSetId=string(payload?.targetSetId||mutation.setId),sessionId=string(mutation.sessionId),exerciseId=string(mutation.exerciseId||payload?.exerciseId);
      if(!payload||!targetSetId||!sessionId||!exerciseId)return{ok:false,error:'undo-payload-invalid'};
      return{ok:true,type:'undo_set',mutationId,sessionId,exerciseId,setId:targetSetId,payload};
    }
    if(mutation.type!=='save_set')return{ok:false,error:'type-unsupported'};
    const payload=mutation.payload,set=payload?.set,exercise=payload?.exercise;
    const sessionId=string(mutation.sessionId),exerciseId=string(mutation.exerciseId),setId=string(mutation.setId);
    if(!sessionId||!exerciseId||!setId||!payload||!set||!exercise)return{ok:false,error:'payload-invalid'};
    if(string(set.id)!==setId)return{ok:false,error:'set-id-mismatch'};
    return{ok:true,type:'save_set',mutationId,sessionId,exerciseId,setId,payload,set,exercise};
  }
  function apply(sessions,mutation,{protectSet}={}){
    const checked=validate(mutation);if(!checked.ok)return{status:'invalid',error:checked.error,sessions:clone(sessions||[])};
    const next=clone(Array.isArray(sessions)?sessions:[]);
    if(checked.type==='undo_set'){
      const session=next.find(item=>String(item.id||'')===checked.sessionId);
      const exercise=session?.exercises?.find(item=>String(item.exerciseId||item.id||'')===checked.exerciseId);
      const index=exercise?.sets?.findIndex(set=>String(set.id||'')===checked.setId)??-1;
      if(index<0)return{status:'duplicate',operation:'undo',sessionId:checked.sessionId,exerciseId:checked.exerciseId,setId:checked.setId,sessions:next};
      exercise.sets.splice(index,1);
      return{status:'applied',operation:'undo',sessionId:checked.sessionId,exerciseId:checked.exerciseId,setId:checked.setId,previousHistory:clone(checked.payload.previousHistory),sessions:next};
    }
    const ids=allSetIds(next);
    if(ids.has(checked.setId))return{status:'duplicate',sessionId:checked.sessionId,setId:checked.setId,sessions:next};
    let session=next.find(item=>String(item.id||'')===checked.sessionId);
    if(!session){
      session={
        id:checked.sessionId,date:string(checked.payload.date,32),dayKey:string(checked.payload.dayKey,32),weekday:string(checked.payload.weekday,32),
        routine:clone(checked.payload.routine)||{name:'Entrenamiento Android',exercises:[]},startedAt:string(checked.payload.startedAt,64)||new Date().toISOString(),
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
    return{status:'applied',sessionId:session.id,exerciseId:exercise.exerciseId,setId:set.id,sessions:next};
  }

  global.NATIVE_WORKOUT_IMPORTER=Object.freeze({validate,apply,allSetIds});
})(window);
