(function(global){
  'use strict';

  const VERSION=1;
  const DECISIONS=Object.freeze(['confirm','exclude-record','exclude-progression']);
  const decisionSet=new Set(DECISIONS);

  function number(value,fallback=0){
    const parsed=global.APP_NUMBERS?.parse?.(value);
    if(parsed!==undefined)return parsed??fallback;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:fallback;
  }
  function round(value,places=2){
    const factor=10**places;
    return Math.round(number(value)*factor)/factor;
  }
  function setModel(){return global.WORKOUT_SET_MODEL||null;}
  function equipment(){return global.WORKOUT_EQUIPMENT||null;}
  function metrics(){return global.WORKOUT_METRICS||null;}
  function normalize(set={},exercise={}){
    const load=equipment()?.normalizeSet?.(set,exercise)||set;
    return setModel()?.normalize?.(load)||{...load,setType:load.setType||'working',completed:load.completed!==false};
  }
  function metric(set,exercise={}){
    return metrics()?.calculateSetMetrics?.(set,exercise)||{
      reps:Math.max(0,number(set.reps)),
      recordLoadKg:Math.max(0,number(set.recordLoadKg??set.weightKg??set.weight)),
      normalizedTotalKg:Math.max(0,number(set.normalizedTotalKg??set.weightKg??set.weight)),
      externalLoadVolume:Math.max(0,number(set.reps))*Math.max(0,number(set.normalizedTotalKg??set.weightKg??set.weight)),
      measurementMode:set.measurementMode||'reps',
      loadMode:set.loadMode||'total',
      durationSeconds:Math.max(0,number(set.durationSeconds)),
      distanceMeters:Math.max(0,number(set.distanceMeters)),
      assistanceKg:Math.max(0,number(set.assistanceKg)),
      recordEligible:set.completed!==false&&!set.excludeFromRecords
    };
  }
  function key(set,exercise={}){
    return equipment()?.comparisonKey?.(set,exercise.exerciseId||exercise.id||'')||[
      exercise.exerciseId||exercise.id||set.exerciseId||'',
      set.measurementMode||'reps',set.loadMode||'total',set.equipmentId||set.equipmentName||'unspecified',
      set.gymName||'',set.laterality||'bilateral',set.repsMode||'total'
    ].join('|');
  }
  function signature(set={},exercise={}){
    const row=normalize(set,exercise),value=metric(row,exercise);
    return [
      key(row,exercise),value.reps,round(value.recordLoadKg),round(value.normalizedTotalKg),
      round(value.assistanceKg),round(value.durationSeconds),round(value.distanceMeters),row.setType||'working'
    ].join('|');
  }
  function median(values=[]){
    const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
    if(!sorted.length)return 0;
    const middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }
  function issue(code,title,detail,severity='warning'){
    return{code,title,detail,severity};
  }
  function historicalRows(history=[],exercise={}){
    return (Array.isArray(history)?history:[]).map(raw=>{
      const set=normalize(raw,exercise),value=metric(set,exercise);
      return{set,value,key:key(set,exercise)};
    }).filter(row=>row.set.completed!==false&&(row.value.recordEligible??true)&&row.set.anomalyReview?.decision!=='exclude-record'&&row.set.anomalyReview?.decision!=='exclude-progression');
  }
  function analyze({candidate={},history=[],exercise={}}={}){
    const set=normalize(candidate,exercise),value=metric(set,exercise),candidateKey=key(set,exercise),issues=[];
    const eligible=value.recordEligible??(setModel()?.countsForRecords?.(set)??true);
    if(!eligible)return{suspicious:false,severity:'none',issues,comparedCount:0,signature:signature(set,exercise),baseline:null};

    const rows=historicalRows(history,exercise),sameMeasurement=rows.filter(row=>row.value.measurementMode===value.measurementMode),comparable=sameMeasurement.filter(row=>row.key===candidateKey);
    const baselineRows=comparable.length>=2?comparable:sameMeasurement;
    const loads=baselineRows.map(row=>Math.max(0,number(row.value.recordLoadKg))),reps=baselineRows.map(row=>Math.max(0,number(row.value.reps))),volumes=baselineRows.map(row=>Math.max(0,number(row.value.externalLoadVolume)));
    const maxLoad=Math.max(0,...loads),maxReps=Math.max(0,...reps),maxVolume=Math.max(0,...volumes),load=Math.max(0,number(value.recordLoadKg)),currentReps=Math.max(0,number(value.reps)),volume=Math.max(0,number(value.externalLoadVolume));

    if(['reps','assistance'].includes(value.measurementMode)){
      if(currentReps>200||baselineRows.length>=2&&currentReps>Math.max(100,maxReps*2.5,maxReps+30))issues.push(issue('reps-improbable','Repeticiones inusuales',`Se registraron ${Math.round(currentReps)} reps; el maximo comparable anterior era ${Math.round(maxReps)}.`,currentReps>200?'high':'warning'));
      if(load>1000)issues.push(issue('load-absolute','Carga fuera del rango habitual',`La carga normalizada es ${round(load)} kg.`,'high'));
      if(baselineRows.length>=2&&maxLoad>0&&load>maxLoad){
        const ratio=load/maxLoad,delta=load-maxLoad;
        if(set.originalUnit!=='lb'&&ratio>=2.05&&ratio<=2.35&&delta>=10)issues.push(issue('possible-unit-error','Posible confusion entre kg y lb',`La carga es ${round(ratio,1)} veces el maximo comparable anterior.`,'high'));
        else if(ratio>=1.75&&delta>=10)issues.push(issue('load-jump','Aumento de carga inusual',`La carga sube ${round((ratio-1)*100)}% frente al maximo comparable anterior.`,'high'));
      }
      if(baselineRows.length>=2&&maxVolume>0&&volume>maxVolume*3&&volume-maxVolume>1000)issues.push(issue('volume-extreme','Volumen de serie inusual',`La serie suma ${Math.round(volume)} kg de volumen frente a un maximo comparable de ${Math.round(maxVolume)}.`));
    }
    if(value.measurementMode==='time'&&number(value.durationSeconds)>86400)issues.push(issue('duration-improbable','Duracion inusual','La duracion supera 24 horas.','high'));
    if(value.measurementMode==='distance'&&number(value.distanceMeters)>500000)issues.push(issue('distance-improbable','Distancia inusual','La distancia supera 500 km.','high'));

    const sameEquipment=rows.filter(row=>{
      const previous=row.set.equipmentId||row.set.equipmentName||'';
      const current=set.equipmentId||set.equipmentName||'';
      return previous&&current&&previous===current;
    });
    if(sameEquipment.length>=2){
      const modes=sameEquipment.map(row=>row.value.loadMode),dominant=modes.sort((a,b)=>modes.filter(mode=>mode===b).length-modes.filter(mode=>mode===a).length)[0];
      const previousInput=median(sameEquipment.filter(row=>row.value.loadMode===dominant).map(row=>Math.max(0,number(row.set.weightKg??row.set.weight))));
      const currentInput=Math.max(0,number(set.weightKg??set.weight));
      const similarInput=previousInput>0&&currentInput/previousInput>=.8&&currentInput/previousInput<=1.2;
      if(similarInput&&value.loadMode==='total'&&['perHand','perSide'].includes(dominant))issues.push(issue('load-mode-change','Revisar interpretacion de carga',`Este equipo se registraba ${dominant==='perHand'?'por mano':'por lado'} y ahora figura como carga total.`));
      if((value.loadMode==='addedLoad'&&dominant==='assistance')||(value.loadMode==='assistance'&&dominant==='addedLoad'))issues.push(issue('assistance-load-change','Revisar lastre y asistencia','Este equipo cambio entre lastre y asistencia. Son magnitudes opuestas.','high'));
    }

    const severity=issues.some(item=>item.severity==='high')?'high':issues.length?'warning':'none';
    return{
      suspicious:issues.length>0,
      severity,
      issues,
      comparedCount:baselineRows.length,
      signature:signature(set,exercise),
      baseline:{maxLoadKg:round(maxLoad),maxReps:round(maxReps),maxVolume:round(maxVolume),comparisonKey:candidateKey}
    };
  }
  function applyDecision(candidate={},analysis={},decision='confirm',{now=new Date().toISOString()}={}){
    if(!decisionSet.has(decision))throw new Error('Decision de anomalia no valida.');
    const set={...candidate};
    if(decision==='confirm'){
      set.excludeFromRecords=false;
      set.excludeFromProgression=false;
    }
    if(decision==='exclude-record'){
      set.excludeFromRecords=true;
      set.excludeFromProgression=false;
    }
    if(decision==='exclude-progression'){
      set.excludeFromRecords=true;
      set.excludeFromProgression=true;
    }
    set.anomalyReview={
      version:VERSION,
      decision,
      status:decision==='confirm'?'confirmed':'excluded',
      severity:analysis.severity||'warning',
      codes:(analysis.issues||[]).map(item=>item.code),
      detectedAt:now,
      signature:analysis.signature||''
    };
    return set;
  }
  function markPending(candidate={},analysis={}, {now=new Date().toISOString()}={}){
    return{
      ...candidate,
      excludeFromRecords:true,
      excludeFromProgression:true,
      anomalyReview:{
        version:VERSION,
        decision:'pending',
        status:'pending',
        severity:analysis.severity||'warning',
        codes:(analysis.issues||[]).map(item=>item.code),
        detectedAt:now,
        signature:analysis.signature||''
      }
    };
  }
  function label(decision){
    return decision==='confirm'?'Confirmado':decision==='exclude-record'?'Sin record':decision==='exclude-progression'?'Fuera de record y progresion':'Pendiente';
  }

  global.WORKOUT_ANOMALY_DETECTOR=Object.freeze({VERSION,DECISIONS:[...DECISIONS],analyze,applyDecision,markPending,signature,label});
})(window);
