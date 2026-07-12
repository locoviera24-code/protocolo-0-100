(function(global){
  'use strict';

  const keys=Object.freeze({
    entries:'protocolo_0_100_nutrition_entries_v1',
    targets:'protocolo_0_100_nutrition_targets_v1',
    bodyMetrics:'protocolo_0_100_body_metrics_v1',
    customFoods:'protocolo_0_100_custom_foods_v1',
    aliases:'protocolo_0_100_nutrition_aliases_v1',
    profile:'protocolo_0_100_nutrition_profile_v1',
    savedMeals:'protocolo_0_100_saved_meals_v1',
    cachedFdcFoods:'protocolo_0_100_cached_fdc_foods_v1'
  });
  const defaults=Object.freeze({calories:2200,protein:140,carbs:250,fat:70,fiber:30,water:2500});
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function repository(){return global.APP_REPOSITORIES?.nutrition||null;}
  function read(key,fallback){
    const repo=repository();
    if(repo)return repo.get(key,fallback);
    if(global.APP_DATA)return global.APP_DATA.read(key,fallback);
    try{const value=JSON.parse(localStorage.getItem(key));return value??clone(fallback);}catch(error){return clone(fallback);}
  }
  function write(key,value){
    const repo=repository();
    if(repo)return repo.set(key,value);
    if(global.APP_DATA)return global.APP_DATA.write(key,value);
    localStorage.setItem(key,JSON.stringify(value));return value;
  }
  function entries(){const value=read(keys.entries,[]);return Array.isArray(value)?value:[];}
  function saveEntries(value){return write(keys.entries,Array.isArray(value)?value:[]);}
  function updateEntries(updater){const current=clone(entries()),next=updater(current);return saveEntries(Array.isArray(next)?next:current);}
  function addEntry(entry){updateEntries(value=>[...value,entry]);return entry;}
  function removeEntry(id){let removed=null;updateEntries(value=>value.filter(entry=>{if(entry.id===id){removed=entry;return false;}return true;}));return removed;}
  function targets(){return {...defaults,...read(keys.targets,{})};}
  function bodyMetrics(){const value=read(keys.bodyMetrics,{});return value&&typeof value==='object'?value:{};}
  function customFoods(){const value=read(keys.customFoods,[]);return Array.isArray(value)?value:[];}
  function savedMeals(){const value=read(keys.savedMeals,[]);return Array.isArray(value)?value:[];}
  function aliases(){const value=read(keys.aliases,{});return value&&typeof value==='object'?value:{};}

  global.NUTRITION_STORE=Object.freeze({keys,defaults,read,write,entries,saveEntries,updateEntries,addEntry,removeEntry,targets,saveTargets:value=>write(keys.targets,value),bodyMetrics,saveBodyMetrics:value=>write(keys.bodyMetrics,value),customFoods,saveCustomFoods:value=>write(keys.customFoods,value),savedMeals,saveSavedMeals:value=>write(keys.savedMeals,value),aliases,saveAliases:value=>write(keys.aliases,value)});
})(window);
