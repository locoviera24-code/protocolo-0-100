(function(){
  'use strict';

  const APP_VERSION='2.3.1';
  const APP_STATE_KEY='protocolo_0_100_state_v2';
  const SAVED_MEALS_KEY='protocolo_0_100_saved_meals_v1';
  const NUTRITION_PROFILE_KEY='protocolo_0_100_nutrition_profile_v1';
  const REFERRAL_CODES_KEY='protocolo_0_100_referral_codes_v1';
  const USER_REFERRAL_KEY='protocolo_0_100_user_referral_v1';
  const COIN_LEDGER_KEY='protocolo_0_100_coin_ledger_v1';
  const RANKING_SETTINGS_KEY='protocolo_0_100_ranking_settings_v1';
  const MONTHLY_RANKINGS_KEY='protocolo_0_100_monthly_rankings_v1';
  const REWARDS_KEY='protocolo_0_100_rewards_v1';
  const FDC=window.FDC_CLIENT||null;
  const DEFINITIONS=window.NUTRIENT_DEFINITIONS||{};
  const PRIMARY_COVERAGE=['calories','protein','carbs','fat','fiber','water','sodium','potassium','calcium','iron','magnesium','zinc','vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','b12','folate'];
  const EXTENDED_COVERAGE=['phosphorus','selenium','b1','b2','b3','b6','choline','omega3','omega6'];
  const TARGET_DOM={
    calories:'targetCalories',protein:'targetProtein',carbs:'targetCarbs',fat:'targetFat',
    fiber:'targetFiber',water:'targetWater',sodium:'targetSodium',potassium:'targetPotassium',
    calcium:'targetCalcium',iron:'targetIron',magnesium:'targetMagnesium',zinc:'targetZinc',
    vitaminA:'targetVitaminA',vitaminC:'targetVitaminC',vitaminD:'targetVitaminD',
    vitaminE:'targetVitaminE',vitaminK:'targetVitaminK',b12:'targetB12',folate:'targetFolate'
  };
  const DEFAULT_REFERRALS=[
    {code:'FOCUS10',name:'Comunidad Focus',discountPct:10,commissionPct:10,expires:'2030-12-31',active:true,mockUsers:18,mockConversions:6},
    {code:'PARAGUAY10',name:'Comunidad Paraguay',discountPct:10,commissionPct:10,expires:'2030-12-31',active:true,mockUsers:12,mockConversions:4},
    {code:'RESET15',name:'Reto Reinicio',discountPct:15,commissionPct:10,expires:'2030-12-31',active:true,mockUsers:25,mockConversions:8}
  ];
  // Future API: replace referral, ranking and reward local reads with authenticated backend endpoints.
  const SUGGESTION_LABELS={
    protein:'Proteína',fiber:'Fibra',potassium:'Potasio',calcium:'Calcio',iron:'Hierro',
    magnesium:'Magnesio',zinc:'Zinc',vitaminA:'Vitamina A',vitaminC:'Vitamina C',
    vitaminD:'Vitamina D',vitaminE:'Vitamina E',vitaminK:'Vitamina K',b12:'Vitamina B12',
    folate:'Folato',omega3:'Omega 3'
  };
  const SPECIFIC_SUGGESTIONS={
    protein:'huevo, pollo, carne magra, yogur, atún o legumbres',
    fiber:'avena, poroto, lenteja, fruta o verduras',
    potassium:'banana, papa, poroto, verduras o frutas',
    calcium:'leche, yogur, queso, sardina o tofu',
    iron:'lenteja, poroto, carne magra, soja o espinaca',
    magnesium:'avena, poroto, maní, almendras o espinaca',
    zinc:'carne magra, huevo, lácteos, legumbres o frutos secos',
    vitaminA:'zanahoria, batata, espinaca, huevo o lácteos',
    vitaminC:'naranja, frutilla, locote o brócoli',
    vitaminD:'salmón, sardina, huevo o alimentos fortificados',
    vitaminE:'almendras, maní, palta, aceite de oliva o espinaca',
    vitaminK:'espinaca, lechuga o brócoli',
    b12:'pescado, carne, huevo o lácteos',
    folate:'lenteja, poroto, garbanzo, espinaca o palta',
    omega3:'sardina, salmón o nueces'
  };
  let fdcSearchPage=1;
  let fdcLastSearch={query:'',local:[],cached:[],remote:{foods:[],totalHits:0,currentPage:1,totalPages:0,source:'empty'}};

  function round(value,digits=1){
    const p=10**digits;
    return Math.round((Number(value)||0)*p)/p;
  }
  function safeArray(value){ return Array.isArray(value)?value:[]; }
  function foodNutrient(food,key){ return Number(food?.[key] ?? food?.nutrients?.[key] ?? 0)||0; }
  function allDefinedFoods(){ return allFoods().filter(f=>f && f.id!=='select' && f.name!=='Seleccionar alimento…'); }
  function foodForEntry(entry){
    const foods=allDefinedFoods();
    if(entry.foodId){
      const byId=foods.find(f=>f.id===entry.foodId);
      if(byId) return byId;
    }
    const key=normalizeFoodText(entry.name);
    return foods.find(f=>normalizeFoodText(f.name)===key || (f.aliases||[]).some(a=>normalizeFoodText(a)===key))||null;
  }
  function defaultTargets(){
    return Object.fromEntries(Object.entries(DEFINITIONS).map(([key,definition])=>[key,definition.target]));
  }
  function advancedTargets(){ return {...defaultTargets(),...getLocalData(NUTRITION_TARGETS_KEY,{})}; }
  function nutritionProfile(){ return {...{age:'',sex:'',height:'',goal:'health'},...getLocalData(NUTRITION_PROFILE_KEY,{})}; }
  function dateMetrics(date){ return getLocalData(BODY_METRICS_KEY,{})[date]||{}; }
  function entriesForDate(date){ return getLocalData(NUTRITION_ENTRIES_KEY,[]).filter(e=>e.date===date); }
  function nutrientTotalsForEntries(entries,metrics={}){
    const totals=Object.fromEntries(Object.keys(DEFINITIONS).map(key=>[key,0]));
    entries.forEach(entry=>{
      totals.calories+=(Number(entry.calories)||0);
      totals.protein+=(Number(entry.protein)||0);
      totals.carbs+=(Number(entry.carbs)||0);
      totals.fat+=(Number(entry.fat)||0);
      const food=foodForEntry(entry);
      const factor=(Number(entry.grams)||100)/100;
      Object.keys(DEFINITIONS).forEach(key=>{
        if(['calories','protein','carbs','fat','water'].includes(key)) return;
        if(entry.nutrients && Number.isFinite(Number(entry.nutrients[key]))) totals[key]+=Number(entry.nutrients[key]);
        else totals[key]+=foodNutrient(food,key)*factor;
      });
    });
    totals.water=Number(metrics.water)||0;
    return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,round(value,2)]));
  }
  function nutrientTotalsForDate(date){ return nutrientTotalsForEntries(entriesForDate(date),dateMetrics(date)); }
  function coverageState(key,value,target){
    const definition=DEFINITIONS[key]||{};
    const pct=target>0?(value/target)*100:0;
    if(definition.kind==='limit'){
      if(pct>110) return {key:'review',label:'Revisar',pct};
      if(pct>85) return {key:'high',label:'Cerca del límite',pct};
      return {key:'good',label:'Dentro del límite',pct};
    }
    if(pct<70) return {key:'low',label:'Bajo',pct};
    if(pct<=120) return {key:'good',label:'Adecuado',pct};
    return {key:'high',label:'Alto',pct};
  }
  function displayNutrient(key,value){
    const definition=DEFINITIONS[key]||{unit:''};
    const digits=Math.abs(value)>=100?0:1;
    return `${round(value,digits)} ${definition.unit}`;
  }
  function nutritionScoreForDate(date){
    const entries=entriesForDate(date), metrics=dateMetrics(date);
    if(!entries.length && !Number(metrics.water)) return 0;
    const totals=nutrientTotalsForEntries(entries,metrics), targets=advancedTargets();
    const keys=['protein','fiber','potassium','calcium','iron','magnesium','zinc','vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','b12','folate','water'];
    const coverage=keys.map(key=>Math.min(100,(totals[key]/Math.max(1,targets[key]))*100));
    let score=coverage.reduce((sum,value)=>sum+value,0)/coverage.length;
    if(totals.sodium>targets.sodium*1.1) score-=Math.min(20,((totals.sodium/targets.sodium)-1)*20);
    if(entries.length>=3) score+=5;
    return Math.round(clamp(score,0,100));
  }
  function nutritionCoverageRows(keys,date){
    const totals=nutrientTotalsForDate(date), targets=advancedTargets();
    return keys.map(key=>{
      const definition=DEFINITIONS[key]; if(!definition) return '';
      const value=totals[key]||0,target=Math.max(.01,Number(targets[key])||definition.target||1);
      const state=coverageState(key,value,target);
      const width=Math.min(100,state.pct);
      return `<div class="coverageRow ${state.key}" role="progressbar" aria-label="${escapeHtml(definition.label)}" aria-valuenow="${Math.round(state.pct)}" aria-valuemin="0" aria-valuemax="100"><div class="coverageTop"><strong>${escapeHtml(definition.label)}</strong><span>${escapeHtml(displayNutrient(key,value))} / ${escapeHtml(displayNutrient(key,target))} · ${Math.round(state.pct)}%</span></div><div class="bar"><i style="width:${width}%"></i></div><div style="margin-top:6px"><span class="statusChip ${state.key}">${state.label}</span></div></div>`;
    }).join('');
  }
  function renderCoverage(){
    const date=document.getElementById('nutritionDate')?.value||todayStr();
    const main=document.getElementById('nutritionCoverageGrid'), extended=document.getElementById('nutritionCoverageExtended');
    if(main) main.innerHTML=nutritionCoverageRows(PRIMARY_COVERAGE,date);
    if(extended) extended.innerHTML=nutritionCoverageRows(EXTENDED_COVERAGE,date);
    const score=nutritionScoreForDate(date), totals=nutrientTotalsForDate(date), count=entriesForDate(date).length;
    const box=document.getElementById('nutritionScoreSummary');
    if(box) box.innerHTML=[
      ['Score nutricional',`${score}/100`],['Alimentos registrados',count],
      ['Fibra',displayNutrient('fiber',totals.fiber)],['Agua',displayNutrient('water',totals.water)]
    ].map(([label,value])=>`<div class="quickStat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function missingNutrients(date){
    const totals=nutrientTotalsForDate(date),targets=advancedTargets();
    return Object.keys(SUGGESTION_LABELS).map(key=>({key,value:totals[key]||0,target:targets[key]||1,pct:(totals[key]||0)/(targets[key]||1)*100})).filter(x=>x.pct<75).sort((a,b)=>a.pct-b.pct);
  }
  function scoredFoodsForDate(date){
    const missing=missingNutrients(date).slice(0,7),totals=nutrientTotalsForDate(date),targets=advancedTargets();
    const caloriesHigh=totals.calories>targets.calories*1.05, sodiumHigh=totals.sodium>targets.sodium*.9, fatHigh=totals.fat>targets.fat*1.05;
    return allDefinedFoods().filter(food=>food.kind!=='water' && food.category!=='suplementos' && food.category!=='extras').map(food=>{
      const factor=(food.portionGrams||100)/100;
      let score=missing.reduce((sum,item)=>{
        const contribution=(foodNutrient(food,item.key)*factor)/Math.max(.01,item.target);
        return sum+Math.min(.5,contribution)*(1+(75-item.pct)/100);
      },0)*100;
      if(['verduras','frutas','legumbres','proteínas'].includes(food.category)) score+=8;
      if(caloriesHigh) score-=Math.max(0,(food.calories*factor-220)/35);
      if(sodiumHigh) score-=food.sodium*factor/100;
      if(fatHigh) score-=food.fat*factor*.8;
      return {food,score,helps:missing.filter(item=>foodNutrient(food,item.key)>item.target*.08).slice(0,3)};
    }).sort((a,b)=>b.score-a.score);
  }
  function renderDiagnosis(){
    const date=document.getElementById('nutritionDate')?.value||todayStr();
    const diagnosis=document.getElementById('nutritionDiagnosis'), recommendations=document.getElementById('nutritionRecommendations'), combinations=document.getElementById('nutritionCombinations');
    if(!diagnosis||!recommendations||!combinations) return;
    const entries=entriesForDate(date),totals=nutrientTotalsForDate(date),targets=advancedTargets(),missing=missingNutrients(date);
    if(!entries.length && !totals.water){
      diagnosis.innerHTML='<div class="emptyState">Registrá alimentos o agua para activar el diagnóstico orientativo.</div>';
      recommendations.innerHTML=''; combinations.innerHTML=''; return;
    }
    const covered=Object.keys(SUGGESTION_LABELS).filter(key=>totals[key]>=targets[key]*.8 && totals[key]<=targets[key]*1.4).map(key=>SUGGESTION_LABELS[key]);
    const sodiumState=coverageState('sodium',totals.sodium,targets.sodium);
    const cards=[];
    if(covered.length) cards.push(`<div class="auditItem good"><strong>Bien cubierto según lo registrado:</strong> ${escapeHtml(covered.slice(0,7).join(', '))}.</div>`);
    missing.slice(0,5).forEach(item=>cards.push(`<div class="auditItem warn"><strong>${escapeHtml(SUGGESTION_LABELS[item.key])} parece bajo según lo registrado (${Math.round(item.pct)}%):</strong> podrías priorizar ${escapeHtml(SPECIFIC_SUGGESTIONS[item.key]||'alimentos variados y poco procesados')}.</div>`));
    if(sodiumState.key==='review') cards.push('<div class="auditItem warn"><strong>Sodio alto según lo registrado:</strong> conviene priorizar comidas menos procesadas y más alimentos frescos en la próxima elección.</div>');
    const protocol=getEntries().find(e=>e.date===date);
    if(protocol && Number(protocol.anxiety)>=8) cards.push('<div class="auditItem warn"><strong>Mensaje de cuidado:</strong> hoy registraste ansiedad alta. Evitá compensar, restringir o buscar perfección; si la preocupación por comida o cuerpo es intensa, hablá con un adulto o profesional de salud.</div>');
    diagnosis.innerHTML=cards.join('')||'<div class="auditItem good">La cobertura registrada se ve equilibrada. Sostené variedad y regularidad.</div>';
    const best=scoredFoodsForDate(date).slice(0,5);
    recommendations.innerHTML=best.map((item,index)=>{
      const helps=item.helps.map(x=>SUGGESTION_LABELS[x.key]).join(', ')||'variedad nutricional';
      return `<div class="recommendCard"><strong>${index+1}. ${escapeHtml(item.food.name)}</strong><span>Porción orientativa: ${item.food.portionGrams||100} g. Puede ayudar con ${escapeHtml(helps)}.</span><div class="muted small" style="margin-top:6px">${escapeHtml(item.food.confidence)} · ${escapeHtml(item.food.source)}</div></div>`;
    }).join('');
    const top=best.map(x=>x.food);
    const light=top.find(f=>f.calories<100)||top[0], complete=top.find(f=>f.protein>=8)||top[0], post=top.find(f=>f.protein>=15)||allDefinedFoods().find(f=>f.id==='chicken-breast');
    combinations.innerHTML=[
      ['Opción liviana',light?`${light.name} + una fruta o verdura variada`:'Fruta + verdura variada'],
      ['Opción completa',complete?`${complete.name} + legumbre o cereal + verdura`:'Legumbre + cereal + verdura'],
      ['Opción post-entreno',post?`${post.name} + arroz, papa o banana`:'Proteína real + carbohidrato']
    ].map(([title,text])=>`<div class="recommendCard"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}.<div class="muted small" style="margin-top:5px">Ajustá cantidad a hambre, contexto y objetivos personales.</div></div>`).join('');
  }

  function datesInRange(days){
    const out=[],d=new Date();
    for(let i=0;i<days;i++){const x=new Date(d);x.setDate(d.getDate()-i);out.push(dateStrFromDate(x));}
    return out;
  }
  function average(values){ return values.length?values.reduce((a,b)=>a+b,0)/values.length:0; }
  function renderNutritionTrends(){
    const box=document.getElementById('nutritionTrendStats'),insights=document.getElementById('nutritionTrendInsights');
    if(!box||!insights) return;
    const week=datesInRange(7),month=datesInRange(30),registered=month.filter(d=>entriesForDate(d).length||dateMetrics(d).water);
    const weekTotals=week.map(nutrientTotalsForDate), monthScores=month.map(nutritionScoreForDate).filter(Boolean);
    const stats=[
      ['Kcal promedio semanal',Math.round(average(weekTotals.map(t=>t.calories)))],
      ['Proteína promedio',`${Math.round(average(weekTotals.map(t=>t.protein)))} g`],
      ['Fibra promedio',`${round(average(weekTotals.map(t=>t.fiber)))} g`],
      ['Consistencia 30 días',`${registered.length}/30`]
    ];
    box.innerHTML=stats.map(([label,value])=>`<div class="quickStat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    const targets=advancedTargets();
    const nutrientAvg=Object.keys(SUGGESTION_LABELS).map(key=>({key,pct:average(weekTotals.map(t=>(t[key]||0)/(targets[key]||1)*100))})).sort((a,b)=>a.pct-b.pct);
    const scored=month.map(date=>({date,score:nutritionScoreForDate(date)})).filter(x=>x.score);
    const best=scored.slice().sort((a,b)=>b.score-a.score)[0],low=scored.slice().sort((a,b)=>a.score-b.score)[0];
    insights.innerHTML=[
      ['Micronutriente a priorizar',nutrientAvg[0]?`${SUGGESTION_LABELS[nutrientAvg[0].key]} · ${Math.round(nutrientAvg[0].pct)}% semanal`:'Faltan registros'],
      ['Días comparables',best?`Mejor cobertura: ${best.date} (${best.score}/100). Menor: ${low.date} (${low.score}/100).`:'Registrá más días para comparar.'],
      ['Próxima semana',nutrientAvg[0]?`Elegí dos fuentes de ${SUGGESTION_LABELS[nutrientAvg[0].key].toLowerCase()} y repetilas de forma práctica.`:'Priorizá constancia de registro antes que precisión perfecta.']
    ].map(([title,text])=>`<div class="recommendCard"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`).join('');
  }

  function loadAdvancedTargetFields(){
    const targets=advancedTargets(),profile=nutritionProfile();
    Object.entries(TARGET_DOM).forEach(([key,id])=>{const el=document.getElementById(id);if(el) el.value=targets[key]??'';});
    [['nutritionAge',profile.age],['nutritionSex',profile.sex],['nutritionHeight',profile.height],['nutritionGoal',profile.goal]].forEach(([id,value])=>{const el=document.getElementById(id);if(el) el.value=value??'';});
  }
  function saveAdvancedTargets(){
    const targets=advancedTargets();
    Object.entries(TARGET_DOM).forEach(([key,id])=>{const el=document.getElementById(id);if(el) targets[key]=Math.max(0,Number(el.value)||0);});
    setLocalData(NUTRITION_TARGETS_KEY,targets);
    setLocalData(NUTRITION_PROFILE_KEY,{
      age:document.getElementById('nutritionAge')?.value||'',sex:document.getElementById('nutritionSex')?.value||'',
      height:document.getElementById('nutritionHeight')?.value||'',goal:document.getElementById('nutritionGoal')?.value||'health'
    });
    renderAdvancedNutrition(); syncVersionedState();flash('Metas nutricionales orientativas guardadas.');
  }
  function filterFoodSelect(){
    const query=normalizeFoodText(document.getElementById('nutritionFoodSearch')?.value||'');
    const select=document.getElementById('nutritionFood'); if(!select) return;
    const foods=allFoods();
    const nutrientKey=Object.entries(DEFINITIONS).find(([,d])=>normalizeFoodText(d.label).includes(query))?.[0];
    select.innerHTML=foods.map((food,index)=>({food,index})).filter(({food,index})=>{
      if(index===0) return true;
      if(!query) return true;
      const haystack=normalizeFoodText([food.name,...(food.aliases||[]),food.category].join(' '));
      return haystack.includes(query)||(nutrientKey&&foodNutrient(food,nutrientKey)>0);
    }).map(({food,index})=>`<option value="${index}">${escapeHtml(food.name)}${food.fdcImported?' · USDA':food.custom?' · propio':''}</option>`).join('');
    select.value='0'; applySelectedFood();
    renderFdcLocalHint(query);
  }
  function fdcLocalFoods(){
    return [...(window.NUTRITION_DB||[]).slice(1),...getLocalData(CUSTOM_FOODS_KEY,[])];
  }
  function fdcCard(food,{cached=false}={}){
    const brand=food.brandOwner?` · ${food.brandOwner}`:'';
    const action=cached?'<span class="statusChip good">Disponible offline</span>':`<button type="button" class="secondary" data-import-fdc="${escapeHtml(String(food.fdcId))}">Importar detalle</button>`;
    return `<div class="fdcResult"><strong>${escapeHtml(food.description||food.name)}</strong><div class="fdcMeta">FDC ${escapeHtml(String(food.fdcId||''))} · ${escapeHtml(food.dataType||'')}${escapeHtml(brand)}</div>${action}</div>`;
  }
  function renderFdcLocalHint(query){
    const status=document.getElementById('fdcSearchStatus');if(!status||!FDC)return;
    const text=String(query||'').trim();
    if(!text){status.textContent='Buscá primero por nombre o alias. La consulta remota es opcional.';return;}
    const local=fdcLocalFoods().filter(food=>normalizeFoodText([food.name,...(food.aliases||[]),food.category].join(' ')).includes(text)).length;
    const cached=FDC.findCachedByQuery(text,30).length;
    status.textContent=`Primera capa: ${local} coincidencia(s) locales y ${cached} alimento(s) USDA en caché. Pulsá “Buscar también en USDA” para ampliar.`;
  }
  function renderFdcSearch(){
    const results=document.getElementById('fdcSearchResults'),status=document.getElementById('fdcSearchStatus');if(!results||!status||!FDC)return;
    const {query,local,cached,remote}=fdcLastSearch,remoteFoods=(remote.foods||[]).filter(food=>!cached.some(item=>String(item.fdcId)===String(food.fdcId)));
    const groups=[];
    if(cached.length)groups.push(`<div><strong>Ya guardados (${cached.length})</strong><div class="fdcResultGrid">${cached.map(food=>fdcCard(food,{cached:true})).join('')}</div></div>`);
    if(remoteFoods.length)groups.push(`<div><strong>Resultados USDA (${remote.totalHits||remoteFoods.length})</strong><div class="fdcResultGrid">${remoteFoods.map(food=>fdcCard(food)).join('')}</div></div>`);
    results.innerHTML=groups.join('')||'<div class="emptyState">No hay resultados adicionales para mostrar.</div>';
    const access=FDC.hasRemoteAccess()?'Acceso remoto configurado.':'Sin acceso remoto configurado; se muestran base local y caché.';
    status.textContent=`${local.length} resultado(s) locales · ${cached.length} en caché · página ${remote.currentPage||1}/${remote.totalPages||1}. ${access}`;
    const prev=document.getElementById('fdcPrevPageBtn'),next=document.getElementById('fdcNextPageBtn');
    if(prev)prev.disabled=(remote.currentPage||1)<=1;if(next)next.disabled=!remote.totalPages||(remote.currentPage||1)>=remote.totalPages;
    if(query)document.getElementById('nutritionFoodSearch').value=query;
  }
  async function runFdcSearch(page=1){
    if(!FDC)return;
    const query=document.getElementById('nutritionFoodSearch')?.value.trim()||'',status=document.getElementById('fdcSearchStatus');
    if(query.length<2){flash('Escribí al menos dos caracteres para buscar.');return;}
    const normalized=normalizeFoodText(query),local=fdcLocalFoods().filter(food=>normalizeFoodText([food.name,...(food.aliases||[]),food.category].join(' ')).includes(normalized)).slice(0,FDC.config().pageSize);
    const cached=FDC.findCachedByQuery(query,FDC.config().pageSize);
    fdcSearchPage=Math.max(1,page);
    fdcLastSearch={query,local,cached,remote:{foods:[],totalHits:0,currentPage:fdcSearchPage,totalPages:0,source:'pending'}};
    renderFdcSearch();
    if(!FDC.hasRemoteAccess()){if(status)status.textContent=`${local.length} resultado(s) locales y ${cached.length} en caché. Configurá acceso para ampliar con USDA.`;return;}
    if(status)status.textContent=`Resultados locales listos (${local.length}+${cached.length}). Consultando USDA en segundo plano…`;
    document.getElementById('searchFdcBtn').disabled=true;
    try{
      const remote=await FDC.searchFoods(query,{pageNumber:fdcSearchPage,pageSize:FDC.config().pageSize});
      fdcLastSearch={query,local,cached,remote};renderFdcSearch();
    }catch(error){
      const messages={FDC_RATE_LIMIT:'Se alcanzó temporalmente el límite de consultas de FDC.',FDC_NOT_CONFIGURED:'Configurá una API key personal o un backend/proxy.'};
      if(status)status.textContent=messages[error.message]||'No pude consultar FoodData Central. La búsqueda local sigue disponible.';
    }finally{document.getElementById('searchFdcBtn').disabled=false}
  }
  async function importFdcFood(fdcId){
    if(!FDC)return;
    const status=document.getElementById('fdcSearchStatus'),summary=fdcLastSearch.remote.foods.find(food=>String(food.fdcId)===String(fdcId));
    if(status)status.textContent='Obteniendo detalle y normalizando nutrientes por 100 g…';
    try{
      const food=await FDC.importFood(summary||fdcId);
      populateFoods();renderFdcCachedFoods();filterFoodSelect();syncVersionedState();
      if(status)status.textContent=`${food.name} quedó guardado offline y disponible para registrar o editar.`;
      flash('Alimento USDA importado.');
    }catch(error){
      if(status)status.textContent=error.message==='FDC_RATE_LIMIT'?'Se alcanzó el límite temporal de FDC.':'No pude importar ese alimento.';
    }
  }
  function loadFdcConfigFields(){
    if(!FDC)return;const value=FDC.config();
    const key=document.getElementById('fdcApiKey'),backend=document.getElementById('fdcBackendUrl'),size=document.getElementById('fdcPageSize');
    if(key)key.value=value.apiKey||'';if(backend)backend.value=value.backendUrl||'';if(size)size.value=value.pageSize||20;
  }
  function saveFdcConfig(){
    if(!FDC)return;
    FDC.saveConfig({apiKey:document.getElementById('fdcApiKey')?.value||'',backendUrl:document.getElementById('fdcBackendUrl')?.value||'',pageSize:document.getElementById('fdcPageSize')?.value||20});
    renderFdcLocalHint(document.getElementById('nutritionFoodSearch')?.value||'');flash('Configuración FDC guardada solo en este dispositivo.');
  }
  function clearFdcApiKey(){
    if(!FDC)return;FDC.saveConfig({...FDC.config(),apiKey:''});loadFdcConfigFields();flash('API key local eliminada.');
  }
  function editCachedFdcFood(id){
    if(!FDC)return;const food=FDC.cachedFoods().find(item=>item.id===id);if(!food)return;
    const name=(window.prompt('Nombre editable:',food.name)||food.name).trim(),updated={name,aliases:[name,food.description,food.brandOwner].filter(Boolean)};
    const fields={calories:'Calorías/100 g',protein:'Proteína/100 g',carbs:'Carbohidratos/100 g',fat:'Grasas/100 g',fiber:'Fibra/100 g',sodium:'Sodio mg/100 g',potassium:'Potasio mg/100 g',calcium:'Calcio mg/100 g',iron:'Hierro mg/100 g',vitaminC:'Vitamina C mg/100 g'};
    Object.entries(fields).forEach(([key,label])=>{const value=window.prompt(label,String(food[key]??food.nutrients?.[key]??0));if(value!==null)updated[key]=Math.max(0,Number(value)||0)});
    FDC.updateCachedFood(id,updated);populateFoods();renderFdcCachedFoods();renderAdvancedNutrition();syncVersionedState();flash('Alimento USDA editado localmente.');
  }
  function renderFdcCachedFoods(){
    const box=document.getElementById('fdcCachedFoodsList');if(!box||!FDC)return;const foods=FDC.cachedFoods();
    box.innerHTML=foods.length?foods.map(food=>`<div class="entryRow"><div><strong>${escapeHtml(food.name)}</strong><div class="meta">FDC ${escapeHtml(String(food.fdcId))} · ${escapeHtml(food.dataType)} · ${food.calories||0} kcal/100 g · ${escapeHtml(food.brandOwner||'sin marca')}</div></div><div class="buttons" style="margin:0"><button type="button" class="secondary" data-edit-fdc="${escapeHtml(food.id)}">Editar</button><button type="button" class="danger" data-delete-fdc="${escapeHtml(food.id)}">Quitar caché</button></div></div>`).join(''):'<div class="emptyState">Todavía no importaste alimentos desde FoodData Central.</div>';
  }
  async function importFdcDataset(){
    if(!FDC)return;const file=document.getElementById('fdcDatasetFile')?.files?.[0],status=document.getElementById('fdcDatasetStatus');
    if(!file){flash('Elegí un archivo JSON FDC compatible.');return;}
    status.textContent='Procesando el dataset fuera del flujo principal de la interfaz…';
    try{
      const result=await FDC.importDataset(file,{limit:document.getElementById('fdcDatasetLimit')?.value||250});
      populateFoods();renderFdcCachedFoods();syncVersionedState();status.textContent=`Importados ${result.imported} de ${result.totalInDataset} registros detectados; ${result.cached} alimentos FDC disponibles offline.`;
    }catch(error){status.textContent=error.message==='FDC_DATASET_JSON_REQUIRED'?'El importador opcional acepta archivos JSON FDC compatibles.':'No pude procesar ese dataset.'}
  }
  function currentMealEntries(date=document.getElementById('nutritionDate')?.value||todayStr(),meal=document.getElementById('nutritionMeal')?.value||'Desayuno'){
    return entriesForDate(date).filter(e=>e.meal===meal);
  }
  function saveFrequentMeal(){
    const items=currentMealEntries(); if(!items.length){flash('Registrá al menos un alimento en esta comida.');return;}
    const suggested=`${document.getElementById('nutritionMeal').value} frecuente`;
    const name=(window.prompt('Nombre de la comida frecuente:',suggested)||'').trim(); if(!name)return;
    const saved=getLocalData(SAVED_MEALS_KEY,[]);
    saved.push({id:uid('savedmeal'),name,items:items.map(({name,grams,calories,protein,carbs,fat,foodId,fdcId,nutrients,source,sourceCitation})=>({name,grams,calories,protein,carbs,fat,foodId,fdcId,nutrients,source,sourceCitation})),savedAt:new Date().toISOString()});
    setLocalData(SAVED_MEALS_KEY,saved); renderSavedMeals();syncVersionedState();flash('Comida frecuente guardada.');
  }
  function addMealItems(items,date,meal){
    const entries=getLocalData(NUTRITION_ENTRIES_KEY,[]);
    items.forEach(item=>entries.push({...item,id:uid('food'),date,meal,savedAt:new Date().toISOString(),source:item.source||'comida copiada'}));
    setLocalData(NUTRITION_ENTRIES_KEY,entries);renderNutrition();syncVersionedState();
  }
  function loadSavedMeal(){
    const id=document.getElementById('savedMealSelect')?.value;
    const saved=getLocalData(SAVED_MEALS_KEY,[]).find(x=>x.id===id); if(!saved){flash('Elegí una comida guardada.');return;}
    addMealItems(saved.items,document.getElementById('nutritionDate').value||todayStr(),document.getElementById('nutritionMeal').value);flash('Comida guardada agregada.');
  }
  function deleteSavedMeal(){
    const id=document.getElementById('savedMealSelect')?.value;
    if(!id){flash('Elegí una comida frecuente para eliminar.');return;}
    setLocalData(SAVED_MEALS_KEY,getLocalData(SAVED_MEALS_KEY,[]).filter(x=>x.id!==id));
    renderSavedMeals();syncVersionedState();flash('Comida frecuente eliminada.');
  }
  function copyCurrentMeal(){
    const items=currentMealEntries();
    if(!items.length){flash('No hay alimentos en esta comida para copiar.');return;}
    const target=(window.prompt('Fecha destino (AAAA-MM-DD):',todayStr())||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(target)||Number.isNaN(parseDate(target).getTime())){flash('Escribí una fecha válida en formato AAAA-MM-DD.');return;}
    addMealItems(items,target,document.getElementById('nutritionMeal').value);flash(`Comida copiada a ${target}.`);
  }
  function repeatYesterdayMeal(){
    const date=document.getElementById('nutritionDate').value||todayStr(),previous=parseDate(date);previous.setDate(previous.getDate()-1);
    const items=currentMealEntries(dateStrFromDate(previous),document.getElementById('nutritionMeal').value);
    if(!items.length){flash('No encontré esa comida en el día anterior.');return;}
    addMealItems(items,date,document.getElementById('nutritionMeal').value);flash('Comida de ayer copiada.');
  }
  function deleteCurrentMeal(){
    const date=document.getElementById('nutritionDate').value||todayStr(),meal=document.getElementById('nutritionMeal').value;
    setLocalData(NUTRITION_ENTRIES_KEY,getLocalData(NUTRITION_ENTRIES_KEY,[]).filter(e=>!(e.date===date&&e.meal===meal)));renderNutrition();syncVersionedState();flash('Comida eliminada.');
  }
  function renderSavedMeals(){
    const select=document.getElementById('savedMealSelect');if(!select)return;
    select.innerHTML='<option value="">Elegir comida guardada…</option>'+getLocalData(SAVED_MEALS_KEY,[]).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');
  }
  function ensureCustomFoodShape(food,index){
    const nutrientKeys=Object.keys(DEFINITIONS);
    const nutrients={};
    nutrientKeys.forEach(key=>{if(!['calories','protein','carbs','fat','water'].includes(key))nutrients[key]=Number(food[key]??food.nutrients?.[key]??0)||0;});
    return {...food,id:food.id||`custom-${normalizeFoodText(food.name).replace(/\s+/g,'-')||index}`,category:food.category||'personalizados',portionGrams:Number(food.portionGrams)||100,confidence:food.confidence||'aproximado',source:food.source||'etiqueta manual',nutrients,...nutrients,custom:true};
  }
  function normalizeCustomFoods(){
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]).map(ensureCustomFoodShape);
    setLocalData(CUSTOM_FOODS_KEY,foods);
  }
  function editCustomFood(id){
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]),index=foods.findIndex(f=>f.id===id);if(index<0)return;
    const food=foods[index],ask=(label,key)=>window.prompt(label,String(food[key]??food.nutrients?.[key]??0));
    const name=(window.prompt('Nombre:',food.name)||food.name).trim();
    const fields={calories:'Calorías/100 g',protein:'Proteína/100 g',carbs:'Carbohidratos/100 g',fat:'Grasas/100 g',fiber:'Fibra/100 g',sodium:'Sodio mg/100 g',calcium:'Calcio mg/100 g',iron:'Hierro mg/100 g',vitaminC:'Vitamina C mg/100 g'};
    const updated={...food,name};
    Object.entries(fields).forEach(([key,label])=>{const value=ask(label,key);if(value!==null)updated[key]=Math.max(0,Number(value)||0);});
    foods[index]=ensureCustomFoodShape(updated,index);setLocalData(CUSTOM_FOODS_KEY,foods);populateFoods();renderCustomFoods();renderAdvancedNutrition();syncVersionedState();
  }
  function renderCustomFoods(){
    const box=document.getElementById('customFoodsList');if(!box)return;
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]);
    box.innerHTML=foods.length?foods.map(food=>`<div class="entryRow"><div><strong>${escapeHtml(food.name)}</strong><div class="meta">${food.calories||0} kcal · P ${food.protein||0} · C ${food.carbs||0} · G ${food.fat||0} · ${escapeHtml(food.source||'etiqueta manual')}</div></div><div class="buttons" style="margin:0"><button type="button" class="secondary" data-edit-custom-food="${escapeHtml(food.id)}">Editar</button><button type="button" class="danger" data-delete-custom-food="${escapeHtml(food.id)}">Eliminar</button></div></div>`).join(''):'<div class="emptyState">Todavía no creaste alimentos personalizados.</div>';
  }

  function rebuildCoinLedger(){
    const ledger=[],push=(id,date,amount,reason)=>ledger.push({id,date,amount,reason});
    getEntries().forEach(entry=>{
      push(`day-${entry.date}`,entry.date,5,'Registrar el día');
      if(entry.keyActionDone)push(`action-${entry.date}`,entry.date,5,'Cumplir acción clave');
      if(entry.score>=70)push(`score70-${entry.date}`,entry.date,3,'Score ≥70');
      if(entry.score>=80)push(`score80-${entry.date}`,entry.date,3,'Estabilidad ≥80');
      if(entry.score>=90)push(`score90-${entry.date}`,entry.date,4,'Día ≥90 sin buscar perfección');
      if(entry.stableSchedule&&entry.sleepHours>=7)push(`sleep-${entry.date}`,entry.date,2,'Sueño estable y suficiente');
    });
    getLocalData(GYM_SESSIONS_KEY,[]).forEach(session=>push(`gym-${session.id}`,session.date,4,'Registrar entrenamiento'));
    const nutritionDates=new Set(getLocalData(NUTRITION_ENTRIES_KEY,[]).map(e=>e.date));
    nutritionDates.forEach(date=>{if(nutritionScoreForDate(date)>=70)push(`nutrition-${date}`,date,5,'Nutrición consistente');});
    const weeks={};getEntries().forEach(entry=>{const week=weekStartStr(entry.date);weeks[week]??=[];weeks[week].push(entry);});
    Object.entries(weeks).forEach(([week,items])=>{if(items.filter(x=>x.readingMins>=20).length>=5)push(`reading-week-${week}`,week,12,'Lectura 5/7');if(items.length>=7)push(`streak-week-${week}`,week,15,'Racha semanal de registro');});
    ledger.sort((a,b)=>b.date.localeCompare(a.date));setLocalData(COIN_LEDGER_KEY,ledger);return ledger;
  }
  function scoresForDate(date){
    const protocol=getEntries().find(e=>e.date===date);
    const protocolScore=protocol?.score||0;
    const sleepScreen=protocol?.parts?Math.round(average(protocol.parts.slice(0,3).map((p,i)=>p[1]/[25,20,20][i]*100))):0;
    const reading=protocol?.parts?.[3]?Math.round(protocol.parts[3][1]/25*100):0;
    const gym=getLocalData(GYM_SESSIONS_KEY,[]).some(s=>s.date===date)?85:(protocol?.parts?.[4]?Math.round(protocol.parts[4][1]/10*100):0);
    const nutrition=nutritionScoreForDate(date);
    const values=[protocolScore,sleepScreen,reading,gym,nutrition].filter(Boolean);
    return {protocol:protocolScore,sleepScreen,reading,gym,nutrition,integral:values.length?Math.round(average(values)):0};
  }
  function renderIntegralScore(){
    const date=document.getElementById('entryDate')?.value||todayStr(),scores=scoresForDate(date);
    const ring=document.getElementById('integralScoreRing'),value=document.getElementById('integralScoreValue'),label=document.getElementById('integralScoreLabel'),advice=document.getElementById('integralScoreAdvice'),tiles=document.getElementById('integralScoreTiles');
    if(!ring||!value||!label||!advice||!tiles)return;
    ring.style.setProperty('--p',scores.integral);value.textContent=scores.integral;
    const areas=[['Hábitos/protocolo',scores.protocol],['Sueño y pantalla',scores.sleepScreen],['Lectura/atención',scores.reading],['Actividad/gym',scores.gym],['Nutrición',scores.nutrition]];
    const measured=areas.filter(x=>x[1]>0),lowest=measured.slice().sort((a,b)=>a[1]-b[1])[0];
    label.textContent=scores.integral?`Score integral ${scores.integral}/100`:'Sin datos suficientes';
    advice.textContent=lowest?`Palanca principal de mejora: ${lowest[0]}. Elegí una acción pequeña y medible.`:'Registrá alguna de las áreas para activar el resumen.';
    tiles.innerHTML=areas.map(([name,score])=>`<div class="scoreTile"><span>${escapeHtml(name)}</span><strong>${score||'—'}</strong></div>`).join('');
  }
  function renderCoinsAndRewards(){
    const ledger=rebuildCoinLedger(),balance=ledger.reduce((sum,x)=>sum+x.amount,0);
    const balanceEl=document.getElementById('coinBalance'),list=document.getElementById('coinLedger');if(balanceEl)balanceEl.textContent=balance;
    if(list)list.innerHTML=ledger.length?ledger.slice(0,25).map(x=>`<div class="ledgerItem"><span>${escapeHtml(x.date)} · ${escapeHtml(x.reason)}</span><strong>+${x.amount}</strong></div>`).join(''):'<div class="emptyState">Los coins aparecerán al registrar constancia y acciones saludables.</div>';
    const rewards=[
      {id:'first-steps',name:'Primeros pasos',need:10,type:'Insignia'},
      {id:'calm-theme',name:'Tema calma desbloqueado',need:100,type:'Tema visual'},
      {id:'report',name:'Reporte avanzado temporal',need:250,type:'Acceso premium simulado'},
      {id:'discount',name:'Descuento interno futuro',need:500,type:'Descuento interno'},
      {id:'premium-month',name:'Mes premium manual futuro',need:1000,type:'Recompensa futura'}
    ];
    const unlocked=rewards.filter(r=>balance>=r.need);setLocalData(REWARDS_KEY,{balance,unlocked:unlocked.map(r=>r.id),updatedAt:new Date().toISOString()});
    const badges=document.getElementById('rewardBadges'),rewardsList=document.getElementById('rewardsList');
    if(badges)badges.innerHTML=unlocked.map(r=>`<span class="badge on">${escapeHtml(r.type)} · ${escapeHtml(r.name)}</span>`).join('')||'<span class="badge">Las recompensas aparecen con la constancia.</span>';
    if(rewardsList)rewardsList.innerHTML=rewards.map(r=>`<div class="entryRow"><div><strong>${escapeHtml(r.name)}</strong><div class="meta">${escapeHtml(r.type)} · requiere ${r.need} coins</div></div><span class="statusChip ${balance>=r.need?'good':'low'}">${balance>=r.need?'Desbloqueada':'En progreso'}</span></div>`).join('');
  }
  function monthMetrics(){
    const month=todayStr().slice(0,7),previous=prevMonthKey(month);
    const current=getEntries().filter(e=>e.date.startsWith(month)),prev=getEntries().filter(e=>e.date.startsWith(previous));
    const nutritionDates=[...new Set(getLocalData(NUTRITION_ENTRIES_KEY,[]).filter(e=>e.date.startsWith(month)).map(e=>e.date))];
    return {
      constancia:current.length,mejora:round(average(current.map(e=>e.score))-average(prev.map(e=>e.score))),
      lectura:Math.round(average(current.map(e=>e.readingMins||0))),sueno:Math.round(average(current.map(e=>e.stableSchedule&&e.sleepHours>=7?100:0))),
      nutricion:Math.round(average(nutritionDates.map(nutritionScoreForDate))),pantalla:round(average(prev.map(e=>e.nonEssential||0))-average(current.map(e=>e.nonEssential||0)),1)
    };
  }
  function renderRankings(){
    const table=document.getElementById('monthlyRankingsTable');if(!table)return;
    const settings=getLocalData(RANKING_SETTINGS_KEY,{alias:'Anónimo 0→100',optIn:false});
    const alias=document.getElementById('rankingAlias'),opt=document.getElementById('rankingOptIn');if(alias)alias.value=settings.alias||'';if(opt)opt.checked=!!settings.optIn;
    if(!settings.optIn){table.innerHTML='<tbody><tr><td>Rankings desactivados. Podés participar con un alias y salir cuando quieras.</td></tr></tbody>';return;}
    const metrics=monthMetrics(),labels={constancia:'Constancia',mejora:'Mejora mensual',lectura:'Lectura',sueno:'Sueño estable',nutricion:'Nutrición consistente',pantalla:'Reducción pantalla no esencial'};
    const rows=Object.entries(labels).map(([key,label])=>{
      const score=metrics[key],mockBest={constancia:27,mejora:12,lectura:70,sueno:92,nutricion:88,pantalla:1.8}[key];
      const position=Number(score)>=mockBest?1:Number(score)>=mockBest*.65?2:3;
      return `<tr><td>${escapeHtml(label)}</td><td><strong>${position}º local</strong></td><td>${escapeHtml(String(score))}</td><td>${escapeHtml(String(mockBest))}</td><td>${escapeHtml(settings.alias||'Anónimo 0→100')}</td></tr>`;
    }).join('');
    table.innerHTML=`<thead><tr><th>Categoría</th><th>Posición simulada</th><th>Tu dato</th><th>Referencia local</th><th>Alias</th></tr></thead><tbody>${rows}</tbody>`;
    setLocalData(MONTHLY_RANKINGS_KEY,{month:todayStr().slice(0,7),metrics,updatedAt:new Date().toISOString()});
  }
  function saveRankingSettings(){
    setLocalData(RANKING_SETTINGS_KEY,{alias:document.getElementById('rankingAlias').value.trim()||'Anónimo 0→100',optIn:document.getElementById('rankingOptIn').checked});
    renderRankings();syncVersionedState();flash('Preferencia de rankings guardada.');
  }
  function referralCodes(){
    const saved=getLocalData(REFERRAL_CODES_KEY,null);if(saved)return saved;
    setLocalData(REFERRAL_CODES_KEY,DEFAULT_REFERRALS);return DEFAULT_REFERRALS;
  }
  function renderReferral(){
    const applied=getLocalData(USER_REFERRAL_KEY,null),status=document.getElementById('referralStatus'),stats=document.getElementById('affiliateStats');
    if(status)status.innerHTML=applied?`<strong>Código aplicado:</strong> ${escapeHtml(applied.code)} · ${escapeHtml(applied.name)} · beneficio ${applied.discountPct}%`:'Sin código aplicado.';
    const code=applied||referralCodes()[0],revenue=(code.mockConversions||0)*5,commission=revenue*((code.commissionPct||10)/100);
    if(stats)stats.innerHTML=[['Usuarios atribuidos',code.mockUsers||0],['Conversiones simuladas',code.mockConversions||0],['Ingresos estimados',`USD ${revenue.toFixed(2)}`],['Comisión estimada',`USD ${commission.toFixed(2)} (${code.commissionPct||10}%)`]].map(([k,v])=>`<div class="quickStat"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join('');
  }
  function applyReferral(){
    const input=normalizeFoodText(document.getElementById('referralCodeInput').value).replace(/\s/g,'').toUpperCase();
    const code=referralCodes().find(x=>x.code===input&&x.active&&x.expires>=todayStr());
    if(!code){flash('Código no válido, inactivo o vencido.');return;}
    setLocalData(USER_REFERRAL_KEY,{...code,appliedAt:new Date().toISOString()});renderReferral();syncVersionedState();flash('Código aplicado.');
  }
  function exportAffiliateCsv(){
    const code=getLocalData(USER_REFERRAL_KEY,null)||referralCodes()[0];
    const rows=[['codigo','influencer','usuarios_atribuidos','conversiones_simuladas','comision_pct','nota'],[code.code,code.name,code.mockUsers||0,code.mockConversions||0,code.commissionPct||10,'Simulación local; pagos reales requieren backend']];
    downloadBlob(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),'panel_afiliado_simulado.csv','text/csv;charset=utf-8');
  }
  function renderAdvancedProgress(){ renderIntegralScore();renderCoinsAndRewards();renderRankings();renderReferral();syncVersionedState(); }
  window.renderAdvancedProgress=renderAdvancedProgress;

  function exportMealsCsv(){
    const entries=getLocalData(NUTRITION_ENTRIES_KEY,[]),cols=['date','meal','name','grams','calories','protein','carbs','fat','fdcId','source','sourceCitation'];
    downloadBlob([cols.join(','),...entries.map(e=>cols.map(k=>`"${String(e[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n'),'protocolo_comidas.csv','text/csv;charset=utf-8');
  }
  function exportNutrientsCsv(){
    const dates=[...new Set([...getLocalData(NUTRITION_ENTRIES_KEY,[]).map(e=>e.date),...Object.keys(getLocalData(BODY_METRICS_KEY,{}))])].sort();
    const keys=Object.keys(DEFINITIONS),rows=[['date',...keys].join(',')];
    dates.forEach(date=>{const totals=nutrientTotalsForDate(date);rows.push([date,...keys.map(k=>totals[k]||0)].join(','));});
    downloadBlob(rows.join('\n'),'protocolo_nutrientes_diarios.csv','text/csv;charset=utf-8');
  }
  function buildCompleteBackup(){
    syncVersionedState();
    const state=getLocalData(APP_STATE_KEY,{});
    const workoutKeys=window.WORKOUT_FEATURES?.keys||{};
    return {...state,startDate:localStorage.getItem(START_KEY)||todayStr(),entries:getEntries(),gymSessions:getLocalData(GYM_SESSIONS_KEY,[]),weeklyWorkoutPlan:getLocalData(workoutKeys.weeklyWorkoutPlan||'protocolo_0_100_weekly_workout_plan_v1',null),workoutSessions:getLocalData(workoutKeys.workoutSessions||'protocolo_0_100_workout_sessions_v1',[]),exerciseHistory:getLocalData(workoutKeys.exerciseHistory||'protocolo_0_100_exercise_history_v1',{}),exerciseLibrary:getLocalData(workoutKeys.exerciseLibrary||'protocolo_0_100_exercise_library_v1',[]),gymSettings:getLocalData(workoutKeys.gymSettings||'protocolo_0_100_gym_settings_v1',{}),workoutWidgetState:getLocalData(workoutKeys.workoutWidgetState||'protocolo_0_100_workout_widget_state_v1',null),nutritionEntries:getLocalData(NUTRITION_ENTRIES_KEY,[]),nutritionTargets:advancedTargets(),bodyMetrics:getLocalData(BODY_METRICS_KEY,{}),customFoods:getLocalData(CUSTOM_FOODS_KEY,[]),cachedFdcFoods:FDC?.cachedFoods?.()||[],nutritionAliases:getLocalData(NUTRITION_ALIASES_KEY,{}),exportedAt:new Date().toISOString()};
  }
  window.buildCompleteBackup=buildCompleteBackup;
  function importCompleteBackupData(data){
    const state=data?.schemaVersion?data:null;
    if(state){
      if(Array.isArray(state.dailyLogs))setEntries(state.dailyLogs);
      if(Array.isArray(state.meals))setLocalData(NUTRITION_ENTRIES_KEY,state.meals);
      if(Array.isArray(state.gymSessions))setLocalData(GYM_SESSIONS_KEY,state.gymSessions);
      const workoutKeys=window.WORKOUT_FEATURES?.keys||{};
      if(state.weeklyWorkoutPlan)setLocalData(workoutKeys.weeklyWorkoutPlan||'protocolo_0_100_weekly_workout_plan_v1',state.weeklyWorkoutPlan);
      if(Array.isArray(state.workoutSessions))setLocalData(workoutKeys.workoutSessions||'protocolo_0_100_workout_sessions_v1',state.workoutSessions);
      if(state.exerciseHistory)setLocalData(workoutKeys.exerciseHistory||'protocolo_0_100_exercise_history_v1',state.exerciseHistory);
      if(Array.isArray(state.exerciseLibrary))setLocalData(workoutKeys.exerciseLibrary||'protocolo_0_100_exercise_library_v1',state.exerciseLibrary);
      if(state.gymSettings)setLocalData(workoutKeys.gymSettings||'protocolo_0_100_gym_settings_v1',state.gymSettings);
      if(state.workoutWidgetState)setLocalData(workoutKeys.workoutWidgetState||'protocolo_0_100_workout_widget_state_v1',state.workoutWidgetState);
      if(Array.isArray(state.customFoods))setLocalData(CUSTOM_FOODS_KEY,state.customFoods);
      if(Array.isArray(state.cachedFdcFoods)&&FDC)FDC.replaceCache(state.cachedFdcFoods);
      if(state.nutritionTargets)setLocalData(NUTRITION_TARGETS_KEY,state.nutritionTargets);
      if(state.bodyMetrics)setLocalData(BODY_METRICS_KEY,state.bodyMetrics);
      if(Array.isArray(state.savedMeals))setLocalData(SAVED_MEALS_KEY,state.savedMeals);
      if(typeof state.settings?.activeModule==='string')localStorage.setItem(ACTIVE_MODULE_KEY,state.settings.activeModule);
      if(state.settings?.nutritionProfile)setLocalData(NUTRITION_PROFILE_KEY,state.settings.nutritionProfile);
      if(state.settings?.ranking)setLocalData(RANKING_SETTINGS_KEY,state.settings.ranking);
      if(Array.isArray(state.referralCodes))setLocalData(REFERRAL_CODES_KEY,state.referralCodes);
      if(Object.prototype.hasOwnProperty.call(state,'userReferral'))setLocalData(USER_REFERRAL_KEY,state.userReferral);
      if(Array.isArray(state.coinLedger))setLocalData(COIN_LEDGER_KEY,state.coinLedger);
      if(state.monthlyRankings&&typeof state.monthlyRankings==='object')setLocalData(MONTHLY_RANKINGS_KEY,state.monthlyRankings);
      if(state.rewards&&typeof state.rewards==='object')setLocalData(REWARDS_KEY,state.rewards);
    }
    migrateAdvancedState();populateFoods();loadAdvancedTargetFields();renderSavedMeals();renderAll();renderAdvancedNutrition();renderAdvancedProgress();
    if(typeof state?.settings?.activeModule==='string')setModule(state.settings.activeModule);
  }
  window.importCompleteBackupData=importCompleteBackupData;
  function syncVersionedState(){
    // Future API: this object is the client-side contract ready to sync with a backend.
    const workoutKeys=window.WORKOUT_FEATURES?.keys||{};
    const state={
      schemaVersion:3,appVersion:APP_VERSION,updatedAt:new Date().toISOString(),
      settings:{activeModule:localStorage.getItem(ACTIVE_MODULE_KEY)||'protocolo',nutritionProfile:nutritionProfile(),ranking:getLocalData(RANKING_SETTINGS_KEY,{alias:'Anónimo 0→100',optIn:false})},
      dailyLogs:getEntries(),gymSessions:getLocalData(GYM_SESSIONS_KEY,[]),meals:getLocalData(NUTRITION_ENTRIES_KEY,[]),
      weeklyWorkoutPlan:getLocalData(workoutKeys.weeklyWorkoutPlan||'protocolo_0_100_weekly_workout_plan_v1',null),
      workoutSessions:getLocalData(workoutKeys.workoutSessions||'protocolo_0_100_workout_sessions_v1',[]),
      exerciseHistory:getLocalData(workoutKeys.exerciseHistory||'protocolo_0_100_exercise_history_v1',{}),
      exerciseLibrary:getLocalData(workoutKeys.exerciseLibrary||'protocolo_0_100_exercise_library_v1',[]),
      gymSettings:getLocalData(workoutKeys.gymSettings||'protocolo_0_100_gym_settings_v1',{}),
      workoutWidgetState:getLocalData(workoutKeys.workoutWidgetState||'protocolo_0_100_workout_widget_state_v1',null),
      customFoods:getLocalData(CUSTOM_FOODS_KEY,[]),cachedFdcFoods:FDC?.cachedFoods?.()||[],nutritionTargets:advancedTargets(),bodyMetrics:getLocalData(BODY_METRICS_KEY,{}),
      savedMeals:getLocalData(SAVED_MEALS_KEY,[]),referralCodes:referralCodes(),userReferral:getLocalData(USER_REFERRAL_KEY,null),
      coinLedger:getLocalData(COIN_LEDGER_KEY,[]),monthlyRankings:getLocalData(MONTHLY_RANKINGS_KEY,{}),rewards:getLocalData(REWARDS_KEY,{})
    };
    setLocalData(APP_STATE_KEY,state);return state;
  }
  function migrateAdvancedState(){
    normalizeCustomFoods();
    const existing=getLocalData(APP_STATE_KEY,null);
    if(existing?.schemaVersion>=3)return existing;
    return syncVersionedState();
  }

  function setNutritionView(view){
    document.querySelectorAll('[data-nutrition-view]').forEach(button=>button.classList.toggle('active',button.dataset.nutritionView===view));
    document.querySelectorAll('[data-nutrition-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.nutritionPanel!==view));
    if(view==='diagnostico')renderDiagnosis();
    if(view==='tendencias')renderNutritionTrends();
    if(view==='ajustes'){renderCustomFoods();renderFdcCachedFoods();loadAdvancedTargetFields();loadFdcConfigFields();}
  }
  function renderAdvancedNutrition(){
    renderCoverage();renderDiagnosis();renderNutritionTrends();renderSavedMeals();renderCustomFoods();renderFdcCachedFoods();syncVersionedState();
  }
  window.renderAdvancedNutrition=renderAdvancedNutrition;
  window.advancedNutritionTotals=nutrientTotalsForDate;

  function setupUpdateNotice(){
    if(!('serviceWorker'in navigator))return;
    navigator.serviceWorker.ready.then(registration=>{
      registration.update().catch(()=>{});
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller&&!document.getElementById('updateBanner')){
            const banner=document.createElement('div');banner.id='updateBanner';banner.className='updateBanner';
            banner.innerHTML='<div><strong>Nueva versión disponible</strong><div class="muted small">Actualizá para usar las mejoras sin perder tus datos locales.</div></div><button type="button" class="good">Actualizar</button>';
            banner.querySelector('button').addEventListener('click',()=>location.reload());document.body.appendChild(banner);
          }
        });
      });
    }).catch(()=>{});
  }
  function setupEvents(){
    document.querySelectorAll('[data-nutrition-view]').forEach(button=>button.addEventListener('click',()=>setNutritionView(button.dataset.nutritionView)));
    document.querySelectorAll('[data-open-nutrition-view]').forEach(button=>button.addEventListener('click',()=>setNutritionView(button.dataset.openNutritionView)));
    document.getElementById('nutritionFoodSearch')?.addEventListener('input',filterFoodSelect);
    document.getElementById('searchFdcBtn')?.addEventListener('click',()=>runFdcSearch(1));
    document.getElementById('fdcPrevPageBtn')?.addEventListener('click',()=>runFdcSearch(Math.max(1,fdcSearchPage-1)));
    document.getElementById('fdcNextPageBtn')?.addEventListener('click',()=>runFdcSearch(fdcSearchPage+1));
    document.getElementById('saveFdcConfigBtn')?.addEventListener('click',saveFdcConfig);
    document.getElementById('clearFdcApiKeyBtn')?.addEventListener('click',clearFdcApiKey);
    document.getElementById('importFdcDatasetBtn')?.addEventListener('click',importFdcDataset);
    document.querySelectorAll('[data-food-portion]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('foodQuantity').value=button.dataset.foodPortion;}));
    document.getElementById('useFoodBasePortionBtn')?.addEventListener('click',()=>{const food=allFoods()[Number(document.getElementById('nutritionFood').value)||0];document.getElementById('foodQuantity').value=food?.portionGrams||100;});
    document.getElementById('saveNutritionTargetsBtn')?.addEventListener('click',saveAdvancedTargets);
    document.getElementById('saveFrequentMealBtn')?.addEventListener('click',saveFrequentMeal);
    document.getElementById('loadSavedMealBtn')?.addEventListener('click',loadSavedMeal);
    document.getElementById('deleteSavedMealBtn')?.addEventListener('click',deleteSavedMeal);
    document.getElementById('copyCurrentMealBtn')?.addEventListener('click',copyCurrentMeal);
    document.getElementById('repeatYesterdayMealBtn')?.addEventListener('click',repeatYesterdayMeal);
    document.getElementById('deleteCurrentMealBtn')?.addEventListener('click',deleteCurrentMeal);
    document.getElementById('exportMealsCsvBtn')?.addEventListener('click',exportMealsCsv);
    document.getElementById('exportNutrientsCsvBtn')?.addEventListener('click',exportNutrientsCsv);
    document.getElementById('saveRankingSettingsBtn')?.addEventListener('click',saveRankingSettings);
    document.getElementById('applyReferralBtn')?.addEventListener('click',applyReferral);
    document.getElementById('exportAffiliateCsvBtn')?.addEventListener('click',exportAffiliateCsv);
    document.getElementById('nutritionMeal')?.addEventListener('change',renderNutrition);
    document.addEventListener('click',event=>{
      const edit=event.target.closest('[data-edit-custom-food]');if(edit){editCustomFood(edit.dataset.editCustomFood);return;}
      const remove=event.target.closest('[data-delete-custom-food]');if(remove){setLocalData(CUSTOM_FOODS_KEY,getLocalData(CUSTOM_FOODS_KEY,[]).filter(f=>f.id!==remove.dataset.deleteCustomFood));populateFoods();renderCustomFoods();syncVersionedState();}
      const importFdc=event.target.closest('[data-import-fdc]');if(importFdc){importFdcFood(importFdc.dataset.importFdc);return;}
      const editFdc=event.target.closest('[data-edit-fdc]');if(editFdc){editCachedFdcFood(editFdc.dataset.editFdc);return;}
      const deleteFdc=event.target.closest('[data-delete-fdc]');if(deleteFdc&&FDC){FDC.removeCachedFood(deleteFdc.dataset.deleteFdc);populateFoods();renderFdcCachedFoods();syncVersionedState();flash('Alimento USDA quitado de la caché.');}
    });
  }

  const originalRenderNutrition=renderNutrition;
  renderNutrition=function(){originalRenderNutrition();renderAdvancedNutrition();};
  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();renderAdvancedProgress();syncVersionedState();};

  migrateAdvancedState();
  loadAdvancedTargetFields();
  renderSavedMeals();
  loadFdcConfigFields();
  setupEvents();
  setNutritionView('resumen');
  renderAdvancedNutrition();
  renderAdvancedProgress();
  setupUpdateNotice();
})();
