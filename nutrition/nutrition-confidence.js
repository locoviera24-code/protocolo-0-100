(function(global){
  'use strict';
  const STATES=Object.freeze(['known','estimated','unknown','notReported','confirmedZero']);
  const CORE_KEYS=new Set(['calories','protein','carbs','fat']);
  function has(object,key){return Object.prototype.hasOwnProperty.call(object||{},key);}
  function normalizeState(value){return STATES.includes(value)?value:value==='not-reported'?'notReported':null;}
  function nutrientState(entry,key,food){
    const explicitlyReported=!Array.isArray(food?.reportedNutrients)||food.reportedNutrients.includes(key),explicit=normalizeState(entry?.nutrientStatus?.[key]);
    if(explicit){if(!explicitlyReported&&Number(entry?.nutrients?.[key])===0)return'unknown';return explicit==='known'&&Number(entry?.nutrients?.[key])===0?'confirmedZero':explicit;}
    if(CORE_KEYS.has(key)&&has(entry,key))return Number(entry[key])===0?'confirmedZero':'known';
    if(has(entry?.nutrients,key))return Number(entry.nutrients[key])===0?'confirmedZero':'known';
    const foodHasValue=explicitlyReported&&(has(food,key)||has(food?.nutrients,key)),raw=food?.[key]??food?.nutrients?.[key];
    if(!foodHasValue)return food?'unknown':'notReported';
    if(raw===null||raw===undefined||raw==='')return'unknown';
    if(Number(raw)===0)return'confirmedZero';
    return food?.confidence==='aproximado'?'estimated':'known';
  }
  function coverage(entries,keys,{foodResolver}={}){
    const list=Array.isArray(entries)?entries:[];
    const rows=(keys||[]).map(key=>{
      const counts=Object.fromEntries(STATES.map(state=>[state,0]));
      list.forEach(entry=>{const state=nutrientState(entry,key,foodResolver?.(entry));counts[state]+=1;});
      const evaluated=counts.known+counts.estimated+counts.confirmedZero,total=list.length,coveragePct=total?Math.round(evaluated/total*100):0;
      return{key,...counts,total,evaluated,coveragePct,confidence:confidenceFor(coveragePct)};
    });
    const total=rows.reduce((sum,row)=>sum+row.total,0),evaluated=rows.reduce((sum,row)=>sum+row.evaluated,0),coveragePct=total?Math.round(evaluated/total*100):0;
    return{rows,coveragePct,confidence:confidenceFor(coveragePct),sampleSize:list.length,counts:rows.reduce((sum,row)=>{STATES.forEach(state=>{sum[state]+=row[state];});return sum;},Object.fromEntries(STATES.map(state=>[state,0])))};
  }
  function confidenceFor(pct){return pct>=80?'high':pct>=55?'medium':pct>=30?'low':'insufficient';}
  function scorePresentation(score,confidence){
    if(!Number.isFinite(score)||confidence==='insufficient')return{kind:'none',score:null,range:null};
    if(confidence==='low')return{kind:'range',score:null,range:[Math.max(0,Math.round(score-10)),Math.min(100,Math.round(score+10))]};
    return{kind:'score',score:Math.round(score),range:null};
  }
  global.NUTRITION_CONFIDENCE=Object.freeze({STATES,nutrientState,coverage,confidenceFor,scorePresentation});
})(window);
