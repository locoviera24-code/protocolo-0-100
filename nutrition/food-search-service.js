(function(global){
  'use strict';

  const MIN_REMOTE_QUERY=3;
  const STRONG_MATCH=.88;
  function model(){return global.NUTRITION_MODEL;}
  function normalize(value){return model()?.normalizeText?.(value)||String(value||'').trim().toLowerCase();}
  function parseQuery(value){
    const raw=String(value||'').trim().slice(0,120).replace(/[\r\n\t]+/g,' '),match=raw.match(/^([0-9][0-9.,]*)\s*(kg|g|gr|gramos?|ml|l|litros?|unidad(?:es)?|tazas?|cucharadas?|rebanadas?|latas?|porciones?)\s+(?:de\s+)?(.+)$/i);
    if(!match)return{raw,query:model()?.cleanQuery?.(raw)||normalize(raw),amount:null,unit:''};
    const amount=global.APP_NUMBERS?.parse?.(match[1]),unit=model()?.canonicalUnit?.(match[2])||'';
    return{raw,query:model()?.cleanQuery?.(match[3])||normalize(match[3]),amount:Number.isFinite(amount)?amount:null,unit};
  }
  function resultKey(item){
    const food=item?.food||item||{};
    if(food.recipeId)return`recipe:${food.recipeId}`;
    if(food.id&&!String(food.id).startsWith('fdc-'))return`food:${food.id}`;
    const name=normalize(food.name||food.description),brand=normalize(food.brandOwner||'');return`${name}|${brand}`;
  }
  function dedupeKey(item){const food=item?.food||item||{};return`${normalize(food.name||food.description)}|${normalize(food.brandOwner||'')}`;}
  function localResults(foods,query,limit=12){return global.NUTRITION_FOOD_SEARCH.rank(foods||[],query).slice(0,limit).map(item=>({kind:'local',id:resultKey(item.food),food:item.food,score:item.score}));}
  function needsExternal(parsed,local){
    if(parsed.query.length<MIN_REMOTE_QUERY)return false;
    const first=local[0],second=local[1];if(!first)return true;
    if(first.score>=.97)return false;
    const ambiguous=second&&first.score-second.score<.07;
    return first.score<STRONG_MATCH||ambiguous;
  }
  function dedupe(local,external){
    const seen=new Set(),output=[];
    [...local,...external].forEach(item=>{const key=dedupeKey(item);if(!key||seen.has(key))return;seen.add(key);output.push(item);});return output;
  }
  function create({provider=global.NUTRITION_EXTERNAL_PROVIDER,getFoods=()=>[],online=()=>global.navigator?.onLine!==false}={}){
    return Object.freeze({
      parseQuery,localResults,needsExternal,
      async search(value,{signal,limit=12}={}){
        const parsed=parseQuery(value),local=localResults(getFoods(),parsed.query,limit),shouldExpand=needsExternal(parsed,local);
        if(!shouldExpand)return{...parsed,results:local,local,external:[],externalState:'not-needed'};
        if(!online())return{...parsed,results:local,local,external:[],externalState:'offline'};
        if(!provider?.isAvailable?.())return{...parsed,results:local,local,external:[],externalState:'unavailable'};
        try{
          const external=await provider.search(parsed.query,{signal,limit:Math.min(8,limit)});
          return{...parsed,results:dedupe(local,external),local,external,externalState:external.length?'loaded':'empty'};
        }catch(error){if(error?.name==='AbortError')throw error;return{...parsed,results:local,local,external:[],externalState:'error'};}
      }
    });
  }
  function createController({service,delay=400,onStart=()=>{},onResult=()=>{},onError=()=>{}}={}){
    let timer=null,controller=null,generation=0;
    function cancel(){generation+=1;if(timer)clearTimeout(timer);timer=null;controller?.abort();controller=null;}
    function schedule(value){
      cancel();const current=generation,wait=Math.max(350,Math.min(500,Number(delay)||400));onStart(value);
      return new Promise(resolve=>{timer=setTimeout(async()=>{controller=new AbortController();try{const result=await service.search(value,{signal:controller.signal});if(current!==generation)return resolve(null);onResult(result);resolve(result);}catch(error){if(error?.name!=='AbortError'&&current===generation)onError(error);resolve(null);}},wait);});
    }
    return Object.freeze({schedule,cancel});
  }

  global.NUTRITION_FOOD_SEARCH_SERVICE=Object.freeze({MIN_REMOTE_QUERY,STRONG_MATCH,parseQuery,resultKey,dedupeKey,localResults,needsExternal,dedupe,create,createController});
})(window);
