(function(global){
  'use strict';

  let currentState=null;
  let initialized=false;

  function readWorkoutDraft(today){
    try{
      const raw=global.localStorage?.getItem(global.APP_DRAFTS?.STORAGE_KEY||'protocolo_0_100_drafts_v1');
      const items=Object.values(JSON.parse(raw||'{}')?.items||{});
      return items.some(item=>item?.domain==='gym-set'&&String(item?.payload?.date||'')===today);
    }catch(error){return false;}
  }

  function snapshot(){
    const features=global.WORKOUT_FEATURES,today=global.APP_DATES?.today?.()||new Date().toISOString().slice(0,10);
    const sessions=global.WORKOUT_STORE?.read?.(features?.keys?.workoutSessions,[])||[];
    const weeklyPlan=features?.getWeeklyWorkoutPlan?.()||{};
    return global.GYM_HOME_STATE.select({today,sessions,weeklyPlan,hasWorkoutDraft:readWorkoutDraft(today)});
  }

  function setText(id,value){const element=global.document?.getElementById(id);if(element)element.textContent=String(value??'');}
  function render(){
    const hero=global.document?.getElementById('gymHomeHero');if(!hero||!global.GYM_HOME_STATE||!global.WORKOUT_FEATURES)return null;
    currentState=snapshot();hero.dataset.gymHomeState=currentState.kind;
    setText('gymHomeTitle',currentState.title);setText('gymHomeDescription',currentState.description);setText('gymHomePrimaryAction',currentState.action.label);
    const facts=global.document?.getElementById('gymHomeFacts');
    if(facts){
      const items=[...currentState.facts];
      if(!items.length&&currentState.nextWorkout)items.push(`Próxima: ${currentState.nextWorkout.name}`);
      facts.replaceChildren(...items.slice(0,3).map(value=>{const item=global.document.createElement('li');item.textContent=value;return item;}));
      facts.hidden=items.length===0;
    }
    return currentState;
  }

  function navigate(route){global.APP_ROUTER?.navigate?.(route);}
  function runPrimaryAction(){
    const state=render();if(!state)return;
    if(state.action.id==='CONTINUE_WORKOUT'){
      if(typeof global.openQuickSetLogger==='function')global.openQuickSetLogger(state.exerciseId);
      else navigate({module:'gym',view:'train'});
      return;
    }
    if(state.action.id==='VIEW_PROGRESS'){navigate({module:'progress',view:'gym'});return;}
    if(state.action.id==='START_WORKOUT'){navigate({module:'gym',view:'train'});return;}
    navigate({module:'gym',view:'routine'});
  }

  function init(){
    if(initialized)return;initialized=true;
    global.document?.getElementById('gymHomePrimaryAction')?.addEventListener('click',runPrimaryAction);
    global.addEventListener?.('app-data-change',event=>{if(['workout','import'].includes(event.detail?.domain))render();});
    global.addEventListener?.('app-drafts-changed',render);
    global.addEventListener?.('app-time-context-changed',render);
    global.addEventListener?.('app-route-change',event=>{if(event.detail?.module==='home')render();});
    Promise.resolve(global.WORKOUT_FEATURES?.ready?.()).then(render).catch(error=>global.APP_ERROR_BOUNDARY?.record?.(error,{area:'gym-home'}));
  }

  global.GYM_HOME=Object.freeze({render,state:()=>currentState?{...currentState}:null});
  global.document?.readyState==='loading'?global.document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})(window);
