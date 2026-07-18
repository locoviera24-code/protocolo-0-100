(function(global){
  'use strict';

  function build(exerciseModel){
    return (exerciseModel?.exercises||[]).flatMap(exercise=>{
      const metrics=exercise.all,records=[];
      if(metrics.measurementMode==='time'&&metrics.bestDurationSeconds)records.push({exerciseId:exercise.id,name:exercise.name,type:'duration',label:'Mayor duración',value:metrics.bestDurationSeconds,measure:'duration'});
      else if(metrics.measurementMode==='distance'&&metrics.bestDistanceMeters)records.push({exerciseId:exercise.id,name:exercise.name,type:'distance',label:'Mayor distancia',value:metrics.bestDistanceMeters,measure:'distance'});
      else if(metrics.loadMode==='assistance'){
        if(metrics.lowestAssistanceKg)records.push({exerciseId:exercise.id,name:exercise.name,type:'assistance',label:'Menor asistencia',value:metrics.lowestAssistanceKg,measure:'weight'});
        if(metrics.maxReps)records.push({exerciseId:exercise.id,name:exercise.name,type:'assisted-reps',label:'Máximo de reps asistidas',value:metrics.maxReps,measure:'reps'});
      }else if(metrics.bodyweight){
        if(metrics.bodyweightMaxReps)records.push({exerciseId:exercise.id,name:exercise.name,type:'reps-bodyweight',label:'Máximo de reps',value:metrics.bodyweightMaxReps,measure:'reps'});
        if(metrics.addedLoadBest)records.push({exerciseId:exercise.id,name:exercise.name,type:'added-load',label:'Mayor lastre',value:metrics.addedLoadBest,measure:'weight'});
      }else{
        if(metrics.bestWeight)records.push({exerciseId:exercise.id,name:exercise.name,type:'weight',label:'Mayor carga',value:metrics.bestWeight,measure:'weight'});
        if(metrics.bestE1RM)records.push({exerciseId:exercise.id,name:exercise.name,type:'e1rm',label:'Mejor e1RM estimado',value:metrics.bestE1RM,measure:'weight'});
        if(metrics.maxReps)records.push({exerciseId:exercise.id,name:exercise.name,type:'reps',label:'Máximo de reps',value:metrics.maxReps,measure:'reps'});
      }
      const bestSession=exercise.history.slice().sort((a,b)=>b.volume-a.volume)[0];
      if(bestSession?.volume)records.push({exerciseId:exercise.id,name:exercise.name,type:'session-volume',label:'Mayor volumen de sesión',value:Math.round(bestSession.volume),measure:'volume'});
      return records;
    });
  }

  global.PERSONAL_RECORDS=Object.freeze({build});
})(window);
