(function(global){
  'use strict';
  const MEALS=Object.freeze(['Desayuno','Almuerzo','Merienda','Cena','Snack','Post-entreno','Otros']);
  const GENERIC_UNITS=Object.freeze({unidad:100,taza:240,cucharada:15,cucharadita:5,scoop:30,rebanada:30,vaso:250,porcion:100,lata:120,botella:500});
  function number(value){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
  function round(value,digits=1){const factor=10**digits;return Math.round(number(value)*factor)/factor;}
  function normalizeText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
  function cleanQuery(value){return normalizeText(value).replace(/\b(?:aproximadamente|aprox|unos|unas|el|la|los|las|de|del)\b/g,' ').replace(/\b(?:a la plancha|al horno|hervido|hervida|frito|frita)\b/g,' ').replace(/\s+/g,' ').trim();}
  function canonicalUnit(value){
    const unit=normalizeText(value);
    if(/^(g|gr|gramo|gramos)$/.test(unit))return'g';if(/^(kg|kilo|kilos|kilogramo|kilogramos)$/.test(unit))return'kg';if(/^(ml|mililitro|mililitros)$/.test(unit))return'ml';if(/^(l|lt|lts|litro|litros)$/.test(unit))return'l';
    if(/^(unidad|unidades|ud|uds)$/.test(unit))return'unidad';if(/^taza/.test(unit))return'taza';if(/^cucharadita/.test(unit))return'cucharadita';if(/^cucharada/.test(unit))return'cucharada';if(/^(scoop|scoops|medida|medidas)$/.test(unit))return'scoop';if(/^(rebanada|rebanadas|rodaja|rodajas)$/.test(unit))return'rebanada';if(/^vaso/.test(unit))return'vaso';if(/^porcion/.test(unit))return'porcion';if(/^lata/.test(unit))return'lata';if(/^botella/.test(unit))return'botella';return'';
  }
  function amountToGrams(amount,unit,food={}){
    const value=Math.max(0,number(amount)),normalized=canonicalUnit(unit)||unit;
    if(normalized==='g')return{grams:value,estimated:false};if(normalized==='kg')return{grams:value*1000,estimated:false};
    if(normalized==='ml')return{grams:value,estimated:true};if(normalized==='l')return{grams:value*1000,estimated:true};
    const defined=number(food.units?.[normalized]);return{grams:value*(defined||GENERIC_UNITS[normalized]||1),estimated:!defined};
  }
  function nutrientValue(food,key){if(Array.isArray(food?.reportedNutrients)&&!food.reportedNutrients.includes(key))return null;const raw=food?.[key]??food?.nutrients?.[key];return raw===null||raw===undefined||raw===''?null:number(raw);}
  function buildEntry(food,grams,meal,date,{id,now,definitions}={}){
    const amount=Math.max(1,number(grams)||100),factor=amount/100,nutrients={},nutrientStatus={};
    Object.keys(definitions||global.NUTRIENT_DEFINITIONS||{}).forEach(key=>{
      if(['calories','protein','carbs','fat','water'].includes(key))return;
      const value=nutrientValue(food,key);nutrientStatus[key]=value===null?'unknown':food.confidence==='aproximado'?'estimated':'known';
      if(value!==null)nutrients[key]=round(value*factor,3);
    });
    return{id:id||`food_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,foodId:food.id||'',fdcId:food.fdcId||null,date,meal:MEALS.includes(meal)?meal:(meal==='Otro'?'Otros':'Otros'),name:String(food.name||'').trim(),grams:amount,calories:Math.round(number(food.calories)*factor),protein:round(number(food.protein)*factor),carbs:round(number(food.carbs)*factor),fat:round(number(food.fat)*factor),nutrients,nutrientStatus,source:food.source||'registro manual',sourceCitation:food.sourceCitation||'',savedAt:now||new Date().toISOString()};
  }
  function totals(entries){return(entries||[]).reduce((sum,entry)=>({calories:sum.calories+number(entry.calories),protein:sum.protein+number(entry.protein),carbs:sum.carbs+number(entry.carbs),fat:sum.fat+number(entry.fat),fiber:sum.fiber+number(entry.nutrients?.fiber)}),{calories:0,protein:0,carbs:0,fat:0,fiber:0});}
  function entriesForDate(entries,date){return(entries||[]).filter(entry=>entry.date===date);}
  function groupByMeal(entries){const groups=Object.fromEntries(MEALS.map(meal=>[meal,[]]));(entries||[]).forEach(entry=>{const meal=MEALS.includes(entry.meal)?entry.meal:(entry.meal==='Otro'?'Otros':'Otros');groups[meal].push(entry);});return groups;}
  global.NUTRITION_MODEL=Object.freeze({MEALS,GENERIC_UNITS,number,round,normalizeText,cleanQuery,canonicalUnit,amountToGrams,nutrientValue,buildEntry,totals,entriesForDate,groupByMeal});
})(window);
