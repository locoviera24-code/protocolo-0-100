(function(){
  'use strict';

  const registry=window.APP_SCHEMA_REGISTRY;
  const NUTRITION_KEY=registry?.getByName('nutrition','entries')?.key;
  const views=new Set(['overview','habits','gym','nutrition','history','achievements']);
  const muscleMapTargets=[
    {id:'chest',x:50,y:31},{id:'lats',x:150,y:39},{id:'upper-back',x:150,y:29},{id:'traps',x:150,y:22},
    {id:'front-delts',x:35,y:30},{id:'side-delts',x:30,y:34},{id:'rear-delts',x:130,y:32},
    {id:'biceps',x:26,y:45},{id:'brachialis',x:24,y:52},{id:'triceps',x:174,y:45},{id:'forearms',x:25,y:66},
    {id:'core',x:50,y:54},{id:'lower-back',x:150,y:56},{id:'glutes',x:150,y:71},
    {id:'quads',x:42,y:83},{id:'hamstrings',x:142,y:84},{id:'adductors',x:50,y:80},{id:'abductors',x:35,y:75},
    {id:'calves',x:144,y:99},{id:'tibialis',x:58,y:96}
  ];
  let activeView='overview';
  const viewState=Object.fromEntries([...views].map(view=>[view,{rendered:false,dirty:true}]));

  function read(key,fallback){
    return window.APP_REPOSITORIES?.forKey?.(key)?.get(key,fallback)??window.APP_DATA?.read?.(key,fallback)??fallback;
  }
  function escape(value){
    return String(value??'').replace(/[&<>"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
  }
  function number(value){return Number.isFinite(Number(value))?Number(value):0;}
  function average(values){return values.length?values.reduce((sum,value)=>sum+number(value),0)/values.length:null;}
  function round(value){return value===null||value===undefined?'—':String(Math.round(value));}
  function localDate(value){const [year,month,day]=String(value||'').split('-').map(Number);return new Date(year,Math.max(0,(month||1)-1),day||1);}
  function daysAgo(date,days){const value=localDate(date);value.setDate(value.getDate()-days);return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
  function today(){const value=new Date();return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
  function selectedDays(){const value=document.getElementById('progressPeriod')?.value||'30';return value==='all'?36500:Math.max(1,number(value));}
  function within(date,days=selectedDays()){return String(date||'')>=daysAgo(today(),days-1)&&String(date||'')<=today();}
  function previousWindow(date,days=selectedDays()){
    if(days>10000)return false;
    return String(date||'')>=daysAgo(today(),days*2-1)&&String(date||'')<daysAgo(today(),days-1);
  }
  function protocolEntries(){return (window.getEntries?.()||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));}
  function workoutSessions(){
    const key=window.WORKOUT_FEATURES?.keys?.workoutSessions||registry?.getByName('workout','sessions')?.key;
    return read(key,[]);
  }
  function nutritionEntries(){return read(NUTRITION_KEY,[]);}
  function progressRoute(){return window.APP_ROUTER?.current?.()?.module==='progress';}
  function comparableGymSessions(){
    const rows=window.GYM_PROGRESS_MODEL?.flatten?.(workoutSessions(),window.WORKOUT_FEATURES?.getExerciseLibrary?.()||[])||[],groups=new Map();
    rows.forEach(row=>row.sets.filter(set=>set.completed!==false&&set.progressionEligible!==false&&set.mainVolume!==false).forEach(set=>{
      const key=[row.exerciseId,set.comparisonKey||[set.measurementMode,set.loadMode].join('|')].join('|'),sessions=groups.get(key)||new Set();
      sessions.add(row.sessionId);groups.set(key,sessions);
    }));
    return Math.max(0,...[...groups.values()].map(sessions=>sessions.size));
  }
  function emptyState(view){
    if(view==='habits'){
      const count=new Set(protocolEntries().map(entry=>entry.date).filter(Boolean)).size;
      return count<3?{count,needed:3-count,text:'Registrá 3 días para comparar una tendencia.',action:'Registrar hoy',module:'home',routeView:'register'}:null;
    }
    if(view==='gym'){
      const count=comparableGymSessions();
      return count<2?{count,needed:2-count,text:'Guardá al menos 2 sesiones del mismo ejercicio.',action:'Empezar entrenamiento',module:'gym',routeView:'train'}:null;
    }
    if(view==='nutrition'){
      const count=new Set(nutritionEntries().map(entry=>entry.date).filter(Boolean)).size;
      return count<3?{count,needed:3-count,text:'Registrá comidas en 3 días para ver promedios.',action:'Agregar alimento',module:'nutrition',routeView:'meals'}:null;
    }
    return null;
  }
  function renderEmptyState(view){
    const panel=document.querySelector('[data-progress-panel="'+view+'"]'),box=panel?.querySelector('[data-progress-empty="'+view+'"]'),state=emptyState(view);
    if(!panel||!box)return false;
    panel.dataset.insufficient=String(!!state);box.classList.toggle('hidden',!state);
    box.innerHTML=state?'<h3>'+escape(state.text)+'</h3><p class="muted small">Faltan '+state.needed+' registro(s) comparable(s). Cuando estén disponibles, vas a ver tendencias sin mezclar modos o equipos incompatibles.</p><button type="button" class="primary" data-progress-empty-action data-module="'+state.module+'" data-view="'+state.routeView+'">'+escape(state.action)+'</button>':'';
    return !!state;
  }
  function sessionMetrics(session){
    if(Array.isArray(session.exercises))return window.WORKOUT_METRICS?.calculateSessionMetrics?.(session)||{};
    const items=session.items||[];
    return {totalSets:items.reduce((sum,item)=>sum+number(item.sets),0),totalReps:items.reduce((sum,item)=>sum+number(item.sets)*number(item.reps),0),externalLoadVolume:number(session.volume)||items.reduce((sum,item)=>sum+number(item.sets)*number(item.reps)*number(item.weight),0)};
  }
  function weeklyKey(date){
    const value=localDate(date),weekday=(value.getDay()+6)%7;value.setDate(value.getDate()-weekday);
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  }
  function groupByWeek(rows,dateOf,metricsOf){
    const groups=new Map();
    rows.forEach(row=>{
      const key=weeklyKey(dateOf(row));
      const current=groups.get(key)||{label:key,sessions:0,sets:0,volume:0,scoreValues:[],days:new Set()};
      const metrics=metricsOf(row)||{};
      current.sessions+=number(metrics.sessions);
      current.sets+=number(metrics.sets);
      current.volume+=number(metrics.volume);
      if(metrics.score!==undefined)current.scoreValues.push(number(metrics.score));
      current.days.add(dateOf(row));groups.set(key,current);
    });
    return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label));
  }
  function percentChange(current,previous){return previous?Math.round(((current-previous)/previous)*100):null;}
  function deltaLabel(current,previous){const delta=percentChange(current,previous);return delta===null?'Sin período anterior':`${delta>0?'+':''}${delta}% vs anterior`;}
  function observedPeriodDays(){const dates=[...protocolEntries().map(item=>item.date),...workoutSessions().map(item=>item.date),...nutritionEntries().map(item=>item.date)].filter(Boolean).sort();if(!dates.length)return 1;return Math.max(1,Math.round((localDate(dates[dates.length-1])-localDate(dates[0]))/86400000)+1);}
  function plannedGymDays(){const key=window.WORKOUT_FEATURES?.keys?.weeklyWorkoutPlan||registry?.getByName('workout','weeklyPlan')?.key,fallback=window.WORKOUT_FEATURES?.defaultWeeklyPlan||{},plan=read(key,fallback);return Math.max(1,Object.values(plan||{}).filter(day=>day?.type!=='rest'&&(day?.exercises||[]).length).length||3);}
  function kpi(label,value,detail){return `<article class="progressKpi"><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(detail)}</small></article>`;}
  function barRows(rows,{value,label,detail,display,max,empty='Todavía no hay datos comparables.'}){
    if(!rows.length)return `<div class="emptyState">${escape(empty)}</div>`;
    const limit=Math.max(1,max?max(rows):Math.max(...rows.map(value)));
    return `<div class="analyticsBars" role="img" aria-label="Gráfico de barras. ${escape(rows.map(row=>`${label(row)}: ${display(row)}`).join('. '))}">${rows.map(row=>{
      const raw=Math.max(0,number(value(row))),normalized=Math.min(100,(raw/limit)*100);
      return `<div class="analyticsBarRow"><div><strong>${escape(label(row))}</strong><span>${escape(detail(row))}</span></div><progress max="100" value="${normalized.toFixed(1)}" aria-label="${escape(`${label(row)}: ${display(row)}`)}"></progress><b>${escape(display(row))}</b></div>`;
    }).join('')}</div>`;
  }
  function areaModels(days){
    const protocolCurrent=protocolEntries().filter(entry=>within(entry.date,days));
    const protocolPrevious=protocolEntries().filter(entry=>previousWindow(entry.date,days));
    const gymCurrent=workoutSessions().filter(session=>within(session.date,days));
    const gymPrevious=workoutSessions().filter(session=>previousWindow(session.date,days));
    const nutritionDates=new Set(nutritionEntries().filter(entry=>within(entry.date,days)).map(entry=>entry.date));
    const nutritionPreviousDates=new Set(nutritionEntries().filter(entry=>previousWindow(entry.date,days)).map(entry=>entry.date));
    const windowDays=days>10000?observedPeriodDays():days,expectedGym=Math.max(1,Math.round((windowDays/7)*plannedGymDays())),habitTrend=average(protocolCurrent.map(entry=>entry.score)),habitPrevious=average(protocolPrevious.map(entry=>entry.score));
    return [
      {id:'habits',name:'Hábitos',coverage:protocolCurrent.length?Math.min(100,(protocolCurrent.length/windowDays)*100):null,samples:protocolCurrent.length,trend:habitTrend===null||habitPrevious===null?null:Math.round((habitTrend-habitPrevious)*10)/10,detail:`${protocolCurrent.length} de ${windowDays} día(s) registrados`},
      {id:'gym',name:'Gym',coverage:gymCurrent.length?Math.min(100,(gymCurrent.length/expectedGym)*100):null,samples:gymCurrent.length,trend:percentChange(gymCurrent.length,gymPrevious.length),detail:`${gymCurrent.length} de ${expectedGym} sesión(es) planificadas`},
      {id:'nutrition',name:'Nutrición',coverage:nutritionDates.size?Math.min(100,(nutritionDates.size/windowDays)*100):null,samples:nutritionDates.size,trend:percentChange(nutritionDates.size,nutritionPreviousDates.size),detail:`${nutritionDates.size} de ${windowDays} día(s) con comidas; cobertura nutricional no evaluada aquí`}
    ];
  }
  function renderOverview(){
    const days=selectedDays(),windowDays=days>10000?observedPeriodDays():days,entries=protocolEntries(),current=entries.filter(entry=>within(entry.date,days)),previous=entries.filter(entry=>previousWindow(entry.date,days));
    const avg7=average(entries.filter(entry=>within(entry.date,7)).map(entry=>entry.score));
    const avg30=average(entries.filter(entry=>within(entry.date,30)).map(entry=>entry.score));
    const areas=areaModels(days),measured=areas.filter(area=>area.coverage!==null),comparable=areas.filter(area=>area.trend!==null),strongest=comparable.slice().sort((a,b)=>b.trend-a.trend)[0],least=measured.slice().sort((a,b)=>a.samples-b.samples)[0],dataCount=areas.reduce((sum,area)=>sum+area.samples,0);
    const metrics=document.getElementById('progressSummaryMetrics');
    if(metrics)metrics.innerHTML=[kpi('Tendencia hábitos 7 días',`${round(avg7)}/100`,`${entries.filter(entry=>within(entry.date,7)).length} días medidos`),kpi('Tendencia hábitos 30 días',`${round(avg30)}/100`,`${entries.filter(entry=>within(entry.date,30)).length} días medidos`),kpi('Constancia de registro',`${current.length}/${windowDays}`,deltaLabel(current.length,previous.length)),kpi('Cantidad de datos',dataCount,`${areas.map(area=>`${area.name}: ${area.samples}`).join(' · ')}`)].join('');
    const strongestTitle=document.getElementById('progressStrongestArea'),strongestDetail=document.getElementById('progressStrongestDetail'),improveTitle=document.getElementById('progressImproveArea'),improveDetail=document.getElementById('progressImproveDetail'),action=document.getElementById('progressNextAction');
    if(strongestTitle)strongestTitle.textContent=strongest?.name||'Sin tendencia comparable';if(strongestDetail)strongestDetail.textContent=strongest?`${strongest.trend>0?'+':''}${strongest.trend}${strongest.id==='habits'?' puntos':'%'} frente al período anterior. ${strongest.detail}`:'Hace falta un período anterior con datos del mismo tipo.';
    if(improveTitle)improveTitle.textContent=least?.name||'Sin datos';if(improveDetail)improveDetail.textContent=least?`${least.detail}. Describe cantidad de registros, no calidad ni fracaso.`:'Todavía no hay áreas registradas.';
    const actions={habits:'Completá el próximo registro diario con datos reales.',gym:'Registrá la próxima sesión o serie sin forzar más volumen.',nutrition:'Registrá una comida habitual para construir tendencia.'};
    if(action)action.textContent=least?actions[least.id]:'Registrá un dato comparable';
    const chart=document.getElementById('progressOverviewChart'),summary=document.getElementById('progressOverviewSummary');
    const selectedArea=document.getElementById('progressArea')?.value||'all';
    const chartAreas=selectedArea==='all'?areas:areas.filter(area=>area.id===selectedArea);
    if(chart)chart.innerHTML=barRows(chartAreas,{value:row=>row.coverage||0,label:row=>row.name,detail:row=>row.detail,display:row=>row.coverage===null?'Sin datos':`${Math.round(row.coverage)}% de cobertura`,max:()=>100,empty:'Esta área todavía no tiene registros.'});
    if(summary)summary.textContent=measured.length?`Resumen textual de cobertura de registro: ${measured.map(area=>`${area.name} ${Math.round(area.coverage)}%`).join('; ')}. No compara resultados clínicos ni rendimiento entre áreas.`:'Resumen textual: todavía no hay áreas con datos suficientes.';
  }
  function renderGym(){
    const days=selectedDays(),all=workoutSessions(),current=all.filter(session=>within(session.date,days)),previous=all.filter(session=>previousWindow(session.date,days));
    const aggregate=list=>list.reduce((total,session)=>{const metrics=sessionMetrics(session);total.sets+=number(metrics.totalSets);total.reps+=number(metrics.totalReps);total.volume+=number(metrics.externalLoadVolume);return total;},{sets:0,reps:0,volume:0});
    const totals=aggregate(current),previousTotals=aggregate(previous),summary=document.getElementById('progressGymSummary');
    const unit=window.WORKOUT_FEATURES?.getGymSettings?.().unit||'kg',displayVolume=value=>window.WORKOUT_FEATURES?.displayVolume?.(value,unit)??Math.round(value);
    if(summary)summary.innerHTML=[kpi('Sesiones',current.length,deltaLabel(current.length,previous.length)),kpi('Series',totals.sets,deltaLabel(totals.sets,previousTotals.sets)),kpi('Repeticiones',totals.reps,'Peso corporal incluido'),kpi('Volumen externo',`${displayVolume(totals.volume).toLocaleString()} ${unit}`,deltaLabel(totals.volume,previousTotals.volume))].join('');
    const weeks=groupByWeek(current,session=>session.date,session=>{const metrics=sessionMetrics(session);return {sessions:1,sets:metrics.totalSets,volume:metrics.externalLoadVolume};});
    const chart=document.getElementById('progressGymChart'),caption=document.getElementById('progressGymChartSummary');
    if(chart)chart.innerHTML=barRows(weeks,{value:row=>row.sets,label:row=>row.label.slice(5),detail:row=>`${row.sessions} sesión(es) · ${displayVolume(row.volume).toLocaleString()} ${unit}`,display:row=>`${row.sets} series`,empty:'Registrá una sesión para ver la evolución semanal.'});
    if(caption)caption.textContent=weeks.length?`Resumen textual: ${weeks.map(week=>`semana ${week.label}, ${week.sets} series y ${displayVolume(week.volume)} ${unit}`).join('; ')}. Más volumen no siempre significa mejor.`:'Resumen textual: no hay sesiones en el período.';
    renderGymScope();
  }
  function gymScopeFromUrl(){const scope=new URLSearchParams(location.search).get('progressScope');return['muscle','exercise','records'].includes(scope)?scope:'summary';}
  function selectedMuscleFromUrl(){return new URLSearchParams(location.search).get('muscle')||'';}
  function selectedExerciseFromUrl(){return new URLSearchParams(location.search).get('exerciseId')||'';}
  function setGymScope(scope,selection='',{push=true}={}){
    const url=new URL(location.href);url.searchParams.set('progressScope',scope);
    if(scope==='muscle'&&selection)url.searchParams.set('muscle',selection);else if(scope!=='muscle')url.searchParams.delete('muscle');
    if(scope==='exercise'&&selection)url.searchParams.set('exerciseId',selection);else if(scope!=='exercise')url.searchParams.delete('exerciseId');
    if(push){const state=history.state||{},index=(Number(state.index)||0)+1;history.pushState({...state,index,progressScope:scope,muscle:scope==='muscle'?selection:'',exerciseId:scope==='exercise'?selection:''},'',`${url.pathname}${url.search}${url.hash}`);}else history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
    renderGymScope();
  }
  function muscleMapHtml(model,selected,{showSecondary=false}={}){
    const maxSets=Math.max(1,...model.muscles.map(item=>item.thisWeek.sets)),body=`<ellipse class="progressBodyPart" cx="50" cy="10" rx="7.4" ry="8.4"></ellipse><path class="progressBodyPart" d="M44 18 Q50 21 56 18 L58 25 Q50 29 42 25 Z"></path><path class="progressBodyPart" d="M29 29 Q38 23 50 24 Q62 23 71 29 Q66 43 63 57 Q59 68 50 70 Q41 68 37 57 Q34 43 29 29 Z"></path><path class="progressBodyShade" d="M36 31 Q43 28 49 34 L49 47 Q41 45 34 39 Z"></path><path class="progressBodyShade" d="M64 31 Q57 28 51 34 L51 47 Q59 45 66 39 Z"></path><path class="progressBodyShade" d="M42 50 Q50 54 58 50 L55 64 Q50 67 45 64 Z"></path><path class="progressBodyPart" d="M29 31 Q19 39 21 55 Q22 66 28 67 Q29 55 35 39 Z"></path><path class="progressBodyPart" d="M27 64 Q20 73 22 86 Q26 90 31 85 Q31 73 32 66 Z"></path><path class="progressBodyPart" d="M71 31 Q81 39 79 55 Q78 66 72 67 Q71 55 65 39 Z"></path><path class="progressBodyPart" d="M73 64 Q80 73 78 86 Q74 90 69 85 Q69 73 68 66 Z"></path><path class="progressBodyPart" d="M39 68 Q50 73 61 68 L65 78 Q57 84 50 83 Q43 84 35 78 Z"></path><path class="progressBodyPart" d="M38 78 Q32 91 35 106 Q41 108 45 104 Q45 91 50 82 Z"></path><path class="progressBodyPart" d="M62 78 Q68 91 65 106 Q59 108 55 104 Q55 91 50 82 Z"></path>`;
    const description=model.muscles.map(item=>`${item.name}: ${item.thisWeek.sets} series primarias${showSecondary?` y ${item.secondaryThisWeek.sets} secundarias estimadas`:''}`).join('. ');
    const dots=muscleMapTargets.map(target=>{const row=model.byId[target.id],active=target.id===selected,opacity=Math.max(.16,Math.min(1,(row?.thisWeek.sets||0)/maxSets)),label=`${row?.name||target.id}: ${row?.thisWeek.sets||0} series primarias esta semana${showSecondary?`; ${row?.secondaryThisWeek.sets||0} secundarias estimadas`:''}`;return `<g class="progressMusclePoint ${active?'active':''} ${showSecondary&&row?.secondaryThisWeek.sets?'hasSecondary':''}" data-progress-muscle="${target.id}" tabindex="0" role="button" aria-label="${escape(label)}"><circle class="progressMuscleDot" cx="${target.x}" cy="${target.y}" r="${active?4.2:3.1}" style="opacity:${opacity}"></circle><title>${escape(label)}</title></g>`;}).join('');
    const buttons=model.muscles.filter(item=>item.id!=='other').map(row=>`<button type="button" class="progressMuscleButton ${row.id===selected?'active':''}" data-progress-muscle="${row.id}"><strong>${escape(row.name)}</strong><span>${row.thisWeek.sets} primarias${showSecondary?` · ${row.secondaryThisWeek.sets} secundarias`:''}</span></button>`).join('');
    return `<div class="progressMuscleCanvas">${!model.hasData?'<div class="emptyState progressMuscleEmpty">Registrá series para activar tus datos musculares. Mientras tanto podés explorar todos los grupos.</div>':''}<svg class="progressHumanSvg" viewBox="0 0 200 112" role="img" aria-label="Mapa muscular personal. ${escape(description)}"><text class="progressBodyLabel" x="50" y="111" text-anchor="middle">Frente</text><text class="progressBodyLabel" x="150" y="111" text-anchor="middle">Espalda</text><g>${body}</g><g transform="translate(100 0)">${body}</g>${dots}</svg><div class="progressMuscleIndex" aria-label="Grupos musculares">${buttons}</div></div>`;
  }
  function renderGymScope(){
    const scope=gymScopeFromUrl();document.querySelectorAll('[data-progress-gym-scope]').forEach(button=>button.classList.toggle('active',button.dataset.progressGymScope===scope));document.querySelectorAll('[data-progress-gym-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.progressGymPanel!==scope));
    if(scope==='exercise'){renderExerciseProgress();return;}if(scope==='records'){renderPersonalRecords();return;}if(scope!=='muscle')return;
    const model=window.MUSCLE_PROGRESS.build({sessions:workoutSessions(),library:window.WORKOUT_FEATURES?.getExerciseLibrary?.()||[],days:document.getElementById('progressPeriod')?.value||'30',today:today()}),select=document.getElementById('progressMuscleSelect'),showSecondary=!!document.getElementById('progressSecondaryMuscles')?.checked,requested=selectedMuscleFromUrl();
    let selected=window.MUSCLE_TAXONOMY?.canonicalId?.(requested,{fallback:null})||requested;if(!model.byId[selected])selected=model.muscles.find(item=>item.current.sets)?.id||model.muscles[0].id;
    if(select){select.innerHTML=model.muscles.map(item=>`<option value="${escape(item.id)}">${escape(item.name)}</option>`).join('');select.value=selected;}
    const muscle=model.byId[selected],unit=window.WORKOUT_FEATURES?.getGymSettings?.().unit||'kg',displayVolume=value=>window.WORKOUT_FEATURES?.displayVolume?.(value,unit)??Math.round(value),stateLabels={'no-data':'Sin datos','insufficient':'Datos insuficientes',partial:'Información parcial',sufficient:'Datos suficientes'};
    document.getElementById('progressMuscleMap').innerHTML=muscleMapHtml(model,selected,{showSecondary});
    const summary=[kpi('Series primarias esta semana',muscle.thisWeek.sets,`${muscle.thisWeek.sessions} sesión(es)`),kpi('Series primarias en 4 semanas',muscle.lastFourWeeks.sets,`${muscle.frequencyPerWeek} sesión(es)/semana`),kpi('Volumen externo primario',muscle.current.volume?`${displayVolume(muscle.current.volume).toLocaleString()} ${unit}`:'Sin carga externa',muscle.volumeChange===null?'Sin período anterior':`${muscle.volumeChange>0?'+':''}${muscle.volumeChange}% vs anterior`),kpi('Cobertura de datos',stateLabels[muscle.state],muscle.current.lastDate?`Último registro: ${muscle.current.lastDate}`:'Sin fecha registrada')];if(showSecondary)summary.push(kpi('Participación secundaria',muscle.secondaryThisWeek.sets,`${muscle.secondaryThisWeek.sessions} sesión(es); no se suma al total primario`));document.getElementById('progressMuscleSummary').innerHTML=summary.join('');
    const primaryChart=barRows(muscle.weekly,{value:row=>row.sets,label:row=>row.label,detail:row=>`${row.sessions} sesión(es) · ${displayVolume(row.volume)} ${unit}`,display:row=>`${row.sets} series primarias`,empty:'No hay series primarias en las últimas cuatro semanas.'}),secondaryChart=showSecondary?`<h4 class="progressSecondaryTitle">Participación secundaria estimada, separada</h4>${barRows(muscle.secondaryWeekly,{value:row=>row.sets,label:row=>row.label,detail:row=>`${row.sessions} sesión(es)`,display:row=>`${row.sets} series secundarias`,empty:'No hay participación secundaria registrada.'})}`:'';document.getElementById('progressMuscleWeeklyChart').innerHTML=primaryChart+secondaryChart;
    document.getElementById('progressMuscleChartSummary').textContent=`Resumen textual: ${muscle.name}, ${muscle.thisWeek.sets} series primarias esta semana y ${muscle.lastFourWeeks.sets} en cuatro semanas.${showSecondary?` Participación secundaria estimada: ${muscle.secondaryThisWeek.sets} esta semana, informada por separado.`:''} Más series no siempre significa mejor y este conteo no mide estímulo fisiológico exacto.`;
    const exerciseRows=items=>items.map(item=>`<article class="progressExerciseRow"><strong>${escape(item.name)}</strong><span>${item.sets} series</span><span>${item.reps} reps</span><span>${item.bodyweight&&!item.volume?'Peso corporal':`${displayVolume(item.volume).toLocaleString()} ${unit}`}</span></article>`).join(''),primaryExercises=muscle.current.exercises.length?exerciseRows(muscle.current.exercises):'<div class="emptyState">Todavía no hay ejercicios primarios registrados para este músculo.</div>',secondaryExercises=showSecondary?`<h4 class="progressSecondaryTitle">Ejercicios con participación secundaria estimada</h4>${muscle.secondaryCurrent.exercises.length?exerciseRows(muscle.secondaryCurrent.exercises):'<div class="emptyState">No hay ejercicios secundarios registrados.</div>'}`:'';document.getElementById('progressMuscleExercises').innerHTML=primaryExercises+secondaryExercises;
    if(requested!==selected)setGymScope('muscle',selected,{push:false});
  }
  function exerciseModel(){return window.EXERCISE_PROGRESS.build({sessions:workoutSessions(),library:window.WORKOUT_FEATURES?.getExerciseLibrary?.()||[],plan:window.WORKOUT_FEATURES?.getWeeklyWorkoutPlan?.()||{},days:document.getElementById('progressPeriod')?.value||'30',today:today()});}
  function formatProgressDuration(seconds){const value=Math.max(0,Math.round(number(seconds)));return value>=60?`${Math.floor(value/60)} min ${value%60?`${value%60} s`:''}`.trim():`${value} s`;}
  function displaySet(set,exercise,unit){
    if(!set)return'—';
    if(set.measurementMode==='time')return formatProgressDuration(set.durationSeconds);
    if(set.measurementMode==='distance')return set.distanceMeters>=1000?`${Math.round(set.distanceMeters/10)/100} km`:`${Math.round(set.distanceMeters)} m`;
    const weight=window.WORKOUT_FEATURES?.displayWeight?.(set.weight,unit)??set.weight;
    if(set.loadMode==='assistance')return`${set.reps} reps · ${weight} ${unit} de asistencia`;
    if(exercise.bodyweight)return set.weight?`${weight} ${unit} de lastre × ${set.reps}`:`${set.reps} reps (peso corporal)`;
    return`${weight} ${unit} × ${set.reps}`;
  }
  function renderExerciseProgress(){
    const model=exerciseModel(),search=document.getElementById('progressExerciseSearch'),select=document.getElementById('progressExerciseSelect'),query=window.GYM_PROGRESS_MODEL.normalize(search?.value||''),visible=model.exercises.filter(item=>!query||window.GYM_PROGRESS_MODEL.normalize(`${item.name} ${item.muscle}`).includes(query));
    if(!model.exercises.length){if(select)select.innerHTML='<option>Sin datos</option>';document.getElementById('progressExerciseSummary').innerHTML='';document.getElementById('progressExerciseChart').innerHTML='<div class="emptyState">Registrá series para ver progreso por ejercicio.</div>';document.getElementById('progressExerciseHistory').innerHTML='<div class="emptyState">No hay sesiones registradas.</div>';document.getElementById('progressRecommendationText').textContent='No hay datos suficientes.';document.getElementById('progressRecommendationReason').textContent='Registrá al menos dos sesiones comparables.';document.getElementById('progressRecommendationMeta').textContent='';return;}
    let selected=selectedExerciseFromUrl();if(!model.byId[selected])selected=(visible[0]||model.exercises[0]).id;
    if(select){select.innerHTML=(visible.length?visible:model.exercises).map(item=>`<option value="${escape(item.id)}">${escape(item.name)} · ${escape(item.muscle)}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected;else selected=select.value;}
    const exercise=model.byId[selected],unit=window.WORKOUT_FEATURES?.getGymSettings?.().unit||'kg',weight=value=>window.WORKOUT_FEATURES?.displayWeight?.(value,unit)??value,volume=value=>window.WORKOUT_FEATURES?.displayVolume?.(value,unit)??Math.round(value),latest=exercise.history[0];
    const contextLabel=[exercise.all.equipmentName,exercise.all.gymName].filter(Boolean).join(' · ')||'Mismo modo de carga';
    let summary;
    if(exercise.all.measurementMode==='time')summary=[kpi('Última sesión',latest?.date||'—',latest?`${latest.sets} series · ${formatProgressDuration(latest.durationSeconds)}`:'Sin sesiones'),kpi('Mayor duración',formatProgressDuration(exercise.all.bestDurationSeconds),displaySet(exercise.all.bestSet,exercise,unit)),kpi('Tiempo del período',formatProgressDuration(exercise.current.durationSeconds),`${exercise.current.comparableSessions} sesión(es) comparables`),kpi('Series del período',exercise.current.sets,contextLabel)];
    else if(exercise.all.measurementMode==='distance')summary=[kpi('Última sesión',latest?.date||'—',latest?`${latest.sets} series · ${Math.round(latest.distanceMeters)} m`:'Sin sesiones'),kpi('Mayor distancia',exercise.all.bestDistanceMeters>=1000?`${Math.round(exercise.all.bestDistanceMeters/10)/100} km`:`${Math.round(exercise.all.bestDistanceMeters)} m`,displaySet(exercise.all.bestSet,exercise,unit)),kpi('Distancia del período',`${Math.round(exercise.current.distanceMeters)} m`,`${exercise.current.comparableSessions} sesión(es) comparables`),kpi('Series del período',exercise.current.sets,contextLabel)];
    else if(exercise.all.loadMode==='assistance')summary=[kpi('Última sesión',latest?.date||'—',latest?`${latest.sets} series · ${latest.reps} reps`:'Sin sesiones'),kpi('Menor asistencia',exercise.all.lowestAssistanceKg?`${weight(exercise.all.lowestAssistanceKg)} ${unit}`:'Sin dato',displaySet(exercise.all.bestSet,exercise,unit)),kpi('Mejor cantidad de reps',`${exercise.all.maxReps} reps`,'Menos asistencia indica mayor autonomía'),kpi('Series del período',exercise.current.sets,contextLabel)];
    else summary=[kpi('Última sesión',latest?.date||'—',latest?`${latest.sets} series · ${latest.reps} reps`:'Sin sesiones'),kpi(exercise.bodyweight?'Mayor lastre':'Mejor peso',exercise.bodyweight?(exercise.all.addedLoadBest?`${weight(exercise.all.addedLoadBest)} ${unit}`:'Sin lastre'):`${weight(exercise.all.bestWeight)} ${unit}`,displaySet(exercise.all.bestSet,exercise,unit)),kpi('e1RM estimado',exercise.all.bestE1RM?`${weight(exercise.all.bestE1RM)} ${unit}`:'No aplica','Epley, solo series comparables de 1 a 12 reps'),kpi(exercise.bodyweight?'Máximo peso corporal':'Mejor cantidad de reps',`${exercise.bodyweight?exercise.all.bodyweightMaxReps:exercise.all.maxReps} reps`,'Según series guardadas'),kpi(exercise.bodyweight?'Volumen de lastre':'Volumen del período',exercise.bodyweight&&!exercise.current.volume?'Sin lastre registrado':`${volume(exercise.current.volume).toLocaleString()} ${unit}`,contextLabel),kpi('Series del período',exercise.current.sets,`${exercise.current.comparableSessions} sesión(es) comparables`)];
    document.getElementById('progressExerciseSummary').innerHTML=summary.join('');
    document.getElementById('progressRecommendationText').textContent=exercise.recommendation.text;document.getElementById('progressRecommendationReason').textContent=exercise.recommendation.reason;
    const confidenceLabels={low:'Confianza baja',medium:'Confianza media',high:'Confianza alta'},recommendation=exercise.recommendation,prescription=exercise.prescription||{},compared=(recommendation.sessionsCompared||[]).map(item=>item.date).filter(Boolean).join(' y '),target=prescription.measurementMode==='reps'||!prescription.measurementMode?`${prescription.targetSets||3} series · ${prescription.repRangeMin||8}-${prescription.repRangeMax||12} reps · RIR ${prescription.targetRirMin??1}-${prescription.targetRirMax??3}`:`${prescription.targetSets||3} series objetivo`,suggested=recommendation.suggested||{};let suggestedText='';
    if(Number.isFinite(suggested.weightKg))suggestedText=` · Carga orientativa: ${weight(suggested.weightKg)} ${unit}`;
    else if(Number.isFinite(suggested.assistanceKg))suggestedText=` · Asistencia orientativa: ${weight(suggested.assistanceKg)} ${unit}`;
    else if(Number.isFinite(suggested.durationSeconds))suggestedText=` · Tiempo orientativo: ${formatProgressDuration(suggested.durationSeconds)}`;
    else if(Number.isFinite(suggested.distanceMeters))suggestedText=` · Distancia orientativa: ${Math.round(suggested.distanceMeters)} m`;
    else if(Number.isFinite(suggested.reps)&&suggested.reps>0)suggestedText=` · Próximo objetivo: ${suggested.reps} reps`;
    document.getElementById('progressRecommendationMeta').textContent=`${confidenceLabels[recommendation.confidence]||'Confianza orientativa'}${compared?` · sesiones ${compared}`:''} · ${target}${suggestedText}.`;
    const metricSelect=document.getElementById('progressExerciseMetric'),previousMetric=metricSelect.value;
    const metricOptions=exercise.all.measurementMode==='time'?[['bestDurationSeconds','Mayor duración'],['durationSeconds','Tiempo total'],['sets','Series']]:exercise.all.measurementMode==='distance'?[['bestDistanceMeters','Mayor distancia'],['distanceMeters','Distancia total'],['sets','Series']]:exercise.all.loadMode==='assistance'?[['lowestAssistanceKg','Menor asistencia'],['maxReps','Repeticiones'],['sets','Series']]:[['bestWeight','Peso máximo'],['e1rm','e1RM estimado'],['maxReps','Repeticiones'],['volume','Volumen'],['sets','Series']];
    metricSelect.innerHTML=metricOptions.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');metricSelect.value=metricOptions.some(([id])=>id===previousMetric)?previousMetric:metricOptions[0][0];
    const metric=metricSelect.value,labels=Object.fromEntries(metricOptions),rows=exercise.history.slice().reverse(),valueOf=row=>metric==='e1rm'?(row.bestE1RM||0):metric==='maxReps'?row.maxReps:metric==='volume'?volume(row.volume):metric==='sets'?row.sets:metric==='bestDurationSeconds'||metric==='durationSeconds'?number(row[metric]):metric==='bestDistanceMeters'||metric==='distanceMeters'?number(row[metric]):metric==='lowestAssistanceKg'?weight(row.lowestAssistanceKg):weight(row.bestWeight),suffix=metric==='maxReps'?' reps':metric==='sets'?' series':metric.includes('Duration')||metric==='durationSeconds'?' s':metric.includes('Distance')||metric==='distanceMeters'?' m':` ${unit}`;
    document.getElementById('progressExerciseChart').innerHTML=barRows(rows,{value:valueOf,label:row=>row.date,detail:row=>`${row.sets} series · ${row.reps} reps`,display:row=>`${valueOf(row)}${suffix}`,empty:'No hay sesiones para esta métrica.'});document.getElementById('progressExerciseChartSummary').textContent=`Resumen textual: ${labels[metric]} de ${exercise.name}. ${rows.map(row=>`${row.date}: ${valueOf(row)}${suffix}`).join('; ')||'sin datos'}.`;
    document.getElementById('progressExerciseHistory').innerHTML=exercise.history.slice(0,12).map(row=>`<article class="progressSessionRow"><div><strong>${escape(row.date)}</strong><span>${row.sets} series · ${row.reps} reps</span></div><b>${escape(displaySet(row.bestSet,exercise,unit))}</b></article>`).join('');
    if(selectedExerciseFromUrl()!==selected)setGymScope('exercise',selected,{push:false});
  }
  function renderPersonalRecords(){
    const records=window.PERSONAL_RECORDS.build(exerciseModel()),box=document.getElementById('progressRecordsList'),unit=window.WORKOUT_FEATURES?.getGymSettings?.().unit||'kg',value=record=>record.measure==='reps'?`${record.value} reps`:record.measure==='duration'?formatProgressDuration(record.value):record.measure==='distance'?(record.value>=1000?`${Math.round(record.value/10)/100} km`:`${Math.round(record.value)} m`):record.measure==='volume'?`${window.WORKOUT_FEATURES?.displayVolume?.(record.value,unit)??record.value} ${unit}`:`${window.WORKOUT_FEATURES?.displayWeight?.(record.value,unit)??record.value} ${unit}`;
    box.innerHTML=records.length?records.map(record=>`<article class="progressRecordRow"><div><strong>${escape(record.name)}</strong><span>${escape(record.label)}</span></div><b>${escape(value(record))}</b></article>`).join(''):'<div class="emptyState">Registrá series para derivar récords personales.</div>';
    const reviewed=window.PERSONAL_RECORDS.reviewQueue(workoutSessions()),reviewBox=document.getElementById('progressSuspiciousList'),decisionLabel=decision=>window.WORKOUT_ANOMALY_DETECTOR?.label?.(decision)||'Revisado';
    if(reviewBox)reviewBox.innerHTML=reviewed.length?reviewed.map(item=>`<article class="progressRecordRow"><div><strong>${escape(item.exerciseName)} · serie ${item.setNumber}</strong><span>${escape(item.date)} · ${escape(decisionLabel(item.decision))}</span></div><b>${item.weightKg?`${escape(String(window.WORKOUT_FEATURES?.displayWeight?.(item.weightKg,unit)??item.weightKg))} ${escape(unit)}`:`${escape(String(item.reps))} reps`}</b></article>`).join(''):'<div class="emptyState">No hay registros inusuales revisados.</div>';
  }
  function renderNutrition(){
    const days=selectedDays(),all=nutritionEntries(),current=all.filter(entry=>within(entry.date,days)),previous=all.filter(entry=>previousWindow(entry.date,days));
    const dates=new Set(current.map(entry=>entry.date)),previousDates=new Set(previous.map(entry=>entry.date));
    const totals=current.reduce((sum,entry)=>({calories:sum.calories+number(entry.calories),protein:sum.protein+number(entry.protein)}),{calories:0,protein:0});
    const summary=document.getElementById('progressNutritionSummary');
    if(summary)summary.innerHTML=[kpi('Días registrados',dates.size,deltaLabel(dates.size,previousDates.size)),kpi('Comidas',current.length,'Solo datos guardados'),kpi('Promedio kcal/día',dates.size?Math.round(totals.calories/dates.size):'—','Dato orientativo'),kpi('Promedio proteína/día',dates.size?`${Math.round(totals.protein/dates.size)} g`:'—','Según alimentos registrados')].join('');
    const weeks=groupByWeek(current,entry=>entry.date,entry=>({sessions:0,sets:0,volume:number(entry.calories)}));
    const chart=document.getElementById('progressNutritionChart'),caption=document.getElementById('progressNutritionChartSummary');
    if(chart)chart.innerHTML=barRows(weeks,{value:row=>row.days.size,label:row=>row.label.slice(5),detail:row=>`${Math.round(row.volume).toLocaleString()} kcal registradas`,display:row=>`${row.days.size} días`,max:()=>7,empty:'Registrá comidas para ver constancia por semana.'});
    if(caption)caption.textContent=weeks.length?`Resumen textual: ${weeks.map(week=>`semana ${week.label}, ${week.days.size} días registrados`).join('; ')}. La ausencia de registro no equivale a una evaluación de la alimentación.`:'Resumen textual: no hay comidas en el período.';
  }
  function renderView(view,{force=false}={}){
    const state=viewState[view];if(!state||(!force&&state.rendered&&!state.dirty))return false;
    if(view==='overview'){window.renderIntegralScore?.();renderOverview();}
    else if(view==='habits'){if(!renderEmptyState(view))window.renderProtocolProgressView?.(view);}
    else if(view==='gym'){if(!renderEmptyState(view))renderGym();}
    else if(view==='nutrition'){if(!renderEmptyState(view))renderNutrition();}
    else window.renderProtocolProgressView?.(view);
    state.rendered=true;state.dirty=false;return true;
  }
  function markDirty(viewNames=views){
    for(const view of viewNames)viewState[view]&&(viewState[view].dirty=true);
  }
  function render(){if(progressRoute())renderView(activeView);}
  function focusActiveHeading(){
    const headings={overview:'progressViewHeading',habits:'progressHabitsHeading',gym:'progressGymHeading',nutrition:'progressNutritionHeading',history:'progressHistoryHeading',achievements:'progressAchievementsHeading'};
    requestAnimationFrame(()=>document.getElementById(headings[activeView])?.focus({preventScroll:true}));
  }
  function applyRoute(view,{navigate=false,focus=false}={}){
    activeView=views.has(view)?view:'overview';
    document.querySelectorAll('[data-progress-view]').forEach(button=>{
      const selected=button.dataset.progressView===activeView;
      button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
      if(!button.id)button.id=`progress-tab-${button.dataset.progressView}`;
    });
    document.querySelectorAll('[data-progress-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.progressPanel!==activeView));
    if(navigate)window.APP_ROUTER?.navigate({module:'progress',view:activeView});
    const rendered=renderView(activeView);
    if(!rendered&&activeView==='gym'&&viewState.gym.rendered&&!viewState.gym.dirty)renderGymScope();
    if(focus||navigate)focusActiveHeading();
  }
  function setup(){
    document.querySelectorAll('[data-progress-view]').forEach(button=>button.addEventListener('click',()=>applyRoute(button.dataset.progressView,{navigate:true,focus:true})));
    document.querySelector('.progressSectionNav')?.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const tabs=[...event.currentTarget.querySelectorAll('[data-progress-view]')],current=Math.max(0,tabs.indexOf(document.activeElement));
      const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length,target=tabs[index];
      if(!target)return;event.preventDefault();applyRoute(target.dataset.progressView,{navigate:true,focus:true});
    });
    document.getElementById('progressPeriod')?.addEventListener('change',()=>{markDirty(['overview','gym','nutrition']);render();});
    document.getElementById('progressArea')?.addEventListener('change',()=>{markDirty(['overview']);render();});
    document.querySelectorAll('[data-progress-gym-scope]').forEach(button=>button.addEventListener('click',()=>{const scope=button.dataset.progressGymScope,selection=scope==='muscle'?(selectedMuscleFromUrl()||document.getElementById('progressMuscleSelect')?.value||''):scope==='exercise'?(selectedExerciseFromUrl()||document.getElementById('progressExerciseSelect')?.value||''):'';setGymScope(scope,selection);}));
    document.getElementById('progressMuscleSelect')?.addEventListener('change',event=>setGymScope('muscle',event.target.value));
    document.getElementById('progressMuscleMap')?.addEventListener('click',event=>{const button=event.target.closest('[data-progress-muscle]');if(button?.dataset.progressMuscle)setGymScope('muscle',button.dataset.progressMuscle);});
    document.getElementById('progressMuscleMap')?.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-progress-muscle]');if(!target?.dataset.progressMuscle)return;event.preventDefault();setGymScope('muscle',target.dataset.progressMuscle);});
    document.getElementById('progressSecondaryMuscles')?.addEventListener('change',renderGymScope);
    document.getElementById('progressExerciseSelect')?.addEventListener('change',event=>setGymScope('exercise',event.target.value));
    document.getElementById('progressExerciseSearch')?.addEventListener('input',renderExerciseProgress);
    document.getElementById('progressExerciseMetric')?.addEventListener('change',renderExerciseProgress);
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-open-progress]')){window.APP_ROUTER?.navigate({module:'progress',view:'overview'});return;}
      const action=event.target.closest('[data-progress-empty-action]');if(action)window.APP_ROUTER?.navigate({module:action.dataset.module,view:action.dataset.view});
    });
    window.addEventListener('app-data-change',event=>{
      const affected={protocol:['overview','habits','history','achievements'],workout:['overview','gym'],nutrition:['overview','nutrition']}[event.detail?.domain];
      if(!affected)return;markDirty(affected);if(progressRoute()&&affected.includes(activeView))requestAnimationFrame(render);
    });
    window.addEventListener('app-route-change',event=>{if(event.detail?.module==='progress')applyRoute(event.detail.view);});
    const route=window.APP_ROUTER?.current();if(route?.module==='progress')applyRoute(route.view);
  }

  window.PROGRESS_VIEW={render,applyRoute,markDirty,current:()=>activeView,state:()=>Object.fromEntries(Object.entries(viewState).map(([view,state])=>[view,{...state}]))};
  setup();
})();
