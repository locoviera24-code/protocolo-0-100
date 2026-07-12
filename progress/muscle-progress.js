(function(global){
  'use strict';
  const data=()=>global.PROGRESS_DATA_MODEL,gym=()=>global.GYM_PROGRESS_MODEL;
  function aggregate(rows){
    const sessions=new Set(),exercises=new Map();let sets=0,reps=0,volume=0,lastDate='';
    rows.forEach(row=>{sessions.add(row.sessionId);lastDate=String(row.date)>lastDate?row.date:lastDate;const current=exercises.get(row.exerciseId)||{id:row.exerciseId,name:row.exerciseName,sets:0,reps:0,volume:0,sessions:new Set(),lastDate:'',bodyweight:row.bodyweight};row.sets.forEach(set=>{sets+=1;reps+=set.reps;volume+=set.volume;current.sets+=1;current.reps+=set.reps;current.volume+=set.volume;});current.sessions.add(row.sessionId);current.lastDate=String(row.date)>current.lastDate?row.date:current.lastDate;exercises.set(row.exerciseId,current);});
    return{sets,reps,volume,sessions:sessions.size,lastDate,exercises:[...exercises.values()].map(item=>({...item,sessions:item.sessions.size})).sort((a,b)=>b.sets-a.sets||a.name.localeCompare(b.name,'es'))};
  }
  function stateFor(metrics){if(!metrics.sets)return'no-data';if(metrics.sessions<2)return'insufficient';if(metrics.exercises.some(item=>!item.volume&& !item.bodyweight))return'partial';return'sufficient';}
  function build({sessions=[],library=[],days=30,today=data().format(new Date())}={}){
    const rows=gym().flatten(sessions,library),period=data().windows(rows.map(row=>row.date),{days,today}),weekStart=data().monday(today),fourWeekStart=data().shift(weekStart,-21),muscles=[...new Set(rows.map(row=>row.muscle))];
    const result=muscles.map(name=>{
      const own=rows.filter(row=>row.muscle===name),currentRows=own.filter(row=>data().inRange(row.date,period.currentStart,period.currentEnd)),previousRows=period.all?[]:own.filter(row=>data().inRange(row.date,period.previousStart,period.previousEnd));
      const current=aggregate(currentRows),previous=aggregate(previousRows),thisWeek=aggregate(own.filter(row=>data().inRange(row.date,weekStart,today))),lastFourWeeks=aggregate(own.filter(row=>data().inRange(row.date,fourWeekStart,today)));
      const weekly=[];for(let offset=3;offset>=0;offset--){const start=data().shift(weekStart,-offset*7),end=data().shift(start,6),metrics=aggregate(own.filter(row=>data().inRange(row.date,start,end)));weekly.push({start,label:start.slice(5),...metrics});}
      return{id:gym().normalize(name).replace(/\s+/g,'-'),name,current,previous,thisWeek,lastFourWeeks,weekly,frequencyPerWeek:Math.round((lastFourWeeks.sessions/4)*10)/10,setsChange:data().percentChange(current.sets,previous.sets),volumeChange:data().percentChange(current.volume,previous.volume),state:stateFor(current)};
    }).sort((a,b)=>b.current.sets-a.current.sets||a.name.localeCompare(b.name,'es'));
    return{period,muscles:result,byId:Object.fromEntries(result.map(item=>[item.id,item]))};
  }
  global.MUSCLE_PROGRESS=Object.freeze({aggregate,stateFor,build});
})(window);
