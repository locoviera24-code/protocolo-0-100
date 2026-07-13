(function(){
  'use strict';

  const LOCAL_FIELDS=new Set(['source','pendingSync','dirty','syncState','lastError','attempts','nextAttemptAt','_syncFingerprint','conflict','revision','lastSyncedAt']);
  function number(value){ return Number.isFinite(Number(value))?Number(value):0; }
  function timestampMillis(value){
    if(!value) return 0;
    if(typeof value.toMillis==='function') return value.toMillis();
    if(typeof value.toDate==='function') return value.toDate().getTime();
    if(typeof value.seconds==='number') return value.seconds*1000+Math.floor(number(value.nanoseconds)/1e6);
    const parsed=new Date(value).getTime(); return Number.isFinite(parsed)?parsed:0;
  }
  function timestampIso(value){ const millis=timestampMillis(value); return millis?new Date(millis).toISOString():''; }
  function stableValue(value){
    if(Array.isArray(value)) return value.map(stableValue);
    if(value&&typeof value==='object') return Object.fromEntries(Object.keys(value).filter(key=>!LOCAL_FIELDS.has(key)&&key!=='updatedAt').sort().map(key=>[key,stableValue(value[key])]));
    return value;
  }
  function fingerprint(row){ return JSON.stringify(stableValue(row||{})); }
  function timeContext(date=''){
    const now=new Date();
    let timeZone='UTC';
    try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(error){}
    return {localDate:String(date||now.toISOString().slice(0,10)).slice(0,10),timeZone,utcOffset:-now.getTimezoneOffset()};
  }
  function prepareLocalRows(rows,existingRows){
    const existing=new Map((existingRows||[]).map(row=>[row.id,row]));
    const now=new Date().toISOString();
    return (rows||[]).map(row=>{
      const previous=existing.get(row.id),nextFingerprint=fingerprint(row);
      if(previous&&previous._syncFingerprint===nextFingerprint){
        return {...previous,...row,revision:Math.max(1,number(previous.revision)||1),updatedAt:previous.updatedAt||row.updatedAt||now,_syncFingerprint:nextFingerprint};
      }
      return {...row,revision:Math.max(1,number(previous?.revision)+1),updatedAt:now,source:'local',pendingSync:true,dirty:true,syncState:'pending',lastError:null,_syncFingerprint:nextFingerprint};
    });
  }
  function normalizeRemote(row){
    const updatedAt=timestampIso(row.updatedAt)||String(row.updatedAt||'');
    const normalized={...row,updatedAt,source:'firebase',pendingSync:false,dirty:false,syncState:'synced',lastError:null};
    normalized._syncFingerprint=fingerprint(normalized);
    return normalized;
  }
  function isTombstone(row){ return !!(row?.deleted||row?.deletedAt); }
  function mergeRemoteRows(localRows,remoteRows){
    const map=new Map((localRows||[]).map(row=>[row.id,row]));
    for(const rawRemote of remoteRows||[]){
      const remote=normalizeRemote(rawRemote),local=map.get(remote.id);
      if(!local){map.set(remote.id,remote);continue;}
      const localRevision=Math.max(0,number(local.revision)),remoteRevision=Math.max(0,number(remote.revision));
      const localTime=timestampMillis(local.updatedAt),remoteTime=timestampMillis(rawRemote.updatedAt||remote.updatedAt);
      if(isTombstone(remote)&&(remoteRevision>=localRevision||remoteTime>=localTime)){map.set(remote.id,remote);continue;}
      if(isTombstone(local)&&localRevision>=remoteRevision){continue;}
      if(local.dirty||local.pendingSync){
        if(localRevision>remoteRevision||(localRevision===remoteRevision&&localTime>remoteTime)) continue;
        map.set(remote.id,{...remote,syncState:'conflict',conflict:{resolution:'remote-newer',localRevision,remoteRevision,resolvedAt:new Date().toISOString()}});
        continue;
      }
      if(remoteRevision>localRevision||remoteTime>=localTime) map.set(remote.id,remote);
    }
    return [...map.values()];
  }
  function markRowsSynced(rows,ids){
    const synced=new Set(ids||[]),now=new Date().toISOString();
    return (rows||[]).map(row=>synced.has(row.id)?{...row,pendingSync:false,dirty:false,syncState:'synced',lastError:null,lastSyncedAt:now,_syncFingerprint:row._syncFingerprint||fingerprint(row)}:row);
  }
  function markRowsError(rows,ids,error,attempts){
    const failed=new Set(ids||[]),message=String(error?.message||error||'Error de sincronizacion').slice(0,300);
    return (rows||[]).map(row=>failed.has(row.id)?{...row,pendingSync:true,dirty:true,syncState:'error',lastError:message,attempts}:row);
  }
  function backoffDelay(attempts){ return Math.min(300000,Math.max(1000,1000*(2**Math.max(0,number(attempts)-1)))); }
  function latestRemoteTimestamp(rows){
    const millis=Math.max(0,...(rows||[]).map(row=>timestampMillis(row.updatedAt)));
    return millis?new Date(millis).toISOString():'';
  }
  function stateCounts(rows){ return (rows||[]).reduce((out,row)=>{const state=row.syncState||'local';out[state]=(out[state]||0)+1;return out;},{}); }

  function workoutSetFromShared(row,previous){
    const weight=row.weightKg===null||row.weightKg===undefined?number(previous?.weight):number(row.weightKg);
    return {
      ...(previous||{}),
      id:row.localSetId||previous?.id||row.id,
      setNumber:Math.max(1,number(row.setNumber)||number(previous?.setNumber)||1),
      reps:number(row.reps),
      weight,
      rir:row.rir??null,
      rpe:row.rpe??null,
      bodyweight:!!row.isBodyweight,
      setType:window.WORKOUT_SET_MODEL?.type?.(row.setType)||'working',
      completed:row.completed!==false,
      excludeFromRecords:!!row.excludeFromRecords,
      excludeFromProgression:!!row.excludeFromProgression,
      savedAt:timestampIso(row.createdAt)||previous?.savedAt||timestampIso(row.updatedAt)||new Date().toISOString(),
      editedAt:timestampIso(row.updatedAt)||previous?.editedAt||null,
      volume:Math.round(number(row.reps)*weight)
    };
  }
  function reconcileWorkoutSessions(localSessions,sharedSessions,sharedSets){
    const remoteSessions=new Map((sharedSessions||[]).filter(row=>!row.deletedAt&&row.localSessionId).map(row=>[row.localSessionId,row]));
    const rowsBySession=new Map();
    for(const row of sharedSets||[]){
      const sharedSession=(sharedSessions||[]).find(session=>session.id===row.sessionId);
      const localSessionId=sharedSession?.localSessionId;
      if(!localSessionId||row.deletedReason==='privacy-removal') continue;
      if(!rowsBySession.has(localSessionId)) rowsBySession.set(localSessionId,[]);
      rowsBySession.get(localSessionId).push(row);
    }
    const source=new Map((localSessions||[]).map(session=>[session.id,JSON.parse(JSON.stringify(session))]));
    for(const [localSessionId,rows] of rowsBySession){
      const summary=remoteSessions.get(localSessionId);
      if(!summary) continue;
      let session=source.get(localSessionId);
      if(!session){
        if(!rows.some(row=>!isTombstone(row))) continue;
        session={
          id:localSessionId,
          date:summary.localDate||summary.date,
          dayKey:String(summary.weekday||'').toLowerCase(),
          weekday:summary.weekday,
          routine:{name:summary.routineName||'Entrenamiento sincronizado'},
          startedAt:timestampIso(summary.startedAt)||summary.startedAt||new Date().toISOString(),
          finishedAt:timestampIso(summary.finishedAt)||summary.finishedAt||null,
          status:summary.finishedAt?'finalizado':'en progreso',
          currentExerciseIndex:0,
          exercises:[],
          notes:'',
          subjectiveNote:'',
          summary:null
        };
      }
      const exercises=Array.isArray(session.exercises)?session.exercises:[];
      for(const row of rows.sort((a,b)=>number(a.setNumber)-number(b.setNumber))){
        const exerciseId=row.localExerciseId||row.exerciseId;
        let exercise=exercises.find(item=>item.id===exerciseId||item.exerciseId===row.exerciseId||item.name===row.exerciseName);
        if(isTombstone(row)){
          if(!exercise) continue;
          exercise.sets=(exercise.sets||[]).filter(set=>set.id!==(row.localSetId||row.id));
          continue;
        }
        if(!exercise){
          exercise={id:exerciseId||row.exerciseId,exerciseId:row.exerciseId||exerciseId,name:row.exerciseName||'Ejercicio',muscle:row.muscleGroup||'General',bodyweight:!!row.isBodyweight,unit:row.isBodyweight?'peso corporal':'kg',sets:[],completed:false,order:exercises.length+1};
          exercises.push(exercise);
        }
        const sets=Array.isArray(exercise.sets)?exercise.sets:[];
        const setId=row.localSetId||row.id,index=sets.findIndex(set=>set.id===setId);
        const next=workoutSetFromShared(row,index>=0?sets[index]:null);
        if(index>=0) sets[index]=next; else sets.push(next);
        exercise.sets=sets.sort((a,b)=>number(a.setNumber)-number(b.setNumber));
      }
      exercises.forEach((exercise,index)=>{exercise.order=index+1;exercise.completed=!!exercise.completed||exercise.sets.length>0;});
      session.exercises=exercises;
      source.set(localSessionId,session);
    }
    const next=[...source.values()].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
    const before=new Map((localSessions||[]).map(session=>[session.id,JSON.stringify(session)]));
    return {sessions:next,changedIds:next.filter(session=>before.get(session.id)!==JSON.stringify(session)).map(session=>session.id)};
  }

  window.GYM_PARTY_SYNC={timestampMillis,timestampIso,fingerprint,timeContext,prepareLocalRows,normalizeRemote,mergeRemoteRows,markRowsSynced,markRowsError,backoffDelay,latestRemoteTimestamp,stateCounts,isTombstone,reconcileWorkoutSessions};
})();
