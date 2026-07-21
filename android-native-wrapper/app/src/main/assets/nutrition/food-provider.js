(function(global){
  'use strict';

  const PROVIDER_ID='usda-fdc';
  function decorate(food,raw={}){
    if(!food)return null;
    const fetchedAt=food.fetchedAt||food.importedAt||new Date().toISOString();
    return {...food,provider:PROVIDER_ID,providerFoodId:String(food.fdcId||raw.fdcId||''),fetchedAt,nutritionSnapshot:{basisGrams:100,calories:food.calories,protein:food.protein,carbs:food.carbs,fat:food.fat,nutrients:{...(food.nutrients||{})},reportedNutrients:[...(food.reportedNutrients||[])]}};
  }
  function create(options={}){
    const source=()=>options.client||global.FDC_CLIENT;
    return Object.freeze({
      id:PROVIDER_ID,
      isAvailable(){return !!source()?.hasRemoteAccess?.();},
      health(){const client=source();return{available:!!client?.hasRemoteAccess?.(),mode:client?.config?.().backendUrl?'backend':client?.hasRemoteAccess?.()?'developer':'disabled'};},
      normalize(rawFood){return decorate(source()?.normalizeFood?.(rawFood),rawFood);},
      async search(query,{signal,limit=8,timeout=6500}={}){
        const client=source();if(!client?.hasRemoteAccess?.())return[];
        const response=await client.searchFoods(query,{pageNumber:1,pageSize:Math.max(10,Math.min(20,Number(limit)||8)),signal,timeout});
        return(response.foods||[]).slice(0,Math.max(1,Number(limit)||8)).map(raw=>({kind:'external',id:`${PROVIDER_ID}:${raw.fdcId}`,provider:PROVIDER_ID,providerFoodId:String(raw.fdcId),raw,food:decorate(client.normalizeFood?.(raw),raw)})).filter(item=>item.food);
      },
      async getFood(id,{raw,signal,timeout=6500}={}){
        const client=source();if(!client)throw new Error('EXTERNAL_PROVIDER_UNAVAILABLE');
        const food=decorate(await client.importFood(raw||id,{signal,timeout}),raw||{});client.upsertCachedFood?.(food);return food;
      }
    });
  }

  global.NutritionExternalProvider=create;
  global.NUTRITION_EXTERNAL_PROVIDER=create();
})(window);
