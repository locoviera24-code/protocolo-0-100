(function(global){
  'use strict';

  const CONFIDENCE_ORDER=Object.freeze({desconocido:0,aproximado:1,medio:2,alto:3});
  const TEMPLATES=Object.freeze([
    {id:'guiso',name:'Guiso',ingredients:['carne o legumbre','arroz o fideo','verduras']},
    {id:'tortilla',name:'Tortilla',ingredients:['huevo','verduras o papa','aceite']},
    {id:'tarta',name:'Tarta',ingredients:['masa','relleno','queso o huevo']},
    {id:'rapidita',name:'Rapidita',ingredients:['tortilla','proteina','verduras']},
    {id:'sandwich',name:'Sandwich',ingredients:['pan','proteina','verduras o queso']},
    {id:'licuado',name:'Licuado',ingredients:['leche o yogur','fruta','avena opcional']}
  ]);
  const CORE_KEYS=Object.freeze(['calories','protein','carbs','fat']);

  function number(value){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
  function round(value,digits=3){const factor=10**digits;return Math.round(number(value)*factor)/factor;}
  function uid(){return`recipe_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;}
  function normalizeConfidence(value){const key=String(value||'').toLowerCase();return Object.prototype.hasOwnProperty.call(CONFIDENCE_ORDER,key)?key:'desconocido';}
  function snapshotFood(food={}){
    const nutrientKeys=new Set([...(food.reportedNutrients||[]),...Object.keys(food.nutrients||{})]);
    const nutrients={};nutrientKeys.forEach(key=>{const value=food[key]??food.nutrients?.[key];if(value!==null&&value!==undefined&&value!=='')nutrients[key]=number(value);});
    return{foodId:String(food.id||food.foodId||''),nameSnapshot:String(food.name||'Ingrediente').trim(),calories:number(food.calories),protein:number(food.protein),carbs:number(food.carbs),fat:number(food.fat),nutrients,reportedNutrients:[...nutrientKeys],confidence:normalizeConfidence(food.confidence||'desconocido'),source:String(food.source||'snapshot local')};
  }
  function normalizeIngredient(input={}){
    const snapshot=input.nutritionSnapshot||snapshotFood(input.food||input),amount=Math.max(0.01,number(input.amount)||number(input.grams)||100),unit=global.NUTRITION_MODEL?.canonicalUnit?.(input.unit)||input.unit||'g';
    const converted=global.NUTRITION_MODEL?.amountToGrams?.(amount,unit,input.food||input)||{grams:number(input.grams)||amount,estimated:unit!=='g'};
    return{id:String(input.id||`ingredient_${Date.now()}_${Math.random().toString(36).slice(2,7)}`),foodId:String(input.foodId||input.food?.id||snapshot.foodId||''),nameSnapshot:String(input.nameSnapshot||input.food?.name||snapshot.nameSnapshot||'Ingrediente').trim(),amount:round(amount,2),unit:String(unit),grams:round(input.grams||converted.grams,2),estimatedMeasure:input.estimatedMeasure??converted.estimated,nutritionSnapshot:snapshot};
  }
  function totalsForIngredients(ingredients=[]){
    const total={calories:0,protein:0,carbs:0,fat:0,nutrients:{},reportedNutrients:[]};const reported=new Set();
    ingredients.forEach(raw=>{const ingredient=normalizeIngredient(raw),factor=ingredient.grams/100,snapshot=ingredient.nutritionSnapshot||{};CORE_KEYS.forEach(key=>{total[key]+=number(snapshot[key])*factor;});Object.entries(snapshot.nutrients||{}).forEach(([key,value])=>{total.nutrients[key]=(total.nutrients[key]||0)+number(value)*factor;reported.add(key);});});
    CORE_KEYS.forEach(key=>{total[key]=round(total[key],2);});Object.keys(total.nutrients).forEach(key=>{total.nutrients[key]=round(total.nutrients[key],3);});total.reportedNutrients=[...reported];return total;
  }
  function lowestConfidence(ingredients=[]){
    if(!ingredients.length)return'desconocido';
    return ingredients.map(item=>normalizeConfidence(item.nutritionSnapshot?.confidence)).sort((a,b)=>CONFIDENCE_ORDER[a]-CONFIDENCE_ORDER[b])[0]||'desconocido';
  }
  function build(input={},existing=null){
    const ingredients=(input.ingredients||existing?.ingredients||[]).map(normalizeIngredient),totalWeightGrams=Math.max(1,number(input.totalWeightGrams)||ingredients.reduce((sum,item)=>sum+item.grams,0)),servings=Math.max(1,number(input.servings)||number(existing?.servings)||1),servingWeightGrams=Math.max(1,number(input.servingWeightGrams)||totalWeightGrams/servings),totalNutrition=totalsForIngredients(ingredients),factor=servingWeightGrams/totalWeightGrams;
    const nutritionPerServing={calories:round(totalNutrition.calories*factor,2),protein:round(totalNutrition.protein*factor,2),carbs:round(totalNutrition.carbs*factor,2),fat:round(totalNutrition.fat*factor,2),nutrients:Object.fromEntries(Object.entries(totalNutrition.nutrients).map(([key,value])=>[key,round(value*factor,3)]))};
    const now=new Date().toISOString();
    return{id:String(input.id||existing?.id||uid()),name:String(input.name??existing?.name??'').trim().slice(0,120),ingredients,totalWeightGrams:round(totalWeightGrams,2),servings:round(servings,2),servingWeightGrams:round(servingWeightGrams,2),totalNutrition,nutritionPerServing,confidence:normalizeConfidence(input.confidence||lowestConfidence(ingredients)),source:String(input.source||existing?.source||'receta propia').slice(0,160),archived:!!(input.archived??existing?.archived),createdAt:existing?.createdAt||input.createdAt||now,updatedAt:now};
  }
  function validate(recipe){const errors=[];if(!String(recipe?.name||'').trim())errors.push('Escribí un nombre.');if(!Array.isArray(recipe?.ingredients)||!recipe.ingredients.length)errors.push('Agregá al menos un ingrediente.');if(!(number(recipe?.totalWeightGrams)>0))errors.push('El peso total debe ser mayor que cero.');if(!(number(recipe?.servings)>0))errors.push('Las porciones deben ser mayores que cero.');return{ok:errors.length===0,errors};}
  function toFood(recipe){
    const weight=Math.max(1,number(recipe.totalWeightGrams)),factor=100/weight,total=recipe.totalNutrition||totalsForIngredients(recipe.ingredients),nutrients=Object.fromEntries(Object.entries(total.nutrients||{}).map(([key,value])=>[key,round(number(value)*factor,3)]));
    return{id:`recipe:${recipe.id}`,recipeId:recipe.id,name:recipe.name,aliases:[recipe.name],category:'recetas',portionGrams:number(recipe.servingWeightGrams)||weight,units:{porcion:number(recipe.servingWeightGrams)||weight},calories:number(total.calories)*factor,protein:number(total.protein)*factor,carbs:number(total.carbs)*factor,fat:number(total.fat)*factor,...nutrients,nutrients,reportedNutrients:Object.keys(nutrients),confidence:recipe.confidence,source:recipe.source||'receta propia',recipeSnapshot:snapshot(recipe)};
  }
  function snapshot(recipe){return{id:recipe.id,name:recipe.name,ingredients:(recipe.ingredients||[]).map(item=>({foodId:item.foodId,nameSnapshot:item.nameSnapshot,amount:item.amount,unit:item.unit,grams:item.grams,nutritionSnapshot:item.nutritionSnapshot})),totalWeightGrams:recipe.totalWeightGrams,servings:recipe.servings,servingWeightGrams:recipe.servingWeightGrams,totalNutrition:recipe.totalNutrition,nutritionPerServing:recipe.nutritionPerServing,confidence:recipe.confidence,source:recipe.source,updatedAt:recipe.updatedAt};}
  function duplicate(recipe){return build({...recipe,id:uid(),name:`${recipe.name} (copia)`,archived:false,createdAt:'',updatedAt:''},null);}

  global.NUTRITION_RECIPES=Object.freeze({TEMPLATES,CONFIDENCE_ORDER,snapshotFood,normalizeIngredient,totalsForIngredients,build,validate,toFood,snapshot,duplicate});
})(window);
