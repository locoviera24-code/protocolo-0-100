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
  function nowIso(){ return new Date().toISOString(); }
  function number(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function round(value, digits = 1){
    const p = 10 ** digits;
    return Math.round(number(value) * p) / p;
  }
  function percentChange(current, previous){
    if(!previous) return current ? 100 : 0;
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
    const sessions = sharedSessions().filter(s => s.partyId === m.partyId);
    const sets = sharedSets().filter(s => s.partyId === m.partyId);
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
      privacyMode: 'gym-only',
      membersCount: 1,
      maxMembers: MAX_GYM_PARTY_MEMBERS,
      members: [member]
    };
    saveSettings({backendMode: 'local', localParties: {...s.localParties, [partyId]: party}});
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
    if(!party.active){ flashMessage('La sala no está activa.'); return; }
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
    const nextParty = {...party, members: [...(party.members || []), member], membersCount: (party.members || []).length + 1};
    saveSettings({localParties: {...s.localParties, [party.id]: nextParty}});
    saveMembership({partyId: party.id, inviteCode: party.inviteCode, userId, alias, role: 'member', backendMode: 'local', active: true, privacy, joinedAt: nowIso(), party: nextParty});
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
    return {
      totalSets: allSets.length,
      totalReps,
      totalVolume: Math.round(totalVolume),
      exercisesCompleted: exercises.filter(exercise => exercise.completed || safeArray(exercise.sets).length > 0).length
    };
  }
  function sanitizeWorkoutSession(session, member, privacy){
    const summary = session.summary || sessionSummaryFromExercises(session);
    const hide = !!privacy.hideAbsoluteWeights;
    const startedAt = session.startedAt || session.savedAt || `${session.date || todayStr()}T00:00:00.000Z`;
    const finishedAt = session.finishedAt || null;
    return {
      id: `${member.partyId}_${member.userId}_${session.id}`,
      partyId: member.partyId,
      userId: member.userId,
      localSessionId: session.id,
      date: session.date || todayStr(),
      weekday: session.weekday || weekdayLabel(session.date || todayStr()),
      routineName: session.routine?.name || session.routine || session.routineName || 'Entrenamiento',
      startedAt,
      finishedAt,
      durationMinutes: number(summary.durationMinutes) || durationMinutes(startedAt, finishedAt),
      exercisesCompleted: number(summary.completedExercises ?? summary.exercisesCompleted),
      totalSets: number(summary.totalSets),
      totalReps: number(summary.totalReps) || totalRepsForSession(session),
      totalVolume: hide ? null : number(summary.totalVolume),
      createdAt: session.startedAt || session.savedAt || nowIso(),
      updatedAt: nowIso(),
      source: 'local',
      pendingSync: member.backendMode === 'firebase'
    };
  }
  function sanitizeWorkoutSets(session, member, privacy){
    if(privacy.shareAggregateOnly || !privacy.shareSetDetails) return [];
    const hide = !!privacy.hideAbsoluteWeights;
    return safeArray(session.exercises).flatMap(exercise => safeArray(exercise.sets).map((set, index) => ({
      id: `${member.partyId}_${member.userId}_${session.id}_${exercise.id || exercise.exerciseId}_${set.id || index + 1}`,
      partyId: member.partyId,
      sessionId: `${member.partyId}_${member.userId}_${session.id}`,
      userId: member.userId,
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
      createdAt: set.savedAt || session.startedAt || nowIso(),
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
  function queueUpserts(type, rows){
    const queue = syncQueue();
    const map = new Map(queue.map(op => [op.id, op]));
    rows.forEach(row => {
      const id = `${type}:${row.id}`;
      map.set(id, {id, type, collection: type === 'session' ? collections.sessions : collections.sets, payload: row, queuedAt: nowIso(), attempts: 0});
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
    const sessions = local.map(session => sanitizeWorkoutSession(session, member, privacy));
    const sets = local.flatMap(session => sanitizeWorkoutSets(session, member, privacy));
    const withoutOwnSessions = sharedSessions().filter(row => !(row.partyId === m.partyId && row.userId === m.userId && row.source !== 'firebase'));
    const withoutOwnSets = sharedSets().filter(row => !(row.partyId === m.partyId && row.userId === m.userId && row.source !== 'firebase'));
    saveSharedSessions(upsertById(withoutOwnSessions, sessions));
    saveSharedSets(upsertById(withoutOwnSets, sets));
    if(queue && m.backendMode === 'firebase'){
      queueUpserts('session', sessions);
      queueUpserts('set', sets);
    }
    if(!silent && sessions.length) flashMessage('Entrenamientos de gym preparados para compartir.');
    return {sessions, sets};
  }

  function memberStats(member, sessions, sets, start){
    const weekSessions = sessions.filter(session => session.userId === member.userId && inWeek(session.date, start));
    const ids = new Set(weekSessions.map(session => session.id));
    const weekSets = sets.filter(set => set.userId === member.userId && (ids.has(set.sessionId) || inWeek(set.date, start)));
    const totalSets = weekSets.length || weekSessions.reduce((sum, session) => sum + number(session.totalSets), 0);
    const totalReps = weekSets.reduce((sum, set) => sum + number(set.reps), 0) || weekSessions.reduce((sum, session) => sum + number(session.totalReps), 0);
    const totalVolume = weekSets.reduce((sum, set) => sum + number(set.reps) * number(set.weightKg), 0) || weekSessions.reduce((sum, session) => sum + number(session.totalVolume), 0);
    const exercises = new Set(weekSets.map(set => set.exerciseId || set.exerciseName).filter(Boolean));
    const muscleVolume = {};
    weekSets.forEach(set => {
      const muscle = set.muscleGroup || 'General';
      muscleVolume[muscle] = (muscleVolume[muscle] || 0) + number(set.reps) * number(set.weightKg);
    });
    const bestByExercise = {};
    weekSets.forEach(set => {
      const key = set.exerciseId || set.exerciseName;
      const volume = number(set.reps) * number(set.weightKg);
      const score = volume || number(set.reps);
      if(!bestByExercise[key] || score > bestByExercise[key].score){
        bestByExercise[key] = {...set, score, volume};
      }
    });
    return {
      member,
      sessionsCount: weekSessions.length,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      exercisesCount: exercises.size || weekSessions.reduce((sum, session) => sum + number(session.exercisesCompleted), 0),
      consistencyScore: Math.min(100, Math.round(weekSessions.length * 28 + Math.min(16, totalSets))),
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
    const sessions = safeArray(data?.sessions);
    const sets = safeArray(data?.sets);
    return members.map(member => {
      const current = memberStats(member, sessions, sets, currentStart);
      const previous = memberStats(member, sessions, sets, previousStart);
      return {
        member,
        current,
        previous,
        changeVsPreviousWeek: {
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
    const n = number(value);
    if(!n) return `0${suffix}`;
    return `${n > 0 ? '+' : ''}${round(n, 1)}${suffix}`;
  }
  function statCard(label, value, helpId){
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
          <details class="partyFold">
            <summary>Ya tengo un codigo</summary>
            <div class="partyFormCard flat">
              <div class="field"><label>Codigo</label><input type="text" id="gymPartyJoinCode" placeholder="Ej. A1B2C3"></div>
              <div class="field"><label>Tu alias</label><input type="text" id="gymPartyJoinAlias" placeholder="Ej. Juan"></div>
              <input type="hidden" id="gymPartyJoinBackend" value="${backendDefault}">
              <div class="checks">${privacyChecks('join', defaultPrivacy, {compact: true})}</div>
              <button type="button" class="good partyPrimaryAction" data-gym-party-action="join">Entrar</button>
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
          ${statCard('Volumen', `${formatNumber(row.current.totalVolume)} kg`, 'volume')}
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
        <div class="partyCompareCard"><span>Yo</span><strong>${formatNumber(av)} kg</strong><small>${a.current.sessionsCount} sesiones · ${a.current.totalSets} series</small></div>
        <div class="partyCompareCard"><span>Amigo</span><strong>${formatNumber(bv)} kg</strong><small>${b.current.sessionsCount} sesiones · ${b.current.totalSets} series</small></div>
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
  function chartsHtml(data, stats){
    const maxVolume = maxOf(stats, row => row.current.totalVolume);
    const maxSets = maxOf(stats, row => row.current.totalSets);
    const maxSessions = maxOf(stats, row => row.current.sessionsCount);
    return `<div class="moduleCard">
      <h3>Gráficas comparativas</h3>
      <div class="partyChartGrid">
        <div><h3>Volumen semanal ${helpButton('volume')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.totalVolume, maxVolume, memberDisplayName(row.member, data), ' kg')).join('')}</div></div>
        <div><h3>Series semanales ${helpButton('sets')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.totalSets, maxSets, memberDisplayName(row.member, data))).join('')}</div></div>
        <div><h3>Sesiones por semana ${helpButton('consistency')}</h3><div class="comparisonBars">${stats.map(row => bar(row.current.sessionsCount, maxSessions, memberDisplayName(row.member, data))).join('')}</div></div>
        <div><h3>Cambio vs semana anterior ${helpButton('change')}</h3><div class="comparisonBars">${stats.map(row => bar(Math.abs(row.changeVsPreviousWeek.volumePct), 100, `${memberDisplayName(row.member, data)} ${signed(row.changeVsPreviousWeek.volumePct, '%')}`)).join('')}</div></div>
      </div>
      <div class="muted small">Compartir progreso, no competir a ciegas. La constancia también cuenta.</div>
    </div>`;
  }
  function helpButton(id){ return `<button type="button" class="gymPartyHelp" data-party-help="${id}">?</button>`; }
  function exerciseProgressHtml(data){
    const sets = safeArray(data.sets);
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
    const ownSets = safeArray(data.sets).filter(set => set.userId === self.member.userId);
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
    const stats = calculatePartyStats(data);
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
  function selectedPartyExerciseId(){
    return settings().partyQuickExerciseId || '';
  }
  function workoutQuickLoggerHtml(){
    const api = workoutApi();
    if(!api?.getQuickWorkoutState){
      return `<div class="moduleCard"><h3>Registro rapido</h3><div class="emptyState">El modulo Gym se esta cargando. Volve a abrir Gym Party en unos segundos.</div></div>`;
    }
    const state = api.getQuickWorkoutState({exerciseId: selectedPartyExerciseId()});
    const selectedId = selectedPartyExerciseId() || state.currentExerciseId;
    if(state.type === 'rest'){
      return `<div class="moduleCard partyWorkoutLogger">
        <span class="partyStepPill">Rutina del widget</span>
        <h3>${escape(state.title)}</h3>
        <div class="partyTip">${escape(state.message || 'Hoy toca descanso.')}</div>
        <div class="muted small">${escape((state.suggestions||[]).join(' · '))}</div>
      </div>`;
    }
    const options = (state.exercises||[]).map(exercise => `<option value="${escape(exercise.id||exercise.exerciseId)}" ${selectedId===(exercise.id||exercise.exerciseId)?'selected':''}>${escape(exercise.name)} · ${exercise.setsLogged||0} serie(s)</option>`).join('');
    const h = state.history;
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
        <div class="field"><label>Ejercicio</label><select id="partyQuickExerciseSelect">${options}</select></div>
        <div class="partyWorkoutNav">
          <button type="button" class="secondary" data-gym-party-action="party-prev-exercise">Atras</button>
          <button type="button" class="secondary" data-gym-party-action="party-next-exercise">Siguiente</button>
          <button type="button" class="secondary" data-gym-party-action="party-complete-exercise">Completar</button>
        </div>
        <div class="partySetCounters">
          <div><span>Este ejercicio</span><strong>${state.currentExerciseSets||0}</strong><small>series</small></div>
          <div><span>${escape(state.currentExerciseMuscle||'Musculo')}</span><strong>${state.currentMuscleSets||0}</strong><small>series totales</small></div>
        </div>
        <div class="partyQuickInputs">
          <div class="field"><label>Reps</label><input type="number" id="partyQuickReps" min="0" max="200" value="${escape(state.suggestedReps)}"></div>
          <div class="field"><label>Kilos</label><input type="number" id="partyQuickWeight" min="0" step="0.5" value="${escape(state.suggestedWeight)}"></div>
        </div>
        <div class="partyWeightChips">
          ${[0,5,10,20,40,60,80].map(value => `<button type="button" class="secondary" data-gym-party-weight="${value}">${value} kg</button>`).join('')}
        </div>
        <label class="check"><input type="checkbox" id="partyQuickBodyweight" ${state.bodyweight?'checked':''}><span>Peso corporal / lastre opcional.</span></label>
        <details class="partyNestedFold partyAddExerciseFold">
          <summary>Agregar ejercicio extra</summary>
          <div class="partyQuickInputs">
            <div class="field"><label>Nombre</label><input type="text" id="partyManualExerciseName" placeholder="Ej. Face pull"></div>
            <div class="field"><label>Musculo</label><input type="text" id="partyManualExerciseMuscle" placeholder="Ej. Hombro"></div>
          </div>
          <label class="check"><input type="checkbox" id="partyManualBodyweight"><span>Es peso corporal o sin kilos fijos.</span></label>
          <button type="button" class="secondary partyInlineAction" data-gym-party-action="party-add-exercise">Agregar a este entrenamiento</button>
        </details>
        <details class="partyNestedFold">
          <summary>Opcional</summary>
          <div class="partyQuickInputs">
            <div class="field"><label>RIR</label><input type="number" id="partyQuickRir" min="0" max="10" value="2"></div>
            <div class="field"><label>RPE</label><input type="number" id="partyQuickRpe" min="0" max="10" step="0.5"></div>
          </div>
          <div class="field"><label>Nota</label><textarea id="partyQuickNote" placeholder="Tecnica, energia, ajuste..."></textarea></div>
        </details>
        <div class="auditItem">${escape(hint)}</div>
        <div class="partySaveRow">
          <button type="button" class="good partyPrimaryAction" data-gym-party-action="party-save-set">Guardar serie</button>
        </div>
        <div class="buttons partySecondaryActions">
          <button type="button" class="warn" data-gym-party-action="party-finish-workout">Finalizar entrenamiento</button>
        </div>
      </div>
    </div>`;
  }
  function dashboardHtmlSimple(data){
    const m = activeMembership();
    const party = data.party;
    const members = safeArray(data.members);
    const stats = calculatePartyStats(data);
    const self = stats.find(row => row.member.userId === m?.userId) || stats[0] || {current: {}};
    const syncText = m.backendMode === 'demo'
      ? 'Demo'
      : `${m.backendMode === 'firebase' ? 'Online' : 'Local'} - ${syncQueue().length} pendiente(s)`;
    const inviteHint = members.length === 1
      ? `<div class="partyTip">Envia el codigo a tu amigo para empezar a comparar.</div>`
      : '';
    const maxWarning = members.length >= MAX_GYM_PARTY_MEMBERS
      ? `<div class="auditItem warn">Limite recomendado alcanzado: 10 miembros.</div>`
      : '';
    return `
      <div class="moduleCard partyDashboardTop partyDashboardSimple">
        <div class="actionFocusTop">
          <div>
            <span class="partyStepPill">${escape(syncText)}</span>
            <h2>${escape(party.name || 'Gym Party')}</h2>
          </div>
          <span class="statusChip good">${members.length}/${MAX_GYM_PARTY_MEMBERS}</span>
        </div>
        <div class="partyCodeBox">
          <span>Codigo para invitar</span>
          <strong id="gymPartyInviteCode">${escape(party.inviteCode || '')}</strong>
        </div>
        ${m.backendMode === 'demo' ? '<div class="partyTip">Demo: datos ficticios.</div>' : ''}
        ${inviteHint}
        ${maxWarning}
        <div class="partyMainActions">
          <button type="button" class="good" data-gym-party-action="share-code">Enviar codigo</button>
          <button type="button" class="secondary" data-gym-party-action="copy-code">Copiar codigo</button>
          <button type="button" class="secondary" data-gym-party-action="sync">Sincronizar</button>
        </div>
      </div>

      ${workoutQuickLoggerHtml()}

      ${gymPartyGameHtml(data, stats)}

      <div class="moduleCard partyQuickSummary">
        <h3>Esta semana</h3>
        <div class="partyCompareGrid">
          <div class="partyCompareCard"><span>Sesiones</span><strong>${self.current.sessionsCount || 0}</strong><small>registradas</small></div>
          <div class="partyCompareCard"><span>Series</span><strong>${self.current.totalSets || 0}</strong><small>totales</small></div>
          <div class="partyCompareCard"><span>Volumen</span><strong>${formatNumber(self.current.totalVolume || 0)} kg</strong><small>reps x kg</small></div>
          <div class="partyCompareCard"><span>Vs semana pasada</span><strong>${signed(self.changeVsPreviousWeek?.volumePct || 0, '%')}</strong><small>referencia personal</small></div>
        </div>
      </div>

      ${stats.length === 2 ? twoMemberComparisonHtml(data, stats) : ''}
      ${stats.length > 2 ? multiMemberHtml(data, stats) : ''}

      <details class="moduleCard partyFoldCard">
        <summary>Ver graficas y detalle</summary>
        ${chartsHtml(data, stats)}
        <div class="partyGrid">
          ${exerciseProgressHtml(data)}
          ${muscleVolumeHtml(data, stats)}
        </div>
        ${recentSessionsHtml(data)}
      </details>

      <details class="moduleCard partyFoldCard">
        <summary>Mas opciones</summary>
        <div class="buttons partySecondaryActions">
          <button type="button" class="secondary" data-gym-party-action="copy-code">Copiar codigo</button>
          <button type="button" class="secondary" data-gym-party-action="new-room">Crear sala nueva</button>
          <button type="button" class="secondary" data-gym-party-action="export-csv">Exportar CSV</button>
          <button type="button" class="secondary" data-gym-party-action="export-json">Exportar JSON</button>
          <button type="button" class="danger" data-gym-party-action="leave">Salir</button>
        </div>
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
      return `<div class="entryRow"><div><strong>${escape(memberDisplayName(member, data))} · ${escape(session.routineName)}</strong><div class="meta">${escape(session.date)} · ${session.totalSets} series · ${session.totalReps || 0} reps · volumen ${formatNumber(session.totalVolume)} kg</div></div><span class="statusChip good">${escape(session.source || 'sync')}</span></div>`;
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
      .partyWorkoutNav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}
      .partyWorkoutNav button{min-height:48px;font-weight:850}
      .partySaveRow{margin-top:12px}
      .partyInlineAction{width:100%;min-height:46px;margin-top:8px}
      .partyGameCard{border-color:rgba(146,255,194,.28)}
      .partyLevelBar{height:14px;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);margin:12px 0}
      .partyLevelBar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent2),var(--accent))}
      .partyBadgeTrack{margin:10px 0}
      .partyTip{border:1px solid rgba(114,214,255,.28);border-radius:14px;padding:10px 12px;background:rgba(114,214,255,.08);font-weight:750;margin-top:10px}
      .partyQuickSummary{margin-top:12px}
      .partyWorkoutLogger{margin-top:12px}
      .partySetCounters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}
      .partySetCounters div{border:1px solid var(--line);border-radius:14px;padding:11px;background:rgba(255,255,255,.04)}
      .partySetCounters span,.partySetCounters small{display:block;color:var(--muted);font-size:12px}.partySetCounters strong{display:block;font-size:28px;margin:3px 0}
      .partyQuickInputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .partyQuickInputs input{font-size:22px;font-weight:850;text-align:center;min-height:54px}
      .partyWeightChips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
      .partyWeightChips button{min-height:42px}
      @media(max-width:850px){.partyGrid,.partyMembers,.partyChartGrid,.partyCompareGrid,.partyMiniSteps,.partyMainActions,.partyWorkoutNav,.partyQuickInputs,.partySetCounters{grid-template-columns:1fr}.partyWeightChips{grid-template-columns:repeat(2,minmax(0,1fr))}.partyBarRow{grid-template-columns:92px minmax(0,1fr) 72px}.partyCodeBox{align-items:flex-start;flex-direction:column}.partyCodeBox strong{font-size:24px}}
    `;
    document.head.appendChild(style);
  }
  function renderGymParty(){
    const root = document.getElementById('gymPartyRoot');
    if(!root) return;
    ensureStyles();
    syncFromLocalWorkouts({silent: true, queue: false});
    const data = partyData();
    root.innerHTML = data?.party ? dashboardHtmlSimple(data) : noRoomHtmlSimple();
    bindGymPartyActionButtons(root);
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
    else if(action === 'export-csv') exportCsv();
    else if(action === 'export-json') exportJson();
    else if(action === 'save-privacy') savePrivacy();
    else if(action === 'save-firebase') saveFirebaseConfig();
    else if(action === 'clear-firebase') clearFirebaseConfig();
    else if(action === 'login-firebase') testFirebaseLogin();
    else if(action === 'new-room') newRoomFlow();
    else if(action === 'leave') leaveParty();
    else if(action === 'open-gym' && typeof window.setModule === 'function') window.setModule('gym');
    else if(action === 'party-save-set') savePartyWorkoutSet();
    else if(action === 'party-next-exercise') movePartyWorkoutExercise(1);
    else if(action === 'party-prev-exercise') movePartyWorkoutExercise(-1);
    else if(action === 'party-complete-exercise') completePartyWorkoutExercise();
    else if(action === 'party-add-exercise') addPartyManualExercise();
    else if(action === 'party-finish-workout') finishPartyWorkout();
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
        if(input) input.value = button.dataset.gymPartyWeight;
      });
    });
  }

  function copyInviteCode(){
    const code = currentParty()?.inviteCode || '';
    if(!code) return;
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
  function refreshPartyWorkoutShare(){
    syncFromLocalWorkouts({silent: true});
    const m = activeMembership();
    if(m?.backendMode === 'firebase' && typeof navigator !== 'undefined' && navigator.onLine !== false){
      syncFirebaseNow().catch(() => flashMessage('Guardado localmente. Se sincronizara al volver a intentar.'));
    }
  }
  function addPartyManualExercise(){
    const api = workoutApi();
    if(!api?.addManualExercisePayload){ flashMessage('Agregar ejercicio no esta disponible todavia.'); return; }
    const name = document.getElementById('partyManualExerciseName')?.value.trim() || '';
    const muscle = document.getElementById('partyManualExerciseMuscle')?.value.trim() || 'General';
    const bodyweight = !!document.getElementById('partyManualBodyweight')?.checked;
    const result = api.addManualExercisePayload({name, muscle, bodyweight});
    if(!result.ok){ flashMessage(result.message || 'No se pudo agregar el ejercicio.'); return; }
    saveSettings({partyQuickExerciseId: result.exercise?.id || result.state?.currentExerciseId || ''});
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Ejercicio agregado. Ya podes registrar la serie.');
  }
  function savePartyWorkoutSet(){
    const api = workoutApi();
    if(!api?.saveQuickSetPayload){ flashMessage('Registro de gym no disponible todavia.'); return; }
    const result = api.saveQuickSetPayload({
      exerciseId: partyWorkoutSelectedExerciseId(),
      reps: document.getElementById('partyQuickReps')?.value,
      weight: document.getElementById('partyQuickWeight')?.value,
      bodyweight: document.getElementById('partyQuickBodyweight')?.checked,
      rir: document.getElementById('partyQuickRir')?.value,
      rpe: document.getElementById('partyQuickRpe')?.value,
      note: document.getElementById('partyQuickNote')?.value
    });
    if(!result.ok){ flashMessage(result.message || 'No se pudo guardar la serie.'); return; }
    saveSettings({partyQuickExerciseId: result.state?.currentExerciseId || result.exercise?.id || partyWorkoutSelectedExerciseId()});
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Serie guardada en Gym Party.');
  }
  function movePartyWorkoutExercise(direction){
    const api = workoutApi();
    const state = api?.getQuickWorkoutState ? api.getQuickWorkoutState({exerciseId: partyWorkoutSelectedExerciseId()}) : null;
    const list = safeArray(state?.exercises);
    if(!list.length) return;
    const current = partyWorkoutSelectedExerciseId() || state.currentExerciseId;
    const index = Math.max(0, list.findIndex(exercise => (exercise.id || exercise.exerciseId) === current));
    const nextIndex = Math.max(0, Math.min(list.length - 1, index + direction));
    const next = list[nextIndex];
    saveSettings({partyQuickExerciseId: next.id || next.exerciseId});
    renderGymParty();
  }
  function completePartyWorkoutExercise(){
    const api = workoutApi();
    if(!api?.completeQuickExercisePayload){ flashMessage('Registro de gym no disponible todavia.'); return; }
    const result = api.completeQuickExercisePayload({exerciseId: partyWorkoutSelectedExerciseId()});
    if(!result.ok){ flashMessage(result.message || 'No se pudo completar el ejercicio.'); return; }
    saveSettings({partyQuickExerciseId: result.state?.currentExerciseId || ''});
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Ejercicio completado.');
  }
  function finishPartyWorkout(){
    const api = workoutApi();
    if(!api?.finishWorkoutPayload){ flashMessage('Registro de gym no disponible todavia.'); return; }
    const result = api.finishWorkoutPayload({});
    if(!result.ok){ flashMessage(result.message || 'No se pudo finalizar.'); return; }
    refreshPartyWorkoutShare();
    renderGymParty();
    flashMessage('Entrenamiento finalizado.');
  }
  async function syncNow(){
    const m = activeMembership();
    if(!m){ flashMessage('Primero crea o unite a una Gym Party.'); return; }
    syncFromLocalWorkouts({silent: true});
    if(m.backendMode === 'firebase'){
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        flashMessage('Entrenamiento guardado localmente. Se sincronizará con la Gym Party cuando vuelva la conexión.');
        renderGymParty();
        return;
      }
      await syncFirebaseNow();
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
  function leaveParty(){
    const ok = window.confirm ? window.confirm('Vas a salir de la sala en este dispositivo. Tus entrenamientos locales no se borran.') : true;
    if(!ok) return;
    clearMembership();
    flashMessage('Saliste de la Gym Party en este dispositivo.');
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
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
      const [appMod, authMod, firestoreMod] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`)
      ]);
      const app = appMod.getApps().find(item => item.name === 'gym-party') || appMod.initializeApp(config, 'gym-party');
      const auth = authMod.getAuth(app);
      const db = firestoreMod.getFirestore(app);
      if(!auth.currentUser) await authMod.signInAnonymously(auth);
      firebaseRuntime = {app, auth, db, appMod, authMod, firestoreMod};
      return firebaseRuntime;
    })();
    return firebaseInitPromise;
  }
  function hasFirebaseConfig(config){
    return !!(config && config.apiKey && config.authDomain && config.projectId && config.appId);
  }
  function firebaseError(error){
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
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.publicProfiles, uidValue), {uid: uidValue, alias, avatar: '', createdAt: nowIso(), updatedAt: nowIso()}, {merge: true});
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.parties, partyId), partyDoc);
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.invites, inviteCode), {inviteCode, partyId, partyName: name, createdBy: uidValue, createdAt: nowIso(), active: true, membersCount: 1, maxMembers: MAX_GYM_PARTY_MEMBERS});
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.members, member.id), member);
    saveMembership({partyId, inviteCode, userId: uidValue, alias, role: 'owner', backendMode: 'firebase', active: true, privacy, joinedAt: nowIso(), party});
    saveSettings({backendMode: 'firebase'});
    syncFromLocalWorkouts({silent: true});
    await syncFirebaseNow();
    renderGymParty();
    flashMessage('Gym Party Firebase creada. Copia el código para invitar.');
  }
  async function joinFirebaseParty({code, alias, privacy}){
    const runtime = await loadFirebaseRuntime();
    const {db, auth, firestoreMod} = runtime;
    const inviteRef = firestoreMod.doc(db, collections.invites, code);
    const inviteSnap = await firestoreMod.getDoc(inviteRef);
    if(!inviteSnap.exists() || inviteSnap.data().active === false) throw new Error('PARTY_NOT_FOUND');
    const invite = inviteSnap.data();
    if(Number(invite.membersCount || 0) >= Number(invite.maxMembers || MAX_GYM_PARTY_MEMBERS)) throw new Error('PARTY_FULL');
    const partyRef = firestoreMod.doc(db, collections.parties, invite.partyId);
    const member = {
      id: memberIdForLocalParty(invite.partyId, auth.currentUser.uid),
      partyId: invite.partyId,
      inviteCode: code,
      userId: auth.currentUser.uid,
      aliasInParty: alias,
      role: 'member',
      joinedAt: nowIso(),
      active: true,
      ...privacy
    };
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.publicProfiles, auth.currentUser.uid), {uid: auth.currentUser.uid, alias, avatar: '', createdAt: nowIso(), updatedAt: nowIso()}, {merge: true});
    await firestoreMod.setDoc(firestoreMod.doc(db, collections.members, member.id), member);
    const membersQuery = firestoreMod.query(firestoreMod.collection(db, collections.members), firestoreMod.where('partyId','==', invite.partyId), firestoreMod.where('active','==', true), firestoreMod.limit(MAX_GYM_PARTY_MEMBERS + 1));
    const membersSnap = await firestoreMod.getDocs(membersQuery);
    const members = membersSnap.docs.map(docSnap => docSnap.data());
    const nextCount = Math.min(MAX_GYM_PARTY_MEMBERS, members.length);
    await firestoreMod.setDoc(partyRef, {membersCount: nextCount, updatedAt: nowIso()}, {merge: true});
    await firestoreMod.setDoc(inviteRef, {membersCount: nextCount, updatedAt: nowIso()}, {merge: true});
    const partySnap = await firestoreMod.getDoc(partyRef);
    if(!partySnap.exists() || partySnap.data().active === false) throw new Error('PARTY_NOT_FOUND');
    const party = {id: invite.partyId, ...partySnap.data(), inviteCode: code};
    const nextMembers = upsertById(members, [member]);
    const partyWithMembers = {...party, members: nextMembers, membersCount: nextMembers.length, maxMembers: party.maxMembers || MAX_GYM_PARTY_MEMBERS};
    saveMembership({partyId: invite.partyId, inviteCode: code, userId: auth.currentUser.uid, alias, role: member.role, backendMode: 'firebase', active: true, privacy, joinedAt: nowIso(), party: partyWithMembers});
    saveSettings({backendMode: 'firebase'});
    await syncFirebaseNow();
    renderGymParty();
    flashMessage('Te uniste a la Gym Party Firebase.');
  }
  async function syncFirebaseNow(){
    const m = activeMembership();
    if(!m || m.backendMode !== 'firebase') return;
    const runtime = await loadFirebaseRuntime();
    const {db, firestoreMod} = runtime;
    const queue = syncQueue();
    for(const op of queue){
      await firestoreMod.setDoc(firestoreMod.doc(db, op.collection, op.payload.id), {...op.payload, pendingSync: false, updatedAt: nowIso()}, {merge: true});
    }
    saveSyncQueue([]);
    const membersQuery = firestoreMod.query(firestoreMod.collection(db, collections.members), firestoreMod.where('partyId','==', m.partyId), firestoreMod.where('active','==', true), firestoreMod.limit(MAX_GYM_PARTY_MEMBERS + 1));
    const sessionsQuery = firestoreMod.query(firestoreMod.collection(db, collections.sessions), firestoreMod.where('partyId','==', m.partyId), firestoreMod.limit(240));
    const setsQuery = firestoreMod.query(firestoreMod.collection(db, collections.sets), firestoreMod.where('partyId','==', m.partyId), firestoreMod.limit(2000));
    const [membersSnap, sessionsSnap, setsSnap] = await Promise.all([firestoreMod.getDocs(membersQuery), firestoreMod.getDocs(sessionsQuery), firestoreMod.getDocs(setsQuery)]);
    const members = membersSnap.docs.map(docSnap => docSnap.data());
    const remoteSessions = sessionsSnap.docs.map(docSnap => ({...docSnap.data(), source: 'firebase', pendingSync: false}));
    const remoteSets = setsSnap.docs.map(docSnap => ({...docSnap.data(), source: 'firebase', pendingSync: false}));
    saveSharedSessions(upsertById(sharedSessions().filter(row => row.partyId !== m.partyId), remoteSessions));
    saveSharedSets(upsertById(sharedSets().filter(row => row.partyId !== m.partyId), remoteSets));
    const party = {...(m.party || currentParty() || {}), members, membersCount: members.length, maxMembers: MAX_GYM_PARTY_MEMBERS};
    saveMembership({...m, party, updatedAt: nowIso()});
    setLastSync();
    flashMessage('Gym Party sincronizada.');
  }

  function exportableSettings(){
    const value = {...settings()};
    delete value.firebaseConfig;
    return value;
  }
  function importableSettings(value){
    const next = {...value};
    delete next.firebaseConfig;
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
        saveSettings({partyQuickExerciseId: event.target.value});
        renderGymParty();
      }
    });
    if(typeof window.addEventListener === 'function'){
      window.addEventListener('online', () => {
        const m = activeMembership();
        if(m?.backendMode === 'firebase' && syncQueue().length){
          syncNow().catch(() => flashMessage('Hay datos pendientes; probá sincronizar manualmente.'));
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

  window.GYM_PARTY_FEATURES = {
    keys,
    collections,
    MAX_GYM_PARTY_MEMBERS,
    FIREBASE_SDK_VERSION,
    buildDemoData,
    calculatePartyStats,
    exportState,
    importState,
    renderGymParty,
    syncFromLocalWorkouts,
    syncNow,
    hasFirebaseConfig,
    effectiveFirebaseConfig,
    firebaseConfigSource
  };
  window.renderGymParty = renderGymParty;

  setupEvents();
  installGymHook();
  applyInviteFromUrl();
  if(document.getElementById('gymPartyRoot')) renderGymParty();
})();
