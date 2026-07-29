(function(global){
  'use strict';

  const POLICY_VERSION=1;
  const metrics=()=>global.WORKOUT_METRICS;
  const equipment=()=>global.WORKOUT_EQUIPMENT;

  function exerciseId(value={}){return String(value.exerciseId||value.id||'');}
  function anomalyPending(set={}){return ['pending','needs-review'].includes(set.anomalyReview?.decision)||set.anomalyReview?.status==='pending'||!!set.suspectedAnomaly;}
  function normalizedRow(set,exercise,session){
    const calculated=metrics()?.calculateSetMetrics?.(set,exercise)||{};
    const id=exerciseId(exercise);
    return{
      ...calculated,
      id:String(set.id||''),
      exerciseId:id,
      comparisonKey:equipment()?.comparisonKey?.(set,id)||'',
      date:String(session.date||''),
      savedAt:String(set.savedAt||session.finishedAt||session.startedAt||''),
      recordEligible:calculated.recordEligible!==false&&!anomalyPending(set),
      progressionEligible:calculated.progressionEligible!==false&&!anomalyPending(set),
      anomalyPending:anomalyPending(set)
    };
  }
  function rowsFor({sessions=[],exercise={}}={}){
    const targetId=exerciseId(exercise);
    return(Array.isArray(sessions)?sessions:[]).flatMap(session=>(session.exercises||[])
      .filter(item=>exerciseId(item)===targetId)
      .flatMap(item=>(item.sets||[]).map(set=>normalizedRow(set,{...exercise,...item},session))))
      .filter(row=>row.completed!==false&&row.recordEligible&&!row.anomalyPending)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.savedAt).localeCompare(String(a.savedAt))||String(b.id).localeCompare(String(a.id)));
  }
  function score(row){
    if(row.measurementMode==='time')return row.durationSeconds;
    if(row.measurementMode==='distance')return row.distanceMeters;
    if(row.loadMode==='assistance')return row.assistanceKg>0?1e9-row.assistanceKg*1e4+row.reps:0;
    if(row.loadMode==='bodyweight')return row.reps;
    if(row.loadMode==='addedLoad')return row.recordLoadKg*1e4+row.reps;
    return row.recordLoadKg*1e4+row.reps;
  }
  function recordKind(row){
    if(!row)return'none';
    if(row.measurementMode==='time')return'duration';
    if(row.measurementMode==='distance')return'distance';
    if(row.loadMode==='assistance')return'assistance';
    if(row.loadMode==='bodyweight')return'bodyweight-reps';
    if(row.loadMode==='addedLoad')return'added-load';
    return'load';
  }
  function formatNumber(value){const rounded=Math.round(Number(value||0)*10)/10;return rounded.toLocaleString('es-PY',{maximumFractionDigits:1});}
  function formatDuration(seconds){const total=Math.max(0,Math.round(Number(seconds)||0));return`${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;}
  function label(row){
    if(!row)return'';
    if(row.measurementMode==='time')return`${formatDuration(row.durationSeconds)} min`;
    if(row.measurementMode==='distance')return`${formatNumber(row.distanceMeters/1000)} km`;
    if(row.loadMode==='assistance')return`${formatNumber(row.assistanceKg)} kg de asistencia × ${row.reps}`;
    if(row.loadMode==='bodyweight')return`${row.reps} reps · peso corporal`;
    if(row.loadMode==='addedLoad')return`${formatNumber(row.recordLoadKg)} kg de lastre × ${row.reps}`;
    const suffix=row.loadMode==='perHand'?' por mano':row.loadMode==='perSide'?' por lado':'';
    return`${formatNumber(row.recordLoadKg)} kg${suffix} × ${row.reps}`;
  }
  function compact(row){
    if(!row)return null;
    return{
      setId:row.id,exerciseId:row.exerciseId,comparisonKey:row.comparisonKey,date:row.date,reps:row.reps,
      weightKg:row.recordLoadKg,normalizedTotalKg:row.normalizedTotalKg,addedLoadKg:row.loadMode==='addedLoad'?row.recordLoadKg:0,
      assistanceKg:row.assistanceKg,durationSeconds:row.durationSeconds,distanceMeters:row.distanceMeters,
      measurementMode:row.measurementMode,loadMode:row.loadMode,equipmentId:row.equipmentId,equipmentName:row.equipmentName,
      gymName:row.gymName,laterality:row.laterality,label:label(row)
    };
  }
  function confidence(rows){
    const sessions=new Set(rows.map(row=>row.date||row.savedAt||row.id)).size;
    return sessions>=3?'high':sessions>=2?'medium':sessions===1?'low':'unknown';
  }
  function calculate({sessions=[],exercise={},candidateSet={}}={}){
    const id=exerciseId(exercise),candidate={...candidateSet,exerciseId:id};
    const comparisonKey=equipment()?.comparisonKey?.(candidate,id)||'';
    const comparable=rowsFor({sessions,exercise}).filter(row=>row.comparisonKey===comparisonKey);
    const lastComparableSet=comparable[0]||null;
    const historicalLoadRecord=comparable.slice().sort((a,b)=>score(b)-score(a)||String(b.date).localeCompare(String(a.date)))[0]||null;
    return{
      exerciseId:id,
      comparisonKey,
      lastComparableSet:compact(lastComparableSet),
      historicalLoadRecord:compact(historicalLoadRecord),
      recordKind:recordKind(historicalLoadRecord),
      comparisonLabel:equipment()?.loadLabel?.(candidate.loadMode)||'Carga comparable',
      confidence:confidence(comparable),
      comparableSetCount:comparable.length,
      calculatedAt:new Date().toISOString(),
      policyVersion:POLICY_VERSION
    };
  }

  global.WORKOUT_LOAD_GUIDANCE=Object.freeze({POLICY_VERSION,calculate,rowsFor,label,recordKind});
})(window);
