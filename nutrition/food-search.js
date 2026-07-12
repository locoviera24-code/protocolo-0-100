(function(global){
  'use strict';
  const model=()=>global.NUTRITION_MODEL;
  function editDistance(a,b){const row=Array.from({length:b.length+1},(_,index)=>index);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=old;}}return row[b.length];}
  function singular(value){return value.split(' ').map(token=>token.length>4&&token.endsWith('es')?token.slice(0,-2):token.length>3&&token.endsWith('s')?token.slice(0,-1):token).join(' ');}
  function similarity(a,b){if(!a||!b)return 0;if(a===b)return 1;const left=singular(a),right=singular(b);if(left===right)return.98;const at=new Set(left.split(' ')),bt=new Set(right.split(' ')),shared=[...at].filter(token=>bt.has(token)).length,tokenScore=shared/Math.max(at.size,bt.size),charScore=1-(editDistance(left,right)/Math.max(left.length,right.length)),contained=(left.includes(right)||right.includes(left))&&Math.min(left.length,right.length)>=4?.92:0;return Math.max(tokenScore*.88,charScore*.82,contained);}
  function searchable(food){return[food.name,...(food.aliases||[]),food.category,food.brandOwner].filter(Boolean);}
  function rank(foods,query){const needle=model().cleanQuery(query);return(foods||[]).map((food,index)=>({food,index,score:needle?Math.max(...searchable(food).map(value=>similarity(needle,model().cleanQuery(value)))):1})).filter(item=>!needle||item.score>=.35).sort((a,b)=>b.score-a.score||String(a.food.name).localeCompare(String(b.food.name),'es'));}
  function findBest(foods,value,learned={}){const needle=model().cleanQuery(value),learnedName=learned[needle];if(learnedName){const food=(foods||[]).find(item=>model().normalizeText(item.name)===model().normalizeText(learnedName));if(food)return{food,confidence:1,matchedAlias:needle,learned:true};}const best=rank(foods,needle)[0]||{food:null,score:0};return best.score>=.56?{food:best.food,confidence:best.score,matchedAlias:needle}:{food:null,confidence:best.score,matchedAlias:needle};}
  global.NUTRITION_FOOD_SEARCH=Object.freeze({editDistance,singular,similarity,rank,findBest});
})(window);
