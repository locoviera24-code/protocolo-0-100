(function(global){
  'use strict';
  function nutrientState(entry,key,food){if(entry?.nutrientStatus?.[key])return entry.nutrientStatus[key];if(Object.prototype.hasOwnProperty.call(entry?.nutrients||{},key))return'known';const raw=food?.[key]??food?.nutrients?.[key];if(raw===null||raw===undefined||raw==='')return'unknown';return food.confidence==='aproximado'?'estimated':'known';}
  function coverage(entries,keys,{foodResolver}={}){const rows=(keys||[]).map(key=>{const counts={known:0,estimated:0,unknown:0};(entries||[]).forEach(entry=>{const state=nutrientState(entry,key,foodResolver?.(entry));counts[state]=(counts[state]||0)+1;});const evaluated=counts.known+counts.estimated,total=entries?.length||0;return{key,...counts,total,evaluated,coveragePct:total?Math.round(evaluated/total*100):0};});const total=rows.reduce((sum,row)=>sum+row.total,0),evaluated=rows.reduce((sum,row)=>sum+row.evaluated,0),pct=total?Math.round(evaluated/total*100):0;return{rows,coveragePct:pct,confidence:pct>=80?'high':pct>=55?'medium':pct>=30?'low':'insufficient',sampleSize:entries?.length||0};}
  global.NUTRITION_CONFIDENCE=Object.freeze({nutrientState,coverage});
})(window);
