(function(global){
  'use strict';
  const data=()=>global.PROGRESS_DATA_MODEL,gym=()=>global.GYM_PROGRESS_MODEL,taxonomy=()=>global.MUSCLE_TAXONOMY;
  function aggregate(rows){
    const sessions=new Set(),exercises=new Map();let sets=0,reps=0,volume=0,lastDate='';
    rows.forEach(row=>{const effectiveSets=row.sets.filter(set=>set.mainVolume!==false);if(!effectiveSets.length)return;sessions.add(row.sessionId);lastDate=String(row.date)>lastDate?row.date:lastDate;const current=exercises.get(row.exerciseId)||{id:row.exerciseId,name:row.exerciseName,sets:0,reps:0,volume:0,sessions:new Set(),lastDate:'',bodyweight:row.bodyweight};effectiveSets.forEach(set=>{sets+=1;reps+=set.reps;volume+=set.volume;current.sets+=1;current.reps+=set.reps;current.volume+=set.volume;});current.sessions.add(row.sessionId);current.lastDate=String(row.date)>current.lastDate?row.date:current.lastDate;exercises.set(row.exerciseId,current);});
    return{sets,reps,volume,sessions:sessions.size,lastDate,exercises:[...exercises.values()].map(item=>({...item,sessions:item.sessions.size})).sort((a,b)=>b.sets-a.sets||a.name.localeCompare(b.name,'es'))};
  }
  function stateFor(metrics){if(!metrics.sets)return'no-data';if(metrics.sessions<2)return'insufficient';if(metrics.exercises.some(item=>!item.volume&&!item.bodyweight))return'partial';return'sufficient';}
  function metricsForWindows(rows,{period,weekStart,fourWeekStart,today}){
    const current=aggregate(rows.filter(row=>data().inRange(row.date,period.currentStart,period.currentEnd))),previous=period.all?aggregate([]):aggregate(rows.filter(row=>data().inRange(row.date,period.previousStart,period.previousEnd))),thisWeek=aggregate(rows.filter(row=>data().inRange(row.date,weekStart,today))),lastFourWeeks=aggregate(rows.filter(row=>data().inRange(row.date,fourWeekStart,today))),weekly=[];
    for(let offset=3;offset>=0;offset--){const start=data().shift(weekStart,-offset*7),end=data().shift(start,6),metrics=aggregate(rows.filter(row=>data().inRange(row.date,start,end)));weekly.push({start,label:start.slice(5),...metrics});}
    return{current,previous,thisWeek,lastFourWeeks,weekly};
  }
  function build({sessions=[],library=[],days=30,today=data().format(new Date())}={}){
    const rows=gym().flatten(sessions,library),period=data().windows(rows.map(row=>row.date),{days,today}),weekStart=data().monday(today),fourWeekStart=data().shift(weekStart,-21),definitions=taxonomy().definitions(),anatomicalRows=rows.filter(row=>(row.primaryMuscles||[row.muscleId]).some(id=>id!=='other')),unclassifiedRows=rows.filter(row=>(row.primaryMuscles||[row.muscleId]).every(id=>id==='other'));
    const result=definitions.map(definition=>{
      const primaryRows=rows.filter(row=>(row.primaryMuscles||[row.muscleId]).includes(definition.id)),secondaryRows=rows.filter(row=>(row.secondaryMuscles||[]).includes(definition.id)),primary=metricsForWindows(primaryRows,{period,weekStart,fourWeekStart,today}),secondary=metricsForWindows(secondaryRows,{period,weekStart,fourWeekStart,today});
      return{id:definition.id,name:definition.label,region:definition.region,current:primary.current,previous:primary.previous,thisWeek:primary.thisWeek,lastFourWeeks:primary.lastFourWeeks,weekly:primary.weekly,secondaryCurrent:secondary.current,secondaryPrevious:secondary.previous,secondaryThisWeek:secondary.thisWeek,secondaryLastFourWeeks:secondary.lastFourWeeks,secondaryWeekly:secondary.weekly,frequencyPerWeek:Math.round((primary.lastFourWeeks.sessions/4)*10)/10,setsChange:data().percentChange(primary.current.sets,primary.previous.sets),volumeChange:data().percentChange(primary.current.volume,primary.previous.volume),state:stateFor(primary.current)};
    });
    const unclassified=metricsForWindows(unclassifiedRows,{period,weekStart,fourWeekStart,today});
    return{period,hasData:rows.length>0,rows,muscles:result,byId:Object.fromEntries(result.map(item=>[item.id,item])),unclassified:{...unclassified.current,state:stateFor(unclassified.current)},primarySets:anatomicalRows.reduce((sum,row)=>sum+row.sets.filter(set=>set.mainVolume!==false).length,0),unclassifiedSets:unclassifiedRows.reduce((sum,row)=>sum+row.sets.filter(set=>set.mainVolume!==false).length,0),loggedSets:rows.reduce((sum,row)=>sum+row.sets.filter(set=>set.completed!==false).length,0)};
  }
  global.MUSCLE_PROGRESS=Object.freeze({aggregate,stateFor,build});
})(window);
