(function(){
  'use strict';

  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const setModel=()=>window.WORKOUT_SET_MODEL||null;
  function percentChange(current,previous){return number(previous)?Math.round((((number(current)-number(previous))/number(previous))*100)*10)/10:null;}
  function normalizeSet(row){
    const load=window.WORKOUT_EQUIPMENT?.normalizeSet?.(row)||row;
    return setModel()?.normalize?.(load)||{...load,setType:load.setType||'working',completed:load.completed!==false};
  }
  function setScore(set,metrics){
    if(metrics.measurementMode==='time')return metrics.durationSeconds;
    if(metrics.measurementMode==='distance')return metrics.distanceMeters;
    if(metrics.loadMode==='assistance')return metrics.reps*100000-Math.round(metrics.assistanceKg*100);
    return metrics.externalLoadVolume||metrics.reps;
  }
  function aggregateSets(rows){
    const sets=(rows||[]).filter(row=>!row.deleted).map(normalizeSet),completed=sets.filter(set=>set.completed!==false),muscleVolume={},bestByExercise={};
    const aggregate=window.WORKOUT_METRICS?.calculateSetsMetrics?.(completed)||null;
    let totalReps=0,totalVolume=0,bodyweightReps=0,addedLoadVolume=0,bestWeight=0,bestSetVolume=0,maxReps=0,workingSets=0,warmupSets=0,supplementarySets=0,durationSeconds=0,distanceMeters=0,lowestAssistanceKg=0;
    for(const set of completed){
      const legacyWeight=number(set.weightKg??set.weight),legacyLoadMode=set.loadMode||(set.isBodyweight||set.bodyweight?(legacyWeight?'addedLoad':'bodyweight'):'total');
      const metrics=window.WORKOUT_METRICS?.calculateSetMetrics?.(set)||{reps:number(set.reps),weight:legacyWeight,externalLoadVolume:number(set.reps)*legacyWeight,measurementMode:set.measurementMode||'reps',loadMode:legacyLoadMode,durationSeconds:number(set.durationSeconds),distanceMeters:number(set.distanceMeters),assistanceKg:number(set.assistanceKg),mainVolume:setModel()?.countsMainVolume?.(set)??true,recordEligible:setModel()?.countsForRecords?.(set)??true,bodyweight:!!set.isBodyweight};
      if(set.setType==='working')workingSets+=1;else if(set.setType==='warmup')warmupSets+=1;else supplementarySets+=1;
      if(metrics.mainVolume){
        totalReps+=metrics.reps;totalVolume+=metrics.externalLoadVolume;durationSeconds+=metrics.durationSeconds;distanceMeters+=metrics.distanceMeters;
        if(metrics.loadMode==='bodyweight')bodyweightReps+=metrics.reps;
        if(metrics.loadMode==='addedLoad')addedLoadVolume+=metrics.externalLoadVolume;
        const muscle=set.muscleGroup||set.muscle||'General';muscleVolume[muscle]=(muscleVolume[muscle]||0)+metrics.externalLoadVolume;
      }
      if(metrics.recordEligible){
        bestWeight=Math.max(bestWeight,metrics.weight);bestSetVolume=Math.max(bestSetVolume,metrics.externalLoadVolume);maxReps=Math.max(maxReps,metrics.reps);
        if(metrics.assistanceKg>0)lowestAssistanceKg=!lowestAssistanceKg||metrics.assistanceKg<lowestAssistanceKg?metrics.assistanceKg:lowestAssistanceKg;
        const key=set.exerciseId||set.exerciseName||'exercise',score=setScore(set,metrics);
        if(!bestByExercise[key]||score>bestByExercise[key].score)bestByExercise[key]={...set,...metrics,score,volume:metrics.externalLoadVolume};
      }
    }
    return {totalSets:completed.length,workingSets,warmupSets,supplementarySets,totalReps,totalVolume:Math.round(totalVolume),bodyweightReps,addedLoadVolume:Math.round(addedLoadVolume),bestWeight:aggregate?.bestWeight??bestWeight,bestSetVolume:aggregate?.bestSetVolume??bestSetVolume,maxReps:aggregate?.maxReps??maxReps,durationSeconds:aggregate?.durationSeconds??durationSeconds,distanceMeters:aggregate?.distanceMeters??distanceMeters,lowestAssistanceKg:aggregate?.lowestAssistanceKg??lowestAssistanceKg,muscleVolume,bestByExercise};
  }
  function changes(current,previous){return {sessions:number(current?.sessionsCount)-number(previous?.sessionsCount),volumePct:percentChange(current?.totalVolume,previous?.totalVolume),setsPct:percentChange(current?.totalSets,previous?.totalSets)};}

  window.GYM_PARTY_METRICS={percentChange,aggregateSets,changes};
})();
