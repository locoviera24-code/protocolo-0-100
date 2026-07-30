(function(){
  'use strict';

  const keys={
    weeklyWorkoutPlan:'protocolo_0_100_weekly_workout_plan_v1',
    workoutSessions:'protocolo_0_100_workout_sessions_v1',
    exerciseHistory:'protocolo_0_100_exercise_history_v1',
    exerciseLibrary:'protocolo_0_100_exercise_library_v1',
    equipmentProfiles:'protocolo_0_100_equipment_profiles_v1',
    exercisePreferences:'protocolo_0_100_exercise_preferences_v1',
    exerciseLibraryMeta:'protocolo_0_100_exercise_library_meta_v1',
    gymSettings:'protocolo_0_100_gym_settings_v1',
    workoutWidgetState:'protocolo_0_100_workout_widget_state_v1'
  };
  const dayOrder=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const dayLabels={monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado',sunday:'Domingo'};
  const EXERCISE_LIBRARY_VERSION=5;
  const actionOpenToday='com.protocolo.cien.ACTION_OPEN_TODAY_WORKOUT';
  const actionQuickLog='com.protocolo.cien.ACTION_QUICK_LOG_SET';
  const actionCompleteExercise='com.protocolo.cien.ACTION_COMPLETE_CURRENT_EXERCISE';
  const actionRefreshWidget='com.protocolo.cien.ACTION_REFRESH_WORKOUT_WIDGET';
  const actionWidgetSaveSet='com.protocolo.cien.ACTION_WIDGET_SAVE_SET';

  const exerciseLibrary=[
    ex('peck-deck','Apertura sentado / Peck deck',['peck deck','apertura sentado','aperturas en máquina'],'Pecho','máquina','kg',['chest'],['front-delts'],'Controlá el recorrido y evitá rebotar.'),
    ex('press-banca','Press de banca',['press banca','banca'],'Pecho','peso libre','kg',['chest'],['triceps','front-delts'],'Priorizar técnica antes que carga.'),
    ex('dominadas','Dominadas',['dominada','pull up'],'Espalda','peso corporal','peso corporal',['lats'],['biceps','upper-back'],'Registrá reps sin kilos o agregá lastre si corresponde.'),
    ex('jalon-pecho-sentado','Jalón al pecho sentado',['jalón','jalon al pecho','polea alta'],'Espalda','polea','kg',['lats'],['biceps'],'Bajá con control y sin tirar con impulso.'),
    ex('laterales-polea','Elevaciones laterales en polea',['laterales polea','elevaciones laterales'],'Hombro','polea','kg',['side-delts'],['traps'],'Carga moderada y recorrido estable.'),
    ex('press-militar-maquina','Press militar en máquina',['press militar máquina','press hombro maquina'],'Hombro','máquina','kg',['front-delts'],['triceps','side-delts'],'Mantené espalda apoyada y rango cómodo.'),
    ex('curl-martillo','Curl martillo',['martillo'],'Bíceps','peso libre','kg',['brachialis'],['biceps','forearms'],'Codos quietos y muñeca neutral.'),
    ex('curl-barra-z-sentado','Curl con barra Z sentado',['curl z sentado','barra z'],'Bíceps','peso libre','kg',['biceps'],['brachialis','forearms'],'Evitá balanceo; repetición limpia.'),
    ex('extension-triceps-polea','Extensión de tríceps en polea',['triceps polea','extensión tríceps'],'Tríceps','polea','kg',['triceps'],[],'Separá hombros de orejas y extendé con control.'),
    ex('prensa','Prensa',['prensa piernas'],'Cuádriceps / pierna','máquina','kg',['quads'],['glutes','hamstrings'],'No bloquees rodillas con violencia.'),
    ex('extension-cuadriceps','Extensión de cuádriceps',['cuadriceps máquina','extensión pierna'],'Cuádriceps / pierna','máquina','kg',['quads'],[],'Pausa arriba si no molesta la rodilla.'),
    ex('aductores-maquina','Máquina de aductores, cerrar piernas',['aductores','cerrar piernas'],'Aductores','máquina','kg',['adductors'],[],'Cerrar las piernas contra resistencia, sin impulso.'),
    ex('pantorrillas-sentado','Elevación de pantorrillas sentado',['pantorrilla sentado','gemelos sentado'],'Pantorrillas','máquina','kg',['calves'],[],'Recorrido completo y pausa breve arriba.'),
    ex('tibial-anterior','Elevación de punta del pie / tibial anterior',['tibial anterior','punta del pie'],'Tibial anterior','máquina','kg',['tibialis'],[],'Elevar la punta del pie para levantar la carga.'),
    ex('remo-polea','Remo en polea',['remo sentado'],'Espalda','polea','kg',['upper-back'],['lats','biceps','rear-delts'],'Tirón controlado hacia el torso.'),
    ex('sentadilla','Sentadilla',['squat'],'Cuádriceps / pierna','peso libre','kg',['quads'],['glutes','core'],'Rango seguro según movilidad.'),
    ex('peso-muerto-rumano','Peso muerto rumano',['rumano'],'Isquiotibiales','peso libre','kg',['hamstrings'],['glutes','lower-back'],'Bisagra de cadera y espalda neutra.'),
    ex('movilidad-suave','Movilidad suave',['movilidad','estiramiento'],'Movilidad','movilidad','tiempo',['other'],[],'Recuperación también cuenta.')
  ];

  exerciseLibrary.push(
    ex('plancha','Plancha',['plank','plancha abdominal'],'Core','peso corporal','tiempo',['core'],['lower-back'],'Mantene una posicion que puedas controlar.',{measurementMode:'time',defaultLoadMode:'bodyweight',bodyweight:true}),
    ex('caminata','Caminata',['caminar','caminata suave'],'Cardio','cardio','distancia',['other'],['calves'],'Usa distancia y tiempo; el ritmo es orientativo.',{measurementMode:'distance',defaultLoadMode:'bodyweight'}),
    ex('bicicleta','Bicicleta',['bici','bicicleta fija'],'Cardio','cardio','distancia',['quads'],['calves','glutes'],'Registra distancia y duracion si estan disponibles.',{measurementMode:'distance',defaultLoadMode:'bodyweight'}),
    ex('estiramiento-suave','Estiramiento suave',['estiramientos','stretching'],'Movilidad','movilidad','tiempo',['other'],[],'Evita forzar rangos dolorosos.',{measurementMode:'time',defaultLoadMode:'bodyweight'})
  );

  const torsoExercises=[
    item('peck-deck','Pecho'),
    item('press-banca','Pecho'),
    item('dominadas','Espalda',true),
    item('jalon-pecho-sentado','Espalda'),
    item('laterales-polea','Hombro'),
    item('press-militar-maquina','Hombro'),
    item('curl-martillo','Bíceps'),
    item('curl-barra-z-sentado','Bíceps'),
    item('extension-triceps-polea','Tríceps')
  ];
  const legExercises=[
    item('prensa','Cuádriceps / pierna'),
    item('extension-cuadriceps','Cuádriceps / pierna'),
    item('aductores-maquina','Aductores','', 'Ejercicio de cerrar las piernas contra resistencia.'),
    item('pantorrillas-sentado','Pantorrillas'),
    item('tibial-anterior','Tibial anterior','', 'Elevar la punta del pie para levantar la carga.')
  ];
  const defaultWeeklyPlan={
    monday:day('monday','Torso A',['Pecho','Espalda','Hombro','Bíceps','Tríceps'],torsoExercises),
    tuesday:day('tuesday','Pierna A',['Cuádriceps / pierna','Aductores','Pantorrillas','Tibial anterior'],legExercises),
    wednesday:day('wednesday','Torso B',['Pecho','Espalda','Hombro','Bíceps','Tríceps'],torsoExercises),
    thursday:day('thursday','Pierna B',['Cuádriceps / pierna','Aductores','Pantorrillas','Tibial anterior'],legExercises),
    friday:day('friday','Torso C',['Pecho','Espalda','Hombro','Bíceps','Tríceps'],torsoExercises),
    saturday:restDay('saturday','Descanso / actividad suave','Hoy toca descanso o actividad suave.',['caminar','movilidad','estiramiento suave','recuperación']),
    sunday:restDay('sunday','Descanso / revisión semanal','Hoy toca descanso o revisión semanal.',['revisar entrenamientos','revisar progresión','preparar semana','movilidad suave'])
  };
  let currentQuickExerciseId=null;
  let currentPlanEditorDay='monday';
  let lastDeletedPlanExercise=null;
  let lastDeletedQuickSet=null;
  let pendingHistoricalClassificationMigration=null;
  let lastHistoricalClassificationMigration=null;
  let editingQuickSetId='';
  let quickFormDirty=false;
  const quickDrafts=new Map();
  const workoutDraftNotices=new Set();
  let planDraftSelectionHydrated=false;
  let restTimerInterval=null;
  let restTimerEndsAt=0;
  let nativeTimerStatus='idle';
  let nativeTimerPausedSeconds=0;
  let importingNativeWidgetState=false;
  let nativeMutationImportPromise=null;

  function ex(id,name,aliases,muscle,type,unit,primary,secondary,notes,options={}){
    return {id,name,aliases,group:muscle,type,unit,primaryMuscles:primary,secondaryMuscles:secondary,notes,...options};
  }
  function defaultProgressionMode(measurementMode,loadMode){
    if(measurementMode==='time')return'timeProgression';
    if(measurementMode==='distance')return'distanceProgression';
    if(measurementMode==='assistance'||loadMode==='assistance')return'assistanceReduction';
    if(loadMode==='bodyweight')return'repProgression';
    return'doubleProgression';
  }
  function item(exerciseId,muscle,bodyweight=false,notes=''){
    const exercise=exerciseLibrary.find(x=>x.id===exerciseId);
    const measurementMode=exercise?.measurementMode||'reps',defaultLoadMode=exercise?.defaultLoadMode||(bodyweight?'bodyweight':'total');
    return {id:`${exerciseId}-${muscle.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,exerciseId,name:exercise?.name||exerciseId,muscle,type:exercise?.type||'máquina',unit:exercise?.unit||'kg',bodyweight:!!bodyweight||!!exercise?.bodyweight,measurementMode,defaultLoadMode,equipmentId:exercise?.equipmentId||'',primaryMuscles:[...(exercise?.primaryMuscles||[])],secondaryMuscles:[...(exercise?.secondaryMuscles||[])],muscleTaxonomyVersion:window.MUSCLE_TAXONOMY?.VERSION||1,notes,targetSets:3,repsMin:8,repsMax:12,targetRirMin:1,targetRirMax:3,progressionMode:defaultProgressionMode(measurementMode,defaultLoadMode),incrementKg:.5};
  }
  function day(key,name,muscles,exercises){
    return {dayKey:key,weekday:dayLabels[key],name,type:'workout',muscles:[...muscles],exercises:exercises.map(x=>({...x}))};
  }
  function restDay(key,name,message,suggestions){
    return {dayKey:key,weekday:dayLabels[key],name,type:'rest',muscles:['Recuperación'],message,suggestions:[...suggestions],exercises:[]};
  }
  function clone(value){ return window.WORKOUT_STORE?.clone?.(value)??JSON.parse(JSON.stringify(value)); }
  function numeric(value,fallback=0){const parsed=window.APP_NUMBERS?.parse?.(value);if(parsed!==undefined)return parsed??fallback;const number=Number(value);return Number.isFinite(number)?number:fallback;}
  function setModel(){return window.WORKOUT_SET_MODEL||null;}
  function normalizeSet(set={},exercise={}){
    const load=window.WORKOUT_EQUIPMENT?.normalizeSet?.(set,exercise)||set;
    return setModel()?.normalize?.(load)||{...load,setType:load.setType||'working',completed:load.completed!==false,excludeFromRecords:!!load.excludeFromRecords,excludeFromProgression:!!load.excludeFromProgression};
  }
  function setTypeLabel(value){return setModel()?.label?.(value,{short:true})||'Efectiva';}
  function setTypeOptions(){return(setModel()?.definitions?.()||[{id:'working',label:'Serie efectiva'}]).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('');}
  function equipmentModel(){return window.WORKOUT_EQUIPMENT||null;}
  function optionHtml(items,selected=''){return(items||[]).map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===selected?'selected':''}>${escapeHtml(item.label||item.name)}</option>`).join('');}
  function equipmentProfiles(){
    const defaults=equipmentModel()?.profiles?.()||[];
    const custom=readStore(keys.equipmentProfiles,[]);
    return [...defaults,...custom.filter(item=>item?.id&&!defaults.some(base=>base.id===item.id))];
  }
  function readStore(key,fallback){return window.WORKOUT_STORE?.read?.(key,fallback)??getLocalData(key,fallback);}
  function writeStore(key,value){return window.WORKOUT_STORE?.write?.(key,value)??setLocalData(key,value);}
  function normalizeText(value){ return window.WORKOUT_PLAN?.normalizeText?.(value)??String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function normalizeExerciseName(value){ return window.WORKOUT_PLAN?.normalizeExerciseName?.(value)??normalizeText(value).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function exerciseAliases(exercise){ return [exercise?.name,...(exercise?.aliases||[])].map(normalizeExerciseName).filter(Boolean); }
  function sameExercise(a,b){
    if(window.WORKOUT_PLAN?.sameExercise)return window.WORKOUT_PLAN.sameExercise(a,b);
    if(!a||!b) return false;
    if(a.exerciseId && b.exerciseId && a.exerciseId===b.exerciseId) return true;
    if(a.id && b.id && a.id===b.id) return true;
    const aNames=new Set(exerciseAliases(a));
    return exerciseAliases(b).some(name=>aNames.has(name));
  }
  function slugForExercise(value){ return normalizeExerciseName(value).replace(/\s+/g,'-')||'ejercicio'; }
  function stableCustomExerciseId(name,library){
    const base=`custom-${slugForExercise(name)}`;
    const normalized=normalizeExerciseName(name);
    const exact=(library||[]).find(exercise=>exerciseAliases(exercise).includes(normalized));
    if(exact) return exact.id;
    const collision=(library||[]).find(exercise=>exercise.id===base && !exerciseAliases(exercise).includes(normalized));
    if(!collision) return base;
    let hash=0;
    for(const char of normalized) hash=((hash<<5)-hash+char.charCodeAt(0))|0;
    return `${base}-${Math.abs(hash).toString(36)}`;
  }
  function dateFromString(value){ const [y,m,d]=String(value||todayStr()).split('-').map(Number); return new Date(y,m-1,d); }
  function dayKeyForDate(dateString=todayStr()){
    if(window.WORKOUT_PLAN?.dayKeyForDate)return window.WORKOUT_PLAN.dayKeyForDate(dateString);
    const jsDay=dateFromString(dateString).getDay();
    return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][jsDay];
  }
  function settings(){
    return {...{widgetEnabled:true,showRir:true,unit:'kg',mode:'simple',showRestDays:true,restTimerEnabled:false,restSeconds:90,hapticEnabled:true,timerSound:false,showWorkoutOnLockScreen:true,showWeightOnLockScreen:true,showRecordOnLockScreen:true,lockScreenVisibility:'private'},...readStore(keys.gymSettings,{})};
  }
  const LB_PER_KG=2.2046226218;
  function displayWeight(weightKg,unit=settings().unit){
    const value=Math.max(0,numeric(weightKg,0))*(unit==='lb'?LB_PER_KG:1);
    return Math.round(value*2)/2;
  }
  function canonicalWeight(value,unit=settings().unit){
    const kg=Math.max(0,numeric(value,0))/(unit==='lb'?LB_PER_KG:1);
    return Math.round(kg*100)/100;
  }
  function displayVolume(volumeKg,unit=settings().unit){return Math.round(Math.max(0,Number(volumeKg)||0)*(unit==='lb'?LB_PER_KG:1));}
  function displaySet(set){return {...normalizeSet(clone(set)),weight:displayWeight(set?.weight)};}
  function displayHistory(row){return row?{...clone(row),lastWeight:displayWeight(row.lastWeight),bestWeight:displayWeight(row.bestWeight)}:null;}
  function saveSettings(next){
    writeStore(keys.gymSettings,{...settings(),...next});
    syncWorkoutWidget();
  }
  function ensureWorkoutData(){
    const store=window.WORKOUT_STORE;
    if(store){store.ensure(keys.weeklyWorkoutPlan,clone(defaultWeeklyPlan));store.ensure(keys.exerciseLibrary,clone(exerciseLibrary));store.ensure(keys.exerciseHistory,{});store.ensure(keys.workoutSessions,[]);store.ensure(keys.equipmentProfiles,[]);store.ensure(keys.gymSettings,settings());store.ensure(keys.exercisePreferences,{schemaVersion:1,exercises:{},updatedAt:null});}
    else{
      if(!localStorage.getItem(keys.weeklyWorkoutPlan)) writeStore(keys.weeklyWorkoutPlan,clone(defaultWeeklyPlan));
      if(!localStorage.getItem(keys.exerciseLibrary)) writeStore(keys.exerciseLibrary,clone(exerciseLibrary));
      if(!localStorage.getItem(keys.exerciseHistory)) writeStore(keys.exerciseHistory,{});
      if(!localStorage.getItem(keys.workoutSessions)) writeStore(keys.workoutSessions,[]);
      if(!localStorage.getItem(keys.equipmentProfiles)) writeStore(keys.equipmentProfiles,[]);
      if(!localStorage.getItem(keys.gymSettings)) writeStore(keys.gymSettings,settings());
      if(!localStorage.getItem(keys.exercisePreferences)) writeStore(keys.exercisePreferences,{schemaVersion:1,exercises:{},updatedAt:null});
    }
    migrateExerciseLibrary();
  }
  function weeklyPlan(){ return readStore(keys.weeklyWorkoutPlan,clone(defaultWeeklyPlan)); }
  function saveWeeklyPlan(plan){ writeStore(keys.weeklyWorkoutPlan,plan); syncWorkoutWidget(); }
  function libraryData(){ return readStore(keys.exerciseLibrary,clone(exerciseLibrary)); }
  function canonicalLibraryRecord(record={}){
    const taxonomy=window.MUSCLE_TAXONOMY;if(!taxonomy)return record;
    const legacyPrimary=[...(record.legacyPrimaryMuscles||[]),...(record.primaryMuscles||[]),record.muscle,record.group].filter(Boolean),legacySecondary=[...(record.legacySecondaryMuscles||[]),...(record.secondaryMuscles||[])],resolved=taxonomy.resolveExercise({exercise:record,definition:record});
    return {...record,primaryMuscles:resolved.primaryMuscles,secondaryMuscles:resolved.secondaryMuscles,legacyPrimaryMuscles:[...new Set(taxonomy.legacyValues(legacyPrimary))],legacySecondaryMuscles:[...new Set(taxonomy.legacyValues(legacySecondary))],muscleTaxonomyVersion:taxonomy.VERSION,muscleTaxonomySource:resolved.source,classificationStatus:resolved.classificationStatus,classificationSource:resolved.classificationSource,classificationConfidence:resolved.classificationConfidence,muscleClassificationNeedsReview:resolved.needsReview};
  }
  function saveLibraryData(value){ writeStore(keys.exerciseLibrary,(value||[]).map(canonicalLibraryRecord)); }
  function migrateExerciseLibrary(){
    const existing=readStore(keys.exerciseLibrary,[]);
    const meta=readStore(keys.exerciseLibraryMeta,null);
    if(meta?.libraryVersion>=EXERCISE_LIBRARY_VERSION&&existing.length) return existing;
    const byId=new Map();
    existing.forEach((exercise,index)=>{
      if(!exercise?.id) return;
      const previous=byId.get(exercise.id);
      byId.set(exercise.id,canonicalLibraryRecord(previous?mergeLibraryRecords(previous,exercise):{...exercise,aliases:[...new Set([exercise.name,...(exercise.aliases||[])].filter(Boolean))],createdAt:exercise.createdAt||null}));
    });
    exerciseLibrary.forEach(official=>{
      const current=byId.get(official.id);
      if(current){
        byId.set(official.id,canonicalLibraryRecord({
          ...official,
          ...current,
          id:official.id,
          aliases:[...new Set([...(official.aliases||[]),...(current.aliases||[]),official.name,current.name].filter(Boolean))],
          primaryMuscles:[...(official.primaryMuscles||[])],
          secondaryMuscles:[...(official.secondaryMuscles||[])],
          legacyPrimaryMuscles:[...(current.legacyPrimaryMuscles||[]),...(current.primaryMuscles||[])],
          legacySecondaryMuscles:[...(current.legacySecondaryMuscles||[]),...(current.secondaryMuscles||[])],
          official:true,
          custom:false,
          origin:'official',
          libraryVersion:EXERCISE_LIBRARY_VERSION
        }));
        return;
      }
      const equivalent=[...byId.values()].find(item=>exerciseAliases(item).some(name=>exerciseAliases(official).includes(name)));
      if(equivalent){
        equivalent.aliases=[...new Set([...(equivalent.aliases||[]),official.name,...(official.aliases||[])].filter(Boolean))];
        equivalent.legacyPrimaryMuscles=[...(equivalent.legacyPrimaryMuscles||[]),...(equivalent.primaryMuscles||[])];
        equivalent.legacySecondaryMuscles=[...(equivalent.legacySecondaryMuscles||[]),...(equivalent.secondaryMuscles||[])];
        equivalent.primaryMuscles=[...(official.primaryMuscles||[])];equivalent.secondaryMuscles=[...(official.secondaryMuscles||[])];
        equivalent.officialSourceId=official.id;
        equivalent.libraryVersion=EXERCISE_LIBRARY_VERSION;
        Object.assign(equivalent,canonicalLibraryRecord(equivalent));
        return;
      }
      byId.set(official.id,canonicalLibraryRecord({...clone(official),official:true,custom:false,origin:'official',libraryVersion:EXERCISE_LIBRARY_VERSION}));
    });
    const merged=[];
    [...byId.values()].forEach(record=>{
      const duplicate=merged.find(item=>item.id!==record.id&&exerciseAliases(item).some(name=>exerciseAliases(record).includes(name)));
      if(!duplicate){merged.push(record);return;}
      const preferred=duplicate.official&&!record.official?duplicate:record.official&&!duplicate.official?record:duplicate;
      const secondary=preferred===duplicate?record:duplicate;
      Object.assign(preferred,canonicalLibraryRecord(mergeLibraryRecords(preferred,secondary)));
      if(preferred!==duplicate){const index=merged.indexOf(duplicate);merged[index]=preferred;}
    });
    saveLibraryData(merged);
    writeStore(keys.exerciseLibraryMeta,{schemaVersion:1,libraryVersion:EXERCISE_LIBRARY_VERSION,migratedAt:new Date().toISOString(),officialCount:exerciseLibrary.length,customCount:merged.filter(item=>item.custom||item.origin==='custom').length});
    return merged;
  }
  function mergeLibraryRecords(primary,secondary){
    return canonicalLibraryRecord({...primary,aliases:[...new Set([primary.name,secondary.name,...(primary.aliases||[]),...(secondary.aliases||[])].filter(Boolean))],primaryMuscles:[...new Set([...(primary.primaryMuscles||[]),...(secondary.primaryMuscles||[])])],secondaryMuscles:[...new Set([...(primary.secondaryMuscles||[]),...(secondary.secondaryMuscles||[])])],legacyPrimaryMuscles:[...new Set([...(primary.legacyPrimaryMuscles||[]),...(secondary.legacyPrimaryMuscles||[])])],legacySecondaryMuscles:[...new Set([...(primary.legacySecondaryMuscles||[]),...(secondary.legacySecondaryMuscles||[])])],legacyIds:[...new Set([...(primary.legacyIds||[]),...(secondary.legacyIds||[]),secondary.id].filter(id=>id&&id!==primary.id))]});
  }
  function libraryMatchFor(value,library=libraryData()){
    const probe=typeof value==='string'?{name:value}:value;
    return library.find(exercise=>sameExercise(exercise,probe))||null;
  }
  function addOrReuseLibraryExercise(input){
    const library=libraryData();
    const existing=libraryMatchFor(input,library);
    if(existing){
      if(!existing.official&&input.primaryMuscles?.length&&window.MUSCLE_TAXONOMY?.confirmClassification){
        Object.assign(existing,window.MUSCLE_TAXONOMY.confirmClassification(existing,{primaryMuscles:input.primaryMuscles,secondaryMuscles:input.secondaryMuscles,source:'user-confirmed'}),{updatedAt:new Date().toISOString()});
        saveLibraryData(library);
      }
      return {exercise:existing,created:false,library};
    }
    const created=canonicalLibraryRecord({
      id:input.exerciseId||stableCustomExerciseId(input.name,library),
      name:input.name,
      aliases:[...new Set([input.name,...(input.aliases||[])].map(value=>String(value||'').trim()).filter(Boolean))],
      group:input.muscle||input.group||'General',
      type:input.type||'personalizado',
      unit:input.bodyweight?'peso corporal':(input.unit||settings().unit),
      measurementMode:input.measurementMode||(input.unit==='tiempo'?'time':input.unit==='distancia'?'distance':'reps'),
      defaultLoadMode:input.defaultLoadMode||(input.bodyweight?'bodyweight':'total'),
      equipmentId:input.equipmentId||'',
      primaryMuscles:input.primaryMuscles?.length?[...input.primaryMuscles]:[input.muscle||input.group||'General'],
      secondaryMuscles:[...(input.secondaryMuscles||[])],
      classificationStatus:input.classificationStatus||(input.primaryMuscles?.length?'confirmed':undefined),
      classificationSource:input.classificationSource||input.muscleClassificationSource||(input.primaryMuscles?.length?'user-confirmed':'legacy-label'),
      classificationConfidence:input.classificationConfidence||(input.primaryMuscles?.length?'high':undefined),
      notes:input.notes||'',
      bodyweight:!!input.bodyweight,
      custom:true,
      official:false,
      origin:'custom',
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
    library.push(created);
    saveLibraryData(library);
    return {exercise:created,created:true,library};
  }
  function pendingMuscleClassifications(){
    const taxonomy=window.MUSCLE_TAXONOMY;
    return taxonomy?.pendingClassifications?.(libraryData()).map(item=>clone(item.record))||[];
  }
  function confirmExerciseClassificationPayload(payload={}){
    const library=libraryData(),exercise=library.find(item=>item.id===payload.exerciseId);
    if(!exercise)return{ok:false,reason:'missing-exercise',message:'No se encontró ese ejercicio.'};
    if(exercise.official)return{ok:false,reason:'official-exercise',message:'Los ejercicios oficiales conservan su clasificación validada.'};
    const taxonomy=window.MUSCLE_TAXONOMY,primary=taxonomy?.canonicalizeList?.(payload.primaryMuscles)||[];
    if(!primary.length)return{ok:false,reason:'missing-primary-muscle',message:'Elegí al menos un músculo principal.'};
    const updated=taxonomy.confirmClassification(exercise,{primaryMuscles:primary,secondaryMuscles:payload.secondaryMuscles,source:'user-confirmed'});
    const previousName=exercise.name;
    Object.assign(exercise,updated,{updatedAt:new Date().toISOString()});
    if(String(payload.name||'').trim())exercise.name=String(payload.name).trim();
    if(String(payload.group||'').trim())exercise.group=String(payload.group).trim();
    exercise.aliases=[...new Set([...(exercise.aliases||[]),previousName,exercise.name].filter(Boolean))];
    saveLibraryData(library);
    const plan=weeklyPlan();let planChanged=false;
    dayOrder.forEach(dayKey=>(plan[dayKey]?.exercises||[]).forEach(item=>{if(item.exerciseId!==exercise.id)return;Object.assign(item,{primaryMuscles:[...updated.primaryMuscles],secondaryMuscles:[...updated.secondaryMuscles],muscleTaxonomyVersion:updated.muscleTaxonomyVersion,classificationStatus:updated.classificationStatus,classificationSource:updated.classificationSource,classificationConfidence:updated.classificationConfidence,muscleClassificationNeedsReview:false});planChanged=true;}));
    if(planChanged)saveWeeklyPlan(plan);
    return{ok:true,exercise:clone(libraryData().find(item=>item.id===exercise.id)),pending:pendingMuscleClassifications()};
  }
  function previewHistoricalClassificationMigration(){
    const taxonomy=window.MUSCLE_TAXONOMY,current=sessions(),next=clone(current),library=libraryData(),capturedAt=new Date().toISOString(),affectedSessions=new Set();let affectedExercises=0;
    next.forEach(session=>(session.exercises||[]).forEach((exercise,index)=>{
      if(taxonomy?.resolveSnapshot?.(exercise.muscleClassificationSnapshot))return;
      const definition=libraryMatchFor(exercise,library),captured=captureMuscleClassification(exercise,definition,capturedAt);
      Object.assign(session.exercises[index],captured,{classificationMigratedAt:capturedAt,classificationMigrationSource:'explicit-user-action'});
      affectedExercises+=1;affectedSessions.add(session.id||session.date||`session-${affectedSessions.size+1}`);
    }));
    const preview={id:`classification_${Date.now()}`,affectedSessions:affectedSessions.size,affectedExercises,taxonomyVersion:taxonomy?.VERSION||0,createdAt:capturedAt};
    pendingHistoricalClassificationMigration={...preview,baseline:JSON.stringify(current),before:clone(current),next};
    return clone(preview);
  }
  async function applyHistoricalClassificationMigration(previewId){
    const pending=pendingHistoricalClassificationMigration;
    if(!pending||pending.id!==previewId)return{ok:false,reason:'missing-preview',message:'Generá una vista previa nueva antes de aplicar.'};
    if(JSON.stringify(sessions())!==pending.baseline)return{ok:false,reason:'changed-since-preview',message:'Los entrenamientos cambiaron desde la vista previa. Revisá de nuevo antes de aplicar.'};
    if(!pending.affectedExercises){pendingHistoricalClassificationMigration=null;return{ok:true,affectedSessions:0,affectedExercises:0,snapshotId:null};}
    let snapshotId=null;
    if(window.APP_DATA?.replaceMany){
      const result=await window.APP_DATA.replaceMany({[keys.workoutSessions]:pending.next},{reason:`classification-history:${pending.id}`});
      if(!result?.ok)return{ok:false,reason:'persistence-failed',message:'No se pudo aplicar la clasificación y se conservó el historial anterior.'};
      snapshotId=result.snapshotId||null;
    }else saveSessions(pending.next);
    lastHistoricalClassificationMigration={id:pending.id,snapshotId,before:pending.before,affectedSessions:pending.affectedSessions,affectedExercises:pending.affectedExercises};
    pendingHistoricalClassificationMigration=null;syncWorkoutWidget();
    return{ok:true,snapshotId,affectedSessions:pending.affectedSessions,affectedExercises:pending.affectedExercises};
  }
  async function undoHistoricalClassificationMigration(){
    const previous=lastHistoricalClassificationMigration;
    if(!previous)return{ok:false,reason:'nothing-to-undo',message:'No hay una migración histórica reciente para deshacer.'};
    if(previous.snapshotId&&window.APP_DATA?.restoreRecovery){
      const restored=await window.APP_DATA.restoreRecovery(previous.snapshotId);
      if(!restored?.ok)return{ok:false,reason:'restore-failed',message:'No se pudo restaurar el snapshot anterior.'};
    }else saveSessions(previous.before);
    lastHistoricalClassificationMigration=null;syncWorkoutWidget();
    return{ok:true,affectedSessions:previous.affectedSessions,affectedExercises:previous.affectedExercises};
  }
  function planForDate(date=todayStr()){ return weeklyPlan()[dayKeyForDate(date)] || defaultWeeklyPlan[dayKeyForDate(date)]; }
  function sessions(){ return readStore(keys.workoutSessions,[]); }
  function saveSessions(value){ writeStore(keys.workoutSessions,value); }
  function history(){ return readStore(keys.exerciseHistory,{}); }
  function saveHistory(value){ writeStore(keys.exerciseHistory,value); }
  function migrateLegacyGymSessions(){
    const migrationKey='protocolo_0_100_gym_legacy_migration_v1',legacy=getLocalData(GYM_SESSIONS_KEY,[]),current=sessions();let changed=false;
    legacy.forEach(old=>{if(current.some(session=>session.id===old.id||session.legacyGymSessionId===old.id))return;const exercises=(old.items||[]).map((item,index)=>({id:item.id||`legacy-${index}`,exerciseId:item.exerciseId||`legacy-${slugForExercise(item.name)}`,name:item.name||`Ejercicio ${index+1}`,muscle:item.muscle||'General',bodyweight:!!item.bodyweight,completed:true,sets:Array.from({length:Math.max(0,Number(item.sets)||0)},(_,setIndex)=>({id:`${old.id||'legacy'}-${index}-${setIndex}`,reps:Number(item.reps)||0,weight:Number(item.weight)||0,rir:item.rir??null,isBodyweight:!!item.bodyweight,setType:'working',completed:true,excludeFromRecords:false,excludeFromProgression:false}))}));current.push({id:old.id||uid('workout'),legacyGymSessionId:old.id||'',date:old.date||todayStr(),routine:{name:old.routine||'Entrenamiento importado',muscles:[...new Set(exercises.map(item=>item.muscle))],exercises:[]},startedAt:old.savedAt||null,finishedAt:old.savedAt||null,status:'finalizado',currentExerciseIndex:Math.max(0,exercises.length-1),exercises,notes:old.notes||'',summary:null});changed=true;});
    if(changed){saveSessions(current);writeStore(migrationKey,{version:1,migratedAt:new Date().toISOString(),legacyCount:legacy.length,canonicalCount:current.length});}
    else if(!readStore(migrationKey,null))writeStore(migrationKey,{version:1,migratedAt:new Date().toISOString(),legacyCount:legacy.length,canonicalCount:current.length});
    return changed;
  }
  function maybeImportWidgetStateFromAndroid(){
    if(importingNativeWidgetState) return false;
    if(window.APP_FEATURE_FLAGS?.isEnabled?.('nativeWorkoutControlsV1')&&typeof window.AndroidBridge?.getNativeWorkoutControlData==='function'){
      importNativeWorkoutMutationsFromAndroid();
      return true;
    }
    if(!window.AndroidBridge || typeof window.AndroidBridge.getWorkoutWidgetData!=='function') return false;
    try{
      const raw=window.AndroidBridge.getWorkoutWidgetData();
      if(!raw) return false;
      return importWidgetStateFromAndroid(JSON.parse(raw));
    }catch(e){
      return false;
    }
  }
  function protectNativeSession(rawSession){
    const detector=window.WORKOUT_ANOMALY_DETECTOR;
    if(!rawSession?.id||!detector?.analyze||!detector?.markPending)return rawSession;
    const next=clone(rawSession),existingById=new Map(sessions().flatMap(session=>(session.exercises||[]).flatMap(exercise=>(exercise.sets||[]).map(set=>[String(set.id||''),{set,exercise}]))));
    (next.exercises||[]).forEach(exercise=>{
      exercise.sets=(exercise.sets||[]).map(set=>{
        if(set.anomalyReview?.status)return set;
        const existing=existingById.get(String(set.id||''));
        if(existing&&detector.signature(existing.set,existing.exercise)===detector.signature(set,exercise))return set;
        const analysis=detector.analyze({candidate:set,history:historicalSetsForExercise(exercise,set.id),exercise});
        return analysis.suspicious?detector.markPending(set,analysis):set;
      });
    });
    next.summary=sessionSummary(next);
    return next;
  }
  function protectNativeSet(rawSet,exercise){
    const detector=window.WORKOUT_ANOMALY_DETECTOR,set=clone(rawSet);
    if(!detector?.analyze||!detector?.markPending||set.anomalyReview?.status)return set;
    const analysis=detector.analyze({candidate:set,history:historicalSetsForExercise(exercise,set.id),exercise});
    return analysis.suspicious?detector.markPending(set,analysis):set;
  }
  async function importNativeWorkoutMutationsFromAndroid(payloadOverride=null){
    if(nativeMutationImportPromise)return nativeMutationImportPromise;
    nativeMutationImportPromise=(async()=>{
      let payload=payloadOverride;
      if(!payload){
        if(typeof window.AndroidBridge?.getPendingWorkoutMutations==='function')payload=JSON.parse(String(window.AndroidBridge.getPendingWorkoutMutations()||'{}'));
        else if(typeof window.AndroidBridge?.getNativeWorkoutControlData==='function')payload=JSON.parse(String(window.AndroidBridge.getNativeWorkoutControlData()||'{}'));
        else return{ok:false,reason:'bridge-unavailable'};
      }
      const mutations=(Array.isArray(payload?.mutations)?payload.mutations:[]).filter(item=>item&&(item.status?item.status==='pending':item.privateImportState!=='imported'));
      if(!mutations.length)return{ok:true,imported:0,duplicates:0,invalid:0};
      let nextSessions=sessions(),nextHistory=history();
      const imported=[],duplicates=[],invalid=[],affected=new Set(),undoFallbacks=new Map();
      for(const mutation of mutations){
        const result=window.NATIVE_WORKOUT_IMPORTER?.apply?.(nextSessions,mutation,{protectSet:protectNativeSet});
        if(!result||result.status==='invalid'){invalid.push({mutation,error:result?.error||'importer-unavailable'});continue;}
        if(result.status==='duplicate'){duplicates.push(mutation);continue;}
        nextSessions=result.sessions;imported.push(mutation);affected.add(result.sessionId);
        if(result.operation==='undo')undoFallbacks.set(`${result.sessionId}|${result.exerciseId}`,result.previousHistory||null);
      }
      for(const sessionId of affected){
        const session=nextSessions.find(item=>item.id===sessionId);if(!session)continue;
        session.summary=sessionSummary(session);
        nextHistory=exerciseHistoryAfterSession(session,nextHistory);
        (session.exercises||[]).forEach(exercise=>{
          if((exercise.sets||[]).length)return;
          const key=`${sessionId}|${exercise.exerciseId||exercise.id}`,fallback=undoFallbacks.get(key);
          if(fallback)nextHistory[exercise.exerciseId||exercise.id]=fallback;
          else if(undoFallbacks.has(key))delete nextHistory[exercise.exerciseId||exercise.id];
        });
      }
      if(imported.length){
        const changes={[keys.workoutSessions]:nextSessions,[keys.exerciseHistory]:nextHistory};
        const result=window.APP_REPOSITORIES?.workout?.replace
          ?await window.APP_REPOSITORIES.workout.replace(changes,'native-workout-import')
          :(saveSessions(nextSessions),saveHistory(nextHistory),{ok:true});
        if(!result?.ok)throw new Error(result?.error?.message||result?.error||'native-import-write-failed');
      }
      const acknowledge=(mutation,state,error='')=>{
        try{return typeof window.AndroidBridge?.acknowledgeNativeWorkoutMutation==='function'&&window.AndroidBridge.acknowledgeNativeWorkoutMutation(String(mutation.mutationId||mutation.id||''),state,String(error||'').slice(0,300));}
        catch{return false;}
      };
      const accepted=[...imported,...duplicates],acceptedIds=accepted.map(mutation=>String(mutation.mutationId||mutation.id||'')).filter(Boolean);
      if(acceptedIds.length&&typeof window.AndroidBridge?.acknowledgeWorkoutMutations==='function')window.AndroidBridge.acknowledgeWorkoutMutations(JSON.stringify(acceptedIds));
      else accepted.forEach(mutation=>acknowledge(mutation,'imported'));
      invalid.forEach(item=>acknowledge(item.mutation,'error',item.error));
      if(imported.length){
        const latest=nextSessions.find(item=>affected.has(item.id));
        if(latest)currentQuickExerciseId=latest.exercises?.[latest.currentExerciseIndex||0]?.id||currentQuickExerciseId;
        syncWorkoutWidget();
        try{
          window.GYM_PARTY_FEATURES?.syncFromLocalWorkouts?.({silent:true});
          if(window.navigator?.onLine!==false)window.GYM_PARTY_FEATURES?.syncNow?.({force:false})?.catch?.(()=>{});
        }catch(error){window.APP_ERROR_BOUNDARY?.record?.(error,{area:'native-workout-party-sync'});}
      }
      return{ok:true,imported:imported.length,duplicates:duplicates.length,invalid:invalid.length};
    })().catch(error=>{
      try{
        const payload=payloadOverride||JSON.parse(String(window.AndroidBridge?.getPendingWorkoutMutations?.()||window.AndroidBridge?.getNativeWorkoutControlData?.()||'{}'));
        (payload.mutations||[]).filter(item=>item&&(item.status?item.status==='pending':item.privateImportState!=='imported')).forEach(item=>window.AndroidBridge?.acknowledgeNativeWorkoutMutation?.(String(item.mutationId||item.id||''),'error',String(error?.message||'error').slice(0,300)));
      }catch{}
      window.APP_ERROR_BOUNDARY?.capture?.(error,{source:'native-workout-import'});
      return{ok:false,reason:'write-failed'};
    }).finally(()=>{nativeMutationImportPromise=null;});
    return nativeMutationImportPromise;
  }
  function importWidgetStateFromAndroid(state){
    if(!state || typeof state!=='object') return false;
    const nativeStamp=String(state.lastNativeMutationAt||'');
    if(!nativeStamp || state.lastNativeMutationSource!=='android-widget-direct') return false;
    const localState=getLocalData(keys.workoutWidgetState,null);
    const localStamp=String(localState?.lastNativeMutationAt||'');
    if(localStamp && localStamp>=nativeStamp) return false;
    importingNativeWidgetState=true;
    try{
      if(state.exerciseHistory && typeof state.exerciseHistory==='object'){
        saveHistory({...history(),...state.exerciseHistory});
      }
      if(state.workoutSession && state.workoutSession.id){
        const session=protectNativeSession(state.workoutSession);
        const list=sessions();
        const index=list.findIndex(item=>item.id===session.id);
        if(index>=0) list[index]=session; else list.push(session);
        saveSessions(list);
        updateExerciseHistory(session);
        currentQuickExerciseId=state.currentExerciseId || session.exercises?.[session.currentExerciseIndex||0]?.id || currentQuickExerciseId;
      }
      setLocalData(keys.workoutWidgetState,state);
      return true;
    }finally{
      importingNativeWidgetState=false;
    }
  }
  function activeSession(date=todayStr()){
    return sessions().find(s=>s.date===date && s.status==='en progreso') || null;
  }
  function latestSessionForDate(date=todayStr()){
    return sessions().filter(s=>s.date===date).sort((a,b)=>String(b.startedAt||'').localeCompare(String(a.startedAt||'')))[0] || null;
  }
  function captureMuscleClassification(exercise={},definition=null,capturedAt=new Date().toISOString()){
    const taxonomy=window.MUSCLE_TAXONOMY;if(!taxonomy)return clone(exercise);
    const snapshot=taxonomy.snapshotFor({exercise,definition,capturedAt});
    return {...clone(exercise),primaryMuscles:[...snapshot.primaryMuscles],secondaryMuscles:[...snapshot.secondaryMuscles],muscleTaxonomyVersion:snapshot.taxonomyVersion,classificationStatus:snapshot.classificationStatus,classificationSource:snapshot.classificationSource,classificationConfidence:snapshot.classificationConfidence,muscleClassificationNeedsReview:snapshot.classificationStatus==='needs-review',muscleClassificationSnapshot:snapshot};
  }
  function ensureSession(date=todayStr()){
    const existing=activeSession(date);
    if(existing) return existing;
    const plan=planForDate(date);
    if(plan.type==='rest') return null;
    const startedAt=new Date().toISOString(),library=libraryData();
    const capturedExercises=plan.exercises.map((exercise,index)=>captureMuscleClassification({...exercise,order:index+1},libraryMatchFor(exercise,library),startedAt));
    const created={
      id:uid('workout'),
      date,
      dayKey:plan.dayKey,
      weekday:plan.weekday,
      routine:{dayKey:plan.dayKey,name:plan.name,muscles:plan.muscles,exercises:clone(capturedExercises)},
      startedAt,
      finishedAt:null,
      status:'en progreso',
      currentExerciseIndex:0,
      exercises:capturedExercises.map(exercise=>({...exercise,sets:[],completed:false})),
      notes:'',
      subjectiveNote:'',
      summary:null
    };
    const list=sessions();
    list.push(created);
    saveSessions(list);
    // Android only exposes workout controls for an active session. Publish
    // the new session now instead of waiting for the first saved set.
    syncWorkoutWidget();
    return created;
  }
  function replaceSession(session){
    const list=sessions();
    const index=list.findIndex(s=>s.id===session.id);
    if(index>=0) list[index]=session; else list.push(session);
    saveSessions(list);
    updateExerciseHistory(session);
    syncWorkoutWidget();
  }
  function replaceSessionPayload(session){
    if(!session?.id) return {ok:false,reason:'missing-session'};
    const next=clone(session); next.summary=sessionSummary(next); replaceSession(next); return {ok:true,session:clone(next)};
  }
  function currentExercise(session){
    if(!session || !session.exercises?.length) return null;
    const byId=currentQuickExerciseId ? session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId) : null;
    if(byId) return byId;
    return session.exercises[Math.min(session.currentExerciseIndex||0,session.exercises.length-1)] || session.exercises.find(x=>!x.completed) || session.exercises[0];
  }
  function recordExercisePreference(session,exercise){
    if(!window.WORKOUT_RANKING?.recordExerciseUse||!session||!exercise) return;
    window.WORKOUT_RANKING.recordExerciseUse({
      exerciseId:exercise.exerciseId||exercise.id,
      date:session.date,
      dayKey:session.dayKey||dayKeyForDate(session.date),
      routineName:session.routine?.name||session.routineName||'Entrenamiento',
      lastPosition:Math.max(0,session.exercises?.findIndex(item=>item.id===exercise.id)??0)
    });
  }
  function rankExercisesForContext(options={}){
    const date=options.date||todayStr();
    const plan=options.currentPlan||planForDate(date);
    if(!window.WORKOUT_RANKING?.rankExercisesForContext){
      return {groups:[{id:'today',label:'Rutina de hoy',items:clone(plan.exercises||[])}],items:clone(plan.exercises||[])};
    }
    return window.WORKOUT_RANKING.rankExercisesForContext({...options,date,dayKey:options.dayKey||dayKeyForDate(date),routineName:options.routineName||plan.name,currentPlan:plan,library:options.library||libraryData()});
  }
  function exerciseVolume(exercise){ return window.WORKOUT_METRICS?.calculateExerciseMetrics?.(exercise)?.externalLoadVolume??(exercise.sets||[]).filter(set=>setModel()?.countsMainVolume?.(set)??true).reduce((sum,set)=>sum+(Number(set.reps)||0)*(Number(set.weight)||0),0); }
  function exerciseSetCount(exercise){ return exercise?.sets?.length||0; }
  function muscleSetCount(exercises,muscle){
    return (exercises||[]).filter(exercise=>exercise.muscle===muscle).reduce((sum,exercise)=>sum+exerciseSetCount(exercise),0);
  }
  function muscleChoiceMarkup(name,legend){
    const definitions=window.MUSCLE_TAXONOMY?.definitions?.({includeOther:true})||[];
    return `<fieldset><legend>${escapeHtml(legend)}</legend>${definitions.map(item=>`<label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(item.id)}"><span>${escapeHtml(item.label)}</span></label>`).join('')}</fieldset>`;
  }
  function selectedMuscleChoices(name){return[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input=>input.value);}
  function sessionSummary(session){
    const exercises=session.exercises||[];
    const allSets=exercises.flatMap(e=>(e.sets||[]).map(set=>({...set,exerciseName:e.name,exerciseId:e.exerciseId})));
    const metric=window.WORKOUT_METRICS?.calculateSessionMetrics?.(session)||{totalSets:allSets.length,workingSets:allSets.length,warmupSets:0,supplementarySets:0,totalReps:allSets.reduce((sum,set)=>sum+(Number(set.reps)||0),0),externalLoadVolume:allSets.reduce((sum,set)=>sum+(Number(set.reps)||0)*(Number(set.weight)||0),0),bodyweightReps:0,addedLoadReps:0,addedLoadVolume:0,bestWeight:0,bestSetVolume:0,maxReps:0};
    const start=session.startedAt?new Date(session.startedAt):null,finish=session.finishedAt?new Date(session.finishedAt):new Date();
    const duration=start?Math.max(0,Math.round((finish-start)/60000)):0;
    const bestByExercise={};
    exercises.forEach(exercise=>{
      const candidates=(exercise.sets||[]).map(set=>({set:normalizeSet(set,exercise),metric:window.WORKOUT_METRICS?.calculateSetMetrics?.(set,exercise)||{}})).filter(row=>row.metric.recordEligible??(setModel()?.countsForRecords?.(row.set)??true));
      const score=row=>row.metric.measurementMode==='distance'?row.metric.distanceMeters:row.metric.measurementMode==='time'?row.metric.durationSeconds:row.metric.loadMode==='assistance'?(row.metric.assistanceKg?1/row.metric.assistanceKg:0):(row.metric.externalLoadVolume||row.metric.reps||0);
      const best=candidates.sort((a,b)=>score(b)-score(a))[0];
      if(best) bestByExercise[exercise.exerciseId]={...clone(best.set),reps:best.metric.reps||0,weight:best.metric.weight||0,normalizedTotalKg:best.metric.normalizedTotalKg||0,bodyweight:best.metric.bodyweight,volume:best.metric.externalLoadVolume||0,date:session.date};
    });
    return {
      durationMinutes:duration,
      completedExercises:exercises.filter(e=>e.completed || (e.sets||[]).length>0).length,
      totalExercises:exercises.length,
      totalSets:metric.totalSets,
      workingSets:metric.workingSets,
      warmupSets:metric.warmupSets,
      supplementarySets:metric.supplementarySets,
      totalReps:metric.totalReps,
      totalVolume:Math.round(metric.externalLoadVolume),
      externalLoadVolume:Math.round(metric.externalLoadVolume),
      bodyweightReps:metric.bodyweightReps,
      addedLoadReps:metric.addedLoadReps,
      addedLoadVolume:metric.addedLoadVolume,
      durationSeconds:metric.durationSeconds||0,
      distanceMeters:metric.distanceMeters||0,
      bestDurationSeconds:metric.bestDurationSeconds||0,
      bestDistanceMeters:metric.bestDistanceMeters||0,
      bestPaceSecondsPerKm:metric.bestPaceSecondsPerKm||0,
      lowestAssistanceKg:metric.lowestAssistanceKg||0,
      bestWeight:metric.bestWeight,
      bestSetVolume:metric.bestSetVolume,
      maxReps:metric.maxReps,
      bestByExercise,
      compliance:exercises.length?Math.round((exercises.filter(e=>e.completed || (e.sets||[]).length>0).length/exercises.length)*100):0,
      subjectiveNote:session.subjectiveNote||''
    };
  }
  function exerciseHistoryAfterSession(session,baseMap={}){
    const map=clone(baseMap||{});
    (session.exercises||[]).forEach(exercise=>{
      const sets=(exercise.sets||[]).map(set=>normalizeSet(set,exercise));
      if(!sets.length) return;
      const progressionSets=sets.filter(set=>setModel()?.countsForProgression?.(set)??true),recordSets=sets.filter(set=>setModel()?.countsForRecords?.(set)??true);
      const last=progressionSets[progressionSets.length-1]||sets[sets.length-1];
      const best=recordSets.slice().sort((a,b)=>((Number(b.reps)||0)*(Number(b.normalizedTotalKg??b.weight)||0))-((Number(a.reps)||0)*(Number(a.normalizedTotalKg??a.weight)||0)) || (Number(b.reps)||0)-(Number(a.reps)||0))[0] || last;
      const metric=window.WORKOUT_METRICS?.calculateExerciseMetrics?.(exercise)||{};
      map[exercise.exerciseId]={
        exerciseId:exercise.exerciseId,
        name:exercise.name,
        lastWeight:Number(last.recordLoadKg??last.weight)||0,
        lastReps:Number(last.reps)||0,
        lastSet:clone(last),
        lastSets:metric.workingSets??progressionSets.length,
        totalLoggedSets:metric.totalSets??sets.length,
        warmupSets:metric.warmupSets||0,
        bestSet:{...clone(best),reps:Number(best.reps)||0,weight:Number(best.recordLoadKg??best.weight)||0,volume:(Number(best.reps)||0)*(Number(best.normalizedTotalKg??best.weight)||0),bodyweight:!!best.bodyweight},
        previousVolume:exerciseVolume(exercise),
        externalLoadVolume:metric.externalLoadVolume||0,
        bodyweightReps:metric.bodyweightReps||0,
        addedLoadVolume:metric.addedLoadVolume||0,
        durationSeconds:metric.durationSeconds||0,
        distanceMeters:metric.distanceMeters||0,
        bestDurationSeconds:metric.bestDurationSeconds||0,
        bestDistanceMeters:metric.bestDistanceMeters||0,
        lowestAssistanceKg:metric.lowestAssistanceKg||0,
        bestWeight:metric.bestWeight||0,
        bestSetVolume:metric.bestSetVolume||0,
        maxReps:metric.maxReps||0,
        estimated1RM:metric.estimated1RM??null,
        lastDate:session.date,
        bodyweight:!!exercise.bodyweight
      };
    });
    return map;
  }
  function updateExerciseHistory(session){
    saveHistory(exerciseHistoryAfterSession(session,history()));
  }
  function injectWorkoutUi(){
    const tab=document.getElementById('tab-gym');
    if(!tab || document.getElementById('todayWorkoutPanel')) return;
    const hero=tab.querySelector('.moduleHero');
    const insertionAnchor=tab.querySelector('.gymSectionNav')||hero;
    insertionAnchor.insertAdjacentHTML('afterend',`
      <div class="moduleCard" id="todayWorkoutPanel">
        <div class="actionFocusTop"><div><h3 id="todayWorkoutTitle">Entrenamiento de hoy</h3><div class="muted small" id="todayWorkoutSummary"></div></div><span class="statusChip good" id="todayWorkoutScore">Gym</span></div>
        <div class="workoutTodaySummary">
          <div class="quickStats" id="todayWorkoutProgress"></div>
          <p class="workoutLever" id="physicalLever">Registrar pesos permite medir progreso. Priorizá técnica antes que carga.</p>
          <div class="buttons">
            <button type="button" class="good" id="startTodayWorkoutBtn">Empezar entrenamiento</button>
            <button type="button" class="secondary" id="openQuickLoggerBtn">Continuar entrenamiento</button>
          </div>
        </div>
        <details class="todayExerciseDetails">
          <summary>Ver rutina del día <span class="statusChip" id="todayWorkoutExerciseCount">0 ejercicios</span></summary>
          <div class="todayExerciseDetailsBody">
            <div class="entryList" id="todayWorkoutExercises"></div>
            <details class="workoutSafety"><summary>Entrenar con seguridad</summary><p>Esta app no reemplaza asesoramiento profesional. Ajustá cargas según técnica, dolor, fatiga y seguridad.</p></details>
          </div>
        </details>
      </div>
      <div class="moduleCard" id="quickSetLoggerPanel">
        <div class="quickLoggerHeading"><div><h3>Registrar serie</h3><p class="muted small">Elegí ejercicio, reps y carga. El resto es opcional.</p></div><span class="statusChip">Rápido</span></div>
        <div class="nativeWorkoutLiveBar" id="nativeWorkoutLiveBar" hidden>
          <div><strong>Controles en pantalla de bloqueo</strong><span id="nativeWorkoutLiveText">Comprobando disponibilidad…</span></div>
          <button type="button" class="secondary" id="nativeWorkoutLiveButton">Activar</button>
        </div>
        <div class="quickLogger">
          <div class="quickExerciseChooser">
            <div class="field"><label for="quickExerciseSelect">Ejercicio</label><select id="quickExerciseSelect"></select></div>
            <details class="quickExerciseSearchDetails"><summary>Buscar otro ejercicio</summary><div class="field"><label for="quickExerciseSearch">Nombre o alias</label><input type="search" id="quickExerciseSearch" autocomplete="off" placeholder="Ej. press, dominadas…"></div></details>
          </div>
          <div class="quickPrimaryInputs">
            <input type="hidden" id="quickSetNumber" value="1">
            <div class="field" id="quickRepsField"><label>Repeticiones</label><input type="text" inputmode="decimal" id="quickReps" value="8"><div class="quickAdjustRow"><button type="button" class="secondary" data-quick-adjust="reps:-1">-1</button><button type="button" class="secondary" data-quick-adjust="reps:1">+1</button></div></div>
            <div class="field" id="quickWeightField"><label id="quickWeightLabel">Kilos / lastre</label><input type="text" inputmode="decimal" id="quickWeight" value="0"><div class="quickWeightControls"><button type="button" class="secondary" data-quick-adjust="weight:-5" aria-label="Disminuir 5 kilos">-5</button><button type="button" class="secondary" data-quick-adjust="weight:-0.5" aria-label="Disminuir 0,5 kilos">-0,5</button><button type="button" class="secondary" data-quick-adjust="weight:0.5" aria-label="Aumentar 0,5 kilos">+0,5</button><button type="button" class="secondary" data-quick-adjust="weight:5" aria-label="Aumentar 5 kilos">+5</button></div></div>
            <div class="field hidden" id="quickDurationField"><label>Duracion (segundos)</label><input type="text" inputmode="decimal" id="quickDurationSeconds" value="60"></div>
            <div class="field hidden" id="quickDistanceField"><label>Distancia (metros)</label><input type="text" inputmode="decimal" id="quickDistanceMeters" value="1000"></div>
          </div>
          <div class="quickStickyActions">
            <button type="button" class="good" id="saveQuickSetBtn">Guardar serie</button>
          </div>
          <div class="quickRestTimer hidden" id="quickRestTimer" role="timer" aria-live="polite"><span>Descanso</span><strong id="quickRestTimerValue">0:00</strong><div class="quickTimerActions"><button type="button" class="secondary" id="quickTimerStartBtn">Iniciar</button><button type="button" class="secondary" id="quickTimerPauseBtn">Pausar</button><button type="button" class="secondary" id="quickTimerAddBtn">+15 s</button></div></div>
          <div class="quickContextSummary"><p id="quickLastHint">Última vez: sin datos todavía.</p><p id="quickSetStats">Ejercicio: 0 series · músculo: 0 series.</p></div>
          <div class="quickContextActions"><button type="button" class="quiet" id="repeatLastSetBtn">Repetir última</button><button type="button" class="quiet" id="undoQuickSetDeleteBtn" disabled>Deshacer</button></div>
          <div class="quickLoggedSets" id="quickLoggedSets"></div>
          <details class="quickSecondaryDetails">
            <summary>Opcional y finalizar</summary>
            <div class="formGrid quickLoadSetup">
              <div class="field"><label>Como se mide</label><select id="quickMeasurementMode"></select></div>
              <div class="field"><label>Interpretacion de carga</label><select id="quickLoadMode"></select></div>
              <div class="field"><label>Equipo</label><select id="quickEquipmentId"></select></div>
              <div class="field hidden" id="quickBarWeightField"><label>Peso de la barra</label><input type="text" inputmode="decimal" id="quickBarWeight" value="20"></div>
              <div class="field hidden" id="quickLateralityField"><label>Lado registrado</label><select id="quickLaterality"></select></div>
              <div class="field"><label>Nombre del equipo (opcional)</label><input type="text" id="quickEquipmentName" placeholder="Ej. Polea 2 del gimnasio"></div>
            </div>
            <div class="field" style="margin-top:10px"><label>Tipo de serie</label><select id="quickSetType">${setTypeOptions()}</select><div class="muted small">Solo las series efectivas alimentan el volumen y las sugerencias. Los calentamientos quedan visibles por separado.</div></div>
            <label class="check" style="margin-top:10px"><input type="checkbox" id="quickBodyweight"><span>Peso corporal: reps sin kilos o kilos como lastre.</span></label>
            <div class="formGrid" style="margin-top:10px"><div class="field"><label>RIR opcional</label><input type="text" inputmode="decimal" id="quickRir" value="2"></div><div class="field"><label>RPE opcional</label><input type="text" inputmode="decimal" id="quickRpe" placeholder="Ej. 8"></div></div>
            <div class="field" style="margin-top:10px"><label>Nota opcional</label><textarea id="quickNote" placeholder="Técnica, molestia, energía, ajuste para próxima serie…"></textarea></div>
            <div class="buttons"><button type="button" class="warn" id="finishWorkoutBtn">Finalizar entrenamiento</button></div>
          </details>
        </div>
      </div>
      <div class="moduleCard" id="workoutConfigPanel">
        <div class="workoutQuickAccessShell"><details class="workoutQuickAccess" aria-labelledby="workoutQuickAccessTitle">
          <summary><span id="workoutQuickAccessTitle">Acceso rápido en Android</span><small>Widget y pantalla de bloqueo</small></summary>
          <p class="muted">Registrá una serie sin abrir toda la app.</p>
          <div class="workoutQuickAccessGrid">
            <article class="workoutQuickAccessItem">
              <div><strong>Widget de pantalla de inicio</strong><p class="muted small" id="workoutWidgetInstallStatus" role="status">Comprobando disponibilidad…</p></div>
              <button type="button" class="good" id="addWorkoutWidgetBtn">Agregar widget</button>
              <p class="muted small" id="workoutWidgetInstallHelp">Mantené presionada la pantalla de inicio → Widgets → Protocolo 0→100 · Gym.</p>
            </article>
            <article class="workoutQuickAccessItem">
              <div><strong>Controles mientras entrenás</strong><p class="muted small" id="workoutLockScreenStatus" role="status">Disponible con el APK Android. La pantalla de bloqueo puede depender de tu versión y fabricante.</p></div>
              <button type="button" class="secondary" id="enableWorkoutControlsBtn">Activar controles</button>
              <p class="muted small">La versión pública de la notificación no muestra peso, repeticiones ni datos de Gym Party.</p>
            </article>
          </div>
          <div class="workoutQuickAccessState" id="workoutQuickAccessState" role="status" aria-live="polite">Guardado en el dispositivo.</div>
          <details class="advancedDetails workoutQuickAccessDiagnostics">
            <summary>Diagnóstico avanzado</summary>
            <p class="muted small" id="workoutQuickAccessDiagnostic">Sin datos técnicos disponibles en la versión web.</p>
            <button type="button" class="secondary" id="refreshWorkoutWidgetBtn">Actualizar acceso rápido</button>
          </details>
        </details></div>
        <details class="planAdvancedEditor">
        <summary>Rutina y preferencias</summary>
        <div class="formGrid">
          <label class="check"><input type="checkbox" id="gymWidgetEnabled"><span>Mantener actualizado el acceso rápido.</span></label>
          <label class="check"><input type="checkbox" id="gymShowRir"><span>Mostrar RIR/RPE en registro rápido.</span></label>
          <div class="field"><label>Unidad</label><select id="gymUnit"><option value="kg">kg</option><option value="lb">lb</option></select></div>
          <div class="field"><label>Modo</label><select id="gymMode"><option value="simple">Simple</option><option value="advanced">Avanzado</option></select></div>
          <label class="check"><input type="checkbox" id="gymShowRestDays"><span>Mostrar descanso/actividad suave sábado y domingo.</span></label>
          <label class="check"><input type="checkbox" id="gymRestTimerEnabled"><span>Iniciar cronómetro de descanso al guardar.</span></label>
          <div class="field"><label>Descanso (segundos)</label><input type="text" inputmode="decimal" id="gymRestSeconds" value="90"></div>
          <label class="check"><input type="checkbox" id="gymHapticEnabled"><span>Vibración breve al guardar (si el dispositivo permite).</span></label>
          <div class="field"><label>Día a editar</label><select id="planEditorDay"></select></div>
          <div class="field"><label>Nombre de rutina</label><input type="text" id="planEditorName"></div>
          <div class="field"><label>Músculos principales</label><input type="text" id="planEditorMuscles" placeholder="Pecho · Espalda"></div>
        </div>
        <div id="planEditorCards" class="planEditorCards"></div>
        <div id="planEditorStatus" class="planEditorStatus" role="status" aria-live="polite">Los cambios visuales se guardan automáticamente.</div>
        <div class="formGrid" style="margin-top:10px">
          <div class="field"><label>Agregar desde biblioteca</label><select id="planLibrarySelect"></select></div>
          <div class="field"><label>Nombre personalizado</label><input type="text" id="planCustomExerciseName" placeholder="Ej. Face pull"></div>
          <div class="field"><label>Etiqueta de grupo</label><input type="text" id="planCustomExerciseMuscle" placeholder="Ej. Hombro"></div>
          <details class="advancedDetails muscleChoicePanel"><summary>Clasificación muscular</summary><p class="muted small">Elegí uno o más músculos principales. Si lo dejás vacío, quedará pendiente de revisión y no se asignará a un músculo específico.</p><div class="muscleChoiceColumns">${muscleChoiceMarkup('planCustomPrimaryMuscles','Principales')}${muscleChoiceMarkup('planCustomSecondaryMuscles','Secundarios opcionales')}</div></details>
        </div>
        <div class="buttons">
          <button type="button" class="secondary" id="addPlanLibraryExerciseBtn">Agregar desde biblioteca</button>
          <button type="button" class="secondary" id="createPlanCustomExerciseBtn">Crear ejercicio personalizado</button>
          <button type="button" class="secondary" id="undoPlanExerciseDeleteBtn" disabled>Deshacer eliminación</button>
        </div>
        <details class="planAdvancedEditor" id="advancedPlanTextEditor">
          <summary>Edición avanzada en texto</summary>
          <div class="field" style="margin-top:10px"><label>Formato: músculo | ejercicio | peso corporal opcional | notas</label><textarea id="planEditorExercises" class="planEditorTextarea"></textarea></div>
          <button type="button" class="secondary" id="applyPlanTextBtn">Aplicar texto al día</button>
        </details>
        <details class="planAdvancedEditor" id="exerciseLibraryEditor">
          <summary>Biblioteca de ejercicios</summary>
          <div class="field" style="margin-top:10px"><label>Buscar por nombre, alias o músculo</label><input type="search" id="exerciseLibrarySearch" autocomplete="off" placeholder="Ej. espalda"></div>
          <div id="exerciseClassificationStatus" class="exerciseClassificationStatus" role="status" aria-live="polite"></div>
          <div class="field"><label>Clasificación</label><select id="exerciseClassificationFilter"><option value="all">Todos los ejercicios</option><option value="pending">Pendientes de revisar</option></select></div>
          <div id="exerciseLibraryList" class="exerciseLibraryList"></div>
          <details class="advancedDetails" id="historicalClassificationMigration">
            <summary>Clasificación de sesiones antiguas</summary>
            <p class="muted small">Las sesiones nuevas conservan un snapshot. Las antiguas solo se actualizan desde esta acción explícita, con vista previa y Deshacer.</p>
            <div id="historicalClassificationStatus" class="exerciseClassificationStatus" role="status" aria-live="polite">Todavía no se analizó el historial.</div>
            <div class="buttons">
              <button type="button" class="secondary" id="previewHistoricalClassificationBtn">Revisar sesiones antiguas</button>
              <button type="button" class="secondary" id="applyHistoricalClassificationBtn" disabled>Aplicar migración</button>
              <button type="button" class="secondary" id="undoHistoricalClassificationBtn" disabled>Deshacer</button>
            </div>
          </details>
        </details>
        <div class="formGrid" style="margin-top:10px">
          <div class="field"><label>Copiar desde</label><select id="copyPlanFrom"></select></div>
          <div class="field"><label>Copiar hacia</label><select id="copyPlanTo"></select></div>
        </div>
        <div class="buttons">
          <button type="button" class="good" id="savePlanDayBtn">Guardar nombre y músculos</button>
          <button type="button" class="secondary" id="copyPlanDayBtn">Duplicar rutina en otro día</button>
          <button type="button" class="warn" id="resetDefaultPlanBtn">Restablecer rutina predeterminada</button>
        </div>
        </details>
      </div>
    `);
    setupWorkoutEvents();
  }
  function setupWorkoutEvents(){
    const measurementSelect=document.getElementById('quickMeasurementMode');
    if(measurementSelect)measurementSelect.innerHTML=optionHtml(equipmentModel()?.measurementModes?.()||[]);
    const loadSelect=document.getElementById('quickLoadMode');
    if(loadSelect)loadSelect.innerHTML=optionHtml(equipmentModel()?.loadModes?.()||[]);
    const equipmentSelect=document.getElementById('quickEquipmentId');
    if(equipmentSelect)equipmentSelect.innerHTML=optionHtml(equipmentProfiles());
    const lateralitySelect=document.getElementById('quickLaterality');
    if(lateralitySelect)lateralitySelect.innerHTML=optionHtml(equipmentModel()?.lateralities?.()||[]);
    dayOrder.forEach(key=>{
      const label=`${dayLabels[key]} — ${weeklyPlan()[key]?.name||defaultWeeklyPlan[key].name}`;
      ['planEditorDay','copyPlanFrom','copyPlanTo'].forEach(id=>{
        const select=document.getElementById(id);
        if(select && !select.querySelector(`[value="${key}"]`)) select.insertAdjacentHTML('beforeend',`<option value="${key}">${escapeHtml(label)}</option>`);
      });
    });
    document.getElementById('startTodayWorkoutBtn')?.addEventListener('click',()=>openQuickSetLogger());
    document.getElementById('openQuickLoggerBtn')?.addEventListener('click',()=>openQuickSetLogger());
    document.getElementById('addWorkoutWidgetBtn')?.addEventListener('click',requestWorkoutWidgetInstall);
    document.getElementById('enableWorkoutControlsBtn')?.addEventListener('click',enableNativeWorkoutControls);
    document.getElementById('nativeWorkoutLiveButton')?.addEventListener('click',enableNativeWorkoutControls);
    document.getElementById('quickExerciseSelect')?.addEventListener('change',event=>{editingQuickSetId='';selectQuickExerciseValue(event.target.value);});
    document.getElementById('quickExerciseSearch')?.addEventListener('input',renderQuickLogger);
    document.getElementById('saveQuickSetBtn')?.addEventListener('click',saveQuickSet);
    document.getElementById('repeatLastSetBtn')?.addEventListener('click',repeatLastSet);
    document.getElementById('quickTimerStartBtn')?.addEventListener('click',()=>nativeTimerAction(nativeTimerStatus==='paused'?'com.protocolo.cien.ACTION_TIMER_RESUME':'com.protocolo.cien.ACTION_TIMER_START'));
    document.getElementById('quickTimerPauseBtn')?.addEventListener('click',()=>nativeTimerAction('com.protocolo.cien.ACTION_TIMER_PAUSE'));
    document.getElementById('quickTimerAddBtn')?.addEventListener('click',()=>nativeTimerAction('com.protocolo.cien.ACTION_TIMER_ADD_15'));
    document.getElementById('undoQuickSetDeleteBtn')?.addEventListener('click',undoDeletedQuickSet);
    document.getElementById('finishWorkoutBtn')?.addEventListener('click',finishWorkout);
    document.getElementById('quickSetLoggerPanel')?.addEventListener('click',handleQuickLoggerAction);
    ['quickSetNumber','quickReps','quickWeight','quickDurationSeconds','quickDistanceMeters','quickMeasurementMode','quickLoadMode','quickEquipmentId','quickEquipmentName','quickBarWeight','quickLaterality','quickSetType','quickRir','quickRpe','quickNote','quickBodyweight'].forEach(id=>{
      document.getElementById(id)?.addEventListener('input',captureQuickDraft);
      document.getElementById(id)?.addEventListener('change',captureQuickDraft);
    });
    document.getElementById('quickMeasurementMode')?.addEventListener('change',()=>updateQuickModeFields());
    document.getElementById('quickLoadMode')?.addEventListener('change',()=>updateQuickModeFields());
    document.getElementById('quickEquipmentId')?.addEventListener('change',applyQuickEquipmentProfile);
    document.getElementById('quickBodyweight')?.addEventListener('change',event=>{
      const load=document.getElementById('quickLoadMode');
      if(load)load.value=event.target.checked?(numeric(document.getElementById('quickWeight')?.value,0)>0?'addedLoad':'bodyweight'):'total';
      updateQuickModeFields();
    });
    document.getElementById('planEditorDay')?.addEventListener('change',event=>{currentPlanEditorDay=event.target.value;renderPlanEditor();});
    ['planEditorName','planEditorMuscles','planEditorExercises','planCustomExerciseName','planCustomExerciseMuscle'].forEach(id=>document.getElementById(id)?.addEventListener('input',capturePlanDraft));
    document.querySelectorAll('input[name="planCustomPrimaryMuscles"],input[name="planCustomSecondaryMuscles"]').forEach(input=>input.addEventListener('change',capturePlanDraft));
    document.getElementById('savePlanDayBtn')?.addEventListener('click',savePlanEditorDay);
    document.getElementById('copyPlanDayBtn')?.addEventListener('click',copyPlanDay);
    document.getElementById('addPlanLibraryExerciseBtn')?.addEventListener('click',addPlanLibraryExercise);
    document.getElementById('createPlanCustomExerciseBtn')?.addEventListener('click',createPlanCustomExercise);
    document.getElementById('undoPlanExerciseDeleteBtn')?.addEventListener('click',undoPlanExerciseDelete);
    document.getElementById('applyPlanTextBtn')?.addEventListener('click',applyAdvancedPlanText);
    document.getElementById('exerciseLibrarySearch')?.addEventListener('input',renderExerciseLibraryEditor);
    document.getElementById('exerciseClassificationFilter')?.addEventListener('change',renderExerciseLibraryEditor);
    document.getElementById('exerciseLibraryList')?.addEventListener('click',handleExerciseLibraryAction);
    document.getElementById('previewHistoricalClassificationBtn')?.addEventListener('click',previewHistoricalClassificationFromUi);
    document.getElementById('applyHistoricalClassificationBtn')?.addEventListener('click',applyHistoricalClassificationFromUi);
    document.getElementById('undoHistoricalClassificationBtn')?.addEventListener('click',undoHistoricalClassificationFromUi);
    document.getElementById('planEditorCards')?.addEventListener('change',updatePlanExerciseFromCard);
    document.getElementById('planEditorCards')?.addEventListener('click',handlePlanExerciseAction);
    document.getElementById('resetDefaultPlanBtn')?.addEventListener('click',resetDefaultPlan);
    document.getElementById('refreshWorkoutWidgetBtn')?.addEventListener('click',()=>{syncWorkoutWidget();renderWorkoutQuickAccessStatus();flash('Acceso rápido actualizado.');});
    ['gymWidgetEnabled','gymShowRir','gymShowRestDays','gymRestTimerEnabled','gymHapticEnabled'].forEach(id=>document.getElementById(id)?.addEventListener('change',saveSettingsFromUi));
    ['gymUnit','gymMode','gymRestSeconds'].forEach(id=>document.getElementById(id)?.addEventListener('change',saveSettingsFromUi));
    window.applyCurrentRouteView?.();
  }
  function renderWorkoutDashboard(){
    injectWorkoutUi();
    if(window.APP_DATA?.isPrimaryDomain?.('workout')&&!window.APP_DATA.isPrimaryReady?.('workout')&&!workoutStorageInitialized){
      initializeWorkoutFeatures();
      return;
    }
    ensureWorkoutData();
    maybeImportWidgetStateFromAndroid();
    renderTodayWorkout();
    renderQuickLogger();
    renderPlanEditor();
    renderSettings();
    syncWorkoutWidget();
  }
  function setWorkoutBusy(busy){
    const tab=document.getElementById('tab-gym');if(!tab)return;
    tab.inert=!!busy;
    if(busy)tab.setAttribute('aria-busy','true');else tab.removeAttribute('aria-busy');
    tab.querySelectorAll('button,input,select,textarea').forEach(control=>{
      if(busy&&!control.disabled){control.dataset.workoutBusyDisabled='true';control.disabled=true;}
      else if(!busy&&control.dataset.workoutBusyDisabled==='true'){
        delete control.dataset.workoutBusyDisabled;
        control.disabled=control.dataset.workoutStateDisabled==='true';
      }
    });
  }
  function renderTodayWorkout(date=todayStr()){
    const plan=planForDate(date),session=latestSessionForDate(date),summary=session?sessionSummary(session):null;
    const title=document.getElementById('todayWorkoutTitle'),subtitle=document.getElementById('todayWorkoutSummary'),list=document.getElementById('todayWorkoutExercises'),progress=document.getElementById('todayWorkoutProgress'),score=document.getElementById('todayWorkoutScore'),lever=document.getElementById('physicalLever');
    const startButton=document.getElementById('startTodayWorkoutBtn'),continueButton=document.getElementById('openQuickLoggerBtn');
    const exerciseCount=document.getElementById('todayWorkoutExerciseCount');
    if(!title||!subtitle||!list||!progress) return;
    title.textContent=`${plan.weekday} — ${plan.name}`;
    subtitle.textContent=plan.type==='rest'?plan.message:(plan.muscles||[]).join(' · ');
    const settingsValue=settings();
    if(plan.type==='rest'){
      const restText=settingsValue.showRestDays ? `${escapeHtml(plan.message)}<br>${escapeHtml((plan.suggestions||[]).join(' · '))}` : 'Día de descanso oculto en ajustes. La recuperación sigue contando.';
      list.innerHTML=`<div class="emptyState">${restText}</div>`;
      progress.innerHTML=[['Estado','Descanso'],['Sugerencia','Movilidad'],['Registro',session?'Hecho':'Opcional'],['Widget',settingsValue.widgetEnabled?'Activo':'Pausado']].map(statCard).join('');
      if(score) score.textContent='Recuperación';
      if(lever) lever.textContent='Hoy toca descanso: recuperación también cuenta.';
      if(startButton)startButton.hidden=true;
      if(continueButton)continueButton.hidden=true;
      if(exerciseCount)exerciseCount.textContent='Recuperación';
      return;
    }
    const exercises=session?.exercises||plan.exercises;
    if(exerciseCount)exerciseCount.textContent=`${exercises.length} ejercicios`;
    const current=currentExercise(session)||exercises.find(x=>!x.completed)||exercises[0];
    list.innerHTML=exercises.map(exercise=>{
      const sets=exercise.sets?.length||0,done=!!exercise.completed,cur=current && (current.id===exercise.id || current.exerciseId===exercise.exerciseId);
      return `<div class="workoutExerciseCard ${done?'done':''} ${cur?'current':''}"><strong>${escapeHtml(exercise.name)}</strong><div class="meta">${escapeHtml(exercise.muscle)} · ${sets} serie(s) registradas${exercise.bodyweight?' · peso corporal':''}</div></div>`;
    }).join('');
    const completed=summary?.completedExercises||0,total=exercises.length,totalSets=summary?.totalSets||0,volume=summary?.totalVolume||0;
    const displaySummary=summary?{...summary,externalLoadVolume:displayVolume(summary.externalLoadVolume,settingsValue.unit),addedLoadVolume:displayVolume(summary.addedLoadVolume,settingsValue.unit)}:{};
    const progressText=window.WORKOUT_METRICS?.formatProgress?.(displaySummary,settingsValue.unit)||`${displayVolume(volume,settingsValue.unit).toLocaleString()} ${settingsValue.unit}`;
    progress.innerHTML=[['Ejercicios',`${completed}/${total}`],['Series',totalSets],['Carga registrada',progressText]].map(statCard).join('');
    if(score) score.textContent=`Score gym ${Math.min(100,Math.round((completed/Math.max(1,total))*70 + Math.min(30,totalSets*2)))}/100`;
    if(lever) lever.textContent=totalSets?'Según lo registrado, priorizá técnica antes que carga y registrá la siguiente serie.':'Palanca física de hoy: registrar pesos para medir progreso.';
    const active=session?.status==='en progreso';
    if(startButton)startButton.hidden=active;
    if(continueButton){continueButton.hidden=!active;continueButton.textContent='Continuar entrenamiento';}
  }
  function statCard([k,v]){
    return window.WORKOUT_UI?.statCard?.(k,String(v))??`<div class="quickStat"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`;
  }
  function quickDraftKey(exerciseId=currentQuickExerciseId,date=todayStr()){ return `${date}:${exerciseId||''}`; }
  function quickPersistentDraftId(exerciseId=currentQuickExerciseId,date=todayStr(),setId=editingQuickSetId||'new'){return `gym-set:${date}:${exerciseId||''}:${setId||'new'}`;}
  function quickInputValue(id){ const element=document.getElementById(id); return element?.type==='checkbox'?!!element.checked:(element?.value??''); }
  function updateQuickModeFields({capture=true}={}){
    const measurement=equipmentModel()?.measurementMode?.(quickInputValue('quickMeasurementMode'))||'reps';
    let load=equipmentModel()?.loadMode?.(quickInputValue('quickLoadMode'))||'total';
    if(measurement==='assistance'&&load!=='assistance'){
      load='assistance';
      const input=document.getElementById('quickLoadMode');if(input)input.value=load;
    }
    const usesReps=measurement==='reps'||measurement==='assistance';
    document.getElementById('quickRepsField')?.classList.toggle('hidden',!usesReps);
    document.getElementById('quickDurationField')?.classList.toggle('hidden',!['time','distance'].includes(measurement));
    document.getElementById('quickDistanceField')?.classList.toggle('hidden',measurement!=='distance');
    document.getElementById('quickWeightField')?.classList.toggle('hidden',!usesReps||load==='bodyweight');
    document.getElementById('quickBarWeightField')?.classList.toggle('hidden',load!=='perSide');
    document.getElementById('quickLateralityField')?.classList.toggle('hidden',!['perHand','perSide'].includes(load));
    const label=document.getElementById('quickWeightLabel');
    if(label)label.textContent=`${equipmentModel()?.weightLabel?.(load)||'Carga'} (${settings().unit})`;
    const body=document.getElementById('quickBodyweight');
    if(body)body.checked=['bodyweight','addedLoad'].includes(load);
    if(capture)captureQuickDraft();
  }
  function applyQuickEquipmentProfile(){
    const profile=equipmentModel()?.profile?.(quickInputValue('quickEquipmentId'),readStore(keys.equipmentProfiles,[]));
    if(profile){
      const load=document.getElementById('quickLoadMode');if(load)load.value=profile.loadMode||'total';
      const bar=document.getElementById('quickBarWeight');if(bar&&profile.barWeightKg!==undefined)bar.value=displayWeight(profile.barWeightKg);
      const name=document.getElementById('quickEquipmentName');if(name)name.value=profile.id==='unspecified'?'':profile.name;
      if(profile.loadMode==='assistance'){
        const measurement=document.getElementById('quickMeasurementMode');if(measurement)measurement.value='assistance';
      }
    }
    updateQuickModeFields();
  }
  function captureQuickDraft(){
    const selectedId=document.getElementById('quickExerciseSelect')?.value||currentQuickExerciseId;
    if(!selectedId)return;
    const libraryId=String(selectedId).startsWith('library:')?String(selectedId).slice(8):'';
    const source=(activeSession(todayStr())||latestSessionForDate(todayStr()))?.exercises||planForDate(todayStr()).exercises||[];
    const active=libraryId?source.find(exercise=>exercise.exerciseId===libraryId||exercise.id===libraryId):null;
    const exerciseId=active?.id||active?.exerciseId||selectedId;
    const payload={
      setNumber:quickInputValue('quickSetNumber'),reps:quickInputValue('quickReps'),weight:quickInputValue('quickWeight'),durationSeconds:quickInputValue('quickDurationSeconds'),distanceMeters:quickInputValue('quickDistanceMeters'),measurementMode:quickInputValue('quickMeasurementMode'),loadMode:quickInputValue('quickLoadMode'),equipmentId:quickInputValue('quickEquipmentId'),equipmentName:quickInputValue('quickEquipmentName'),barWeight:quickInputValue('quickBarWeight'),laterality:quickInputValue('quickLaterality'),setType:quickInputValue('quickSetType'),rir:quickInputValue('quickRir'),rpe:quickInputValue('quickRpe'),note:quickInputValue('quickNote'),bodyweight:quickInputValue('quickBodyweight')
    };
    quickFormDirty=true;
    quickDrafts.set(quickDraftKey(exerciseId),payload);
    window.APP_DRAFTS?.schedule?.({id:quickPersistentDraftId(exerciseId),domain:'gym-set',payload:{...payload,date:todayStr(),exerciseId,setId:editingQuickSetId||''}});
  }
  function applyQuickDraft(draft){
    if(!draft) return;
    for(const [id,key] of [['quickSetNumber','setNumber'],['quickReps','reps'],['quickWeight','weight'],['quickDurationSeconds','durationSeconds'],['quickDistanceMeters','distanceMeters'],['quickMeasurementMode','measurementMode'],['quickLoadMode','loadMode'],['quickEquipmentId','equipmentId'],['quickEquipmentName','equipmentName'],['quickBarWeight','barWeight'],['quickLaterality','laterality'],['quickSetType','setType'],['quickRir','rir'],['quickRpe','rpe'],['quickNote','note']]){
      const element=document.getElementById(id); if(element&&draft[key]!==undefined) element.value=draft[key];
    }
    const bodyweight=document.getElementById('quickBodyweight'); if(bodyweight&&draft.bodyweight!==undefined) bodyweight.checked=!!draft.bodyweight;
    updateQuickModeFields({capture:false});
  }
  function formatDuration(seconds){
    const total=Math.max(0,Math.round(numeric(seconds,0)));
    return total>=60?`${Math.floor(total/60)}:${String(total%60).padStart(2,'0')} min`:`${total} s`;
  }
  function formatPace(seconds){
    const total=Math.max(0,Math.round(numeric(seconds,0)));if(!total)return'';
    return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')} min/km`;
  }
  function setPerformanceText(raw,exercise={}){
    const set=normalizeSet(raw,exercise),unit=settings().unit;
    if(set.measurementMode==='time')return formatDuration(set.durationSeconds);
    if(set.measurementMode==='distance')return `${(set.distanceMeters/1000).toLocaleString('es-PY',{maximumFractionDigits:2})} km${set.paceSecondsPerKm?` · ${formatPace(set.paceSecondsPerKm)}`:''}`;
    const reps=`${set.reps||0} reps`;
    if(set.loadMode==='bodyweight')return `${reps} · peso corporal`;
    if(set.loadMode==='assistance')return `${reps} · ${displayWeight(set.assistanceKg)} ${unit} de asistencia`;
    const amount=displayWeight(set.weightKg??set.weight);
    const suffix=set.loadMode==='perHand'?' por mano':set.loadMode==='perSide'?` por lado + barra ${displayWeight(set.barWeightKg)} ${unit}`:set.loadMode==='addedLoad'?' de lastre':'';
    return `${reps} · ${amount} ${unit}${suffix}`;
  }
  function quickSetRowsHtml(exercise){
    const sets=exercise?.sets||[];
    if(!sets.length) return '<div class="muted small">Todavía no hay series en este ejercicio.</div>';
    return sets.map(raw=>{const set=normalizeSet(raw,exercise),review=set.anomalyReview?.decision?` · Revisado: ${window.WORKOUT_ANOMALY_DETECTOR?.label?.(set.anomalyReview.decision)||'dato inusual'}`:'';return `<div class="quickLoggedSet ${set.id===editingQuickSetId?'editing':''}"><div><strong>Serie ${set.setNumber} · ${escapeHtml(setTypeLabel(set.setType))}</strong><span>${escapeHtml(setPerformanceText(set,exercise))}${set.rir!==null&&set.rir!==undefined?` · RIR ${set.rir}`:''}${set.equipmentName?` · ${escapeHtml(set.equipmentName)}`:''}${escapeHtml(review)}</span></div><div class="buttons"><button type="button" class="secondary" data-quick-edit-set="${escapeHtml(set.id)}" aria-label="Editar serie ${set.setNumber} de ${escapeHtml(exercise.name)}">Editar</button><button type="button" class="danger" data-quick-delete-set="${escapeHtml(set.id)}" aria-label="Eliminar serie ${set.setNumber} de ${escapeHtml(exercise.name)}">Eliminar</button></div></div>`;}).join('');
  }
  function updateRestTimerDisplay(){
    const box=document.getElementById('quickRestTimer'),value=document.getElementById('quickRestTimerValue'); if(!box||!value)return;
    const nativeEnabled=nativeTimerEnabled();
    if(nativeTimerStatus==='paused'){
      box.classList.remove('hidden');
      value.textContent=`${Math.floor(nativeTimerPausedSeconds/60)}:${String(nativeTimerPausedSeconds%60).padStart(2,'0')}`;
      const start=document.getElementById('quickTimerStartBtn'),pause=document.getElementById('quickTimerPauseBtn');if(start)start.textContent='Continuar';if(pause)pause.disabled=true;
      return;
    }
    const remaining=Math.max(0,Math.ceil((restTimerEndsAt-Date.now())/1000));
    box.classList.toggle('hidden',!nativeEnabled&&nativeTimerStatus!=='running'&&(!restTimerEndsAt||remaining<=0));
    value.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    const start=document.getElementById('quickTimerStartBtn'),pause=document.getElementById('quickTimerPauseBtn');if(start)start.textContent='Iniciar';if(pause)pause.disabled=nativeEnabled&&nativeTimerStatus!=='running';
    if(restTimerEndsAt&&remaining<=0){restTimerEndsAt=0;nativeTimerStatus='finished';if(restTimerInterval){clearInterval(restTimerInterval);restTimerInterval=null;}if(settings().hapticEnabled&&navigator.vibrate)navigator.vibrate([40,40,40]);}
  }
  function nativeTimerEnabled(){return !!(window.APP_FEATURE_FLAGS?.isEnabled?.('nativeRestTimer')&&window.AndroidBridge?.handleNativeWorkoutTimerAction);}
  function syncNativeTimerFromBridge(){
    if(!nativeTimerEnabled()||!window.AndroidBridge?.getNativeWorkoutControlData)return false;
    try{
      const payload=JSON.parse(String(window.AndroidBridge.getNativeWorkoutControlData()||'{}')),runtime=payload.timerRuntime||{},timer=payload.state?.timer||{};
      nativeTimerStatus=String(runtime.timerStatus||timer.timerStatus||'idle');
      const remainingMs=Math.max(0,Number(runtime.remainingMs)||0);
      nativeTimerPausedSeconds=Math.ceil(remainingMs/1000);
      restTimerEndsAt=nativeTimerStatus==='running'?Date.now()+remainingMs:0;
      if(restTimerInterval)clearInterval(restTimerInterval);
      if(nativeTimerStatus==='running')restTimerInterval=setInterval(updateRestTimerDisplay,1000);
      updateRestTimerDisplay();return true;
    }catch(error){window.APP_ERROR_BOUNDARY?.capture?.(error,{source:'native-workout-timer'});return false;}
  }
  function nativeTimerAction(action){
    if(nativeTimerEnabled()){
      try{window.AndroidBridge.handleNativeWorkoutTimerAction(action);setTimeout(syncNativeTimerFromBridge,80);return;}
      catch(error){window.APP_ERROR_BOUNDARY?.capture?.(error,{source:'native-workout-timer-action'});}
    }
    if(action.endsWith('ACTION_TIMER_PAUSE')&&restTimerEndsAt){nativeTimerPausedSeconds=Math.max(1,Math.ceil((restTimerEndsAt-Date.now())/1000));restTimerEndsAt=0;nativeTimerStatus='paused';if(restTimerInterval)clearInterval(restTimerInterval);restTimerInterval=null;updateRestTimerDisplay();return;}
    if(action.endsWith('ACTION_TIMER_ADD_15')){if(nativeTimerStatus==='paused')nativeTimerPausedSeconds+=15;else if(restTimerEndsAt)restTimerEndsAt+=15000;updateRestTimerDisplay();return;}
    if(action.endsWith('ACTION_TIMER_RESUME')&&nativeTimerStatus==='paused'){restTimerEndsAt=Date.now()+nativeTimerPausedSeconds*1000;nativeTimerStatus='running';if(restTimerInterval)clearInterval(restTimerInterval);restTimerInterval=setInterval(updateRestTimerDisplay,1000);updateRestTimerDisplay();return;}
    if(action.endsWith('ACTION_TIMER_START'))startRestTimer();
  }
  function startRestTimer(){
    const current=settings(); if(!current.restTimerEnabled)return;
    if(nativeTimerEnabled()){
      try{window.AndroidBridge.handleNativeWorkoutTimerAction('com.protocolo.cien.ACTION_TIMER_START');setTimeout(syncNativeTimerFromBridge,80);return;}
      catch(error){window.APP_ERROR_BOUNDARY?.capture?.(error,{source:'native-workout-timer-start'});}
    }
    restTimerEndsAt=Date.now()+Math.max(15,Number(current.restSeconds)||90)*1000;
    nativeTimerStatus='running';
    if(restTimerInterval)clearInterval(restTimerInterval);
    restTimerInterval=setInterval(updateRestTimerDisplay,1000);updateRestTimerDisplay();
  }
  function hapticFeedback(){ if(settings().hapticEnabled&&navigator.vibrate)navigator.vibrate(35); }
  function renderQuickLogger(){
    const liveDraft=quickFormDirty?{setNumber:quickInputValue('quickSetNumber'),reps:quickInputValue('quickReps'),weight:quickInputValue('quickWeight'),durationSeconds:quickInputValue('quickDurationSeconds'),distanceMeters:quickInputValue('quickDistanceMeters'),measurementMode:quickInputValue('quickMeasurementMode'),loadMode:quickInputValue('quickLoadMode'),equipmentId:quickInputValue('quickEquipmentId'),equipmentName:quickInputValue('quickEquipmentName'),barWeight:quickInputValue('quickBarWeight'),laterality:quickInputValue('quickLaterality'),setType:quickInputValue('quickSetType'),rir:quickInputValue('quickRir'),rpe:quickInputValue('quickRpe'),note:quickInputValue('quickNote'),bodyweight:quickInputValue('quickBodyweight')}:null;
    const date=todayStr(),plan=planForDate(date);
    const select=document.getElementById('quickExerciseSelect'); if(!select) return;
    const session=activeSession(date) || latestSessionForDate(date);
    const source=session?.exercises?.length?session.exercises:plan.exercises;
    const pendingDraft=window.APP_DRAFTS?.list?.('gym-set')?.find(item=>item.payload?.date===date&&(source||[]).some(exercise=>(exercise.id||exercise.exerciseId)===item.payload.exerciseId));
    if(!currentQuickExerciseId&&pendingDraft?.payload?.exerciseId)currentQuickExerciseId=pendingDraft.payload.exerciseId;
    if(!editingQuickSetId&&pendingDraft?.payload?.setId)editingQuickSetId=pendingDraft.payload.setId;
    const query=document.getElementById('quickExerciseSearch')?.value||'';
    const ranking=rankExercisesForContext({date,currentPlan:plan,query});
    const renderExerciseOption=(exercise,escapeValue=escapeHtml)=>{
      const active=(source||[]).find(item=>item.exerciseId===exercise.exerciseId);
      const value=active?(active.id||active.exerciseId):`library:${exercise.exerciseId}`;
      return `<option value="${escapeValue(value)}">${escapeValue(exercise.name)}</option>`;
    };
    select.innerHTML=window.WORKOUT_UI?.groupedOptions?.(ranking.groups,renderExerciseOption)??ranking.groups.map(group=>`<optgroup label="${escapeHtml(group.label)}">${group.items.map(exercise=>renderExerciseOption(exercise)).join('')}</optgroup>`).join('');
    if(!currentQuickExerciseId && source?.[0]) currentQuickExerciseId=source[0].id||source[0].exerciseId;
    if(currentQuickExerciseId) select.value=currentQuickExerciseId;
    const exercise=(source||[]).find(x=>(x.id||x.exerciseId)===select.value) || source?.[0];
    if(!exercise) return;
    currentQuickExerciseId=exercise.id||exercise.exerciseId;
    const h=history()[exercise.exerciseId]||null;
    const sets=exercise.sets||[];
    const editingSet=sets.find(set=>set.id===editingQuickSetId)||null;
    if(editingQuickSetId&&!editingSet)editingQuickSetId='';
    const last=sets.slice().reverse().find(set=>setModel()?.countsForProgression?.(set)??true)||sets[sets.length-1]||null;
    document.getElementById('quickSetNumber').value=editingSet?.setNumber||(sets.length||0)+1;
    const bodyweight=!!exercise.bodyweight || !!h?.bodyweight;
    const suggested=normalizeSet(editingSet||last||h?.lastSet||{measurementMode:exercise.measurementMode||'reps',loadMode:exercise.defaultLoadMode||(bodyweight?'bodyweight':'total'),bodyweight},exercise);
    document.getElementById('quickBodyweight').checked=['bodyweight','addedLoad'].includes(suggested.loadMode)||bodyweight;
    document.getElementById('quickReps').value=editingSet?.reps??last?.reps??h?.lastReps??8;
    document.getElementById('quickWeight').value=displayWeight(suggested.loadMode==='assistance'?suggested.assistanceKg:(suggested.weightKg??h?.lastWeight??0));
    document.getElementById('quickDurationSeconds').value=suggested.durationSeconds||60;
    document.getElementById('quickDistanceMeters').value=suggested.distanceMeters||1000;
    document.getElementById('quickMeasurementMode').value=suggested.measurementMode||'reps';
    document.getElementById('quickLoadMode').value=suggested.loadMode||'total';
    document.getElementById('quickEquipmentId').value=suggested.equipmentId||exercise.equipmentId||'unspecified';
    document.getElementById('quickEquipmentName').value=suggested.equipmentName||exercise.equipmentName||'';
    document.getElementById('quickBarWeight').value=displayWeight(suggested.barWeightKg||0);
    document.getElementById('quickLaterality').value=suggested.laterality||'bilateral';
    document.getElementById('quickSetType').value=suggested.setType;
    document.getElementById('quickRir').value=editingSet?.rir??last?.rir??2;
    document.getElementById('quickRpe').value=editingSet?.rpe??'';
    document.getElementById('quickNote').value=editingSet?.note??'';
    document.getElementById('quickBodyweight').checked=editingSet?['bodyweight','addedLoad'].includes(suggested.loadMode):(['bodyweight','addedLoad'].includes(suggested.loadMode)||bodyweight);
    const persistentDraft=window.APP_DRAFTS?.get?.(quickPersistentDraftId(currentQuickExerciseId,date,editingQuickSetId||'new'));
    if(persistentDraft?.payload)applyQuickDraft(persistentDraft.payload);
    else if(!editingSet)applyQuickDraft(quickDrafts.get(quickDraftKey(currentQuickExerciseId)));
    if(liveDraft)applyQuickDraft(liveDraft);
    updateQuickModeFields({capture:false});
    if(persistentDraft&&!workoutDraftNotices.has(persistentDraft.id)){
      workoutDraftNotices.add(persistentDraft.id);
      window.APP_DRAFTS?.announceRestored?.({id:persistentDraft.id,label:'Borrador de serie restaurado.',onDiscard:()=>{quickDrafts.delete(quickDraftKey(currentQuickExerciseId));renderQuickLogger();}});
    }
    const hint=document.getElementById('quickLastHint');
    if(h) hint.textContent=`Última: ${h.lastSet?setPerformanceText(h.lastSet,exercise):`${displayWeight(h.lastWeight)} ${settings().unit} × ${h.lastReps||0}`}.`;
    else hint.textContent='Última: todavía sin datos.';
    const stat=document.getElementById('quickSetStats');
    if(stat){
      const exerciseSets=exerciseSetCount(exercise);
      const muscleSets=muscleSetCount(source,exercise.muscle);
      const typeCounts=setModel()?.counts?.(sets)||{working:exerciseSets,warmup:0,supplementary:0};
      const detail=[`${typeCounts.working} efectiva(s)`,typeCounts.warmup?`${typeCounts.warmup} calentamiento(s)`:null,typeCounts.supplementary?`${typeCounts.supplementary} complementaria(s)`:null].filter(Boolean).join(' · ');
      stat.textContent=`Ejercicio: ${exerciseSets} · ${exercise.muscle}: ${muscleSets}${detail?` · ${detail}`:''}.`;
    }
    const logged=document.getElementById('quickLoggedSets'); if(logged)logged.innerHTML=quickSetRowsHtml(exercise);
    const save=document.getElementById('saveQuickSetBtn'); if(save)save.textContent=editingSet?'Guardar cambios':'Guardar serie';
    const undo=document.getElementById('undoQuickSetDeleteBtn'); if(undo){undo.disabled=!lastDeletedQuickSet;undo.hidden=!lastDeletedQuickSet;}
    const repeat=document.getElementById('repeatLastSetBtn');if(repeat)repeat.hidden=!(last||h);
    if(!syncNativeTimerFromBridge())updateRestTimerDisplay();
    const show=settings().showRir;
    ['quickRir','quickRpe'].forEach(id=>{const field=document.getElementById(id)?.closest('.field'); if(field) field.classList.toggle('hidden',!show);});
  }
  function selectQuickExerciseValue(value){
    quickFormDirty=false;
    if(String(value||'').startsWith('library:')){
      const libraryId=String(value).slice(8);
      const library=libraryData().find(exercise=>exercise.id===libraryId);
      if(library){
        const result=addManualExercisePayload({date:todayStr(),name:library.name,muscle:library.group,type:library.type,unit:library.unit,bodyweight:library.bodyweight||library.unit==='peso corporal',persistScope:'session',rememberForWeekday:false,saveToLibrary:false});
        if(result.ok) currentQuickExerciseId=result.exercise.id;
      }
    }else currentQuickExerciseId=value;
    renderQuickLogger();
  }
  function openGymToday(){
    setModule('gym');
    renderWorkoutDashboard();
    document.getElementById('todayWorkoutPanel')?.scrollIntoView({behavior:window.preferredMotionBehavior?.()||'auto',block:'start'});
  }
  function openQuickSetLogger(exerciseId){
    const session=ensureSession(todayStr());
    activateNativeControlsForSession();
    if(exerciseId) currentQuickExerciseId=exerciseId;
    else if(session) currentQuickExerciseId=currentExercise(session)?.id || currentExercise(session)?.exerciseId || null;
    openGymToday();
    renderQuickLogger();
    document.getElementById('quickSetLoggerPanel')?.scrollIntoView({behavior:window.preferredMotionBehavior?.()||'auto',block:'start'});
  }
  function activateNativeControlsForSession(){
    if(!window.AndroidBridge?.requestWorkoutNotificationPermission)return;
    enableNativeWorkoutFeatures({notification:true});
    const permission=String(window.AndroidBridge.workoutNotificationPermissionState?.()||'');
    if(permission==='prompt')window.AndroidBridge.requestWorkoutNotificationPermission();
    else {
      const state=syncWorkoutWidget();
      if(permission==='granted'&&state&&window.AndroidBridge?.startWorkoutNotification){
        try{window.AndroidBridge.startWorkoutNotification(JSON.stringify(state));}catch(error){}
      }
    }
    window.setTimeout(renderWorkoutQuickAccessStatus,350);
  }
  function selectedSessionForQuick(){
    return ensureSession(todayStr());
  }
  function selectedQuickExercise(session){
    const select=document.getElementById('quickExerciseSelect');
    const id=select?.value || currentQuickExerciseId;
    return session?.exercises?.find(x=>x.id===id || x.exerciseId===id) || currentExercise(session);
  }
  function getQuickWorkoutState({date=todayStr(),exerciseId=''}={}){
    ensureWorkoutData();
    const plan=planForDate(date);
    const session=activeSession(date) || latestSessionForDate(date);
    const source=session?.exercises?.length?session.exercises:plan.exercises||[];
    const selectedId=exerciseId || currentQuickExerciseId || currentExercise(session)?.id || source.find(x=>!x.completed)?.id || source[0]?.id || source[0]?.exerciseId || '';
    const exercise=source.find(x=>x.id===selectedId || x.exerciseId===selectedId) || source[0] || null;
    const h=exercise?.exerciseId ? history()[exercise.exerciseId] : null;
    const sets=exercise?.sets||[];
    const last=sets[sets.length-1]||null;
    const bodyweight=!!(exercise?.bodyweight || last?.bodyweight || h?.bodyweight);
    const summary=session?sessionSummary(session):null;
    const effectiveType=session?.exercises?.length?'workout':plan.type;
    const routineName=session?.routine?.name||plan.name;
    const muscles=session?.routine?.muscles?.length?session.routine.muscles:(plan.muscles||[]);
    return {
      date,
      plan:clone(plan),
      session:session?clone(session):null,
      type:effectiveType,
      title:`${plan.weekday} — ${routineName}`,
      routineName,
      muscles,
      message:plan.message||'',
      suggestions:plan.suggestions||[],
      exercises:source.map(ex=>({id:ex.id,exerciseId:ex.exerciseId,name:ex.name,muscle:ex.muscle,bodyweight:!!ex.bodyweight,measurementMode:ex.measurementMode||'reps',defaultLoadMode:ex.defaultLoadMode||ex.loadMode||(ex.bodyweight?'bodyweight':'total'),equipmentId:ex.equipmentId||'',completed:!!ex.completed,setsLogged:exerciseSetCount(ex)})),
      currentExerciseId:exercise?.id||exercise?.exerciseId||'',
      currentExerciseName:exercise?.name||'',
      currentExerciseMuscle:exercise?.muscle||'',
      currentExerciseMeasurementMode:last?.measurementMode||exercise?.measurementMode||'reps',
      currentExerciseLoadMode:last?.loadMode||exercise?.defaultLoadMode||exercise?.loadMode||(bodyweight?'bodyweight':'total'),
      currentExerciseEquipmentId:last?.equipmentId||exercise?.equipmentId||'',
      currentSets:sets.map(displaySet),
      currentExerciseSets:exerciseSetCount(exercise),
      currentMuscleSets:muscleSetCount(source,exercise?.muscle),
      nextSetNumber:(sets.length||0)+1,
      suggestedReps:Number(last?.reps??h?.lastReps??8)||8,
      suggestedWeight:displayWeight(last?.weight??h?.lastWeight??0),
      bodyweight,
      unit:settings().unit,
      history:displayHistory(h),
      summary:summary?clone(summary):null
    };
  }
  function addManualExercisePayload(payload={}){
    const date=payload.date||todayStr();
    const name=String(payload.name||'').trim().replace(/\s+/g,' ');
    if(!name) return {ok:false,reason:'missing-name',message:'Escribi el nombre del ejercicio.'};
    const muscle=String(payload.muscle||'General').trim().replace(/\s+/g,' ')||'General';
    const persistScope=['session','weekday','library'].includes(payload.persistScope)?payload.persistScope:'session';
    const rememberForWeekday=payload.rememberForWeekday===undefined?persistScope==='weekday':!!payload.rememberForWeekday;
    const saveToLibrary=payload.saveToLibrary===undefined?persistScope==='library':!!payload.saveToLibrary;
    const targetDayKey=dayOrder.includes(payload.targetDayKey)?payload.targetDayKey:dayKeyForDate(date);
    const plan=planForDate(date);
    let session=ensureSession(date);
    if(!session){
      session={
        id:uid('workout'),
        date,
        dayKey:plan.dayKey,
        weekday:plan.weekday,
        routine:{dayKey:plan.dayKey,name:`${plan.name} + extra`,muscles:[muscle],exercises:[]},
        startedAt:new Date().toISOString(),
        finishedAt:null,
        status:'en progreso',
        currentExerciseIndex:0,
        exercises:[],
        notes:'Sesion extra creada desde Gym Party.',
        subjectiveNote:'',
        summary:null
      };
    }
    const storedLibrary=libraryData();
    const officialMatch=libraryMatchFor(name,storedLibrary) || libraryMatchFor(name,exerciseLibrary);
    const baseInput={
      name,
      muscle:officialMatch?.group||muscle,
      type:officialMatch?.type||String(payload.type||'personalizado'),
      unit:officialMatch?.unit||String(payload.unit||settings().unit),
      bodyweight:!!payload.bodyweight || officialMatch?.unit==='peso corporal' || !!officialMatch?.bodyweight,
      measurementMode:officialMatch?.measurementMode||payload.measurementMode||(payload.unit==='tiempo'?'time':payload.unit==='distancia'?'distance':'reps'),
      defaultLoadMode:officialMatch?.defaultLoadMode||payload.defaultLoadMode||(payload.bodyweight?'bodyweight':'total'),
      equipmentId:officialMatch?.equipmentId||payload.equipmentId||'',
      notes:String(payload.notes||'Agregado manualmente desde Gym Party.').trim(),
      aliases:safeAliases(payload.aliases),
      primaryMuscles:officialMatch?.primaryMuscles||window.MUSCLE_TAXONOMY?.canonicalizeList?.(payload.primaryMuscles)||[],
      secondaryMuscles:officialMatch?.secondaryMuscles||window.MUSCLE_TAXONOMY?.canonicalizeList?.(payload.secondaryMuscles)||[],
      classificationStatus:officialMatch?.classificationStatus||(payload.primaryMuscles?.length?'confirmed':undefined),
      classificationSource:officialMatch?.classificationSource||officialMatch?.muscleClassificationSource||(payload.primaryMuscles?.length?'user-confirmed':'legacy-label'),
      classificationConfidence:officialMatch?.classificationConfidence||(payload.primaryMuscles?.length?'high':undefined),
      muscleClassificationConfidence:officialMatch?.muscleClassificationConfidence
    };
    let libraryRecord=officialMatch;
    if(saveToLibrary && !libraryRecord) libraryRecord=addOrReuseLibraryExercise(baseInput).exercise;
    const exerciseId=libraryRecord?.id||stableCustomExerciseId(name,storedLibrary);
    const classification=window.MUSCLE_TAXONOMY?.resolveExercise?.({exercise:{...baseInput,exerciseId,id:exerciseId},definition:libraryRecord})||{primaryMuscles:[baseInput.muscle],secondaryMuscles:[]};
    const candidate={...baseInput,exerciseId,id:exerciseId,aliases:libraryRecord?.aliases||baseInput.aliases,primaryMuscles:[...classification.primaryMuscles],secondaryMuscles:[...classification.secondaryMuscles],muscleTaxonomyVersion:window.MUSCLE_TAXONOMY?.VERSION||1,classificationStatus:classification.classificationStatus,classificationSource:classification.classificationSource,classificationConfidence:classification.classificationConfidence,muscleClassificationNeedsReview:classification.needsReview};
    const existingSession=(session.exercises||[]).find(exercise=>sameExercise(exercise,candidate));
    if(existingSession){
      currentQuickExerciseId=existingSession.id;
      return {ok:true,reused:true,session:clone(session),exercise:clone(existingSession),state:getQuickWorkoutState({date,exerciseId:existingSession.id}),remembered:false,savedToLibrary:!!libraryRecord,message:'Ese ejercicio ya estaba en este entrenamiento.'};
    }
    const exercise=captureMuscleClassification({
      id:`${exerciseId}-${targetDayKey}`,
      exerciseId,
      name,
      muscle:baseInput.muscle,
      type:baseInput.type,
      unit:baseInput.bodyweight?'peso corporal':baseInput.unit,
      bodyweight:baseInput.bodyweight,
      measurementMode:baseInput.measurementMode,
      defaultLoadMode:baseInput.defaultLoadMode,
      equipmentId:baseInput.equipmentId,
      primaryMuscles:[...classification.primaryMuscles],
      secondaryMuscles:[...classification.secondaryMuscles],
      muscleTaxonomyVersion:window.MUSCLE_TAXONOMY?.VERSION||1,
      classificationStatus:classification.classificationStatus,
      classificationSource:classification.classificationSource,
      classificationConfidence:classification.classificationConfidence,
      muscleClassificationNeedsReview:classification.needsReview,
      notes:baseInput.notes,
      order:(session.exercises||[]).length+1,
      sets:[],
      completed:false,
      manual:true
    },libraryRecord,new Date().toISOString());
    session.exercises=session.exercises||[];
    const afterId=String(payload.insertAfterExerciseId||'');
    const inserted=window.WORKOUT_PLAN?.insert?.(session.exercises,exercise,afterId);
    let insertIndex;
    if(inserted){
      session.exercises=inserted.items;
      insertIndex=session.exercises.findIndex(item=>item.id===exercise.id||item.exerciseId===exercise.exerciseId);
    }else{
      const afterIndex=afterId?session.exercises.findIndex(item=>item.id===afterId||item.exerciseId===afterId):-1;
      insertIndex=afterIndex>=0?afterIndex+1:session.exercises.length;
      session.exercises.splice(insertIndex,0,exercise);
      session.exercises.forEach((item,index)=>{item.order=index+1;});
    }
    session.currentExerciseIndex=insertIndex;
    currentQuickExerciseId=exercise.id;
    session.routine=session.routine||{name:plan.name,muscles:[],exercises:[]};
    const muscles=new Set([...(session.routine.muscles||[]),exercise.muscle].filter(Boolean));
    session.routine.muscles=[...muscles];
    session.routine.exercises=session.exercises.map(item=>{
      const copy={...item};
      delete copy.sets;
      delete copy.completed;
      return copy;
    });
    session.summary=sessionSummary(session);
    replaceSession(session);
    let remembered=false;
    if(rememberForWeekday){
      const planValue=weeklyPlan();
      const dayPlan=planValue[targetDayKey]||clone(defaultWeeklyPlan[targetDayKey]);
      if(dayPlan.type==='rest'){
        dayPlan.type='workout';
        dayPlan.message='';
        dayPlan.suggestions=[];
        dayPlan.exercises=[];
      }
      dayPlan.exercises=dayPlan.exercises||[];
      const planExercise={...exercise,id:`${exerciseId}-${targetDayKey}`,order:dayPlan.exercises.length+1};
      delete planExercise.sets;
      delete planExercise.completed;
      delete planExercise.muscleClassificationSnapshot;
      if(!dayPlan.exercises.some(item=>sameExercise(item,planExercise))){
        const insertedPlan=window.WORKOUT_PLAN?.insert?.(dayPlan.exercises,planExercise,afterId);
        if(insertedPlan) dayPlan.exercises=insertedPlan.items;
        else{
          const planAfterIndex=afterId?dayPlan.exercises.findIndex(item=>item.id===afterId||item.exerciseId===afterId):-1;
          dayPlan.exercises.splice(planAfterIndex>=0?planAfterIndex+1:dayPlan.exercises.length,0,planExercise);
          dayPlan.exercises.forEach((item,index)=>{item.order=index+1;});
        }
        dayPlan.muscles=[...new Set([...(dayPlan.muscles||[]),planExercise.muscle].filter(Boolean))];
        planValue[targetDayKey]=dayPlan;
        saveWeeklyPlan(planValue);
      }
      remembered=true;
    }
    const weekday=dayLabels[targetDayKey].toLowerCase();
    const message=remembered
      ? `Agregado al entrenamiento de hoy y recordado para los proximos ${weekday}.`
      : saveToLibrary
        ? 'Agregado al entrenamiento de hoy y guardado en tu biblioteca.'
        : 'Agregado solo a este entrenamiento.';
    return {ok:true,session:clone(session),exercise:clone(exercise),state:getQuickWorkoutState({date,exerciseId:exercise.id}),remembered,savedToLibrary:saveToLibrary||!!officialMatch,message};
  }
  function safeAliases(value){ return Array.isArray(value)?value.map(alias=>String(alias||'').trim()).filter(Boolean):[]; }
  function canonicalSetInput(payload={},exercise={},existing={}){
    const unit=payload.unit||settings().unit;
    const originalWeight=Math.max(0,numeric(payload.originalWeight??payload.weight,0));
    const inputWeightKg=payload.weightCanonical?Math.max(0,numeric(payload.weight,0)):canonicalWeight(payload.weight,unit);
    const inputBarKg=payload.weightCanonical?Math.max(0,numeric(payload.barWeight??payload.barWeightKg,0)):canonicalWeight(payload.barWeight??payload.barWeightKg,unit);
    const measurementMode=equipmentModel()?.measurementMode?.(payload.measurementMode||existing.measurementMode||exercise.measurementMode||'reps')||'reps';
    let loadMode=equipmentModel()?.loadMode?.(payload.loadMode||existing.loadMode||exercise.defaultLoadMode||(payload.bodyweight?'bodyweight':'total'))||'total';
    if(measurementMode==='assistance')loadMode='assistance';
    if(payload.bodyweight&&!payload.loadMode)loadMode=inputWeightKg>0?'addedLoad':'bodyweight';
    const equipmentId=String(payload.equipmentId??existing.equipmentId??exercise.equipmentId??'').trim();
    const selectedProfile=equipmentModel()?.profile?.(equipmentId,readStore(keys.equipmentProfiles,[]));
    const base={
      ...existing,
      reps:measurementMode==='time'||measurementMode==='distance'?0:Math.max(0,numeric(payload.reps,existing.reps||0)),
      measurementMode,
      loadMode,
      weight:loadMode==='assistance'||loadMode==='bodyweight'?0:inputWeightKg,
      weightKg:loadMode==='assistance'||loadMode==='bodyweight'?0:inputWeightKg,
      addedLoadKg:loadMode==='addedLoad'?inputWeightKg:0,
      assistanceKg:loadMode==='assistance'?inputWeightKg:0,
      originalWeight,
      originalUnit:String(payload.originalUnit||(payload.weightCanonical?'kg':unit))==='lb'?'lb':'kg',
      barWeightKg:loadMode==='perSide'?inputBarKg:0,
      equipmentId,
      equipmentName:String(payload.equipmentName??existing.equipmentName??selectedProfile?.name??'').trim(),
      gymName:String(payload.gymName??existing.gymName??'').trim(),
      incrementKg:Math.max(0,numeric(payload.incrementKg,selectedProfile?.incrementKg??existing.incrementKg??.5)),
      laterality:String(payload.laterality||existing.laterality||'bilateral'),
      repsMode:String(payload.repsMode||existing.repsMode||'total'),
      durationSeconds:Math.max(0,Math.round(numeric(payload.durationSeconds,existing.durationSeconds||0))),
      distanceMeters:Math.max(0,numeric(payload.distanceMeters,existing.distanceMeters||0)),
      bodyweight:['bodyweight','addedLoad'].includes(loadMode),
      isBodyweight:['bodyweight','addedLoad'].includes(loadMode),
      setType:payload.setType??existing.setType??'working',
      completed:payload.completed??existing.completed??true,
      excludeFromRecords:payload.excludeFromRecords??existing.excludeFromRecords??false,
      excludeFromProgression:payload.excludeFromProgression??existing.excludeFromProgression??false,
      rir:payload.rir===''||payload.rir===undefined?null:Math.max(0,numeric(payload.rir,0)),
      rpe:payload.rpe===''||payload.rpe===undefined?null:Math.max(0,numeric(payload.rpe,0)),
      note:String(payload.note??existing.note??'').trim()
    };
    return normalizeSet(base,exercise);
  }
  function historicalSetsForExercise(exercise={},excludeSetId=''){
    const canonicalId=String(exercise.exerciseId||exercise.id||'');
    return sessions().flatMap(session=>(session.exercises||[])
      .filter(item=>String(item.exerciseId||item.id||'')===canonicalId)
      .flatMap(item=>(item.sets||[])
        .filter(set=>String(set.id||'')!==String(excludeSetId||''))
        .map(set=>({...set,date:session.date,sessionId:session.id}))));
  }
  function reviewSetCandidate(candidate,exercise,payload={},existing={}){
    const detector=window.WORKOUT_ANOMALY_DETECTOR;
    if(!detector?.analyze)return{ok:true,set:candidate,analysis:null};
    const analysis=detector.analyze({candidate,history:historicalSetsForExercise(exercise,existing.id||payload.setId),exercise});
    if(!analysis.suspicious){
      const clean={...candidate};
      if(clean.anomalyReview?.signature&&clean.anomalyReview.signature!==analysis.signature){
        if(clean.anomalyReview.decision==='exclude-record'&&payload.excludeFromRecords===undefined)clean.excludeFromRecords=false;
        if(['exclude-progression','pending'].includes(clean.anomalyReview.decision)&&payload.excludeFromProgression===undefined){clean.excludeFromRecords=false;clean.excludeFromProgression=false;}
        delete clean.anomalyReview;
      }
      return{ok:true,set:clean,analysis};
    }
    const previousDecision=existing.anomalyReview?.signature===analysis.signature?existing.anomalyReview.decision:'';
    const decision=payload.anomalyDecision||previousDecision;
    if(!detector.DECISIONS.includes(decision))return{ok:false,reason:'confirmation-required',message:'Este dato supera ampliamente tu historial. Confirmalo o corregilo.',analysis};
    return{ok:true,set:detector.applyDecision(candidate,analysis,decision,previousDecision?{now:existing.anomalyReview.detectedAt}:undefined),analysis};
  }
  async function reviewAnomalousSetResult(result={}){
    if(result.reason!=='confirmation-required'||!result.analysis)return null;
    const details=(result.analysis.issues||[]).map(item=>item.title).join('. ');
    return window.APP_CONFIRMATION?.choose?.({
      title:'Revisar este registro',
      message:`Este dato supera ampliamente tu historial. ${details}. Confirmalo o corregilo.`,
      cancelLabel:'Editar',
      options:[
        {value:'confirm',label:'Confirmar y contar',className:'good',description:'Cuenta para records y progresion.'},
        {value:'exclude-record',label:'Guardar sin contar como record',className:'secondary',description:'Conserva la serie y no la usa como record.'},
        {value:'exclude-progression',label:'Guardar fuera de record y progresion',className:'secondary',description:'Conserva la serie sin usarla en records ni recomendaciones.'}
      ]
    })||null;
  }
  function saveQuickSetPayload(payload={}){
    const date=payload.date||todayStr();
    const session=ensureSession(date);
    if(!session) return {ok:false,reason:'rest',message:'Hoy toca descanso. Podés registrar movilidad suave si querés.'};
    currentQuickExerciseId=payload.exerciseId||payload.currentExerciseId||currentQuickExerciseId;
    let exercise=session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId);
    if(!exercise) exercise=currentExercise(session);
    if(!exercise) return {ok:false,reason:'missing-exercise',message:'Elegí un ejercicio para registrar.'};
    const setNumber=Math.max(1,numeric(payload.setNumber,(exercise.sets||[]).length+1));
    const canonical=canonicalSetInput(payload,exercise),review=reviewSetCandidate(canonical,exercise,payload);
    if(!review.ok)return review;
    const set={...review.set,id:uid('set'),setNumber,savedAt:new Date().toISOString()};
    set.volume=Math.round(window.WORKOUT_METRICS?.calculateSetMetrics?.(set,exercise)?.externalLoadVolume??set.reps*set.normalizedTotalKg);
    exercise.sets=exercise.sets||[];
    exercise.sets.push(set);
    recordExercisePreference(session,exercise);
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===exercise.id);
    currentQuickExerciseId=exercise.id;
    session.summary=sessionSummary(session);
    replaceSession(session);
    return {ok:true,session:clone(session),exercise:clone(exercise),set:clone(set),state:getQuickWorkoutState({date,exerciseId:exercise.id})};
  }
  function updateQuickSetPayload(payload={}){
    const date=payload.date||todayStr();
    const session=activeSession(date) || latestSessionForDate(date);
    if(!session) return {ok:false,reason:'missing-session',message:'Todavia no hay entrenamiento iniciado.'};
    currentQuickExerciseId=payload.exerciseId||payload.currentExerciseId||currentQuickExerciseId;
    const exercise=session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId) || currentExercise(session);
    if(!exercise) return {ok:false,reason:'missing-exercise',message:'Elegi un ejercicio.'};
    const sets=exercise.sets||[];
    const setId=String(payload.setId||'');
    const setNumber=Number(payload.setNumber);
    const set=(setId?sets.find(item=>String(item.id||'')===setId):null) || (Number.isFinite(setNumber)?sets.find(item=>Number(item.setNumber)===setNumber):null);
    if(!set) return {ok:false,reason:'missing-set',message:'No encontre esa serie.'};
    const canonical=canonicalSetInput(payload,exercise,set),review=reviewSetCandidate(canonical,exercise,payload,set);
    if(!review.ok)return review;
    Object.keys(set).forEach(key=>{if(!(key in review.set))delete set[key];});
    Object.assign(set,review.set);
    set.volume=Math.round(window.WORKOUT_METRICS?.calculateSetMetrics?.(set,exercise)?.externalLoadVolume??set.reps*set.normalizedTotalKg);
    set.editedAt=new Date().toISOString();
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===exercise.id);
    currentQuickExerciseId=exercise.id;
    session.summary=sessionSummary(session);
    replaceSession(session);
    return {ok:true,session:clone(session),exercise:clone(exercise),set:clone(set),state:getQuickWorkoutState({date,exerciseId:exercise.id})};
  }
  function deleteQuickSetPayload(payload={}){
    const date=payload.date||todayStr();
    const session=activeSession(date) || latestSessionForDate(date);
    if(!session) return {ok:false,reason:'missing-session',message:'Todavia no hay entrenamiento iniciado.'};
    currentQuickExerciseId=payload.exerciseId||payload.currentExerciseId||currentQuickExerciseId;
    const exercise=session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId) || currentExercise(session);
    if(!exercise) return {ok:false,reason:'missing-exercise',message:'Elegi un ejercicio.'};
    const before=exercise.sets||[];
    const setId=String(payload.setId||'');
    const setNumber=Number(payload.setNumber);
    const deletedIndex=before.findIndex(item=>(setId&&String(item.id||'')===setId)||(Number.isFinite(setNumber)&&Number(item.setNumber)===setNumber));
    const deletedSet=deletedIndex>=0?before[deletedIndex]:null;
    const next=before.filter(item=>!((setId && String(item.id||'')===setId) || (Number.isFinite(setNumber) && Number(item.setNumber)===setNumber)));
    if(next.length===before.length) return {ok:false,reason:'missing-set',message:'No encontre esa serie.'};
    lastDeletedQuickSet={date,sessionId:session.id,exerciseId:exercise.id||exercise.exerciseId,set:clone(deletedSet),index:deletedIndex};
    exercise.sets=next.map((set,index)=>({...set,setNumber:index+1}));
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===exercise.id);
    currentQuickExerciseId=exercise.id;
    session.summary=sessionSummary(session);
    replaceSession(session);
    return {ok:true,session:clone(session),exercise:clone(exercise),state:getQuickWorkoutState({date,exerciseId:exercise.id})};
  }
  function undoDeleteQuickSetPayload(){
    const deleted=lastDeletedQuickSet;
    if(!deleted) return {ok:false,reason:'nothing-to-undo',message:'No hay una eliminación reciente para deshacer.'};
    const session=sessions().find(item=>item.id===deleted.sessionId)||(activeSession(deleted.date)||latestSessionForDate(deleted.date));
    const exercise=session?.exercises?.find(item=>item.id===deleted.exerciseId||item.exerciseId===deleted.exerciseId);
    if(!session||!exercise) return {ok:false,reason:'missing-session',message:'No se pudo restaurar esa serie.'};
    exercise.sets=exercise.sets||[];
    if(!exercise.sets.some(set=>set.id===deleted.set.id)) exercise.sets.splice(Math.max(0,Math.min(deleted.index,exercise.sets.length)),0,clone(deleted.set));
    exercise.sets=exercise.sets.map((set,index)=>({...set,setNumber:index+1}));
    session.summary=sessionSummary(session);currentQuickExerciseId=exercise.id;replaceSession(session);lastDeletedQuickSet=null;
    return {ok:true,session:clone(session),exercise:clone(exercise),state:getQuickWorkoutState({date:session.date,exerciseId:exercise.id})};
  }
  function completeQuickExercisePayload(payload={}){
    const date=payload.date||todayStr();
    const session=ensureSession(date);
    if(!session) return {ok:false,reason:'rest',message:'Hoy toca descanso.'};
    currentQuickExerciseId=payload.exerciseId||payload.currentExerciseId||currentQuickExerciseId;
    const exercise=session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId) || currentExercise(session);
    if(!exercise) return {ok:false,reason:'missing-exercise',message:'Elegí un ejercicio.'};
    exercise.completed=true;
    const next=session.exercises.find(x=>!x.completed);
    if(next){session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===next.id);currentQuickExerciseId=next.id;}
    session.summary=sessionSummary(session);
    replaceSession(session);
    return {ok:true,session:clone(session),exercise:clone(exercise),state:getQuickWorkoutState({date,exerciseId:currentQuickExerciseId})};
  }
  function finishWorkoutPayload(payload={}){
    const date=payload.date||todayStr();
    const session=activeSession(date) || latestSessionForDate(date);
    if(!session) return {ok:false,reason:'missing-session',message:'Todavía no hay entrenamiento iniciado.'};
    session.status='finalizado';
    session.finishedAt=new Date().toISOString();
    session.summary=sessionSummary(session);
    replaceSession(session);
    return {ok:true,session:clone(session),state:getQuickWorkoutState({date})};
  }
  async function saveQuickSet(){
    const session=selectedSessionForQuick();
    if(!session){ flash('Hoy toca descanso. Podés registrar movilidad suave si querés.'); return; }
    const exercise=selectedQuickExercise(session);
    if(!exercise){ flash('Elegí un ejercicio para registrar.'); return; }
    const payload={date:session.date,exerciseId:exercise.id,setNumber:document.getElementById('quickSetNumber').value,reps:document.getElementById('quickReps').value,weight:document.getElementById('quickWeight').value,durationSeconds:document.getElementById('quickDurationSeconds').value,distanceMeters:document.getElementById('quickDistanceMeters').value,measurementMode:document.getElementById('quickMeasurementMode').value,loadMode:document.getElementById('quickLoadMode').value,equipmentId:document.getElementById('quickEquipmentId').value,equipmentName:document.getElementById('quickEquipmentName').value,barWeight:document.getElementById('quickBarWeight').value,laterality:document.getElementById('quickLaterality').value,setType:document.getElementById('quickSetType').value,bodyweight:document.getElementById('quickBodyweight').checked,rir:document.getElementById('quickRir').value,rpe:document.getElementById('quickRpe').value,note:document.getElementById('quickNote').value};
    const savedDraftId=quickPersistentDraftId(exercise.id,session.date,editingQuickSetId||'new');
    const persist=nextPayload=>editingQuickSetId?updateQuickSetPayload({...nextPayload,setId:editingQuickSetId}):saveQuickSetPayload(nextPayload);
    let result=persist(payload);
    if(result.reason==='confirmation-required'){
      const decision=await reviewAnomalousSetResult(result);
      if(!decision){document.getElementById(result.analysis?.issues?.some(item=>item.code==='reps-improbable')?'quickReps':'quickWeight')?.focus();return;}
      result=persist({...payload,anomalyDecision:decision});
    }
    if(!result.ok){flash(result.message||'No se pudo guardar la serie.');return;}
    window.APP_DRAFTS?.remove?.(savedDraftId);
    const wasEditing=!!editingQuickSetId;editingQuickSetId='';quickFormDirty=false;
    quickDrafts.set(quickDraftKey(exercise.id),{setNumber:(result.exercise.sets?.length||0)+1,reps:payload.reps,weight:payload.weight,durationSeconds:payload.durationSeconds,distanceMeters:payload.distanceMeters,measurementMode:payload.measurementMode,loadMode:payload.loadMode,equipmentId:payload.equipmentId,equipmentName:payload.equipmentName,barWeight:payload.barWeight,laterality:payload.laterality,setType:payload.setType,rir:payload.rir,rpe:payload.rpe,note:'',bodyweight:payload.bodyweight});
    renderGym();
    hapticFeedback();startRestTimer();
    flash(wasEditing?'Serie actualizada.':'Serie guardada. Registrar ya es progreso.');
  }
  function repeatLastSet(){
    const session=selectedSessionForQuick(),exercise=selectedQuickExercise(session);
    const last=exercise?.sets?.slice().reverse().find(set=>setModel()?.countsForProgression?.(set)??true) || exercise?.sets?.slice(-1)[0] || history()[exercise?.exerciseId] || null;
    if(!last){ flash('Todavía no hay una serie anterior para repetir.'); return; }
    document.getElementById('quickReps').value=last.reps||last.lastReps||8;
    const normalized=normalizeSet(last,exercise||{});
    document.getElementById('quickWeight').value=displayWeight(normalized.loadMode==='assistance'?normalized.assistanceKg:(normalized.weightKg??last.lastWeight??0));
    document.getElementById('quickDurationSeconds').value=normalized.durationSeconds||60;
    document.getElementById('quickDistanceMeters').value=normalized.distanceMeters||1000;
    document.getElementById('quickMeasurementMode').value=normalized.measurementMode||'reps';
    document.getElementById('quickLoadMode').value=normalized.loadMode||'total';
    document.getElementById('quickEquipmentId').value=normalized.equipmentId||'unspecified';
    document.getElementById('quickEquipmentName').value=normalized.equipmentName||'';
    document.getElementById('quickBarWeight').value=displayWeight(normalized.barWeightKg||0);
    document.getElementById('quickLaterality').value=normalized.laterality||'bilateral';
    document.getElementById('quickSetType').value=normalized.setType;
    if(last.rir!==undefined && last.rir!==null) document.getElementById('quickRir').value=last.rir;
    document.getElementById('quickBodyweight').checked=!!last.bodyweight;
    updateQuickModeFields({capture:false});
    captureQuickDraft();
  }
  function adjustQuickInput(target,delta){
    const id=target==='reps'?'quickReps':'quickWeight',input=document.getElementById(id);if(!input)return;
    const value=Math.max(0,numeric(input.value,0)+numeric(delta,0));input.value=target==='reps'?Math.round(value):Math.round(value*2)/2;captureQuickDraft();input.focus();
  }
  async function handleQuickLoggerAction(event){
    const adjust=event.target.closest('[data-quick-adjust]');
    if(adjust){const [target,delta]=adjust.dataset.quickAdjust.split(':');adjustQuickInput(target,delta);return;}
    const edit=event.target.closest('[data-quick-edit-set]');
    if(edit){window.APP_DRAFTS?.remove?.(quickPersistentDraftId());editingQuickSetId=edit.dataset.quickEditSet;quickFormDirty=false;quickDrafts.delete(quickDraftKey());renderQuickLogger();document.getElementById('quickReps')?.focus();return;}
    const remove=event.target.closest('[data-quick-delete-set]');
    if(remove){
      const confirmed=await window.APP_CONFIRMATION.ask({title:'Eliminar serie',message:'La serie se quitará del entrenamiento. Podés deshacerla enseguida.',confirmLabel:'Eliminar',danger:true});
      if(!confirmed)return;
      const result=deleteQuickSetPayload({date:todayStr(),exerciseId:currentQuickExerciseId,setId:remove.dataset.quickDeleteSet});
      if(result.ok){if(editingQuickSetId===remove.dataset.quickDeleteSet)editingQuickSetId='';renderGym();flash('Serie eliminada. Podés deshacerla.');}
    }
  }
  function undoDeletedQuickSet(){
    const result=undoDeleteQuickSetPayload();if(!result.ok){flash(result.message);return;}renderGym();flash('Serie restaurada.');
  }
  function nextExercise(){
    const session=selectedSessionForQuick(); if(!session) return;
    const current=selectedQuickExercise(session),index=session.exercises.findIndex(x=>x.id===current?.id);
    const next=session.exercises[Math.min(session.exercises.length-1,index+1)];
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===next.id);
    currentQuickExerciseId=next.id;
    replaceSession(session);
    renderGym();
  }
  function previousExercise(){
    const session=selectedSessionForQuick(); if(!session) return;
    const current=selectedQuickExercise(session),index=session.exercises.findIndex(x=>x.id===current?.id);
    const previous=session.exercises[Math.max(0,index-1)];
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===previous.id);
    currentQuickExerciseId=previous.id;
    replaceSession(session);
    renderGym();
  }
  function completeCurrentExercise(){
    const session=selectedSessionForQuick(),exercise=selectedQuickExercise(session);
    if(!session||!exercise) return;
    exercise.completed=true;
    const next=session.exercises.find(x=>!x.completed);
    if(next){session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===next.id);currentQuickExerciseId=next.id;}
    session.summary=sessionSummary(session);
    replaceSession(session);
    renderGym();
    flash('Ejercicio completado. Técnica antes que carga.');
  }
  async function finishWorkout(){
    const session=selectedSessionForQuick(); if(!session) return;
    const confirmed=await window.APP_CONFIRMATION.ask({title:'Finalizar entrenamiento',message:'Las series seguirán disponibles para consultar y editar.',confirmLabel:'Finalizar'});
    if(!confirmed)return;
    session.status='finalizado';
    session.finishedAt=new Date().toISOString();
    session.summary=sessionSummary(session);
    replaceSession(session);
    renderGym();
    flash('Entrenamiento finalizado y guardado.');
  }
  function renderSettings(){
    const s=settings();
    const widget=document.getElementById('gymWidgetEnabled'),rir=document.getElementById('gymShowRir'),unit=document.getElementById('gymUnit'),mode=document.getElementById('gymMode'),rest=document.getElementById('gymShowRestDays');
    if(widget) widget.checked=!!s.widgetEnabled;
    if(rir) rir.checked=!!s.showRir;
    if(unit) unit.value=s.unit;
    if(mode) mode.value=s.mode;
    if(rest) rest.checked=!!s.showRestDays;
    const timer=document.getElementById('gymRestTimerEnabled'),seconds=document.getElementById('gymRestSeconds'),haptic=document.getElementById('gymHapticEnabled');
    if(timer)timer.checked=!!s.restTimerEnabled;if(seconds)seconds.value=Math.max(15,Number(s.restSeconds)||90);if(haptic)haptic.checked=!!s.hapticEnabled;
    renderWorkoutQuickAccessStatus();
  }
  function saveSettingsFromUi(){
    saveSettings({widgetEnabled:document.getElementById('gymWidgetEnabled').checked,showRir:document.getElementById('gymShowRir').checked,unit:document.getElementById('gymUnit').value,mode:document.getElementById('gymMode').value,showRestDays:document.getElementById('gymShowRestDays').checked,restTimerEnabled:document.getElementById('gymRestTimerEnabled').checked,restSeconds:Math.max(15,numeric(document.getElementById('gymRestSeconds').value,90)),hapticEnabled:document.getElementById('gymHapticEnabled').checked});
    renderQuickLogger();
  }
  function nativeBridgeJson(method,...args){
    try{
      const fn=window.AndroidBridge?.[method];
      if(typeof fn!=='function')return null;
      const raw=fn.apply(window.AndroidBridge,args);
      return typeof raw==='string'?JSON.parse(raw):raw;
    }catch(error){return null;}
  }
  function enableNativeWorkoutFeatures({notification=false}={}){
    window.APP_FEATURE_FLAGS?.set?.({nativeWorkoutControlsV1:true,nativeRestTimer:true,lockScreenWorkoutControls:notification});
    saveSettings({widgetEnabled:true,showWorkoutOnLockScreen:notification||settings().showWorkoutOnLockScreen!==false});
    syncWorkoutWidget();
  }
  function requestWorkoutWidgetInstall(){
    if(!window.AndroidBridge?.requestPinWorkoutWidget){
      flash('El widget requiere instalar el APK Android.');
      return;
    }
    enableNativeWorkoutFeatures();
    const result=nativeBridgeJson('requestPinWorkoutWidget');
    if(result?.code==='pin-requested')flash('Confirmá Agregar en la pantalla del sistema.');
    else if(result?.code==='manual-install-required')flash('Tu launcher requiere agregar el widget manualmente.');
    else flash('No se pudo abrir el selector. Podés agregarlo desde Widgets.');
    window.setTimeout(renderWorkoutQuickAccessStatus,500);
  }
  function enableNativeWorkoutControls(){
    if(!window.AndroidBridge?.requestWorkoutNotificationPermission){
      flash('Los controles de pantalla de bloqueo requieren el APK Android.');
      return;
    }
    const currentStatus=nativeBridgeJson('getWorkoutWidgetStatus');
    const capabilities=nativeBridgeJson('getWorkoutQuickAccessCapabilities');
    const permission=capabilities?.notificationPermission||'';
    if((['not-posted','active'].includes(currentStatus?.notificationCode)||currentStatus?.notificationCode==='permission-required'&&['blocked','denied'].includes(permission))&&window.AndroidBridge?.openWorkoutNotificationSettings){
      nativeBridgeJson('openWorkoutNotificationSettings');
      flash('Revisá que Controles de entrenamiento pueda mostrarse en la pantalla de bloqueo.');
      return;
    }
    enableNativeWorkoutFeatures({notification:true});
    const state=window.AndroidBridge.requestWorkoutNotificationPermission();
    if(state==='granted')flash('Controles activados para la sesión en curso.');
    else if(state==='requested')flash('Permití las notificaciones para ver los controles mientras entrenás.');
    else if(state==='settings-opened')flash('Activá las notificaciones de Protocolo 0→100 y volvé a la app.');
    else flash('Activá las notificaciones de Protocolo 0→100 en los ajustes de Android.');
    renderWorkoutQuickAccessStatus();
  }
  function renderWorkoutQuickAccessStatus(){
    const widgetStatus=document.getElementById('workoutWidgetInstallStatus');
    const lockStatus=document.getElementById('workoutLockScreenStatus');
    const overall=document.getElementById('workoutQuickAccessState');
    const diagnostic=document.getElementById('workoutQuickAccessDiagnostic');
    const addButton=document.getElementById('addWorkoutWidgetBtn');
    const enableButton=document.getElementById('enableWorkoutControlsBtn');
    const liveBar=document.getElementById('nativeWorkoutLiveBar');
    const liveText=document.getElementById('nativeWorkoutLiveText');
    const liveButton=document.getElementById('nativeWorkoutLiveButton');
    const quickAccessDetails=document.querySelector('details.workoutQuickAccess');
    if(!widgetStatus||!lockStatus||!overall)return;
    const capabilities=nativeBridgeJson('getWorkoutQuickAccessCapabilities');
    const status=nativeBridgeJson('getWorkoutWidgetStatus');
    const enabled=window.APP_FEATURE_FLAGS?.isEnabled?.('nativeWorkoutControlsV1')===true;
    const lockEnabled=window.APP_FEATURE_FLAGS?.isEnabled?.('lockScreenWorkoutControls')===true;
    const setStateDisabled=(button,disabled)=>{
      if(!button)return;
      if(disabled)button.dataset.workoutStateDisabled='true';else delete button.dataset.workoutStateDisabled;
      button.disabled=!!disabled||button.dataset.workoutBusyDisabled==='true';
    };
    if(!capabilities||capabilities.platform!=='android-apk'){
      if(liveBar)liveBar.hidden=true;
      widgetStatus.textContent='No disponible en la versión web. Requiere el APK Android.';
      lockStatus.textContent='Requiere el APK Android. En la web podés registrar desde Gym.';
      overall.textContent='Tus registros web continúan guardándose normalmente.';
      setStateDisabled(addButton,true);
      setStateDisabled(enableButton,true);
      if(diagnostic)diagnostic.textContent='El navegador no ofrece controles Android.';
      return;
    }
    if(liveBar)liveBar.hidden=false;
    const instances=Math.max(0,Number(capabilities.widgetInstances||status?.instances||0));
    widgetStatus.textContent=instances>0?`Widget agregado (${instances}).`:(capabilities.pinWidgetSupported?'Widget no agregado. Podés instalarlo ahora.':'El launcher requiere agregarlo manualmente.');
    if(addButton){setStateDisabled(addButton,instances>0);addButton.textContent=instances>0?'Widget agregado':'Agregar widget';}
    const permission=capabilities.notificationPermission||'unknown';
    const notificationCode=status?.notificationCode||'';
    if(notificationCode==='active')lockStatus.textContent='Notificación activa. Si no aparece al bloquear, revisá su visibilidad en Android.';
    else if(notificationCode==='not-posted')lockStatus.textContent='Android no está mostrando los controles. Revisá el canal de notificaciones.';
    else if(notificationCode==='waiting-for-session')lockStatus.textContent='Controles activados. Iniciá un entrenamiento para que aparezcan.';
    else if(lockEnabled&&permission==='granted')lockStatus.textContent='Controles activados. Iniciá un entrenamiento para que aparezcan.';
    else if(permission==='blocked'||permission==='denied')lockStatus.textContent='Notificaciones desactivadas. Podés habilitarlas desde Ajustes de Android.';
    else lockStatus.textContent='Puede depender de tu versión de Android y del fabricante.';
    if(enableButton){
      const needsNotificationReview=['not-posted','active'].includes(notificationCode);
      setStateDisabled(enableButton,lockEnabled&&permission==='granted'&&!needsNotificationReview);
      enableButton.textContent=notificationCode==='active'?'Configurar bloqueo':notificationCode==='not-posted'?'Revisar notificación':lockEnabled&&permission==='granted'?'Controles activos':'Activar controles';
    }
    if(liveText&&liveButton){
      if(notificationCode==='active'){
        liveText.textContent='Activos. Usá +1 rep, Guardar y Siguiente desde la notificación.';
        liveButton.textContent='Configurar';
      }else if(notificationCode==='not-posted'){
        liveText.textContent='Android está ocultando la notificación.';
        liveButton.textContent='Revisar';
      }else if(permission==='blocked'||permission==='denied'){
        liveText.textContent='Falta permitir las notificaciones.';
        liveButton.textContent='Activar';
      }else if(notificationCode==='waiting-for-session'){
        liveText.textContent='Listos: aparecen al iniciar el entrenamiento.';
        liveButton.textContent='Configurar';
      }else{
        liveText.textContent='Activá el acceso para usarlo con el teléfono bloqueado.';
        liveButton.textContent='Activar';
      }
      setStateDisabled(liveButton,false);
    }
    if(quickAccessDetails&&['disabled','permission-required','not-posted'].includes(notificationCode))quickAccessDetails.open=true;
    const queue=status?.queue||{};
    const pending=Math.max(0,Number(queue.pending||0));
    const rejected=Math.max(0,Number(queue.rejected||0));
    overall.textContent=rejected>0?'Necesita atención. Revisá el diagnóstico.':pending>0?`${pending} cambio${pending===1?'':'s'} pendiente${pending===1?'':'s'} de importar.`:enabled?'Guardado en el dispositivo y listo para registrar.':'Disponible. Activá el widget o los controles cuando vayas a entrenar.';
    if(diagnostic)diagnostic.textContent=`Widget: ${instances} · Pendientes: ${pending} · Permiso: ${permission}.`;
  }
  function planDraftId(dayKey=currentPlanEditorDay){return `gym-routine:${dayKey}`;}
  function capturePlanDraft(){
    const payload={dayKey:currentPlanEditorDay,name:document.getElementById('planEditorName')?.value??'',muscles:document.getElementById('planEditorMuscles')?.value??'',exercises:document.getElementById('planEditorExercises')?.value??'',customName:document.getElementById('planCustomExerciseName')?.value??'',customMuscle:document.getElementById('planCustomExerciseMuscle')?.value??'',customPrimaryMuscles:selectedMuscleChoices('planCustomPrimaryMuscles'),customSecondaryMuscles:selectedMuscleChoices('planCustomSecondaryMuscles')};
    window.APP_DRAFTS?.schedule?.({id:planDraftId(),domain:'gym-routine',payload,ttlMs:30*24*60*60*1000});
  }
  function restorePlanDraft(){
    const id=planDraftId(),draft=window.APP_DRAFTS?.get?.(id);if(!draft?.payload)return false;
    const fields={planEditorName:'name',planEditorMuscles:'muscles',planEditorExercises:'exercises',planCustomExerciseName:'customName',planCustomExerciseMuscle:'customMuscle'};
    Object.entries(fields).forEach(([elementId,key])=>{const element=document.getElementById(elementId);if(element&&draft.payload[key]!==undefined)element.value=draft.payload[key];});
    [['planCustomPrimaryMuscles','customPrimaryMuscles'],['planCustomSecondaryMuscles','customSecondaryMuscles']].forEach(([name,key])=>{const selected=new Set(draft.payload[key]||[]);document.querySelectorAll(`input[name="${name}"]`).forEach(input=>{input.checked=selected.has(input.value);});});
    if(!workoutDraftNotices.has(id)){
      workoutDraftNotices.add(id);
      window.APP_DRAFTS?.announceRestored?.({id,label:`Borrador de rutina de ${dayLabels[currentPlanEditorDay]} restaurado.`,onDiscard:renderPlanEditor});
    }
    return true;
  }
  function renderPlanEditor(){
    if(!planDraftSelectionHydrated){
      const pending=window.APP_DRAFTS?.list?.('gym-routine')?.[0];if(pending?.payload?.dayKey)currentPlanEditorDay=pending.payload.dayKey;planDraftSelectionHydrated=true;
    }
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay]||defaultWeeklyPlan[currentPlanEditorDay];
    const daySelect=document.getElementById('planEditorDay'); if(!daySelect) return;
    daySelect.value=currentPlanEditorDay;
    document.getElementById('planEditorName').value=dayPlan.name||'';
    document.getElementById('planEditorMuscles').value=(dayPlan.muscles||[]).join(' · ');
    document.getElementById('planEditorExercises').value=dayPlan.type==='rest'
      ? [dayPlan.message,...(dayPlan.suggestions||[])].join('\n')
      : (dayPlan.exercises||[]).map(exercise=>`${exercise.muscle} | ${exercise.name}${exercise.bodyweight?' | peso corporal':''}${exercise.notes?' | '+exercise.notes:''}`).join('\n');
    restorePlanDraft();
    renderVisualPlanCards(dayPlan);
    renderPlanLibrarySelect();
    renderExerciseLibraryEditor();
    const undo=document.getElementById('undoPlanExerciseDeleteBtn');
    if(undo) undo.disabled=!lastDeletedPlanExercise||lastDeletedPlanExercise.dayKey!==currentPlanEditorDay;
  }
  function planExerciseDefaults(exercise,index=0){
    const unit=String(exercise.unit||''),measurementMode=exercise.measurementMode||(unit.includes('tiempo')?'time':unit.includes('distancia')?'distance':'reps'),loadMode=exercise.defaultLoadMode||exercise.loadMode||(exercise.bodyweight?'bodyweight':'total');
    return {...exercise,order:index+1,targetSets:Math.max(1,numeric(exercise.targetSets,3)),repsMin:Math.max(0,numeric(exercise.repsMin,8)),repsMax:Math.max(0,numeric(exercise.repsMax,12)),targetRirMin:Math.max(0,numeric(exercise.targetRirMin,1)),targetRirMax:Math.max(0,numeric(exercise.targetRirMax,3)),progressionMode:exercise.progressionMode||defaultProgressionMode(measurementMode,loadMode),incrementKg:Math.max(.5,numeric(exercise.incrementKg,.5)),restSeconds:Math.max(0,numeric(exercise.restSeconds,90)),notes:String(exercise.notes||'')};
  }
  function renderVisualPlanCards(dayPlan){
    const root=document.getElementById('planEditorCards'); if(!root) return;
    if(dayPlan.type==='rest'){
      root.innerHTML=`<div class="emptyState">${escapeHtml(dayPlan.message||'Día de descanso.')}<br>${escapeHtml((dayPlan.suggestions||[]).join(' · '))}</div>`;
      return;
    }
    const rows=(dayPlan.exercises||[]).map(planExerciseDefaults);
    root.innerHTML=rows.length?rows.map((exercise,index)=>`<article class="planExerciseEditorCard" data-plan-exercise-id="${escapeHtml(exercise.id||exercise.exerciseId)}">
      <div class="planExerciseEditorHead">
        <div><strong>${index+1}. ${escapeHtml(exercise.name)}</strong><span>${escapeHtml(exercise.muscle||'General')} · ${escapeHtml(exercise.type||'personalizado')} · ${escapeHtml(exercise.unit||settings().unit)}</span></div>
        <div class="planExerciseActions">
          <button type="button" class="secondary" data-plan-action="up" aria-label="Subir ${escapeHtml(exercise.name)}">Subir</button>
          <button type="button" class="secondary" data-plan-action="down" aria-label="Bajar ${escapeHtml(exercise.name)}">Bajar</button>
          <button type="button" class="secondary" data-plan-action="duplicate" aria-label="Duplicar ${escapeHtml(exercise.name)}">Duplicar</button>
          <button type="button" class="danger" data-plan-action="delete" aria-label="Eliminar ${escapeHtml(exercise.name)}">Eliminar</button>
        </div>
      </div>
      <div class="planExerciseFields">
        <div class="field wide"><label>Nombre</label><input data-plan-field="name" value="${escapeHtml(exercise.name)}"></div>
        <div class="field"><label>Músculo</label><input data-plan-field="muscle" value="${escapeHtml(exercise.muscle||'General')}"></div>
        <div class="field"><label>Tipo</label><select data-plan-field="type">${['máquina','peso libre','polea','peso corporal','movilidad','personalizado'].map(value=>`<option value="${value}" ${exercise.type===value?'selected':''}>${value}</option>`).join('')}</select></div>
        <div class="field"><label>Unidad</label><select data-plan-field="unit"><option value="kg" ${exercise.unit==='kg'?'selected':''}>kg</option><option value="peso corporal" ${exercise.unit==='peso corporal'?'selected':''}>peso corporal</option><option value="tiempo" ${exercise.unit==='tiempo'?'selected':''}>tiempo</option></select></div>
        <label class="check"><input type="checkbox" data-plan-field="bodyweight" ${exercise.bodyweight?'checked':''}><span>Peso corporal</span></label>
        <div class="field"><label>Series objetivo</label><input type="text" inputmode="decimal" data-plan-field="targetSets" value="${exercise.targetSets}"></div>
        <div class="field"><label>Reps mín.</label><input type="text" inputmode="decimal" data-plan-field="repsMin" value="${exercise.repsMin}"></div>
        <div class="field"><label>Reps máx.</label><input type="text" inputmode="decimal" data-plan-field="repsMax" value="${exercise.repsMax}"></div>
        <div class="field"><label>Descanso (s)</label><input type="text" inputmode="decimal" data-plan-field="restSeconds" value="${exercise.restSeconds}"></div>
        <details class="advancedDetails wide"><summary>Progresión</summary><div class="planExerciseFields">
          <div class="field"><label>Método</label><select data-plan-field="progressionMode">${[['doubleProgression','Doble progresión'],['loadProgression','Progresión de carga'],['repProgression','Progresión de reps'],['timeProgression','Progresión de tiempo'],['distanceProgression','Progresión de distancia'],['assistanceReduction','Reducir asistencia'],['maintainTechnique','Mantener técnica']].map(([value,label])=>`<option value="${value}" ${exercise.progressionMode===value?'selected':''}>${label}</option>`).join('')}</select></div>
          <div class="field"><label>RIR mín.</label><input type="text" inputmode="decimal" data-plan-field="targetRirMin" value="${exercise.targetRirMin}"></div>
          <div class="field"><label>RIR máx.</label><input type="text" inputmode="decimal" data-plan-field="targetRirMax" value="${exercise.targetRirMax}"></div>
          <div class="field"><label>Incremento kg</label><input type="text" inputmode="decimal" data-plan-field="incrementKg" value="${exercise.incrementKg}"></div>
        </div></details>
        <div class="field wide"><label>Notas</label><input data-plan-field="notes" value="${escapeHtml(exercise.notes)}" placeholder="Técnica o ajuste"></div>
      </div>
    </article>`).join(''):'<div class="emptyState">Este día no tiene ejercicios. Agregá uno desde la biblioteca o creá uno personalizado.</div>';
  }
  function renderPlanLibrarySelect(){
    const select=document.getElementById('planLibrarySelect'); if(!select) return;
    const preferences=window.WORKOUT_RANKING?.read?.().exercises||{};
    select.innerHTML='<option value="">Elegir ejercicio…</option>'+libraryData().filter(exercise=>!preferences[exercise.id]?.hidden).map(exercise=>`<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)} · ${escapeHtml(exercise.group||'General')}</option>`).join('');
  }
  function exerciseUsageDays(exercise){
    const plan=weeklyPlan();
    return dayOrder.filter(dayKey=>(plan[dayKey]?.exercises||[]).some(item=>sameExercise(item,{id:exercise.id,exerciseId:exercise.id,name:exercise.name,aliases:exercise.aliases}))).map(dayKey=>dayLabels[dayKey]);
  }
  function renderExerciseLibraryEditor(){
    const root=document.getElementById('exerciseLibraryList'); if(!root) return;
    const query=normalizeExerciseName(document.getElementById('exerciseLibrarySearch')?.value||'');
    const filter=document.getElementById('exerciseClassificationFilter')?.value||'all';
    const preferences=window.WORKOUT_RANKING?.read?.().exercises||{};
    const taxonomy=window.MUSCLE_TAXONOMY,all=libraryData(),pending=new Set(taxonomy?.pendingClassifications?.(all).map(item=>item.record.id)||[]),status=document.getElementById('exerciseClassificationStatus');
    if(status){status.dataset.empty=String(!pending.size);status.textContent=pending.size?`${pending.size} ${pending.size===1?'ejercicio necesita':'ejercicios necesitan'} revisar su clasificación. Mientras tanto se agrupa como Otro para no inventar precisión.`:'Todas las clasificaciones personalizadas están revisadas.';}
    const rows=all.filter(exercise=>(filter!=='pending'||pending.has(exercise.id))&&(!query||normalizeExerciseName([exercise.name,...(exercise.aliases||[]),exercise.group,...(exercise.primaryMuscles||[]).map(id=>taxonomy?.label?.(id)||id)].join(' ')).includes(query))).sort((a,b)=>Number(pending.has(b.id))-Number(pending.has(a.id))||a.name.localeCompare(b.name,'es'));
    root.innerHTML=rows.length?rows.map(exercise=>{
      const pref=preferences[exercise.id]||{};
      const days=exerciseUsageDays(exercise);
      const custom=!!(exercise.custom||exercise.origin==='custom')&&!exercise.official;
      const classification=taxonomy?.resolveExercise?.({exercise,definition:exercise})||{primaryMuscles:['other'],secondaryMuscles:[],classificationStatus:'needs-review',classificationConfidence:'unknown',needsReview:true};
      const primary=classification.primaryMuscles.map(id=>taxonomy?.label?.(id)||id).join(', '),secondary=classification.secondaryMuscles.map(id=>taxonomy?.label?.(id)||id).join(', ');
      return `<div class="exerciseLibraryRow" data-library-exercise-id="${escapeHtml(exercise.id)}">
        <div><strong>${escapeHtml(exercise.name)}</strong><span>${escapeHtml(exercise.group||'General')} · ${escapeHtml(exercise.type||'personalizado')} · ${escapeHtml(exercise.unit||'kg')}</span><span>Principal: ${escapeHtml(primary)}${secondary?` · Secundarios: ${escapeHtml(secondary)}`:''}</span>${classification.needsReview?'<span class="exerciseClassificationBadge">Revisar clasificación</span>':''}<span>${days.length?`Se usa: ${escapeHtml(days.join(', '))}`:'No está en la rutina semanal'} · ${pref.lastUsedDate?`último uso ${escapeHtml(pref.lastUsedDate)}`:'sin uso registrado'}</span></div>
        <div class="exerciseLibraryActions">
          <button type="button" class="secondary" data-library-action="favorite">${pref.favorite?'Quitar favorito':'Favorito'}</button>
          <button type="button" class="secondary" data-library-action="hidden">${pref.hidden?'Restaurar':'Ocultar'}</button>
          ${custom?`<button type="button" class="secondary" data-library-action="classify">${classification.needsReview?'Revisar músculos':'Editar músculos'}</button>`:''}
          ${custom?'<button type="button" class="secondary" data-library-action="edit">Editar</button>':''}
        </div>
      </div>`;
    }).join(''):'<div class="emptyState">No hay ejercicios que coincidan con la búsqueda.</div>';
  }
  function setHistoricalClassificationUi(message,{canApply=false,canUndo=!!lastHistoricalClassificationMigration}={}){
    const status=document.getElementById('historicalClassificationStatus');if(status)status.textContent=message;
    const apply=document.getElementById('applyHistoricalClassificationBtn');if(apply)apply.disabled=!canApply;
    const undo=document.getElementById('undoHistoricalClassificationBtn');if(undo)undo.disabled=!canUndo;
  }
  function previewHistoricalClassificationFromUi(){
    const preview=previewHistoricalClassificationMigration();
    setHistoricalClassificationUi(preview.affectedExercises?`${preview.affectedExercises} ejercicio(s) en ${preview.affectedSessions} sesión(es) pueden recibir un snapshot. Todavía no se modificó nada.`:'Todas las sesiones ya tienen una clasificación histórica fija.',{canApply:preview.affectedExercises>0});
  }
  async function applyHistoricalClassificationFromUi(){
    const preview=pendingHistoricalClassificationMigration;if(!preview){previewHistoricalClassificationFromUi();return;}
    const confirmed=await window.APP_CONFIRMATION?.ask?.({title:'Fijar clasificación histórica',message:`Se agregarán snapshots a ${preview.affectedExercises} ejercicio(s) de ${preview.affectedSessions} sesión(es). No se cambiarán series, cargas ni repeticiones.`,confirmLabel:'Aplicar',cancelLabel:'Cancelar'});
    if(!confirmed)return;
    const result=await applyHistoricalClassificationMigration(preview.id);
    if(!result.ok){setHistoricalClassificationUi(result.message||'No se pudo aplicar la migración.',{canApply:result.reason!=='changed-since-preview'});return;}
    setHistoricalClassificationUi(`Clasificación fijada en ${result.affectedExercises} ejercicio(s). Podés deshacer este cambio.`,{canUndo:true});
    flash('Clasificación histórica aplicada.');
  }
  async function undoHistoricalClassificationFromUi(){
    const result=await undoHistoricalClassificationMigration();
    setHistoricalClassificationUi(result.ok?'Se restauró el historial anterior.':'No hay una migración reciente para deshacer.',{canUndo:false});
    if(result.ok)flash('Migración histórica deshecha.');
  }
  async function handleExerciseLibraryAction(event){
    const button=event.target.closest('[data-library-action]'); if(!button) return;
    const row=button.closest('[data-library-exercise-id]'); const id=row?.dataset?.libraryExerciseId; if(!id) return;
    const action=button.dataset.libraryAction,library=libraryData(),exercise=library.find(item=>item.id===id); if(!exercise) return;
    const pref=window.WORKOUT_RANKING?.read?.().exercises?.[id]||{};
    if(action==='favorite') window.WORKOUT_RANKING?.setExercisePreference?.(id,{favorite:!pref.favorite});
    else if(action==='hidden') window.WORKOUT_RANKING?.setExercisePreference?.(id,{hidden:!pref.hidden});
    else if(action==='edit'||action==='classify'){
      if(exercise.official){flash('Los ejercicios oficiales no se sobrescriben. Podés ocultarlos o crear uno personalizado.');return;}
      const taxonomy=window.MUSCLE_TAXONOMY,resolution=taxonomy.resolveExercise({exercise,definition:exercise}),options=taxonomy.definitions({includeOther:true}).map(item=>({value:item.id,label:item.label}));
      const identityFields=action==='edit'?[{name:'name',label:'Nombre',value:exercise.name,required:true},{name:'muscle',label:'Etiqueta de grupo',value:exercise.group||'General',required:true}]:[];
      const values=await window.APP_FORM_DIALOG.ask({title:resolution.needsReview?'Revisar clasificación muscular':'Editar clasificación muscular',message:'Elegí músculos canónicos. Esta edición actualiza la biblioteca y los análisis futuros, pero no reescribe sesiones históricas.',fieldList:[...identityFields,{name:'primaryMuscles',label:'Músculos principales',type:'checkbox-group',options,value:resolution.needsReview?[]:resolution.primaryMuscles,required:true,requiredMessage:'Elegí al menos un músculo principal.'},{name:'secondaryMuscles',label:'Músculos secundarios',type:'checkbox-group',options,value:resolution.secondaryMuscles,hint:'Se muestran por separado y no se suman al total principal.'}]});
      if(!values)return;
      const result=confirmExerciseClassificationPayload({exerciseId:id,name:values.name,group:values.muscle,primaryMuscles:values.primaryMuscles,secondaryMuscles:values.secondaryMuscles});
      if(!result.ok){flash(result.message);return;}
      flash('Clasificación muscular guardada.');
    }
    renderPlanLibrarySelect(); renderExerciseLibraryEditor();
  }
  function savePlanHeader(){
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay]||clone(defaultWeeklyPlan[currentPlanEditorDay]);
    dayPlan.name=document.getElementById('planEditorName')?.value.trim()||dayPlan.name;
    const muscles=(document.getElementById('planEditorMuscles')?.value||'').split(/[·,]/).map(value=>value.trim()).filter(Boolean);
    if(muscles.length) dayPlan.muscles=muscles;
    plan[currentPlanEditorDay]=dayPlan;
    saveWeeklyPlan(plan);
    return dayPlan;
  }
  function updatePlanExerciseFromCard(event){
    const card=event.target.closest('[data-plan-exercise-id]'); if(!card) return;
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay]; if(!dayPlan||dayPlan.type==='rest') return;
    const exercise=dayPlan.exercises.find(item=>(item.id||item.exerciseId)===card.dataset.planExerciseId); if(!exercise) return;
    card.querySelectorAll('[data-plan-field]').forEach(input=>{
      const field=input.dataset.planField;
      if(field==='bodyweight') exercise[field]=input.checked;
      else if(['targetSets','repsMin','repsMax','targetRirMin','targetRirMax','incrementKg','restSeconds'].includes(field))exercise[field]=Math.max(0,numeric(input.value,0));
      else exercise[field]=String(input.value||'').trim();
    });
    exercise.targetSets=Math.max(1,Math.round(exercise.targetSets||1));
    exercise.repsMin=Math.max(0,Math.round(exercise.repsMin||0));
    exercise.repsMax=Math.max(exercise.repsMin||0,exercise.repsMax||0);
    exercise.targetRirMax=Math.max(exercise.targetRirMin||0,exercise.targetRirMax||0);
    exercise.incrementKg=Math.max(.5,exercise.incrementKg||.5);
    if(exercise.bodyweight) exercise.unit='peso corporal';
    dayPlan.muscles=[...new Set(dayPlan.exercises.map(item=>item.muscle).filter(Boolean))];
    plan[currentPlanEditorDay]=dayPlan;
    saveWeeklyPlan(plan);
    const status=document.getElementById('planEditorStatus'); if(status) status.textContent=`Guardado automáticamente: ${exercise.name}.`;
    renderPlanEditor();
  }
  function handlePlanExerciseAction(event){
    const button=event.target.closest('[data-plan-action]'); if(!button) return;
    const card=button.closest('[data-plan-exercise-id]'); if(!card) return;
    const action=button.dataset.planAction,plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay];
    const index=dayPlan?.exercises?.findIndex(item=>(item.id||item.exerciseId)===card.dataset.planExerciseId)??-1; if(index<0) return;
    if(action==='up'&&index>0) [dayPlan.exercises[index-1],dayPlan.exercises[index]]=[dayPlan.exercises[index],dayPlan.exercises[index-1]];
    else if(action==='down'&&index<dayPlan.exercises.length-1) [dayPlan.exercises[index+1],dayPlan.exercises[index]]=[dayPlan.exercises[index],dayPlan.exercises[index+1]];
    else if(action==='duplicate'){
      const copy=clone(dayPlan.exercises[index]);
      copy.id=`${copy.exerciseId||copy.id}-${currentPlanEditorDay}-copy-${Date.now().toString(36)}`;
      copy.name=`${copy.name} (copia)`;
      dayPlan.exercises.splice(index+1,0,copy);
    }else if(action==='delete'){
      lastDeletedPlanExercise={dayKey:currentPlanEditorDay,index,exercise:clone(dayPlan.exercises[index])};
      dayPlan.exercises.splice(index,1);
    }else return;
    dayPlan.exercises.forEach((item,rowIndex)=>{item.order=rowIndex+1;});
    dayPlan.muscles=[...new Set(dayPlan.exercises.map(item=>item.muscle).filter(Boolean))];
    plan[currentPlanEditorDay]=dayPlan; saveWeeklyPlan(plan); renderPlanEditor();
  }
  function addPlanLibraryExercise(){
    const id=document.getElementById('planLibrarySelect')?.value; if(!id){flash('Elegí un ejercicio de la biblioteca.');return;}
    const source=libraryData().find(exercise=>exercise.id===id); if(!source) return;
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay]; if(!dayPlan||dayPlan.type==='rest'){flash('Convertí primero el día de descanso desde la edición avanzada.');return;}
    const measurementMode=source.measurementMode||'reps',defaultLoadMode=source.defaultLoadMode||(source.bodyweight||source.unit==='peso corporal'?'bodyweight':'total');
    const candidate={id:`${source.id}-${currentPlanEditorDay}`,exerciseId:source.id,name:source.name,muscle:source.group||'General',primaryMuscles:[...(source.primaryMuscles||[])],secondaryMuscles:[...(source.secondaryMuscles||[])],muscleTaxonomyVersion:source.muscleTaxonomyVersion||window.MUSCLE_TAXONOMY?.VERSION||1,classificationStatus:source.classificationStatus,classificationSource:source.classificationSource||source.muscleClassificationSource,classificationConfidence:source.classificationConfidence,muscleClassificationConfidence:source.muscleClassificationConfidence,muscleClassificationNeedsReview:!!source.muscleClassificationNeedsReview,type:source.type||'personalizado',unit:source.unit||settings().unit,bodyweight:source.bodyweight||source.unit==='peso corporal',measurementMode,defaultLoadMode,notes:source.notes||'',targetSets:3,repsMin:8,repsMax:12,targetRirMin:1,targetRirMax:3,progressionMode:defaultProgressionMode(measurementMode,defaultLoadMode),incrementKg:source.incrementKg||.5,restSeconds:90};
    if(dayPlan.exercises.some(exercise=>sameExercise(exercise,candidate))){flash('Ese ejercicio ya está en este día.');return;}
    dayPlan.exercises.push(candidate); dayPlan.muscles=[...new Set([...(dayPlan.muscles||[]),candidate.muscle])]; plan[currentPlanEditorDay]=dayPlan; saveWeeklyPlan(plan); renderPlanEditor();
  }
  function createPlanCustomExercise(){
    const name=document.getElementById('planCustomExerciseName')?.value.trim()||''; if(!name){flash('Escribí el nombre del ejercicio personalizado.');return;}
    const muscle=document.getElementById('planCustomExerciseMuscle')?.value.trim()||'General';
    const primaryMuscles=selectedMuscleChoices('planCustomPrimaryMuscles'),secondaryMuscles=selectedMuscleChoices('planCustomSecondaryMuscles');
    const record=addOrReuseLibraryExercise({name,muscle,type:'personalizado',unit:settings().unit,bodyweight:false,notes:'',primaryMuscles,secondaryMuscles,classificationStatus:primaryMuscles.length?'confirmed':'needs-review',classificationSource:primaryMuscles.length?'user-confirmed':'legacy-label',classificationConfidence:primaryMuscles.length?'high':'unknown'}).exercise;
    const select=document.getElementById('planLibrarySelect'); if(select) select.value=record.id;
    addPlanLibraryExercise();
    renderPlanLibrarySelect();renderExerciseLibraryEditor();
  }
  function undoPlanExerciseDelete(){
    if(!lastDeletedPlanExercise||lastDeletedPlanExercise.dayKey!==currentPlanEditorDay) return;
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay];
    dayPlan.exercises.splice(Math.min(lastDeletedPlanExercise.index,dayPlan.exercises.length),0,lastDeletedPlanExercise.exercise);
    dayPlan.exercises.forEach((item,index)=>{item.order=index+1;}); plan[currentPlanEditorDay]=dayPlan; lastDeletedPlanExercise=null; saveWeeklyPlan(plan); renderPlanEditor(); flash('Eliminación deshecha.');
  }
  function savePlanEditorDay(){
    savePlanHeader();
    window.APP_DRAFTS?.remove?.(planDraftId());
    renderPlanEditor();
    flash('Nombre y músculos guardados. Los ejercicios se guardan automáticamente.');
  }
  function applyAdvancedPlanText(){
    const plan=weeklyPlan(),key=currentPlanEditorDay,name=document.getElementById('planEditorName').value.trim()||defaultWeeklyPlan[key].name;
    const muscles=document.getElementById('planEditorMuscles').value.split(/[·,]/).map(x=>x.trim()).filter(Boolean);
    const lines=document.getElementById('planEditorExercises').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if(key==='saturday'||key==='sunday'){
      plan[key]={...plan[key],name,type:'rest',muscles:muscles.length?muscles:['Recuperación'],message:lines[0]||defaultWeeklyPlan[key].message,suggestions:lines.slice(1)};
    }else{
      const exercises=lines.map((line,index)=>{
        const [muscleRaw,nameRaw,flagRaw,notesRaw]=line.split('|').map(x=>x.trim());
        const nameValue=nameRaw||muscleRaw||`Ejercicio ${index+1}`;
        const libraryMatch=libraryMatchFor(nameValue);
        return {id:`custom-${key}-${index+1}`,exerciseId:libraryMatch?.id||`custom-${normalizeText(nameValue).replace(/\s+/g,'-')}`,name:nameValue,muscle:nameRaw?muscleRaw:(libraryMatch?.group||'General'),type:libraryMatch?.type||'personalizado',unit:libraryMatch?.unit||settings().unit,bodyweight:/peso corporal|bodyweight/i.test(flagRaw||''),notes:notesRaw||flagRaw||''};
      });
      plan[key]={dayKey:key,weekday:dayLabels[key],name,type:'workout',muscles:muscles.length?muscles:[...new Set(exercises.map(x=>x.muscle))],exercises};
    }
    saveWeeklyPlan(plan);
    window.APP_DRAFTS?.remove?.(planDraftId(key));
    renderGym();
    flash('Edición avanzada aplicada sin modificar sesiones históricas.');
  }
  function copyPlanDay(){
    const from=document.getElementById('copyPlanFrom').value,to=document.getElementById('copyPlanTo').value;
    if(!from||!to||from===to){ flash('Elegí dos días distintos para copiar.'); return; }
    const plan=weeklyPlan();
    plan[to]={...clone(plan[from]),dayKey:to,weekday:dayLabels[to],name:plan[to]?.name && /[ABC]$/.test(plan[to].name)?plan[to].name:plan[from].name};
    saveWeeklyPlan(plan);
    currentPlanEditorDay=to;
    renderGym();
    flash('Día copiado. Podés editarlo de forma independiente.');
  }
  async function resetDefaultPlan(){
    const confirmed=await window.APP_CONFIRMATION.ask({title:'Restablecer rutina',message:'Se reemplazará la rutina semanal actual por la predeterminada. Tus sesiones guardadas no se borran.',confirmLabel:'Restablecer',danger:true});
    if(!confirmed)return;
    saveWeeklyPlan(clone(defaultWeeklyPlan));
    dayOrder.forEach(dayKey=>window.APP_DRAFTS?.remove?.(planDraftId(dayKey),{silent:true}));
    currentPlanEditorDay='monday';
    renderGym();
    flash('Rutina predeterminada restablecida.');
  }
  function buildWorkoutWidgetState(date=todayStr()){
    const plan=planForDate(date),session=latestSessionForDate(date),summary=session?sessionSummary(session):null;
    const generatedAt=new Date().toISOString(),sourceExercises=session?.exercises?.length?session.exercises:plan.exercises||[],library=libraryData();
    const exercises=sourceExercises.map(exercise=>exercise.muscleClassificationSnapshot?exercise:captureMuscleClassification(exercise,libraryMatchFor(exercise,library),generatedAt));
    const current=currentExercise(session)||exercises.find(x=>!x.completed)||exercises[0]||null;
    const completed=summary?.completedExercises||0,total=exercises.length,totalSets=summary?.totalSets||0,totalVolume=summary?.totalVolume||0;
    const s=settings();
    const restMessage=s.showRestDays ? (plan.message||'Hoy toca descanso') : 'Descanso configurado como oculto en la app';
    const previousState=getLocalData(keys.workoutWidgetState,{})||{};
    const previousQuick=previousState.quickLog||{};
    const currentSets=current?.sets||[];
    const lastSet=currentSets[currentSets.length-1]||null;
    const normalizedLast=normalizeSet(lastSet||{measurementMode:current?.measurementMode||'reps',loadMode:current?.defaultLoadMode||(current?.bodyweight?'bodyweight':'total')},current||{});
    const h=current?.exerciseId ? history()[current.exerciseId] : null;
    const currentId=current?.id||current?.exerciseId||'';
    const quickMatches=previousQuick.currentExerciseId && previousQuick.currentExerciseId===currentId;
    const quickReps=Number(quickMatches?previousQuick.reps:(lastSet?.reps??h?.lastReps??8))||8;
    const quickWeight=Number(quickMatches?previousQuick.weight:displayWeight(lastSet?.weight??h?.lastWeight??0))||0;
    const quickBodyweight=!!(quickMatches?previousQuick.bodyweight:(current?.bodyweight||lastSet?.bodyweight||h?.bodyweight));
    const currentExerciseSets=exerciseSetCount(current);
    const currentMuscleSets=muscleSetCount(exercises,current?.muscle);
    const quickHint=h
      ? `Ultima vez: ${h.name} — ${displayWeight(h.lastWeight,s.unit)} ${s.unit} x ${h.lastReps||0} reps.`
      : 'Ajusta reps/kg y guarda desde el widget.';
    const candidateSet={
      reps:Math.max(0,Math.round(quickReps)),
      weightKg:window.WORKOUT_EQUIPMENT?.kgFromDisplay?.(quickWeight,s.unit)??quickWeight,
      durationSeconds:Math.max(0,Number(quickMatches?previousQuick.durationSeconds:normalizedLast.durationSeconds)||0),
      distanceMeters:Math.max(0,Number(quickMatches?previousQuick.distanceMeters:normalizedLast.distanceMeters)||0),
      bodyweight:quickBodyweight,
      measurementMode:normalizedLast.measurementMode||current?.measurementMode||'reps',
      loadMode:normalizedLast.loadMode||(quickBodyweight?'bodyweight':'total'),
      equipmentId:normalizedLast.equipmentId||current?.equipmentId||'',
      equipmentName:normalizedLast.equipmentName||'',
      barWeightKg:normalizedLast.barWeightKg||0,
      laterality:normalizedLast.laterality||'bilateral',
      repsMode:normalizedLast.repsMode||'total'
    };
    const workoutSessions=sessions();
    const calculateGuidance=(exercise,override=null)=>{
      if(!exercise||!window.WORKOUT_LOAD_GUIDANCE?.calculate)return null;
      const exerciseSets=exercise.sets||[];
      const exerciseLast=exerciseSets.slice().reverse().find(set=>setModel()?.countsForProgression?.(set)??true)||exerciseSets[exerciseSets.length-1]||null;
      const exerciseHistory=exercise.exerciseId?history()[exercise.exerciseId]:null;
      const normalized=normalizeSet(exerciseLast||exerciseHistory?.lastSet||{
        reps:exerciseHistory?.lastReps??8,
        weightKg:exerciseHistory?.lastWeight??0,
        measurementMode:exercise.measurementMode||'reps',
        loadMode:exercise.defaultLoadMode||(exercise.bodyweight?'bodyweight':'total')
      },exercise);
      const comparableCandidate=override||{
        reps:Math.max(0,Number(normalized.reps??exerciseHistory?.lastReps??8)||0),
        weightKg:Math.max(0,Number(normalized.weightKg??exerciseHistory?.lastWeight??0)||0),
        durationSeconds:Math.max(0,Number(normalized.durationSeconds)||0),
        distanceMeters:Math.max(0,Number(normalized.distanceMeters)||0),
        bodyweight:!!(normalized.bodyweight||exercise.bodyweight),
        measurementMode:normalized.measurementMode||exercise.measurementMode||'reps',
        loadMode:normalized.loadMode||exercise.defaultLoadMode||(exercise.bodyweight?'bodyweight':'total'),
        equipmentId:normalized.equipmentId||exercise.equipmentId||'',
        equipmentName:normalized.equipmentName||exercise.equipmentName||'',
        barWeightKg:Math.max(0,Number(normalized.barWeightKg)||0),
        laterality:normalized.laterality||'bilateral',
        repsMode:normalized.repsMode||'total'
      };
      return window.WORKOUT_LOAD_GUIDANCE.calculate({sessions:workoutSessions,exercise,candidateSet:comparableCandidate});
    };
    const guidance=current?calculateGuidance(current,candidateSet):null;
    const exerciseLoadGuidance={};
    exercises.forEach(exercise=>{
      const id=exercise.id||exercise.exerciseId;
      const value=id===currentId?guidance:calculateGuidance(exercise);
      if(!id||!value)return;
      const snapshot={
        lastComparableSet:value.lastComparableSet||null,
        historicalLoadRecord:value.historicalLoadRecord||null,
        loadGuidanceSnapshot:{
          exerciseId:value.exerciseId,
          comparisonKey:value.comparisonKey,
          last:value.lastComparableSet||null,
          record:value.historicalLoadRecord||null,
          recordKind:value.recordKind,
          comparisonLabel:value.comparisonLabel,
          confidence:value.confidence,
          calculatedAt:value.calculatedAt,
          policyVersion:value.policyVersion
        }
      };
      exerciseLoadGuidance[id]=snapshot;
    });
    return {
      schemaVersion:3,
      featureFlags:window.APP_FEATURE_FLAGS?.all?.()||{schemaVersion:1,nativeWorkoutControlsV1:false,lockScreenWorkoutControls:false,nativeRestTimer:false,multiPartyWorkoutSharing:false},
      nativeWorkoutSettings:{
        restSeconds:Math.max(15,Number(s.restSeconds)||90),
        autoStartRestTimer:!!s.restTimerEnabled,
        hapticEnabled:s.hapticEnabled!==false,
        timerVibration:s.hapticEnabled!==false,
        timerSound:!!s.timerSound,
        showWorkoutOnLockScreen:s.showWorkoutOnLockScreen!==false,
        showWeightOnLockScreen:s.showWeightOnLockScreen!==false,
        showRecordOnLockScreen:s.showRecordOnLockScreen!==false,
        lockScreenVisibility:['public','private','hidden'].includes(s.lockScreenVisibility)?s.lockScreenVisibility:'private'
      },
      date,
      dayKey:plan.dayKey,
      weekday:plan.weekday,
      title:`${plan.weekday} — ${plan.name}`,
      routineName:plan.name,
      type:plan.type,
      unit:s.unit,
      muscles:plan.muscles||[],
      message:restMessage,
      suggestions:s.showRestDays?(plan.suggestions||[]):[],
      weeklyWorkoutPlan:weeklyPlan(),
      exercises:exercises.map(x=>({
        id:x.id,
        exerciseId:x.exerciseId,
        name:x.name,
        muscle:x.muscle,
        type:x.type,
        unit:x.unit,
        measurementMode:x.measurementMode||'reps',
        defaultLoadMode:x.defaultLoadMode||(x.bodyweight?'bodyweight':'total'),
        equipmentId:x.equipmentId||'',
        primaryMuscles:[...(x.primaryMuscles||[])],
        secondaryMuscles:[...(x.secondaryMuscles||[])],
        classificationStatus:x.classificationStatus,
        classificationSource:x.classificationSource,
        classificationConfidence:x.classificationConfidence,
        muscleClassificationSnapshot:x.muscleClassificationSnapshot?clone(x.muscleClassificationSnapshot):null,
        completed:!!x.completed,
        setsLogged:x.sets?.length||0,
        sets:(x.sets||[]).map(displaySet),
        bodyweight:!!x.bodyweight
      })),
      currentExerciseId:currentId,
      currentExerciseName:current?.name||'',
      currentExerciseSets,
      currentMuscleSets,
      currentMuscleName:current?.muscle||'',
      lastComparableSet:guidance?.lastComparableSet||null,
      historicalLoadRecord:guidance?.historicalLoadRecord||null,
      loadGuidanceSnapshot:guidance?{
        exerciseId:guidance.exerciseId,
        comparisonKey:guidance.comparisonKey,
        last:guidance.lastComparableSet,
        record:guidance.historicalLoadRecord,
        recordKind:guidance.recordKind,
        comparisonLabel:guidance.comparisonLabel,
        confidence:guidance.confidence,
        calculatedAt:guidance.calculatedAt,
        policyVersion:guidance.policyVersion
      }:null,
      exerciseLoadGuidance,
      quickLog:{
        currentExerciseId:currentId,
        exerciseName:current?.name||'',
        setNumber:(currentSets.length||0)+1,
        reps:Math.max(0,Math.round(quickReps)),
        weight:Math.max(0,Math.round(quickWeight*2)/2),
        durationSeconds:candidateSet.durationSeconds,
        distanceMeters:candidateSet.distanceMeters,
        setType:'working',
        bodyweight:quickBodyweight,
        measurementMode:candidateSet.measurementMode,
        loadMode:candidateSet.loadMode,
        equipmentId:candidateSet.equipmentId,
        equipmentName:candidateSet.equipmentName,
        barWeight:displayWeight(normalizedLast.barWeightKg||0,s.unit),
        barWeightKg:Math.max(0,Number(normalizedLast.barWeightKg)||0),
        laterality:normalizedLast.laterality||'bilateral',
        unit:s.unit,
        weightStep:0.5,
        weightFastStep:5,
        weightAdjustmentStep:[0.5,5].includes(Number(previousQuick.weightAdjustmentStep))?Number(previousQuick.weightAdjustmentStep):0.5,
        currentExerciseSets,
        currentMuscleSets,
        currentMuscleName:current?.muscle||'',
        hintText:quickHint
      },
      workoutSession:session?clone(session):null,
      exerciseHistory:history(),
      progressText:plan.type==='rest'?restMessage:`${completed}/${total} ejercicios · ${totalSets} series · ${Math.round(s.unit==='lb'?totalVolume*LB_PER_KG:totalVolume).toLocaleString()} ${s.unit}`,
      completedExercises:completed,
      totalExercises:total,
      totalSets,
      totalVolume,
      status:session?.status||'sin iniciar',
      lastNativeMutationAt:previousState.lastNativeMutationAt||null,
      lastNativeMutationSource:previousState.lastNativeMutationSource||'',
      lastWidgetActionText:previousState.lastWidgetActionText||quickHint,
      updatedAt:generatedAt
    };
  }
  function syncWorkoutWidget(){
    if(!importingNativeWidgetState) maybeImportWidgetStateFromAndroid();
    const s=settings();
    const state=buildWorkoutWidgetState();
    setLocalData(keys.workoutWidgetState,state);
    if(!s.widgetEnabled) return state;
    try{
      if(window.AndroidBridge?.saveWorkoutWidgetData) window.AndroidBridge.saveWorkoutWidgetData(JSON.stringify(state));
      if(window.AndroidBridge?.updateWorkoutWidget) window.AndroidBridge.updateWorkoutWidget();
    }catch(e){}
    return state;
  }
  function handleAndroidWidgetIntent(action,payload={}){
    maybeImportWidgetStateFromAndroid();
    if(action===actionOpenToday) openGymToday();
    else if(action===actionQuickLog) openQuickSetLogger(payload.exerciseId||payload.currentExerciseId||'');
    else if(action===actionCompleteExercise){openQuickSetLogger(payload.exerciseId||'');completeCurrentExercise();}
    else if(action===actionRefreshWidget){syncWorkoutWidget();openGymToday();}
    else if(action===actionWidgetSaveSet){syncWorkoutWidget();openGymToday();}
  }

  window.WORKOUT_FEATURES={keys,dayOrder,defaultWeeklyPlan:clone(defaultWeeklyPlan),exerciseLibrary:clone(exerciseLibrary),EXERCISE_LIBRARY_VERSION,ready:()=>initializeWorkoutFeatures(),getExerciseLibrary:()=>clone(libraryData()),getPendingMuscleClassifications:()=>clone(pendingMuscleClassifications()),confirmExerciseClassificationPayload,previewHistoricalClassificationMigration,applyHistoricalClassificationMigration,undoHistoricalClassificationMigration,getWeeklyWorkoutPlan:()=>clone(weeklyPlan()),getEquipmentProfiles:()=>clone(equipmentProfiles()),getGymSettings:()=>clone(settings()),updateGymSettings:next=>{saveSettings(next||{});return clone(settings());},displayWeight,canonicalWeight,displayVolume,migrateExerciseLibrary,migrateLegacyGymSessions,dayKeyForDate,planForDate,rankExercisesForContext,getQuickWorkoutState,addManualExercisePayload,saveQuickSetPayload,updateQuickSetPayload,reviewAnomalousSetResult,deleteQuickSetPayload,undoDeleteQuickSetPayload,canUndoQuickSetDelete:()=>!!lastDeletedQuickSet,replaceSessionPayload,completeQuickExercisePayload,finishWorkoutPayload,buildWorkoutWidgetState,syncWorkoutWidget,importWidgetStateFromAndroid,importNativeWorkoutMutationsFromAndroid};
  window.openGymToday=openGymToday;
  window.openQuickSetLogger=openQuickSetLogger;
  window.handleAndroidWidgetIntent=(action,payload)=>handleAndroidWidgetIntent(action,payload||{});
  window.addEventListener?.('native-workout-notification-permission',renderWorkoutQuickAccessStatus);

  const originalRenderGym=renderGym;
  renderGym=function(){ originalRenderGym(); renderWorkoutDashboard(); };
  window.renderGym=renderGym;

  let workoutInitializationPromise=null;
  let workoutStorageInitialized=false;
  function initializeWorkoutFeatures(){
    if(workoutInitializationPromise)return workoutInitializationPromise;
    workoutInitializationPromise=(async()=>{
      if(window.APP_DATA?.isPrimaryDomain?.('workout'))await window.APP_DATA.ready();
      ensureWorkoutData();
      migrateLegacyGymSessions();
      const uiPreferences=readStore('protocolo_0_100_ui_preferences_v1',{});
      if(['kg','lb'].includes(uiPreferences.unit))saveSettings({unit:uiPreferences.unit,showRir:uiPreferences.showRir!==false});
      workoutStorageInitialized=true;
      injectWorkoutUi();
      renderWorkoutDashboard();
      setWorkoutBusy(false);
      return true;
    })().catch(error=>{
      workoutInitializationPromise=null;
      workoutStorageInitialized=true;
      window.APP_ERROR_BOUNDARY?.record?.(error,{area:'workout-initialization'});
      try{ensureWorkoutData();injectWorkoutUi();renderWorkoutDashboard();}catch(fallbackError){window.APP_ERROR_BOUNDARY?.record?.(fallbackError,{area:'workout-local-fallback'});}finally{setWorkoutBusy(false);}
      return false;
    });
    return workoutInitializationPromise;
  }
  injectWorkoutUi();
  setWorkoutBusy(window.APP_DATA?.isPrimaryDomain?.('workout')&&!window.APP_DATA.isPrimaryReady?.('workout'));
  initializeWorkoutFeatures();
})();
