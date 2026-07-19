(function(global){
  'use strict';

  const VERSION=3;
  const DEFINITIONS=[
    {id:'chest',label:'Pecho',region:'torso',aliases:['pecho','pectorales','pectoral']},
    {id:'lats',label:'Dorsales',region:'torso',aliases:['dorsal','dorsales','lat','lats','espalda dorsal']},
    {id:'upper-back',label:'Espalda alta',region:'torso',aliases:['espalda alta','romboides','remo']},
    {id:'traps',label:'Trapecios',region:'torso',aliases:['trapecio','trapecios']},
    {id:'front-delts',label:'Deltoides anterior',region:'shoulders',aliases:['deltoides anterior','hombro anterior','deltoide anterior']},
    {id:'side-delts',label:'Deltoides lateral',region:'shoulders',aliases:['deltoides lateral','hombro lateral','deltoide lateral']},
    {id:'rear-delts',label:'Deltoides posterior',region:'shoulders',aliases:['deltoides posterior','hombro posterior','deltoide posterior']},
    {id:'biceps',label:'Bíceps',region:'arms',aliases:['biceps','bíceps']},
    {id:'brachialis',label:'Braquial',region:'arms',aliases:['braquial','brachialis']},
    {id:'triceps',label:'Tríceps',region:'arms',aliases:['triceps','tríceps']},
    {id:'forearms',label:'Antebrazos',region:'arms',aliases:['antebrazo','antebrazos']},
    {id:'core',label:'Core',region:'core',aliases:['core','abdomen','abdominales','zona media']},
    {id:'lower-back',label:'Espalda baja',region:'core',aliases:['espalda baja','lumbar','lumbares']},
    {id:'glutes',label:'Glúteos',region:'legs',aliases:['gluteo','gluteos','glúteo','glúteos']},
    {id:'quads',label:'Cuádriceps',region:'legs',aliases:['cuadriceps','cuádriceps','cuadriceps pierna','cuádriceps pierna']},
    {id:'hamstrings',label:'Isquiotibiales',region:'legs',aliases:['isquiotibial','isquiotibiales','femoral','femorales']},
    {id:'adductors',label:'Aductores',region:'legs',aliases:['aductor','aductores']},
    {id:'abductors',label:'Abductores',region:'legs',aliases:['abductor','abductores']},
    {id:'calves',label:'Pantorrillas',region:'lower-legs',aliases:['pantorrilla','pantorrillas','gemelo','gemelos','soleo','sóleo']},
    {id:'tibialis',label:'Tibial anterior',region:'lower-legs',aliases:['tibial','tibial anterior']}
  ].map((item,index)=>Object.freeze({...item,order:index+1,anatomical:true}));
  const OTHER=Object.freeze({id:'other',label:'Otro / sin clasificar',region:'other',aliases:['general','otro','otros','movilidad','recuperacion','recuperación'],order:DEFINITIONS.length+1,anatomical:false});
  const ALL=Object.freeze([...DEFINITIONS,OTHER]);
  const BY_ID=new Map(ALL.map(item=>[item.id,item]));
  const CLASSIFICATION_STATUSES=Object.freeze(['official','confirmed','inferred','needs-review']);
  const CLASSIFICATION_CONFIDENCE=Object.freeze(['high','medium','low','unknown']);
  const CLASSIFICATION_SOURCES=Object.freeze(['official-library','user-confirmed','specific-label','legacy-label','unclassified']);
  const AMBIGUOUS_TERMS=Object.freeze({
    hombro:Object.freeze(['front-delts','side-delts','rear-delts']),
    hombros:Object.freeze(['front-delts','side-delts','rear-delts']),
    espalda:Object.freeze(['lats','upper-back','traps','lower-back']),
    pierna:Object.freeze(['glutes','quads','hamstrings','adductors','abductors','calves','tibialis']),
    piernas:Object.freeze(['glutes','quads','hamstrings','adductors','abductors','calves','tibialis'])
  });

  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  const BY_ALIAS=new Map();
  ALL.forEach(item=>[item.id,item.label,...item.aliases].forEach(alias=>BY_ALIAS.set(normalize(alias),item.id)));

  const EXERCISE_MUSCLES=Object.freeze({
    'peck-deck':{primary:['chest'],secondary:['front-delts']},
    'press-banca':{primary:['chest'],secondary:['triceps','front-delts']},
    'dominadas':{primary:['lats'],secondary:['biceps','upper-back']},
    'jalon-pecho-sentado':{primary:['lats'],secondary:['biceps']},
    'laterales-polea':{primary:['side-delts'],secondary:['traps']},
    'press-militar-maquina':{primary:['front-delts'],secondary:['triceps','side-delts']},
    'curl-martillo':{primary:['brachialis'],secondary:['biceps','forearms']},
    'curl-barra-z-sentado':{primary:['biceps'],secondary:['brachialis','forearms']},
    'extension-triceps-polea':{primary:['triceps'],secondary:[]},
    'prensa':{primary:['quads'],secondary:['glutes','hamstrings']},
    'extension-cuadriceps':{primary:['quads'],secondary:[]},
    'aductores-maquina':{primary:['adductors'],secondary:[]},
    'pantorrillas-sentado':{primary:['calves'],secondary:[]},
    'tibial-anterior':{primary:['tibialis'],secondary:[]},
    'remo-polea':{primary:['upper-back'],secondary:['lats','biceps','rear-delts']},
    'sentadilla':{primary:['quads'],secondary:['glutes','core']},
    'peso-muerto-rumano':{primary:['hamstrings'],secondary:['glutes','lower-back']},
    'movilidad-suave':{primary:['other'],secondary:[]}
  });

  function isCanonical(value){return BY_ID.has(String(value||''));}
  function get(value){return BY_ID.get(String(value||''))||null;}
  function label(value){return get(value)?.label||OTHER.label;}
  function canonicalId(value,{fallback='other'}={}){
    const raw=String(value||'');
    if(BY_ID.has(raw))return raw;
    return BY_ALIAS.get(normalize(raw))||(fallback&&BY_ID.has(fallback)?fallback:null);
  }
  function canonicalizeList(values,{fallback=false}={}){
    const source=Array.isArray(values)?values:[values],result=[];
    source.forEach(value=>{const id=canonicalId(value,{fallback:null});if(id&&!result.includes(id))result.push(id);});
    if(!result.length&&fallback)result.push('other');
    return result;
  }
  function legacyValues(values){return (Array.isArray(values)?values:[values]).map(value=>String(value||'').trim()).filter(value=>value&&!isCanonical(value));}
  function exerciseOverride(exerciseId){return EXERCISE_MUSCLES[String(exerciseId||'')]||null;}
  function ambiguousTerms(values){
    const result=[];
    (Array.isArray(values)?values:[values]).forEach(value=>{
      const term=normalize(value);
      if(AMBIGUOUS_TERMS[term]&&!result.some(item=>item.term===term))result.push({term,candidates:[...AMBIGUOUS_TERMS[term]]});
    });
    return result;
  }
  function isCustomRecord(record={},exerciseId=''){
    return !!(record.custom||record.origin==='custom'||record.manual||String(exerciseId||record.id||'').startsWith('custom-'));
  }
  function cleanClassification(primary,secondary){
    let primaryMuscles=canonicalizeList(primary);
    if(primaryMuscles.length>1)primaryMuscles=primaryMuscles.filter(id=>id!=='other');
    if(!primaryMuscles.length)primaryMuscles=['other'];
    const secondaryMuscles=canonicalizeList(secondary).filter(id=>id!=='other'&&!primaryMuscles.includes(id));
    return{primaryMuscles:[...new Set(primaryMuscles)],secondaryMuscles:[...new Set(secondaryMuscles)]};
  }
  function validValue(values,value){return values.includes(String(value||''))?String(value):'';}
  function legacyStatus(record={}){
    return validValue(CLASSIFICATION_STATUSES,record.muscleClassificationConfidence);
  }
  function statusFor(record={}){
    return validValue(CLASSIFICATION_STATUSES,record.classificationStatus||record.muscleClassificationStatus)||legacyStatus(record);
  }
  function sourceFor(record={}){
    return validValue(CLASSIFICATION_SOURCES,record.classificationSource||record.muscleClassificationSource);
  }
  function confidenceFor(record={},status=''){
    const explicit=validValue(CLASSIFICATION_CONFIDENCE,record.classificationConfidence)||validValue(CLASSIFICATION_CONFIDENCE,record.muscleClassificationConfidence);
    if(explicit)return explicit;
    if(status==='official'||status==='confirmed')return'high';
    if(status==='inferred')return'medium';
    return'unknown';
  }
  function classificationMetadata(record={}){
    const classificationStatus=statusFor(record);
    return{
      classificationStatus,
      classificationSource:sourceFor(record),
      classificationConfidence:confidenceFor(record,classificationStatus),
      legacyBuild74:!!legacyStatus(record)&&!record.classificationStatus
    };
  }
  function resolveExercise({exercise={},definition=null}={}){
    const source=definition||exercise||{},exerciseId=source.exerciseId||exercise.exerciseId||source.id||exercise.id||'',override=exerciseOverride(exerciseId);
    const rawPrimary=source.primaryMuscles||exercise.primaryMuscles||[],rawSecondary=source.secondaryMuscles||exercise.secondaryMuscles||[];
    const stored=classificationMetadata({...exercise,...source});
    const ambiguities=ambiguousTerms([exercise.muscle,exercise.group,source.muscle,source.group,...(source.legacyPrimaryMuscles||[])]);
    let classification,classificationStatus,classificationSource,classificationConfidence;
    if(override||source.official){
      classification=cleanClassification(override?.primary||rawPrimary,override?.secondary||rawSecondary);
      classificationStatus='official';classificationSource='official-library';classificationConfidence='high';
    }else if(stored.classificationStatus==='confirmed'){
      classification=cleanClassification(rawPrimary,rawSecondary);
      classificationStatus='confirmed';classificationSource=stored.classificationSource||'user-confirmed';classificationConfidence=stored.classificationConfidence||'high';
    }else if(isCustomRecord(source,exerciseId)||isCustomRecord(exercise,exerciseId)){
      if(ambiguities.length||stored.classificationStatus==='needs-review'){
        classification={primaryMuscles:['other'],secondaryMuscles:[]};
        classificationStatus='needs-review';classificationSource=stored.classificationSource||'legacy-label';classificationConfidence='unknown';
      }else{
        classification=cleanClassification(rawPrimary.length?rawPrimary:[exercise.muscle,source.group],rawSecondary);
        classificationStatus=classification.primaryMuscles[0]==='other'?'needs-review':'inferred';
        classificationSource=stored.classificationSource||(classificationStatus==='inferred'?'specific-label':'unclassified');
        classificationConfidence=classificationStatus==='inferred'?(stored.classificationConfidence||'medium'):'unknown';
      }
    }else{
      classification=cleanClassification(rawPrimary.length?rawPrimary:[exercise.muscle,source.group],rawSecondary);
      classificationStatus=classification.primaryMuscles[0]==='other'?'needs-review':'inferred';
      classificationSource=stored.classificationSource||(classificationStatus==='inferred'?'specific-label':'unclassified');
      classificationConfidence=classificationStatus==='inferred'?(stored.classificationConfidence||'medium'):'unknown';
    }
    return{...classification,status:classificationStatus,source:classificationSource,confidence:classificationConfidence,classificationStatus,classificationSource,classificationConfidence,needsReview:classificationStatus==='needs-review',legacyBuild74:stored.legacyBuild74,ambiguities};
  }
  function confirmClassification(record={},options={}){
    const classification=cleanClassification(options.primaryMuscles,options.secondaryMuscles);
    return {...record,...classification,classificationStatus:'confirmed',classificationSource:options.source||'user-confirmed',classificationConfidence:'high',muscleClassificationNeedsReview:false,muscleClassificationReviewedAt:options.reviewedAt||new Date().toISOString(),muscleTaxonomyVersion:VERSION};
  }
  function snapshotFor({exercise={},definition=null,capturedAt}={}){
    const resolved=resolveExercise({exercise,definition});
    return{taxonomyVersion:VERSION,primaryMuscles:[...resolved.primaryMuscles],secondaryMuscles:[...resolved.secondaryMuscles],classificationStatus:resolved.classificationStatus,classificationSource:resolved.classificationSource,classificationConfidence:resolved.classificationConfidence,capturedAt:capturedAt||new Date().toISOString()};
  }
  function resolveSnapshot(snapshot){
    if(!snapshot||typeof snapshot!=='object')return null;
    const classification=cleanClassification(snapshot.primaryMuscles,snapshot.secondaryMuscles);
    const classificationStatus=validValue(CLASSIFICATION_STATUSES,snapshot.classificationStatus);
    const classificationSource=validValue(CLASSIFICATION_SOURCES,snapshot.classificationSource);
    const classificationConfidence=validValue(CLASSIFICATION_CONFIDENCE,snapshot.classificationConfidence);
    if(!classificationStatus||!classificationSource||!classificationConfidence||!String(snapshot.capturedAt||''))return null;
    return{...classification,status:classificationStatus,source:classificationSource,confidence:classificationConfidence,classificationStatus,classificationSource,classificationConfidence,needsReview:classificationStatus==='needs-review',taxonomyVersion:Number(snapshot.taxonomyVersion)||0,capturedAt:String(snapshot.capturedAt)};
  }
  function pendingClassifications(records=[]){
    return (records||[]).filter(record=>isCustomRecord(record,record?.id)).map(record=>({record,resolution:resolveExercise({exercise:record,definition:record})})).filter(item=>item.resolution.needsReview);
  }
  function definitions({includeOther=false}={}){return (includeOther?ALL:DEFINITIONS).slice();}

  global.MUSCLE_TAXONOMY=Object.freeze({VERSION,CLASSIFICATION_STATUSES,CLASSIFICATION_CONFIDENCE,CLASSIFICATION_SOURCES,definitions,get,label,isCanonical,canonicalId,canonicalizeList,legacyValues,exerciseOverride,ambiguousTerms,classificationMetadata,resolveExercise,confirmClassification,snapshotFor,resolveSnapshot,pendingClassifications,normalize});
})(window);
