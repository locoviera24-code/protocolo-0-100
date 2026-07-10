(function(){
  'use strict';

  function number(value){ return Number.isFinite(Number(value))?Number(value):0; }
  function setWeight(set){ return Math.max(0,number(set?.weightKg??set?.weight)); }
  function setReps(set){ return Math.max(0,number(set?.reps)); }
  function isBodyweight(set,exercise){ return !!(set?.isBodyweight||set?.bodyweight||exercise?.bodyweight||exercise?.unit==='peso corporal'); }
  function estimatedOneRepMax(weight,reps){
    const w=Math.max(0,number(weight)),r=Math.max(0,number(reps));
    if(!w||!r||r>15) return null;
    return Math.round((w*(1+r/30))*10)/10;
  }
  function calculateSetMetrics(set={},exercise={}){
    const reps=setReps(set),weight=setWeight(set),bodyweight=isBodyweight(set,exercise);
    const volume=reps*weight;
    return {
      reps,
      weight,
      bodyweight,
      externalLoadVolume:Math.round(volume),
      bodyweightReps:bodyweight&&weight===0?reps:0,
      addedLoadReps:bodyweight&&weight>0?reps:0,
      addedLoadVolume:bodyweight&&weight>0?Math.round(volume):0,
      estimated1RM:!bodyweight&&weight>0?estimatedOneRepMax(weight,reps):null
    };
  }
  function calculateSetsMetrics(sets=[],exercise={}){
    const rows=(Array.isArray(sets)?sets:[]).map(set=>({...calculateSetMetrics(set,exercise),set}));
    const bestWeight=rows.reduce((max,row)=>Math.max(max,row.weight),0);
    const bestSetVolume=rows.reduce((max,row)=>Math.max(max,row.externalLoadVolume),0);
    const maxReps=rows.reduce((max,row)=>Math.max(max,row.reps),0);
    const estimated1RM=rows.map(row=>row.estimated1RM).filter(value=>value!==null).reduce((max,value)=>Math.max(max,value),0)||null;
    return {
      totalSets:rows.length,
      totalReps:rows.reduce((sum,row)=>sum+row.reps,0),
      externalLoadVolume:rows.reduce((sum,row)=>sum+row.externalLoadVolume,0),
      bodyweightReps:rows.reduce((sum,row)=>sum+row.bodyweightReps,0),
      addedLoadReps:rows.reduce((sum,row)=>sum+row.addedLoadReps,0),
      addedLoadVolume:rows.reduce((sum,row)=>sum+row.addedLoadVolume,0),
      bestWeight,
      bestSetVolume,
      maxReps,
      estimated1RM,
      rows
    };
  }
  function calculateExerciseMetrics(exercise={}){ return calculateSetsMetrics(exercise.sets||[],exercise); }
  function calculateSessionMetrics(session={}){
    const exercises=Array.isArray(session.exercises)?session.exercises:[];
    const metrics=exercises.map(exercise=>({exercise,metrics:calculateExerciseMetrics(exercise)}));
    return {
      totalSets:metrics.reduce((sum,row)=>sum+row.metrics.totalSets,0),
      totalReps:metrics.reduce((sum,row)=>sum+row.metrics.totalReps,0),
      externalLoadVolume:metrics.reduce((sum,row)=>sum+row.metrics.externalLoadVolume,0),
      bodyweightReps:metrics.reduce((sum,row)=>sum+row.metrics.bodyweightReps,0),
      addedLoadReps:metrics.reduce((sum,row)=>sum+row.metrics.addedLoadReps,0),
      addedLoadVolume:metrics.reduce((sum,row)=>sum+row.metrics.addedLoadVolume,0),
      bestWeight:metrics.reduce((max,row)=>Math.max(max,row.metrics.bestWeight),0),
      bestSetVolume:metrics.reduce((max,row)=>Math.max(max,row.metrics.bestSetVolume),0),
      maxReps:metrics.reduce((max,row)=>Math.max(max,row.metrics.maxReps),0),
      exercises
    };
  }
  function percentChange(current,previous){
    const now=number(current),before=number(previous);
    if(before===0) return null;
    return Math.round((((now-before)/before)*100)*10)/10;
  }
  function formatProgress(metrics={},unit='kg'){
    const parts=[];
    if(number(metrics.externalLoadVolume)>0) parts.push(`${Math.round(number(metrics.externalLoadVolume)).toLocaleString()} ${unit} de volumen externo`);
    if(number(metrics.bodyweightReps)>0) parts.push(`${Math.round(number(metrics.bodyweightReps))} reps de peso corporal`);
    if(number(metrics.addedLoadVolume)>0) parts.push(`${Math.round(number(metrics.addedLoadVolume))} ${unit} de volumen con lastre`);
    return parts.join(' · ')||'Sin series registradas';
  }
  function consistency({plannedSessions=0,registeredSessions=0,plannedExercises=0,completedExercises=0,scheduledRestDays=0}={}){
    const sessionCompliance=plannedSessions?Math.min(1,registeredSessions/plannedSessions):(registeredSessions?1:0);
    const exerciseCompliance=plannedExercises?Math.min(1,completedExercises/plannedExercises):(registeredSessions?1:0);
    return {plannedSessions,registeredSessions,scheduledRestDays,sessionCompliance:Math.round(sessionCompliance*100),exerciseCompliance:Math.round(exerciseCompliance*100),score:Math.round((sessionCompliance*.65+exerciseCompliance*.35)*100)};
  }

  window.WORKOUT_METRICS={calculateSetMetrics,calculateSetsMetrics,calculateExerciseMetrics,calculateSessionMetrics,estimatedOneRepMax,percentChange,formatProgress,consistency};
})();
