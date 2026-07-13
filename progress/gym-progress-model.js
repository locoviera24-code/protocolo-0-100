(function(global){
  'use strict';
  const data=()=>global.PROGRESS_DATA_MODEL,taxonomy=()=>global.MUSCLE_TAXONOMY;
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function canonicalMuscleId(value){return taxonomy()?.canonicalId?.(value,{fallback:'other'})||'other';}
  function canonicalMuscle(value){return taxonomy()?.label?.(canonicalMuscleId(value))||String(value||'General').trim();}
  function libraryMap(library){const map=new Map();(library||[]).forEach(exercise=>{if(exercise?.id)map.set(exercise.id,exercise);(exercise?.legacyIds||[]).forEach(id=>map.set(id,exercise));});return map;}
  function exerciseId(exercise,library){return library?.id||exercise?.exerciseId||exercise?.id||`legacy-${normalize(exercise?.name)||'exercise'}`;}
  function flatten(sessions,library=[]){
    const byId=libraryMap(library),rows=[];
    (sessions||[]).forEach(session=>(session.exercises||[]).forEach(exercise=>{
      const definition=byId.get(exercise.exerciseId)||byId.get(exercise.id),classification=taxonomy()?.resolveExercise?.({exercise,definition})||{primaryMuscles:[canonicalMuscleId(exercise.muscle||definition?.group)],secondaryMuscles:[],source:'legacy-map'},primaryMuscle=classification.primaryMuscles[0]||'other';
      const sets=(exercise.sets||[]).map((set,index)=>{const reps=Math.max(0,data().number(set.reps)),weight=Math.max(0,data().number(set.weightKg??set.weight));return{id:set.id||`${session.id}-${exercise.id}-${index}`,reps,weight,volume:reps*weight,rir:set.rir??null,rpe:set.rpe??null,note:String(set.note||set.notes||''),isBodyweight:!!(set.isBodyweight||set.bodyweight||exercise.bodyweight||definition?.unit==='peso corporal')};});
      if(!sets.length)return;
      rows.push({sessionId:session.id,date:session.date,exerciseId:exerciseId(exercise,definition),exerciseName:exercise.name||definition?.name||'Ejercicio',muscleId:primaryMuscle,muscle:taxonomy()?.label?.(primaryMuscle)||canonicalMuscle(primaryMuscle),secondaryMuscles:[...classification.secondaryMuscles],secondaryMuscleLabels:classification.secondaryMuscles.map(id=>taxonomy()?.label?.(id)||id),classificationSource:classification.source,bodyweight:!!(exercise.bodyweight||definition?.unit==='peso corporal'),sets});
    }));
    return rows;
  }
  global.GYM_PROGRESS_MODEL=Object.freeze({normalize,canonicalMuscleId,canonicalMuscle,libraryMap,flatten});
})(window);
