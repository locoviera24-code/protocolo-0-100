(function(global){
  'use strict';
  function recent(entries,limit=8){const seen=new Set(),items=[];[...(entries||[])].sort((a,b)=>String(b.savedAt||b.date).localeCompare(String(a.savedAt||a.date))).forEach(entry=>{const key=entry.foodId||global.NUTRITION_MODEL.normalizeText(entry.name);if(!key||seen.has(key))return;seen.add(key);items.push(entry);});return items.slice(0,limit);}
  function frequent(entries,limit=8){const counts=new Map();(entries||[]).forEach(entry=>{const key=entry.foodId||global.NUTRITION_MODEL.normalizeText(entry.name),current=counts.get(key)||{key,name:entry.name,foodId:entry.foodId||'',count:0,lastDate:''};current.count+=1;current.lastDate=String(entry.date)>current.lastDate?entry.date:current.lastDate;counts.set(key,current);});return[...counts.values()].sort((a,b)=>b.count-a.count||String(b.lastDate).localeCompare(String(a.lastDate))).slice(0,limit);}
  function meal(entries,date,mealName){return(entries||[]).filter(entry=>entry.date===date&&entry.meal===mealName);}
  function copy(items,date,mealName,{idFactory,now}={}){return(items||[]).map(item=>({...item,id:(idFactory||(()=>`food_${Date.now()}_${Math.random().toString(36).slice(2,8)}`))(),date,meal:mealName,savedAt:now||new Date().toISOString(),source:item.source||'comida copiada'}));}
  global.NUTRITION_MEAL_HISTORY=Object.freeze({recent,frequent,meal,copy});
})(window);
