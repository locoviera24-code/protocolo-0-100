(function(){
  'use strict';

  const STORAGE_KEY='protocolo_0_100_exercise_preferences_v1';
  const SCHEMA_VERSION=1;
  const MAX_EVENTS=160;
  const GROUPS=[
    ['today','Rutina de hoy'],
    ['weekday','Frecuentes de este dia'],
    ['recent','Recientes'],
    ['favorites','Favoritos'],
    ['all','Todos los ejercicios']
  ];

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function normalize(value){ return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function dateFromString(value){ const [y,m,d]=String(value||'').slice(0,10).split('-').map(Number); return new Date(y||1970,(m||1)-1,d||1); }
  function dayKeyForDate(value){ return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][dateFromString(value).getDay()]; }
  function read(){
    if(window.APP_DATA){
      const value=window.APP_DATA.read(STORAGE_KEY,null);
      if(value?.schemaVersion===SCHEMA_VERSION && value.exercises && typeof value.exercises==='object') return value;
      return {schemaVersion:SCHEMA_VERSION,exercises:{},updatedAt:null};
    }
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(raw?.schemaVersion===SCHEMA_VERSION && raw.exercises && typeof raw.exercises==='object') return raw;
    }catch(error){}
    return {schemaVersion:SCHEMA_VERSION,exercises:{},updatedAt:null};
  }
  function write(value){
    const next={schemaVersion:SCHEMA_VERSION,exercises:value?.exercises||{},updatedAt:new Date().toISOString()};
    if(window.APP_DATA)window.APP_DATA.write(STORAGE_KEY,next);
    else localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    return next;
  }
  function exerciseIdOf(exercise){ return String(exercise?.exerciseId||exercise?.id||'').trim(); }
  function namesOf(exercise){ return [exercise?.name,...(exercise?.aliases||[])].map(normalize).filter(Boolean); }
  function recordExerciseUse({exerciseId,date,dayKey,routineName,lastPosition}={}){
    const id=String(exerciseId||'').trim();
    if(!id) return null;
    const state=read();
    const current=state.exercises[id]||{exerciseId:id,totalUses:0,usesByWeekday:{},usesByRoutine:{},useEvents:[],favorite:false,hidden:false};
    const usedDate=String(date||new Date().toISOString().slice(0,10)).slice(0,10);
    const weekday=dayKey||dayKeyForDate(usedDate);
    const routine=String(routineName||'Entrenamiento').trim().slice(0,80);
    const now=new Date().toISOString();
    current.totalUses=(Number(current.totalUses)||0)+1;
    current.usesByWeekday={...(current.usesByWeekday||{}),[weekday]:(Number(current.usesByWeekday?.[weekday])||0)+1};
    current.usesByRoutine={...(current.usesByRoutine||{}),[routine]:(Number(current.usesByRoutine?.[routine])||0)+1};
    current.lastUsedAt=now;
    current.lastUsedDate=usedDate;
    if(Number.isFinite(Number(lastPosition))) current.lastPosition=Number(lastPosition);
    current.useEvents=[...(current.useEvents||[]),{date:usedDate,dayKey:weekday,routineName:routine,usedAt:now}].slice(-MAX_EVENTS);
    state.exercises[id]=current;
    write(state);
    return clone(current);
  }
  function setExercisePreference(exerciseId,patch={}){
    const id=String(exerciseId||'').trim();
    if(!id) return null;
    const state=read();
    state.exercises[id]={exerciseId:id,totalUses:0,usesByWeekday:{},usesByRoutine:{},useEvents:[],favorite:false,hidden:false,...(state.exercises[id]||{}),...patch};
    write(state);
    return clone(state.exercises[id]);
  }
  function recentEventCount(pref,date,weeks=12){
    const end=dateFromString(date);
    const start=new Date(end); start.setDate(start.getDate()-weeks*7);
    return (pref?.useEvents||[]).filter(event=>{const used=dateFromString(event.date);return used>=start&&used<=end;}).length;
  }
  function recencyScore(pref,date){
    if(!pref?.lastUsedDate) return 0;
    const days=Math.max(0,Math.round((dateFromString(date)-dateFromString(pref.lastUsedDate))/86400000));
    return Math.max(0,20-Math.min(20,days));
  }
  function mergeExercises(currentPlan,library){
    const map=new Map();
    [...(currentPlan?.exercises||[]),...(library||[])].forEach((exercise,index)=>{
      const id=exerciseIdOf(exercise);
      if(!id) return;
      const previous=map.get(id)||{};
      map.set(id,{...exercise,...previous,exerciseId:id,_libraryIndex:index});
    });
    return [...map.values()];
  }
  function rankExercisesForContext({date,dayKey,routineName,currentPlan,query,library}={}){
    const reference=String(date||new Date().toISOString().slice(0,10)).slice(0,10);
    const weekday=dayKey||dayKeyForDate(reference);
    const normalizedQuery=normalize(query);
    const state=read();
    const planOrder=new Map((currentPlan?.exercises||[]).map((exercise,index)=>[exerciseIdOf(exercise),index]));
    const rows=mergeExercises(currentPlan,library).filter(exercise=>{
      const pref=state.exercises[exercise.exerciseId]||{};
      if(pref.hidden && !planOrder.has(exercise.exerciseId)) return false;
      if(!normalizedQuery) return true;
      return namesOf(exercise).some(name=>name.includes(normalizedQuery));
    }).map(exercise=>{
      const pref=state.exercises[exercise.exerciseId]||{};
      const inPlan=planOrder.has(exercise.exerciseId);
      const weekdayUses=Number(pref.usesByWeekday?.[weekday])||0;
      const routineUses=Number(pref.usesByRoutine?.[routineName])||0;
      const recentUses=recentEventCount(pref,reference,12);
      const queryMatch=normalizedQuery?Math.max(0,...namesOf(exercise).map(name=>name===normalizedQuery?80:name.startsWith(normalizedQuery)?55:name.includes(normalizedQuery)?35:0)):0;
      const score=(inPlan?1000-Math.min(100,planOrder.get(exercise.exerciseId)):0)+(weekdayUses*32)+(routineUses*10)+(recentUses*8)+recencyScore(pref,reference)+(pref.favorite?120:0)+queryMatch;
      return {...exercise,preference:clone(pref),inCurrentPlan:inPlan,weekdayUses,recentUses,score,manualOrder:planOrder.get(exercise.exerciseId)??999};
    }).sort((a,b)=>b.score-a.score||a.manualOrder-b.manualOrder||String(a.name||'').localeCompare(String(b.name||'')));

    const claimed=new Set();
    const take=predicate=>rows.filter(row=>!claimed.has(row.exerciseId)&&predicate(row)).map(row=>{claimed.add(row.exerciseId);return row;});
    const grouped={
      today:take(row=>row.inCurrentPlan),
      weekday:take(row=>row.weekdayUses>0),
      recent:take(row=>row.recentUses>0),
      favorites:take(row=>!!row.preference.favorite),
      all:take(()=>true)
    };
    return {schemaVersion:SCHEMA_VERSION,date:reference,dayKey:weekday,routineName:routineName||currentPlan?.name||'',query:normalizedQuery,items:rows,groups:GROUPS.map(([id,label])=>({id,label,items:grouped[id]})).filter(group=>group.items.length)};
  }

  window.WORKOUT_RANKING={STORAGE_KEY,SCHEMA_VERSION,read:()=>clone(read()),recordExerciseUse,setExercisePreference,rankExercisesForContext,normalize};
})();
