(function(global){
  'use strict';

  const VERSION=1;
  const MODES=Object.freeze([
    'doubleProgression',
    'loadProgression',
    'repProgression',
    'timeProgression',
    'distanceProgression',
    'assistanceReduction',
    'maintainTechnique'
  ]);
  const modeSet=new Set(MODES);

  function number(value,fallback=0){
    const parsed=global.APP_NUMBERS?.parse?.(value);
    if(parsed!==undefined)return parsed??fallback;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:fallback;
  }
  function nonNegative(value,fallback=0){return Math.max(0,number(value,fallback));}
  function round(value,places=2){const factor=10**places;return Math.round(number(value)*factor)/factor;}
  function optionalNumber(value){
    if(value===null||value===undefined||value==='')return null;
    const parsed=global.APP_NUMBERS?.parse?.(value);
    if(parsed!==undefined)return parsed===null?null:parsed;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:null;
  }
  function positiveInteger(value,fallback){return Math.max(1,Math.round(nonNegative(value,fallback)));}
  function exerciseIdOf(value={}){return String(value.exerciseId||value.id||'').trim();}
  function defaultMode(measurementMode='reps',loadMode='total'){
    if(measurementMode==='time')return'timeProgression';
    if(measurementMode==='distance')return'distanceProgression';
    if(measurementMode==='assistance'||loadMode==='assistance')return'assistanceReduction';
    if(loadMode==='bodyweight')return'repProgression';
    return'doubleProgression';
  }
  function normalizePrescription(source={},context={}){
    const measurementMode=String(context.measurementMode||source.measurementMode||'reps');
    const loadMode=String(context.loadMode||source.loadMode||source.defaultLoadMode||'total');
    const targetSets=positiveInteger(source.targetSets,3);
    const repRangeMin=Math.max(1,Math.round(nonNegative(source.repRangeMin??source.repsMin,8)));
    const repRangeMax=Math.max(repRangeMin,Math.round(nonNegative(source.repRangeMax??source.repsMax,12)));
    const targetRirMin=Math.max(0,Math.min(10,number(source.targetRirMin,1)));
    const targetRirMax=Math.max(targetRirMin,Math.min(10,number(source.targetRirMax,3)));
    const requestedMode=String(source.progressionMode||'');
    return {
      schemaVersion:1,
      targetSets,
      repRangeMin,
      repRangeMax,
      targetRirMin,
      targetRirMax,
      progressionMode:modeSet.has(requestedMode)?requestedMode:defaultMode(measurementMode,loadMode),
      incrementKg:Math.max(.5,round(nonNegative(source.incrementKg??context.incrementKg,.5),2)),
      timeIncrementSeconds:positiveInteger(source.timeIncrementSeconds,5),
      distanceIncrementMeters:positiveInteger(source.distanceIncrementMeters,100),
      equipmentId:String(source.equipmentId||context.equipmentId||''),
      measurementMode,
      loadMode
    };
  }
  function matchesExercise(exercise,id){
    const exerciseId=exerciseIdOf(exercise);
    return !!id&&(exerciseId===id||String(exercise.id||'')===id);
  }
  function planMatches(plan,id){
    return Object.values(plan||{}).flatMap(day=>Array.isArray(day?.exercises)?day.exercises:[]).filter(exercise=>matchesExercise(exercise,id));
  }
  function resolvePrescription({exerciseId,library=[],plan={},context={}}={}){
    const definition=(library||[]).find(exercise=>matchesExercise(exercise,exerciseId))||{};
    const planned=planMatches(plan,exerciseId);
    if(!planned.length)return normalizePrescription(definition,context);
    const normalized=planned.map(exercise=>normalizePrescription({...definition,...exercise},context));
    const first=normalized[0];
    const targetRirMin=Math.max(...normalized.map(item=>item.targetRirMin));
    return {
      ...first,
      targetSets:Math.max(...normalized.map(item=>item.targetSets)),
      repRangeMin:Math.min(...normalized.map(item=>item.repRangeMin)),
      repRangeMax:Math.max(...normalized.map(item=>item.repRangeMax)),
      targetRirMin,
      targetRirMax:Math.max(targetRirMin,Math.min(...normalized.map(item=>item.targetRirMax))),
      progressionMode:normalized.every(item=>item.progressionMode===first.progressionMode)?first.progressionMode:defaultMode(context.measurementMode,context.loadMode),
      incrementKg:Math.min(...normalized.map(item=>item.incrementKg))
    };
  }
  function allSets(session){return(session?.rows||[]).flatMap(row=>Array.isArray(row.sets)?row.sets:[]);}
  function effectiveSets(session){
    return allSets(session).filter(set=>set.completed!==false&&set.progressionEligible!==false&&!set.excludeFromProgression);
  }
  function average(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;}
  function hasPain(sets){return sets.some(set=>/dolor|molestia|lesion|lesión/i.test(String(set.note||set.notes||'')));}
  function hasAnomaly(sets){return sets.some(set=>!!(set.anomaly||set.suspicious||set.suspectedAnomaly||set.excludeAsAnomaly));}
  function rirValues(sets){return sets.map(set=>optionalNumber(set.rir)).filter(value=>value!==null);}
  function rpeValues(sets){return sets.map(set=>optionalNumber(set.rpe)).filter(value=>value!==null);}
  function sessionSummary(session,prescription){
    const sets=effectiveSets(session),target=sets.slice(0,prescription.targetSets);
    const reps=target.map(set=>Math.max(0,number(set.reps))),weights=target.map(set=>nonNegative(set.recordLoadKg??set.weightKg??set.weight));
    const durations=target.map(set=>nonNegative(set.durationSeconds)),distances=target.map(set=>nonNegative(set.distanceMeters)),assistance=target.map(set=>nonNegative(set.assistanceKg)).filter(value=>value>0);
    const rir=rirValues(target),rpe=rpeValues(target);
    return {
      id:String(session?.sessionId||session?.id||''),date:String(session?.date||''),comparisonKey:String(session?.comparisonKey||target[0]?.comparisonKey||''),
      sets,target,count:sets.length,complete:target.length>=prescription.targetSets,
      minReps:reps.length?Math.min(...reps):0,maxReps:reps.length?Math.max(...reps):0,totalReps:reps.reduce((sum,value)=>sum+value,0),
      bestWeight:weights.length?Math.max(...weights):nonNegative(session?.progressionBestWeight??session?.bestWeight),
      bestDurationSeconds:durations.length?Math.max(...durations):nonNegative(session?.bestDurationSeconds),
      bestDistanceMeters:distances.length?Math.max(...distances):nonNegative(session?.bestDistanceMeters),
      lowestAssistanceKg:assistance.length?Math.min(...assistance):nonNegative(session?.lowestAssistanceKg),
      averageRir:average(rir),averageRpe:average(rpe),rirComplete:rir.length>=Math.min(prescription.targetSets,target.length),
      rirInRange:rir.length>0&&rir.every(value=>value>=prescription.targetRirMin&&value<=prescription.targetRirMax),
      meetsMinimum:target.length>=prescription.targetSets&&reps.every(value=>value>=prescription.repRangeMin),
      reachesUpper:target.length>=prescription.targetSets&&reps.every(value=>value>=prescription.repRangeMax),
      pain:hasPain(allSets(session)),anomaly:hasAnomaly(allSets(session))
    };
  }
  function baseResult(kind,text,reason,{mode,prescription,sessions=[],confidence='medium',suggested={},blockers=[]}={}){
    return {
      kind,text,reason,mode:mode||prescription?.progressionMode||'doubleProgression',confidence,suggested,blockers,
      sessionsCompared:sessions.map(session=>({id:session.id,date:session.date})),
      dataUsed:prescription&&sessions.length?{
        targetSets:prescription.targetSets,repRangeMin:prescription.repRangeMin,repRangeMax:prescription.repRangeMax,
        targetRirMin:prescription.targetRirMin,targetRirMax:prescription.targetRirMax,
        latestSets:sessions[0].count,previousSets:sessions[1]?.count??0,
        latestMinReps:sessions[0].minReps,previousMinReps:sessions[1]?.minReps??0,
        latestRir:sessions[0].averageRir,previousRir:sessions[1]?.averageRir??null
      }:null
    };
  }
  function maintain(reason,options){return baseResult('maintain','Mantené la carga y priorizá técnica, recuperación y seguridad.',reason,{...options,confidence:'high'});}
  function insufficient(reason,options){return baseResult('insufficient','No hay datos suficientes para sugerir un cambio.',reason,{...options,confidence:'low'});}
  function recommend({history=[],prescription:rawPrescription={},context={}}={}){
    const prescription=normalizePrescription(rawPrescription,context),mode=prescription.progressionMode;
    if(!Array.isArray(history)||history.length<2)return insufficient('Se necesitan al menos dos sesiones con el mismo ejercicio, equipo y modo de carga.',{mode,prescription});
    const sessions=history.slice().sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))||String(b?.sessionId||b?.id||'').localeCompare(String(a?.sessionId||a?.id||''))).slice(0,2).map(session=>sessionSummary(session,prescription)),[latest,previous]=sessions;
    if(latest.pain)return maintain('La última sesión incluye una nota de dolor o molestia.',{mode,prescription,sessions,blockers:['pain']});
    if(latest.anomaly)return maintain('La última sesión contiene un dato marcado para revisión.',{mode,prescription,sessions,blockers:['anomaly']});
    if(!latest.count||!previous.count)return insufficient('Se necesitan series efectivas comparables; calentamientos y series excluidas no alimentan la progresión.',{mode,prescription,sessions});
    if(latest.comparisonKey&&previous.comparisonKey&&latest.comparisonKey!==previous.comparisonKey)return insufficient('El equipo, la variante o la interpretación de carga cambió entre sesiones.',{mode,prescription,sessions});
    if(latest.averageRir!==null&&previous.averageRir!==null&&latest.averageRir<=previous.averageRir-2)return maintain('El RIR bajó de forma marcada respecto de la sesión anterior.',{mode,prescription,sessions,blockers:['rir-drop']});
    if(latest.averageRpe!==null&&previous.averageRpe!==null&&latest.averageRpe>=previous.averageRpe+2)return maintain('El RPE subió de forma marcada respecto de la sesión anterior.',{mode,prescription,sessions,blockers:['rpe-rise']});
    if(mode==='maintainTechnique')return baseResult('maintain','Repetí una carga cómoda y consolidá la técnica.', 'La prescripción prioriza técnica antes que aumentar carga.',{mode,prescription,sessions,confidence:'high'});
    if(mode==='timeProgression'){
      if(latest.bestDurationSeconds<previous.bestDurationSeconds)return maintain('La duración bajó respecto de la sesión comparable anterior.',{mode,prescription,sessions,blockers:['duration-drop']});
      return baseResult('time','Podés repetir el tiempo o aumentarlo de forma gradual.','Dos sesiones comparables mantuvieron o mejoraron la duración.',{mode,prescription,sessions,suggested:{durationSeconds:latest.bestDurationSeconds+prescription.timeIncrementSeconds}});
    }
    if(mode==='distanceProgression'){
      if(latest.bestDistanceMeters<previous.bestDistanceMeters)return maintain('La distancia bajó respecto de la sesión comparable anterior.',{mode,prescription,sessions,blockers:['distance-drop']});
      return baseResult('distance','Podés repetir la distancia o aumentarla de forma gradual.','Dos sesiones comparables mantuvieron o mejoraron la distancia.',{mode,prescription,sessions,suggested:{distanceMeters:latest.bestDistanceMeters+prescription.distanceIncrementMeters}});
    }
    if(mode==='assistanceReduction'){
      if(!latest.lowestAssistanceKg||!previous.lowestAssistanceKg)return insufficient('Registrá la asistencia usada en dos sesiones comparables.',{mode,prescription,sessions});
      if(latest.lowestAssistanceKg>previous.lowestAssistanceKg||latest.minReps<previous.minReps)return maintain('La asistencia aumentó o bajaron las repeticiones.',{mode,prescription,sessions,blockers:['assistance-regression']});
      if(!latest.meetsMinimum||!previous.meetsMinimum)return baseResult('repeat','Mantené la asistencia hasta completar todas las series objetivo.','Todavía no se completó el rango mínimo en dos sesiones comparables.',{mode,prescription,sessions});
      return baseResult('assistance','Podés reducir la asistencia en el incremento mínimo.','Dos sesiones comparables completaron el rango con asistencia estable o menor.',{mode,prescription,sessions,confidence:'high',suggested:{assistanceKg:Math.max(0,round(latest.lowestAssistanceKg-prescription.incrementKg))}});
    }
    if(latest.bestWeight<previous.bestWeight||latest.minReps<previous.minReps-1)return maintain('La carga o las repeticiones bajaron respecto de la sesión anterior.',{mode,prescription,sessions,blockers:['performance-drop']});
    if(mode==='loadProgression'){
      if(latest.meetsMinimum&&previous.meetsMinimum&&latest.rirComplete&&previous.rirComplete&&latest.rirInRange&&previous.rirInRange)return baseResult('load','Podés probar el incremento mínimo disponible.','Dos sesiones completaron las series, el rango y el RIR objetivo.',{mode,prescription,sessions,confidence:'high',suggested:{weightKg:round(latest.bestWeight+prescription.incrementKg)}});
      return baseResult('repeat','Repetí la carga y consolidá el rango objetivo.','Faltan dos sesiones completas con RIR dentro del objetivo.',{mode,prescription,sessions});
    }
    if(mode==='repProgression'){
      if(!latest.complete)return baseResult('repeat','Completá primero todas las series objetivo.','La última sesión tiene menos series efectivas que la prescripción.',{mode,prescription,sessions});
      if(latest.minReps>=previous.minReps)return baseResult('rep','Si la técnica se mantiene, podés intentar una repetición adicional.','Dos sesiones comparables mantuvieron o mejoraron las repeticiones.',{mode,prescription,sessions,suggested:{reps:Math.min(prescription.repRangeMax,latest.minReps+1)}});
      return maintain('Las repeticiones bajaron respecto de la sesión anterior.',{mode,prescription,sessions,blockers:['reps-drop']});
    }
    if(latest.reachesUpper&&previous.reachesUpper){
      if(latest.bestWeight!==previous.bestWeight)return baseResult('repeat','Repetí la carga actual antes de volver a aumentarla.','La carga cambió entre las dos sesiones comparables.',{mode,prescription,sessions});
      if(latest.rirComplete&&previous.rirComplete&&latest.rirInRange&&previous.rirInRange)return baseResult('load','Podés probar el incremento mínimo disponible.','Dos sesiones completaron todas las series en el límite superior y dentro del RIR objetivo.',{mode,prescription,sessions,confidence:'high',suggested:{weightKg:round(latest.bestWeight+prescription.incrementKg)}});
      return baseResult('repeat','Repetí la carga y registrá RIR antes de aumentarla.','El límite superior se completó, pero falta confirmar el RIR objetivo en dos sesiones.',{mode,prescription,sessions});
    }
    if(latest.complete&&latest.minReps>=previous.minReps)return baseResult('rep','Si la técnica se mantiene, podés intentar una repetición adicional.','La última sesión completó las series y mantuvo o mejoró el mínimo de repeticiones.',{mode,prescription,sessions,suggested:{reps:Math.min(prescription.repRangeMax,Math.max(prescription.repRangeMin,latest.minReps+1))}});
    return baseResult('repeat','Podés repetir la carga anterior y consolidar todas las series.','La prescripción todavía no se completó de forma estable.',{mode,prescription,sessions});
  }

  global.WORKOUT_PROGRESSION=Object.freeze({VERSION,MODES:[...MODES],normalizePrescription,resolvePrescription,recommend});
})(window);
