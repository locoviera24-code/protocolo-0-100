(function(global){
  'use strict';

  const KINDS=Object.freeze({
    ACTIVE_SESSION:'ACTIVE_SESSION',
    COMPLETED_TODAY:'COMPLETED_TODAY',
    PLANNED_TODAY:'PLANNED_TODAY',
    REST_DAY:'REST_DAY',
    SETUP_REQUIRED:'SETUP_REQUIRED'
  });

  const ACTIONS=Object.freeze({
    CONTINUE_WORKOUT:'CONTINUE_WORKOUT',
    VIEW_PROGRESS:'VIEW_PROGRESS',
    START_WORKOUT:'START_WORKOUT',
    VIEW_NEXT_WORKOUT:'VIEW_NEXT_WORKOUT',
    CONFIGURE_WORKOUT:'CONFIGURE_WORKOUT'
  });

  const DAY_KEYS=Object.freeze(['sunday','monday','tuesday','wednesday','thursday','friday','saturday']);

  function array(value){return Array.isArray(value)?value:[];}
  function text(value,fallback=''){const normalized=String(value??'').trim();return normalized||fallback;}
  function dateParts(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!match)return null;
    const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
    return date.getFullYear()===Number(match[1])&&date.getMonth()===Number(match[2])-1&&date.getDate()===Number(match[3])?date:null;
  }
  function dateKey(date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function dayKey(value){const date=dateParts(value);return date?DAY_KEYS[date.getDay()]:'';}
  function sessionTime(session){return Date.parse(session?.finishedAt||session?.startedAt||session?.savedAt||'')||0;}
  function latest(items){return[...items].sort((left,right)=>sessionTime(right)-sessionTime(left))[0]||null;}
  function isActive(session){return text(session?.status).toLowerCase()==='en progreso';}
  function isCompleted(session){return text(session?.status).toLowerCase()==='finalizado'||Boolean(session?.finishedAt);}
  function validPlanDay(value){return value&&typeof value==='object'&&['workout','rest'].includes(value.type);}
  function workoutPlanDay(value){return validPlanDay(value)&&value.type==='workout'&&array(value.exercises).length>0;}
  function exerciseId(exercise){return text(exercise?.id||exercise?.exerciseId);}
  function currentExercise(session){
    const exercises=array(session?.exercises);
    if(!exercises.length)return null;
    const index=Number.isInteger(session?.currentExerciseIndex)?session.currentExerciseIndex:-1;
    return (exercises[index]&&typeof exercises[index]==='object'?exercises[index]:null)||exercises.find(exercise=>exercise&&typeof exercise==='object'&&exercise.completed!==true)||exercises.find(exercise=>exercise&&typeof exercise==='object')||null;
  }
  function effectiveSet(set){
    return set&&set.completed!==false&&set.excludeFromProgression!==true&&text(set.setType,'working')!=='warmup';
  }
  function sessionFacts(session){
    const exercises=array(session?.exercises),completedExercises=exercises.filter(exercise=>exercise?.completed===true).length;
    const effectiveSets=exercises.reduce((total,exercise)=>total+array(exercise?.sets).filter(effectiveSet).length,0);
    return{exerciseCount:exercises.length,completedExercises,effectiveSets};
  }
  function sessionName(session){return text(session?.routine?.name||session?.routineName||session?.name,'Entrenamiento');}
  function countLabel(count,singular,plural){return`${count} ${count===1?singular:plural}`;}
  function nextWorkout(weeklyPlan,today){
    const date=dateParts(today);if(!date)return null;
    for(let offset=1;offset<=7;offset+=1){
      const candidate=new Date(date);candidate.setDate(candidate.getDate()+offset);
      const key=DAY_KEYS[candidate.getDay()],plan=weeklyPlan?.[key];
      if(workoutPlanDay(plan))return{date:dateKey(candidate),dayKey:key,name:text(plan.name,'Entrenamiento'),exerciseCount:array(plan.exercises).length};
    }
    return null;
  }
  function base(kind,title,description,action,label){return{kind,title,description,action:Object.freeze({id:action,label}),facts:[],sessionId:'',exerciseId:'',nextWorkout:null,hasWorkoutDraft:false};}

  function select(input={}){
    const today=text(input.today),sessions=array(input.sessions),weeklyPlan=input.weeklyPlan&&typeof input.weeklyPlan==='object'?input.weeklyPlan:{};
    const todaySessions=sessions.filter(session=>text(session?.date)===today),active=latest(todaySessions.filter(isActive));
    if(active){
      const exercise=currentExercise(active),facts=sessionFacts(active),state=base(KINDS.ACTIVE_SESSION,'Tenés un entrenamiento en curso',exercise?`Ahora: ${text(exercise.name,'Ejercicio actual')}`:'Retomá donde lo dejaste.',ACTIONS.CONTINUE_WORKOUT,'Continuar entrenamiento');
      state.sessionId=text(active.id);state.exerciseId=exerciseId(exercise);state.hasWorkoutDraft=Boolean(input.hasWorkoutDraft);
      state.facts=[sessionName(active),`${facts.completedExercises} de ${facts.exerciseCount} ejercicios`,countLabel(facts.effectiveSets,'serie registrada','series registradas')];
      if(input.restTimer?.active===true)state.facts.push('Descanso activo');
      return state;
    }

    const completed=latest(todaySessions.filter(isCompleted));
    if(completed){
      const facts=sessionFacts(completed),state=base(KINDS.COMPLETED_TODAY,'Entrenamiento de hoy completado',sessionName(completed),ACTIONS.VIEW_PROGRESS,'Ver progreso');
      state.sessionId=text(completed.id);state.facts=[countLabel(facts.exerciseCount,'ejercicio','ejercicios'),countLabel(facts.effectiveSets,'serie efectiva','series efectivas')];state.nextWorkout=nextWorkout(weeklyPlan,today);
      return state;
    }

    const plan=weeklyPlan?.[dayKey(today)];
    if(workoutPlanDay(plan)){
      const count=array(plan.exercises).length,state=base(KINDS.PLANNED_TODAY,`Hoy te toca ${text(plan.name,'entrenar')}`,input.hasWorkoutDraft?'Tenés valores preparados para continuar.':`${count} ejercicio${count===1?'':'s'} en la rutina.`,ACTIONS.START_WORKOUT,'Empezar entrenamiento');
      state.hasWorkoutDraft=Boolean(input.hasWorkoutDraft);state.facts=array(plan.muscles).slice(0,2).map(muscle=>text(muscle)).filter(Boolean);
      return state;
    }

    if(validPlanDay(plan)&&plan.type==='rest'){
      const next=nextWorkout(weeklyPlan,today),state=base(KINDS.REST_DAY,'Hoy toca descanso',text(plan.description,'Recuperarte también forma parte del entrenamiento.'),ACTIONS.VIEW_NEXT_WORKOUT,'Ver próxima sesión');
      state.nextWorkout=next;if(next)state.facts=[`Próxima: ${next.name}`];return state;
    }

    const state=base(KINDS.SETUP_REQUIRED,'Prepará tu entrenamiento','La planificación disponible está incompleta. Revisala antes de empezar.',ACTIONS.CONFIGURE_WORKOUT,'Configurar entrenamiento');
    state.setupRequired=input.setupRequired===true||!validPlanDay(plan);return state;
  }

  global.GYM_HOME_STATE=Object.freeze({KINDS,ACTIONS,select});
})(window);
