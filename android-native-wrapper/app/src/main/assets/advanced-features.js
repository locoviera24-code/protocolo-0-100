(function(){
  'use strict';

  const APP_VERSION=window.APP_VERSION_INFO?.version||'desconocida';
  const APP_STATE_KEY='protocolo_0_100_state_v2';
  const SAVED_MEALS_KEY='protocolo_0_100_saved_meals_v1';
  const RECIPES_KEY='protocolo_0_100_recipes_v1';
  const FOOD_PORTIONS_KEY='protocolo_0_100_food_portions_v1';
  const NUTRITION_PROFILE_KEY='protocolo_0_100_nutrition_profile_v1';
  const REFERRAL_CODES_KEY='protocolo_0_100_referral_codes_v1';
  const USER_REFERRAL_KEY='protocolo_0_100_user_referral_v1';
  const COIN_LEDGER_KEY='protocolo_0_100_coin_ledger_v1';
  const RANKING_SETTINGS_KEY='protocolo_0_100_ranking_settings_v1';
  const MONTHLY_RANKINGS_KEY='protocolo_0_100_monthly_rankings_v1';
  const REWARDS_KEY='protocolo_0_100_rewards_v1';
  const GYM_PARTY_BACKUP_FIELDS=['gymPartySettings','gymPartyMembership','sharedWorkoutSessions','sharedWorkoutSets','syncQueue','lastGymPartySyncAt','lastGymPartyRemoteSyncAt','gymPartyDemoData'];
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
  function coverageReportForDate(date,keys){
    const entries=entriesForDate(date),metrics=dateMetrics(date),requested=[...new Set(keys||[])],foodKeys=requested.filter(key=>key!=='water'),base=window.NUTRITION_CONFIDENCE.coverage(entries,foodKeys,{foodResolver:foodForEntry}),rowsByKey=new Map(base.rows.map(row=>[row.key,row]));
    if(requested.includes('water')){
      const reported=Object.prototype.hasOwnProperty.call(metrics,'water'),value=Number(metrics.water)||0,counts={known:reported&&value!==0?1:0,estimated:0,unknown:0,notReported:reported?0:1,confirmedZero:reported&&value===0?1:0},evaluated=counts.known+counts.confirmedZero;
      rowsByKey.set('water',{key:'water',...counts,total:1,evaluated,coveragePct:evaluated?100:0,confidence:evaluated?'high':'insufficient'});
    }
    const rows=requested.map(key=>rowsByKey.get(key)).filter(Boolean),total=rows.reduce((sum,row)=>sum+row.total,0),evaluated=rows.reduce((sum,row)=>sum+row.evaluated,0),coveragePct=total?Math.round(evaluated/total*100):0,counts=rows.reduce((sum,row)=>{window.NUTRITION_CONFIDENCE.STATES.forEach(state=>{sum[state]+=row[state]||0;});return sum;},Object.fromEntries(window.NUTRITION_CONFIDENCE.STATES.map(state=>[state,0])));
    return{rows,coveragePct,confidence:window.NUTRITION_CONFIDENCE.confidenceFor(coveragePct),sampleSize:entries.length,counts};
  }
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
  function nutritionAssessmentForDate(date){
    const entries=entriesForDate(date), metrics=dateMetrics(date);
    const keys=['protein','fiber','potassium','calcium','iron','magnesium','zinc','vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','b12','folate','water'],report=coverageReportForDate(date,keys);
    if(!entries.length && !Object.prototype.hasOwnProperty.call(metrics,'water'))return{report,rawScore:null,presentation:window.NUTRITION_CONFIDENCE.scorePresentation(null,report.confidence)};
    const totals=nutrientTotalsForEntries(entries,metrics), targets=advancedTargets();
    const eligible=report.rows.filter(row=>row.evaluated&&row.coveragePct>=55),coverage=eligible.map(row=>Math.min(100,(totals[row.key]/Math.max(1,targets[row.key]))*100)),rawScore=coverage.length?clamp(coverage.reduce((sum,value)=>sum+value,0)/coverage.length,0,100):null;
    return{report,rawScore,presentation:window.NUTRITION_CONFIDENCE.scorePresentation(rawScore,report.confidence)};
  }
  function nutritionScoreForDate(date){return nutritionAssessmentForDate(date).presentation.score;}
  function nutritionCoverageRows(keys,date){
    const totals=nutrientTotalsForDate(date),targets=advancedTargets(),report=coverageReportForDate(date,keys),rows=new Map(report.rows.map(row=>[row.key,row]));
    return keys.map(key=>{
      const definition=DEFINITIONS[key],data=rows.get(key);if(!definition||!data)return'';
      const value=totals[key]||0,target=Math.max(.01,Number(targets[key])||definition.target||1),knownText=`${data.coveragePct}% de ${data.total} registro(s) con dato`;let width=data.coveragePct;
      if(!data.evaluated)return`<div class="coverageRow unavailable"><div class="coverageTop"><strong>${escapeHtml(definition.label)}</strong><span>No evaluable</span></div><p class="muted small">Desconocido: ${data.unknown}. No informado: ${data.notReported}. No se interpreta como cero.</p><span class="statusChip">Sin datos suficientes</span></div>`;
      if(data.coveragePct<55)return`<div class="coverageRow partial" role="progressbar" aria-label="Cobertura de datos para ${escapeHtml(definition.label)}" aria-valuenow="${data.coveragePct}" aria-valuemin="0" aria-valuemax="100"><div class="coverageTop"><strong>${escapeHtml(definition.label)}</strong><span>${escapeHtml(displayNutrient(key,value))} conocido</span></div><div class="bar"><i style="width:${width}%"></i></div><p class="muted small">${knownText}. Informacion parcial; no se calcula porcentaje de meta.</p><span class="statusChip warn">Informacion parcial</span></div>`;
      const state=coverageState(key,value,target),source=data.estimated?`${data.estimated} estimado(s)`:data.confirmedZero?`${data.confirmedZero} cero(s) confirmado(s)`:'datos conocidos';width=Math.min(100,state.pct);
      return `<div class="coverageRow ${state.key}" role="progressbar" aria-label="${escapeHtml(definition.label)} segun lo registrado" aria-valuenow="${Math.round(state.pct)}" aria-valuemin="0" aria-valuemax="100"><div class="coverageTop"><strong>${escapeHtml(definition.label)}</strong><span>${escapeHtml(displayNutrient(key,value))} / ${escapeHtml(displayNutrient(key,target))} · ${Math.round(state.pct)}%</span></div><div class="bar"><i style="width:${width}%"></i></div><p class="muted small">${knownText} · ${source}.</p><span class="statusChip ${state.key}">${state.label} segun lo registrado</span></div>`;
    }).join('');
  }
  function renderCoverage(){
    const date=document.getElementById('nutritionDate')?.value||todayStr();
    const main=document.getElementById('nutritionCoverageGrid'),extended=document.getElementById('nutritionCoverageExtended'),summary=document.getElementById('nutritionCoverageSummary'),assessment=nutritionAssessmentForDate(date),report=assessment.report,labels={high:'Alta',medium:'Media',low:'Baja',insufficient:'Insuficiente'};
    if(summary){const result=assessment.presentation.kind==='score'?`Score orientativo: ${assessment.presentation.score}/100.`:assessment.presentation.kind==='range'?`Rango orientativo: ${assessment.presentation.range[0]}-${assessment.presentation.range[1]}/100; no se muestra una cifra exacta.`:'No se calcula un score con esta cobertura.';summary.innerHTML=`<div class="quickStats"><div class="quickStat"><span>Cobertura de datos</span><strong>${report.coveragePct}%</strong></div><div class="quickStat"><span>Confianza</span><strong>${labels[report.confidence]}</strong></div><div class="quickStat"><span>Alimentos</span><strong>${report.sampleSize}</strong></div></div><p class="muted small">${result} Conocidos: ${report.counts.known}; estimados: ${report.counts.estimated}; ceros confirmados: ${report.counts.confirmedZero}; desconocidos/no informados: ${report.counts.unknown+report.counts.notReported}.</p>`;}
    if(main) main.innerHTML=nutritionCoverageRows(PRIMARY_COVERAGE,date);
    if(extended) extended.innerHTML=nutritionCoverageRows(EXTENDED_COVERAGE,date);
  }

  function missingNutrients(date){
    const totals=nutrientTotalsForDate(date),targets=advancedTargets(),report=coverageReportForDate(date,Object.keys(SUGGESTION_LABELS)),rows=new Map(report.rows.map(row=>[row.key,row]));
    return Object.keys(SUGGESTION_LABELS).map(key=>({key,value:totals[key]||0,target:targets[key]||1,pct:(totals[key]||0)/(targets[key]||1)*100,data:rows.get(key)})).filter(item=>item.data?.coveragePct>=55&&item.pct<75).sort((a,b)=>a.pct-b.pct);
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
    const entries=entriesForDate(date),totals=nutrientTotalsForDate(date),targets=advancedTargets(),missing=missingNutrients(date),report=coverageReportForDate(date,Object.keys(SUGGESTION_LABELS)),rows=new Map(report.rows.map(row=>[row.key,row]));
    if(!entries.length && !totals.water){
      diagnosis.innerHTML='<div class="emptyState">Registrá alimentos o agua para estimar la cobertura de lo registrado.</div>';
      recommendations.innerHTML=''; combinations.innerHTML=''; return;
    }
    const covered=Object.keys(SUGGESTION_LABELS).filter(key=>rows.get(key)?.coveragePct>=55&&totals[key]>=targets[key]*.8&&totals[key]<=targets[key]*1.4).map(key=>SUGGESTION_LABELS[key]),sodiumCoverage=coverageReportForDate(date,['sodium']).rows[0],sodiumState=sodiumCoverage?.coveragePct>=55?coverageState('sodium',totals.sodium,targets.sodium):null;
    const cards=[];
    if(report.confidence==='insufficient')cards.push('<div class="auditItem warn"><strong>Cobertura insuficiente:</strong> faltan datos nutricionales en los alimentos registrados. No se interpretan los valores desconocidos como cero ni se generan conclusiones precisas.</div>');
    else if(report.confidence==='low')cards.push('<div class="auditItem warn"><strong>Cobertura baja:</strong> las orientaciones se limitan a nutrientes con datos suficientes y no representan el dia completo.</div>');
    if(covered.length) cards.push(`<div class="auditItem good"><strong>Bien cubierto según lo registrado:</strong> ${escapeHtml(covered.slice(0,7).join(', '))}.</div>`);
    missing.slice(0,5).forEach(item=>cards.push(`<div class="auditItem warn"><strong>${escapeHtml(SUGGESTION_LABELS[item.key])} parece bajo según lo registrado (${Math.round(item.pct)}%):</strong> podrías priorizar ${escapeHtml(SPECIFIC_SUGGESTIONS[item.key]||'alimentos variados y poco procesados')}.</div>`));
    if(sodiumState?.key==='review') cards.push('<div class="auditItem warn"><strong>Sodio alto según lo registrado:</strong> conviene priorizar comidas menos procesadas y más alimentos frescos en la próxima elección.</div>');
    const protocol=getEntries().find(e=>e.date===date);
    if(protocol && Number(protocol.anxiety)>=8) cards.push('<div class="auditItem warn"><strong>Mensaje de cuidado:</strong> hoy registraste ansiedad alta. Evitá compensar, restringir o buscar perfección; si la preocupación por comida o cuerpo es intensa, hablá con un adulto o profesional de salud.</div>');
    diagnosis.innerHTML=cards.join('')||'<div class="auditItem good">Los nutrientes evaluables se ven cubiertos según lo registrado. Esto no permite concluir sobre los nutrientes sin datos.</div>';
    const best=scoredFoodsForDate(date).slice(0,5);
    recommendations.innerHTML=missing.length?best.map((item,index)=>{
      const helps=item.helps.map(x=>SUGGESTION_LABELS[x.key]).join(', ')||'variedad nutricional';
      return `<div class="recommendCard"><strong>${index+1}. ${escapeHtml(item.food.name)}</strong><span>Porción orientativa: ${item.food.portionGrams||100} g. Puede ayudar con ${escapeHtml(helps)}.</span><div class="muted small" style="margin-top:6px">${escapeHtml(item.food.confidence)} · ${escapeHtml(item.food.source)}</div></div>`;
    }).join(''):'<div class="emptyState">No hay nutrientes evaluables que requieran una sugerencia concreta.</div>';
    const top=best.map(x=>x.food);
    const light=top.find(f=>f.calories<100)||top[0], complete=top.find(f=>f.protein>=8)||top[0], post=top.find(f=>f.protein>=15)||allDefinedFoods().find(f=>f.id==='chicken-breast');
    combinations.innerHTML=missing.length?[
      ['Opción liviana',light?`${light.name} + una fruta o verdura variada`:'Fruta + verdura variada'],
      ['Opción completa',complete?`${complete.name} + legumbre o cereal + verdura`:'Legumbre + cereal + verdura'],
      ['Opción post-entreno',post?`${post.name} + arroz, papa o banana`:'Proteína real + carbohidrato']
    ].map(([title,text])=>`<div class="recommendCard"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}.<div class="muted small" style="margin-top:5px">Ajustá cantidad a hambre, contexto y objetivos personales.</div></div>`).join(''):'';
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
    const weekTotals=week.map(nutrientTotalsForDate);
    const stats=[
      ['Kcal promedio semanal',Math.round(average(weekTotals.map(t=>t.calories)))],
      ['Proteína promedio',`${Math.round(average(weekTotals.map(t=>t.protein)))} g`],
      ['Fibra promedio',`${round(average(weekTotals.map(t=>t.fiber)))} g`],
      ['Consistencia 30 días',`${registered.length}/30`]
    ];
    box.innerHTML=stats.map(([label,value])=>`<div class="quickStat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    const targets=advancedTargets();
    const nutrientAvg=Object.keys(SUGGESTION_LABELS).map(key=>{const values=week.map((date,index)=>coverageReportForDate(date,[key]).rows[0]?.coveragePct>=55?(weekTotals[index][key]||0)/(targets[key]||1)*100:null).filter(Number.isFinite);return{key,pct:average(values),sampleSize:values.length};}).filter(item=>item.sampleSize).sort((a,b)=>a.pct-b.pct);
    const scored=month.map(date=>({date,score:nutritionScoreForDate(date)})).filter(x=>x.score);
    const best=scored.slice().sort((a,b)=>b.score-a.score)[0],low=scored.slice().sort((a,b)=>a.score-b.score)[0];
    insights.innerHTML=[
      ['Nutriente evaluable a priorizar',nutrientAvg[0]?`${SUGGESTION_LABELS[nutrientAvg[0].key]} · ${Math.round(nutrientAvg[0].pct)}% en ${nutrientAvg[0].sampleSize} dia(s) con datos`:'Faltan registros con datos suficientes'],
      ['Días comparables',best?`Mejor cobertura: ${best.date} (${best.score}/100). Menor: ${low.date} (${low.score}/100).`:'Registrá más días para comparar.'],
      ['Próxima semana',nutrientAvg[0]?`Elegí dos fuentes de ${SUGGESTION_LABELS[nutrientAvg[0].key].toLowerCase()} y repetilas de forma práctica.`:'Priorizá constancia de registro antes que precisión perfecta.']
    ].map(([title,text])=>`<div class="recommendCard"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`).join('');
  }

  function loadAdvancedTargetFields(){
    const targets=advancedTargets();
    Object.entries(TARGET_DOM).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.value=window.APP_NUMBERS?.format?.(targets[key],{maximumFractionDigits:3})??String(targets[key]??'');});
    const metadata=Object.values(targets._meta||{}).filter(item=>item?.updatedAt).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0],root=document.getElementById('nutritionTargetsMeta');
    if(root)root.textContent=metadata?`Origen: valores manuales. Última actualización: ${new Date(metadata.updatedAt).toLocaleString('es-PY')}.`:'Origen: valores manuales. Todavía no se guardaron cambios.';
  }
  function saveAdvancedTargets(){
    const targets=advancedTargets(),next={...targets},metadata={...(targets._meta||{})},updatedAt=new Date().toISOString();
    for(const [key,id] of Object.entries(TARGET_DOM)){
      const input=document.getElementById(id);if(!input)continue;const value=window.APP_NUMBERS?.parse?.(input.value);
      window.APP_INLINE_VALIDATION?.clear?.(input);
      if(value===null||value<0){window.APP_INLINE_VALIDATION?.show?.(input,'Ingresá un número válido mayor o igual a cero.');return;}
      next[key]=value;metadata[key]={value,source:'manual',updatedAt,calculationVersion:'manual-v1'};
    }
    next._meta=metadata;window.NUTRITION_STORE?.saveTargets?.(next)??setLocalData(NUTRITION_TARGETS_KEY,next);
    loadAdvancedTargetFields();renderAdvancedNutrition();syncVersionedState();flash('Objetivos manuales guardados.');
  }
  function loadFdcConfigFields(){
    if(!FDC)return;const value=FDC.config();
    const key=document.getElementById('fdcApiKey'),backend=document.getElementById('fdcBackendUrl'),size=document.getElementById('fdcPageSize');
    if(key)key.value=value.apiKey||'';if(backend)backend.value=value.backendUrl||'';if(size)size.value=value.pageSize||20;
  }
  function renderExpandedSearchStatus(){
    const label=document.getElementById('nutritionExpandedSearchLabel'),description=document.getElementById('nutritionExpandedSearchDescription');if(!label||!description)return;
    if(navigator.onLine===false){label.textContent='Modo offline';description.textContent='Podés usar alimentos guardados, recetas y opciones personales.';return;}
    if(FDC?.hasRemoteAccess?.()){label.textContent='Búsqueda ampliada disponible';description.textContent='La app buscará más opciones automáticamente cuando sea necesario.';return;}
    label.textContent='Búsqueda ampliada no disponible';description.textContent='El buscador local y todos tus alimentos guardados siguen funcionando.';
  }
  async function configureNutritionDiagnostics(){
    const info=await window.APP_BUILD_INFO?.active?.()||{channel:'development'},allowed=window.APP_BUILD_INFO?.diagnosticsAllowed?.(info)??info.channel==='development';
    window.APP_NUTRITION_ALLOW_BROWSER_KEY=allowed;
    document.getElementById('fdcSettingsCard')?.classList.toggle('hidden',!allowed);
    window.__nutritionUnifiedSearch=null;
    renderExpandedSearchStatus();
  }
  function saveFdcConfig(){
    if(!FDC)return;
    FDC.saveConfig({apiKey:document.getElementById('fdcApiKey')?.value||'',backendUrl:document.getElementById('fdcBackendUrl')?.value||'',pageSize:document.getElementById('fdcPageSize')?.value||20});
    configureNutritionDiagnostics();
    flash('Configuración avanzada guardada solo en este dispositivo.');
  }
  function clearFdcApiKey(){
    if(!FDC)return;FDC.saveConfig({...FDC.config(),apiKey:''});loadFdcConfigFields();configureNutritionDiagnostics();flash('API key local eliminada.');
  }
  function nutrientDialogFields(food,fields){return[{name:'name',label:'Nombre',value:food.name,required:true},...Object.entries(fields).map(([name,label])=>({name,label,value:window.APP_NUMBERS?.format?.(food[name]??food.nutrients?.[name]??0,{maximumFractionDigits:3})??String(food[name]??food.nutrients?.[name]??0),type:'text',inputmode:'decimal',validate:value=>{const parsed=window.APP_NUMBERS?.parse?.(value);return parsed!==null&&parsed>=0?'':'Ingresá un número igual o mayor que cero.';}}))];}
  async function editCachedFdcFood(id){
    if(!FDC)return;const food=FDC.cachedFoods().find(item=>item.id===id);if(!food)return;
    const fields={calories:'Calorías/100 g',protein:'Proteína/100 g',carbs:'Carbohidratos/100 g',fat:'Grasas/100 g',fiber:'Fibra/100 g',sodium:'Sodio mg/100 g',potassium:'Potasio mg/100 g',calcium:'Calcio mg/100 g',iron:'Hierro mg/100 g',vitaminC:'Vitamina C mg/100 g'};
    const values=await window.APP_FORM_DIALOG.ask({title:'Editar alimento USDA',message:'Los cambios quedan solo en la caché de este dispositivo.',fieldList:nutrientDialogFields(food,fields)});if(!values)return;
    const name=values.name.trim(),updated={name,aliases:[name,food.description,food.brandOwner].filter(Boolean)};Object.keys(fields).forEach(key=>{updated[key]=Math.max(0,window.APP_NUMBERS.parseOr(values[key],0));});
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
  async function saveFrequentMeal(){
    const items=currentMealEntries(); if(!items.length){flash('Registrá al menos un alimento en esta comida.');return;}
    const suggested=`${document.getElementById('nutritionMeal').value} frecuente`;
    const values=await window.APP_FORM_DIALOG.ask({title:'Guardar comida frecuente',fieldList:[{name:'name',label:'Nombre',value:suggested,required:true}]});if(!values)return;const name=values.name.trim();
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
  async function copyCurrentMeal(){
    const items=currentMealEntries();
    if(!items.length){flash('No hay alimentos en esta comida para copiar.');return;}
    const values=await window.APP_FORM_DIALOG.ask({title:'Copiar comida',fieldList:[{name:'date',label:'Fecha destino',type:'date',value:todayStr(),required:true,validate:value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(parseDate(value).getTime())?'':'Elegí una fecha válida.'}]});if(!values)return;const target=values.date;
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
  window.renderSavedMeals=renderSavedMeals;
  function ensureCustomFoodShape(food,index){
    const nutrientKeys=Object.keys(DEFINITIONS);
    const nutrients={};
    nutrientKeys.forEach(key=>{if(!['calories','protein','carbs','fat','water'].includes(key))nutrients[key]=window.APP_NUMBERS?.parseOr?.(food[key]??food.nutrients?.[key],0)??0;});
    const reportedNutrients=Array.isArray(food.reportedNutrients)?food.reportedNutrients.filter(key=>key in nutrients):Object.keys(nutrients).filter(key=>Number(nutrients[key])!==0);
    return {...food,id:food.id||`custom-${normalizeFoodText(food.name).replace(/\s+/g,'-')||index}`,aliases:[...new Set([String(food.name||'').trim(),...(food.aliases||[]).map(alias=>String(alias).trim()).filter(Boolean)])],category:food.category||'personalizados',portionGrams:Math.max(.1,window.APP_NUMBERS?.parseOr?.(food.portionGrams,100)??100),confidence:food.confidence||'aproximado',source:food.source||'etiqueta manual',archived:!!food.archived,nutrients,reportedNutrients,...nutrients,custom:true};
  }
  function normalizeCustomFoods(){
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]).map(ensureCustomFoodShape);
    setLocalData(CUSTOM_FOODS_KEY,foods);
  }
  async function editCustomFood(id){
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]),index=foods.findIndex(f=>f.id===id);if(index<0)return;
    const food=foods[index];
    const fields={calories:'Calorías/100 g',protein:'Proteína/100 g',carbs:'Carbohidratos/100 g',fat:'Grasas/100 g',fiber:'Fibra/100 g',sodium:'Sodio mg/100 g',calcium:'Calcio mg/100 g',iron:'Hierro mg/100 g',vitaminC:'Vitamina C mg/100 g'};
    const fieldList=[...nutrientDialogFields(food,fields),{name:'portionGrams',label:'Porción base (g)',value:window.APP_NUMBERS.format(food.portionGrams||100),inputmode:'decimal',validate:value=>window.APP_NUMBERS.parse(value)>0?'':'Ingresá una porción mayor que cero.'},{name:'source',label:'Fuente o etiqueta',value:food.source||''},{name:'confidence',label:'Confianza',value:food.confidence||'aproximado',options:[{value:'alto',label:'Alta'},{value:'medio',label:'Media'},{value:'aproximado',label:'Aproximada'},{value:'desconocido',label:'Desconocida'}]},{name:'aliases',label:'Aliases separados por coma',value:(food.aliases||[]).filter(alias=>normalizeFoodText(alias)!==normalizeFoodText(food.name)).join(', ')}];
    const values=await window.APP_FORM_DIALOG.ask({title:'Editar alimento personalizado',message:'Las entradas históricas conservan su valor registrado.',fieldList});if(!values)return;
    const nameKey=normalizeFoodText(values.name),duplicate=foods.find(item=>item.id!==id&&(normalizeFoodText(item.name)===nameKey||(item.aliases||[]).some(alias=>normalizeFoodText(alias)===nameKey)));if(duplicate){flash(`Ya existe ${duplicate.name}. Usá Fusionar si representan el mismo alimento.`,{tone:'warning'});return;}
    const updated={...food,name:values.name.trim(),portionGrams:window.APP_NUMBERS.parseOr(values.portionGrams,100),source:values.source.trim()||'etiqueta manual',confidence:values.confidence,aliases:[values.name.trim(),...values.aliases.split(',').map(alias=>alias.trim()).filter(Boolean)]},reported=new Set(food.reportedNutrients||[]);Object.keys(fields).forEach(key=>{updated[key]=Math.max(0,window.APP_NUMBERS.parseOr(values[key],0));if(!['calories','protein','carbs','fat'].includes(key)&&String(values[key]).trim())reported.add(key);});updated.reportedNutrients=[...reported];
    foods[index]=ensureCustomFoodShape(updated,index);setLocalData(CUSTOM_FOODS_KEY,foods);populateFoods();renderCustomFoods();renderAdvancedNutrition();syncVersionedState();
  }
  function refreshCustomFoods(foods){setLocalData(CUSTOM_FOODS_KEY,foods);populateFoods();renderCustomFoods();renderAdvancedNutrition();syncVersionedState();}
  async function mergeCustomFood(id){
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]),source=foods.find(food=>food.id===id),targets=foods.filter(food=>food.id!==id);if(!source||!targets.length){flash('Necesitás otro alimento personalizado para fusionar.',{tone:'warning'});return;}
    const values=await window.APP_FORM_DIALOG.ask({title:'Fusionar alimento',message:'Elegí el alimento canónico. Los valores históricos no se recalculan.',submitLabel:'Revisar fusión',fieldList:[{name:'targetId',label:'Conservar como canónico',options:targets.map(food=>({value:food.id,label:food.name}))}]});if(!values)return;
    const target=foods.find(food=>food.id===values.targetId);if(!target)return;const confirmed=await window.APP_CONFIRMATION.ask({title:'Confirmar fusión',message:`${source.name} se convertirá en alias de ${target.name}. Las entradas previas conservarán calorías y nutrientes.`,confirmLabel:'Fusionar'});if(!confirmed)return;
    const previousFoods=structuredClone(foods),previousEntries=structuredClone(getLocalData(NUTRITION_ENTRIES_KEY,[])),merged=ensureCustomFoodShape({...target,aliases:[...(target.aliases||[]),source.name,...(source.aliases||[])],legacyIds:[...(target.legacyIds||[]),source.id]},foods.indexOf(target)),nextFoods=foods.filter(food=>food.id!==source.id).map(food=>food.id===target.id?merged:food),nextEntries=previousEntries.map(entry=>entry.foodId===source.id?{...entry,foodId:target.id}:entry);
    setLocalData(NUTRITION_ENTRIES_KEY,nextEntries);refreshCustomFoods(nextFoods);flash('Alimentos fusionados.',{actionLabel:'Deshacer',duration:8000,onAction:()=>{setLocalData(NUTRITION_ENTRIES_KEY,previousEntries);refreshCustomFoods(previousFoods);}});
  }
  async function handleCustomFoodAction(button){
    const id=button.dataset.customFoodId,action=button.dataset.customFoodAction,foods=getLocalData(CUSTOM_FOODS_KEY,[]),index=foods.findIndex(food=>food.id===id);if(index<0)return;const food=foods[index];
    if(action==='edit'){editCustomFood(id);return;}if(action==='merge'){mergeCustomFood(id);return;}
    if(action==='duplicate'){const copy=ensureCustomFoodShape({...food,id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name:`${food.name} (copia)`,aliases:[],archived:false},foods.length);refreshCustomFoods([...foods,copy]);flash('Alimento duplicado como plantilla.');return;}
    if(action==='archive'||action==='restore'){foods[index]={...food,archived:action==='archive'};refreshCustomFoods(foods);flash(action==='archive'?'Alimento archivado.':'Alimento restaurado.');return;}
    if(action==='delete'){const confirmed=await window.APP_CONFIRMATION.ask({title:'Eliminar alimento personalizado',message:'Los registros históricos conservarán sus valores. Esta definición dejará de estar disponible.',confirmLabel:'Eliminar',danger:true});if(!confirmed)return;const snapshot=structuredClone(foods);refreshCustomFoods(foods.filter(item=>item.id!==id));flash('Alimento personalizado eliminado.',{actionLabel:'Deshacer',duration:7000,onAction:()=>refreshCustomFoods(snapshot)});}
  }
  function renderCustomFoods(){
    const box=document.getElementById('customFoodsList');if(!box)return;
    const openMenuId=box.querySelector('details.nutritionFoodMenu[open]')?.dataset.customFoodMenu||'';
    const foods=getLocalData(CUSTOM_FOODS_KEY,[]);
    box.innerHTML=foods.length?foods.map(food=>`<div class="entryRow ${food.archived?'muted':''}"><div><strong>${escapeHtml(food.name)}</strong><div class="meta">${food.calories||0} kcal · P ${food.protein||0} · C ${food.carbs||0} · G ${food.fat||0} · ${escapeHtml(food.source||'etiqueta manual')}${food.archived?' · archivado':''}</div></div><details class="nutritionFoodMenu" data-custom-food-menu="${escapeHtml(food.id)}"><summary aria-label="Opciones para ${escapeHtml(food.name)}">Opciones</summary><div class="nutritionFoodMenuPanel" role="menu"><button type="button" role="menuitem" data-custom-food-action="edit" data-custom-food-id="${escapeHtml(food.id)}">Editar</button><button type="button" role="menuitem" data-custom-food-action="duplicate" data-custom-food-id="${escapeHtml(food.id)}">Duplicar / usar como plantilla</button><button type="button" role="menuitem" data-custom-food-action="merge" data-custom-food-id="${escapeHtml(food.id)}">Fusionar duplicado</button><button type="button" role="menuitem" data-custom-food-action="${food.archived?'restore':'archive'}" data-custom-food-id="${escapeHtml(food.id)}">${food.archived?'Restaurar':'Archivar'}</button><button type="button" class="dangerText" role="menuitem" data-custom-food-action="delete" data-custom-food-id="${escapeHtml(food.id)}">Eliminar</button></div></details></div>`).join(''):'<div class="emptyState">Todavía no creaste alimentos personalizados.</div>';
    if(openMenuId)box.querySelectorAll('details.nutritionFoodMenu').forEach(menu=>{if(menu.dataset.customFoodMenu===openMenuId)menu.open=true;});
  }

  function coinLedgerCandidates(){
    const ledger=[],push=(id,date,amount,reason,occurredAt='')=>ledger.push({id,date,amount,reason,occurredAt});
    getEntries().forEach(entry=>{
      push(`day-${entry.date}`,entry.date,5,'Registrar el día',entry.savedAt);
      if(entry.keyActionDone)push(`action-${entry.date}`,entry.date,5,'Cumplir acción clave',entry.savedAt);
      if(entry.score>=70)push(`score70-${entry.date}`,entry.date,3,'Score ≥70',entry.savedAt);
      if(entry.score>=80)push(`score80-${entry.date}`,entry.date,3,'Estabilidad ≥80',entry.savedAt);
      if(entry.score>=90)push(`score90-${entry.date}`,entry.date,4,'Día ≥90 sin buscar perfección',entry.savedAt);
      if(entry.stableSchedule&&entry.sleepHours>=7)push(`sleep-${entry.date}`,entry.date,2,'Sueño estable y suficiente',entry.savedAt);
    });
    getLocalData(GYM_SESSIONS_KEY,[]).forEach(session=>push(`gym-${session.id}`,session.date,4,'Registrar entrenamiento',session.startedAt));
    const nutritionByDate=new Map();getLocalData(NUTRITION_ENTRIES_KEY,[]).forEach(entry=>{const current=nutritionByDate.get(entry.date)||'';if(String(entry.savedAt||'')>current)nutritionByDate.set(entry.date,String(entry.savedAt||''));});
    nutritionByDate.forEach((occurredAt,date)=>{if(nutritionScoreForDate(date)>=70)push(`nutrition-${date}`,date,5,'Nutrición consistente',occurredAt);});
    const weeks={};getEntries().forEach(entry=>{const week=weekStartStr(entry.date);weeks[week]??=[];weeks[week].push(entry);});
    Object.entries(weeks).forEach(([week,items])=>{const occurredAt=items.map(item=>String(item.savedAt||'')).sort().at(-1)||'';if(items.filter(x=>x.readingMins>=20).length>=5)push(`reading-week-${week}`,week,12,'Lectura 5/7',occurredAt);if(items.length>=7)push(`streak-week-${week}`,week,15,'Racha semanal de registro',occurredAt);});
    return ledger.sort((a,b)=>b.date.localeCompare(a.date));
  }
  function rebuildCoinLedger({allowNew=false}={}){
    const stored=getLocalData(COIN_LEDGER_KEY,[]);if(!allowNew)return stored;
    const preferences=getLocalData('protocolo_0_100_ui_preferences_v1',{}),enabledAt=String(preferences.experimentalFeaturesEnabledAt||''),enabledDate=enabledAt.slice(0,10),known=new Set(stored.map(item=>item.id)),candidates=coinLedgerCandidates();
    const additions=enabledDate?candidates.filter(item=>!known.has(item.id)&&(String(item.date)>enabledDate||(String(item.date)===enabledDate&&String(item.occurredAt||'')>enabledAt))).map(({occurredAt,...item})=>item):[],ledger=[...stored,...additions].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(additions.length)setLocalData(COIN_LEDGER_KEY,ledger);
    return ledger;
  }
  function hasExperimentalHistory(){
    const ledger=getLocalData(COIN_LEDGER_KEY,[]),rewards=getLocalData(REWARDS_KEY,{}),rankings=getLocalData(MONTHLY_RANKINGS_KEY,{}),rankingSettings=getLocalData(RANKING_SETTINGS_KEY,{}),referral=getLocalData(USER_REFERRAL_KEY,null);
    return ledger.length>0||Object.keys(rewards||{}).length>0||Object.keys(rankings||{}).length>0||Object.keys(rankingSettings||{}).length>0||!!referral;
  }
  window.hasExperimentalHistory=hasExperimentalHistory;
  window.renderExperimentalControls?.();
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
  function renderCoinsAndRewards({updateRewards=false}={}){
    const ledger=rebuildCoinLedger({allowNew:updateRewards}),balance=ledger.reduce((sum,x)=>sum+x.amount,0);
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
  function renderExperimentalFeaturesData({updateRewards=false}={}){
    if(!window.isExperimentalFeaturesEnabled?.())return false;
    renderCoinsAndRewards({updateRewards});renderRankings();renderReferral();return true;
  }
  window.renderIntegralScore=renderIntegralScore;
  window.renderExperimentalFeaturesData=renderExperimentalFeaturesData;
  function renderAdvancedProgress(){
    if(window.APP_ROUTER?.current?.()?.module==='progress'&&window.PROGRESS_VIEW?.current?.()==='overview')renderIntegralScore();
    window.PROGRESS_VIEW?.render?.();syncVersionedState();
  }
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
    const payload={appVersion:window.APP_VERSION_INFO?.version||'unknown',updatedAt:new Date().toISOString(),settings:{activeModule:localStorage.getItem(ACTIVE_MODULE_KEY)||'home',nutritionProfile:nutritionProfile(),ranking:getLocalData(RANKING_SETTINGS_KEY,{alias:'Anónimo 0→100',optIn:false})},exportedAt:new Date().toISOString()};
    if(!window.BACKUP_SERVICE?.buildExport)throw new Error('El servicio de backup no está disponible. No se generó una copia incompleta.');
    return window.BACKUP_SERVICE.buildExport(payload);
  }
  window.buildCompleteBackup=buildCompleteBackup;
  function importCompleteBackupData(data){
    if(!window.BACKUP_SERVICE||!window.APP_DATA)return Promise.reject(new Error('El servicio de importacion no esta disponible. No se modificaron datos.'));
    const prepared=window.BACKUP_SERVICE.prepareText(JSON.stringify(data),{fileName:'importacion-interna.json'});
    return window.BACKUP_SERVICE.apply(prepared).then(result=>{window.refreshAfterBackupImport?.();return result;});
  }
  window.importCompleteBackupData=importCompleteBackupData;
  function syncVersionedState(){
    // Future API: this object is the client-side contract ready to sync with a backend.
    const workoutKeys=window.WORKOUT_FEATURES?.keys||{};
    const gymPartyState=window.GYM_PARTY_FEATURES?.exportState?.()||{};
    const state={
      schemaVersion:3,appVersion:APP_VERSION,updatedAt:new Date().toISOString(),
      settings:{activeModule:localStorage.getItem(ACTIVE_MODULE_KEY)||'protocolo',nutritionProfile:nutritionProfile(),ranking:getLocalData(RANKING_SETTINGS_KEY,{alias:'Anónimo 0→100',optIn:false})},
      dailyLogs:getEntries(),gymSessions:getLocalData(GYM_SESSIONS_KEY,[]),meals:getLocalData(NUTRITION_ENTRIES_KEY,[]),
      weeklyWorkoutPlan:getLocalData(workoutKeys.weeklyWorkoutPlan||'protocolo_0_100_weekly_workout_plan_v1',null),
      workoutSessions:getLocalData(workoutKeys.workoutSessions||'protocolo_0_100_workout_sessions_v1',[]),
      exerciseHistory:getLocalData(workoutKeys.exerciseHistory||'protocolo_0_100_exercise_history_v1',{}),
      exerciseLibrary:getLocalData(workoutKeys.exerciseLibrary||'protocolo_0_100_exercise_library_v1',[]),
      exerciseLibraryMeta:getLocalData(workoutKeys.exerciseLibraryMeta||'protocolo_0_100_exercise_library_meta_v1',null),
      exercisePreferences:getLocalData(workoutKeys.exercisePreferences||'protocolo_0_100_exercise_preferences_v1',{schemaVersion:1,exercises:{}}),
      gymSettings:getLocalData(workoutKeys.gymSettings||'protocolo_0_100_gym_settings_v1',{}),
      workoutWidgetState:getLocalData(workoutKeys.workoutWidgetState||'protocolo_0_100_workout_widget_state_v1',null),
      customFoods:getLocalData(CUSTOM_FOODS_KEY,[]),cachedFdcFoods:FDC?.cachedFoods?.()||[],nutritionTargets:advancedTargets(),bodyMetrics:getLocalData(BODY_METRICS_KEY,{}),uiPreferences:getLocalData('protocolo_0_100_ui_preferences_v1',{}),
      savedMeals:getLocalData(SAVED_MEALS_KEY,[]),recipes:getLocalData(RECIPES_KEY,[]),foodPortions:getLocalData(FOOD_PORTIONS_KEY,{}),referralCodes:referralCodes(),userReferral:getLocalData(USER_REFERRAL_KEY,null),
      coinLedger:getLocalData(COIN_LEDGER_KEY,[]),monthlyRankings:getLocalData(MONTHLY_RANKINGS_KEY,{}),rewards:getLocalData(REWARDS_KEY,{}),
      ...gymPartyState
    };
    setLocalData(APP_STATE_KEY,state);return state;
  }
  function migrateAdvancedState(){
    normalizeCustomFoods();
    const existing=getLocalData(APP_STATE_KEY,null);
    if(existing?.schemaVersion>=3)return existing;
    return syncVersionedState();
  }

  function setNutritionView(view,{focus=false}={}){
    const activeView=view==='coverage'?'resumen':view;
    document.querySelectorAll('[data-nutrition-view]').forEach(button=>button.classList.toggle('active',button.dataset.nutritionView===activeView));
    document.querySelectorAll('[data-nutrition-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.nutritionPanel!==view));
    if(view==='coverage'){renderCoverage();renderDiagnosis();}
    if(view==='tendencias')renderNutritionTrends();
    if(focus)requestAnimationFrame(()=>{const targetId={resumen:'nutritionTodayCard',registrar:'nutritionBuilderCard',coverage:'nutritionCoverageCard',tendencias:'nutritionTrendsCard',library:'nutritionRecipesCard'}[view],target=document.getElementById(targetId);target?.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const heading=target?.querySelector('h2,h3,h4');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
  }
  window.setNutritionView=setNutritionView;
  function renderAdvancedNutrition(){
    renderCoverage();renderDiagnosis();renderNutritionTrends();renderSavedMeals();renderCustomFoods();renderFdcCachedFoods();syncVersionedState();
  }
  window.renderAdvancedNutrition=renderAdvancedNutrition;
  window.advancedNutritionTotals=nutrientTotalsForDate;

  function setupUpdateNotice(){
    if(!('serviceWorker'in navigator)||location.hostname==='appassets.androidplatform.net'||document.documentElement.dataset.safeMode==='true')return;
    const showUpdate=(registration,worker)=>{
      if(!worker)return;
      window.APP_NOTIFICATIONS?.showBanner?.({id:'pwa-update',title:'Nueva version disponible',message:'Actualiza sin perder tus datos locales.',tone:'success',priority:50,actionLabel:'Actualizar ahora',onAction:async button=>{
        button.disabled=true;
        const result=await window.APP_BUILD_INFO?.activate?.(registration,worker);
        if(result?.ok)return;
        button.disabled=false;
        window.APP_NOTIFICATIONS?.showSnackbar?.(result?.reasons?.[0]||'Guarda los cambios antes de actualizar.',{tone:'warning',duration:6000});
      }});
    };
    navigator.serviceWorker.ready.then(registration=>{
      registration.update().catch(()=>{});
      if(registration.waiting)showUpdate(registration,registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(registration,worker);
        });
      });
    }).catch(()=>{});
  }
  function setupEvents(){
    document.querySelectorAll('[data-nutrition-view]').forEach(button=>button.addEventListener('click',()=>setNutritionView(button.dataset.nutritionView,{focus:true})));
    document.querySelectorAll('[data-open-nutrition-view]').forEach(button=>button.addEventListener('click',()=>setNutritionView(button.dataset.openNutritionView,{focus:true})));
    document.querySelectorAll('[data-open-nutrition-library]').forEach(button=>button.addEventListener('click',()=>{window.APP_ROUTER?.navigate?.({module:'nutrition',view:'meals'});setNutritionView('library',{focus:true});}));
    document.getElementById('saveFdcConfigBtn')?.addEventListener('click',saveFdcConfig);
    document.getElementById('clearFdcApiKeyBtn')?.addEventListener('click',clearFdcApiKey);
    document.getElementById('importFdcDatasetBtn')?.addEventListener('click',importFdcDataset);
    document.querySelectorAll('[data-food-portion]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('foodQuantity').value=button.dataset.foodPortion;document.getElementById('foodUnit').value='g';}));
    document.getElementById('useFoodBasePortionBtn')?.addEventListener('click',()=>{const food=allFoods()[Number(document.getElementById('nutritionFood').value)||0];document.getElementById('foodQuantity').value=food?.portionGrams||100;document.getElementById('foodUnit').value='g';});
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
    window.addEventListener('online',renderExpandedSearchStatus);
    window.addEventListener('offline',renderExpandedSearchStatus);
    window.addEventListener('app-data-change',event=>{
      if(!window.isExperimentalFeaturesEnabled?.()||!['protocol','workout','nutrition','import'].includes(event.detail?.domain))return;
      renderExperimentalFeaturesData({updateRewards:true});
    });
    document.addEventListener('click',event=>{
      const customAction=event.target.closest('[data-custom-food-action]');if(customAction){customAction.closest('details.nutritionFoodMenu')?.removeAttribute('open');handleCustomFoodAction(customAction);return;}
      const editFdc=event.target.closest('[data-edit-fdc]');if(editFdc){editCachedFdcFood(editFdc.dataset.editFdc);return;}
      const deleteFdc=event.target.closest('[data-delete-fdc]');if(deleteFdc&&FDC){FDC.removeCachedFood(deleteFdc.dataset.deleteFdc);populateFoods();renderFdcCachedFoods();syncVersionedState();flash('Alimento USDA quitado de la caché.');}
    });
  }

  const originalRenderNutrition=renderNutrition;
  renderNutrition=function(){return window.APP_ERROR_BOUNDARY?.guard(()=>{originalRenderNutrition();renderAdvancedNutrition();},{area:'nutrition-render',fatal:true})};
  const originalRenderAll=renderAll;
  renderAll=function(){return window.APP_ERROR_BOUNDARY?.guard(()=>{originalRenderAll();renderAdvancedProgress();syncVersionedState();},{area:'app-render',fatal:true})};

  migrateAdvancedState();
  loadAdvancedTargetFields();
  renderSavedMeals();
  loadFdcConfigFields();
  configureNutritionDiagnostics();
  setupEvents();
  const restoredNutritionDraft=window.restoreNutritionFoodDraft?.({announce:false})===true;
  setNutritionView(restoredNutritionDraft&&document.getElementById('customFoodDetails')?.open?'library':restoredNutritionDraft?'registrar':'resumen');
  renderAdvancedNutrition();
  renderAdvancedProgress();
  setupUpdateNotice();
})();
