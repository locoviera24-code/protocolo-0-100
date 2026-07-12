(function(global){
  'use strict';
  const STEPS=Object.freeze(['search','food','amount','meal','review']);
  function create(initial={}){
    let state={step:'search',query:'',food:null,amount:100,unit:'g',meal:'Almuerzo',date:'',...initial};
    const api={state:()=>({...state}),set:patch=>{state={...state,...patch};return api;},go:step=>{if(STEPS.includes(step))state={...state,step};return api;},next:()=>{const index=STEPS.indexOf(state.step);if(index<STEPS.length-1)state={...state,step:STEPS[index+1]};return api;},back:()=>{const index=STEPS.indexOf(state.step);if(index>0)state={...state,step:STEPS[index-1]};return api;},review:()=>{if(!state.food)return null;const converted=global.NUTRITION_MODEL.amountToGrams(state.amount,state.unit,state.food);return{...state,grams:converted.grams,estimatedMeasure:converted.estimated,entry:global.NUTRITION_MODEL.buildEntry(state.food,converted.grams,state.meal,state.date)};}};return Object.freeze(api);
  }
  global.NUTRITION_ENTRY_FLOW=Object.freeze({STEPS,create});
})(window);
