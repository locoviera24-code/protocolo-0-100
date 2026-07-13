(function(global){
  'use strict';

  function normalize(value){return global.NUTRITION_MODEL?.normalizeText?.(value)||String(value||'').trim().toLowerCase();}
  function keyFor(food={}){return String(food.recipeId?`recipe:${food.recipeId}`:food.id||food.foodId||normalize(food.name));}
  function suggestedMeal(date=new Date()){
    const hour=date instanceof Date?date.getHours():new Date(date).getHours();
    if(hour<10)return'Desayuno';if(hour<14)return'Almuerzo';if(hour<18)return'Merienda';if(hour<22)return'Cena';return'Snack';
  }
  function record(profiles={},input={}){
    const key=String(input.key||keyFor(input.food||input));if(!key)return profiles;
    const current=profiles[key]||{key,foodId:input.foodId||input.food?.id||'',name:input.name||input.food?.name||'',count:0,favorite:false,combinations:[]};
    const amount=global.APP_NUMBERS?.parseOr?.(input.amount,100)??(Number(input.amount)||100),combination={amount:Math.max(0.01,amount),unit:String(input.unit||'g'),meal:String(input.meal||suggestedMeal()),date:String(input.date||''),usedAt:input.usedAt||new Date().toISOString()};
    const signature=`${combination.amount}|${combination.unit}|${combination.meal}`,combinations=[combination,...(current.combinations||[]).filter(item=>`${item.amount}|${item.unit}|${item.meal}`!==signature)].slice(0,3);
    return{...profiles,[key]:{...current,foodId:input.foodId||current.foodId,name:input.name||current.name,count:Number(current.count||0)+1,lastAmount:combination.amount,lastUnit:combination.unit,lastMeal:combination.meal,lastDate:combination.date,lastUsedAt:combination.usedAt,combinations}};
  }
  function profileFor(profiles={},food={}){return profiles[keyFor(food)]||null;}
  function suggestion(profiles={},food={},date=new Date()){const profile=profileFor(profiles,food);return profile?{amount:profile.lastAmount||100,unit:profile.lastUnit||'g',meal:profile.lastMeal||suggestedMeal(date),profile}:{amount:Number(food.portionGrams)||100,unit:'g',meal:suggestedMeal(date),profile:null};}
  function setFavorite(profiles={},food={},favorite=true){const key=keyFor(food),current=profiles[key]||{key,foodId:food.id||'',name:food.name||'',count:0,combinations:[]};return{...profiles,[key]:{...current,favorite:!!favorite}};}
  function favorites(profiles={}){return Object.values(profiles).filter(item=>item.favorite).sort((a,b)=>String(b.lastUsedAt||'').localeCompare(String(a.lastUsedAt||'')));}
  function frequent(profiles={},limit=8){return Object.values(profiles).filter(item=>item.count>0).sort((a,b)=>Number(b.count)-Number(a.count)||String(b.lastUsedAt||'').localeCompare(String(a.lastUsedAt||''))).slice(0,limit);}

  global.NUTRITION_PORTIONS=Object.freeze({keyFor,suggestedMeal,record,profileFor,suggestion,setFavorite,favorites,frequent});
})(window);
