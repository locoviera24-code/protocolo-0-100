(function(global){
  'use strict';

  const VERSION=1;
  const LB_PER_KG=2.2046226218;
  const loadModes=Object.freeze([
    {id:'total',label:'Carga total',weightLabel:'Carga total'},
    {id:'perHand',label:'Por mano',weightLabel:'Carga por mano'},
    {id:'perSide',label:'Por lado',weightLabel:'Discos por lado'},
    {id:'bodyweight',label:'Peso corporal',weightLabel:'Sin carga externa'},
    {id:'addedLoad',label:'Lastre',weightLabel:'Lastre agregado'},
    {id:'assistance',label:'Asistencia',weightLabel:'Asistencia'}
  ]);
  const measurementModes=Object.freeze([
    {id:'reps',label:'Repeticiones'},
    {id:'time',label:'Tiempo'},
    {id:'distance',label:'Distancia'},
    {id:'assistance',label:'Repeticiones con asistencia'}
  ]);
  const lateralities=Object.freeze([
    {id:'bilateral',label:'Ambos lados'},
    {id:'left',label:'Lado izquierdo'},
    {id:'right',label:'Lado derecho'},
    {id:'alternating',label:'Alternado'}
  ]);
  const profiles=Object.freeze([
    {id:'unspecified',name:'Sin especificar',kind:'generic',loadMode:'total',incrementKg:.5},
    {id:'barbell-20',name:'Barra olimpica 20 kg',kind:'barbell',loadMode:'perSide',barWeightKg:20,incrementKg:2.5},
    {id:'technical-bar',name:'Barra tecnica',kind:'barbell',loadMode:'perSide',barWeightKg:10,incrementKg:1},
    {id:'dumbbells',name:'Mancuernas',kind:'dumbbell',loadMode:'perHand',incrementKg:1},
    {id:'machine',name:'Maquina',kind:'machine',loadMode:'total',incrementKg:2.5},
    {id:'cable-stack',name:'Polea',kind:'cable',loadMode:'total',incrementKg:2.5},
    {id:'smith',name:'Smith',kind:'smith',loadMode:'perSide',barWeightKg:0,incrementKg:2.5},
    {id:'bodyweight',name:'Peso corporal',kind:'bodyweight',loadMode:'bodyweight',incrementKg:.5},
    {id:'assisted-machine',name:'Maquina asistida',kind:'assistance',loadMode:'assistance',incrementKg:2.5}
  ]);
  const loadIds=new Set(loadModes.map(item=>item.id));
  const measurementIds=new Set(measurementModes.map(item=>item.id));
  const lateralityIds=new Set(lateralities.map(item=>item.id));

  function number(value,fallback=0){
    const parsed=global.APP_NUMBERS?.parse?.(value);
    if(parsed!==undefined) return parsed??fallback;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:fallback;
  }
  function nonNegative(value,fallback=0){return Math.max(0,number(value,fallback));}
  function round(value,places=2){const factor=10**places;return Math.round(number(value)*factor)/factor;}
  function loadMode(value,fallback='total'){return loadIds.has(value)?value:(loadIds.has(fallback)?fallback:'total');}
  function measurementMode(value,fallback='reps'){return measurementIds.has(value)?value:(measurementIds.has(fallback)?fallback:'reps');}
  function laterality(value){return lateralityIds.has(value)?value:'bilateral';}
  function profile(id,customProfiles=[]){
    return [...profiles,...(Array.isArray(customProfiles)?customProfiles:[])].find(item=>item?.id===id)||null;
  }
  function inferMeasurement(set={},exercise={}){
    if(measurementIds.has(set.measurementMode)) return set.measurementMode;
    if(set.loadMode==='assistance'||set.assistanceKg!==undefined) return 'assistance';
    const unit=String(exercise.measurementMode||exercise.unit||'').toLowerCase();
    if(unit.includes('tiempo')||unit.includes('time')) return 'time';
    if(unit.includes('distancia')||unit.includes('distance')) return 'distance';
    return 'reps';
  }
  function inferLoad(set={},exercise={},measurement='reps'){
    if(loadIds.has(set.loadMode)) return set.loadMode;
    if(measurement==='assistance'||set.assistanceKg!==undefined) return 'assistance';
    if(set.addedLoadKg!==undefined) return 'addedLoad';
    const bodyweight=!!(set.bodyweight||set.isBodyweight||exercise.bodyweight||String(exercise.unit||'').toLowerCase()==='peso corporal');
    const legacyWeight=nonNegative(set.weightKg??set.weight,0);
    if(bodyweight) return legacyWeight>0?'addedLoad':'bodyweight';
    return loadMode(exercise.defaultLoadMode||exercise.loadMode,'total');
  }
  function sidesFor(mode,lateral){
    if(mode!=='perHand'&&mode!=='perSide') return 1;
    return lateral==='left'||lateral==='right'?1:2;
  }
  function normalizeSet(set={},exercise={}){
    const measurement=measurementMode(inferMeasurement(set,exercise));
    const mode=loadMode(inferLoad(set,exercise,measurement));
    const side=laterality(set.laterality);
    const originalUnit=String(set.originalUnit||'kg').toLowerCase()==='lb'?'lb':'kg';
    const storedWeight=nonNegative(set.weightKg??set.weight,0);
    const weightKg=round(storedWeight);
    const barWeightKg=round(nonNegative(set.barWeightKg,0));
    const addedLoadKg=round(nonNegative(set.addedLoadKg,mode==='addedLoad'?weightKg:0));
    const assistanceKg=round(nonNegative(set.assistanceKg,mode==='assistance'?storedWeight:0));
    const sides=sidesFor(mode,side);
    let normalizedTotalKg=0;
    if(mode==='total') normalizedTotalKg=weightKg;
    else if(mode==='perHand') normalizedTotalKg=weightKg*sides;
    else if(mode==='perSide') normalizedTotalKg=weightKg*sides+barWeightKg;
    else if(mode==='addedLoad') normalizedTotalKg=addedLoadKg;
    normalizedTotalKg=round(normalizedTotalKg);
    const recordLoadKg=round(mode==='perHand'?weightKg:normalizedTotalKg);
    const durationSeconds=Math.max(0,Math.round(number(set.durationSeconds,0)));
    const distanceMeters=round(nonNegative(set.distanceMeters,0));
    const paceSecondsPerKm=distanceMeters>0&&durationSeconds>0?Math.round(durationSeconds/(distanceMeters/1000)):Math.max(0,Math.round(number(set.paceSecondsPerKm,0)));
    const profileValue=profile(set.equipmentId)||null;
    const equipmentName=String(set.equipmentName||profileValue?.name||exercise.equipmentName||'').trim();
    const equipmentId=String(set.equipmentId||exercise.equipmentId||'').trim();
    const originalWeight=nonNegative(set.originalWeight,set.weightDisplay??storedWeight);
    return {
      ...set,
      measurementMode:measurement,
      loadMode:mode,
      weight:weightKg,
      weightKg,
      originalWeight:round(originalWeight),
      originalUnit,
      normalizedTotalKg,
      recordLoadKg,
      addedLoadKg,
      assistanceKg,
      barWeightKg,
      equipmentId,
      equipmentName,
      gymName:String(set.gymName||'').trim(),
      incrementKg:round(nonNegative(set.incrementKg,profileValue?.incrementKg??exercise.incrementKg??.5)),
      laterality:side,
      repsMode:String(set.repsMode||'total'),
      durationSeconds,
      distanceMeters,
      paceSecondsPerKm,
      bodyweight:mode==='bodyweight'||mode==='addedLoad'||!!set.bodyweight,
      isBodyweight:mode==='bodyweight'||mode==='addedLoad'||!!set.isBodyweight
    };
  }
  function comparisonKey(set={},exerciseId=''){
    const row=normalizeSet(set);
    const equipment=row.equipmentId||row.equipmentName||'unspecified';
    return [exerciseId||set.exerciseId||'',row.measurementMode,row.loadMode,equipment,row.gymName||'',row.laterality,row.repsMode].join('|');
  }
  function loadLabel(value){return loadModes.find(item=>item.id===loadMode(value))?.label||'Carga total';}
  function weightLabel(value){return loadModes.find(item=>item.id===loadMode(value))?.weightLabel||'Carga';}
  function measurementLabel(value){return measurementModes.find(item=>item.id===measurementMode(value))?.label||'Repeticiones';}
  function kgFromDisplay(value,unit='kg'){return round(nonNegative(value)/(unit==='lb'?LB_PER_KG:1));}
  function displayFromKg(value,unit='kg'){return round(nonNegative(value)*(unit==='lb'?LB_PER_KG:1),1);}
  function options(items,selected=''){return items.map(item=>({...item,selected:item.id===selected}));}

  global.WORKOUT_EQUIPMENT=Object.freeze({
    VERSION,
    loadModes:()=>loadModes.map(item=>({...item})),
    measurementModes:()=>measurementModes.map(item=>({...item})),
    lateralities:()=>lateralities.map(item=>({...item})),
    profiles:()=>profiles.map(item=>({...item})),
    profile,
    loadMode,
    measurementMode,
    laterality,
    normalizeSet,
    comparisonKey,
    loadLabel,
    weightLabel,
    measurementLabel,
    kgFromDisplay,
    displayFromKg,
    options
  });
})(window);
