(function(){
  'use strict';

  const CACHE_KEY='protocolo_0_100_cached_fdc_foods_v1';
  const SEARCH_CACHE_KEY='protocolo_0_100_fdc_search_cache_v1';
  const CONFIG_KEY='protocolo_0_100_fdc_config_v1';
  const SOURCE='USDA FoodData Central';
  const CITATION='U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.';
  const DEFAULT_API_BASE='https://api.nal.usda.gov/fdc/v1';
  const MAX_CACHED_FOODS=750;
  const MAX_SEARCH_CACHE=40;
  const SEARCH_TTL_MS=24*60*60*1000;
  const pendingRequests=new Map();

  const NUTRIENT_MAP={
    calories:{ids:[1008,2047,2048],names:['energy'],unit:'kcal'},
    protein:{ids:[1003],names:['protein'],unit:'g'},
    fat:{ids:[1004],names:['total lipid fat'],unit:'g'},
    carbs:{ids:[1005,1050],names:['carbohydrate by difference','carbohydrate by summation'],unit:'g'},
    fiber:{ids:[1079],names:['fiber total dietary'],unit:'g'},
    sugar:{ids:[2000,1063],names:['total sugars','sugars total'],unit:'g'},
    sodium:{ids:[1093],names:['sodium na'],unit:'mg'},
    potassium:{ids:[1092],names:['potassium k'],unit:'mg'},
    calcium:{ids:[1087],names:['calcium ca'],unit:'mg'},
    iron:{ids:[1089],names:['iron fe'],unit:'mg'},
    magnesium:{ids:[1090],names:['magnesium mg'],unit:'mg'},
    zinc:{ids:[1095],names:['zinc zn'],unit:'mg'},
    phosphorus:{ids:[1091],names:['phosphorus p'],unit:'mg'},
    selenium:{ids:[1103],names:['selenium se'],unit:'mcg'},
    vitaminA:{ids:[1106],names:['vitamin a rae'],unit:'mcg'},
    vitaminC:{ids:[1162],names:['vitamin c total ascorbic acid'],unit:'mg'},
    vitaminD:{ids:[1114],names:['vitamin d d2 d3'],unit:'mcg'},
    vitaminE:{ids:[1109],names:['vitamin e alpha tocopherol'],unit:'mg'},
    vitaminK:{ids:[1185],names:['vitamin k phylloquinone'],unit:'mcg'},
    b1:{ids:[1165],names:['thiamin'],unit:'mg'},
    b2:{ids:[1166],names:['riboflavin'],unit:'mg'},
    b3:{ids:[1167],names:['niacin'],unit:'mg'},
    b6:{ids:[1175],names:['vitamin b 6'],unit:'mg'},
    b12:{ids:[1178],names:['vitamin b 12'],unit:'mcg'},
    folate:{ids:[1177],names:['folate total'],unit:'mcg'},
    choline:{ids:[1180],names:['choline total'],unit:'mg'},
    omega3:{ids:[],names:['fatty acids total n 3','pufa 18 3 n 3'],unit:'g'},
    omega6:{ids:[],names:['fatty acids total n 6','pufa 18 2 n 6'],unit:'g'}
  };

  function read(key,fallback){
    if(window.APP_DATA)return window.APP_DATA.read(key,fallback);
    try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch(e){return fallback}
  }
  function write(key,value){
    if(window.APP_DATA){window.APP_DATA.write(key,value);return true}
    try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}
  }
  function ready(){return window.APP_DATA?.ready?.()||Promise.resolve([]);}
  function normalizeText(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  function round(value,digits=3){
    const p=10**digits;
    return Math.round((Number(value)||0)*p)/p;
  }
  function config(){
    return {...{apiBase:DEFAULT_API_BASE,apiKey:'',backendUrl:'',pageSize:20},...read(CONFIG_KEY,{})};
  }
  function saveConfig(next){
    const current=config();
    const safe={
      apiBase:String(next.apiBase||current.apiBase||DEFAULT_API_BASE).replace(/\/+$/,''),
      apiKey:String(next.apiKey??current.apiKey??'').trim(),
      backendUrl:String(next.backendUrl??current.backendUrl??'').trim().replace(/\/+$/,''),
      pageSize:Math.min(30,Math.max(10,Number(next.pageSize)||20))
    };
    write(CONFIG_KEY,safe);
    return safe;
  }
  function publicConfig(){
    const value=config();
    return {...value,apiKeyConfigured:!!value.apiKey,apiKey:''};
  }
  function hasRemoteAccess(){
    const value=config();
    return !!(value.backendUrl||value.apiKey);
  }
  function cachedFoods(){
    return read(CACHE_KEY,[]).filter(food=>food&&food.fdcId);
  }
  function replaceCache(foods){
    const unique=new Map(),now=new Date().toISOString();
    (Array.isArray(foods)?foods:[]).forEach(food=>{if(food?.fdcId){const key=String(food.fdcId);if(unique.has(key))unique.delete(key);unique.set(key,{...food,cachedAt:food.cachedAt||food.fetchedAt||food.importedAt||now});}});
    const values=[...unique.values()].slice(-MAX_CACHED_FOODS);
    write(CACHE_KEY,values);
    return values;
  }
  function upsertCachedFood(food){
    if(!food?.fdcId)return null;
    const foods=cachedFoods(),index=foods.findIndex(item=>String(item.fdcId)===String(food.fdcId));
    const existing=index>=0?foods.splice(index,1)[0]:{},updated={...existing,...food,cachedAt:existing.cachedAt||food.cachedAt||food.fetchedAt||food.importedAt||new Date().toISOString(),lastAccessedAt:new Date().toISOString()};foods.push(updated);
    replaceCache(foods);
    return updated;
  }
  function updateCachedFood(id,updates){
    const foods=cachedFoods(),index=foods.findIndex(food=>food.id===id||String(food.fdcId)===String(id));
    if(index<0)return null;
    const original=foods[index],nutrients={...original.nutrients},reported=new Set(original.reportedNutrients||[]);
    Object.keys(nutrients).forEach(key=>{if(updates[key]!==undefined){nutrients[key]=Math.max(0,Number(updates[key])||0);reported.add(key);}});
    foods[index]={...original,...updates,nutrients,reportedNutrients:[...reported],editedAt:new Date().toISOString(),source:SOURCE};
    replaceCache(foods);
    return foods[index];
  }
  function removeCachedFood(id){
    return replaceCache(cachedFoods().filter(food=>food.id!==id&&String(food.fdcId)!==String(id)));
  }
  function nutrientRows(food){
    return (food?.foodNutrients||[]).map(item=>({
      id:Number(item?.nutrient?.id??item?.nutrientId??item?.id)||0,
      name:String((item?.nutrient?.name??item?.nutrientName??item?.name)||''),
      unit:String((item?.nutrient?.unitName??item?.unitName??item?.unit)||''),
      amount:Number(item?.amount??item?.value)
    })).filter(item=>Number.isFinite(item.amount));
  }
  function convertUnit(value,from,to){
    const source=String(from||'').toLowerCase().replace('µ','u'),target=String(to||'').toLowerCase().replace('µ','u');
    if(!source||source===target)return value;
    if(source==='ug'&&target==='mcg')return value;
    if(source==='mcg'&&target==='ug')return value;
    if(source==='g'&&target==='mg')return value*1000;
    if(source==='mg'&&target==='g')return value/1000;
    if((source==='ug'||source==='mcg')&&target==='mg')return value/1000;
    if(source==='mg'&&(target==='ug'||target==='mcg'))return value*1000;
    return 0;
  }
  function nutrientValue(rows,definition){
    let row=definition.ids.map(id=>rows.find(item=>item.id===id)).find(Boolean);
    if(!row){
      row=rows.find(item=>{
        const name=normalizeText(item.name);
        return definition.names.some(candidate=>name===candidate||name.includes(candidate));
      });
    }
    return row?round(convertUnit(row.amount,row.unit,definition.unit)):null;
  }
  function confidenceFor(dataType){
    if(['Foundation','SR Legacy'].includes(dataType))return 'alto';
    if(dataType==='Survey (FNDDS)')return 'medio';
    return 'aproximado';
  }
  function categoryFor(food){
    return String(food?.foodCategory?.description||food?.foodCategory||food?.brandedFoodCategory||food?.wweiaFoodCategory?.wweiaFoodCategoryDescription||'FDC importados');
  }
  function normalizedServing(food){
    const size=Number(food?.servingSize);
    const unit=String(food?.servingSizeUnit||'').toLowerCase();
    if(size>0&&unit==='g')return size;
    const portion=(food?.foodPortions||[]).find(item=>Number(item?.gramWeight)>0);
    return Number(portion?.gramWeight)||100;
  }
  function normalizeFood(food){
    if(!food?.fdcId||!food?.description)return null;
    const rows=nutrientRows(food),values={};
    Object.entries(NUTRIENT_MAP).forEach(([key,definition])=>{values[key]=nutrientValue(rows,definition)});
    const reportedNutrients=Object.entries(values).filter(([,value])=>value!==null).map(([key])=>key),compatibleValues=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value??0])),nutrients={...compatibleValues};
    delete nutrients.calories;delete nutrients.protein;delete nutrients.carbs;delete nutrients.fat;
    const description=String(food.description).trim(),brandOwner=String(food.brandOwner||food.brandName||'').trim();
    return {
      id:`fdc-${food.fdcId}`,fdcId:Number(food.fdcId),name:description,description,
      aliases:[description,brandOwner].filter(Boolean),category:categoryFor(food),portionGrams:normalizedServing(food),
      calories:compatibleValues.calories,protein:compatibleValues.protein,carbs:compatibleValues.carbs,fat:compatibleValues.fat,...nutrients,nutrients,reportedNutrients,
      units:{porcion:normalizedServing(food)},dataType:String(food.dataType||'FDC'),brandOwner,
      servingSize:Number(food.servingSize)||null,servingSizeUnit:String(food.servingSizeUnit||''),
      confidence:confidenceFor(food.dataType),source:SOURCE,sourceCitation:CITATION,
      importedAt:new Date().toISOString(),fdcImported:true,custom:true
    };
  }
  function searchCache(){
    return read(SEARCH_CACHE_KEY,{});
  }
  function cacheSearch(key,value){
    const cache=searchCache();
    cache[key]={...value,cachedAt:Date.now()};
    const keys=Object.keys(cache).sort((a,b)=>cache[b].cachedAt-cache[a].cachedAt);
    keys.slice(MAX_SEARCH_CACHE).forEach(oldKey=>delete cache[oldKey]);
    write(SEARCH_CACHE_KEY,cache);
  }
  function requestKey(type,value){return `${type}:${value}`}
  async function request(type,path,options={}){
    const cfg=config(),key=requestKey(type,path+JSON.stringify(options.body||{}));
    if(!options.signal&&pendingRequests.has(key))return pendingRequests.get(key);
    const operation=(async()=>{
      const controller=new AbortController(),timeout=Math.max(1000,Number(options.timeout)||8000),timer=setTimeout(()=>controller.abort(),timeout),abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)controller.abort();
      let url,requestOptions={method:options.method||'GET',headers:{'Content-Type':'application/json'},signal:controller.signal};
      if(cfg.backendUrl){
        // Future backend contract: expose the same /foods/search and /food/{fdcId} paths without returning the USDA key.
        url=`${cfg.backendUrl}${path}`;
      }else{
        if(!cfg.apiKey)throw new Error('FDC_NOT_CONFIGURED');
        url=`${cfg.apiBase}${path}${path.includes('?')?'&':'?'}api_key=${encodeURIComponent(cfg.apiKey)}`;
      }
      if(options.body)requestOptions.body=JSON.stringify(options.body);
      try{const response=await fetch(url,requestOptions);if(!response.ok){const error=new Error(response.status===429?'FDC_RATE_LIMIT':`FDC_HTTP_${response.status}`);error.status=response.status;throw error;}return response.json();}
      finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
    })();
    if(!options.signal)pendingRequests.set(key,operation);
    try{return await operation}finally{if(!options.signal)pendingRequests.delete(key)}
  }
  function summary(food){
    return {
      fdcId:Number(food.fdcId),description:String(food.description||''),dataType:String(food.dataType||''),
      brandOwner:String(food.brandOwner||food.brandName||''),foodCategory:String(food.foodCategory||''),
      servingSize:Number(food.servingSize)||null,servingSizeUnit:String(food.servingSizeUnit||''),
      foodNutrients:food.foodNutrients||[]
    };
  }
  async function searchFoods(query,{pageNumber=1,pageSize,signal,timeout}={}){
    const text=String(query||'').trim();
    if(text.length<2)return {foods:[],totalHits:0,currentPage:1,totalPages:0,source:'empty'};
    const size=Math.min(30,Math.max(10,Number(pageSize)||config().pageSize||20));
    const page=Math.max(1,Number(pageNumber)||1),cacheKey=`${normalizeText(text)}|${page}|${size}`;
    const cached=searchCache()[cacheKey];
    if(cached&&Date.now()-cached.cachedAt<SEARCH_TTL_MS)return {...cached,source:'request-cache'};
    const result=await request('search','/foods/search',{method:'POST',body:{query:text,pageSize:size,pageNumber:page},signal,timeout});
    const value={foods:(result.foods||[]).slice(0,size).map(summary),totalHits:Number(result.totalHits)||0,currentPage:Number(result.currentPage)||page,totalPages:Number(result.totalPages)||0};
    cacheSearch(cacheKey,value);
    return {...value,source:'remote'};
  }
  function findCachedByQuery(query,limit=20){
    const text=normalizeText(query);
    if(!text)return cachedFoods().slice(0,limit);
    return cachedFoods().filter(food=>normalizeText([food.name,food.description,food.brandOwner,...(food.aliases||[])].join(' ')).includes(text)).slice(0,limit);
  }
  async function hybridSearch(query,{localFoods=[],pageNumber=1,pageSize=20}={}){
    const text=normalizeText(query);
    const local=(localFoods||[]).filter(food=>normalizeText([food.name,...(food.aliases||[]),food.category].join(' ')).includes(text)).slice(0,pageSize);
    const cached=findCachedByQuery(query,pageSize);
    let remote={foods:[],totalHits:0,currentPage:pageNumber,totalPages:0,source:'not-configured'};
    if(hasRemoteAccess())remote=await searchFoods(query,{pageNumber,pageSize});
    return {local,cached,remote};
  }
  async function getFoodDetails(fdcId,options={}){
    const cached=cachedFoods().find(food=>String(food.fdcId)===String(fdcId));
    if(cached)return upsertCachedFood(cached);
    const data=await request('detail',`/food/${encodeURIComponent(fdcId)}`,options);
    return normalizeFood(data);
  }
  async function importFood(foodOrId,options={}){
    const fdcId=typeof foodOrId==='object'?foodOrId.fdcId:foodOrId;
    const cached=cachedFoods().find(food=>String(food.fdcId)===String(fdcId));
    if(cached)return upsertCachedFood(cached);
    let food=null;
    if(hasRemoteAccess()){
      try{food=await getFoodDetails(fdcId,options)}catch(error){if(typeof foodOrId!=='object')throw error}
    }
    food=food||normalizeFood(foodOrId);
    if(!food)throw new Error('FDC_INVALID_FOOD');
    return upsertCachedFood(food);
  }
  function datasetArray(data){
    if(Array.isArray(data))return data;
    for(const key of ['FoundationFoods','SRLegacyFoods','SurveyFoods','BrandedFoods','foods']){
      if(Array.isArray(data?.[key]))return data[key];
    }
    return [];
  }
  async function parseDataset(file,limit){
    const max=Math.min(MAX_CACHED_FOODS,Math.max(1,Number(limit)||250));
    if(typeof Worker!=='undefined'&&typeof URL!=='undefined'&&URL.createObjectURL){
      const workerCode=`self.onmessage=async e=>{try{const text=await e.data.file.text();const data=JSON.parse(text);let rows=Array.isArray(data)?data:[];for(const k of ['FoundationFoods','SRLegacyFoods','SurveyFoods','BrandedFoods','foods'])if(Array.isArray(data&&data[k])){rows=data[k];break}self.postMessage({rows:rows.slice(0,e.data.limit),total:rows.length})}catch(error){self.postMessage({error:error.message})}}`;
      const url=URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'}));
      try{return await new Promise((resolve,reject)=>{const worker=new Worker(url);worker.onmessage=event=>{worker.terminate();event.data.error?reject(new Error(event.data.error)):resolve(event.data)};worker.onerror=event=>{worker.terminate();reject(new Error(event.message))};worker.postMessage({file,limit:max})})}
      catch(error){/* Fallback below for WebViews without transferable File support. */}
      finally{URL.revokeObjectURL(url)}
    }
    await new Promise(resolve=>setTimeout(resolve,0));
    const data=JSON.parse(await file.text()),rows=datasetArray(data);
    return {rows:rows.slice(0,max),total:rows.length};
  }
  async function importDataset(file,{limit=250}={}){
    if(!file||!/\.json$/i.test(file.name||''))throw new Error('FDC_DATASET_JSON_REQUIRED');
    const parsed=await parseDataset(file,limit),normalized=parsed.rows.map(normalizeFood).filter(Boolean);
    const merged=replaceCache([...cachedFoods(),...normalized]);
    return {imported:normalized.length,totalInDataset:parsed.total,cached:merged.length};
  }

  window.FDC_CLIENT={
    CACHE_KEY,SEARCH_CACHE_KEY,CONFIG_KEY,SOURCE,CITATION,NUTRIENT_MAP,MAX_CACHED_FOODS,MAX_SEARCH_CACHE,SEARCH_TTL_MS,ready,config,publicConfig,saveConfig,hasRemoteAccess,
    cachedFoods,cachedFdcFoods:cachedFoods,replaceCache,upsertCachedFood,updateCachedFood,removeCachedFood,normalizeFood,
    findCachedByQuery,hybridSearch,searchFoods,getFoodDetails,importFood,importDataset
  };
})();
