(function(global){
  'use strict';
  const data=()=>global.PROGRESS_DATA_MODEL;
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function canonicalMuscle(value){
    const text=normalize(value);if(!text)return'General';
    if(text.includes('pecho'))return'Pecho';if(text.includes('espalda')||text.includes('dorsal'))return'Espalda';if(text.includes('hombro')||text.includes('deltoide'))return'Hombro';
    if(text.includes('biceps')||text.includes('braquial'))return'Bíceps';if(text.includes('triceps'))return'Tríceps';if(text.includes('cuadriceps')||text.includes('pierna')||text.includes('gluteo'))return'Cuádriceps / pierna';
    if(text.includes('isquiotibial'))return'Isquiotibiales';if(text.includes('aductor'))return'Aductores';if(text.includes('pantorrilla')||text.includes('soleo')||text.includes('gemelo'))return'Pantorrillas';if(text.includes('tibial'))return'Tibial anterior';
    if(text.includes('antebrazo'))return'Antebrazo';if(text.includes('movilidad'))return'Movilidad';return String(value||'General').trim();
  }
  function libraryMap(library){const map=new Map();(library||[]).forEach(exercise=>{if(exercise?.id)map.set(exercise.id,exercise);(exercise?.legacyIds||[]).forEach(id=>map.set(id,exercise));});return map;}
  function exerciseId(exercise,library){return library?.id||exercise?.exerciseId||exercise?.id||`legacy-${normalize(exercise?.name)||'exercise'}`;}
  function flatten(sessions,library=[]){
    const byId=libraryMap(library),rows=[];
    (sessions||[]).forEach(session=>(session.exercises||[]).forEach(exercise=>{
      const definition=byId.get(exercise.exerciseId)||byId.get(exercise.id),primary=canonicalMuscle(exercise.muscle||definition?.group||definition?.primaryMuscles?.[0]||'General');
      const sets=(exercise.sets||[]).map((set,index)=>{const reps=Math.max(0,data().number(set.reps)),weight=Math.max(0,data().number(set.weightKg??set.weight));return{id:set.id||`${session.id}-${exercise.id}-${index}`,reps,weight,volume:reps*weight,rir:set.rir??null,rpe:set.rpe??null,note:String(set.note||set.notes||''),isBodyweight:!!(set.isBodyweight||set.bodyweight||exercise.bodyweight||definition?.unit==='peso corporal')};});
      if(!sets.length)return;
      rows.push({sessionId:session.id,date:session.date,exerciseId:exerciseId(exercise,definition),exerciseName:exercise.name||definition?.name||'Ejercicio',muscle:primary,secondaryMuscles:(definition?.secondaryMuscles||[]).map(canonicalMuscle),bodyweight:!!(exercise.bodyweight||definition?.unit==='peso corporal'),sets});
    }));
    return rows;
  }
  global.GYM_PROGRESS_MODEL=Object.freeze({normalize,canonicalMuscle,libraryMap,flatten});
})(window);
