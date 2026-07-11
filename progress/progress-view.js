(function(){
  'use strict';

  const NUTRITION_KEY='protocolo_0_100_nutrition_entries_v1';
  const LEGACY_GYM_KEY='protocolo_0_100_gym_sessions_v1';
  const views=new Set(['overview','habits','gym','nutrition','history','achievements']);
  let activeView='overview';

  function read(key,fallback){
    try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch(error){return fallback;}
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
    const key=window.WORKOUT_FEATURES?.keys?.workoutSessions||'protocolo_0_100_workout_sessions_v1';
    const current=read(key,[]);
    return current.length?current:read(LEGACY_GYM_KEY,[]);
  }
  function nutritionEntries(){return read(NUTRITION_KEY,[]);}
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
    const gymCurrent=workoutSessions().filter(session=>within(session.date,days));
    const nutritionDates=new Set(nutritionEntries().filter(entry=>within(entry.date,days)).map(entry=>entry.date));
    const habitScore=average(protocolCurrent.map(entry=>entry.score));
    const expectedGym=Math.max(1,Math.round(days/7)*3);
    return [
      {id:'habits',name:'Hábitos',score:habitScore,detail:`${protocolCurrent.length} registro(s) en el período`},
      {id:'gym',name:'Gym',score:gymCurrent.length?Math.min(100,(gymCurrent.length/expectedGym)*100):null,detail:`${gymCurrent.length} sesión(es) registradas`},
      {id:'nutrition',name:'Nutrición',score:nutritionDates.size?Math.min(100,(nutritionDates.size/Math.max(1,days))*100):null,detail:`${nutritionDates.size} día(s) con comidas`}
    ];
  }
  function renderOverview(){
    const days=selectedDays(),entries=protocolEntries(),current=entries.filter(entry=>within(entry.date,days)),previous=entries.filter(entry=>previousWindow(entry.date,days));
    const avgCurrent=average(current.map(entry=>entry.score)),avgPrevious=average(previous.map(entry=>entry.score));
    const avg7=average(entries.filter(entry=>within(entry.date,7)).map(entry=>entry.score));
    const avg30=average(entries.filter(entry=>within(entry.date,30)).map(entry=>entry.score));
    const areas=areaModels(days),measured=areas.filter(area=>area.score!==null);
    const strongest=measured.slice().sort((a,b)=>b.score-a.score)[0],weakest=measured.slice().sort((a,b)=>a.score-b.score)[0];
    const metrics=document.getElementById('progressSummaryMetrics');
    if(metrics)metrics.innerHTML=[kpi('Tendencia 7 días',`${round(avg7)}/100`,`${entries.filter(entry=>within(entry.date,7)).length} días medidos`),kpi('Tendencia 30 días',`${round(avg30)}/100`,`${entries.filter(entry=>within(entry.date,30)).length} días medidos`),kpi('Consistencia',`${current.length}/${Math.min(days,365)}`,deltaLabel(current.length,previous.length)),kpi('Cambio del score',avgCurrent===null?'—':`${round((avgCurrent||0)-(avgPrevious||0))} pts`,deltaLabel(avgCurrent||0,avgPrevious||0))].join('');
    const strongestTitle=document.getElementById('progressStrongestArea'),strongestDetail=document.getElementById('progressStrongestDetail'),improveTitle=document.getElementById('progressImproveArea'),improveDetail=document.getElementById('progressImproveDetail'),action=document.getElementById('progressNextAction');
    if(strongestTitle)strongestTitle.textContent=strongest?.name||'Sin datos';if(strongestDetail)strongestDetail.textContent=strongest?`${Math.round(strongest.score)}/100 según lo registrado. ${strongest.detail}`:'Registrá al menos un área.';
    if(improveTitle)improveTitle.textContent=weakest?.name||'Sin datos';if(improveDetail)improveDetail.textContent=weakest?`${Math.round(weakest.score)}/100 según lo registrado. No implica fracaso: indica dónde falta información o constancia.`:'No hay un período comparable todavía.';
    const actions={habits:'Completá el próximo registro diario con datos reales.',gym:'Registrá la próxima sesión o serie sin forzar más volumen.',nutrition:'Registrá una comida habitual para construir tendencia.'};
    if(action)action.textContent=weakest?actions[weakest.id]:'Registrá un dato comparable';
    const chart=document.getElementById('progressOverviewChart'),summary=document.getElementById('progressOverviewSummary');
    const selectedArea=document.getElementById('progressArea')?.value||'all';
    const chartAreas=selectedArea==='all'?areas:areas.filter(area=>area.id===selectedArea);
    if(chart)chart.innerHTML=barRows(chartAreas,{value:row=>row.score||0,label:row=>row.name,detail:row=>row.detail,display:row=>row.score===null?'Sin datos':`${Math.round(row.score)}/100`,max:()=>100,empty:'Esta área todavía no tiene registros.'});
    if(summary)summary.textContent=measured.length?`Resumen textual: ${measured.map(area=>`${area.name} ${Math.round(area.score)}/100`).join('; ')}. La escala es común de 0 a 100.`:'Resumen textual: todavía no hay áreas con datos suficientes.';
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
  function render(){renderOverview();renderGym();renderNutrition();}
  function applyRoute(view,{navigate=false}={}){
    activeView=views.has(view)?view:'overview';
    document.querySelectorAll('[data-progress-view]').forEach(button=>{
      const selected=button.dataset.progressView===activeView;
      button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
      if(!button.id)button.id=`progress-tab-${button.dataset.progressView}`;
    });
    document.querySelectorAll('[data-progress-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.progressPanel!==activeView));
    if(navigate)window.APP_ROUTER?.navigate({module:'progress',view:activeView});
    render();
  }
  function setup(){
    document.querySelectorAll('[data-progress-view]').forEach(button=>button.addEventListener('click',()=>applyRoute(button.dataset.progressView,{navigate:true})));
    document.getElementById('progressPeriod')?.addEventListener('change',render);
    document.getElementById('progressArea')?.addEventListener('change',render);
    document.addEventListener('click',event=>{if(event.target.closest('[data-open-progress]'))window.APP_ROUTER?.navigate({module:'progress',view:'overview'});});
    window.addEventListener('app-route-change',event=>{if(event.detail?.module==='progress')applyRoute(event.detail.view);});
    const route=window.APP_ROUTER?.current();if(route?.module==='progress')applyRoute(route.view);else render();
  }

  window.PROGRESS_VIEW={render,applyRoute,current:()=>activeView};
  setup();
})();
