(function(global){
  'use strict';

  const data=()=>global.PROGRESS_DATA_MODEL;
  const gym=()=>global.GYM_PROGRESS_MODEL;

  function e1rm(weight,reps,bodyweight=false,measurementMode='reps',loadMode='total'){
    const w=Math.max(0,data().number(weight)),r=Math.max(0,data().number(reps));
    return bodyweight||measurementMode!=='reps'||loadMode==='assistance'||!w||r<1||r>12?null:Math.round((w*(1+r/30))*10)/10;
  }
  function flattenedSets(rows){return rows.flatMap(row=>row.sets.map(set=>({...set,date:row.date,sessionId:row.sessionId})));}
  function latestComparisonKey(sets){
    return sets.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))).find(set=>set.progressionEligible!==false)?.comparisonKey||sets[0]?.comparisonKey||'';
  }
  function aggregate(rows,forcedComparisonKey=''){
    const allSets=flattenedSets(rows),completed=allSets.filter(set=>set.completed!==false),sets=completed.filter(set=>set.mainVolume!==false);
    const comparisonKey=forcedComparisonKey||latestComparisonKey(completed);
    const comparable=completed.filter(set=>!comparisonKey||set.comparisonKey===comparisonKey);
    const recordSets=comparable.filter(set=>set.recordEligible!==false),progressionSets=comparable.filter(set=>set.progressionEligible!==false);
    const latestComparable=comparable.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]||null;
    const measurementMode=latestComparable?.measurementMode||'reps',loadMode=latestComparable?.loadMode||'total';
    const bodyweight=['bodyweight','addedLoad'].includes(loadMode)||!!latestComparable?.isBodyweight;
    const strengthSets=recordSets.filter(set=>set.measurementMode==='reps'&&!set.isBodyweight&&set.loadMode!=='assistance');
    const weighted=recordSets.filter(set=>set.measurementMode==='reps'&&set.loadMode!=='assistance'&&set.weight>0);
    const bestWeight=weighted.reduce((max,set)=>Math.max(max,set.weight),0),maxReps=recordSets.reduce((max,set)=>Math.max(max,set.reps),0);
    const bestE1RM=strengthSets.map(set=>e1rm(set.weight,set.reps,false,set.measurementMode,set.loadMode)).filter(value=>value!==null).reduce((max,value)=>Math.max(max,value),0)||null;
    const score=set=>set.measurementMode==='time'?set.durationSeconds:set.measurementMode==='distance'?set.distanceMeters:set.loadMode==='assistance'?(set.reps*100000-Math.round(set.assistanceKg*100)):set.weight*100000+set.reps;
    const bestSet=recordSets.slice().sort((a,b)=>score(b)-score(a))[0]||null;
    const rir=progressionSets.map(set=>Number(set.rir)).filter(value=>Number.isFinite(value)),rpe=progressionSets.map(set=>Number(set.rpe)).filter(value=>Number.isFinite(value));
    const assistanceValues=recordSets.map(set=>data().number(set.assistanceKg)).filter(value=>value>0);
    return {
      sets:sets.length,loggedSets:completed.length,warmupSets:completed.filter(set=>set.setType==='warmup').length,supplementarySets:completed.filter(set=>!['working','warmup'].includes(set.setType)).length,
      reps:sets.reduce((sum,set)=>sum+set.reps,0),volume:sets.reduce((sum,set)=>sum+set.volume,0),durationSeconds:sets.reduce((sum,set)=>sum+data().number(set.durationSeconds),0),distanceMeters:sets.reduce((sum,set)=>sum+data().number(set.distanceMeters),0),
      bestDurationSeconds:recordSets.reduce((max,set)=>Math.max(max,data().number(set.durationSeconds)),0),bestDistanceMeters:recordSets.reduce((max,set)=>Math.max(max,data().number(set.distanceMeters)),0),bestPaceSecondsPerKm:recordSets.map(set=>data().number(set.paceSecondsPerKm)).filter(value=>value>0).reduce((best,value)=>!best||value<best?value:best,0),lowestAssistanceKg:assistanceValues.reduce((best,value)=>!best||value<best?value:best,0),
      sessions:new Set(rows.map(row=>row.sessionId)).size,comparableSessions:new Set(comparable.map(set=>set.sessionId)).size,bestWeight,bestSet,bestE1RM,maxReps,
      progressionBestWeight:progressionSets.reduce((max,set)=>Math.max(max,set.weight),0),progressionMaxReps:progressionSets.reduce((max,set)=>Math.max(max,set.reps),0),bodyweight,addedLoadBest:loadMode==='addedLoad'?bestWeight:0,bodyweightMaxReps:bodyweight?Math.max(0,...recordSets.filter(set=>set.loadMode==='bodyweight').map(set=>set.reps)):0,
      measurementMode,loadMode,equipmentId:latestComparable?.equipmentId||'',equipmentName:latestComparable?.equipmentName||'',gymName:latestComparable?.gymName||'',comparisonKey,
      averageRir:rir.length?rir.reduce((sum,value)=>sum+value,0)/rir.length:null,averageRpe:rpe.length?rpe.reduce((sum,value)=>sum+value,0)/rpe.length:null
    };
  }
  function sessionRows(rows,comparisonKey=''){
    const groups=new Map();
    rows.forEach(row=>{
      const filteredSets=comparisonKey?row.sets.filter(set=>set.comparisonKey===comparisonKey):row.sets;
      if(!filteredSets.length)return;
      const current=groups.get(row.sessionId)||{sessionId:row.sessionId,date:row.date,rows:[]};
      current.rows.push({...row,sets:filteredSets});groups.set(row.sessionId,current);
    });
    return [...groups.values()].map(item=>({sessionId:item.sessionId,date:item.date,rows:item.rows,...aggregate(item.rows,comparisonKey)})).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.sessionId).localeCompare(String(a.sessionId)));
  }
  function recommendation(history){
    if(history.length<2)return{kind:'insufficient',text:'No hay datos suficientes para sugerir un cambio.',reason:'Se necesitan al menos dos sesiones con el mismo equipo y modo de carga.'};
    const [latest,previous]=history,sets=(latest.rows?.flatMap(row=>row.sets)||[]).filter(set=>set.progressionEligible!==false),latestWeight=latest.progressionBestWeight??latest.bestWeight,previousWeight=previous.progressionBestWeight??previous.bestWeight,latestReps=latest.progressionMaxReps??latest.maxReps,previousReps=previous.progressionMaxReps??previous.maxReps;
    if(!sets.length)return{kind:'insufficient',text:'No hay series efectivas comparables para sugerir un cambio.',reason:'Calentamientos y series excluidas no alimentan la progresión.'};
    if(sets.some(set=>/dolor|molestia/i.test(set.note)))return{kind:'maintain',text:'Mantené o reducí la carga y priorizá técnica y seguridad.',reason:'La última sesión incluye una nota de dolor o molestia.'};
    if(latest.measurementMode==='time')return latest.bestDurationSeconds>=previous.bestDurationSeconds?{kind:'time',text:'Podés repetir el tiempo o aumentarlo de forma gradual.',reason:'Dos sesiones comparables de trabajo por tiempo.'}:{kind:'maintain',text:'Repetí una duración cómoda y priorizá la técnica.',reason:'La duración bajó respecto de la sesión comparable anterior.'};
    if(latest.measurementMode==='distance')return latest.bestDistanceMeters>=previous.bestDistanceMeters?{kind:'distance',text:'Podés repetir la distancia o aumentarla de forma gradual.',reason:'Dos sesiones comparables de trabajo por distancia.'}:{kind:'maintain',text:'Repetí una distancia sostenible.',reason:'La distancia bajó respecto de la sesión comparable anterior.'};
    if(latest.loadMode==='assistance')return latest.lowestAssistanceKg<=previous.lowestAssistanceKg&&latestReps>=previousReps?{kind:'assistance',text:'Podés mantener la asistencia o reducirla en el incremento mínimo.',reason:'La asistencia y las repeticiones fueron estables en dos sesiones comparables.'}:{kind:'maintain',text:'Mantené la asistencia hasta consolidar las repeticiones.',reason:'Todavía no hay una mejora estable en dos sesiones comparables.'};
    if(latest.averageRir!==null&&previous.averageRir!==null&&latest.averageRir<=previous.averageRir-2)return{kind:'maintain',text:'Repetir o ajustar la carga también cuenta.',reason:'El RIR bajó de forma marcada respecto de la sesión anterior.'};
    if(latest.averageRpe!==null&&previous.averageRpe!==null&&latest.averageRpe>=previous.averageRpe+2)return{kind:'maintain',text:'Mantené la carga y priorizá técnica y recuperación.',reason:'El RPE subió de forma marcada respecto de la sesión anterior.'};
    if(latestWeight<previousWeight||latestReps<previousReps-2)return{kind:'maintain',text:'Repetir o ajustar la carga también cuenta.',reason:'Las repeticiones o la carga bajaron respecto de la sesión anterior.'};
    if(latestWeight===previousWeight&&latestReps>=previousReps)return{kind:'rep',text:'Si la técnica se mantiene, podés intentar una repetición adicional.',reason:`Dos sesiones con el mismo equipo y ${latestWeight||'la misma'} carga.`};
    return{kind:'repeat',text:'Podés repetir la carga anterior y consolidar todas las series.',reason:'La progresión observada todavía es corta o variable.'};
  }
  function build({sessions=[],library=[],days=30,today=data().format(new Date())}={}){
    const rows=gym().flatten(sessions,library),period=data().windows(rows.map(row=>row.date),{days,today}),ids=[...new Set(rows.map(row=>row.exerciseId))];
    const exercises=ids.map(id=>{
      const own=rows.filter(row=>row.exerciseId===id),all=aggregate(own),comparisonKey=all.comparisonKey;
      const currentRows=own.filter(row=>data().inRange(row.date,period.currentStart,period.currentEnd)),previousRows=period.all?[]:own.filter(row=>data().inRange(row.date,period.previousStart,period.previousEnd));
      const history=sessionRows(own,comparisonKey),current=aggregate(currentRows,comparisonKey),previous=aggregate(previousRows,comparisonKey);
      return{id,name:own[0].exerciseName,muscle:own[0].muscle,bodyweight:all.bodyweight,current,previous,all,history,recommendation:recommendation(history),change:{weight:data().percentChange(current.bestWeight,previous.bestWeight),volume:data().percentChange(current.volume,previous.volume)}};
    }).sort((a,b)=>String(b.history[0]?.date||'').localeCompare(String(a.history[0]?.date||''))||a.name.localeCompare(b.name,'es'));
    return{period,exercises,byId:Object.fromEntries(exercises.map(item=>[item.id,item]))};
  }

  global.EXERCISE_PROGRESS=Object.freeze({e1rm,aggregate,sessionRows,recommendation,build});
})(window);
