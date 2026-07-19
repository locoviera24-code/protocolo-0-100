(function(global){
  'use strict';

  const data=()=>global.PROGRESS_DATA_MODEL;
  const taxonomy=()=>global.MUSCLE_TAXONOMY;
  const setModel=()=>global.WORKOUT_SET_MODEL;
  const equipment=()=>global.WORKOUT_EQUIPMENT;

  function normalize(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function canonicalMuscleId(value){return taxonomy()?.canonicalId?.(value,{fallback:'other'})||'other';}
  function canonicalMuscle(value){return taxonomy()?.label?.(canonicalMuscleId(value))||String(value||'General').trim();}
  function libraryMap(library){
    const map=new Map();
    (library||[]).forEach(exercise=>{
      if(exercise?.id)map.set(exercise.id,exercise);
      (exercise?.legacyIds||[]).forEach(id=>map.set(id,exercise));
    });
    return map;
  }
  function exerciseId(exercise,library){return library?.id||exercise?.exerciseId||exercise?.id||`legacy-${normalize(exercise?.name)||'exercise'}`;}
  function fallbackMetrics(set,exercise){
    const reps=Math.max(0,data().number(set.reps));
    const weight=Math.max(0,data().number(set.weightKg??set.weight));
    const bodyweight=!!(set.isBodyweight||set.bodyweight||exercise.bodyweight||exercise.unit==='peso corporal');
    return {reps,weight,weightKg:weight,recordLoadKg:weight,normalizedTotalKg:weight,externalLoadVolume:reps*weight,measurementMode:'reps',loadMode:bodyweight?(weight?'addedLoad':'bodyweight'):'total',bodyweight,assistanceKg:0,durationSeconds:0,distanceMeters:0,paceSecondsPerKm:0,mainVolume:setModel()?.countsMainVolume?.(set)??set.completed!==false,recordEligible:setModel()?.countsForRecords?.(set)??set.completed!==false,progressionEligible:setModel()?.countsForProgression?.(set)??set.completed!==false};
  }
  function normalizeProgressSet(raw,exercise,definition,session,index,id){
    const exerciseContext={...definition,...exercise};
    const load=equipment()?.normalizeSet?.(raw,exerciseContext)||raw;
    const set=setModel()?.normalize?.(load,exerciseContext)||{...load,setType:load.setType||'working',completed:load.completed!==false};
    const metrics=global.WORKOUT_METRICS?.calculateSetMetrics?.(set,exerciseContext)||fallbackMetrics(set,exerciseContext);
    return {
      ...set,
      id:set.id||`${session.id}-${exercise.id}-${index}`,
      reps:metrics.reps,
      weight:metrics.weight,
      weightKg:metrics.weightKg,
      normalizedTotalKg:metrics.normalizedTotalKg,
      recordLoadKg:metrics.recordLoadKg,
      volume:metrics.externalLoadVolume,
      measurementMode:metrics.measurementMode,
      loadMode:metrics.loadMode,
      equipmentId:metrics.equipmentId||set.equipmentId||'',
      equipmentName:metrics.equipmentName||set.equipmentName||'',
      gymName:metrics.gymName||set.gymName||'',
      laterality:metrics.laterality||set.laterality||'bilateral',
      assistanceKg:metrics.assistanceKg,
      durationSeconds:metrics.durationSeconds,
      distanceMeters:metrics.distanceMeters,
      paceSecondsPerKm:metrics.paceSecondsPerKm,
      rir:set.rir??null,
      rpe:set.rpe??null,
      note:String(set.note||set.notes||''),
      setType:set.setType,
      completed:set.completed,
      mainVolume:metrics.mainVolume,
      recordEligible:metrics.recordEligible,
      progressionEligible:metrics.progressionEligible,
      excludeFromRecords:!!set.excludeFromRecords,
      excludeFromProgression:!!set.excludeFromProgression,
      isBodyweight:metrics.bodyweight,
      comparisonKey:equipment()?.comparisonKey?.(set,id)||[id,metrics.measurementMode,metrics.loadMode,metrics.equipmentId||'unspecified',metrics.gymName||'',metrics.laterality||'bilateral'].join('|')
    };
  }
  function flatten(sessions,library=[]){
    const byId=libraryMap(library),rows=[];
    (sessions||[]).forEach(session=>(session.exercises||[]).forEach(exercise=>{
      const definition=byId.get(exercise.exerciseId)||byId.get(exercise.id);
      const id=exerciseId(exercise,definition);
      const classification=taxonomy()?.resolveExercise?.({exercise,definition})||{primaryMuscles:[canonicalMuscleId(exercise.muscle||definition?.group)],secondaryMuscles:[],source:'legacy-map'};
      const primaryMuscle=classification.primaryMuscles[0]||'other';
      const sets=(exercise.sets||[]).map((raw,index)=>normalizeProgressSet(raw,exercise,definition,session,index,id));
      if(!sets.length)return;
      rows.push({
        sessionId:session.id,
        date:session.date,
        exerciseId:id,
        exerciseName:exercise.name||definition?.name||'Ejercicio',
        muscleId:primaryMuscle,
        muscle:taxonomy()?.label?.(primaryMuscle)||canonicalMuscle(primaryMuscle),
        secondaryMuscles:[...classification.secondaryMuscles],
        secondaryMuscleLabels:classification.secondaryMuscles.map(muscleId=>taxonomy()?.label?.(muscleId)||muscleId),
        classificationSource:classification.source,
        classificationConfidence:classification.confidence||'inferred',
        classificationNeedsReview:!!classification.needsReview,
        bodyweight:sets.some(set=>set.isBodyweight),
        sets
      });
    }));
    return rows;
  }

  global.GYM_PROGRESS_MODEL=Object.freeze({normalize,canonicalMuscleId,canonicalMuscle,libraryMap,flatten});
})(window);
