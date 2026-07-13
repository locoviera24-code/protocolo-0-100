(function(global){
  'use strict';

  const VERSION=1;
  const DEFINITIONS=[
    {id:'chest',label:'Pecho',region:'torso',aliases:['pecho','pectorales','pectoral']},
    {id:'lats',label:'Dorsales',region:'torso',aliases:['dorsal','dorsales','lat','lats','espalda dorsal']},
    {id:'upper-back',label:'Espalda alta',region:'torso',aliases:['espalda','espalda alta','romboides','remo']},
    {id:'traps',label:'Trapecios',region:'torso',aliases:['trapecio','trapecios']},
    {id:'front-delts',label:'Deltoides anterior',region:'shoulders',aliases:['deltoides anterior','hombro anterior','hombro','deltoide anterior']},
    {id:'side-delts',label:'Deltoides lateral',region:'shoulders',aliases:['deltoides lateral','hombro lateral','deltoide lateral']},
    {id:'rear-delts',label:'Deltoides posterior',region:'shoulders',aliases:['deltoides posterior','hombro posterior','deltoide posterior']},
    {id:'biceps',label:'Bíceps',region:'arms',aliases:['biceps','bíceps']},
    {id:'brachialis',label:'Braquial',region:'arms',aliases:['braquial','brachialis']},
    {id:'triceps',label:'Tríceps',region:'arms',aliases:['triceps','tríceps']},
    {id:'forearms',label:'Antebrazos',region:'arms',aliases:['antebrazo','antebrazos']},
    {id:'core',label:'Core',region:'core',aliases:['core','abdomen','abdominales','zona media']},
    {id:'lower-back',label:'Espalda baja',region:'core',aliases:['espalda baja','lumbar','lumbares']},
    {id:'glutes',label:'Glúteos',region:'legs',aliases:['gluteo','gluteos','glúteo','glúteos']},
    {id:'quads',label:'Cuádriceps',region:'legs',aliases:['cuadriceps','cuádriceps','cuadriceps pierna','cuádriceps pierna','pierna']},
    {id:'hamstrings',label:'Isquiotibiales',region:'legs',aliases:['isquiotibial','isquiotibiales','femoral','femorales']},
    {id:'adductors',label:'Aductores',region:'legs',aliases:['aductor','aductores']},
    {id:'abductors',label:'Abductores',region:'legs',aliases:['abductor','abductores']},
    {id:'calves',label:'Pantorrillas',region:'lower-legs',aliases:['pantorrilla','pantorrillas','gemelo','gemelos','soleo','sóleo']},
    {id:'tibialis',label:'Tibial anterior',region:'lower-legs',aliases:['tibial','tibial anterior']}
  ].map((item,index)=>Object.freeze({...item,order:index+1,anatomical:true}));
  const OTHER=Object.freeze({id:'other',label:'Otro / sin clasificar',region:'other',aliases:['general','otro','otros','movilidad','recuperacion','recuperación'],order:DEFINITIONS.length+1,anatomical:false});
  const ALL=Object.freeze([...DEFINITIONS,OTHER]);
  const BY_ID=new Map(ALL.map(item=>[item.id,item]));

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
  function resolveExercise({exercise={},definition=null}={}){
    const source=definition||exercise||{},exerciseId=source.id||exercise.exerciseId||exercise.id||'',override=exerciseOverride(exerciseId);
    const rawPrimary=source.primaryMuscles||exercise.primaryMuscles||[],explicitPrimary=canonicalizeList(rawPrimary),canonicalPrimary=(Array.isArray(rawPrimary)?rawPrimary:[rawPrimary]).some(isCanonical);
    const primaryMuscles=canonicalPrimary?explicitPrimary:(override?.primary?.slice()||(explicitPrimary.length?explicitPrimary:canonicalizeList([exercise.muscle,source.group],{fallback:true})));
    const rawSecondary=source.secondaryMuscles||exercise.secondaryMuscles||[],explicitSecondary=canonicalizeList(rawSecondary),canonicalSecondary=(Array.isArray(rawSecondary)?rawSecondary:[rawSecondary]).some(isCanonical);
    const secondaryMuscles=(canonicalSecondary?explicitSecondary:(override?.secondary?.slice()||explicitSecondary)).filter(id=>!primaryMuscles.includes(id));
    return{primaryMuscles:[...new Set(primaryMuscles)],secondaryMuscles:[...new Set(secondaryMuscles)],source:canonicalPrimary?'explicit':override?'exercise-map':explicitPrimary.length?'legacy-map':'fallback'};
  }
  function definitions({includeOther=false}={}){return (includeOther?ALL:DEFINITIONS).slice();}

  global.MUSCLE_TAXONOMY=Object.freeze({VERSION,definitions,get,label,isCanonical,canonicalId,canonicalizeList,legacyValues,exerciseOverride,resolveExercise,normalize});
})(window);
