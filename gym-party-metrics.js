(function(){
  'use strict';
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  function percentChange(current,previous){return number(previous)?Math.round((((number(current)-number(previous))/number(previous))*100)*10)/10:null;}
  function aggregateSets(rows){
    const sets=(rows||[]).filter(row=>!row.deleted),muscleVolume={},bestByExercise={};let totalReps=0,totalVolume=0,bodyweightReps=0,addedLoadVolume=0,bestWeight=0,bestSetVolume=0,maxReps=0;
    for(const set of sets){const reps=number(set.reps),weight=number(set.weightKg??set.weight),volume=reps*weight;totalReps+=reps;totalVolume+=volume;if(set.isBodyweight||set.bodyweight){if(weight)addedLoadVolume+=volume;else bodyweightReps+=reps;}bestWeight=Math.max(bestWeight,weight);bestSetVolume=Math.max(bestSetVolume,volume);maxReps=Math.max(maxReps,reps);const muscle=set.muscleGroup||set.muscle||'General';muscleVolume[muscle]=(muscleVolume[muscle]||0)+volume;const key=set.exerciseId||set.exerciseName||'exercise';const score=volume||reps;if(!bestByExercise[key]||score>bestByExercise[key].score)bestByExercise[key]={...set,score,volume};}
    return {totalSets:sets.length,totalReps,totalVolume:Math.round(totalVolume),bodyweightReps,addedLoadVolume:Math.round(addedLoadVolume),bestWeight,bestSetVolume,maxReps,muscleVolume,bestByExercise};
  }
  function changes(current,previous){return {sessions:number(current?.sessionsCount)-number(previous?.sessionsCount),volumePct:percentChange(current?.totalVolume,previous?.totalVolume),setsPct:percentChange(current?.totalSets,previous?.totalSets)};}
  window.GYM_PARTY_METRICS={percentChange,aggregateSets,changes};
})();
