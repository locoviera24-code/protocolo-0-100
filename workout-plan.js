(function(){
  'use strict';
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  function normalizeText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function normalizeExerciseName(value){return normalizeText(value).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function aliases(exercise){return [exercise?.name,...(exercise?.aliases||[])].map(normalizeExerciseName).filter(Boolean);}
  function sameExercise(a,b){
    if(!a||!b)return false;if(a.exerciseId&&b.exerciseId&&a.exerciseId===b.exerciseId)return true;if(a.id&&b.id&&a.id===b.id)return true;
    const names=new Set(aliases(a));return aliases(b).some(name=>names.has(name));
  }
  function dedupe(exercises){const out=[];for(const exercise of exercises||[]){if(!out.some(item=>sameExercise(item,exercise)))out.push(exercise);}return out.map((exercise,index)=>({...exercise,order:index+1}));}
  function insert(exercises,exercise,afterId=''){
    const source=[...(exercises||[])];if(source.some(item=>sameExercise(item,exercise)))return {items:dedupe(source),inserted:false};
    const index=afterId?source.findIndex(item=>item.id===afterId||item.exerciseId===afterId):-1;source.splice(index>=0?index+1:source.length,0,exercise);return {items:dedupe(source),inserted:true,index:index>=0?index+1:source.length-1};
  }
  function dayKeyForDate(value){const [year,month,day]=String(value||'').slice(0,10).split('-').map(Number);return days[new Date(year||1970,(month||1)-1,day||1).getDay()];}
  function copyDay(plan,from,to){if(!plan?.[from]||!to)return plan;return {...plan,[to]:JSON.parse(JSON.stringify({...plan[from],dayKey:to}))};}
  window.WORKOUT_PLAN={normalizeText,normalizeExerciseName,aliases,sameExercise,dedupe,insert,dayKeyForDate,copyDay};
})();
