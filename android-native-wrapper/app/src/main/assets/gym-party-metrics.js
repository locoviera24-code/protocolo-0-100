(function(){
  'use strict';
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const setModel=()=>window.WORKOUT_SET_MODEL||null;
  function percentChange(current,previous){return number(previous)?Math.round((((number(current)-number(previous))/number(previous))*100)*10)/10:null;}
  function aggregateSets(rows){
    const sets=(rows||[]).filter(row=>!row.deleted).map(row=>setModel()?.normalize?.(row)||{...row,setType:row.setType||'working',completed:row.completed!==false}),completed=sets.filter(set=>set.completed),muscleVolume={},bestByExercise={};let totalReps=0,totalVolume=0,bodyweightReps=0,addedLoadVolume=0,bestWeight=0,bestSetVolume=0,maxReps=0,workingSets=0,warmupSets=0,supplementarySets=0;
    for(const set of completed){const reps=number(set.reps),weight=number(set.weightKg??set.weight),volume=reps*weight,main=setModel()?.countsMainVolume?.(set)??true,record=setModel()?.countsForRecords?.(set)??true;if(set.setType==='working')workingSets+=1;else if(set.setType==='warmup')warmupSets+=1;else supplementarySets+=1;if(main){totalReps+=reps;totalVolume+=volume;if(set.isBodyweight||set.bodyweight){if(weight)addedLoadVolume+=volume;else bodyweightReps+=reps;}const muscle=set.muscleGroup||set.muscle||'General';muscleVolume[muscle]=(muscleVolume[muscle]||0)+volume;}if(record){bestWeight=Math.max(bestWeight,weight);bestSetVolume=Math.max(bestSetVolume,volume);maxReps=Math.max(maxReps,reps);const key=set.exerciseId||set.exerciseName||'exercise';const score=volume||reps;if(!bestByExercise[key]||score>bestByExercise[key].score)bestByExercise[key]={...set,score,volume};}}
    return {totalSets:completed.length,workingSets,warmupSets,supplementarySets,totalReps,totalVolume:Math.round(totalVolume),bodyweightReps,addedLoadVolume:Math.round(addedLoadVolume),bestWeight,bestSetVolume,maxReps,muscleVolume,bestByExercise};
  }
  function changes(current,previous){return {sessions:number(current?.sessionsCount)-number(previous?.sessionsCount),volumePct:percentChange(current?.totalVolume,previous?.totalVolume),setsPct:percentChange(current?.totalSets,previous?.totalSets)};}
  window.GYM_PARTY_METRICS={percentChange,aggregateSets,changes};
})();
