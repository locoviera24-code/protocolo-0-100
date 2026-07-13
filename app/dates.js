(function(global){
  'use strict';

  const SELECTIONS_KEY='protocolo_0_100_manual_dates_v1';
  const SIGNAL_KEY='protocolo_0_100_time_signal_v1';
  const CHANNEL_NAME='protocolo-0-100-time-v1';
  const DATE_INPUT_IDS=new Set(['entryDate','gymDate','nutritionDate','partyWorkoutDateInput']);
  const automaticDispatch=new WeakSet();
  const instanceId=`dates-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let currentDate=dateKey(new Date());
  let currentZone=timeZone();
  let timer=0;
  let channel=null;
  let selections=readSelections();

  function pad(value){return String(value).padStart(2,'0');}
  function dateKey(value){const date=value instanceof Date?value:new Date(value);return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
  function timeZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'local';}catch(error){return'local';}}
  function readSelections(){try{const value=JSON.parse(global.localStorage?.getItem(SELECTIONS_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch(error){return{};}}
  function saveSelections(){try{global.localStorage?.setItem(SELECTIONS_KEY,JSON.stringify(selections));}catch(error){}}
  function markManual(id,value){if(!DATE_INPUT_IDS.has(id)||!value)return;selections[id]={value:String(value),manual:true,updatedAt:new Date().toISOString()};saveSelections();}
  function clearManual(id){delete selections[id];saveSelections();}
  function isManual(id){return !!selections[id]?.manual;}
  function dispatchChange(element,kind){
    automaticDispatch.add(element);
    element.dispatchEvent(new CustomEvent(kind,{bubbles:true,detail:{value:element.value}}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
    automaticDispatch.delete(element);
  }
  function updateAutomaticInputs(previous,next){
    DATE_INPUT_IDS.forEach(id=>{
      const input=global.document?.getElementById(id);if(!input||isManual(id))return;
      if(!input.value||input.value===previous){input.value=next;dispatchChange(input,'app-date-advanced');}
    });
  }
  function broadcast(detail){
    const message={...detail,source:instanceId,at:Date.now()};
    try{channel?.postMessage(message);}catch(error){}
    try{global.localStorage?.setItem(SIGNAL_KEY,JSON.stringify(message));}catch(error){}
  }
  function scheduleMidnight(){
    clearTimeout(timer);const now=new Date(),next=new Date(now);next.setHours(24,0,1,0);
    timer=setTimeout(()=>{checkNow();scheduleMidnight();},Math.max(1000,next.getTime()-now.getTime()));
  }
  function checkNow(value=new Date(),{remote=false}={}){
    const nextDate=dateKey(value),nextZone=timeZone(),dateChanged=nextDate!==currentDate,zoneChanged=nextZone!==currentZone;
    if(!dateChanged&&!zoneChanged)return{dateChanged:false,zoneChanged:false,date:currentDate,timeZone:currentZone};
    const previousDate=currentDate,previousZone=currentZone;currentDate=nextDate;currentZone=nextZone;
    if(dateChanged)updateAutomaticInputs(previousDate,nextDate);
    global.APP_DRAFTS?.flushAll?.();
    const detail={previousDate,date:nextDate,previousTimeZone:previousZone,timeZone:nextZone,dateChanged,zoneChanged};
    global.dispatchEvent?.(new CustomEvent('app-time-context-changed',{detail}));
    if(!remote)broadcast(detail);
    scheduleMidnight();return detail;
  }
  function restoreSelections(){
    selections=readSelections();
    DATE_INPUT_IDS.forEach(id=>{
      const saved=selections[id],input=global.document?.getElementById(id);
      if(saved?.manual&&saved.value&&input&&input.value!==saved.value){input.value=saved.value;dispatchChange(input,'app-date-selection-restored');}
    });
  }
  function receive(message){if(!message||message.source===instanceId)return;checkNow(new Date(),{remote:true});}
  function init(){
    if('BroadcastChannel'in global){try{channel=new BroadcastChannel(CHANNEL_NAME);channel.addEventListener('message',event=>receive(event.data));}catch(error){channel=null;}}
    global.document?.addEventListener?.('change',event=>{const target=event.target;if(target?.id&&DATE_INPUT_IDS.has(target.id)&&!automaticDispatch.has(target))markManual(target.id,target.value);},true);
    global.addEventListener?.('storage',event=>{if(event.key===SELECTIONS_KEY){selections=readSelections();restoreSelections();}if(event.key===SIGNAL_KEY){try{receive(event.newValue?JSON.parse(event.newValue):null);}catch(error){}}});
    global.document?.addEventListener?.('visibilitychange',()=>{if(global.document.visibilityState==='visible'){checkNow();restoreSelections();}});
    global.addEventListener?.('pageshow',()=>{checkNow();restoreSelections();});
    global.addEventListener?.('pagehide',()=>global.APP_DRAFTS?.flushAll?.());
    global.document?.readyState==='loading'?global.document.addEventListener('DOMContentLoaded',()=>setTimeout(restoreSelections,0),{once:true}):setTimeout(restoreSelections,0);
    scheduleMidnight();
  }

  global.APP_DATES=Object.freeze({today:()=>currentDate,timeZone:()=>currentZone,dateKey,checkNow,restoreSelections,markManual,clearManual,isManual,state:()=>({date:currentDate,timeZone:currentZone,selections:{...selections}})});
  init();
})(window);
