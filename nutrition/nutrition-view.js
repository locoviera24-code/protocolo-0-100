(function(global){
  'use strict';
  function dayModel(entries,date,targets={},metrics={}){const day=global.NUTRITION_MODEL.entriesForDate(entries,date),totals=global.NUTRITION_MODEL.totals(day);return{date,entries:day,groups:global.NUTRITION_MODEL.groupByMeal(day),totals,targets,water:Number(metrics?.water)||0,empty:day.length===0&&!Number(metrics?.water)};}
  function progressRows(day){return['calories','protein','fiber','water'].map(key=>{const value=key==='water'?day.water:day.totals[key]||0,target=Math.max(1,Number(day.targets[key])||1);return{key,value,target,pct:Math.min(100,Math.round(value/target*100)),over:value>target};});}
  global.NUTRITION_VIEW=Object.freeze({dayModel,progressRows});
})(window);
