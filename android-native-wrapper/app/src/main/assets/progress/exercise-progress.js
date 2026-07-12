(function(global){
  'use strict';
  const data=()=>global.PROGRESS_DATA_MODEL,gym=()=>global.GYM_PROGRESS_MODEL;
  function e1rm(weight,reps,bodyweight=false){const w=Math.max(0,data().number(weight)),r=Math.max(0,data().number(reps));return bodyweight||!w||r<1||r>12?null:Math.round((w*(1+r/30))*10)/10;}
  function aggregate(rows){
    const sets=rows.flatMap(row=>row.sets.map(set=>({...set,date:row.date,sessionId:row.sessionId}))),bodyweight=rows.some(row=>row.bodyweight),sessions=new Set(rows.map(row=>row.sessionId));
    const weighted=sets.filter(set=>set.weight>0),bestWeight=weighted.reduce((max,set)=>Math.max(max,set.weight),0),maxReps=sets.reduce((max,set)=>Math.max(max,set.reps),0),bestE1RM=sets.map(set=>e1rm(set.weight,set.reps,bodyweight)).filter(value=>value!==null).reduce((max,value)=>Math.max(max,value),0)||null;
    const bestSet=sets.slice().sort((a,b)=>bodyweight?(b.weight-a.weight||b.reps-a.reps):(b.weight-a.weight||b.reps-a.reps))[0]||null;
    const rir=sets.filter(set=>set.rir!==null&&set.rir!==undefined&&set.rir!=='').map(set=>Number(set.rir)).filter(value=>Number.isFinite(value)),rpe=sets.filter(set=>set.rpe!==null&&set.rpe!==undefined&&set.rpe!=='').map(set=>Number(set.rpe)).filter(value=>Number.isFinite(value));
    return{sets:sets.length,reps:sets.reduce((sum,set)=>sum+set.reps,0),volume:sets.reduce((sum,set)=>sum+set.volume,0),sessions:sessions.size,bestWeight,bestSet,bestE1RM,maxReps,bodyweight,addedLoadBest:bodyweight?bestWeight:0,bodyweightMaxReps:bodyweight?Math.max(0,...sets.filter(set=>!set.weight).map(set=>set.reps)):0,averageRir:rir.length?rir.reduce((sum,value)=>sum+value,0)/rir.length:null,averageRpe:rpe.length?rpe.reduce((sum,value)=>sum+value,0)/rpe.length:null};
  }
  function sessionRows(rows){const groups=new Map();rows.forEach(row=>{const current=groups.get(row.sessionId)||{sessionId:row.sessionId,date:row.date,rows:[]};current.rows.push(row);groups.set(row.sessionId,current);});return[...groups.values()].map(item=>({sessionId:item.sessionId,date:item.date,...aggregate(item.rows)})).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.sessionId).localeCompare(String(a.sessionId)));}
  function recommendation(history){
    if(history.length<2)return{kind:'insufficient',text:'No hay datos suficientes para sugerir un cambio.',reason:'Se necesitan al menos dos sesiones comparables.'};
    const [latest,previous]=history,sets=latest.rows?.flatMap(row=>row.sets)||[];
    if(sets.some(set=>/dolor|molestia/i.test(set.note)))return{kind:'maintain',text:'Mantené o reducí la carga y priorizá técnica y seguridad.',reason:'La última sesión incluye una nota de dolor o molestia.'};
    if(latest.averageRir!==null&&previous.averageRir!==null&&latest.averageRir<=previous.averageRir-2)return{kind:'maintain',text:'Repetir o ajustar la carga también cuenta.',reason:'El RIR bajó de forma marcada respecto de la sesión anterior.'};
    if(latest.averageRpe!==null&&previous.averageRpe!==null&&latest.averageRpe>=previous.averageRpe+2)return{kind:'maintain',text:'Mantené la carga y priorizá técnica y recuperación.',reason:'El RPE subió de forma marcada respecto de la sesión anterior.'};
    if(latest.bestWeight<previous.bestWeight||latest.maxReps<previous.maxReps-2)return{kind:'maintain',text:'Repetir o ajustar la carga también cuenta.',reason:'Las repeticiones o la carga bajaron respecto de la sesión anterior.'};
    if(latest.bestWeight===previous.bestWeight&&latest.maxReps>=previous.maxReps)return{kind:'rep',text:'Si la técnica se mantiene, podés intentar una repetición adicional.',reason:`Dos sesiones comparables con ${latest.bestWeight||'la misma'} carga y reps estables.`};
    return{kind:'repeat',text:'Podés repetir la carga anterior y consolidar todas las series.',reason:'La progresión observada todavía es corta o variable.'};
  }
  function build({sessions=[],library=[],days=30,today=data().format(new Date())}={}){
    const rows=gym().flatten(sessions,library),period=data().windows(rows.map(row=>row.date),{days,today}),ids=[...new Set(rows.map(row=>row.exerciseId))],exercises=ids.map(id=>{const own=rows.filter(row=>row.exerciseId===id),currentRows=own.filter(row=>data().inRange(row.date,period.currentStart,period.currentEnd)),previousRows=period.all?[]:own.filter(row=>data().inRange(row.date,period.previousStart,period.previousEnd)),history=sessionRows(own),current=aggregate(currentRows),previous=aggregate(previousRows);history.forEach(item=>{item.rows=own.filter(row=>row.sessionId===item.sessionId);});return{id,name:own[0].exerciseName,muscle:own[0].muscle,bodyweight:own[0].bodyweight,current,previous,all:aggregate(own),history,recommendation:recommendation(history),change:{weight:data().percentChange(current.bestWeight,previous.bestWeight),volume:data().percentChange(current.volume,previous.volume)}};}).sort((a,b)=>String(b.history[0]?.date||'').localeCompare(String(a.history[0]?.date||''))||a.name.localeCompare(b.name,'es'));
    return{period,exercises,byId:Object.fromEntries(exercises.map(item=>[item.id,item]))};
  }
  global.EXERCISE_PROGRESS=Object.freeze({e1rm,aggregate,sessionRows,recommendation,build});
})(window);
