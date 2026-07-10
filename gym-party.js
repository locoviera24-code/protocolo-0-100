(function(){
  'use strict';

  const MAX_GYM_PARTY_MEMBERS = 10;
  const FIREBASE_SDK_VERSION = '10.12.4';
  const keys = {
    settings: 'protocolo_0_100_gym_party_settings_v1',
    membership: 'protocolo_0_100_gym_party_membership_v1',
    sharedWorkoutSessions: 'protocolo_0_100_shared_workout_sessions_v1',
    sharedWorkoutSets: 'protocolo_0_100_shared_workout_sets_v1',
    syncQueue: 'protocolo_0_100_gym_party_sync_queue_v1',
    lastSyncAt: 'protocolo_0_100_last_gym_party_sync_at_v1',
    lastRemoteSyncAt:'protocolo_0_100_gym_party_last_remote_sync_at_v1',
    demoData: 'protocolo_0_100_gym_party_demo_data_v1'
  };
  const workoutKeys = {
    workoutSessions: 'protocolo_0_100_workout_sessions_v1',
    gymSessions: 'protocolo_0_100_gym_sessions_v1'
  };
  const collections = {
    publicProfiles: 'users_public_profile',
    parties: 'gym_parties',
    members: 'gym_party_members',
    sessions: 'workout_sessions_shared',
    sets: 'workout_sets_shared',
    invites: 'gym_party_invites',
    weeklyStats: 'weekly_member_stats'
  };
  const defaultPrivacy = {
    shareGymData: true,
    shareAggregateOnly: false,
    shareSetDetails: true,
    hideAbsoluteWeights: false,
    anonymousAlias: false,
    shareGeneralScore: false
  };
  const help = {
    volume: {
      title: 'Volumen semanal',
      text: 'Suma reps x kilos de las series compartidas. Sirve para ver tendencia, no para forzar mas carga si hay fatiga, dolor o mala tecnica.'
    },
    sets: {
      title: 'Series',
      text: 'Cuenta las series registradas en entrenamientos compartidos. Mas series no siempre significa mejor; importa tecnica, recuperacion y plan.'
    },
    reps: {
      title: 'Repeticiones',
      text: 'Suma las repeticiones compartidas. Ayuda a ver continuidad del entrenamiento sin convertir cada sesion en una competencia.'
    },
    change: {
      title: 'Progreso vs semana pasada',
      text: 'Compara la semana actual contra la anterior. La comparacion util es contra tu propia semana pasada.'
    },
    consistency: {
      title: 'Constancia',
      text: 'Estima regularidad por sesiones registradas. Completar el plan y registrar ya es progreso; descanso planificado tambien cuenta.'
    },
    best: {
      title: 'Mejor serie',
      text: 'Toma la serie con mayor reps x kilos por ejercicio. No reemplaza criterio tecnico ni seguridad.'
    },
    muscle: {
      title: 'Volumen por musculo',
      text: 'Agrupa el volumen por grupo muscular declarado en cada ejercicio. Sirve para equilibrio de rutina, no para perseguir volumen infinito.'
    },
    sync: {
      title: 'Sincronizacion',
      text: 'La app guarda primero en local. Si no hay conexion, deja cambios en cola y los sube cuando vuelvas a sincronizar.'
    },
    privacy: {
      title: 'Privacidad',
      text: 'Por defecto solo se comparte gym: alias, entrenamientos, ejercicios, series, reps, kilos, volumen, fecha, duracion y progreso semanal.'
    },
    demo: {
      title: 'Modo demo',
      text: 'Usa datos ficticios para probar la interfaz sin Firebase. No representa tu progreso real ni el de otra persona.'
    }
  };

  let firebaseRuntime = null;
  let firebaseInitPromise = null;
  const partyQuickDrafts = new Map();
  let partyRestTimerInterval = null;
  let partyRestTimerEndsAt = 0;

  function read(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw) ?? fallback;
    }catch(e){
      return fallback;
    }
  }
  function write(key, value){
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
  function safeArray(value){ return Array.isArray(value) ? value : []; }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function todayStr(){
    if(typeof window.todayStr === 'function') return window.todayStr();
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function dateFromString(value){
    const [y,m,d] = String(value || todayStr()).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  function dateStrFromDate(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function addDays(value, days){
    const d = dateFromString(value);
    d.setDate(d.getDate() + days);
    return dateStrFromDate(d);
  }
  function weekStartStr(value = todayStr()){
    const d = dateFromString(value);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return dateStrFromDate(d);
  }
  function previousWeekStart(value){ return addDays(value, -7); }
  function inWeek(date, start){ return String(date || '') >= start && String(date || '') <= addDays(start, 6); }
  function uid(prefix){ return typeof window.uid === 'function' ? window.uid(prefix) : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  function escape(value){ return typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function flashMessage(message){
    if(typeof window.flash === 'function') window.flash(message);
    else if(typeof console !== 'undefined') console.log(message);
  }
  function download(content, name, type){
    if(typeof window.downloadBlob === 'function') return window.downloadBlob(content, name, type);
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function normalizeCode(value){ return String(value || '').replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,10); }
  function makeInviteCode(){ return normalizeCode(Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-2)); }
  function cleanAlias(value){ return String(value || '').trim().replace(/\s+/g,' ').slice(0,32) || 'Atleta'; }
  function cleanEmail(value){ return String(value || '').trim().toLowerCase().slice(0,120); }
  function nowIso(){ return new Date().toISOString(); }
  function syncEngine(){ return window.GYM_PARTY_SYNC||null; }
  function number(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function round(value, digits = 1){
    const p = 10 ** digits;
    return Math.round(number(value) * p) / p;
  }
  function percentChange(current, previous){
    if(window.GYM_PARTY_METRICS?.percentChange) return window.GYM_PARTY_METRICS.percentChange(current,previous);
    if(window.WORKOUT_METRICS?.percentChange) return window.WORKOUT_METRICS.percentChange(current,previous);
    if(!previous) return null;
    return round(((current - previous) / previous) * 100, 1);
  }

  function settings(){
    const current = read(keys.settings, {});
    let localUserId = current.localUserId || '';
    if(!localUserId){
      localUserId = uid('party_user');
      write(keys.settings, {...current, localUserId});
    }
    return {
      backendMode: 'local',
      firebaseConfig: {},
      localParties: {},
      selectedExerciseId: '',
      ...current,
      localUserId
    };
  }
  function saveSettings(next){
    const value = {...settings(), ...next, updatedAt: nowIso()};
    write(keys.settings, value);
    return value;
  }
  function effectiveFirebaseConfig(){
    const localConfig = settings().firebaseConfig || {};
    if(hasFirebaseConfig(localConfig)) return localConfig;
    const bundledConfig = window.GYM_PARTY_FIREBASE_CONFIG || {};
    if(hasFirebaseConfig(bundledConfig)) return bundledConfig;
    return {};
  }
  function firebaseConfigSource(){
    if(window.FIREBASE_SERVICE?.configSource) return window.FIREBASE_SERVICE.configSource(settings().firebaseConfig||{},window.GYM_PARTY_FIREBASE_CONFIG||{});
    if(hasFirebaseConfig(settings().firebaseConfig || {})) return 'local';
    if(hasFirebaseConfig(window.GYM_PARTY_FIREBASE_CONFIG || {})) return 'bundled';
    return 'missing';
  }
  function membership(){ return read(keys.membership, null); }
  function saveMembership(value){ return write(keys.membership, value); }
  function clearMembership(){
    localStorage.removeItem(keys.membership);
    renderGymParty();
  }
  function activeMembership(){
    const value = membership();
    return value && value.active ? value : null;
  }
  function sharedSessions(){ return read(keys.sharedWorkoutSessions, []); }
  function saveSharedSessions(value){ return write(keys.sharedWorkoutSessions, value); }
  function sharedSets(){ return read(keys.sharedWorkoutSets, []); }
  function saveSharedSets(value){ return write(keys.sharedWorkoutSets, value); }
  function syncQueue(){ return read(keys.syncQueue, []); }
  function saveSyncQueue(value){ return write(keys.syncQueue, value); }
  function setLastSync(value = nowIso()){ write(keys.lastSyncAt, value); return value; }
  function lastSyncAt(){ return read(keys.lastSyncAt, ''); }
  function lastRemoteSyncAt(){ return read(keys.lastRemoteSyncAt,''); }
  function setLastRemoteSyncAt(value){ if(value) write(keys.lastRemoteSyncAt,value); return value; }

  function privacyFromForm(prefix){
    return {
      shareGymData: !!document.getElementById(`${prefix}ShareGym`)?.checked,
      shareAggregateOnly: !!document.getElementById(`${prefix}AggregateOnly`)?.checked,
      shareSetDetails: !!document.getElementById(`${prefix}SetDetails`)?.checked,
      hideAbsoluteWeights: !!document.getElementById(`${prefix}HideWeights`)?.checked,
      anonymousAlias: !!document.getElementById(`${prefix}AnonymousAlias`)?.checked,
      shareGeneralScore: !!document.getElementById(`${prefix}GeneralScore`)?.checked
    };
  }
  function privacyForShare(){
    const m = activeMembership();
    return {...defaultPrivacy, ...(m?.privacy || {})};
  }
  function firestorePayload(value){
    const clean={...value};
    delete clean.source;
    delete clean.pendingSync;
    delete clean.syncState;
    delete clean.lastError;
    delete clean.attempts;
    delete clean.nextAttemptAt;
    delete clean.dirty;
    delete clean._syncFingerprint;
    delete clean.conflict;
    delete clean.lastSyncedAt;
    return clean;
  }
  function privacyFromMember(member = {}){
    return {
      shareGymData: member.shareGymData !== false,
      shareAggregateOnly: !!member.shareAggregateOnly,
      shareSetDetails: member.shareSetDetails !== false,
      hideAbsoluteWeights: !!member.hideAbsoluteWeights,
      anonymousAlias: !!member.anonymousAlias,
      shareGeneralScore: !!member.shareGeneralScore
    };
  }
  function portableAccessCredentials(){
    const email = cleanEmail(document.getElementById('gymPartyAccessEmail')?.value || '');
    const password = String(document.getElementById('gymPartyAccessPassword')?.value || '');
    if(!email || !email.includes('@')) return {ok: false, message: 'Escribi un email valido para recuperar el acceso.'};
    if(password.length < 6) return {ok: false, message: 'La clave debe tener al menos 6 caracteres.'};
    return {ok: true, email, password};
  }
  function portableAccessFormHtml({mode = 'restore'} = {}){
    const savedEmail = cleanEmail(settings().portableAccessEmail || '');
    const primaryAction = mode === 'link' ? 'link-access' : 'restore-access';
    const primaryText = mode === 'link' ? 'Guardar acceso' : 'Entrar y restaurar sala';
    const help = mode === 'link'
      ? 'Vincula esta Gym Party a un email y clave para poder entrar desde otro telefono. El email no se comparte con tu amigo.'
      : 'Usa el mismo email y clave que guardaste en tu dispositivo anterior para restaurar tu sala y datos compartidos.';
    return `<div class="partyAccessBox">
      <div class="muted small">${escape(help)}</div>
      <div class="partyAccessGrid">
        <div class="field"><label>Email de acceso</label><input type="email" id="gymPartyAccessEmail" autocomplete="email" value="${escape(savedEmail)}" placeholder="tu@email.com"></div>
        <div class="field"><label>Clave</label><input type="password" id="gymPartyAccessPassword" autocomplete="${mode === 'link' ? 'new-password' : 'current-password'}" placeholder="Minimo 6 caracteres"></div>
      </div>
      <div class="buttons partySecondaryActions">
        <button type="button" class="good" data-gym-party-action="${primaryAction}">${escape(primaryText)}</button>
        ${mode === 'link' ? '<button type="button" class="secondary" data-gym-party-action="restore-access">Entrar con acceso existente</button>' : ''}
      </div>
      <div class="muted small">Si borras datos del sitio o cambias de dispositivo sin guardar este acceso, la sesion anonima anterior no se puede recuperar.</div>
    </div>`;
  }

  function memberIdForLocalParty(partyId, userId){ return `${partyId}_${userId}`; }
  function memberDisplayName(member, data){
    const m = activeMembership();
    if(member.userId === m?.userId) return 'Yo';
    if((data?.members || []).length === 2) return 'Amigo';
    return member.aliasInParty || member.alias || 'Miembro';
  }
  function currentParty(){
    const m = activeMembership();
    if(!m) return null;
    if(m.backendMode === 'demo') return read(keys.demoData, null)?.party || null;
    return settings().localParties?.[m.partyId] || m.party || null;
  }
  function partyData(){
    const m = activeMembership();
    if(!m) return null;
    if(m.backendMode === 'demo'){
      const demo = read(keys.demoData, null);
      if(demo) return demo;
    }
    const party = currentParty();
    const rawSets = sharedSets().filter(s => s.partyId === m.partyId);
    const sets = rawSets.filter(s => !s.deleted);
    const sessions = normalizeSessionsFromSets(sharedSessions().filter(s => s.partyId === m.partyId && !s.deletedAt), rawSets);
    const members = safeArray(party?.members);
    return {party, members, sessions, sets, demo: false};
  }

  function createLocalParty(){
    const name = document.getElementById('gymPartyCreateName')?.value.trim() || 'Gym Party';
    const alias = cleanAlias(document.getElementById('gymPartyCreateAlias')?.value || 'Yo');
    const backendMode = document.getElementById('gymPartyCreateBackend')?.value || 'local';
    const privacy = privacyFromForm('create');
    if(!privacy.shareGymData){
      flashMessage('Para crear la sala tenes que aceptar compartir datos de gym con esta Gym Party.');
      return;
    }
    if(backendMode === 'firebase') {
      createFirebaseParty({name, alias, privacy}).catch(error => flashMessage(firebaseError(error)));
      return;
    }
    const s = settings();
    const partyId = uid('party');
    const inviteCode = makeInviteCode();
    const userId = s.localUserId;
    const member = {
      id: memberIdForLocalParty(partyId, userId),
      partyId,
      inviteCode,
      userId,
      aliasInParty: alias,
      role: 'owner',
      joinedAt: nowIso(),
      active: true,
      ...privacy
    };
    const party = {
      id: partyId,
      name,
      inviteCode,
      createdBy: userId,
      createdAt: nowIso(),
      active: true,
      inviteActive: true,
      inviteUses: 0,
      privacyMode: 'gym-only',
      membersCount: 1,
      maxMembers: MAX_GYM_PARTY_MEMBERS,
      members: [member]
    };
    saveSettings({backendMode: 'local',pendingInviteCode:'',localParties:{...s.localParties,[partyId]:party}});
    saveMembership({partyId, inviteCode, userId, alias, role: 'owner', backendMode: 'local', active: true, privacy, joinedAt: nowIso(), party});
    syncFromLocalWorkouts({silent: true});
    renderGymParty();
    flashMessage('Gym Party creada. Copia el codigo para invitar.');
  }

  function joinLocalParty(){
    const code = normalizeCode(document.getElementById('gymPartyJoinCode')?.value);
    const alias = cleanAlias(document.getElementById('gymPartyJoinAlias')?.value || 'Atleta');
    const privacy = privacyFromForm('join');
    const backendMode = document.getElementById('gymPartyJoinBackend')?.value || 'local';
    if(!code){ flashMessage('Ingresá un código de invitación.'); return; }
    if(!privacy.shareGymData){ flashMessage('Para unirte tenés que aceptar compartir solo datos de gym con esta sala.'); return; }
    if(backendMode === 'firebase') {
      joinFirebaseParty({code, alias, privacy}).catch(error => flashMessage(firebaseError(error)));
      return;
    }
    const s = settings();
    const party = Object.values(s.localParties || {}).find(item => normalizeCode(item.inviteCode) === code);
    if(!party){ flashMessage('Ese código no existe en este dispositivo. Para unirse desde otro teléfono configurá Firebase.'); return; }
    if(!party.active||party.inviteActive===false){ flashMessage('La sala o su codigo de invitacion no estan activos.'); return; }
    if(party.inviteExpiresAt&&party.inviteExpiresAt<todayStr()){flashMessage('Ese codigo de invitacion ya vencio.');return;}
    if(party.inviteMaxUses&&Number(party.inviteUses||0)>=Number(party.inviteMaxUses)){flashMessage('Ese codigo alcanzo su limite de usos.');return;}
    if(window.confirm&&!window.confirm(`Vas a unirte a "${party.name||'Gym Party'}". ¿Continuar?`)) return;
    if((party.members || []).length >= MAX_GYM_PARTY_MEMBERS){
      flashMessage('Esta sala alcanzó el límite recomendado de 10 miembros para mantener la app rápida y clara.');
      return;
    }
    const userId = s.localUserId;
    if((party.members || []).some(member => member.userId === userId)){
      flashMessage('Este usuario ya está unido a la sala.');
      saveMembership({partyId: party.id, inviteCode: party.inviteCode, userId, alias, role: 'member', backendMode: 'local', active: true, privacy, joinedAt: nowIso(), party});
      renderGymParty();
      return;
    }
    const member = {id: memberIdForLocalParty(party.id, userId), partyId: party.id, userId, aliasInParty: alias, role: 'member', joinedAt: nowIso(), active: true, ...privacy};
    member.inviteCode = party.inviteCode;
    const nextParty = {...party, members: [...(party.members || []), member], membersCount: (party.members || []).length + 1,inviteUses:Number(party.inviteUses||0)+1};
    saveSettings({localParties: {...s.localParties, [party.id]: nextParty}});
    saveMembership({partyId: party.id, inviteCode: party.inviteCode, userId, alias, role: 'member', backendMode: 'local', active: true, privacy, joinedAt: nowIso(), party: nextParty});
    saveSettings({pendingInviteCode:''});
    syncFromLocalWorkouts({silent: true});
    renderGymParty();
    flashMessage('Te uniste a la Gym Party local.');
  }

  function buildDemoData(memberCount = 2){
    const start = weekStartStr(todayStr());
    const members = [
      {userId: 'demo_me', aliasInParty: 'Yo', role: 'owner'},
      {userId: 'demo_friend', aliasInParty: 'Amigo', role: 'member'},
      {userId: 'demo_ana', aliasInParty: 'Ana', role: 'member'},
      {userId: 'demo_luis', aliasInParty: 'Luis', role: 'member'},
      {userId: 'demo_mara', aliasInParty: 'Mara', role: 'member'}
    ].slice(0, Math.max(2, Math.min(memberCount, 5))).map(member => ({
      id: `demo_party_${member.userId}`,
      partyId: 'demo_party',
      inviteCode: 'DEMO100',
      joinedAt: addDays(start, -28),
      active: true,
      shareGymData: true,
      shareAggregateOnly: false,
      shareSetDetails: true,
      hideAbsoluteWeights: false,
      ...member
    }));
    const exercises = [
      ['press-banca', 'Press de banca', 'Pecho', 8, 50],
      ['dominadas', 'Dominadas', 'Espalda', 7, 0],
      ['jalon-pecho-sentado', 'Jalon al pecho sentado', 'Espalda', 10, 45],
      ['prensa', 'Prensa', 'Cuadriceps / pierna', 12, 120],
      ['curl-martillo', 'Curl martillo', 'Biceps', 10, 14]
    ];
    const sessions = [];
    const sets = [];
    members.forEach((member, memberIndex) => {
      for(let weekOffset = -3; weekOffset <= 0; weekOffset++){
        const sessionsThisWeek = Math.max(1, Math.min(4, 2 + ((memberIndex + weekOffset + 4) % 3)));
        for(let sIndex = 0; sIndex < sessionsThisWeek; sIndex++){
          const date = addDays(start, weekOffset * 7 + sIndex * 2 + (memberIndex % 2));
          const sessionId = `demo_session_${member.userId}_${weekOffset}_${sIndex}`;
          const selected = exercises.slice(0, 3 + ((sIndex + memberIndex) % 3));
          let totalSets = 0;
          let totalReps = 0;
          let totalVolume = 0;
          selected.forEach(([exerciseId, exerciseName, muscleGroup, baseReps, baseWeight], exerciseIndex) => {
            for(let setNumber = 1; setNumber <= 3; setNumber++){
              const reps = baseReps + ((weekOffset + 3 + setNumber + memberIndex) % 3);
              const weightKg = exerciseId === 'dominadas' ? 0 : baseWeight + memberIndex * 5 + (weekOffset + 3) * 2.5 + exerciseIndex;
              const volume = Math.round(reps * weightKg);
              totalSets += 1;
              totalReps += reps;
              totalVolume += volume;
              sets.push({
                id: `demo_set_${sessionId}_${exerciseId}_${setNumber}`,
                partyId: 'demo_party',
                sessionId,
                userId: member.userId,
                exerciseId,
                exerciseName,
                muscleGroup,
                setNumber,
                reps,
                weightKg,
                rir: 2,
                rpe: null,
                isBodyweight: exerciseId === 'dominadas',
                date,
                createdAt: `${date}T12:00:00.000Z`,
                source: 'demo'
              });
            }
          });
          sessions.push({
            id: sessionId,
            partyId: 'demo_party',
            userId: member.userId,
            localSessionId: sessionId,
            date,
            weekday: weekdayLabel(date),
            routineName: sIndex % 2 ? 'Pierna A' : 'Torso A',
            startedAt: `${date}T11:00:00.000Z`,
            finishedAt: `${date}T12:05:00.000Z`,
            durationMinutes: 65,
            exercisesCompleted: selected.length,
            totalSets,
            totalReps,
            totalVolume,
            createdAt: `${date}T12:05:00.000Z`,
            updatedAt: `${date}T12:05:00.000Z`,
            source: 'demo'
          });
        }
      }
    });
    return {
      demo: true,
      party: {
        id: 'demo_party',
        name: 'Gym Party Demo',
        inviteCode: 'DEMO100',
        createdBy: 'demo_me',
        createdAt: addDays(start, -28),
        active: true,
        privacyMode: 'gym-only',
        membersCount: members.length,
        maxMembers: MAX_GYM_PARTY_MEMBERS,
        members
      },
      members,
      sessions,
      sets,
      generatedAt: nowIso()
    };
  }

  function startDemo(memberCount = 2){
    const demo = buildDemoData(memberCount);
    write(keys.demoData, demo);
    saveMembership({
      partyId: demo.party.id,
      inviteCode: demo.party.inviteCode,
      userId: 'demo_me',
      alias: 'Yo',
      role: 'owner',
      backendMode: 'demo',
      active: true,
      privacy: {...defaultPrivacy},
      joinedAt: nowIso(),
      party: demo.party
    });
    renderGymParty();
    flashMessage('Modo demo activado. Estos datos son ficticios.');
  }

  function weekdayLabel(date){
    const labels = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
    return labels[dateFromString(date).getDay()];
  }

  function sessionSummaryFromExercises(session){
    const exercises = safeArray(session.exercises);
    const allSets = exercises.flatMap(exercise => safeArray(exercise.sets).map(set => ({...set, exercise})));
    const totalReps = allSets.reduce((sum, set) => sum + number(set.reps), 0);
    const totalVolume = allSets.reduce((sum, set) => sum + number(set.reps) * number(set.weight), 0);
    const metric=window.WORKOUT_METRICS?.calculateSessionMetrics?.(session)||{};
    return {
      totalSets: allSets.length,
      totalReps,
      totalVolume: Math.round(totalVolume),
      externalLoadVolume:Math.round(metric.externalLoadVolume??totalVolume),
      bodyweightReps:number(metric.bodyweightReps),
      addedLoadVolume:number(metric.addedLoadVolume),
      bestWeight:number(metric.bestWeight),
      bestSetVolume:number(metric.bestSetVolume),
      maxReps:number(metric.maxReps),
      exercisesCompleted: exercises.filter(exercise => exercise.completed || safeArray(exercise.sets).length > 0).length
    };
  }
  function sanitizeWorkoutSession(session, member, privacy){
    const summary = session.summary || sessionSummaryFromExercises(session);
    const hide = !!privacy.hideAbsoluteWeights;
    const startedAt = session.startedAt || session.savedAt || `${session.date || todayStr()}T00:00:00.000Z`;
    const finishedAt = session.finishedAt || null;
    const measuredDuration = number(summary.durationMinutes) || (finishedAt ? durationMinutes(startedAt, finishedAt) : 0);
    const time=syncEngine()?.timeContext?.(session.date||todayStr())||{localDate:session.date||todayStr(),timeZone:'UTC',utcOffset:0};
    return {
      id: `${member.partyId}_${member.userId}_${session.id}`,
      partyId: member.partyId,
      userId: member.userId,
      localSessionId: session.id,
      date: session.date || todayStr(),
      ...time,
      weekday: session.weekday || weekdayLabel(session.date || todayStr()),
      routineName: session.routine?.name || session.routine || session.routineName || 'Entrenamiento',
      startedAt,
      finishedAt,
      durationMinutes: Math.min(2880, Math.max(0, measuredDuration)),
      exercisesCompleted: number(summary.completedExercises ?? summary.exercisesCompleted),
      totalSets: number(summary.totalSets),
      totalReps: number(summary.totalReps) || totalRepsForSession(session),
      totalVolume: hide ? null : number(summary.totalVolume),
      externalLoadVolume:hide?null:number(summary.externalLoadVolume??summary.totalVolume),
      bodyweightReps:number(summary.bodyweightReps),
      addedLoadVolume:hide?null:number(summary.addedLoadVolume),
      bestWeight:hide?null:number(summary.bestWeight),
      bestSetVolume:hide?null:number(summary.bestSetVolume),
      maxReps:number(summary.maxReps),
      createdAt: session.startedAt || session.savedAt || nowIso(),
      updatedAt: nowIso(),
      source: 'local',
      pendingSync: member.backendMode === 'firebase'
    };
  }
  function sanitizeWorkoutSets(session, member, privacy){
    if(privacy.shareAggregateOnly || !privacy.shareSetDetails) return [];
    const hide = !!privacy.hideAbsoluteWeights;
    const time=syncEngine()?.timeContext?.(session.date||todayStr())||{localDate:session.date||todayStr(),timeZone:'UTC',utcOffset:0};
    return safeArray(session.exercises).flatMap(exercise => safeArray(exercise.sets).map((set, index) => ({
      id: `${member.partyId}_${member.userId}_${session.id}_${exercise.id || exercise.exerciseId}_${set.id || index + 1}`,
      partyId: member.partyId,
      sessionId: `${member.partyId}_${member.userId}_${session.id}`,
      userId: member.userId,
      localExerciseId: exercise.id || exercise.exerciseId || '',
      localSetId: set.id || '',
      exerciseId: exercise.exerciseId || exercise.id || '',
      exerciseName: exercise.name || 'Ejercicio',
      muscleGroup: exercise.muscle || exercise.group || 'General',
      setNumber: number(set.setNumber) || index + 1,
      reps: number(set.reps),
      weightKg: hide ? null : number(set.weight),
      rir: set.rir ?? null,
      rpe: set.rpe ?? null,
      isBodyweight: !!(set.bodyweight || exercise.bodyweight),
      date: session.date || todayStr(),
      ...time,
      createdAt: set.savedAt || session.startedAt || nowIso(),
      deleted: false,
      source: 'local',
      pendingSync: member.backendMode === 'firebase'
    })));
  }
  function legacySessionToWorkout(session){
    return {
      id: session.id,
      date: session.date,
      weekday: weekdayLabel(session.date),
      routine: {name: session.routine || 'Entrenamiento'},
      startedAt: session.savedAt || `${session.date}T00:00:00.000Z`,
      finishedAt: session.status === 'finalizado' ? session.savedAt : null,
      summary: {
        totalSets: safeArray(session.items).reduce((sum, item) => sum + number(item.sets), 0),
        totalReps: safeArray(session.items).reduce((sum, item) => sum + number(item.sets) * number(item.reps), 0),
        totalVolume: number(session.volume),
        exercisesCompleted: safeArray(session.items).length
      },
      exercises: safeArray(session.items).map(item => ({
        id: item.id,
        exerciseId: item.id,
        name: item.name,
        muscle: item.muscle,
        bodyweight: !!item.bodyweight,
        sets: Array.from({length: Math.max(0, number(item.sets))}, (_, index) => ({
          id: `${item.id}_${index + 1}`,
          setNumber: index + 1,
          reps: number(item.reps),
          weight: number(item.weight),
          rir: item.rir ?? null,
          bodyweight: !!item.bodyweight,
          savedAt: session.savedAt
        }))
      }))
    };
  }
  function totalRepsForSession(session){
    return safeArray(session.exercises).reduce((sum, exercise) => sum + safeArray(exercise.sets).reduce((inner, set) => inner + number(set.reps), 0), 0);
  }
  function durationMinutes(startedAt, finishedAt){
    if(!startedAt || !finishedAt) return 0;
    const diff = new Date(finishedAt) - new Date(startedAt);
    return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 60000)) : 0;
  }
  function localWorkoutSessions(){
    const primary = read(workoutKeys.workoutSessions, []);
    if(primary.length) return primary;
    return read(workoutKeys.gymSessions, []).map(legacySessionToWorkout);
  }
  function upsertById(existing, rows){
    const map = new Map(safeArray(existing).map(row => [row.id, row]));
    safeArray(rows).forEach(row => map.set(row.id, {...(map.get(row.id) || {}), ...row}));
    return [...map.values()].sort((a,b) => String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || '')));
  }
  function normalizeSessionsFromSets(sessions, rawSets){
    const bySession = {};
    const hasDetails = {};
    safeArray(rawSets).forEach(set => {
      if(!set.sessionId) return;
      hasDetails[set.sessionId] = true;
      if(set.deleted) return;
      bySession[set.sessionId] = bySession[set.sessionId] || [];
      bySession[set.sessionId].push(set);
    });
    return safeArray(sessions).map(session => {
      if(!hasDetails[session.id]) return session;
      const sets = bySession[session.id] || [];
      const exercises = new Set(sets.map(set => set.exerciseId || set.exerciseName).filter(Boolean));
      const totalReps = sets.reduce((sum,set) => sum + number(set.reps), 0);
      const totalVolume = sets.reduce((sum,set) => sum + number(set.reps) * number(set.weightKg), 0);
      const metric=window.WORKOUT_METRICS?.calculateSetsMetrics?.(sets.map(set=>({reps:set.reps,weightKg:set.weightKg,isBodyweight:set.isBodyweight})))||{};
      return {
        ...session,
        totalSets: sets.length,
        totalReps,
        totalVolume: Math.round(totalVolume),
        externalLoadVolume:Math.round(metric.externalLoadVolume??totalVolume),
        bodyweightReps:number(metric.bodyweightReps),
        addedLoadVolume:number(metric.addedLoadVolume),
        bestWeight:number(metric.bestWeight),
        bestSetVolume:number(metric.bestSetVolume),
        maxReps:number(metric.maxReps),
        exercisesCompleted: exercises.size
      };
    });
  }
  function localSetTombstones(existingSets, currentSessions, currentSets, member){
    if(member.backendMode !== 'firebase') return [];
    const currentSessionIds = new Set(currentSessions.map(row => row.id));
    const currentSetIds = new Set(currentSets.map(row => row.id));
    return safeArray(existingSets)
      .filter(row => row.partyId === member.partyId && row.userId === member.userId)
      .filter(row => currentSessionIds.has(row.sessionId) && !currentSetIds.has(row.id) && !row.deleted)
      .map(row => ({
        ...row,
        deleted: true,
        deletedAt:nowIso(),
        deletedReason:'set-deleted',
        revision:Math.max(1,number(row.revision)+1),
        pendingSync: true,
        dirty:true,
        syncState:'pending',
        source: 'local',
        updatedAt: nowIso()
      }));
  }
  function queueUpserts(type, rows){
    const queue = syncQueue();
    const map = new Map(queue.map(op => [op.id, op]));
    rows.filter(row=>row.dirty||row.pendingSync).forEach(row => {
      const id = `${type}:${row.id}`;
      const previous=map.get(id),sameRevision=number(previous?.payload?.revision)===number(row.revision);
      map.set(id,{id,type,collection:type==='session'?collections.sessions:collections.sets,payload:row,queuedAt:previous?.queuedAt||nowIso(),attempts:sameRevision?number(previous?.attempts):0,lastError:sameRevision?previous?.lastError||null:null,nextAttemptAt:sameRevision?previous?.nextAttemptAt||null:null});
    });
    saveSyncQueue([...map.values()]);
  }
  function syncFromLocalWorkouts({silent = false, queue = true} = {}){
    const m = activeMembership();
    if(!m || m.backendMode === 'demo') return {sessions: [], sets: []};
    const privacy = privacyForShare();
    if(!privacy.shareGymData) return {sessions: [], sets: []};
    const member = {partyId: m.partyId, userId: m.userId, backendMode: m.backendMode};
    const local = localWorkoutSessions();
    const sessionBase=local.map(session=>sanitizeWorkoutSession(session,member,privacy));
    const setBase=local.flatMap(session=>sanitizeWorkoutSets(session,member,privacy));
    const ownExistingSessions=sharedSessions().filter(row=>row.partyId===m.partyId&&row.userId===m.userId);
    const ownExistingSets=sharedSets().filter(row=>row.partyId===m.partyId&&row.userId===m.userId);
    const sessions=m.backendMode==='firebase'?(syncEngine()?.prepareLocalRows?.(sessionBase,ownExistingSessions)||sessionBase):sessionBase.map(row=>({...row,pendingSync:false,dirty:false,syncState:'local'}));
    const sets=m.backendMode==='firebase'?(syncEngine()?.prepareLocalRows?.(setBase,ownExistingSets)||setBase):setBase.map(row=>({...row,pendingSync:false,dirty:false,syncState:'local'}));
    const deletedSets=localSetTombstones(ownExistingSets,sessions,sets,member);
    const currentPreparedSetIds=new Set(sets.map(row=>row.id));
    const existingTombstones=ownExistingSets.filter(row=>(row.deleted||row.deletedAt)&&!currentPreparedSetIds.has(row.id));
    const withoutOwnSessions = sharedSessions().filter(row => !(row.partyId === m.partyId && row.userId === m.userId));
    const withoutOwnSets = sharedSets().filter(row => !(row.partyId === m.partyId && row.userId === m.userId));
    saveSharedSessions(upsertById(withoutOwnSessions, sessions));
    saveSharedSets(upsertById(withoutOwnSets,[...sets,...existingTombstones,...deletedSets]));
    if(queue && m.backendMode === 'firebase'){
      queueUpserts('session',sessions);
      queueUpserts('set',[...sets,...existingTombstones,...deletedSets]);
    }
    if(!silent && sessions.length) flashMessage('Entrenamientos de gym preparados para compartir.');
    return {sessions, sets};
  }

  function memberStats(member, sessions, sets, start){
    const weekSessions = sessions.filter(session => session.userId === member.userId && inWeek(session.date, start));
    const ids = new Set(weekSessions.map(session => session.id));
    const weekSets = sets.filter(set => set.userId === member.userId && (ids.has(set.sessionId) || inWeek(set.date, start)));
    const aggregate=window.GYM_PARTY_METRICS?.aggregateSets?.(weekSets)||null;
    const totalSets = weekSets.length ? (aggregate?.totalSets??weekSets.length) : weekSessions.reduce((sum, session) => sum + number(session.totalSets), 0);
    const totalReps = weekSets.length ? (aggregate?.totalReps??weekSets.reduce((sum, set) => sum + number(set.reps), 0)) : weekSessions.reduce((sum, session) => sum + number(session.totalReps), 0);
    const totalVolume = weekSets.length ? (aggregate?.totalVolume??weekSets.reduce((sum, set) => sum + number(set.reps) * number(set.weightKg), 0)) : weekSessions.reduce((sum, session) => sum + number(session.totalVolume), 0);
    const setMetrics=aggregate||window.WORKOUT_METRICS?.calculateSetsMetrics?.(weekSets.map(set=>({reps:set.reps,weightKg:set.weightKg,isBodyweight:set.isBodyweight})))||{bodyweightReps:weekSets.filter(set=>set.isBodyweight&&!number(set.weightKg)).reduce((sum,set)=>sum+number(set.reps),0),addedLoadVolume:weekSets.filter(set=>set.isBodyweight).reduce((sum,set)=>sum+number(set.reps)*number(set.weightKg),0),bestWeight:Math.max(0,...weekSets.map(set=>number(set.weightKg))),bestSetVolume:Math.max(0,...weekSets.map(set=>number(set.reps)*number(set.weightKg))),maxReps:Math.max(0,...weekSets.map(set=>number(set.reps)))};
    if(!weekSets.length){
      setMetrics.bodyweightReps=weekSessions.reduce((sum,session)=>sum+number(session.bodyweightReps),0);
      setMetrics.addedLoadVolume=weekSessions.reduce((sum,session)=>sum+number(session.addedLoadVolume),0);
      setMetrics.bestWeight=Math.max(0,...weekSessions.map(session=>number(session.bestWeight)));
      setMetrics.bestSetVolume=Math.max(0,...weekSessions.map(session=>number(session.bestSetVolume)));
      setMetrics.maxReps=Math.max(0,...weekSessions.map(session=>number(session.maxReps)));
    }
    const exercises = new Set(weekSets.map(set => set.exerciseId || set.exerciseName).filter(Boolean));
    const muscleVolume = aggregate?.muscleVolume||{};
    const bestByExercise = aggregate?.bestByExercise||{};
    if(!aggregate) weekSets.forEach(set => {
      const muscle = set.muscleGroup || 'General';
      muscleVolume[muscle] = (muscleVolume[muscle] || 0) + number(set.reps) * number(set.weightKg);
      const key = set.exerciseId || set.exerciseName;
      const volume = number(set.reps) * number(set.weightKg);
      const score = volume || number(set.reps);
      if(!bestByExercise[key] || score > bestByExercise[key].score) bestByExercise[key] = {...set, score, volume};
    });
    return {
      member,
      sessionsCount: weekSessions.length,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      exercisesCount: exercises.size || weekSessions.reduce((sum, session) => sum + number(session.exercisesCompleted), 0),
      consistencyScore: window.WORKOUT_METRICS?.consistency?.({plannedSessions:5,registeredSessions:weekSessions.length,plannedExercises:Math.max(weekSessions.length,weekSessions.reduce((sum,session)=>sum+number(session.exercisesCompleted),0)),completedExercises:weekSessions.reduce((sum,session)=>sum+number(session.exercisesCompleted),0),scheduledRestDays:2}).score ?? Math.min(100,Math.round(weekSessions.length*28)),
      plannedSessions:5,
      registeredSessions:weekSessions.length,
      scheduledRestDays:2,
      bodyweightReps:setMetrics.bodyweightReps||0,
      addedLoadVolume:setMetrics.addedLoadVolume||0,
      bestWeight:setMetrics.bestWeight||0,
      bestSetVolume:setMetrics.bestSetVolume||0,
      maxReps:setMetrics.maxReps||0,
      muscleVolume,
      bestByExercise,
      weekStart: start
    };
  }
  function streakWeeks(member, sessions, reference = weekStartStr(todayStr())){
    let streak = 0;
    let cursor = reference;
    for(let i = 0; i < 12; i++){
      const hasWeek = sessions.some(session => session.userId === member.userId && inWeek(session.date, cursor));
      if(!hasWeek) break;
      streak += 1;
      cursor = previousWeekStart(cursor);
    }
    return streak;
  }
  function dailyWorkoutStreak(member, sessions, reference = todayStr()){
    const dates = new Set(safeArray(sessions).filter(session => session.userId === member?.userId && session.date).map(session => String(session.date).slice(0,10)));
    let cursor = reference;
    if(!dates.has(cursor)) cursor = addDays(cursor, -1);
    let streak = 0;
    for(let i = 0; i < 365; i++){
      if(!dates.has(cursor)) break;
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }
  function calculatePartyStats(data, reference = todayStr()){
    const currentStart = weekStartStr(reference);
    const previousStart = previousWeekStart(currentStart);
    const members = safeArray(data?.members);
    const rawSets = safeArray(data?.sets);
    const sessions = normalizeSessionsFromSets(safeArray(data?.sessions), rawSets);
    const sets = rawSets.filter(set => !set.deleted);
    return members.map(member => {
      const current = memberStats(member, sessions, sets, currentStart);
      const previous = memberStats(member, sessions, sets, previousStart);
      return {
        member,
        current,
        previous,
        changeVsPreviousWeek: window.GYM_PARTY_METRICS?.changes?.(current,previous)||{
          sessions: current.sessionsCount - previous.sessionsCount,
          volumePct: percentChange(current.totalVolume, previous.totalVolume),
          setsPct: percentChange(current.totalSets, previous.totalSets)
        },
        streakWeeks: streakWeeks(member, sessions, currentStart)
      };
    });
  }

  function maxOf(rows, path){
    return Math.max(1, ...rows.map(row => path(row)));
  }
  function bar(value, max, label, unit = ''){
    const width = Math.max(3, Math.min(100, (number(value) / max) * 100));
    return `<div class="partyBarRow"><span>${escape(label)}</span><div class="partyBar"><i style="width:${width}%"></i></div><strong>${escape(formatNumber(value))}${unit}</strong></div>`;
  }
  function formatNumber(value){
    if(value === null || value === undefined) return 'oculto';
    return Math.round(number(value)).toLocaleString();
  }
  function signed(value, suffix = ''){
    if(value===null||value===undefined||Number.isNaN(Number(value))) return 'Sin base anterior';
    const n = number(value);
    if(!n) return `0${suffix}`;
    return `${n > 0 ? '+' : ''}${round(n, 1)}${suffix}`;
  }
  function statCard(label, value, helpId){
    if(window.GYM_PARTY_UI?.statCard) return window.GYM_PARTY_UI.statCard(label,value,helpId);
    return `<div class="quickStat"><span>${escape(label)} ${helpId ? `<button type="button" class="gymPartyHelp" data-party-help="${helpId}">?</button>` : ''}</span><strong>${escape(value)}</strong></div>`;
  }
  function privacyNotice(){
    return `<div class="safetyNote"><strong>Privacidad:</strong> Solo se compartirán los datos de entrenamiento que aceptes compartir con esta sala. Tus datos de nutrición, sueño, ansiedad, pantalla y notas personales no se compartirán salvo que lo actives explícitamente.</div>`;
  }
  function safetyNotice(){
    return `<div class="safetyNote">Esta función es para organizar y comparar entrenamientos de forma orientativa. No reemplaza asesoramiento de entrenador, médico o profesional de salud. Ajustá cargas según técnica, dolor, fatiga y seguridad.</div>`;
  }
  function privacyChecks(prefix, value = defaultPrivacy, options = {}){
    const p = {...defaultPrivacy, ...value};
    if(options.compact){
      return `
        <label class="check"><input type="checkbox" id="${prefix}ShareGym" ${p.shareGymData ? 'checked' : ''}><span>Compartir solo datos de entrenamiento con esta sala.</span></label>
        <input type="checkbox" id="${prefix}SetDetails" ${p.shareSetDetails ? 'checked' : ''} class="hidden">
        <input type="checkbox" id="${prefix}AggregateOnly" ${p.shareAggregateOnly ? 'checked' : ''} class="hidden">
        <input type="checkbox" id="${prefix}HideWeights" ${p.hideAbsoluteWeights ? 'checked' : ''} class="hidden">
        <input type="checkbox" id="${prefix}AnonymousAlias" ${p.anonymousAlias ? 'checked' : ''} class="hidden">
        <input type="checkbox" id="${prefix}GeneralScore" ${p.shareGeneralScore ? 'checked' : ''} class="hidden">
      `;
    }
    return `
      <label class="check"><input type="checkbox" id="${prefix}ShareGym" ${p.shareGymData ? 'checked' : ''}><span>Compartir datos de gym con esta sala.</span></label>
      <label class="check"><input type="checkbox" id="${prefix}SetDetails" ${p.shareSetDetails ? 'checked' : ''}><span>Compartir detalle de series, reps y kilos.</span></label>
      <label class="check"><input type="checkbox" id="${prefix}AggregateOnly" ${p.shareAggregateOnly ? 'checked' : ''}><span>Compartir solo estadísticas agregadas.</span></label>
      <label class="check"><input type="checkbox" id="${prefix}HideWeights" ${p.hideAbsoluteWeights ? 'checked' : ''}><span>Ocultar pesos absolutos.</span></label>
      <label class="check"><input type="checkbox" id="${prefix}AnonymousAlias" ${p.anonymousAlias ? 'checked' : ''}><span>Mostrar alias anónimo.</span></label>
      <label class="check"><input type="checkbox" id="${prefix}GeneralScore" ${p.shareGeneralScore ? 'checked' : ''}><span>Compartir score general opcional (apagado por defecto).</span></label>
    `;
  }
  function noRoomHtml(){
    const cfg = settings().firebaseConfig || {};
    const cfgText = Object.keys(cfg).length ? JSON.stringify(cfg, null, 2) : '';
    const cfgSource = firebaseConfigSource();
    const backendDefault = cfgSource === 'missing' ? 'local' : 'firebase';
    const onlineReady = cfgSource !== 'missing';
    const cfgStatus = cfgSource === 'bundled'
      ? 'Sala online lista: Firebase ya está configurado en esta versión.'
      : cfgSource === 'local'
        ? 'Sala online lista: Firebase guardado localmente en este dispositivo.'
        : 'Firebase no configurado. Podés probar demo/local, pero para invitar otro teléfono hace falta Firebase.';
    return `
      <div class="partyGrid">
        <div class="moduleCard partyHeroCard">
          <h3>Sesión privada compartida</h3>
          <p class="muted small">Flujo simple: creás un código, se lo mandás a tu amigo y ambos registran entrenamiento. La app compara progreso sin lenguaje de culpa.</p>
          <div class="auditItem good">${escape(cfgStatus)}</div>
          <div class="entryList">
            <div class="entryRow"><div><strong>1. Creá la sala</strong><div class="meta">Elegí tu alias y tocá crear código.</div></div><span class="statusChip good">online</span></div>
            <div class="entryRow"><div><strong>2. Mandá el código</strong><div class="meta">Tu amigo abre la web en iPhone/Safari y entra con ese código.</div></div><span class="statusChip">privado</span></div>
            <div class="entryRow"><div><strong>3. Registren entrenamientos</strong><div class="meta">Se sincronizan series, reps, kilos, volumen y progreso semanal.</div></div><span class="statusChip good">gym</span></div>
          </div>
          ${privacyNotice()}
          ${safetyNotice()}
          <div class="buttons">
            <button type="button" class="good" data-gym-party-action="demo2">Probar modo demo</button>
            <button type="button" class="secondary" data-gym-party-action="demo5">Demo con más amigos</button>
          </div>
        </div>
        <div class="moduleCard">
          <h3>Crear sala</h3>
          <p class="muted small">Usá esta opción si vos vas a iniciar la sala. La app genera un código privado para enviárselo a tu amigo.</p>
          <div class="formGrid">
            <div class="field"><label>Nombre de la sala</label><input type="text" id="gymPartyCreateName" placeholder="Ej. Entreno con Juan"></div>
            <div class="field"><label>Tu alias visible</label><input type="text" id="gymPartyCreateAlias" placeholder="Ej. Nico"></div>
            <input type="hidden" id="gymPartyCreateBackend" value="${backendDefault}">
            <input type="hidden" id="gymPartyCreatePrivacy" value="gym-only">
          </div>
          <div class="checks">${privacyChecks('create', defaultPrivacy, {compact: true})}</div>
          <div class="buttons"><button type="button" class="good" data-gym-party-action="create">${onlineReady ? 'Crear sala y generar código' : 'Crear sala local/demo'}</button></div>
        </div>
        <div class="moduleCard">
          <h3>Entrar con código</h3>
          <p class="muted small">Usá esta opción si tu amigo ya creó la sala y te pasó el código.</p>
          <div class="formGrid">
            <div class="field"><label>Código de invitación</label><input type="text" id="gymPartyJoinCode" placeholder="Ej. A1B2C3"></div>
            <div class="field"><label>Tu alias visible</label><input type="text" id="gymPartyJoinAlias" placeholder="Ej. Juan"></div>
            <input type="hidden" id="gymPartyJoinBackend" value="${backendDefault}">
          </div>
          <div class="checks">${privacyChecks('join', defaultPrivacy, {compact: true})}</div>
          <div class="buttons"><button type="button" class="good" data-gym-party-action="join">Entrar a la sala</button></div>
        </div>
        <div class="moduleCard">
          <details>
            <summary><strong>Configuración avanzada</strong></summary>
            <p class="muted small">En la web publicada Firebase ya viene configurado. Esta sección queda solo para pruebas locales o diagnóstico.</p>
            <div class="field"><label>Configuración web JSON</label><textarea id="gymPartyFirebaseConfig" class="planEditorTextarea" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'>${escape(cfgText)}</textarea></div>
            <div class="buttons">
              <button type="button" class="secondary" data-gym-party-action="save-firebase">Guardar configuración Firebase</button>
              <button type="button" class="secondary" data-gym-party-action="login-firebase">Probar login anónimo</button>
              <button type="button" class="danger" data-gym-party-action="clear-firebase">Quitar configuración</button>
            </div>
            <div class="auditItem" id="gymPartyFirebaseStatus">${escape(cfgStatus)}</div>
          </details>
        </div>
      </div>
    `;
  }
  function noRoomHtmlSimple(){
    const cfg = settings().firebaseConfig || {};
    const cfgText = Object.keys(cfg).length ? JSON.stringify(cfg, null, 2) : '';
    const cfgSource = firebaseConfigSource();
    const backendDefault = cfgSource === 'missing' ? 'local' : 'firebase';
    const onlineReady = cfgSource !== 'missing';
    const cfgStatus = onlineReady ? 'Online listo' : 'Modo local/demo';
    const pendingCode=normalizeCode(settings().pendingInviteCode||'');
    return `
      <div class="partySimpleShell">
        <div class="moduleCard partyStartCard">
          <span class="partyStepPill">${escape(cfgStatus)}</span>
          <h2>Entrenar con un amigo</h2>
          <p class="partyLead">Crea un codigo, mandaselo a tu amigo y listo.</p>
          <div class="partyMiniSteps">
            <span>1 Crear codigo</span>
            <span>2 Enviar</span>
            <span>3 Entrenar</span>
          </div>
          <div class="partyFormCard">
            <h3>Crear mi sala</h3>
            <div class="field"><label>Tu alias</label><input type="text" id="gymPartyCreateAlias" placeholder="Ej. Nico"></div>
            <div class="field"><label>Nombre de sala <span class="muted small">(opcional)</span></label><input type="text" id="gymPartyCreateName" placeholder="Gym Party"></div>
            <input type="hidden" id="gymPartyCreateBackend" value="${backendDefault}">
            <input type="hidden" id="gymPartyCreatePrivacy" value="gym-only">
            <div class="checks">${privacyChecks('create', defaultPrivacy, {compact: true})}</div>
            <button type="button" class="good partyPrimaryAction" data-gym-party-action="create">${onlineReady ? 'Crear codigo para invitar' : 'Crear sala local/demo'}</button>
          </div>
          <details class="partyFold" ${pendingCode?'open':''}>
            <summary>Ya tengo un codigo</summary>
            <div class="partyFormCard flat">
              <div class="field"><label>Codigo</label><input type="text" id="gymPartyJoinCode" value="${escape(pendingCode)}" placeholder="Ej. A1B2C3"></div>
              <div class="field"><label>Tu alias</label><input type="text" id="gymPartyJoinAlias" placeholder="Ej. Juan"></div>
              <input type="hidden" id="gymPartyJoinBackend" value="${backendDefault}">
              <div class="checks">${privacyChecks('join', defaultPrivacy, {compact: true})}</div>
              <button type="button" class="good partyPrimaryAction" data-gym-party-action="join">Entrar</button>
            </div>
          </details>
          <details class="partyFold">
            <summary>Entrar desde otro dispositivo</summary>
            <div class="partyFormCard flat">
              ${portableAccessFormHtml({mode: 'restore'})}
            </div>
          </details>
          <details class="partyFold">
            <summary>Probar demo</summary>
            <div class="buttons partySecondaryActions">
              <button type="button" class="secondary" data-gym-party-action="demo2">Demo simple</button>
              <button type="button" class="secondary" data-gym-party-action="demo5">Demo grupo</button>
            </div>
          </details>
          <details class="partyFold">
            <summary>Privacidad y ajustes</summary>
            ${privacyNotice()}
            ${safetyNotice()}
            <details class="partyNestedFold">
              <summary>Firebase avanzado</summary>
              <div class="field"><label>Configuracion web JSON</label><textarea id="gymPartyFirebaseConfig" class="planEditorTextarea" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'>${escape(cfgText)}</textarea></div>
              <div class="buttons partySecondaryActions">
                <button type="button" class="secondary" data-gym-party-action="save-firebase">Guardar Firebase</button>
                <button type="button" class="secondary" data-gym-party-action="login-firebase">Probar login</button>
                <button type="button" class="danger" data-gym-party-action="clear-firebase">Quitar Firebase</button>
              </div>
              <div class="auditItem" id="gymPartyFirebaseStatus">${escape(cfgStatus)}</div>
            </details>
          </details>
        </div>
      </div>
    `;
  }
  function memberCardsHtml(data, stats){
    const maxVolume = maxOf(stats, row => row.current.totalVolume);
    return `<div class="partyMembers">${stats.map(row => {
      const label = memberDisplayName(row.member, data);
      return `<div class="partyMemberCard">
        <div class="actionFocusTop"><div><strong>${escape(label)}</strong><div class="muted small">${escape(row.member.role || 'member')} · racha ${row.streakWeeks} semana(s)</div></div><span class="statusChip good">${row.current.consistencyScore}/100</span></div>
        <div class="quickStats">
          ${statCard('Sesiones semana', row.current.sessionsCount, 'consistency')}
          ${statCard('Series', row.current.totalSets, 'sets')}
          ${statCard('Reps', row.current.totalReps, 'reps')}
          ${statCard('Progreso', metricVolumeText(row.current), 'volume')}
        </div>
        <div class="comparisonBars">${bar(row.current.totalVolume, maxVolume, 'Volumen', ' kg')}</div>
        <div class="muted small">Cambio vs semana pasada: volumen ${signed(row.changeVsPreviousWeek.volumePct, '%')} · series ${signed(row.changeVsPreviousWeek.setsPct, '%')}.</div>
      </div>`;
    }).join('')}</div>`;
  }
  function twoMemberComparisonHtml(data, stats){
    if(stats.length !== 2) return '';
    const [a,b] = stats;
    const av = a.current.totalVolume;
    const bv = b.current.totalVolume;
    const diff = av - bv;
    return `<div class="moduleCard">
      <h3>Yo vs Amigo · comparación útil</h3>
      <div class="partyCompareGrid">
        <div class="partyCompareCard"><span>Yo</span><strong>${metricVolumeText(a.current)}</strong><small>${a.current.sessionsCount} sesiones · ${a.current.totalSets} series</small></div>
        <div class="partyCompareCard"><span>Amigo</span><strong>${metricVolumeText(b.current)}</strong><small>${b.current.sessionsCount} sesiones · ${b.current.totalSets} series</small></div>
        <div class="partyCompareCard"><span>Diferencia visible</span><strong>${signed(diff)} kg</strong><small>Más volumen no siempre significa mejor.</small></div>
        <div class="partyCompareCard"><span>Cambio propio</span><strong>${signed(a.changeVsPreviousWeek.volumePct, '%')}</strong><small>Tu referencia principal es tu semana pasada.</small></div>
      </div>
    </div>`;
  }
  function multiMemberHtml(data, stats){
    if(stats.length < 3) return '';
    const byConsistency = stats.slice().sort((a,b) => b.current.consistencyScore - a.current.consistencyScore).slice(0,5);
    const byImprovement = stats.slice().sort((a,b) => b.changeVsPreviousWeek.volumePct - a.changeVsPreviousWeek.volumePct).slice(0,5);
    return `<div class="moduleCard">
      <h3>Vista de grupo</h3>
      <div class="partyGrid compact">
        <div>${rankingList('Constancia semanal', byConsistency, data, row => `${row.current.consistencyScore}/100`)}</div>
        <div>${rankingList('Mejora relativa', byImprovement, data, row => signed(row.changeVsPreviousWeek.volumePct, '%'))}</div>
      </div>
      <div class="muted small">Para mantener claridad, si hay muchos miembros se muestran top 5 y comparaciones resumidas.</div>
    </div>`;
  }
  function rankingList(title, rows, data, valueFn){
    return `<div class="entryList"><h3>${escape(title)}</h3>${rows.map((row,index) => `<div class="entryRow"><div><strong>${index + 1}. ${escape(memberDisplayName(row.member, data))}</strong><div class="meta">Comparación sana y orientativa.</div></div><span class="statusChip good">${escape(valueFn(row))}</span></div>`).join('')}</div>`;
  }
  const muscleMapTargets = [
    {key:'Pecho', label:'Pecho', x:50, y:29, labelX:7, labelY:16, anchorX:28, anchorY:24},
    {key:'Espalda', label:'Espalda', x:50, y:39, labelX:70, labelY:18, anchorX:70, anchorY:26},
    {key:'Hombro', label:'Hombro', x:33, y:31, labelX:7, labelY:34, anchorX:28, anchorY:38},
    {key:'Biceps', label:'Biceps', x:26, y:43, labelX:5, labelY:52, anchorX:27, anchorY:55},
    {key:'Triceps', label:'Triceps', x:74, y:43, labelX:70, labelY:42, anchorX:70, anchorY:47},
    {key:'Cuadriceps / pierna', label:'Cuadriceps', x:43, y:67, labelX:5, labelY:70, anchorX:29, anchorY:73},
    {key:'Aductores', label:'Aductores', x:51, y:69, labelX:70, labelY:62, anchorX:70, anchorY:66},
    {key:'Pantorrillas', label:'Pantorrillas', x:43, y:88, labelX:6, labelY:88, anchorX:29, anchorY:91},
    {key:'Tibial anterior', label:'Tibial', x:57, y:84, labelX:70, labelY:82, anchorX:70, anchorY:86}
  ];
  function normalizeTextBasic(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function canonicalMuscleName(value){
    const text = normalizeTextBasic(value);
    if(!text) return 'General';
    if(text.includes('pecho')) return 'Pecho';
    if(text.includes('espalda') || text.includes('dorsal') || text.includes('jalon') || text.includes('remo')) return 'Espalda';
    if(text.includes('hombro') || text.includes('deltoide')) return 'Hombro';
    if(text.includes('biceps') || text.includes('braquial')) return 'Biceps';
    if(text.includes('triceps')) return 'Triceps';
    if(text.includes('cuadriceps') || text.includes('pierna') || text.includes('prensa')) return 'Cuadriceps / pierna';
    if(text.includes('aductor')) return 'Aductores';
    if(text.includes('pantorrilla') || text.includes('soleo') || text.includes('gemelo')) return 'Pantorrillas';
    if(text.includes('tibial')) return 'Tibial anterior';
    if(text.includes('movilidad') || text.includes('recuperacion')) return 'Movilidad';
    return String(value || 'General').trim() || 'General';
  }
  function setVolume(set){ return number(set.reps) * number(set.weightKg); }
  function emptyMuscleTotals(key){
    return {key, sets:0, reps:0, volume:0, externalLoadVolume:0, bodyweightReps:0, addedLoadVolume:0, exercises:new Set(), best:null};
  }
  function addSetToMuscleTotals(total, set){
    total.sets += 1;
    total.reps += number(set.reps);
    total.volume += setVolume(set);
    total.externalLoadVolume += setVolume(set);
    if(set.isBodyweight&&!number(set.weightKg)) total.bodyweightReps += number(set.reps);
    if(set.isBodyweight&&number(set.weightKg)>0) total.addedLoadVolume += setVolume(set);
    if(set.exerciseName || set.exerciseId) total.exercises.add(set.exerciseName || set.exerciseId);
    const score = setVolume(set) || number(set.reps);
    if(!total.best || score > total.best.score) total.best = {...set, score};
    return total;
  }
  function finalizeMuscleTotals(total){
    return {
      ...total,
      volume: Math.round(total.volume),
      externalLoadVolume:Math.round(total.externalLoadVolume),
      addedLoadVolume:Math.round(total.addedLoadVolume),
      exercisesCount: total.exercises.size,
      exercises: [...total.exercises].sort()
    };
  }
  function totalsFromSets(key, rows){
    return finalizeMuscleTotals(safeArray(rows).reduce((total,set) => addSetToMuscleTotals(total,set), emptyMuscleTotals(key)));
  }
  function bestWeightFromSets(rows){
    const values = safeArray(rows).map(set => number(set.weightKg)).filter(value => value > 0);
    return values.length ? Math.max(...values) : 0;
  }
  function bestStrengthSet(rows){
    return safeArray(rows).slice().sort((a,b) => {
      const weightDiff = number(b.weightKg) - number(a.weightKg);
      if(weightDiff) return weightDiff;
      return number(b.reps) - number(a.reps);
    })[0] || null;
  }
  function strengthSetText(set){
    if(!set) return 'Sin dato';
    const weight = number(set.weightKg);
    return weight ? `${round(weight,1)} kg x ${number(set.reps)} reps` : `${number(set.reps)} reps peso corporal`;
  }
  function weekLabel(start, currentStart){
    if(start === currentStart) return 'Esta';
    const d = dateFromString(start);
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
  }
  function exerciseSummaryRows(currentSets, previousSets){
    const map = {};
    function rowFor(set){
      const key = set.exerciseId || set.exerciseName || 'ejercicio';
      if(!map[key]){
        map[key] = {
          id:key,
          name:set.exerciseName || set.exerciseId || 'Ejercicio',
          currentSets:0,
          previousSets:0,
          currentReps:0,
          previousReps:0,
          currentVolume:0,
          previousVolume:0,
          currentRows:[],
          previousRows:[]
        };
      }
      return map[key];
    }
    safeArray(currentSets).forEach(set => {
      const row = rowFor(set);
      row.currentSets += 1;
      row.currentReps += number(set.reps);
      row.currentVolume += setVolume(set);
      row.currentRows.push(set);
    });
    safeArray(previousSets).forEach(set => {
      const row = rowFor(set);
      row.previousSets += 1;
      row.previousReps += number(set.reps);
      row.previousVolume += setVolume(set);
      row.previousRows.push(set);
    });
    return Object.values(map).map(row => {
      const currentBestSet = bestStrengthSet(row.currentRows);
      const previousBestSet = bestStrengthSet(row.previousRows);
      const currentBestWeight = bestWeightFromSets(row.currentRows);
      const previousBestWeight = bestWeightFromSets(row.previousRows);
      return {
        ...row,
        sets: row.currentSets,
        reps: row.currentReps,
        volume: Math.round(row.currentVolume),
        previousVolume: Math.round(row.previousVolume),
        currentVolume: Math.round(row.currentVolume),
        currentBestSet,
        previousBestSet,
        best: currentBestSet,
        currentBestWeight,
        previousBestWeight,
        hasPrevious:row.previousRows.length>0,
        bestWeightDelta:row.previousRows.length?round(currentBestWeight - previousBestWeight, 1):null,
        setsDelta: row.currentSets - row.previousSets,
        repsDelta: row.currentReps - row.previousReps,
        volumeChangePct: percentChange(row.currentVolume, row.previousVolume)
      };
    }).sort((a,b) => b.currentSets - a.currentSets || b.currentVolume - a.currentVolume || b.currentBestWeight - a.currentBestWeight);
  }
  function muscleInsightModel(data, stats = calculatePartyStats(data), selectedMuscle = '', reference = todayStr()){
    const currentStart = weekStartStr(reference);
    const previousStart = previousWeekStart(currentStart);
    const members = safeArray(data?.members);
    const sets = safeArray(data?.sets).filter(set => !set.deleted).map(set => ({...set, canonicalMuscle: canonicalMuscleName(set.muscleGroup)}));
    const targetKeys = muscleMapTargets.map(item => item.key);
    const currentByMuscle = {};
    sets.filter(set => inWeek(set.date, currentStart)).forEach(set => {
      const key = set.canonicalMuscle;
      currentByMuscle[key] = addSetToMuscleTotals(currentByMuscle[key] || emptyMuscleTotals(key), set);
    });
    targetKeys.forEach(key => { if(!currentByMuscle[key]) currentByMuscle[key] = emptyMuscleTotals(key); });
    const muscleRows = Object.values(currentByMuscle).map(finalizeMuscleTotals).sort((a,b) => b.sets - a.sets || b.volume - a.volume || a.key.localeCompare(b.key));
    const firstWithData = muscleRows.find(row => row.sets > 0)?.key || targetKeys[0];
    const selected = muscleRows.some(row => row.key === selectedMuscle) ? selectedMuscle : firstWithData;
    const currentSets = sets.filter(set => set.canonicalMuscle === selected && inWeek(set.date, currentStart));
    const previousSets = sets.filter(set => set.canonicalMuscle === selected && inWeek(set.date, previousStart));
    const currentTotal = totalsFromSets(selected, currentSets);
    const previousTotal = totalsFromSets(selected, previousSets);
    const weeklyRows = Array.from({length:6}, (_, index) => {
      const weekStart = addDays(currentStart, (index - 5) * 7);
      const weekSets = sets.filter(set => set.canonicalMuscle === selected && inWeek(set.date, weekStart));
      const total = totalsFromSets(selected, weekSets);
      const bestSet = bestStrengthSet(weekSets);
      return {
        weekStart,
        label: weekLabel(weekStart, currentStart),
        sets: total.sets,
        reps: total.reps,
        volume: total.volume,
        bestWeight: bestWeightFromSets(weekSets),
        bestSet,
        bestSetText: strengthSetText(bestSet)
      };
    });
    const exerciseRows = exerciseSummaryRows(currentSets, previousSets);
    const memberRows = members.map(member => {
      const currentMemberSets = currentSets.filter(set => set.userId === member.userId);
      const previousMemberSets = previousSets.filter(set => set.userId === member.userId);
      const total = totalsFromSets(selected, currentMemberSets);
      const previous = totalsFromSets(selected, previousMemberSets);
      const bestWeight = bestWeightFromSets(currentMemberSets);
      const previousBestWeight = bestWeightFromSets(previousMemberSets);
      return {
        member,
        label: memberDisplayName(member, data),
        sets: total.sets,
        reps: total.reps,
        volume: total.volume,
        exercisesCount: total.exercisesCount,
        bestWeight,
        bestWeightDelta: round(bestWeight - previousBestWeight, 1),
        changeVsPreviousWeek: percentChange(total.volume || total.bodyweightReps || total.reps, previous.volume || previous.bodyweightReps || previous.reps)
      };
    }).sort((a,b) => b.sets - a.sets || b.volume - a.volume);
    return {
      selected,
      currentStart,
      previousStart,
      muscleRows,
      currentTotal,
      previousTotal,
      weeklyRows,
      exerciseRows,
      memberRows,
      totalMusclesWithData: muscleRows.filter(row => row.sets > 0).length,
      hasData: currentSets.length > 0 || sets.length > 0,
      changeVsPreviousWeek: {
        sets: currentTotal.sets - previousTotal.sets,
        volumePct: percentChange(currentTotal.volume, previousTotal.volume)
      }
    };
  }
  function partyHumanSvg(model){
    const byKey = new Map(model.muscleRows.map(row => [row.key, row]));
    const maxSets = Math.max(1, ...model.muscleRows.map(row => row.sets));
    return `<div class="partyHumanCanvas">
      <svg class="partyHumanSvg" viewBox="0 0 100 110" role="img" aria-label="Mapa muscular semanal">
        <defs>
          <linearGradient id="partyBodyGlow" x1="0" x2="1"><stop offset="0%" stop-color="#72d6ff"/><stop offset="100%" stop-color="#92ffc2"/></linearGradient>
          <linearGradient id="partyBodySkin" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,.16)"/><stop offset="100%" stop-color="rgba(255,255,255,.045)"/></linearGradient>
        </defs>
        <ellipse class="partyBodyPart head" cx="50" cy="10" rx="7.4" ry="8.4"></ellipse>
        <path class="partyBodyPart neck" d="M44 18 Q50 21 56 18 L58 25 Q50 29 42 25 Z"></path>
        <path class="partyBodyPart torso" d="M29 29 Q38 23 50 24 Q62 23 71 29 Q66 43 63 57 Q59 68 50 70 Q41 68 37 57 Q34 43 29 29 Z"></path>
        <path class="partyBodyShade" d="M36 31 Q43 28 49 34 L49 47 Q41 45 34 39 Z"></path>
        <path class="partyBodyShade" d="M64 31 Q57 28 51 34 L51 47 Q59 45 66 39 Z"></path>
        <path class="partyBodyShade" d="M42 50 Q50 54 58 50 L55 64 Q50 67 45 64 Z"></path>
        <path class="partyBodyPart arm" d="M29 31 Q19 39 21 55 Q22 66 28 67 Q29 55 35 39 Z"></path>
        <path class="partyBodyPart forearm" d="M27 64 Q20 73 22 86 Q26 90 31 85 Q31 73 32 66 Z"></path>
        <path class="partyBodyPart arm" d="M71 31 Q81 39 79 55 Q78 66 72 67 Q71 55 65 39 Z"></path>
        <path class="partyBodyPart forearm" d="M73 64 Q80 73 78 86 Q74 90 69 85 Q69 73 68 66 Z"></path>
        <path class="partyBodyPart pelvis" d="M39 68 Q50 73 61 68 L65 78 Q57 84 50 83 Q43 84 35 78 Z"></path>
        <path class="partyBodyPart leg" d="M38 78 Q32 91 35 106 Q41 108 45 104 Q45 91 50 82 Z"></path>
        <path class="partyBodyPart leg" d="M62 78 Q68 91 65 106 Q59 108 55 104 Q55 91 50 82 Z"></path>
        <path class="partyBodyShade" d="M36 82 Q42 86 44 101 Q39 104 36 101 Q34 90 36 82 Z"></path>
        <path class="partyBodyShade" d="M64 82 Q58 86 56 101 Q61 104 64 101 Q66 90 64 82 Z"></path>
        ${muscleMapTargets.map(target => {
          const row = byKey.get(target.key) || {sets:0};
          const active = target.key === model.selected;
          const opacity = Math.max(.18, Math.min(1, row.sets / maxSets));
          return `<line class="partyMuscleLine ${active ? 'on' : ''}" x1="${target.x}" y1="${target.y}" x2="${target.anchorX}" y2="${target.anchorY}"></line><circle class="partyMuscleDot ${active ? 'on' : ''}" cx="${target.x}" cy="${target.y}" r="${active ? 4.3 : 3.2}" style="opacity:${opacity}"></circle>`;
        }).join('')}
      </svg>
      ${muscleMapTargets.map(target => {
        const row = byKey.get(target.key) || {sets:0, volume:0};
        const active = target.key === model.selected;
        return `<button type="button" class="partyMuscleButton ${active ? 'on' : ''}" style="left:${target.labelX}%;top:${target.labelY}%" data-gym-party-action="party-select-muscle" data-gym-party-muscle="${escape(target.key)}"><strong>${escape(target.label)}</strong><span>${row.sets || 0} series</span></button>`;
      }).join('')}
    </div>`;
  }
  function weekBarHtml(rows, key, unit = ''){
    const max = Math.max(1, ...safeArray(rows).map(row => number(row[key])));
    return `<div class="partyWeekBars">${safeArray(rows).map(row => {
      const value = number(row[key]);
      const height = Math.max(5, Math.min(100, (value / max) * 100));
      return `<div class="partyWeekBarItem"><div class="partyWeekBar"><i style="height:${height}%"></i></div><span>${escape(row.label)}</span><strong>${escape(formatNumber(value))}${unit}</strong></div>`;
    }).join('')}</div>`;
  }
  function muscleMapHtml(data, stats, reference = selectedWorkoutDate()){
    const model = muscleInsightModel(data, stats, settings().selectedMuscleGroup || '', reference);
    const maxMemberSets = Math.max(1, ...model.memberRows.map(row => row.sets));
    const topExercises = model.exerciseRows.slice(0,5);
    const selectedExercise = settings().selectedExerciseId || '';
    const exerciseText = topExercises.length
      ? topExercises.map(row => `<div class="partyExerciseCompareCard ${selectedExercise === row.id ? 'on' : ''}">
          <div class="actionFocusTop">
            <div><strong>${escape(row.name)}</strong><div class="meta">Esta semana vs semana anterior</div></div>
            <button type="button" class="secondary" data-gym-party-action="party-compare-exercise" data-gym-party-exercise="${escape(row.id)}" data-gym-party-muscle="${escape(model.selected)}">Comparar ejercicio</button>
          </div>
          <div class="partyExerciseMetricGrid">
            <div><span>Series</span><strong>${row.currentSets}</strong><small>${signed(row.setsDelta)}</small></div>
            <div><span>Reps</span><strong>${row.currentReps}</strong><small>${signed(row.repsDelta)}</small></div>
            <div><span>Mejor peso</span><strong>${row.currentBestWeight ? `${formatNumber(row.currentBestWeight)} kg` : 'peso corporal'}</strong><small>${signed(row.bestWeightDelta, ' kg')}</small></div>
            <div><span>Volumen</span><strong>${formatNumber(row.currentVolume)} kg</strong><small>${signed(row.volumeChangePct, '%')}</small></div>
          </div>
          <div class="muted small">Mejor serie: ${escape(strengthSetText(row.currentBestSet))}. Previa: ${escape(strengthSetText(row.previousBestSet))}.</div>
        </div>`).join('')
      : '<div class="emptyState">Todavia no hay ejercicios compartidos para este musculo esta semana.</div>';
    return `<div class="moduleCard partyMuscleMapCard" id="partyMuscleMap">
      <div class="actionFocusTop">
        <div><span class="partyStepPill">Mapa muscular</span><h3>Analisis por musculo</h3><div class="muted small">Toca un musculo para ver series semanales, ejercicios y comparacion por miembro.</div></div>
        <span class="statusChip good">${model.totalMusclesWithData} activo(s)</span>
      </div>
      <div class="partyMuscleMapShell">
        <div class="partyHumanPanel">${partyHumanSvg(model)}</div>
        <div class="partyMuscleInsight">
          <div class="actionFocusTop"><div><span class="muted small">Foco seleccionado</span><h3>${escape(model.selected)}</h3></div><button type="button" class="secondary" data-gym-party-action="party-focus-muscle-compare" data-gym-party-muscle="${escape(model.selected)}">Comparar</button></div>
          <div class="partyCompareGrid compact">
            <div class="partyCompareCard"><span>Series semana</span><strong>${model.currentTotal.sets}</strong><small>${signed(model.changeVsPreviousWeek.sets)} vs previa</small></div>
            <div class="partyCompareCard"><span>Ejercicios</span><strong>${model.currentTotal.exercisesCount}</strong><small>distintos</small></div>
            <div class="partyCompareCard"><span>Reps</span><strong>${model.currentTotal.reps}</strong><small>registradas</small></div>
            <div class="partyCompareCard"><span>Progreso</span><strong>${metricVolumeText(model.currentTotal)}</strong><small>${signed(model.changeVsPreviousWeek.volumePct, '%')} vs previa</small></div>
          </div>
          <div class="partyMuscleChartGrid">
            <div class="partyMiniChart"><h3>Series por semana</h3>${weekBarHtml(model.weeklyRows, 'sets')}</div>
            <div class="partyMiniChart"><h3>Volumen por semana</h3>${weekBarHtml(model.weeklyRows, 'volume', ' kg')}</div>
            <div class="partyMiniChart"><h3>Mejor peso registrado</h3>${weekBarHtml(model.weeklyRows, 'bestWeight', ' kg')}</div>
          </div>
          <div class="partyMuscleCompare">
            <h3>Comparacion por miembro</h3>
            <div class="comparisonBars">${model.memberRows.map(row => bar(row.sets, maxMemberSets, `${row.label} - ${row.exercisesCount} ej. - ${formatNumber(row.bestWeight)} kg`, ' series')).join('') || '<div class="emptyState">Sin miembros para comparar.</div>'}</div>
          </div>
          <div class="partyMuscleExerciseList"><h3>Ejercicios del musculo</h3>${exerciseText}</div>
          <div class="muted small">Mas series o volumen no siempre significa mejor. Usalo para ver equilibrio y tendencia, no para forzar carga.</div>
        </div>
      </div>
    </div>`;
  }
  function chartsHtml(data, stats){
    const maxVolume = maxOf(stats, row => row.current.totalVolume);
    const maxSets = maxOf(stats, row => row.current.totalSets);
    const maxSessions = maxOf(stats, row => row.current.sessionsCount);
    const maxBodyweightReps=maxOf(stats,row=>row.current.bodyweightReps);
    return `<div class="moduleCard">
      <h3>Gráficas comparativas</h3>
      <div class="partyChartGrid">
        <div><h3>Volumen semanal ${helpButton('volume')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.totalVolume, maxVolume, memberDisplayName(row.member, data), ' kg')).join('')}</div></div>
        <div><h3>Series semanales ${helpButton('sets')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.totalSets, maxSets, memberDisplayName(row.member, data))).join('')}</div></div>
        <div><h3>Sesiones por semana ${helpButton('consistency')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.sessionsCount, maxSessions, memberDisplayName(row.member, data))).join('')}</div></div>
        <div><h3>Reps de peso corporal ${helpButton('reps')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.bodyweightReps, maxBodyweightReps, memberDisplayName(row.member, data), ' reps')).join('')}</div></div>
        <div><h3>Cambio vs semana anterior ${helpButton('change')}</h3><div class="comparisonBars">${stats.map(row => bar(Math.abs(row.changeVsPreviousWeek.volumePct), 100, `${memberDisplayName(row.member, data)} ${signed(row.changeVsPreviousWeek.volumePct, '%')}`)).join('')}</div></div>
      </div>
      <div class="muted small">Compartir progreso, no competir a ciegas. La constancia también cuenta.</div>
    </div>`;
  }
  function helpButton(id){ return window.GYM_PARTY_UI?.helpButton?.(id)??`<button type="button" class="gymPartyHelp" data-party-help="${id}">?</button>`; }
  function exerciseProgressHtml(data){
    const sets = safeArray(data.sets).filter(set => !set.deleted);
    const options = [...new Map(sets.map(set => [set.exerciseId || set.exerciseName, set.exerciseName || set.exerciseId])).entries()];
    if(!options.length) return `<div class="moduleCard"><h3>Progreso por ejercicio ${helpButton('best')}</h3><div class="emptyState">Todavía no hay series compartidas para comparar ejercicios.</div></div>`;
    const selected = settings().selectedExerciseId || options[0][0];
    const selectedSets = sets.filter(set => (set.exerciseId || set.exerciseName) === selected);
    const members = safeArray(data.members);
    const rows = members.map(member => {
      const best = selectedSets.filter(set => set.userId === member.userId).sort((a,b) => (number(b.reps) * number(b.weightKg) || number(b.reps)) - (number(a.reps) * number(a.weightKg) || number(a.reps)))[0];
      return {member, best};
    });
    return `<div class="moduleCard">
      <h3>Progreso de ejercicio ${helpButton('best')}</h3>
      <div class="field"><label>Ejercicio</label><select id="gymPartyExerciseSelect">${options.map(([id,name]) => `<option value="${escape(id)}" ${id === selected ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></div>
      <div class="entryList">${rows.map(row => `<div class="entryRow"><div><strong>${escape(memberDisplayName(row.member, data))}</strong><div class="meta">${row.best ? `${escape(row.best.exerciseName)} · ${row.best.reps} reps · ${row.best.weightKg === null ? 'peso oculto' : `${row.best.weightKg} kg`} · ${escape(row.best.date || '')}` : 'Sin series compartidas de este ejercicio.'}</div></div><span class="statusChip ${row.best ? 'good' : 'low'}">${row.best ? 'registrado' : 'sin dato'}</span></div>`).join('')}</div>
    </div>`;
  }
  function muscleVolumeHtml(data, stats){
    const totals = {};
    stats.forEach(row => {
      Object.entries(row.current.muscleVolume).forEach(([muscle, value]) => {
        totals[muscle] = (totals[muscle] || 0) + number(value);
      });
    });
    const entries = Object.entries(totals).sort((a,b) => b[1] - a[1]).slice(0,8);
    if(!entries.length) return '';
    const max = Math.max(1, ...entries.map(([,value]) => value));
    return `<div class="moduleCard"><h3>Volumen por músculo ${helpButton('muscle')}</h3><div class="comparisonBars">${entries.map(([muscle,value]) => bar(value, max, muscle, ' kg')).join('')}</div></div>`;
  }
  function weeklySetEditorHtml(data, reference = selectedWorkoutDate()){
    const m = activeMembership();
    const start = weekStartStr(reference);
    const rows = safeArray(data.sets)
      .filter(set => set.userId === m?.userId && inWeek(set.date, start) && !set.deleted)
      .sort((a,b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
    const content = rows.length ? rows.map(set => {
      const weight = set.weightKg === null || set.weightKg === undefined ? 'peso oculto' : `${formatNumber(set.weightKg)} kg`;
      return `<div class="partySetRow">
        <div><strong>${escape(set.exerciseName || set.exerciseId || 'Ejercicio')}</strong><span>${escape(set.date || '')} - Serie ${set.setNumber || ''} - ${number(set.reps)} reps - ${escape(weight)}</span></div>
        <div class="partySetRowActions">
          <button type="button" class="secondary" data-gym-party-action="party-edit-set" data-party-date="${escape(set.date || reference)}" data-party-exercise-id="${escape(set.localExerciseId || set.exerciseId || '')}" data-party-set-id="${escape(set.localSetId || set.id)}" aria-label="Editar serie ${set.setNumber||''} de ${escape(set.exerciseName||'ejercicio')}">Editar</button>
          <button type="button" class="danger" data-gym-party-action="party-delete-set" data-party-date="${escape(set.date || reference)}" data-party-exercise-id="${escape(set.localExerciseId || set.exerciseId || '')}" data-party-set-id="${escape(set.localSetId || set.id)}" aria-label="Eliminar serie ${set.setNumber||''} de ${escape(set.exerciseName||'ejercicio')}">Eliminar</button>
        </div>
      </div>`;
    }).join('') : '<div class="emptyState">No hay series tuyas en la semana seleccionada.</div>';
    return `<details class="moduleCard partyFoldCard">
      <summary>Editar series de la semana</summary>
      <div class="muted small">Semana de ${escape(start)}. Toca editar para abrir esa serie arriba, o eliminar para corregir el registro semanal.</div>
      <div class="partySetList">${content}</div>
    </details>`;
  }
  function challengeHtml(stats){
    const self = stats.find(row => row.member.userId === activeMembership()?.userId) || stats[0];
    const current = self?.current || {};
    const challenges = [
      ['Completar 3 entrenamientos', current.sessionsCount >= 3],
      ['Registrar todas las sesiones', current.totalSets >= 6],
      ['Mejorar respecto a la semana pasada', self?.changeVsPreviousWeek.volumePct > 0],
      ['Mantener constancia', current.consistencyScore >= 70],
      ['Descanso planificado también cuenta', true]
    ];
    return `<div class="moduleCard"><h3>Retos sanos opcionales</h3><div class="badgeGrid">${challenges.map(([name,done]) => `<span class="badge ${done ? 'on' : ''}">${escape(name)}</span>`).join('')}</div><div class="muted small" style="margin-top:10px">No se premia sobreentrenar. Priorizar técnica antes que carga.</div></div>`;
  }
  function gymPartyGameHtml(data, stats){
    const m = activeMembership();
    const self = stats.find(row => row.member.userId === m?.userId) || stats[0];
    if(!self) return '';
    const ownSessions = safeArray(data.sessions).filter(session => session.userId === self.member.userId);
    const ownSets = safeArray(data.sets).filter(set => set.userId === self.member.userId && !set.deleted);
    const streak = dailyWorkoutStreak(self.member, ownSessions);
    const weeklyScore = number(self.current.consistencyScore);
    const points = weeklyScore + Math.min(90, number(self.current.totalSets) * 3) + Math.min(80, streak * 12);
    const level = Math.max(1, Math.floor(points / 100) + 1);
    const levelProgress = Math.max(8, Math.min(100, points % 100));
    const badges = [
      [`Racha ${streak} dia(s)`, streak >= 2],
      ['Primera serie registrada', ownSets.length > 0],
      ['3 sesiones esta semana', self.current.sessionsCount >= 3],
      ['Registro completo', self.current.totalSets >= 6],
      ['Mejora vs semana pasada', self.changeVsPreviousWeek?.volumePct > 0]
    ];
    const message = streak
      ? 'Mantene la racha registrando al menos una sesion cuando toque entrenar.'
      : 'Registra una serie para iniciar tu racha. Registrar ya cuenta como progreso.';
    return `<div class="moduleCard partyGameCard">
      <div class="actionFocusTop">
        <div><span class="partyStepPill">Racha Gym Party</span><h3>Nivel ${level}</h3><div class="muted small">${escape(message)}</div></div>
        <span class="statusChip good">${streak} dia(s)</span>
      </div>
      <div class="partyLevelBar"><i style="width:${levelProgress}%"></i></div>
      <div class="badgeGrid partyBadgeTrack">${badges.map(([name,done]) => `<span class="badge ${done ? 'on' : ''}">${escape(name)}</span>`).join('')}</div>
      <div class="muted small">La comparacion sana es contra tu semana pasada. Mas volumen no siempre significa mejor.</div>
    </div>`;
  }
  function dashboardHtml(data){
    const m = activeMembership();
    const party = data.party;
    const members = safeArray(data.members);
    const referenceDate = selectedWorkoutDate();
    const stats = calculatePartyStats(data, referenceDate);
    const syncText = m.backendMode === 'demo' ? 'Modo demo: estos datos son ficticios.' : `${m.backendMode === 'firebase' ? 'Firebase' : 'Local/mock'} · ${syncQueue().length} pendiente(s) · último sync ${lastSyncAt() || 'sin sincronizar'}`;
    const maxWarning = members.length >= MAX_GYM_PARTY_MEMBERS ? `<div class="auditItem warn">Esta sala alcanzó el límite recomendado de 10 miembros para mantener la app rápida y clara.</div>` : '';
    const inviteHint = members.length === 1 ? `<div class="auditItem good">Invitá a un amigo para comparar progreso. Código: <strong>${escape(party.inviteCode)}</strong></div>` : '';
    const currentRoomHint = `<div class="auditItem">Ya estás dentro de una sala. Si querés empezar desde cero, tocá <strong>Crear sala nueva</strong>.</div>`;
    return `
      <div class="moduleCard partyDashboardTop">
        <div class="actionFocusTop">
          <div><h3>${escape(party.name || 'Gym Party')}</h3><div class="muted small">Código: <strong id="gymPartyInviteCode">${escape(party.inviteCode || '')}</strong> · ${members.length}/${MAX_GYM_PARTY_MEMBERS} miembro(s)</div></div>
          <span class="statusChip good">${escape(syncText)}</span>
        </div>
        ${m.backendMode === 'demo' ? '<div class="auditItem warn">Modo demo: estos datos son ficticios.</div>' : ''}
        ${maxWarning}
        ${inviteHint}
        ${currentRoomHint}
        <div class="buttons">
          <button type="button" class="good" data-gym-party-action="new-room">Crear sala nueva</button>
          <button type="button" class="secondary" data-gym-party-action="copy-code">Copiar código</button>
          <button type="button" class="good" data-gym-party-action="share-code">Enviar código</button>
          <button type="button" class="good" data-gym-party-action="sync">Sincronizar ahora</button>
          <button type="button" class="secondary" data-gym-party-action="export-csv">Exportar CSV comparativo</button>
          <button type="button" class="secondary" data-gym-party-action="export-json">Exportar mis datos compartidos</button>
          <button type="button" class="danger" data-gym-party-action="leave">Salir de sala</button>
        </div>
      </div>
      ${memberCardsHtml(data, stats)}
      ${twoMemberComparisonHtml(data, stats)}
      ${multiMemberHtml(data, stats)}
      ${chartsHtml(data, stats)}
      <div class="partyGrid">
        ${exerciseProgressHtml(data)}
        ${muscleVolumeHtml(data, stats)}
      </div>
      ${gymPartyGameHtml(data, stats)}
      ${challengeHtml(stats)}
      ${privacyDashboardHtml(m)}
      ${recentSessionsHtml(data)}
      ${safetyNotice()}
    `;
  }
  function workoutApi(){ return window.WORKOUT_FEATURES || null; }
  function selectedWorkoutDate(){
    return settings().partyWorkoutDate || todayStr();
  }
  function partyDateControlsHtml(date){
    return `<div class="partyDateControls">
      <div class="field"><label>Dia de entrenamiento</label><input type="date" id="partyWorkoutDateInput" value="${escape(date)}"></div>
    </div>`;
  }
  function metricVolumeText(metric){
    const volume=number(metric?.totalVolume??metric?.volume??metric?.externalLoadVolume);
    const bodyweight=number(metric?.bodyweightReps);
    if(volume&&bodyweight) return `${formatNumber(volume)} kg · ${formatNumber(bodyweight)} reps PC`;
    if(bodyweight) return `${formatNumber(bodyweight)} reps peso corporal`;
    return `${formatNumber(volume)} kg`;
  }
  function selectedPartyExerciseId(){
    return settings().partyQuickExerciseId || '';
  }
  function partyDraftKey(date=selectedWorkoutDate(),exerciseId=partyWorkoutSelectedExerciseId(),editingSetId=settings().partyEditingSetId||''){
    return `${date}:${exerciseId||''}:${editingSetId||'new'}`;
  }
  function capturePartyQuickDraft(){
    const select=document.getElementById('partyQuickExerciseSelect');if(!select)return;
    partyQuickDrafts.set(partyDraftKey(selectedWorkoutDate(),select.value,settings().partyEditingSetId||''),{
      reps:document.getElementById('partyQuickReps')?.value??'',weight:document.getElementById('partyQuickWeight')?.value??'',bodyweight:!!document.getElementById('partyQuickBodyweight')?.checked,rir:document.getElementById('partyQuickRir')?.value??'',rpe:document.getElementById('partyQuickRpe')?.value??'',note:document.getElementById('partyQuickNote')?.value??''
    });
  }
  function updatePartyRestTimer(){
    const box=document.getElementById('partyRestTimer'),value=document.getElementById('partyRestTimerValue');if(!box||!value)return;
    const remaining=Math.max(0,Math.ceil((partyRestTimerEndsAt-Date.now())/1000));box.classList.toggle('hidden',!partyRestTimerEndsAt||remaining<=0);value.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    if(partyRestTimerEndsAt&&remaining<=0){partyRestTimerEndsAt=0;if(partyRestTimerInterval){clearInterval(partyRestTimerInterval);partyRestTimerInterval=null;}const gym=workoutApi()?.getGymSettings?.()||{};if(gym.hapticEnabled&&navigator.vibrate)navigator.vibrate([40,40,40]);}
  }
  function startPartyRestTimer(){
    const gym=workoutApi()?.getGymSettings?.()||{};if(!gym.restTimerEnabled)return;
    partyRestTimerEndsAt=Date.now()+Math.max(15,number(gym.restSeconds)||90)*1000;if(partyRestTimerInterval)clearInterval(partyRestTimerInterval);partyRestTimerInterval=setInterval(updatePartyRestTimer,1000);setTimeout(updatePartyRestTimer,0);
  }
  function partyHaptic(){const gym=workoutApi()?.getGymSettings?.()||{};if(gym.hapticEnabled&&navigator.vibrate)navigator.vibrate(35);}
  function partySetRowsHtml(state, editingSetId = ''){
    const sets = safeArray(state.currentSets);
    if(!sets.length) return '<div class="partyLoggedSets"><div class="partyLoggedSetsHeader"><strong>Series guardadas</strong><span>Sin series en este ejercicio.</span></div></div>';
    return `<div class="partyLoggedSets">
      <div class="partyLoggedSetsHeader"><strong>Series guardadas</strong><span>${sets.length} en este ejercicio</span></div>
      <div class="partySetList compact">${sets.map(set => {
      const active = set.id === editingSetId;
      const weight = number(set.weight);
      const meta = `${number(set.reps)} reps - ${weight ? `${round(weight,1)} ${state.unit}` : 'peso corporal'}${set.rir !== null && set.rir !== undefined ? ` - RIR ${set.rir}` : ''}`;
      return `<div class="partySetRow ${active ? 'editing' : ''}">
        <div><strong>Serie ${set.setNumber || ''}</strong><span>${escape(meta)}</span></div>
        <div class="partySetRowActions">
          <button type="button" class="secondary" data-gym-party-action="party-edit-set" data-party-set-id="${escape(set.id)}" aria-label="Editar serie ${set.setNumber||''} de ${escape(state.currentExerciseName||'ejercicio')}">Editar</button>
          <button type="button" class="danger" data-gym-party-action="party-delete-set" data-party-set-id="${escape(set.id)}" aria-label="Eliminar serie ${set.setNumber||''} de ${escape(state.currentExerciseName||'ejercicio')}">Eliminar</button>
        </div>
      </div>`;
    }).join('')}</div>
    </div>`;
  }
  function workoutQuickLoggerHtml(){
    const api = workoutApi();
    if(!api?.getQuickWorkoutState){
      return `<div class="moduleCard"><h3>Registro rapido</h3><div class="emptyState">El modulo Gym se esta cargando. Volve a abrir Gym Party en unos segundos.</div></div>`;
    }
    const date = selectedWorkoutDate();
    const state = api.getQuickWorkoutState({date, exerciseId: selectedPartyExerciseId()});
    const selectedId = selectedPartyExerciseId() || state.currentExerciseId;
    if(state.type === 'rest'){
      return `<div class="moduleCard partyWorkoutLogger">
        <span class="partyStepPill">Rutina del widget</span>
        <h3>${escape(state.title)}</h3>
        ${partyDateControlsHtml(date)}
        <div class="partyTip">${escape(state.message || 'Hoy toca descanso.')}</div>
        <div class="muted small">${escape((state.suggestions||[]).join(' · '))}</div>
      </div>`;
    }
    const exerciseSearch=settings().partyExerciseSearch||'';
    const ranked=api.rankExercisesForContext?.({date,query:exerciseSearch,currentPlan:state.plan})||{groups:[{label:'Rutina de hoy',items:state.exercises||[]}]};
    const options = ranked.groups.map(group=>`<optgroup label="${escape(group.label)}">${group.items.map(exercise=>{
      const active=(state.exercises||[]).find(item=>item.exerciseId===exercise.exerciseId || item.id===exercise.id);
      const value=active?(active.id||active.exerciseId):`library:${exercise.exerciseId||exercise.id}`;
      const sets=active?.setsLogged||0;
      return `<option value="${escape(value)}" ${selectedId===value||selectedId===(active?.id||active?.exerciseId)?'selected':''}>${escape(exercise.name)}${sets?` · ${sets} serie(s)`:''}</option>`;
    }).join('')}</optgroup>`).join('');
    const library = safeArray(api.exerciseLibrary).concat(safeArray(api.getExerciseLibrary?.())).filter((exercise,index,rows)=>rows.findIndex(item=>item.id===exercise.id)===index);
    const libraryOptions = library.map(exercise=>`<option value="${escape(exercise.name)}">${escape(exercise.group||'General')}</option>`).join('');
    const positionOptions = [`<option value="">Al final</option>`,...(state.exercises||[]).map(exercise=>`<option value="${escape(exercise.id||exercise.exerciseId)}">Despues de ${escape(exercise.name)}</option>`)].join('');
    const weekday = state.plan?.weekday || weekdayLabel(date);
    const h = state.history;
    const editingSetId = settings().partyEditingSetId || '';
    const editingSet = safeArray(state.currentSets).find(set => set.id === editingSetId) || null;
    const draft=partyQuickDrafts.get(partyDraftKey(date,selectedId,editingSetId));
    const repsValue = editingSet ? editingSet.reps : (draft?.reps??state.suggestedReps);
    const weightValue = editingSet ? editingSet.weight : (draft?.weight??state.suggestedWeight);
    const bodyweightValue = editingSet ? !!editingSet.bodyweight : (draft?.bodyweight??state.bodyweight);
    const rirValue = editingSet?.rir ?? draft?.rir ?? 2;
    const rpeValue = editingSet?.rpe ?? draft?.rpe ?? '';
    const noteValue = editingSet?.note ?? draft?.note ?? '';
    const saveText = editingSet ? 'Guardar cambios' : 'Guardar serie';
    const gymSettings=api.getGymSettings?.()||{};
    const hint = h ? `Ultima vez: ${h.name} - ${h.lastWeight||0} ${state.unit} x ${h.lastReps||0} reps.` : 'Sin historial previo. Empeza conservador y prioriza tecnica.';
    return `<div class="moduleCard partyWorkoutLogger">
      <div class="actionFocusTop">
        <div>
          <span class="partyStepPill">Rutina del widget</span>
          <h3>${escape(state.title)}</h3>
          <div class="muted small">${escape((state.muscles||[]).join(' · '))}</div>
        </div>
        <span class="statusChip good">${escape(state.unit)}</span>
      </div>
      <div class="partyFormCard">
        ${partyDateControlsHtml(date)}
        <div class="field"><label>Buscar ejercicio</label><input type="search" id="partyExerciseSearch" value="${escape(exerciseSearch)}" autocomplete="off" placeholder="Nombre o alias"></div>
        <div class="field"><label>Ejercicio</label><select id="partyQuickExerciseSelect">${options}</select></div>
        <div class="partyQuickInputs">
          <div class="field"><label>Reps</label><input type="number" id="partyQuickReps" min="0" max="200" inputmode="numeric" value="${escape(repsValue)}"><div class="partyQuickAdjust"><button type="button" class="secondary" data-party-adjust="reps:-1">-1</button><button type="button" class="secondary" data-party-adjust="reps:1">+1</button></div></div>
          <div class="field"><label>Kilos</label><input type="number" id="partyQuickWeight" min="0" step="0.5" inputmode="decimal" value="${escape(weightValue)}"><div class="partyQuickAdjust"><button type="button" class="secondary" data-party-adjust="weight:-0.5">-0.5</button><button type="button" class="secondary" data-party-adjust="weight:0.5">+0.5</button><button type="button" class="secondary" data-party-adjust="weight:-2.5">-2.5</button><button type="button" class="secondary" data-party-adjust="weight:2.5">+2.5</button><button type="button" class="secondary" data-party-adjust="weight:-5">-5</button><button type="button" class="secondary" data-party-adjust="weight:5">+5</button></div></div>
        </div>
        <details class="partyNestedFold compact"><summary>Pesos frecuentes</summary><div class="partyWeightChips">
          ${[0,5,10,20,40,60,80].map(value => `<button type="button" class="secondary" data-gym-party-weight="${value}">${value} kg</button>`).join('')}
        </div></details>
        <label class="check"><input type="checkbox" id="partyQuickBodyweight" ${bodyweightValue?'checked':''}><span>Peso corporal / lastre opcional.</span></label>
        ${editingSet ? '<div class="auditItem good">Editando una serie guardada. Guardar cambios no crea una serie nueva.</div>' : ''}
        <details class="partyNestedFold">
          <summary>Opcional</summary>
          <div class="partyQuickInputs">
            <div class="field"><label>RIR</label><input type="number" id="partyQuickRir" min="0" max="10" value="${escape(rirValue)}"></div>
            <div class="field"><label>RPE</label><input type="number" id="partyQuickRpe" min="0" max="10" step="0.5" value="${escape(rpeValue)}"></div>
          </div>
          <div class="field"><label>Nota</label><textarea id="partyQuickNote" placeholder="Tecnica, energia, ajuste...">${escape(noteValue)}</textarea></div>
          <label class="check"><input type="checkbox" id="partyRestTimerEnabled" ${gymSettings.restTimerEnabled?'checked':''}><span>Cronometro de descanso al guardar.</span></label>
          <div class="field"><label>Descanso (segundos)</label><input type="number" id="partyRestSeconds" min="15" max="600" step="15" value="${Math.max(15,number(gymSettings.restSeconds)||90)}"></div>
          <label class="check"><input type="checkbox" id="partyHapticEnabled" ${gymSettings.hapticEnabled!==false?'checked':''}><span>Vibracion breve si el dispositivo permite.</span></label>
        </details>
        <div class="auditItem">${escape(hint)}</div>
        <div class="partySaveRow partyStickySave">
          <button type="button" class="good partyPrimaryAction" data-gym-party-action="party-save-set">${escape(saveText)}</button>
          <button type="button" class="secondary" data-gym-party-action="party-repeat-last-set">Repetir ultima</button>
          <button type="button" class="secondary" data-gym-party-action="party-undo-delete-set" ${api.canUndoQuickSetDelete?.()?'':'disabled'}>Deshacer</button>
        </div>
        <div class="partyRestTimer ${partyRestTimerEndsAt>Date.now()?'':'hidden'}" id="partyRestTimer" role="timer" aria-live="polite"><span>Descanso</span><strong id="partyRestTimerValue">0:00</strong></div>
        <div class="buttons partySecondaryActions">
          ${editingSet ? '<button type="button" class="secondary" data-gym-party-action="party-cancel-edit-set">Cancelar edicion</button>' : ''}
          <button type="button" class="warn" data-gym-party-action="party-finish-workout">Finalizar entrenamiento</button>
        </div>
        <div class="partySetCounters compact">
          <div><span>Este ejercicio</span><strong>${state.currentExerciseSets||0}</strong><small>series</small></div>
          <div><span>${escape(state.currentExerciseMuscle||'Musculo')}</span><strong>${state.currentMuscleSets||0}</strong><small>series totales</small></div>
        </div>
        ${partySetRowsHtml(state, editingSetId)}
        <details class="partyNestedFold partyAddExerciseFold">
          <summary>Agregar ejercicio extra</summary>
          <div class="field"><label>Buscar o escribir ejercicio</label><input type="search" id="partyManualExerciseName" list="partyExerciseLibraryOptions" autocomplete="off" placeholder="Ej. Face pull"><datalist id="partyExerciseLibraryOptions">${libraryOptions}</datalist></div>
          <div class="partyQuickInputs">
            <div class="field"><label>Musculo</label><input type="text" id="partyManualExerciseMuscle" placeholder="Ej. Hombro"></div>
            <div class="field"><label>Unidad</label><select id="partyManualExerciseUnit"><option value="kg">kg</option><option value="peso corporal">Peso corporal</option><option value="tiempo">Tiempo</option></select></div>
            <div class="field"><label>Posicion</label><select id="partyManualInsertAfter">${positionOptions}</select></div>
          </div>
          <label class="check"><input type="checkbox" id="partyManualBodyweight"><span>Es peso corporal o sin kilos fijos.</span></label>
          <label class="check"><input type="checkbox" id="partyManualRememberWeekday" checked><span>Recordar para los proximos ${escape(weekday.toLowerCase())}.</span></label>
          <label class="check"><input type="checkbox" id="partyManualSaveLibrary"><span>Guardar en mi biblioteca de ejercicios.</span></label>
          <button type="button" class="secondary partyInlineAction" data-gym-party-action="party-add-exercise">Agregar ejercicio</button>
        </details>
      </div>
    </div>`;
  }
  function dashboardHtmlSimple(data){
    const m = activeMembership();
    const party = data.party;
    const members = safeArray(data.members);
    const referenceDate = selectedWorkoutDate();
    const stats = calculatePartyStats(data, referenceDate);
    const self = stats.find(row => row.member.userId === m?.userId) || stats[0] || {current: {}};
    const dateLabel = referenceDate === todayStr() ? 'Hoy' : referenceDate;
    const syncCounts=syncEngine()?.stateCounts?.([...safeArray(data.sessions),...safeArray(data.sets)])||{};
    const syncError=settings().syncLastError||'';
    const syncText = window.GYM_PARTY_UI?.syncLabel?.({backendMode:m.backendMode,pending:syncQueue().length,conflicts:syncCounts.conflict||0})
      ?? (m.backendMode === 'demo'
        ? 'Demo'
        : `${m.backendMode === 'firebase' ? 'Online' : 'Local'} - ${syncQueue().length} pendiente(s)${syncCounts.conflict?` - ${syncCounts.conflict} conflicto(s) resuelto(s)`:''}`);
    const inviteHint = members.length === 1
      ? `<div class="partyTip">Cuando quieras sumar a tu amigo, desplega este apartado y envia el codigo.</div>`
      : '';
    const maxWarning = members.length >= MAX_GYM_PARTY_MEMBERS
      ? `<div class="auditItem warn">Limite recomendado alcanzado: 10 miembros.</div>`
      : '';
    return `
      <div class="moduleCard partyDashboardTop partyDashboardSimple">
        <div class="actionFocusTop">
          <div>
            <span class="partyStepPill">Gym Party - ${escape(syncText)}</span>
            <h2>Registra tu entrenamiento</h2>
            <div class="muted small">${escape(party.name || 'Gym Party')} - ${members.length}/${MAX_GYM_PARTY_MEMBERS} miembro(s)</div>
          </div>
          <span class="statusChip good">${escape(dateLabel)}</span>
        </div>
        ${m.backendMode === 'demo' ? '<div class="partyTip">Demo: datos ficticios.</div>' : ''}
        ${syncError?`<div class="auditItem warn">Ultimo error de sincronizacion: ${escape(syncError)}. Tus datos siguen guardados localmente.</div>`:''}
        ${maxWarning}
        <div class="partyFocusHint">Foco: guarda la serie actual. Lo social y las graficas quedan abajo, plegados.</div>
      </div>

      ${workoutQuickLoggerHtml()}

      <div class="moduleCard partyQuickSummary">
        <h3>Esta semana</h3>
        <div class="partyCompareGrid">
          <div class="partyCompareCard"><span>Sesiones</span><strong>${self.current.sessionsCount || 0}</strong><small>registradas</small></div>
          <div class="partyCompareCard"><span>Series</span><strong>${self.current.totalSets || 0}</strong><small>totales</small></div>
          <div class="partyCompareCard"><span>Progreso</span><strong>${metricVolumeText(self.current)}</strong><small>carga externa y peso corporal</small></div>
          <div class="partyCompareCard"><span>Vs semana pasada</span><strong>${signed(self.changeVsPreviousWeek?.volumePct, '%')}</strong><small>referencia personal</small></div>
        </div>
      </div>

      ${weeklySetEditorHtml(data, referenceDate)}

      <details class="moduleCard partyFoldCard" ${settings().graphsOpen ? 'open' : ''}>
        <summary>Ver graficas, mapa muscular y comparaciones</summary>
        ${muscleMapHtml(data, stats, referenceDate)}
        ${chartsHtml(data, stats)}
        ${stats.length === 2 ? twoMemberComparisonHtml(data, stats) : ''}
        ${stats.length > 2 ? multiMemberHtml(data, stats) : ''}
        ${gymPartyGameHtml(data, stats)}
        <div class="partyGrid">
          ${exerciseProgressHtml(data)}
          ${muscleVolumeHtml(data, stats)}
        </div>
        ${recentSessionsHtml(data)}
      </details>

      <details class="moduleCard partyFoldCard">
        <summary>Invitar amigo y administrar sala</summary>
        ${inviteHint}
        <div class="partyCodeBox">
          <span>Codigo para invitar</span>
          <strong id="gymPartyInviteCode">${escape(party.inviteCode || '')}</strong>
        </div>
        <div class="buttons partySecondaryActions">
          <button type="button" class="good" data-gym-party-action="share-code">Enviar codigo</button>
          <button type="button" class="secondary" data-gym-party-action="copy-code">Copiar codigo</button>
          <button type="button" class="secondary" data-gym-party-action="sync">Sincronizar</button>
          <button type="button" class="secondary" data-gym-party-action="sync-full">Sincronizacion completa</button>
          <button type="button" class="secondary" data-gym-party-action="new-room">Crear sala nueva</button>
          <button type="button" class="secondary" data-gym-party-action="export-csv">Exportar CSV</button>
          <button type="button" class="secondary" data-gym-party-action="export-json">Exportar JSON</button>
        </div>
        ${m.role==='owner'?`<details class="partyNestedFold">
          <summary>Gestionar codigo de invitacion</summary>
          <div class="partyQuickInputs">
            <div class="field"><label>Expiracion</label><select id="gymPartyInviteExpiry"><option value="">Sin expiracion</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></div>
            <div class="field"><label>Limite de usos</label><input type="number" id="gymPartyInviteMaxUses" min="1" max="100" placeholder="Sin limite"></div>
          </div>
          <div class="buttons partySecondaryActions"><button type="button" class="secondary" data-gym-party-action="regenerate-invite">Regenerar codigo</button><button type="button" class="danger" data-gym-party-action="revoke-invite">Revocar codigo actual</button></div>
          <div class="muted small">Regenerar invalida el codigo anterior. Solo el owner puede hacerlo.</div>
        </details>`:''}
        ${m.backendMode === 'firebase' ? `<details class="partyNestedFold">
          <summary>Guardar acceso para otro dispositivo</summary>
          ${portableAccessFormHtml({mode: 'link'})}
        </details>` : '<div class="muted small">La recuperacion en otro dispositivo requiere sala online con Firebase.</div>'}
        <details class="partyNestedFold">
          <summary>Salir o borrar datos compartidos</summary>
          <div class="buttons partySecondaryActions">
            <button type="button" class="secondary" data-gym-party-action="leave-device">Salir solo de este dispositivo</button>
            ${m.backendMode==='firebase'?'<button type="button" class="danger" data-gym-party-action="leave-remote">Desactivar mi membresia en Firebase</button><button type="button" class="danger" data-gym-party-action="leave-delete-shared">Eliminar mis datos compartidos y salir</button>':''}
          </div>
          <div class="muted small">Tus rutinas, sesiones y series locales permanecen en este dispositivo. Salir solo del dispositivo no borra lo que ya se compartio en Firestore.</div>
        </details>
      </details>

      <details class="moduleCard partyFoldCard">
        <summary>Privacidad</summary>
        <div class="checks">${privacyChecks('partyPrivacy', m.privacy || defaultPrivacy)}</div>
        <div class="buttons"><button type="button" class="secondary" data-gym-party-action="save-privacy">Guardar privacidad</button></div>
        <div class="muted small">No se comparten nutricion, sueno, ansiedad, pantalla, notas privadas ni correo visible por defecto.</div>
      </details>
    `;
  }
  function privacyDashboardHtml(m){
    return `<div class="moduleCard">
      <h3>Privacidad de esta sala ${helpButton('privacy')}</h3>
      <div class="checks">${privacyChecks('partyPrivacy', m.privacy || defaultPrivacy)}</div>
      <div class="buttons"><button type="button" class="secondary" data-gym-party-action="save-privacy">Guardar privacidad</button></div>
      <div class="muted small">No se comparten nutrición, sueño, ansiedad, pantalla, notas privadas ni correo visible por defecto.</div>
    </div>`;
  }
  function recentSessionsHtml(data){
    const rows = safeArray(data.sessions).slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,8);
    return `<div class="moduleCard"><h3>Últimas sesiones compartidas</h3><div class="entryList">${rows.map(session => {
      const member = safeArray(data.members).find(item => item.userId === session.userId) || {};
      return `<div class="entryRow"><div><strong>${escape(memberDisplayName(member, data))} · ${escape(session.routineName)}</strong><div class="meta">${escape(session.date)} · ${session.totalSets} series · ${session.totalReps || 0} reps · ${escape(metricVolumeText(session))}</div></div><span class="statusChip good">${escape(session.source || 'sync')}</span></div>`;
    }).join('') || '<div class="emptyState">Todavía no hay sesiones compartidas.</div>'}</div></div>`;
  }

  function ensureStyles(){
    if(document.getElementById('gymPartyStyles')) return;
    const style = document.createElement('style');
    style.id = 'gymPartyStyles';
    style.textContent = `
      .partyGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
      .partyGrid.compact{align-items:start}
      .partyHeroCard p{line-height:1.45}
      .partyMembers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
      .partyMemberCard,.partyCompareCard{border:1px solid var(--line);border-radius:16px;padding:13px;background:rgba(255,255,255,.04)}
      .partyCompareGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .partyCompareGrid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}
      .partyCompareCard span{display:block;color:var(--muted);font-size:12px}.partyCompareCard strong{display:block;font-size:26px;margin:6px 0}.partyCompareCard small{color:var(--muted);line-height:1.35}
      .partyChartGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .partyBarRow{display:grid;grid-template-columns:110px minmax(0,1fr) 86px;gap:9px;align-items:center;font-size:12px;margin:8px 0}
      .partyBar{height:15px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
      .partyBar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
      .gymPartyHelp{display:inline-grid;place-items:center;width:21px;height:21px;min-width:21px;padding:0;margin-left:4px;border-radius:999px;background:rgba(114,214,255,.12);color:#dff6ff;border:1px solid rgba(114,214,255,.34);font-size:12px}
      .partySimpleShell{max-width:760px;margin:0 auto}
      .partyStartCard,.partyDashboardSimple{padding:18px}
      .partyStartCard h2,.partyDashboardSimple h2{font-size:30px;margin:8px 0 6px}
      .partyLead{font-size:17px;line-height:1.35;color:#e9f7ff;margin:0 0 14px}
      .partyStepPill{display:inline-flex;align-items:center;width:max-content;border-radius:999px;padding:7px 10px;background:rgba(146,255,194,.16);border:1px solid rgba(146,255,194,.34);font-size:12px;font-weight:800;color:#dffff0}
      .partyMiniSteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
      .partyMiniSteps span{border:1px solid var(--line);border-radius:14px;padding:10px;text-align:center;background:rgba(255,255,255,.04);font-weight:800;font-size:13px}
      .partyFormCard{border:1px solid rgba(146,255,194,.28);border-radius:18px;padding:14px;background:rgba(146,255,194,.06);margin-top:12px}
      .partyFormCard.flat{background:rgba(255,255,255,.04);border-color:var(--line)}
      .partyDashboardSimple,.partyWorkoutLogger,.partyQuickSummary,.partyFoldCard{box-shadow:0 12px 34px rgba(0,0,0,.14)}
      .partyFocusHint{border:1px solid rgba(146,255,194,.24);border-radius:14px;padding:10px 12px;background:rgba(146,255,194,.065);color:#dffff0;font-size:13px;font-weight:750;margin-top:12px}
      .partyPrimaryAction{width:100%;min-height:54px;font-size:16px;margin-top:8px}
      .partyFold,.partyNestedFold{border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-top:12px;background:rgba(255,255,255,.035)}
      .partyFold summary,.partyNestedFold summary,.partyFoldCard summary{cursor:pointer;font-weight:850}
      .partyFoldCard{padding:14px 16px}
      .partySecondaryActions{gap:8px;margin-top:12px}
      .partySecondaryActions button{flex:1 1 150px}
      .partyCodeBox{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(146,255,194,.34);border-radius:18px;padding:13px 14px;background:rgba(146,255,194,.08);margin:12px 0}
      .partyCodeBox span{color:var(--muted);font-size:13px}.partyCodeBox strong{font-size:28px;letter-spacing:2px}
      .partyMainActions{display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:10px;margin-top:12px}
      .partyMainActions button{min-height:50px}
      .partyDateControls{display:grid;grid-template-columns:1fr;gap:8px;align-items:end;margin:0 0 10px}
      .partyDateControls .field{margin:0}
      .partyAccessBox{display:grid;gap:9px}
      .partyAccessGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .partyAccessGrid .field{margin:0}
      .partySaveRow{margin-top:12px}
      .partyStickySave{position:sticky;bottom:max(8px,env(safe-area-inset-bottom));z-index:35;display:grid;grid-template-columns:1.4fr 1fr .85fr;gap:8px;padding:9px;border:1px solid rgba(114,214,255,.30);border-radius:15px;background:rgba(11,18,32,.96);box-shadow:0 12px 30px rgba(0,0,0,.3);backdrop-filter:blur(12px)}
      .partyStickySave button{min-height:50px}.partyQuickAdjust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}.partyQuickAdjust button{min-height:36px;padding:6px 4px;font-size:11px}
      .partyRestTimer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border-radius:12px;background:rgba(114,214,255,.08);color:#dff6ff}.partyRestTimer.hidden{display:none}
      .partyInlineAction{width:100%;min-height:46px;margin-top:8px}
      .partyGameCard{border-color:rgba(146,255,194,.28)}
      .partyLevelBar{height:14px;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);margin:12px 0}
      .partyLevelBar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent2),var(--accent))}
      .partyBadgeTrack{margin:10px 0}
      .partyDashboardTop,.partyMuscleMapCard,.partyQuickSummary{background:linear-gradient(180deg,rgba(114,214,255,.08),rgba(146,255,194,.035))}
      .partyMuscleMapCard{border-color:rgba(114,214,255,.25);overflow:hidden}
      .partyMuscleMapShell{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr);gap:14px;align-items:stretch;margin-top:12px}
      .partyHumanPanel{border:1px solid rgba(114,214,255,.23);border-radius:20px;background:radial-gradient(circle at 50% 18%,rgba(114,214,255,.18),rgba(255,255,255,.035) 42%,rgba(0,0,0,.08));padding:12px;min-height:430px}
      .partyHumanCanvas{position:relative;min-height:408px}
      .partyHumanSvg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 16px 26px rgba(0,0,0,.24))}
      .partyBodyPart{fill:url(#partyBodySkin);stroke:rgba(223,246,255,.42);stroke-width:1.1}
      .partyBodyPart.head{fill:rgba(255,255,255,.13)}
      .partyBodyShade{fill:rgba(114,214,255,.075);stroke:rgba(146,255,194,.16);stroke-width:.7}
      .partyMuscleLine{stroke:rgba(114,214,255,.34);stroke-width:1.2;stroke-dasharray:4 4}
      .partyMuscleLine.on{stroke:url(#partyBodyGlow);stroke-width:2.1;stroke-dasharray:none}
      .partyMuscleDot{fill:url(#partyBodyGlow);stroke:rgba(255,255,255,.75);stroke-width:.7}
      .partyMuscleDot.on{filter:drop-shadow(0 0 8px rgba(146,255,194,.7))}
      .partyMuscleButton{position:absolute;transform:translate(-4px,-50%);min-width:116px;text-align:left;border:1px solid rgba(114,214,255,.28);border-radius:14px;background:rgba(8,18,28,.78);backdrop-filter:blur(8px);padding:8px 10px;color:#e9f7ff}
      .partyMuscleButton strong,.partyMuscleButton span{display:block}
      .partyMuscleButton span{font-size:11px;color:var(--muted);margin-top:2px}
      .partyMuscleButton.on{border-color:rgba(146,255,194,.75);background:linear-gradient(135deg,rgba(146,255,194,.20),rgba(114,214,255,.14));box-shadow:0 0 0 1px rgba(146,255,194,.16),0 14px 30px rgba(0,0,0,.22)}
      .partyMuscleInsight{display:grid;gap:12px}
      .partyMuscleCompare,.partyMuscleExerciseList,.partyMiniChart{border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(255,255,255,.035)}
      .partyMuscleChartGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .partyWeekBars{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;align-items:end;min-height:130px;margin-top:8px}
      .partyWeekBarItem{display:grid;grid-template-rows:1fr auto auto;gap:5px;align-items:end;text-align:center;font-size:11px;color:var(--muted)}
      .partyWeekBar{height:92px;border:1px solid rgba(114,214,255,.22);border-radius:12px;background:rgba(255,255,255,.04);display:flex;align-items:end;overflow:hidden}
      .partyWeekBar i{display:block;width:100%;border-radius:12px 12px 0 0;background:linear-gradient(180deg,var(--accent),var(--accent2))}
      .partyWeekBarItem strong{color:#e9f7ff;font-size:11px}
      .partyExerciseCompareCard{border:1px solid var(--line);border-radius:16px;padding:12px;background:rgba(255,255,255,.035);margin-top:10px}
      .partyExerciseCompareCard.on{border-color:rgba(146,255,194,.62);background:rgba(146,255,194,.08)}
      .partyExerciseMetricGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
      .partyExerciseMetricGrid div{border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:9px;background:rgba(0,0,0,.10)}
      .partyExerciseMetricGrid span,.partyExerciseMetricGrid small{display:block;color:var(--muted);font-size:11px}.partyExerciseMetricGrid strong{display:block;font-size:18px;margin:3px 0;color:#fff}
      .partyTip{border:1px solid rgba(114,214,255,.28);border-radius:14px;padding:10px 12px;background:rgba(114,214,255,.08);font-weight:750;margin-top:10px}
      .partyQuickSummary{margin-top:12px}
      .partyWorkoutLogger{margin-top:12px}
      .partySetCounters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}
      .partySetCounters div{border:1px solid var(--line);border-radius:14px;padding:11px;background:rgba(255,255,255,.04)}
      .partySetCounters span,.partySetCounters small{display:block;color:var(--muted);font-size:12px}.partySetCounters strong{display:block;font-size:28px;margin:3px 0}
      .partySetCounters.compact{gap:8px;margin:12px 0 6px}
      .partySetCounters.compact div{padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.028)}
      .partySetCounters.compact strong{font-size:19px;margin:1px 0}.partySetCounters.compact span,.partySetCounters.compact small{font-size:11px}
      .partyLoggedSets{border-top:1px solid rgba(255,255,255,.08);margin:10px 0 4px;padding-top:9px}
      .partyLoggedSetsHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--muted);font-size:12px}
      .partyLoggedSetsHeader strong{color:#e9f7ff;font-size:13px}.partyLoggedSetsHeader span{font-size:11px}
      .partySetList{display:grid;gap:8px;margin:10px 0}
      .partySetList.compact{gap:6px;margin:7px 0 0}
      .partySetList.empty{border:1px dashed rgba(255,255,255,.12);border-radius:14px;padding:10px;color:var(--muted);background:rgba(255,255,255,.025)}
      .partySetRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:9px 10px;background:rgba(0,0,0,.10)}
      .partySetList.compact .partySetRow{padding:7px 8px;border-radius:12px;background:rgba(0,0,0,.07)}
      .partySetRow.editing{border-color:rgba(146,255,194,.62);background:rgba(146,255,194,.08)}
      .partySetRow strong,.partySetRow span{display:block}.partySetRow span{color:var(--muted);font-size:12px;margin-top:2px}
      .partySetList.compact .partySetRow strong{font-size:13px}.partySetList.compact .partySetRow span{font-size:11px}
      .partySetRowActions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.partySetRowActions button{min-height:34px;padding:7px 10px;font-size:12px}
      .partySetList.compact .partySetRowActions button{min-height:30px;padding:6px 8px;font-size:11px}
      .partyQuickInputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .partyQuickInputs input{font-size:22px;font-weight:850;text-align:center;min-height:54px}
      .partyWeightChips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
      .partyWeightChips button{min-height:42px}
      @media(max-width:850px){.partyGrid,.partyMembers,.partyChartGrid,.partyCompareGrid,.partyCompareGrid.compact,.partyMiniSteps,.partyMainActions,.partyDateControls,.partyAccessGrid,.partyQuickInputs,.partySetCounters,.partySetRow,.partyMuscleMapShell,.partyMuscleChartGrid,.partyExerciseMetricGrid{grid-template-columns:1fr}.partySetRowActions{justify-content:stretch}.partySetRowActions button{flex:1}.partyHumanPanel{min-height:390px}.partyHumanCanvas{min-height:368px}.partyMuscleButton{min-width:104px;font-size:12px}.partyWeightChips{grid-template-columns:repeat(2,minmax(0,1fr))}.partyBarRow{grid-template-columns:92px minmax(0,1fr) 72px}.partyCodeBox{align-items:flex-start;flex-direction:column}.partyCodeBox strong{font-size:24px}.partyStickySave{grid-template-columns:1.25fr .9fr .75fr}.partyStickySave button{padding:8px 6px;font-size:12px}}
    `;
    document.head.appendChild(style);
  }
  function renderGymParty(){
    const root = document.getElementById('gymPartyRoot');
    if(!root) return;
    ensureStyles();
    syncFromLocalWorkouts({silent: true, queue: false});
    const data = partyData();
    const html=data?.party ? dashboardHtmlSimple(data) : noRoomHtmlSimple();
    if(window.GYM_PARTY_UI?.renderRoot) window.GYM_PARTY_UI.renderRoot(root,html,bindGymPartyActionButtons);
    else{root.innerHTML=html;bindGymPartyActionButtons(root);}
    setTimeout(updatePartyRestTimer,0);
  }

  function runGymPartyAction(action, event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    if(action === 'create') createLocalParty();
    else if(action === 'join') joinLocalParty();
    else if(action === 'demo2') startDemo(2);
    else if(action === 'demo5') startDemo(5);
    else if(action === 'copy-code') copyInviteCode();
    else if(action === 'share-code') shareInviteCode();
    else if(action === 'sync') syncNow().catch(error => flashMessage(firebaseError(error)));
    else if(action === 'sync-full') syncNow({full:true}).catch(error=>flashMessage(firebaseError(error)));
    else if(action === 'export-csv') exportCsv();
    else if(action === 'export-json') exportJson();
    else if(action === 'save-privacy') savePrivacy();
    else if(action === 'save-firebase') saveFirebaseConfig();
    else if(action === 'clear-firebase') clearFirebaseConfig();
    else if(action === 'login-firebase') testFirebaseLogin();
    else if(action === 'link-access') linkPortableAccess().catch(error => flashMessage(firebaseError(error)));
    else if(action === 'restore-access') restorePortableAccess().catch(error => flashMessage(firebaseError(error)));
    else if(action === 'new-room') newRoomFlow();
    else if(action === 'leave'||action === 'leave-device') leavePartyDevice();
    else if(action === 'leave-remote') deactivateFirebaseMembership().catch(error=>flashMessage(firebaseError(error)));
    else if(action === 'leave-delete-shared') deleteSharedDataAndLeave().catch(error=>flashMessage(firebaseError(error)));
    else if(action === 'regenerate-invite') regenerateInvite().catch(error=>flashMessage(firebaseError(error)));
    else if(action === 'revoke-invite') revokeInvite().catch(error=>flashMessage(firebaseError(error)));
    else if(action === 'open-gym' && typeof window.setModule === 'function') window.setModule('gym');
    else if(action === 'party-save-set') savePartyWorkoutSet();
    else if(action === 'party-edit-set') editPartyWorkoutSet(event);
    else if(action === 'party-delete-set') deletePartyWorkoutSet(event);
    else if(action === 'party-cancel-edit-set') cancelPartyWorkoutSetEdit();
    else if(action === 'party-repeat-last-set') repeatPartyWorkoutSet();
    else if(action === 'party-undo-delete-set') undoPartyWorkoutSetDelete();
    else if(action === 'party-add-exercise') addPartyManualExercise();
    else if(action === 'party-finish-workout') finishPartyWorkout();
    else if(action === 'party-select-muscle') selectPartyMuscle(event);
    else if(action === 'party-focus-muscle-compare') selectPartyMuscle(event, {flash: true});
    else if(action === 'party-compare-exercise') comparePartyExercise(event);
  }

  function bindGymPartyActionButtons(root){
    root.querySelectorAll('[data-party-help]').forEach(button => {
      if(button.dataset.partyHelpBound === '1') return;
      button.dataset.partyHelpBound = '1';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        showHelp(button.dataset.partyHelp);
      });
    });
    root.querySelectorAll('[data-gym-party-action]').forEach(button => {
      if(button.dataset.gymPartyBound === '1') return;
      button.dataset.gymPartyBound = '1';
      button.addEventListener('click', event => runGymPartyAction(button.dataset.gymPartyAction, event));
    });
    root.querySelectorAll('[data-gym-party-weight]').forEach(button => {
      if(button.dataset.gymPartyWeightBound === '1') return;
      button.dataset.gymPartyWeightBound = '1';
      button.addEventListener('click', event => {
        event.preventDefault();
        const input = document.getElementById('partyQuickWeight');
        if(input){input.value = button.dataset.gymPartyWeight;capturePartyQuickDraft();}
      });
    });
    root.querySelectorAll('[data-party-adjust]').forEach(button=>{
      if(button.dataset.partyAdjustBound==='1')return;button.dataset.partyAdjustBound='1';button.addEventListener('click',event=>{
        event.preventDefault();const [target,delta]=button.dataset.partyAdjust.split(':'),input=document.getElementById(target==='reps'?'partyQuickReps':'partyQuickWeight');if(!input)return;
        const value=Math.max(0,(number(input.value)+number(delta)));input.value=target==='reps'?Math.round(value):Math.round(value*2)/2;capturePartyQuickDraft();input.focus();
      });
    });
  }

  function copyInviteCode(){
    const code = currentParty()?.inviteCode || '';
    if(!code) return;
    if(currentParty()?.inviteActive===false){flashMessage('El codigo actual esta revocado. Regenera uno nuevo antes de enviarlo.');return;}
    if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(code).catch(() => {});
    flashMessage(`Código copiado: ${code}`);
  }
  function inviteUrl(code){
    try{
      const url = new URL(window.location.href);
      url.searchParams.set('gymPartyCode', code);
      url.hash = '';
      return url.href;
    }catch(e){
      return '';
    }
  }
  function inviteMessage(code){
    const url = inviteUrl(code);
    return `Sumate a mi Gym Party. Código: ${code}${url ? `\nLink: ${url}` : ''}`;
  }
  async function shareInviteCode(){
    const code = currentParty()?.inviteCode || '';
    if(!code) return;
    if(currentParty()?.inviteActive===false){flashMessage('El codigo esta revocado. Regenera uno nuevo antes de enviarlo.');return;}
    const text = inviteMessage(code);
    if(typeof navigator !== 'undefined' && navigator.share){
      try{
        await navigator.share({title: 'Gym Party', text, url: inviteUrl(code) || undefined});
        return;
      }catch(e){}
    }
    if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
    flashMessage(`Invitación copiada. Código: ${code}`);
  }
  function savePrivacy(){
    const m = activeMembership();
    if(!m) return;
    const privacy = privacyFromForm('partyPrivacy');
    saveMembership({...m, privacy, updatedAt: nowIso()});
    syncFromLocalWorkouts({silent: true});
    renderGymParty();
    flashMessage('Privacidad actualizada.');
  }
  function partyWorkoutSelectedExerciseId(){
    return document.getElementById('partyQuickExerciseSelect')?.value || selectedPartyExerciseId();
  }
  function setPartyWorkoutDate(date){
    saveSettings({partyWorkoutDate: date || todayStr(), partyQuickExerciseId: '', partyEditingSetId: '', graphsOpen: settings().graphsOpen});
    renderGymParty();
  }
  function refreshPartyWorkoutShare(){
    syncFromLocalWorkouts({silent: true});
    const m = activeMembership();
    if(m?.backendMode === 'firebase' && typeof navigator !== 'undefined' && navigator.onLine !== false){
      syncFirebaseNow({silent: true}).catch(() => flashMessage('Guardado localmente. Se sincronizara al volver a intentar.'));
    }
  }
  function selectPartyMuscle(event, options = {}){
    const button = event?.target?.closest?.('[data-gym-party-muscle]');
    const muscle = button?.dataset?.gymPartyMuscle || settings().selectedMuscleGroup || 'Pecho';
    saveSettings({selectedMuscleGroup: muscle, graphsOpen: true});
    renderGymParty();
    if(options.flash) flashMessage(`Comparacion actualizada: ${muscle}.`);
  }
  function comparePartyExercise(event){
    const button = event?.target?.closest?.('[data-gym-party-exercise]');
    const exerciseId = button?.dataset?.gymPartyExercise || '';
    const muscle = button?.dataset?.gymPartyMuscle || settings().selectedMuscleGroup || '';
    if(!exerciseId) return;
    saveSettings({selectedExerciseId: exerciseId, selectedMuscleGroup: muscle, graphsOpen: true});
    renderGymParty();
    flashMessage('Comparacion por ejercicio actualizada.');
  }
  function addPartyManualExercise(){
    const api = workoutApi();
    if(!api?.addManualExercisePayload){ flashMessage('Agregar ejercicio no esta disponible todavia.'); return; }
    const name = document.getElementById('partyManualExerciseName')?.value.trim() || '';
    const muscle = document.getElementById('partyManualExerciseMuscle')?.value.trim() || 'General';
    const bodyweight = !!document.getElementById('partyManualBodyweight')?.checked;
    const rememberForWeekday = !!document.getElementById('partyManualRememberWeekday')?.checked;
    const saveToLibrary = !!document.getElementById('partyManualSaveLibrary')?.checked;
    const unit = document.getElementById('partyManualExerciseUnit')?.value || 'kg';
    const insertAfterExerciseId = document.getElementById('partyManualInsertAfter')?.value || '';
    const date = selectedWorkoutDate();
    const result = api.addManualExercisePayload({
      date,
      name,
      muscle,
      unit,
      bodyweight,
      persistScope: rememberForWeekday ? 'weekday' : (saveToLibrary ? 'library' : 'session'),
      rememberForWeekday,
      saveToLibrary,
      insertAfterExerciseId,
      targetDayKey: api.dayKeyForDate?.(date)
    });
    if(!result.ok){ flashMessage(result.message || 'No se pudo agregar el ejercicio.'); return; }
    saveSettings({partyQuickExerciseId: result.exercise?.id || result.state?.currentExerciseId || ''});
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage(result.message || 'Ejercicio agregado. Ya podes registrar la serie.');
  }
  function savePartyWorkoutSet(){
    const api = workoutApi();
    if(!api?.saveQuickSetPayload){ flashMessage('Registro de gym no disponible todavia.'); return; }
    const editingSetId = settings().partyEditingSetId || '';
    const payload = {
      date: selectedWorkoutDate(),
      exerciseId: partyWorkoutSelectedExerciseId(),
      reps: document.getElementById('partyQuickReps')?.value,
      weight: document.getElementById('partyQuickWeight')?.value,
      bodyweight: document.getElementById('partyQuickBodyweight')?.checked,
      rir: document.getElementById('partyQuickRir')?.value,
      rpe: document.getElementById('partyQuickRpe')?.value,
      note: document.getElementById('partyQuickNote')?.value
    };
    const result = editingSetId && api.updateQuickSetPayload
      ? api.updateQuickSetPayload({...payload, setId: editingSetId})
      : api.saveQuickSetPayload(payload);
    if(!result.ok){ flashMessage(result.message || 'No se pudo guardar la serie.'); return; }
    const nextExerciseId=result.state?.currentExerciseId||result.exercise?.id||partyWorkoutSelectedExerciseId();
    partyQuickDrafts.delete(partyDraftKey(selectedWorkoutDate(),partyWorkoutSelectedExerciseId(),editingSetId));
    partyQuickDrafts.set(partyDraftKey(selectedWorkoutDate(),nextExerciseId,''),{reps:payload.reps,weight:payload.weight,bodyweight:!!payload.bodyweight,rir:payload.rir,rpe:payload.rpe,note:''});
    saveSettings({partyQuickExerciseId: nextExerciseId, partyEditingSetId: ''});
    refreshPartyWorkoutShare();
    renderGymParty();
    partyHaptic();startPartyRestTimer();
    flashMessage(editingSetId ? 'Serie actualizada.' : 'Serie guardada en Gym Party.');
  }
  function repeatPartyWorkoutSet(){
    const state=workoutApi()?.getQuickWorkoutState?.({date:selectedWorkoutDate(),exerciseId:partyWorkoutSelectedExerciseId()});
    const last=safeArray(state?.currentSets).slice(-1)[0]||state?.history;if(!last){flashMessage('Todavia no hay una serie anterior para repetir.');return;}
    const reps=document.getElementById('partyQuickReps'),weight=document.getElementById('partyQuickWeight'),body=document.getElementById('partyQuickBodyweight'),rir=document.getElementById('partyQuickRir');
    if(reps)reps.value=last.reps??last.lastReps??8;if(weight)weight.value=last.weight??last.lastWeight??0;if(body)body.checked=!!last.bodyweight;if(rir&&last.rir!==null&&last.rir!==undefined)rir.value=last.rir;capturePartyQuickDraft();
  }
  function editPartyWorkoutSet(event){
    const button = event?.target?.closest?.('[data-party-set-id]');
    const setId = button?.dataset?.partySetId || '';
    if(!setId) return;
    const date = button?.dataset?.partyDate || selectedWorkoutDate();
    const exerciseId = button?.dataset?.partyExerciseId || partyWorkoutSelectedExerciseId();
    saveSettings({partyWorkoutDate: date, partyEditingSetId: setId, partyQuickExerciseId: exerciseId});
    renderGymParty();
  }
  function deletePartyWorkoutSet(event){
    const api = workoutApi();
    if(!api?.deleteQuickSetPayload){ flashMessage('Eliminar serie no esta disponible todavia.'); return; }
    const button = event?.target?.closest?.('[data-party-set-id]');
    const setId = button?.dataset?.partySetId || '';
    if(!setId) return;
    const date = button?.dataset?.partyDate || selectedWorkoutDate();
    const exerciseId = button?.dataset?.partyExerciseId || partyWorkoutSelectedExerciseId();
    const ok = window.confirm ? window.confirm('Eliminar esta serie? No se borra el resto del entrenamiento.') : true;
    if(!ok) return;
    const result = api.deleteQuickSetPayload({date, exerciseId, setId});
    if(!result.ok){ flashMessage(result.message || 'No se pudo eliminar la serie.'); return; }
    const nextEditing = settings().partyEditingSetId === setId ? '' : settings().partyEditingSetId;
    saveSettings({partyWorkoutDate: date, partyQuickExerciseId: result.state?.currentExerciseId || exerciseId, partyEditingSetId: nextEditing});
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Serie eliminada. Podes deshacerla enseguida.');
  }
  function undoPartyWorkoutSetDelete(){
    const api=workoutApi(),result=api?.undoDeleteQuickSetPayload?.();if(!result?.ok){flashMessage(result?.message||'No hay una serie para restaurar.');return;}
    saveSettings({partyWorkoutDate:result.session?.date||selectedWorkoutDate(),partyQuickExerciseId:result.state?.currentExerciseId||result.exercise?.id||'',partyEditingSetId:''});refreshPartyWorkoutShare();renderGymParty();flashMessage('Serie restaurada.');
  }
  function cancelPartyWorkoutSetEdit(){
    saveSettings({partyEditingSetId: ''});
    renderGymParty();
  }
  function finishPartyWorkout(){
    const api = workoutApi();
    if(!api?.finishWorkoutPayload){ flashMessage('Registro de gym no disponible todavia.'); return; }
    if(window.confirm&&!window.confirm('Finalizar este entrenamiento? Las series seguiran disponibles para consultar y editar.'))return;
    const result = api.finishWorkoutPayload({date: selectedWorkoutDate()});
    if(!result.ok){ flashMessage(result.message || 'No se pudo finalizar.'); return; }
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Entrenamiento finalizado.');
  }
  async function syncNow({full=false,force=true}={}){
    const m = activeMembership();
    if(!m){ flashMessage('Primero crea o unite a una Gym Party.'); return; }
    syncFromLocalWorkouts({silent: true});
    if(m.backendMode === 'firebase'){
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        flashMessage('Entrenamiento guardado localmente. Se sincronizará con la Gym Party cuando vuelva la conexión.');
        renderGymParty();
        return;
      }
      await syncFirebaseNow({full,force});
    }else{
      setLastSync();
      flashMessage(m.backendMode === 'demo' ? 'Demo refrescado.' : 'Sala local/mock actualizada.');
    }
    renderGymParty();
  }
  function exportCsv(){
    const data = partyData();
    if(!data?.party) return;
    const ok = window.confirm ? window.confirm('Se exportará el resumen compartido de la sala. No incluye nutrición, sueño, ansiedad, pantalla ni notas privadas. Continuar?') : true;
    if(!ok) return;
    const stats = calculatePartyStats(data);
    const rows = [['partyId','memberAlias','weekStart','sessions','sets','reps','volume','consistency','changeVolumePct']];
    stats.forEach(row => rows.push([data.party.id, memberDisplayName(row.member, data), row.current.weekStart, row.current.sessionsCount, row.current.totalSets, row.current.totalReps, row.current.totalVolume, row.current.consistencyScore, row.changeVsPreviousWeek.volumePct]));
    download(rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n'), 'gym_party_resumen.csv', 'text/csv;charset=utf-8');
  }
  function exportJson(){
    const m = activeMembership();
    if(!m) return;
    const ownSessions = sharedSessions().filter(row => row.partyId === m.partyId && row.userId === m.userId);
    const ownSets = sharedSets().filter(row => row.partyId === m.partyId && row.userId === m.userId);
    download(JSON.stringify({schemaVersion: 1, exportedAt: nowIso(), membership: m, sharedWorkoutSessions: ownSessions, sharedWorkoutSets: ownSets}, null, 2), 'gym_party_mis_datos_compartidos.json', 'application/json');
  }
  function showHelp(id){
    const item = help[id];
    if(!item) return;
    alert(`${item.title}\n\n${item.text}`);
  }
  function saveFirebaseConfig(){
    const raw = document.getElementById('gymPartyFirebaseConfig')?.value.trim();
    if(!raw){ saveSettings({firebaseConfig: {}}); flashMessage('Configuración Firebase eliminada.'); return; }
    try{
      const config = JSON.parse(raw);
      saveSettings({firebaseConfig: config, backendMode: 'firebase'});
      firebaseInitPromise = null;
      firebaseRuntime = null;
      flashMessage('Configuración Firebase guardada localmente.');
    }catch(e){
      flashMessage('El JSON de Firebase no es válido.');
    }
  }
  function clearFirebaseConfig(){
    saveSettings({firebaseConfig: {}, backendMode: 'local'});
    firebaseInitPromise = null;
    firebaseRuntime = null;
    renderGymParty();
    flashMessage('Configuración Firebase quitada.');
  }
  function leavePartyDevice(){
    const ok = window.confirm ? window.confirm('Vas a salir solo en este dispositivo. Tus entrenamientos locales y los datos ya compartidos en Firestore no se borran.') : true;
    if(!ok) return;
    clearMembership();
    flashMessage('Saliste de la Gym Party solo en este dispositivo.');
  }
  function inviteOptionsFromUi(){
    const days=Math.max(0,Number(document.getElementById('gymPartyInviteExpiry')?.value)||0);
    const maxUses=Math.max(0,Math.min(100,Number(document.getElementById('gymPartyInviteMaxUses')?.value)||0));
    return {days,maxUses};
  }
  async function regenerateInvite(){
    const m=activeMembership(); if(!m||m.role!=='owner') throw new Error('Solo el owner puede regenerar invitaciones.');
    if(window.confirm&&!window.confirm('El codigo anterior dejara de funcionar. ¿Regenerar ahora?')) return;
    const options=inviteOptionsFromUi();
    if(m.backendMode==='demo') throw new Error('El modo demo no administra invitaciones reales.');
    if(m.backendMode==='local'){
      const s=settings(),party=currentParty(),code=makeInviteCode();
      const nextParty={...party,inviteCode:code,inviteActive:true,inviteUses:0,inviteMaxUses:options.maxUses||null,inviteExpiresAt:options.days?addDays(todayStr(),options.days):null};
      saveSettings({localParties:{...s.localParties,[party.id]:nextParty},pendingInviteCode:''});
      saveMembership({...m,inviteCode:code,party:nextParty,updatedAt:nowIso()}); renderGymParty(); flashMessage(`Nuevo codigo: ${code}`); return;
    }
    const runtime=await loadFirebaseRuntime(); const {db,auth,firestoreMod}=runtime; assertFirebaseSessionMatchesMembership(auth,m);
    const partyRef=firestoreMod.doc(db,collections.parties,m.partyId),partySnap=await firestoreMod.getDoc(partyRef);
    if(!partySnap.exists()) throw new Error('PARTY_NOT_FOUND');
    let code='';
    for(let attempt=0;attempt<4&&!code;attempt++){
      const candidate=makeInviteCode(); const existing=await firestoreMod.getDoc(firestoreMod.doc(db,collections.invites,candidate)); if(!existing.exists()) code=candidate;
    }
    if(!code) throw new Error('No pude generar un codigo unico. Intenta otra vez.');
    const party=partySnap.data(),timestamp=firestoreMod.serverTimestamp(),invite={inviteCode:code,partyId:m.partyId,partyName:party.name||'Gym Party',createdBy:m.userId,createdAt:timestamp,updatedAt:timestamp,active:true,membersCount:Number(party.membersCount)||1,maxMembers:Number(party.maxMembers)||MAX_GYM_PARTY_MEMBERS,uses:0};
    if(options.maxUses) invite.maxUses=options.maxUses;
    if(options.days) invite.expiresAt=firestoreMod.Timestamp.fromDate(new Date(Date.now()+options.days*86400000));
    const batch=firestoreMod.writeBatch(db);
    batch.set(firestoreMod.doc(db,collections.invites,code),invite);
    if(party.inviteCode) batch.update(firestoreMod.doc(db,collections.invites,party.inviteCode),{active:false,updatedAt:timestamp});
    batch.update(partyRef,{inviteCode:code,updatedAt:timestamp});
    await batch.commit();
    const localParty={...(m.party||{}),...party,inviteCode:code,inviteActive:true};
    saveMembership({...m,inviteCode:code,party:localParty,updatedAt:nowIso()}); saveSettings({pendingInviteCode:''}); renderGymParty(); flashMessage(`Nuevo codigo creado: ${code}`);
  }
  async function revokeInvite(){
    const m=activeMembership(); if(!m||m.role!=='owner') throw new Error('Solo el owner puede revocar invitaciones.');
    if(window.confirm&&!window.confirm('Nadie podra unirse con el codigo actual. ¿Revocarlo?')) return;
    if(m.backendMode==='demo') throw new Error('El modo demo no administra invitaciones reales.');
    if(m.backendMode==='local'){
      const s=settings(),party=currentParty(),nextParty={...party,inviteActive:false}; saveSettings({localParties:{...s.localParties,[party.id]:nextParty}}); saveMembership({...m,party:nextParty,updatedAt:nowIso()}); renderGymParty(); flashMessage('Codigo revocado.'); return;
    }
    const runtime=await loadFirebaseRuntime(); const {db,auth,firestoreMod}=runtime; assertFirebaseSessionMatchesMembership(auth,m);
    const code=currentParty()?.inviteCode||m.inviteCode; if(!code) return;
    await firestoreMod.updateDoc(firestoreMod.doc(db,collections.invites,code),{active:false,updatedAt:firestoreMod.serverTimestamp()});
    saveMembership({...m,party:{...(m.party||{}),inviteActive:false},updatedAt:nowIso()}); renderGymParty(); flashMessage('Codigo revocado. Regenera uno cuando quieras volver a invitar.');
  }
  async function deactivateFirebaseMembership({skipConfirm=false}={}){
    const m=activeMembership(); if(!m||m.backendMode!=='firebase') throw new Error('No hay membresia Firebase activa.');
    const owner=m.role==='owner';
    if(!skipConfirm&&window.confirm&&!window.confirm(owner?'Al ser owner, se desactivara toda la sala y el codigo. Tus entrenamientos locales permanecen. ¿Continuar?':'Se desactivara tu membresia remota. Tus entrenamientos locales permanecen. ¿Continuar?')) return;
    const runtime=await loadFirebaseRuntime(); const {db,auth,firestoreMod}=runtime; assertFirebaseSessionMatchesMembership(auth,m);
    const memberRef=firestoreMod.doc(db,collections.members,memberIdForLocalParty(m.partyId,m.userId)),partyRef=firestoreMod.doc(db,collections.parties,m.partyId);
    const partyBefore=await firestoreMod.getDoc(partyRef),code=partyBefore.data()?.inviteCode||currentParty()?.inviteCode||m.inviteCode,inviteRef=code?firestoreMod.doc(db,collections.invites,code):null;
    if(owner){
      const batch=firestoreMod.writeBatch(db),timestamp=firestoreMod.serverTimestamp();
      batch.update(memberRef,{active:false,updatedAt:timestamp}); batch.update(partyRef,{active:false,updatedAt:timestamp}); if(inviteRef) batch.update(inviteRef,{active:false,updatedAt:timestamp}); await batch.commit();
    }else{
      await firestoreMod.runTransaction(db,async transaction=>{
        const memberSnap=await transaction.get(memberRef),partySnap=await transaction.get(partyRef),inviteSnap=inviteRef?await transaction.get(inviteRef):null;
        if(!memberSnap.exists()||memberSnap.data().active===false) return;
        const timestamp=firestoreMod.serverTimestamp(),nextCount=Math.max(0,Number(partySnap.data()?.membersCount||1)-1);
        transaction.update(memberRef,{active:false,updatedAt:timestamp}); transaction.update(partyRef,{membersCount:nextCount,updatedAt:timestamp}); if(inviteSnap?.exists()) transaction.update(inviteRef,{membersCount:nextCount,updatedAt:timestamp});
      });
    }
    saveSharedSessions(sharedSessions().filter(row=>row.partyId!==m.partyId)); saveSharedSets(sharedSets().filter(row=>row.partyId!==m.partyId)); localStorage.removeItem(keys.membership); renderGymParty(); flashMessage(owner?'Sala desactivada. Tus entrenamientos locales permanecen.':'Membresia Firebase desactivada. Tus entrenamientos locales permanecen.');
  }
  async function tombstoneOwnSharedCollection(runtime,collectionName,extraFields){
    const m=activeMembership(),{db,firestoreMod}=runtime; let cursor=null;
    do{
      const constraints=[firestoreMod.where('partyId','==',m.partyId),firestoreMod.where('userId','==',m.userId),firestoreMod.orderBy(firestoreMod.documentId()),firestoreMod.limit(350)];
      if(cursor) constraints.splice(3,0,firestoreMod.startAfter(cursor));
      const snap=await firestoreMod.getDocs(firestoreMod.query(firestoreMod.collection(db,collectionName),...constraints));
      if(snap.empty) break;
      const batch=firestoreMod.writeBatch(db),timestamp=firestoreMod.serverTimestamp(); snap.docs.forEach(docSnap=>batch.update(docSnap.ref,{...extraFields,deletedAt:timestamp,updatedAt:timestamp})); await batch.commit();
      cursor=snap.docs.length===350?snap.docs[snap.docs.length-1]:null;
    }while(cursor);
  }
  async function deleteSharedDataAndLeave(){
    const m=activeMembership(); if(!m||m.backendMode!=='firebase') throw new Error('No hay membresia Firebase activa.');
    if(window.confirm&&!window.confirm('Se ocultaran y marcaran como eliminadas tus sesiones y series compartidas. Tus entrenamientos locales NO se borran. ¿Continuar?')) return;
    const runtime=await loadFirebaseRuntime();
    await tombstoneOwnSharedCollection(runtime,collections.sets,{deleted:true,deletedReason:'privacy-removal'});
    await tombstoneOwnSharedCollection(runtime,collections.sessions,{deletedReason:'privacy-removal'});
    await deactivateFirebaseMembership({skipConfirm:true});
  }
  function newRoomFlow(){
    const ok = window.confirm ? window.confirm('Vas a salir de la sala actual en este dispositivo para crear una sala nueva. Tus entrenamientos locales no se borran.') : true;
    if(!ok) return;
    clearMembership();
    flashMessage('Listo. Ahora podés crear una sala nueva y generar un código.');
  }

  async function loadFirebaseRuntime(){
    if(firebaseRuntime) return firebaseRuntime;
    if(firebaseInitPromise) return firebaseInitPromise;
    firebaseInitPromise = (async () => {
      const config = effectiveFirebaseConfig();
      if(!hasFirebaseConfig(config)) throw new Error('FIREBASE_NOT_CONFIGURED');
      if(window.FIREBASE_SERVICE?.load){
        const runtime=await window.FIREBASE_SERVICE.load({version:FIREBASE_SDK_VERSION,config,name:'gym-party'});
        await ensurePersistentAnonymousAuth(runtime.authMod,runtime.auth);
        firebaseRuntime=runtime;
        return firebaseRuntime;
      }
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
      const [appMod, authMod, firestoreMod] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`)
      ]);
      const app = appMod.getApps().find(item => item.name === 'gym-party') || appMod.initializeApp(config, 'gym-party');
      const auth = authMod.getAuth(app);
      const db = firestoreMod.getFirestore(app);
      await ensurePersistentAnonymousAuth(authMod, auth);
      firebaseRuntime = {app, auth, db, appMod, authMod, firestoreMod};
      return firebaseRuntime;
    })();
    return firebaseInitPromise;
  }
  async function ensurePersistentAnonymousAuth(authMod, auth){
    if(authMod.setPersistence && authMod.browserLocalPersistence){
      try{
        await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      }catch(error){
        if(typeof console !== 'undefined') console.warn('Firebase Auth local persistence unavailable', error);
      }
    }
    const restored = await waitForInitialAuth(authMod, auth);
    if(restored) return restored;
    const credential = await authMod.signInAnonymously(auth);
    return credential?.user || auth.currentUser;
  }
  function waitForInitialAuth(authMod, auth){
    if(auth.currentUser) return Promise.resolve(auth.currentUser);
    if(typeof authMod.onAuthStateChanged !== 'function') return Promise.resolve(null);
    return new Promise(resolve => {
      let settled = false;
      let unsubscribe = null;
      const finish = user => {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        if(unsubscribe) unsubscribe();
        else setTimeout(() => { if(unsubscribe) unsubscribe(); }, 0);
        resolve(user || auth.currentUser || null);
      };
      const timer = setTimeout(() => finish(auth.currentUser || null), 1800);
      unsubscribe = authMod.onAuthStateChanged(auth, finish, () => finish(auth.currentUser || null));
    });
  }
  function assertFirebaseSessionMatchesMembership(auth, m){
    const uidValue = auth?.currentUser?.uid || '';
    if(m?.backendMode === 'firebase' && m.userId && uidValue && uidValue !== m.userId){
      throw new Error('Este navegador perdio la sesion anonima original. Tus entrenamientos locales siguen guardados; para volver a sincronizar, unite otra vez con el codigo de la sala.');
    }
  }
  function hasFirebaseConfig(config){
    if(window.FIREBASE_SERVICE?.hasConfig) return window.FIREBASE_SERVICE.hasConfig(config);
    return !!(config && config.apiKey && config.authDomain && config.projectId && config.appId);
  }
  function firebaseError(error){
    const code = error?.code || '';
    if(error?.message === 'EMAIL_AUTH_UNAVAILABLE') return 'El SDK de Firebase Auth no expuso email/clave en este navegador.';
    if(code === 'auth/operation-not-allowed') return 'En Firebase Console falta activar Authentication > Sign-in method > Email/Password.';
    if(code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') return 'Ese email ya esta asociado a otro acceso. Usa Entrar con acceso existente o elegi otro email.';
    if(code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Email o clave incorrectos. Revisa el acceso guardado.';
    if(error?.message === 'FIREBASE_NOT_CONFIGURED') return 'Configurá Firebase antes de crear o unirte a una sala real.';
    if(error?.message === 'PARTY_NOT_FOUND') return 'No encontré una sala activa con ese código.';
    if(error?.message === 'PARTY_FULL') return 'Esta sala alcanzó el límite recomendado de 10 miembros para mantener la app rápida y clara.';
    return `No pude completar la acción Firebase: ${error?.message || error}`;
  }
  async function testFirebaseLogin(){
    try{
      const runtime = await loadFirebaseRuntime();
      const status = document.getElementById('gymPartyFirebaseStatus');
      if(status) status.textContent = `Login anónimo activo: ${runtime.auth.currentUser.uid}`;
      flashMessage('Firebase conectado con login anónimo.');
    }catch(error){
      flashMessage(firebaseError(error));
    }
  }
  async function linkPortableAccess(){
    const m = activeMembership();
    if(!m || m.backendMode !== 'firebase') throw new Error('Primero crea o unite a una Gym Party online.');
    const credentials = portableAccessCredentials();
    if(!credentials.ok) throw new Error(credentials.message);
    const runtime = await loadFirebaseRuntime();
    const {auth, authMod} = runtime;
    assertFirebaseSessionMatchesMembership(auth, m);
    if(!authMod.EmailAuthProvider || !authMod.linkWithCredential) throw new Error('EMAIL_AUTH_UNAVAILABLE');
    const emailCredential = authMod.EmailAuthProvider.credential(credentials.email, credentials.password);
    if(auth.currentUser?.isAnonymous){
      await authMod.linkWithCredential(auth.currentUser, emailCredential);
    }else if(cleanEmail(auth.currentUser?.email || '') !== credentials.email){
      throw new Error('Ya hay otro email conectado en este navegador.');
    }
    saveSettings({portableAccessEmail: credentials.email, backendMode: 'firebase'});
    await syncFirebaseNow({silent: true});
    flashMessage('Acceso guardado. Ya podes entrar desde otro dispositivo con ese email y clave.');
  }
  async function restorePortableAccess(){
    const credentials = portableAccessCredentials();
    if(!credentials.ok) throw new Error(credentials.message);
    const runtime = await loadFirebaseRuntime();
    const {auth, authMod} = runtime;
    if(!authMod.signInWithEmailAndPassword) throw new Error('EMAIL_AUTH_UNAVAILABLE');
    await authMod.signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    saveSettings({portableAccessEmail: credentials.email, backendMode: 'firebase'});
    await restoreFirebaseMembershipForCurrentUser(runtime);
    renderGymParty();
    flashMessage('Gym Party restaurada en este dispositivo.');
  }
  async function restoreFirebaseMembershipForCurrentUser(runtime = null){
    const activeRuntime = runtime || await loadFirebaseRuntime();
    const {db, auth, firestoreMod} = activeRuntime;
    const uidValue = auth.currentUser?.uid || '';
    if(!uidValue) throw new Error('No hay usuario Firebase activo.');
    const memberQuery = firestoreMod.query(
      firestoreMod.collection(db, collections.members),
      firestoreMod.where('userId','==', uidValue),
      firestoreMod.where('active','==', true),
      firestoreMod.limit(MAX_GYM_PARTY_MEMBERS)
    );
    const memberSnap = await firestoreMod.getDocs(memberQuery);
    const memberships = memberSnap.docs.map(docSnap => docSnap.data())
      .sort((a,b) => String(b.joinedAt || '').localeCompare(String(a.joinedAt || '')));
    const member = memberships[0];
    if(!member) throw new Error('No encontre una Gym Party vinculada a este acceso.');
    const partyRef = firestoreMod.doc(db, collections.parties, member.partyId);
    const partySnap = await firestoreMod.getDoc(partyRef);
    if(!partySnap.exists() || partySnap.data().active === false) throw new Error('PARTY_NOT_FOUND');
    const membersQuery = firestoreMod.query(
      firestoreMod.collection(db, collections.members),
      firestoreMod.where('partyId','==', member.partyId),
      firestoreMod.where('active','==', true),
      firestoreMod.limit(MAX_GYM_PARTY_MEMBERS + 1)
    );
    const membersSnap = await firestoreMod.getDocs(membersQuery);
    const members = membersSnap.docs.map(docSnap => docSnap.data());
    const party = {
      id: member.partyId,
      ...partySnap.data(),
      inviteCode: partySnap.data().inviteCode || member.inviteCode || '',
      members,
      membersCount: members.length,
      maxMembers: partySnap.data().maxMembers || MAX_GYM_PARTY_MEMBERS
    };
    const privacy = privacyFromMember(member);
    saveMembership({
      partyId: member.partyId,
      inviteCode: party.inviteCode,
      userId: uidValue,
      alias: member.aliasInParty || member.alias || cleanEmail(auth.currentUser.email || 'Atleta'),
      role: member.role || 'member',
      backendMode: 'firebase',
      active: true,
      privacy,
      joinedAt: member.joinedAt || nowIso(),
      party
    });
    syncFromLocalWorkouts({silent: true});
    await syncFirebaseNow({silent: true});
    return party;
  }
  async function createFirebaseParty({name, alias, privacy}){
    const runtime = await loadFirebaseRuntime();
    const {db, auth, firestoreMod} = runtime;
    const uidValue = auth.currentUser.uid;
    const partyId = uid('party');
    const inviteCode = makeInviteCode();
    const member = {
      id: memberIdForLocalParty(partyId, uidValue),
      partyId,
      inviteCode,
      userId: uidValue,
      aliasInParty: alias,
      role: 'owner',
      joinedAt: nowIso(),
      active: true,
      ...privacy
    };
    const party = {
      id: partyId,
      name,
      inviteCode,
      createdBy: uidValue,
      createdAt: nowIso(),
      active: true,
      privacyMode: 'gym-only',
      membersCount: 1,
      maxMembers: MAX_GYM_PARTY_MEMBERS,
      members: [member]
    };
    const partyDoc = {...party};
    delete partyDoc.members;
    const batch=firestoreMod.writeBatch(db);
    const timestamp=firestoreMod.serverTimestamp();
    batch.set(firestoreMod.doc(db, collections.publicProfiles, uidValue), {uid: uidValue, alias, avatar: '', createdAt: timestamp, updatedAt: timestamp}, {merge: true});
    batch.set(firestoreMod.doc(db, collections.parties, partyId), {...partyDoc,createdAt:timestamp,updatedAt:timestamp});
    batch.set(firestoreMod.doc(db, collections.members, member.id), {...member,joinedAt:timestamp,updatedAt:timestamp});
    batch.set(firestoreMod.doc(db, collections.invites, inviteCode), {inviteCode,partyId,partyName:name,createdBy:uidValue,createdAt:timestamp,updatedAt:timestamp,active:true,membersCount:1,maxMembers:MAX_GYM_PARTY_MEMBERS,uses:0});
    await batch.commit();
    saveMembership({partyId, inviteCode, userId: uidValue, alias, role: 'owner', backendMode: 'firebase', active: true, privacy, joinedAt: nowIso(), party});
    saveSettings({backendMode: 'firebase'});
    syncFromLocalWorkouts({silent: true});
    await syncFirebaseNow({silent: true});
    renderGymParty();
    flashMessage('Gym Party Firebase creada. Copia el código para invitar.');
  }
  async function joinFirebaseParty({code, alias, privacy}){
    const runtime = await loadFirebaseRuntime();
    const {db, auth, firestoreMod} = runtime;
    const inviteRef = firestoreMod.doc(db, collections.invites, code);
    const preflight=await firestoreMod.getDoc(inviteRef);
    if(!preflight.exists()||preflight.data().active===false) throw new Error('PARTY_NOT_FOUND');
    if(window.confirm&&!window.confirm(`Vas a unirte a "${preflight.data().partyName||'Gym Party'}". ¿Continuar?`)) return;
    let invite=null;
    let member=null;
    await firestoreMod.runTransaction(db,async transaction=>{
      const inviteSnap=await transaction.get(inviteRef);
      if(!inviteSnap.exists()||inviteSnap.data().active===false) throw new Error('PARTY_NOT_FOUND');
      invite=inviteSnap.data();
      const partyRef=firestoreMod.doc(db,collections.parties,invite.partyId);
      const memberRef=firestoreMod.doc(db,collections.members,memberIdForLocalParty(invite.partyId,auth.currentUser.uid));
      const memberSnap=await transaction.get(memberRef);
      if(memberSnap.exists()&&memberSnap.data().active){member=memberSnap.data();return;}
      const membersCount=Number(invite.membersCount||0);
      const uses=Number(invite.uses||0);
      if(membersCount>=Number(invite.maxMembers||MAX_GYM_PARTY_MEMBERS)) throw new Error('PARTY_FULL');
      if(invite.maxUses!==null&&invite.maxUses!==undefined&&uses>=Number(invite.maxUses)) throw new Error('PARTY_NOT_FOUND');
      member={id:memberIdForLocalParty(invite.partyId,auth.currentUser.uid),partyId:invite.partyId,inviteCode:code,userId:auth.currentUser.uid,aliasInParty:alias,role:'member',joinedAt:nowIso(),active:true,...privacy};
      const timestamp=firestoreMod.serverTimestamp();
      transaction.set(memberRef,{...member,joinedAt:timestamp,updatedAt:timestamp});
      transaction.update(partyRef,{membersCount:membersCount+1,updatedAt:timestamp});
      transaction.update(inviteRef,{membersCount:membersCount+1,uses:uses+1,updatedAt:timestamp});
      transaction.set(firestoreMod.doc(db,collections.publicProfiles,auth.currentUser.uid),{uid:auth.currentUser.uid,alias,avatar:'',createdAt:timestamp,updatedAt:timestamp},{merge:true});
    });
    if(!invite||!member) throw new Error('PARTY_NOT_FOUND');
    const partyRef = firestoreMod.doc(db, collections.parties, invite.partyId);
    const membersQuery = firestoreMod.query(firestoreMod.collection(db, collections.members), firestoreMod.where('partyId','==', invite.partyId), firestoreMod.where('active','==', true), firestoreMod.limit(MAX_GYM_PARTY_MEMBERS + 1));
    const membersSnap = await firestoreMod.getDocs(membersQuery);
    const members = membersSnap.docs.map(docSnap => docSnap.data());
    const partySnap = await firestoreMod.getDoc(partyRef);
    if(!partySnap.exists() || partySnap.data().active === false) throw new Error('PARTY_NOT_FOUND');
    const party = {id: invite.partyId, ...partySnap.data(), inviteCode: code};
    const nextMembers = upsertById(members, [member]);
    const partyWithMembers = {...party, members: nextMembers, membersCount: nextMembers.length, maxMembers: party.maxMembers || MAX_GYM_PARTY_MEMBERS};
    saveMembership({partyId: invite.partyId, inviteCode: code, userId: auth.currentUser.uid, alias, role: member.role, backendMode: 'firebase', active: true, privacy, joinedAt: nowIso(), party: partyWithMembers});
    saveSettings({backendMode: 'firebase',pendingInviteCode:''});
    await syncFirebaseNow({silent: true});
    renderGymParty();
    flashMessage('Te uniste a la Gym Party Firebase.');
  }
  function markUploadedRows(collectionName,ids,error=null,attempts=0){
    const isSession=collectionName===collections.sessions,current=isSession?sharedSessions():sharedSets();
    const next=error?(syncEngine()?.markRowsError?.(current,ids,error,attempts)||current):(syncEngine()?.markRowsSynced?.(current,ids)||current);
    if(isSession) saveSharedSessions(next); else saveSharedSets(next);
  }
  async function uploadSyncQueue(runtime,{force=false}={}){
    const {db,firestoreMod}=runtime; let queue=syncQueue(); const now=Date.now();
    const due=queue.filter(op=>force||!op.nextAttemptAt||new Date(op.nextAttemptAt).getTime()<=now);
    for(let index=0;index<due.length;index+=400){
      const chunk=due.slice(index,index+400),batch=firestoreMod.writeBatch(db),timestamp=firestoreMod.serverTimestamp();
      chunk.forEach(op=>batch.set(firestoreMod.doc(db,op.collection,op.payload.id),{...firestorePayload(op.payload),updatedAt:timestamp}));
      try{
        await batch.commit();
        const completed=new Set(chunk.map(op=>op.id)); queue=queue.filter(op=>!completed.has(op.id)); saveSyncQueue(queue);
        for(const collectionName of [collections.sessions,collections.sets]) markUploadedRows(collectionName,chunk.filter(op=>op.collection===collectionName).map(op=>op.payload.id));
      }catch(error){
        const failed=new Set(chunk.map(op=>op.id));
        queue=queue.map(op=>{
          if(!failed.has(op.id)) return op;
          const attempts=number(op.attempts)+1,delay=syncEngine()?.backoffDelay?.(attempts)||Math.min(300000,1000*(2**attempts));
          return {...op,attempts,lastError:String(error?.message||error).slice(0,300),nextAttemptAt:new Date(Date.now()+delay).toISOString()};
        });
        saveSyncQueue(queue);
        for(const collectionName of [collections.sessions,collections.sets]){
          const rows=chunk.filter(op=>op.collection===collectionName); if(rows.length) markUploadedRows(collectionName,rows.map(op=>op.payload.id),error,Math.max(...rows.map(op=>number(op.attempts)+1)));
        }
        throw error;
      }
    }
    return {uploaded:due.length,remaining:syncQueue().length};
  }
  async function fetchRemoteCollection(runtime,collectionName,{full=false,pageSize=250}={}){
    const m=activeMembership(),{db,firestoreMod}=runtime,watermark=lastRemoteSyncAt(); let cursor=null,pages=0; const rows=[];
    do{
      const constraints=[firestoreMod.where('partyId','==',m.partyId)];
      if(!full&&watermark) constraints.push(firestoreMod.where('updatedAt','>',firestoreMod.Timestamp.fromDate(new Date(watermark))));
      constraints.push(firestoreMod.orderBy('updatedAt','asc'),firestoreMod.orderBy(firestoreMod.documentId(),'asc'));
      if(cursor) constraints.push(firestoreMod.startAfter(cursor));
      constraints.push(firestoreMod.limit(pageSize));
      const snap=await firestoreMod.getDocs(firestoreMod.query(firestoreMod.collection(db,collectionName),...constraints));
      rows.push(...snap.docs.map(docSnap=>docSnap.data())); pages+=1;
      cursor=snap.docs.length===pageSize?snap.docs[snap.docs.length-1]:null;
    }while(cursor&&pages<50);
    return rows;
  }
  function discardResolvedQueueRows(rows){
    const resolved=new Set(safeArray(rows).filter(row=>!row.dirty&&!row.pendingSync).map(row=>row.id));
    if(!resolved.size) return;
    saveSyncQueue(syncQueue().filter(op=>!resolved.has(op.payload?.id)));
  }
  function reconcileOwnRemoteWorkouts(member,mergedSessions,mergedSets){
    const engine=syncEngine(),api=workoutApi();
    if(!engine?.reconcileWorkoutSessions||!api?.replaceSessionPayload) return;
    const ownSessions=mergedSessions.filter(row=>row.userId===member.userId);
    const ownSets=mergedSets.filter(row=>row.userId===member.userId);
    const result=engine.reconcileWorkoutSessions(localWorkoutSessions(),ownSessions,ownSets);
    result.changedIds.forEach(id=>{
      const session=result.sessions.find(row=>row.id===id);
      if(session) api.replaceSessionPayload(session);
    });
  }
  async function syncFirebaseNow({silent=false,full=false,force=false}={}){
    const m=activeMembership(); if(!m||m.backendMode!=='firebase') return;
    const runtime=await loadFirebaseRuntime(),{db,auth,firestoreMod}=runtime; assertFirebaseSessionMatchesMembership(auth,m);
    try{
      const membersQuery=firestoreMod.query(firestoreMod.collection(db,collections.members),firestoreMod.where('partyId','==',m.partyId),firestoreMod.where('active','==',true),firestoreMod.limit(MAX_GYM_PARTY_MEMBERS+1));
      const shouldFull=full||!lastRemoteSyncAt();
      const [partySnap,membersSnap,remoteSessions,remoteSets]=await Promise.all([
        firestoreMod.getDoc(firestoreMod.doc(db,collections.parties,m.partyId)),
        firestoreMod.getDocs(membersQuery),
        fetchRemoteCollection(runtime,collections.sessions,{full:shouldFull,pageSize:120}),
        fetchRemoteCollection(runtime,collections.sets,{full:shouldFull,pageSize:300})
      ]);
      const localSessions=sharedSessions(),localSets=sharedSets();
      const partySessions=localSessions.filter(row=>row.partyId===m.partyId),partySets=localSets.filter(row=>row.partyId===m.partyId);
      const mergedSessions=syncEngine()?.mergeRemoteRows?.(partySessions,remoteSessions)||upsertById(partySessions,remoteSessions);
      const mergedSets=syncEngine()?.mergeRemoteRows?.(partySets,remoteSets)||upsertById(partySets,remoteSets);
      saveSharedSessions([...localSessions.filter(row=>row.partyId!==m.partyId),...mergedSessions]);
      saveSharedSets([...localSets.filter(row=>row.partyId!==m.partyId),...mergedSets]);
      discardResolvedQueueRows([...mergedSessions,...mergedSets]);
      reconcileOwnRemoteWorkouts(m,mergedSessions,mergedSets);
      const upload=await uploadSyncQueue(runtime,{force});
      const members=membersSnap.docs.map(docSnap=>docSnap.data()),party={...(m.party||currentParty()||{}),...(partySnap.exists()?partySnap.data():{}),members,membersCount:members.length,maxMembers:partySnap.data()?.maxMembers||MAX_GYM_PARTY_MEMBERS};
      saveMembership({...m,party,inviteCode:party.inviteCode||m.inviteCode,updatedAt:nowIso()});
      const latest=syncEngine()?.latestRemoteTimestamp?.([...remoteSessions,...remoteSets])||''; if(latest) setLastRemoteSyncAt(latest);
      setLastSync(); saveSettings({syncLastError:'',syncLastMode:shouldFull?'full':'incremental',syncLastDownloaded:remoteSessions.length+remoteSets.length});
      if(!silent) flashMessage(`Gym Party sincronizada: ${upload.uploaded} subida(s), ${remoteSessions.length+remoteSets.length} cambio(s) remoto(s).`);
      return {uploaded:upload.uploaded,downloaded:remoteSessions.length+remoteSets.length,full:shouldFull};
    }catch(error){
      saveSettings({syncLastError:String(error?.message||error).slice(0,300),syncLastFailedAt:nowIso()});
      throw error;
    }
  }

  function exportableSettings(){
    const value = {...settings()};
    delete value.firebaseConfig;
    delete value.portableAccessEmail;
    delete value.pendingInviteCode;
    return value;
  }
  function importableSettings(value){
    const next = {...value};
    delete next.firebaseConfig;
    delete next.portableAccessEmail;
    delete next.pendingInviteCode;
    return next;
  }
  function exportState(){
    return {
      gymPartySettings: exportableSettings(),
      gymPartyMembership: membership(),
      sharedWorkoutSessions: sharedSessions(),
      sharedWorkoutSets: sharedSets(),
      syncQueue: syncQueue(),
      lastGymPartySyncAt: lastSyncAt(),
      lastGymPartyRemoteSyncAt:lastRemoteSyncAt(),
      gymPartyDemoData: read(keys.demoData, null)
    };
  }
  function importState(state){
    if(!state || typeof state !== 'object') return;
    if(state.gymPartySettings) write(keys.settings, importableSettings(state.gymPartySettings));
    if(state.gymPartyMembership) write(keys.membership, state.gymPartyMembership);
    if(Array.isArray(state.sharedWorkoutSessions)) write(keys.sharedWorkoutSessions, state.sharedWorkoutSessions);
    if(Array.isArray(state.sharedWorkoutSets)) write(keys.sharedWorkoutSets, state.sharedWorkoutSets);
    if(Array.isArray(state.syncQueue)) write(keys.syncQueue, state.syncQueue);
    if(state.lastGymPartySyncAt) write(keys.lastSyncAt, state.lastGymPartySyncAt);
    if(state.lastGymPartyRemoteSyncAt) write(keys.lastRemoteSyncAt,state.lastGymPartyRemoteSyncAt);
    if(state.gymPartyDemoData) write(keys.demoData, state.gymPartyDemoData);
  }

  function setupEvents(){
    if(window.__gymPartyEventsInstalled) return;
    window.__gymPartyEventsInstalled = true;
    document.addEventListener('click', event => {
      const helpButtonEl = event.target.closest('[data-party-help]');
      if(helpButtonEl){ event.preventDefault(); event.stopPropagation(); showHelp(helpButtonEl.dataset.partyHelp); return; }
      const button = event.target.closest('[data-gym-party-action]');
      if(!button) return;
      runGymPartyAction(button.dataset.gymPartyAction, event);
    });
    document.addEventListener('change', event => {
      if(event.target && event.target.id === 'gymPartyExerciseSelect'){
        saveSettings({selectedExerciseId: event.target.value});
        renderGymParty();
      }
      if(event.target && event.target.id === 'partyQuickExerciseSelect'){
        const value=event.target.value;
        if(value.startsWith('library:')){
          const api=workoutApi();
          const exercise=api?.getExerciseLibrary?.().find(item=>item.id===value.slice(8));
          const result=exercise?api.addManualExercisePayload({date:selectedWorkoutDate(),name:exercise.name,muscle:exercise.group,type:exercise.type,unit:exercise.unit,bodyweight:exercise.bodyweight||exercise.unit==='peso corporal',persistScope:'session',rememberForWeekday:false,saveToLibrary:false}):null;
          saveSettings({partyQuickExerciseId:result?.exercise?.id||'',partyEditingSetId:''});
          if(result?.ok) refreshPartyWorkoutShare();
        }else saveSettings({partyQuickExerciseId:value,partyEditingSetId:''});
        renderGymParty();
      }
      if(event.target && event.target.id === 'partyExerciseSearch'){
        saveSettings({partyExerciseSearch:event.target.value||'',partyQuickExerciseId:'',partyEditingSetId:''});
        renderGymParty();
      }
      if(event.target && event.target.id === 'partyWorkoutDateInput'){
        setPartyWorkoutDate(event.target.value || todayStr());
      }
      if(event.target && ['partyRestTimerEnabled','partyRestSeconds','partyHapticEnabled'].includes(event.target.id)){
        workoutApi()?.updateGymSettings?.({restTimerEnabled:!!document.getElementById('partyRestTimerEnabled')?.checked,restSeconds:Math.max(15,number(document.getElementById('partyRestSeconds')?.value)||90),hapticEnabled:!!document.getElementById('partyHapticEnabled')?.checked});
      }
    });
    document.addEventListener('input',event=>{
      if(event.target&&['partyQuickReps','partyQuickWeight','partyQuickBodyweight','partyQuickRir','partyQuickRpe','partyQuickNote'].includes(event.target.id))capturePartyQuickDraft();
    });
    if(typeof window.addEventListener === 'function'){
      window.addEventListener('online', () => {
        const m = activeMembership();
        if(m?.backendMode === 'firebase' && syncQueue().length){
          syncNow({force:false}).catch(() => flashMessage('Hay datos pendientes; probá sincronizar manualmente.'));
        }
      });
    }
  }
  function installGymHook(){
    if(window.__gymPartyRenderGymHook || typeof window.renderGym !== 'function') return;
    window.__gymPartyRenderGymHook = true;
    const original = window.renderGym;
    window.renderGym = function(){
      const result = original.apply(this, arguments);
      syncFromLocalWorkouts({silent: true});
      if(document.getElementById('tab-gym-party') && !document.getElementById('tab-gym-party').classList.contains('hidden')) renderGymParty();
      return result;
    };
  }
  function applyInviteFromUrl(){
    if(window.__gymPartyInviteApplied || typeof window.location === 'undefined' || typeof URLSearchParams === 'undefined') return;
    const code = normalizeCode(new URLSearchParams(window.location.search || '').get('gymPartyCode'));
    if(!code) return;
    window.__gymPartyInviteApplied = true;
    saveSettings({pendingInviteCode:code});
    try{
      const cleanUrl=new URL(window.location.href);
      cleanUrl.searchParams.delete('gymPartyCode');
      window.history?.replaceState?.(window.history.state,'',`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }catch(error){}
    setTimeout(() => {
      if(typeof window.setModule === 'function') window.setModule('gym-party');
      else renderGymParty();
      setTimeout(() => {
        const input = document.getElementById('gymPartyJoinCode');
        if(input) input.value = code;
        const alias = document.getElementById('gymPartyJoinAlias');
        if(alias) alias.focus();
      }, 40);
    }, 0);
  }
  function resumeFirebaseMembership(){
    if(window.__gymPartyResumeSyncStarted) return;
    const m = activeMembership();
    if(!m || m.backendMode !== 'firebase') return;
    if(typeof navigator !== 'undefined' && navigator.onLine === false) return;
    window.__gymPartyResumeSyncStarted = true;
    setTimeout(() => {
      syncFromLocalWorkouts({silent: true});
      syncFirebaseNow({silent: true})
        .then(() => {
          if(document.getElementById('gymPartyRoot')) renderGymParty();
        })
        .catch(error => {
          if(typeof console !== 'undefined') console.warn('Gym Party resume sync failed', error);
        });
    }, 250);
  }

  window.GYM_PARTY_FEATURES = {
    keys,
    collections,
    MAX_GYM_PARTY_MEMBERS,
    FIREBASE_SDK_VERSION,
    buildDemoData,
    calculatePartyStats,
    muscleInsightModel,
    exportState,
    importState,
    renderGymParty,
    syncFromLocalWorkouts,
    syncNow,
    hasFirebaseConfig,
    effectiveFirebaseConfig,
    firebaseConfigSource,
    waitForInitialAuth,
    assertFirebaseSessionMatchesMembership,
    restoreFirebaseMembershipForCurrentUser,
    privacyFromMember
  };
  window.renderGymParty = renderGymParty;

  setupEvents();
  installGymHook();
  applyInviteFromUrl();
  resumeFirebaseMembership();
  if(document.getElementById('gymPartyRoot')) renderGymParty();
})();
