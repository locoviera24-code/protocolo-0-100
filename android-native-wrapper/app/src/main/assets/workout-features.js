(function(){
  'use strict';

  const keys={
    weeklyWorkoutPlan:'protocolo_0_100_weekly_workout_plan_v1',
    workoutSessions:'protocolo_0_100_workout_sessions_v1',
    exerciseHistory:'protocolo_0_100_exercise_history_v1',
    exerciseLibrary:'protocolo_0_100_exercise_library_v1',
    gymSettings:'protocolo_0_100_gym_settings_v1',
    workoutWidgetState:'protocolo_0_100_workout_widget_state_v1'
  };
  const dayOrder=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const dayLabels={monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado',sunday:'Domingo'};
  const actionOpenToday='com.protocolo.cien.ACTION_OPEN_TODAY_WORKOUT';
  const actionQuickLog='com.protocolo.cien.ACTION_QUICK_LOG_SET';
  const actionCompleteExercise='com.protocolo.cien.ACTION_COMPLETE_CURRENT_EXERCISE';
  const actionRefreshWidget='com.protocolo.cien.ACTION_REFRESH_WORKOUT_WIDGET';
  const actionWidgetSaveSet='com.protocolo.cien.ACTION_WIDGET_SAVE_SET';

  const exerciseLibrary=[
    ex('peck-deck','Apertura sentado / Peck deck',['peck deck','apertura sentado','aperturas en máquina'],'Pecho','máquina','kg',['Pecho'],['Deltoides anterior'],'Controlá el recorrido y evitá rebotar.'),
    ex('press-banca','Press de banca',['press banca','banca'],'Pecho','peso libre','kg',['Pecho'],['Tríceps','Hombro anterior'],'Priorizar técnica antes que carga.'),
    ex('dominadas','Dominadas',['dominada','pull up'],'Espalda','peso corporal','peso corporal',['Dorsal','Espalda'],['Bíceps'],'Registrá reps sin kilos o agregá lastre si corresponde.'),
    ex('jalon-pecho-sentado','Jalón al pecho sentado',['jalón','jalon al pecho','polea alta'],'Espalda','polea','kg',['Dorsal','Espalda'],['Bíceps'],'Bajá con control y sin tirar con impulso.'),
    ex('laterales-polea','Elevaciones laterales en polea',['laterales polea','elevaciones laterales'],'Hombro','polea','kg',['Deltoides lateral'],['Trapecio'],'Carga moderada y recorrido estable.'),
    ex('press-militar-maquina','Press militar en máquina',['press militar máquina','press hombro maquina'],'Hombro','máquina','kg',['Hombro'],['Tríceps'],'Mantené espalda apoyada y rango cómodo.'),
    ex('curl-martillo','Curl martillo',['martillo'],'Bíceps','peso libre','kg',['Bíceps','Braquial'],['Antebrazo'],'Codos quietos y muñeca neutral.'),
    ex('curl-barra-z-sentado','Curl con barra Z sentado',['curl z sentado','barra z'],'Bíceps','peso libre','kg',['Bíceps'],['Antebrazo'],'Evitá balanceo; repetición limpia.'),
    ex('extension-triceps-polea','Extensión de tríceps en polea',['triceps polea','extensión tríceps'],'Tríceps','polea','kg',['Tríceps'],[],'Separá hombros de orejas y extendé con control.'),
    ex('prensa','Prensa',['prensa piernas'],'Cuádriceps / pierna','máquina','kg',['Cuádriceps','Glúteos'],['Isquiotibiales'],'No bloquees rodillas con violencia.'),
    ex('extension-cuadriceps','Extensión de cuádriceps',['cuadriceps máquina','extensión pierna'],'Cuádriceps / pierna','máquina','kg',['Cuádriceps'],[],'Pausa arriba si no molesta la rodilla.'),
    ex('aductores-maquina','Máquina de aductores, cerrar piernas',['aductores','cerrar piernas'],'Aductores','máquina','kg',['Aductores'],[],'Cerrar las piernas contra resistencia, sin impulso.'),
    ex('pantorrillas-sentado','Elevación de pantorrillas sentado',['pantorrilla sentado','gemelos sentado'],'Pantorrillas','máquina','kg',['Sóleo','Pantorrillas'],[],'Recorrido completo y pausa breve arriba.'),
    ex('tibial-anterior','Elevación de punta del pie / tibial anterior',['tibial anterior','punta del pie'],'Tibial anterior','máquina','kg',['Tibial anterior'],[],'Elevar la punta del pie para levantar la carga.'),
    ex('remo-polea','Remo en polea',['remo sentado'],'Espalda','polea','kg',['Espalda'],['Bíceps'],'Tirón controlado hacia el torso.'),
    ex('sentadilla','Sentadilla',['squat'],'Cuádriceps / pierna','peso libre','kg',['Cuádriceps','Glúteos'],['Core'],'Rango seguro según movilidad.'),
    ex('peso-muerto-rumano','Peso muerto rumano',['rumano'],'Isquiotibiales','peso libre','kg',['Isquiotibiales','Glúteos'],['Espalda baja'],'Bisagra de cadera y espalda neutra.'),
    ex('movilidad-suave','Movilidad suave',['movilidad','estiramiento'],'Movilidad','movilidad','tiempo',['Movilidad'],[],'Recuperación también cuenta.')
  ];

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
  let importingNativeWidgetState=false;

  function ex(id,name,aliases,muscle,type,unit,primary,secondary,notes){
    return {id,name,aliases,group:muscle,type,unit,primaryMuscles:primary,secondaryMuscles:secondary,notes};
  }
  function item(exerciseId,muscle,bodyweight=false,notes=''){
    const exercise=exerciseLibrary.find(x=>x.id===exerciseId);
    return {id:`${exerciseId}-${muscle.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,exerciseId,name:exercise?.name||exerciseId,muscle,type:exercise?.type||'máquina',unit:exercise?.unit||'kg',bodyweight:!!bodyweight,notes};
  }
  function day(key,name,muscles,exercises){
    return {dayKey:key,weekday:dayLabels[key],name,type:'workout',muscles:[...muscles],exercises:exercises.map(x=>({...x}))};
  }
  function restDay(key,name,message,suggestions){
    return {dayKey:key,weekday:dayLabels[key],name,type:'rest',muscles:['Recuperación'],message,suggestions:[...suggestions],exercises:[]};
  }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function normalizeText(value){ return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function dateFromString(value){ const [y,m,d]=String(value||todayStr()).split('-').map(Number); return new Date(y,m-1,d); }
  function dayKeyForDate(dateString=todayStr()){
    const jsDay=dateFromString(dateString).getDay();
    return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][jsDay];
  }
  function settings(){
    return {...{widgetEnabled:true,showRir:true,unit:'kg',mode:'simple',showRestDays:true},...getLocalData(keys.gymSettings,{})};
  }
  function saveSettings(next){
    setLocalData(keys.gymSettings,{...settings(),...next});
    syncWorkoutWidget();
  }
  function ensureWorkoutData(){
    if(!localStorage.getItem(keys.weeklyWorkoutPlan)) setLocalData(keys.weeklyWorkoutPlan,clone(defaultWeeklyPlan));
    if(!localStorage.getItem(keys.exerciseLibrary)) setLocalData(keys.exerciseLibrary,clone(exerciseLibrary));
    if(!localStorage.getItem(keys.exerciseHistory)) setLocalData(keys.exerciseHistory,{});
    if(!localStorage.getItem(keys.workoutSessions)) setLocalData(keys.workoutSessions,[]);
    if(!localStorage.getItem(keys.gymSettings)) setLocalData(keys.gymSettings,settings());
  }
  function weeklyPlan(){ return getLocalData(keys.weeklyWorkoutPlan,clone(defaultWeeklyPlan)); }
  function saveWeeklyPlan(plan){ setLocalData(keys.weeklyWorkoutPlan,plan); syncWorkoutWidget(); }
  function planForDate(date=todayStr()){ return weeklyPlan()[dayKeyForDate(date)] || defaultWeeklyPlan[dayKeyForDate(date)]; }
  function sessions(){ return getLocalData(keys.workoutSessions,[]); }
  function saveSessions(value){ setLocalData(keys.workoutSessions,value); }
  function history(){ return getLocalData(keys.exerciseHistory,{}); }
  function saveHistory(value){ setLocalData(keys.exerciseHistory,value); }
  function maybeImportWidgetStateFromAndroid(){
    if(importingNativeWidgetState) return false;
    if(!window.AndroidBridge || typeof window.AndroidBridge.getWorkoutWidgetData!=='function') return false;
    try{
      const raw=window.AndroidBridge.getWorkoutWidgetData();
      if(!raw) return false;
      return importWidgetStateFromAndroid(JSON.parse(raw));
    }catch(e){
      return false;
    }
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
        const session=state.workoutSession;
        const list=sessions();
        const index=list.findIndex(item=>item.id===session.id);
        if(index>=0) list[index]=session; else list.push(session);
        saveSessions(list);
        syncLegacyGymSession(session);
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
  function ensureSession(date=todayStr()){
    const existing=activeSession(date);
    if(existing) return existing;
    const plan=planForDate(date);
    if(plan.type==='rest') return null;
    const created={
      id:uid('workout'),
      date,
      dayKey:plan.dayKey,
      weekday:plan.weekday,
      routine:{dayKey:plan.dayKey,name:plan.name,muscles:plan.muscles,exercises:clone(plan.exercises)},
      startedAt:new Date().toISOString(),
      finishedAt:null,
      status:'en progreso',
      currentExerciseIndex:0,
      exercises:plan.exercises.map((exercise,index)=>({...exercise,order:index+1,sets:[],completed:false})),
      notes:'',
      subjectiveNote:'',
      summary:null
    };
    const list=sessions();
    list.push(created);
    saveSessions(list);
    syncLegacyGymSession(created);
    return created;
  }
  function replaceSession(session){
    const list=sessions();
    const index=list.findIndex(s=>s.id===session.id);
    if(index>=0) list[index]=session; else list.push(session);
    saveSessions(list);
    syncLegacyGymSession(session);
    updateExerciseHistory(session);
    syncWorkoutWidget();
  }
  function currentExercise(session){
    if(!session || !session.exercises?.length) return null;
    const byId=currentQuickExerciseId ? session.exercises.find(x=>x.id===currentQuickExerciseId || x.exerciseId===currentQuickExerciseId) : null;
    if(byId) return byId;
    return session.exercises[Math.min(session.currentExerciseIndex||0,session.exercises.length-1)] || session.exercises.find(x=>!x.completed) || session.exercises[0];
  }
  function exerciseVolume(exercise){ return (exercise.sets||[]).reduce((sum,set)=>sum+(Number(set.reps)||0)*(Number(set.weight)||0),0); }
  function exerciseSetCount(exercise){ return exercise?.sets?.length||0; }
  function muscleSetCount(exercises,muscle){
    return (exercises||[]).filter(exercise=>exercise.muscle===muscle).reduce((sum,exercise)=>sum+exerciseSetCount(exercise),0);
  }
  function sessionSummary(session){
    const exercises=session.exercises||[];
    const allSets=exercises.flatMap(e=>(e.sets||[]).map(set=>({...set,exerciseName:e.name,exerciseId:e.exerciseId})));
    const totalVolume=allSets.reduce((sum,set)=>sum+(Number(set.reps)||0)*(Number(set.weight)||0),0);
    const start=session.startedAt?new Date(session.startedAt):null,finish=session.finishedAt?new Date(session.finishedAt):new Date();
    const duration=start?Math.max(0,Math.round((finish-start)/60000)):0;
    const bestByExercise={};
    exercises.forEach(exercise=>{
      const best=(exercise.sets||[]).slice().sort((a,b)=>((Number(b.reps)||0)*(Number(b.weight)||0))-((Number(a.reps)||0)*(Number(a.weight)||0)) || (Number(b.reps)||0)-(Number(a.reps)||0))[0];
      if(best) bestByExercise[exercise.exerciseId]={reps:Number(best.reps)||0,weight:Number(best.weight)||0,bodyweight:!!best.bodyweight,volume:(Number(best.reps)||0)*(Number(best.weight)||0),date:session.date};
    });
    return {
      durationMinutes:duration,
      completedExercises:exercises.filter(e=>e.completed || (e.sets||[]).length>0).length,
      totalExercises:exercises.length,
      totalSets:allSets.length,
      totalVolume:Math.round(totalVolume),
      bestByExercise,
      compliance:exercises.length?Math.round((exercises.filter(e=>e.completed || (e.sets||[]).length>0).length/exercises.length)*100):0,
      subjectiveNote:session.subjectiveNote||''
    };
  }
  function updateExerciseHistory(session){
    const map=history();
    (session.exercises||[]).forEach(exercise=>{
      const sets=exercise.sets||[];
      if(!sets.length) return;
      const last=sets[sets.length-1];
      const best=sets.slice().sort((a,b)=>((Number(b.reps)||0)*(Number(b.weight)||0))-((Number(a.reps)||0)*(Number(a.weight)||0)) || (Number(b.reps)||0)-(Number(a.reps)||0))[0] || last;
      map[exercise.exerciseId]={
        exerciseId:exercise.exerciseId,
        name:exercise.name,
        lastWeight:Number(last.weight)||0,
        lastReps:Number(last.reps)||0,
        lastSets:sets.length,
        bestSet:{reps:Number(best.reps)||0,weight:Number(best.weight)||0,volume:(Number(best.reps)||0)*(Number(best.weight)||0),bodyweight:!!best.bodyweight},
        previousVolume:exerciseVolume(exercise),
        lastDate:session.date,
        bodyweight:!!exercise.bodyweight
      };
    });
    saveHistory(map);
  }
  function syncLegacyGymSession(session){
    const legacy=getLocalData(GYM_SESSIONS_KEY,[]);
    const routineName=session.routine?.name||session.routineName||'Entrenamiento';
    const items=(session.exercises||[]).map(exercise=>{
      const sets=exercise.sets||[];
      const last=sets[sets.length-1]||{};
      return {
        id:exercise.id,
        muscle:exercise.muscle,
        name:exercise.name,
        sets:sets.length || 0,
        reps:Number(last.reps)||0,
        weight:Number(last.weight)||0,
        rir:Number(last.rir)||0,
        bodyweight:!!(exercise.bodyweight || last.bodyweight)
      };
    }).filter(item=>item.sets>0 || session.status==='finalizado');
    const index=legacy.findIndex(s=>s.id===session.id || s.workoutSessionId===session.id);
    const value={id:session.id,date:session.date,routine:routineName,items,notes:session.notes||'',volume:Math.round(sessionSummary(session).totalVolume),savedAt:new Date().toISOString(),workoutSessionId:session.id,status:session.status};
    if(index>=0) legacy[index]=value; else legacy.push(value);
    legacy.sort((a,b)=>a.date.localeCompare(b.date));
    setLocalData(GYM_SESSIONS_KEY,legacy);
  }
  function ensureWorkoutStyles(){
    if(document.getElementById('workoutFeatureStyles')) return;
    const style=document.createElement('style');
    style.id='workoutFeatureStyles';
    style.textContent=`
      .workoutTodayGrid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-top:12px}
      .workoutExerciseGrid{display:grid;gap:8px;margin-top:10px}
      .workoutExerciseCard{border:1px solid var(--line);border-radius:14px;padding:11px;background:rgba(255,255,255,.035);display:grid;gap:5px}
      .workoutExerciseCard.done{border-color:rgba(152,245,194,.35);background:rgba(152,245,194,.07)}
      .workoutExerciseCard.current{border-color:rgba(114,214,255,.45);background:rgba(114,214,255,.09)}
      .quickLogger{border:1px solid rgba(114,214,255,.35);background:linear-gradient(180deg,rgba(114,214,255,.10),rgba(152,245,194,.055));border-radius:18px;padding:14px;margin-top:12px}
      .quickLogger input,.quickLogger select{font-size:18px;padding:13px 12px}
      .quickLogger .buttons button{min-height:46px}
      .planEditorTextarea{min-height:150px;font-family:ui-monospace,Consolas,monospace;font-size:12px}
      .workoutSafety{border:1px solid rgba(255,211,110,.30);border-radius:14px;padding:12px;background:rgba(255,211,110,.08);color:#ffe8ad;margin-top:12px}
      .widgetStatus{border:1px dashed rgba(114,214,255,.35);border-radius:14px;padding:10px;background:rgba(114,214,255,.06);color:#dff6ff;margin-top:10px}
      @media(max-width:850px){.workoutTodayGrid{grid-template-columns:1fr}.quickLogger input,.quickLogger select{font-size:16px}}
    `;
    document.head.appendChild(style);
  }
  function injectWorkoutUi(){
    const tab=document.getElementById('tab-gym');
    if(!tab || document.getElementById('todayWorkoutPanel')) return;
    ensureWorkoutStyles();
    const hero=tab.querySelector('.moduleHero');
    hero.insertAdjacentHTML('afterend',`
      <div class="moduleCard" id="todayWorkoutPanel">
        <div class="actionFocusTop"><div><h3 id="todayWorkoutTitle">Entrenamiento de hoy</h3><div class="muted small" id="todayWorkoutSummary"></div></div><span class="statusChip good" id="todayWorkoutScore">Gym</span></div>
        <div class="workoutTodayGrid">
          <div>
            <div class="entryList" id="todayWorkoutExercises"></div>
            <div class="workoutSafety">Esta app no reemplaza asesoramiento de un entrenador, médico o profesional de salud. Ajustá cargas según técnica, dolor, fatiga y seguridad.</div>
          </div>
          <div>
            <div class="quickStats" id="todayWorkoutProgress"></div>
            <div class="auditItem good" id="physicalLever">Registrar pesos para medir progreso. Priorizar técnica antes que carga.</div>
            <div class="buttons">
              <button type="button" class="good" id="startTodayWorkoutBtn">Empezar entrenamiento</button>
              <button type="button" class="secondary" id="openQuickLoggerBtn">Registrar serie</button>
              <button type="button" class="secondary" id="manualWidgetUpdateBtn">Actualizar widget</button>
            </div>
            <div class="widgetStatus" id="workoutWidgetStatus">El APK Android sincroniza este resumen con el widget nativo cuando existe el puente Android.</div>
          </div>
        </div>
      </div>
      <div class="moduleCard" id="quickSetLoggerPanel">
        <h3>Registro rápido de serie</h3>
        <div class="quickLogger">
          <div class="formGrid">
            <div class="field"><label>Ejercicio actual</label><select id="quickExerciseSelect"></select></div>
            <div class="field"><label>Número de serie</label><input type="number" id="quickSetNumber" min="1" value="1"></div>
            <div class="field"><label>Repeticiones</label><input type="number" id="quickReps" min="0" max="200" value="8"></div>
            <div class="field"><label>Kilos / lastre</label><input type="number" id="quickWeight" min="0" step="0.5" value="0"></div>
            <div class="field"><label>RIR opcional</label><input type="number" id="quickRir" min="0" max="10" value="2"></div>
            <div class="field"><label>RPE opcional</label><input type="number" id="quickRpe" min="0" max="10" step="0.5" placeholder="Ej. 8"></div>
          </div>
          <label class="check" style="margin-top:10px"><input type="checkbox" id="quickBodyweight"><span>Peso corporal: registrar reps sin kilos, o usar kilos como lastre si agregás carga.</span></label>
          <div class="field" style="margin-top:10px"><label>Nota opcional</label><textarea id="quickNote" placeholder="Técnica, molestia, energía, ajuste para próxima serie…"></textarea></div>
          <div class="auditItem" id="quickLastHint">Última vez: sin datos todavía.</div>
          <div class="auditItem" id="quickSetStats">Ejercicio: 0 series · músculo: 0 series.</div>
          <div class="buttons">
            <button type="button" class="good" id="saveQuickSetBtn">Guardar serie</button>
            <button type="button" class="secondary" id="repeatLastSetBtn">Repetir última serie</button>
            <button type="button" class="secondary" id="previousExerciseBtn">Ejercicio anterior</button>
            <button type="button" class="secondary" id="nextExerciseBtn">Siguiente ejercicio</button>
            <button type="button" class="secondary" id="completeExerciseBtn">Completar ejercicio</button>
            <button type="button" class="warn" id="finishWorkoutBtn">Finalizar entrenamiento</button>
          </div>
        </div>
      </div>
      <div class="moduleCard" id="workoutConfigPanel">
        <h3>Rutina semanal y widget Android</h3>
        <div class="formGrid">
          <label class="check"><input type="checkbox" id="gymWidgetEnabled"><span>Activar resumen para widget interno/nativo.</span></label>
          <label class="check"><input type="checkbox" id="gymShowRir"><span>Mostrar RIR/RPE en registro rápido.</span></label>
          <div class="field"><label>Unidad</label><select id="gymUnit"><option value="kg">kg</option><option value="lb">lb</option></select></div>
          <div class="field"><label>Modo</label><select id="gymMode"><option value="simple">Simple</option><option value="advanced">Avanzado</option></select></div>
          <label class="check"><input type="checkbox" id="gymShowRestDays"><span>Mostrar descanso/actividad suave sábado y domingo.</span></label>
          <div class="field"><label>Día a editar</label><select id="planEditorDay"></select></div>
          <div class="field"><label>Nombre de rutina</label><input type="text" id="planEditorName"></div>
          <div class="field"><label>Músculos principales</label><input type="text" id="planEditorMuscles" placeholder="Pecho · Espalda"></div>
        </div>
        <div class="field" style="margin-top:10px"><label>Ejercicios del día (formato: músculo | ejercicio | peso corporal opcional)</label><textarea id="planEditorExercises" class="planEditorTextarea"></textarea></div>
        <div class="formGrid" style="margin-top:10px">
          <div class="field"><label>Copiar desde</label><select id="copyPlanFrom"></select></div>
          <div class="field"><label>Copiar hacia</label><select id="copyPlanTo"></select></div>
        </div>
        <div class="buttons">
          <button type="button" class="good" id="savePlanDayBtn">Guardar día</button>
          <button type="button" class="secondary" id="copyPlanDayBtn">Copiar día</button>
          <button type="button" class="warn" id="resetDefaultPlanBtn">Restablecer rutina predeterminada</button>
          <button type="button" class="secondary" id="refreshWorkoutWidgetBtn">Actualizar widget manualmente</button>
        </div>
      </div>
    `);
    setupWorkoutEvents();
  }
  function setupWorkoutEvents(){
    dayOrder.forEach(key=>{
      const label=`${dayLabels[key]} — ${weeklyPlan()[key]?.name||defaultWeeklyPlan[key].name}`;
      ['planEditorDay','copyPlanFrom','copyPlanTo'].forEach(id=>{
        const select=document.getElementById(id);
        if(select && !select.querySelector(`[value="${key}"]`)) select.insertAdjacentHTML('beforeend',`<option value="${key}">${escapeHtml(label)}</option>`);
      });
    });
    document.getElementById('startTodayWorkoutBtn')?.addEventListener('click',()=>openQuickSetLogger());
    document.getElementById('openQuickLoggerBtn')?.addEventListener('click',()=>openQuickSetLogger());
    document.getElementById('manualWidgetUpdateBtn')?.addEventListener('click',()=>{syncWorkoutWidget();flash('Widget actualizado con los datos actuales.');});
    document.getElementById('quickExerciseSelect')?.addEventListener('change',event=>{currentQuickExerciseId=event.target.value;renderQuickLogger();});
    document.getElementById('saveQuickSetBtn')?.addEventListener('click',saveQuickSet);
    document.getElementById('repeatLastSetBtn')?.addEventListener('click',repeatLastSet);
    document.getElementById('previousExerciseBtn')?.addEventListener('click',previousExercise);
    document.getElementById('nextExerciseBtn')?.addEventListener('click',nextExercise);
    document.getElementById('completeExerciseBtn')?.addEventListener('click',completeCurrentExercise);
    document.getElementById('finishWorkoutBtn')?.addEventListener('click',finishWorkout);
    document.getElementById('planEditorDay')?.addEventListener('change',event=>{currentPlanEditorDay=event.target.value;renderPlanEditor();});
    document.getElementById('savePlanDayBtn')?.addEventListener('click',savePlanEditorDay);
    document.getElementById('copyPlanDayBtn')?.addEventListener('click',copyPlanDay);
    document.getElementById('resetDefaultPlanBtn')?.addEventListener('click',resetDefaultPlan);
    document.getElementById('refreshWorkoutWidgetBtn')?.addEventListener('click',()=>{syncWorkoutWidget();flash('Widget actualizado manualmente.');});
    ['gymWidgetEnabled','gymShowRir','gymShowRestDays'].forEach(id=>document.getElementById(id)?.addEventListener('change',saveSettingsFromUi));
    ['gymUnit','gymMode'].forEach(id=>document.getElementById(id)?.addEventListener('change',saveSettingsFromUi));
  }
  function renderWorkoutDashboard(){
    injectWorkoutUi();
    ensureWorkoutData();
    maybeImportWidgetStateFromAndroid();
    renderTodayWorkout();
    renderQuickLogger();
    renderPlanEditor();
    renderSettings();
    syncWorkoutWidget();
  }
  function renderTodayWorkout(date=todayStr()){
    const plan=planForDate(date),session=latestSessionForDate(date),summary=session?sessionSummary(session):null;
    const title=document.getElementById('todayWorkoutTitle'),subtitle=document.getElementById('todayWorkoutSummary'),list=document.getElementById('todayWorkoutExercises'),progress=document.getElementById('todayWorkoutProgress'),score=document.getElementById('todayWorkoutScore'),lever=document.getElementById('physicalLever');
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
      return;
    }
    const exercises=session?.exercises||plan.exercises;
    const current=currentExercise(session)||exercises.find(x=>!x.completed)||exercises[0];
    list.innerHTML=exercises.map(exercise=>{
      const sets=exercise.sets?.length||0,done=!!exercise.completed,cur=current && (current.id===exercise.id || current.exerciseId===exercise.exerciseId);
      return `<div class="workoutExerciseCard ${done?'done':''} ${cur?'current':''}"><strong>${escapeHtml(exercise.name)}</strong><div class="meta">${escapeHtml(exercise.muscle)} · ${sets} serie(s) registradas${exercise.bodyweight?' · peso corporal':''}</div></div>`;
    }).join('');
    const completed=summary?.completedExercises||0,total=exercises.length,totalSets=summary?.totalSets||0,volume=summary?.totalVolume||0,compliance=summary?.compliance||0;
    progress.innerHTML=[['Ejercicios',`${completed}/${total}`],['Series',totalSets],['Volumen',`${volume.toLocaleString()} ${settingsValue.unit}`],['Cumplimiento',`${compliance}%`]].map(statCard).join('');
    if(score) score.textContent=`Score gym ${Math.min(100,Math.round((completed/Math.max(1,total))*70 + Math.min(30,totalSets*2)))}/100`;
    if(lever) lever.textContent=totalSets?'Según lo registrado, priorizá técnica antes que carga y registrá la siguiente serie.':'Palanca física de hoy: registrar pesos para medir progreso.';
  }
  function statCard([k,v]){ return `<div class="quickStat"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`; }
  function renderQuickLogger(){
    const date=todayStr(),plan=planForDate(date);
    const select=document.getElementById('quickExerciseSelect'); if(!select) return;
    const session=activeSession(date) || latestSessionForDate(date);
    const source=session?.exercises?.length?session.exercises:plan.exercises;
    select.innerHTML=(source||[]).map(exercise=>`<option value="${escapeHtml(exercise.id||exercise.exerciseId)}">${escapeHtml(exercise.name)}</option>`).join('');
    if(!currentQuickExerciseId && source?.[0]) currentQuickExerciseId=source[0].id||source[0].exerciseId;
    if(currentQuickExerciseId) select.value=currentQuickExerciseId;
    const exercise=(source||[]).find(x=>(x.id||x.exerciseId)===select.value) || source?.[0];
    if(!exercise) return;
    const h=history()[exercise.exerciseId]||null;
    const sets=exercise.sets||[];
    document.getElementById('quickSetNumber').value=(sets.length||0)+1;
    const bodyweight=!!exercise.bodyweight || !!h?.bodyweight;
    document.getElementById('quickBodyweight').checked=bodyweight;
    if(h && !sets.length){
      document.getElementById('quickReps').value=h.lastReps||8;
      document.getElementById('quickWeight').value=h.lastWeight||0;
    }
    const hint=document.getElementById('quickLastHint');
    if(h) hint.textContent=`Última vez: ${h.name} — ${h.lastWeight||0} ${settings().unit} x ${h.lastReps||0} reps. Podés repetir la carga anterior; si te sentís bien, intentá +1 rep.`;
    else hint.textContent='Última vez: sin datos todavía. Si estás fatigado, mantener carga también cuenta.';
    const stat=document.getElementById('quickSetStats');
    if(stat){
      const exerciseSets=exerciseSetCount(exercise);
      const muscleSets=muscleSetCount(source,exercise.muscle);
      stat.textContent=`Series de este ejercicio: ${exerciseSets}. Total de ${exercise.muscle}: ${muscleSets}.`;
    }
    const show=settings().showRir;
    ['quickRir','quickRpe'].forEach(id=>{const field=document.getElementById(id)?.closest('.field'); if(field) field.classList.toggle('hidden',!show);});
  }
  function openGymToday(){
    setModule('gym');
    renderWorkoutDashboard();
    document.getElementById('todayWorkoutPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function openQuickSetLogger(exerciseId){
    const session=ensureSession(todayStr());
    if(exerciseId) currentQuickExerciseId=exerciseId;
    else if(session) currentQuickExerciseId=currentExercise(session)?.id || currentExercise(session)?.exerciseId || null;
    openGymToday();
    renderQuickLogger();
    document.getElementById('quickSetLoggerPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function selectedSessionForQuick(){
    return ensureSession(todayStr());
  }
  function selectedQuickExercise(session){
    const select=document.getElementById('quickExerciseSelect');
    const id=select?.value || currentQuickExerciseId;
    return session?.exercises?.find(x=>x.id===id || x.exerciseId===id) || currentExercise(session);
  }
  function saveQuickSet(){
    const session=selectedSessionForQuick();
    if(!session){ flash('Hoy toca descanso. Podés registrar movilidad suave si querés.'); return; }
    const exercise=selectedQuickExercise(session);
    if(!exercise){ flash('Elegí un ejercicio para registrar.'); return; }
    const setNumber=Math.max(1,Number(document.getElementById('quickSetNumber').value)||((exercise.sets||[]).length+1));
    const reps=Math.max(0,Number(document.getElementById('quickReps').value)||0);
    const weight=Math.round(Math.max(0,Number(document.getElementById('quickWeight').value)||0)*2)/2;
    const bodyweight=document.getElementById('quickBodyweight').checked;
    const set={id:uid('set'),setNumber,reps,weight,rir:document.getElementById('quickRir').value===''?null:Math.max(0,Number(document.getElementById('quickRir').value)||0),rpe:document.getElementById('quickRpe').value===''?null:Math.max(0,Number(document.getElementById('quickRpe').value)||0),bodyweight,note:document.getElementById('quickNote').value.trim(),savedAt:new Date().toISOString(),volume:Math.round(reps*weight)};
    exercise.sets=exercise.sets||[];
    exercise.sets.push(set);
    session.currentExerciseIndex=session.exercises.findIndex(x=>x.id===exercise.id);
    session.summary=sessionSummary(session);
    replaceSession(session);
    document.getElementById('quickNote').value='';
    renderGym();
    flash('Serie guardada. Registrar ya es progreso.');
  }
  function repeatLastSet(){
    const session=selectedSessionForQuick(),exercise=selectedQuickExercise(session);
    const last=exercise?.sets?.slice(-1)[0] || history()[exercise?.exerciseId] || null;
    if(!last){ flash('Todavía no hay una serie anterior para repetir.'); return; }
    document.getElementById('quickReps').value=last.reps||last.lastReps||8;
    document.getElementById('quickWeight').value=last.weight||last.lastWeight||0;
    if(last.rir!==undefined && last.rir!==null) document.getElementById('quickRir').value=last.rir;
    document.getElementById('quickBodyweight').checked=!!last.bodyweight;
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
  function finishWorkout(){
    const session=selectedSessionForQuick(); if(!session) return;
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
  }
  function saveSettingsFromUi(){
    saveSettings({widgetEnabled:document.getElementById('gymWidgetEnabled').checked,showRir:document.getElementById('gymShowRir').checked,unit:document.getElementById('gymUnit').value,mode:document.getElementById('gymMode').value,showRestDays:document.getElementById('gymShowRestDays').checked});
    renderQuickLogger();
  }
  function renderPlanEditor(){
    const plan=weeklyPlan(),dayPlan=plan[currentPlanEditorDay]||defaultWeeklyPlan[currentPlanEditorDay];
    const daySelect=document.getElementById('planEditorDay'); if(!daySelect) return;
    daySelect.value=currentPlanEditorDay;
    document.getElementById('planEditorName').value=dayPlan.name||'';
    document.getElementById('planEditorMuscles').value=(dayPlan.muscles||[]).join(' · ');
    document.getElementById('planEditorExercises').value=dayPlan.type==='rest'
      ? [dayPlan.message,...(dayPlan.suggestions||[])].join('\n')
      : (dayPlan.exercises||[]).map(exercise=>`${exercise.muscle} | ${exercise.name}${exercise.bodyweight?' | peso corporal':''}${exercise.notes?' | '+exercise.notes:''}`).join('\n');
  }
  function savePlanEditorDay(){
    const plan=weeklyPlan(),key=currentPlanEditorDay,name=document.getElementById('planEditorName').value.trim()||defaultWeeklyPlan[key].name;
    const muscles=document.getElementById('planEditorMuscles').value.split(/[·,]/).map(x=>x.trim()).filter(Boolean);
    const lines=document.getElementById('planEditorExercises').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if(key==='saturday'||key==='sunday'){
      plan[key]={...plan[key],name,type:'rest',muscles:muscles.length?muscles:['Recuperación'],message:lines[0]||defaultWeeklyPlan[key].message,suggestions:lines.slice(1)};
    }else{
      const exercises=lines.map((line,index)=>{
        const [muscleRaw,nameRaw,flagRaw,notesRaw]=line.split('|').map(x=>x.trim());
        const nameValue=nameRaw||muscleRaw||`Ejercicio ${index+1}`;
        const libraryMatch=exerciseLibrary.find(exercise=>normalizeText(exercise.name)===normalizeText(nameValue) || (exercise.aliases||[]).some(alias=>normalizeText(alias)===normalizeText(nameValue)));
        return {id:`custom-${key}-${index+1}`,exerciseId:libraryMatch?.id||`custom-${normalizeText(nameValue).replace(/\s+/g,'-')}`,name:nameValue,muscle:nameRaw?muscleRaw:(libraryMatch?.group||'General'),type:libraryMatch?.type||'personalizado',unit:libraryMatch?.unit||settings().unit,bodyweight:/peso corporal|bodyweight/i.test(flagRaw||''),notes:notesRaw||flagRaw||''};
      });
      plan[key]={dayKey:key,weekday:dayLabels[key],name,type:'workout',muscles:muscles.length?muscles:[...new Set(exercises.map(x=>x.muscle))],exercises};
    }
    saveWeeklyPlan(plan);
    renderGym();
    flash('Rutina semanal actualizada sin sobrescribir otros días.');
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
  function resetDefaultPlan(){
    if(!window.confirm('Esto reemplaza la rutina semanal actual por la rutina predeterminada exacta. Tus sesiones guardadas no se borran.')) return;
    saveWeeklyPlan(clone(defaultWeeklyPlan));
    currentPlanEditorDay='monday';
    renderGym();
    flash('Rutina predeterminada restablecida.');
  }
  function buildWorkoutWidgetState(date=todayStr()){
    const plan=planForDate(date),session=latestSessionForDate(date),summary=session?sessionSummary(session):null;
    const exercises=session?.exercises?.length?session.exercises:plan.exercises||[];
    const current=currentExercise(session)||exercises.find(x=>!x.completed)||exercises[0]||null;
    const completed=summary?.completedExercises||0,total=exercises.length,totalSets=summary?.totalSets||0,totalVolume=summary?.totalVolume||0;
    const s=settings();
    const restMessage=s.showRestDays ? (plan.message||'Hoy toca descanso') : 'Descanso configurado como oculto en la app';
    const previousState=getLocalData(keys.workoutWidgetState,{})||{};
    const previousQuick=previousState.quickLog||{};
    const currentSets=current?.sets||[];
    const lastSet=currentSets[currentSets.length-1]||null;
    const h=current?.exerciseId ? history()[current.exerciseId] : null;
    const currentId=current?.id||current?.exerciseId||'';
    const quickMatches=previousQuick.currentExerciseId && previousQuick.currentExerciseId===currentId;
    const quickReps=Number(quickMatches?previousQuick.reps:(lastSet?.reps??h?.lastReps??8))||8;
    const quickWeight=Number(quickMatches?previousQuick.weight:(lastSet?.weight??h?.lastWeight??0))||0;
    const quickBodyweight=!!(quickMatches?previousQuick.bodyweight:(current?.bodyweight||lastSet?.bodyweight||h?.bodyweight));
    const currentExerciseSets=exerciseSetCount(current);
    const currentMuscleSets=muscleSetCount(exercises,current?.muscle);
    const quickHint=h
      ? `Ultima vez: ${h.name} — ${h.lastWeight||0} ${s.unit} x ${h.lastReps||0} reps.`
      : 'Ajusta reps/kg y guarda desde el widget.';
    return {
      schemaVersion:2,
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
        completed:!!x.completed,
        setsLogged:x.sets?.length||0,
        sets:clone(x.sets||[]),
        bodyweight:!!x.bodyweight
      })),
      currentExerciseId:currentId,
      currentExerciseName:current?.name||'',
      currentExerciseSets,
      currentMuscleSets,
      currentMuscleName:current?.muscle||'',
      quickLog:{
        currentExerciseId:currentId,
        exerciseName:current?.name||'',
        setNumber:(currentSets.length||0)+1,
        reps:Math.max(0,Math.round(quickReps)),
        weight:Math.max(0,Math.round(quickWeight*2)/2),
        bodyweight:quickBodyweight,
        unit:s.unit,
        weightStep:0.5,
        weightFastStep:5,
        currentExerciseSets,
        currentMuscleSets,
        currentMuscleName:current?.muscle||'',
        hintText:quickHint
      },
      workoutSession:session?clone(session):null,
      exerciseHistory:history(),
      progressText:plan.type==='rest'?restMessage:`${completed}/${total} ejercicios · ${totalSets} series · ${Math.round(totalVolume).toLocaleString()} ${s.unit}`,
      completedExercises:completed,
      totalExercises:total,
      totalSets,
      totalVolume,
      status:session?.status||'sin iniciar',
      lastNativeMutationAt:previousState.lastNativeMutationAt||null,
      lastNativeMutationSource:previousState.lastNativeMutationSource||'',
      lastWidgetActionText:previousState.lastWidgetActionText||quickHint,
      updatedAt:new Date().toISOString()
    };
  }
  function syncWorkoutWidget(){
    if(!importingNativeWidgetState) maybeImportWidgetStateFromAndroid();
    const s=settings();
    const state=buildWorkoutWidgetState();
    setLocalData(keys.workoutWidgetState,state);
    const status=document.getElementById('workoutWidgetStatus');
    if(status) status.textContent=s.widgetEnabled?'Resumen listo para el widget Android nativo.':'Resumen de widget pausado en ajustes.';
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

  window.WORKOUT_FEATURES={keys,dayOrder,defaultWeeklyPlan:clone(defaultWeeklyPlan),exerciseLibrary:clone(exerciseLibrary),dayKeyForDate,planForDate,buildWorkoutWidgetState,syncWorkoutWidget,importWidgetStateFromAndroid};
  window.openGymToday=openGymToday;
  window.openQuickSetLogger=openQuickSetLogger;
  window.handleAndroidWidgetIntent=(action,payload)=>handleAndroidWidgetIntent(action,payload||{});

  const originalRenderGym=renderGym;
  renderGym=function(){ originalRenderGym(); renderWorkoutDashboard(); };
  window.renderGym=renderGym;

  ensureWorkoutData();
  injectWorkoutUi();
  renderWorkoutDashboard();
})();
