# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion: 2026-06-30
Rama esperada: `main`
Version actual: `2.6.1`
Android: `versionCode 32`, `versionName "2.6.1"`
Service worker cache: `protocolo-0-100-pwa-v42`
Backup consolidado: `schemaVersion: 3`

Leer primero este archivo y luego `README.md`, `index.html`,
`workout-features.js`, `gym-party.js`, `advanced-features.js`,
`manifest.webmanifest`, `sw.js`, `firebase/README.md` y los archivos Android
en `android-native-wrapper/`.

## 1. Estado actual del proyecto

La app sigue siendo PWA + APK Android con WebView. La raiz del repo es la
fuente de verdad web y se sincroniza al APK con `scripts/sync-web-assets.ps1`.

Estado actual:

- Protocolo diario local-first.
- Gym local con rutina semanal, registro rapido, historial y widget Android.
- Gym Party implementado como modulo web/PWA opcional.
- Nutricion local/FDC opcional.
- Backups JSON `schemaVersion: 3`.
- PWA offline con cache v42 y actualizacion consentida desde el aviso visible.
- APK con widget Android y permiso `INTERNET` para Firebase/Gym Party.

## 2. Funcionalidades ya existen

- Protocolo 0->100: pantalla, sueno, lectura, offline, ansiedad, accion clave,
  score, historial, graficas y guia.
- Gym legacy en `index.html`: `saveGymSession`, `renderGym`,
  `GYM_SESSIONS_KEY`.
- Gym extendido en `workout-features.js`: rutina semanal, entrenamiento del
  dia, registro rapido, series/reps/kg/RIR/RPE, historial por ejercicio,
  volumen, cumplimiento, score gym y sync con widget.
- Widget Android real: `WorkoutWidgetProvider`,
  `WorkoutWidgetUpdateService`, `MainActivity.AndroidBridge`,
  `RemoteViews`, `SharedPreferences`, botones reps/kg, `+/-0.5 kg`, `+/-5 kg`,
  guardar, repetir, atras y siguiente.
- Gym Party: sala privada local/demo/Firebase opcional, miembros, codigo de
  invitacion, privacidad opt-in, comparativas, graficas, retos sanos,
  exportacion y cola offline.
- Accesos visibles a Gym Party: boton superior fijo, tarjeta en inicio y tarjeta
  dentro de Gym. Ya no depende solo del menu lateral.
- Nutricion: catalogo local, comidas, metas, FoodData Central opcional, cache,
  comidas frecuentes, diagnostico orientativo y CSV.
- Progreso integral: Focus Coins locales, recompensas, rankings simulados y
  referidos mock.
- Backup/importacion: protocolo, gym, widget, Gym Party, nutricion y progreso.

## 3. Funcionalidades en desarrollo

- Firebase real para Gym Party esta preparado pero requiere proyecto Firebase,
  Auth anonimo, Email/Password para acceso portable entre dispositivos,
  Firestore y reglas. La config puede llegar por `firebase-config.js` generado
  desde GitHub Secrets o por JSON pegado en la app. Sin configuracion, funciona
  demo/local.
- Gym Party usa sincronizacion manual/por online event para ahorrar lecturas;
  listeners realtime permanentes quedan para futuro.
- `weekly_member_stats` esta documentado y listo para cache futuro; hoy las
  estadisticas se calculan en cliente.
- APK usa WebView local con acceso de red para Firebase. Probar en dispositivo
  real despues de configurar Firebase.

## 4. Archivos principales modificados

Web:

- `index.html`: agrega modulo `gym-party`, contenedor `tab-gym-party`,
  navegacion drawer, carga `firebase-config.js`, `gym-party.js` y activa
  `renderGymParty`. Tambien agrega boton superior `Gym Party` y tarjetas de
  acceso rapido.
- `firebase-config.js`: stub seguro para config publica Firebase; Actions puede
  reemplazarlo desde secrets.
- `workout-store.js`, `workout-plan.js`, `workout-ui.js`: limites modulares de
  almacenamiento, planificacion y UI; `workout-features.js` conserva la API
  publica y fallbacks.
- `firebase-service.js`, `gym-party-metrics.js`, `gym-party-ui.js`: carga
  diferida Firebase, agregados de series y componentes UI; `gym-party.js`
  conserva la orquestacion y API publica.
- `gym-party-sync.js`: sincronizacion incremental con dirty/revision, LWW,
  tombstones, backoff y contexto horario.
- `gym-party.js`: modulo Gym Party, registro rapido, graficas y edicion/eliminacion de series.
- `advanced-features.js`: version `2.6.1`, backup/importacion Gym Party.
- `sw.js`: cache v42, actualizacion consentida, incluye modulos nuevos y evita
  persistir una configuracion Firebase obsoleta.
- `README.md`: documenta Gym Party, demo, Firebase, privacidad y pruebas.
- `CODEX_HANDOFF.md`: este handoff.

Firebase:

- `firebase/README.md`
- `firebase/firestore.rules`
- `firebase/schema.md`
- `firebase/sample-config.js`

Android:

- `android-native-wrapper/app/src/main/AndroidManifest.xml`: agrega
  `android.permission.INTERNET`.
- `android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java`:
  usa `WebViewAssetLoader` sobre HTTPS interno, bloquea file/content/universal
  access y mixed content, activa Safe Browsing y limita origenes remotos.
- `android-native-wrapper/app/build.gradle`: `versionCode 32`,
  `versionName 2.6.1`, firma release solo desde variables seguras.
- `android-native-wrapper/app/src/main/assets/*`: sincronizado desde raiz.

Scripts/workflows:

- `scripts/sync-web-assets.ps1`: copia todos los modulos web, config y Gym Party.
- `scripts/write-firebase-config.ps1`: genera `firebase-config.js` desde
  variables `FIREBASE_*` si existen.
- `scripts/validate-app.ps1`: valida contratos Gym Party y config Firebase.
- `scripts/test-gym-party.mjs`: prueba demo, multi-miembro, estadisticas y
  backup/importacion.
- `.github/workflows/*.yml`: ejecutan pruebas de Gym, Gym Party, modulos,
  accesibilidad, seguridad y release segun el flujo.
- `.github/workflows/deploy-pages.yml`: publica `workout-features.js`,
  `firebase-config.js` y `gym-party.js`.
- `.github/workflows/build-debug-apk.yml`: artifact debug temporal, sin Release.
- `.github/workflows/build-release-apk.yml`: APK firmado versionado y SHA-256.
- `.github/workflows/validate-app.yml`: Playwright Android/iPhone, Emulator y
  build release con firma efimera.

## 5. Estructura datos/localStorage/Firebase

Claves existentes principales:

- `protocolo_0_100_tracker_v1`
- `protocolo_0_100_gym_sessions_v1`
- `protocolo_0_100_weekly_workout_plan_v1`
- `protocolo_0_100_workout_sessions_v1`
- `protocolo_0_100_exercise_history_v1`
- `protocolo_0_100_exercise_library_v1`
- `protocolo_0_100_gym_settings_v1`
- `protocolo_0_100_workout_widget_state_v1`
- `protocolo_0_100_nutrition_entries_v1`
- `protocolo_0_100_nutrition_targets_v1`
- `protocolo_0_100_body_metrics_v1`
- `protocolo_0_100_state_v2` con `schemaVersion: 3`

Claves nuevas Gym Party:

- `protocolo_0_100_gym_party_settings_v1`
- `protocolo_0_100_gym_party_membership_v1`
- `protocolo_0_100_shared_workout_sessions_v1`
- `protocolo_0_100_shared_workout_sets_v1`
- `protocolo_0_100_gym_party_sync_queue_v1`
- `protocolo_0_100_last_gym_party_sync_at_v1`
- `protocolo_0_100_gym_party_demo_data_v1`

Firebase/Firestore documentado:

- `users_public_profile`
- `gym_parties`
- `gym_party_members`
- `workout_sessions_shared`
- `workout_sets_shared`
- `gym_party_invites`
- `weekly_member_stats`

No hay credenciales reales en el repo. `firebase/sample-config.js` y
`firebase-config.js` solo contienen placeholders/stub. La API key web de
Firebase es publica; no usar service accounts en frontend.

## 6. Estado del modulo Gym

Gym no se reescribio. `workout-features.js` sigue siendo fuente del registro
rapido y de `workoutSessions`.

Funciones clave:

- `ensureWorkoutData`
- `ensureSession`
- `replaceSession`
- `sessionSummary`
- `updateExerciseHistory`
- `syncLegacyGymSession`
- `renderWorkoutDashboard`
- `saveQuickSet`
- `repeatLastSet`
- `previousExercise`
- `nextExercise`
- `completeCurrentExercise`
- `finishWorkout`
- `addManualExercisePayload`
- `buildWorkoutWidgetState`
- `syncWorkoutWidget`
- `importWidgetStateFromAndroid`

Gym Party no crea otro sistema de entrenamiento. Lee `workoutSessions` y, si no
hay sesiones nuevas, puede convertir `gymSessions` legacy con
`legacySessionToWorkout`.

## 7. Estado del widget Android

Widget Android sigue intacto:

- `WorkoutWidgetProvider.java`
- `WorkoutWidgetUpdateService.java`
- `MainActivity.java`
- `res/xml/workout_widget_info.xml`
- `res/layout/widget_workout_small.xml`
- `res/layout/widget_workout_medium.xml`

Acciones existentes:

- `ACTION_OPEN_TODAY_WORKOUT`
- `ACTION_QUICK_LOG_SET`
- `ACTION_REFRESH_WORKOUT_WIDGET`
- `ACTION_WIDGET_SAVE_SET`
- `ACTION_WIDGET_REPEAT_LAST`
- `ACTION_WIDGET_PREVIOUS_EXERCISE`
- `ACTION_WIDGET_NEXT_EXERCISE`
- reps/peso `+/-`, peso rapido `+/-5 kg`

Gym Party no depende de AndroidBridge ni del widget. Si el widget guarda una
serie, `workout-features.js` importa la sesion y Gym Party puede prepararla para
compartir al renderizar/sincronizar.

## 8. Estado de Gym Party

Implementado en `gym-party.js`.

Constante:

- `MAX_GYM_PARTY_MEMBERS = 10`

Funciones/exports:

- `window.renderGymParty`
- `window.GYM_PARTY_FEATURES.keys`
- `buildDemoData`
- `calculatePartyStats`
- `exportState`
- `importState`
- `syncFromLocalWorkouts`
- `syncNow`
- `hasFirebaseConfig`

UX actual:

- En la web se ve un boton `Gym Party` fijo en la barra superior.
- En la pantalla principal aparece la tarjeta `Entrenar con un amigo`.
- En Gym aparece la tarjeta `Sesion privada compartida`.
- La pantalla inicial de Gym Party se redujo a dos acciones principales:
  `Crear sala` y `Entrar con codigo`.
- Si `firebase-config.js` trae config real, el backend online queda
  preseleccionado con inputs hidden; el usuario no ve el selector tecnico.
- Si el usuario ya esta dentro de una sala/demo, el dashboard muestra
  `Crear sala nueva` para salir del estado actual y volver al formulario de
  creacion sin borrar entrenamientos locales.
- En `2.4.3` se corrigio la creacion Firebase: antes se intentaba guardar
  `members: undefined` en `gym_parties`, valor que el SDK web de Firestore
  rechaza. Ahora se crea `partyDoc`, se elimina `members` y recien ahi se llama
  `setDoc`.
- En `2.4.5` se reforzaron las acciones de Gym Party: cada `renderGymParty()`
  llama `bindGymPartyActionButtons(root)` para enlazar handlers directos a
  botones `data-gym-party-action`, ademas del listener delegado en `document`.
  Esto evita que el formulario muestre `Crear sala` sin ejecutar la accion.
- En `2.4.6` se corrigio el bloqueo del modal `Accion clave de hoy`: el
  auto-show diferido podia abrirse sobre Gym Party despues de cambiar modulo y
  tapar `Crear sala`. `showActionModal(false)` ahora retorna si
  `activeModule !== 'protocolo'`.
- En `2.4.7` se simplifico la UI de Gym Party: `renderGymParty()` usa
  `noRoomHtmlSimple()` y `dashboardHtmlSimple()`. La pantalla inicial muestra
  una sola accion principal (`Crear codigo para invitar`), y `Ya tengo un
  codigo`, demo, privacidad y Firebase quedan plegados. El dashboard deja
  visibles solo el codigo, `Enviar codigo` y `Sincronizar`; exportacion,
  privacidad y metricas detalladas quedan en secciones plegadas.
- En `2.4.8` Gym Party puede registrar series directamente sin volver al modulo
  Gym. `workout-features.js` expone `getQuickWorkoutState`,
  `saveQuickSetPayload`, `completeQuickExercisePayload` y
  `finishWorkoutPayload`; `gym-party.js` muestra `workoutQuickLoggerHtml()` con
  la rutina diaria del mismo `defaultWeeklyPlan` que usa el widget Android.
  Incluye selector de ejercicio, reps, kilos con step `0.5`, chips rapidos de
  peso, contador de series del ejercicio y contador total del musculo.
- En `2.4.9` se mejoro el registro dentro de Gym Party: los botones `Atras`,
  `Siguiente` y `Completar` quedan visibles arriba del formulario; `Guardar
  serie` queda como accion principal; se agrego `Agregar ejercicio extra` para
  movimientos fuera de la rutina habitual. `workout-features.js` expone
  `addManualExercisePayload`, que guarda el ejercicio manual dentro de la misma
  `workoutSession` para mantener historial, volumen, backup, widget y sync sin
  crear un sistema paralelo. Tambien se agrego `gymPartyGameHtml()` con racha
  diaria, nivel e insignias sanas para Gym Party.
- En `2.5.0` se refinaron graficas y comparaciones de Gym Party. `gym-party.js`
  agrega `muscleInsightModel`, `muscleMapHtml` y `partyHumanSvg`: un mapa
  muscular interactivo con cuerpo estilizado, lineas a grupos musculares,
  seleccion por `data-gym-party-action="party-select-muscle"`, series
  semanales, ejercicios, reps, volumen y comparacion por miembro. El estado
  `selectedMuscleGroup` queda en `gymPartySettings`; no agrega nuevas claves de
  localStorage ni toca datos privados.
- En `2.5.1` el mapa muscular se movio dentro de `Ver graficas, mapa muscular
  y comparaciones`. Al tocar un musculo se mantiene abierta la seccion mediante
  `gymPartySettings.graphsOpen`. `muscleInsightModel` ahora calcula 6 semanas
  de historial, mejor peso registrado, mejor serie, deltas contra semana previa
  y `exerciseSummaryRows`. Cada ejercicio del musculo muestra `Comparar
  ejercicio` (`data-gym-party-action="party-compare-exercise"`) con series,
  reps, mejor peso, volumen y cambio contra semana anterior. `partyHumanSvg`
  se reemplazo por una figura mas anatomica con cabeza, cuello, torso, brazos,
  pelvis y piernas.
- En `2.5.2` se limpio el dashboard principal de Gym Party: quedan visibles el
  codigo, registro rapido y resumen semanal; graficas, mapa muscular, racha,
  comparativas, sesiones recientes, exportacion y privacidad quedan en secciones
  plegadas. El registro rapido muestra `partySetRowsHtml()` con tarjetas de
  series guardadas y acciones `party-edit-set`, `party-delete-set` y
  `party-cancel-edit-set`. `workout-features.js` expone
  `updateQuickSetPayload` y `deleteQuickSetPayload`; no agrega claves nuevas de
  localStorage y reutiliza `workoutSessions`.
- En `2.5.3` se redujo mas la friccion visual de Gym Party: el encabezado ya no
  muestra codigo ni botones sociales; solo muestra estado, sala y foco de
  accion. El codigo, enviar/copiar, sincronizar, exportar, crear nueva sala y
  salir quedan en `Invitar amigo y administrar sala`, plegado por defecto. Se
  corrigio el bug donde al eliminar una serie no se actualizaban las metricas
  inferiores: `partyData()` filtra `deleted`, `syncFromLocalWorkouts()` genera
  tombstones con `deleted: true` mediante `localSetTombstones()`, y
  `scripts/test-gym-party.mjs` cubre que volumen/series visibles bajen despues
  de eliminar. Firestore no borra documentos fisicamente; marca sets eliminados.
- En `2.5.4` se corrigio el caso restante del resumen semanal stale: las
  sesiones compartidas se normalizan con `normalizeSessionsFromSets()` y
  `calculatePartyStats()` recalcula desde sets visibles, por lo que no reutiliza
  `session.totalSets/totalVolume` viejos cuando una serie fue eliminada. Se
  agrego `selectedWorkoutDate`, `partyDateControlsHtml()`, acciones
  `party-prev-day`, `party-next-day`, `party-today` e input
  `partyWorkoutDateInput` para volver a ayer u otra fecha y editar ese dia. Se
  agrego `weeklySetEditorHtml()` con `Editar series de la semana`, usando
  `localExerciseId` y `localSetId` para abrir/editar/eliminar series semanales.
  El mapa muscular y graficas usan la semana de la fecha seleccionada y filtran
  cualquier set `deleted`.
- En `2.5.5` se simplifico el registro web de Gym Party: se quitaron los botones
  `Atras`, `Siguiente` y `Completar` del formulario web, y tambien los botones
  de `Dia anterior`, `Dia siguiente` y `Hoy`. `partyDateControlsHtml()` deja
  solo el input `partyWorkoutDateInput`; el usuario elige fecha directamente.
  `validate-app.ps1` ahora falla si reaparecen esos controles removidos. El
  chip del encabezado muestra la fecha seleccionada si no es hoy.
- En la misma auditoria, `syncFromLocalWorkouts()` dejo de conservar snapshots
  propios antiguos con `source: "firebase"` al reconstruir `sharedWorkoutSessions`
  y `sharedWorkoutSets`. La fuente local manda para el usuario actual; los datos
  de otros miembros se conservan. Esto evita que una serie eliminada localmente
  siga apareciendo en `Editar series de la semana`, graficas o mapa muscular por
  una copia remota stale.
- En `2.5.6` se ajusto la jerarquia visual del registro rapido de Gym Party:
  `workoutQuickLoggerHtml()` muestra primero selector de fecha/ejercicio,
  inputs de reps/kilos, chips de peso, peso corporal/opcional y boton
  `Guardar serie`. Debajo quedan `partySetCounters compact` y
  `partySetRowsHtml()` como resumen compacto de series guardadas. `Agregar
  ejercicio extra` queda plegado mas abajo para no empujar la accion principal.
- En `2.5.7` se reforzo persistencia de Gym Party para cerrar/reabrir web:
  `loadFirebaseRuntime()` llama `ensurePersistentAnonymousAuth()`, que fija
  `browserLocalPersistence`, espera restauracion con `waitForInitialAuth()` y
  solo crea un usuario anonimo nuevo si no habia sesion persistida. Al arrancar,
  `resumeFirebaseMembership()` detecta `gymPartyMembership` Firebase en
  localStorage y ejecuta sincronizacion silenciosa. `syncFirebaseNow()` valida
  con `assertFirebaseSessionMatchesMembership()` que `auth.currentUser.uid`
  coincida con la membresia guardada antes de subir/leer datos.
- En `2.5.8` se agrego acceso portable para cambio de dispositivo. En una sala
  Firebase, `portableAccessFormHtml({mode:"link"})` muestra email/clave en
  `Invitar amigo y administrar sala > Guardar acceso para otro dispositivo`.
  `linkPortableAccess()` usa `EmailAuthProvider.credential()` y
  `linkWithCredential()` para vincular el usuario anonimo actual sin cambiar su
  UID. En otro dispositivo, `portableAccessFormHtml({mode:"restore"})` aparece
  en `Entrar desde otro dispositivo`; `restorePortableAccess()` usa
  `signInWithEmailAndPassword()` y `restoreFirebaseMembershipForCurrentUser()`
  para buscar `gym_party_members` por `userId`, restaurar `gymPartyMembership`,
  cargar miembros/sala y sincronizar. Requiere habilitar Email/Password en
  Firebase Auth. El email no se guarda en Firestore ni backups; solo
  `gymPartySettings.portableAccessEmail` queda local como comodidad.
- El dashboard incluye `Enviar codigo`, que usa Web Share API si existe o copia
  una invitacion con link `?gymPartyCode=...`.
- Al abrir un link con `?gymPartyCode=CODIGO`, la app abre Gym Party y precarga
  el codigo en el formulario de union.

Estados UI:

- sin sala;
- crear sala;
- unirse por codigo;
- modo demo;
- dashboard de sala.

Dashboard:

- pantalla principal limpia con estado de sala, foco de accion, registro rapido
  y resumen semanal;
- registro rapido con selector de fecha, selector de ejercicio, contadores de
  series por ejercicio y por musculo, chips de peso, agregar ejercicio extra y
  tarjetas de series guardadas;
- `Editar series de la semana` permite abrir o eliminar cualquier serie propia
  de la semana seleccionada sin buscar ejercicio por ejercicio;
- cada serie guardada se puede editar o eliminar desde Gym Party;
- codigo, enviar/copiar codigo, sincronizar, exportacion, salir/crear nueva sala,
  graficas, mapa muscular, comparativas, racha, sesiones recientes y privacidad
  quedan en `details` plegados;
- Yo vs Amigo cuando hay dos miembros y vista de grupo para 3 a 10 miembros;
- volumen semanal, series semanales, sesiones por semana, cambio vs semana
  anterior, progreso por ejercicio y volumen por musculo.

Privacidad:

- compartir gym;
- compartir solo agregado;
- compartir detalle de series;
- ocultar pesos absolutos;
- alias anonimo;
- compartir score general apagado por defecto.

No comparte por defecto nutricion, sueno, ansiedad, pantalla, peso corporal,
notas privadas, correo visible ni datos personales.

## 9. Estado de nutricion

Sin cambios funcionales en nutricion:

- `nutrition-data.js`
- `fdc-client.js`
- `advanced-features.js`

FDC sigue opcional. `protocolo_0_100_fdc_config_v1` puede contener API key
personal y no debe tratarse como dato publico. Gym Party no comparte datos de
nutricion.

## 10. Estado de backups/exportacion

`advanced-features.js` ahora incluye en `buildCompleteBackup`,
`syncVersionedState` e `importCompleteBackupData`:

- `gymPartySettings`
- `gymPartyMembership`
- `sharedWorkoutSessions`
- `sharedWorkoutSets`
- `syncQueue`
- `lastGymPartySyncAt`
- `gymPartyDemoData`

Gym Party tambien tiene exportacion propia:

- CSV comparativo de la sala;
- JSON con mis datos compartidos.

`gym-party.js` filtra `firebaseConfig` al exportar/importar backup para no
arrastrar la configuracion Firebase en JSON compartidos.

## 11. Bugs conocidos y limitaciones

- Firebase necesita proyecto real, configuracion publicada o pegada en la app,
  y reglas publicadas.
- Reglas Firestore deben probarse en Firebase Emulator antes de usar datos
  reales.
- Modo local/mock no sincroniza entre telefonos; para iPhone + Android usar
  Firebase.
- APK usa HTTPS interno con `WebViewAssetLoader` y permiso Internet; probar
  Firebase y widget en dispositivo real.
- No hay Google login. Desde `2.5.8` hay email/password opcional para vincular
  la sesion anonima y restaurar la misma Gym Party en otro dispositivo.
- No hay Cloud Functions. El flujo de alta protege invariantes con reglas y
  transacciones/actualizaciones acotadas, pero sigue optimizado para hasta 10.
- `index.html`, `workout-features.js` y `gym-party.js` siguen siendo grandes;
  la fase 15 inicio extraccion incremental sin reescribirlos.
- No hay IndexedDB; localStorage puede quedarse corto con historiales enormes.

## 12. Decisiones tecnicas importantes

- Gym Party es web/PWA, no Android-only.
- No usa AndroidBridge.
- No reescribe Gym; solo sanitiza y comparte `workoutSessions`.
- Sala usa `members[]`, `partyId`, `userId`, sesiones y sets por usuario.
- Comparacion sana: no usa "ganador", "fallaste" ni ranking toxico.
- Firebase SDK se carga dinamicamente desde gstatic solo si existe config valida
  en `settings.firebaseConfig` o `window.GYM_PARTY_FIREBASE_CONFIG`.
- No hay realtime permanente por defecto para ahorrar lecturas.
- Service worker no intercepta otros origenes, por lo que Firebase/FDC quedan
  libres.

## 13. Que NO se debe reescribir

No reescribir:

- `index.html` completo;
- `workout-features.js`;
- `advanced-features.js`;
- widget Android;
- nutricion/FDC;
- backup/importacion existente;
- claves `localStorage` existentes;
- workflows completos.

No borrar ni renombrar datos sin migracion.

## 14. Que queda pendiente

- Probar Firebase real de produccion con dos cuentas/dispositivos despues de
  desplegar las reglas e indices actuales.
- Probar iPhone/Safari/PWA con codigo de invitacion.
- Probar APK con Firebase desde WebView.
- Verificar el widget en launchers Android reales; RemoteViews varia por fabricante.
- Cachear `weekly_member_stats`.
- Paginacion historica si hay muchas sesiones.
- Mejorar comparador seleccionando miembros especificos para salas >5.

## 15. Proximos pasos recomendados

1. Ejecutar validaciones.
2. Configurar Firebase Spark.
3. Agregar GitHub Secrets `FIREBASE_*` o pegar JSON en la app.
4. Publicar reglas.
5. Crear sala desde Android/web.
6. Unirse desde iPhone/Safari.
7. Registrar entrenamiento local.
8. Sincronizar.
9. Revisar dashboard Gym Party.
10. Exportar backup JSON y CSV comparativo.
11. Para APK final ejecutar `Publicar APK Android release` con Secrets de firma
    y conservar la misma clave para futuras actualizaciones `v2.6.0`.

## 16. Como probar la app

Automatico:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
node .\scripts\test-service-worker.mjs
node .\scripts\test-workout-features.mjs
node .\scripts\test-gym-party.mjs
node .\scripts\test-gym-party-sync.mjs
node .\scripts\test-module-boundaries.mjs
node .\scripts\test-android-webview-security.mjs
node .\scripts\test-android-release.mjs
node .\scripts\test-accessibility.mjs
npm run test:rules
npm run test:e2e
git diff --check
```

Manual demo:

1. Abrir app.
2. Ir a Gym Party.
3. Tocar `Probar modo demo`.
4. Confirmar Yo vs Amigo.
5. Probar `Demo con mas miembros`.
6. Revisar graficas, progreso por ejercicio, volumen por musculo y retos.

Manual dos usuarios:

1. Tocar el boton superior `Gym Party`.
2. Usuario A usa `Crear sala`.
3. Tocar `Enviar codigo` o `Copiar codigo`.
4. Usuario B abre Safari/PWA en iPhone con el link o codigo.
5. Usuario B usa `Entrar con codigo` y alias.
6. Ambos registran entrenamientos.
7. Tocar `Sincronizar ahora`.
8. Comparar semana actual vs semana pasada.

Offline:

1. Crear/unirse a sala.
2. Desconectar internet.
3. Registrar entrenamiento.
4. Ver `syncQueue` pendiente.
5. Volver online.
6. Tocar `Sincronizar ahora`.

## 17. Como compilar APK

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
cd android-native-wrapper
gradle :app:assembleDebug --stacktrace
```

Salida:

```text
android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk
```

GitHub Actions publica artifacts debug en `main`; el APK final `v2.6.0` se
publica con el workflow `Publicar APK Android release` por tag `v*` o ejecucion
manual, usando los Secrets de firma.

## 18. Como configurar Firebase

Ver `firebase/README.md`.

Resumen:

1. Crear proyecto Firebase.
2. Activar Auth Anonymous.
3. Activar Email/Password si se quiere cambio de dispositivo con el mismo UID.
4. Crear Firestore production.
5. Cargar config web por GitHub Secrets o en Gym Party.
6. Publicar `firebase/firestore.rules`.
7. Probar login anonimo y, si aplica, guardar/restaurar acceso email/clave.
8. Crear sala.
9. Invitar segundo usuario por codigo.

Campos esperados:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_STORAGE_BUCKET`

No usar claves privadas en frontend.

## 19. Verificacion Firebase publicada

Verificacion realizada el 2026-06-24 despues de publicar commit `09b23fe`
(`Publica Gym Party con Firebase`) en `main`.

Contexto detectado:

- El workflow anterior exitoso de Pages estaba publicando `175addd` (`v2.3.2`).
- Ese deployment no tenia `firebase-config.js` ni `gym-party.js`; ambos daban
  404 en GitHub Pages.
- Se corrigio subiendo el commit `09b23fe`, que agrega `gym-party.js`,
  `firebase-config.js`, `scripts/write-firebase-config.ps1` y workflows
  actualizados.

GitHub Pages:

- Workflow `Publicar PWA en GitHub Pages`, run `28121243409`.
- Estado: `completed`, conclusion `success`.
- URL verificada: `https://locoviera24-code.github.io/protocolo-0-100/`.
- `/firebase-config.js`: HTTP 200, no es stub vacio, contiene `apiKey`,
  `authDomain`, `projectId` y `appId`.
- `/gym-party.js`: HTTP 200, contiene `window.GYM_PARTY_FEATURES`,
  `effectiveFirebaseConfig` y colecciones Firestore.
- `index.html`: carga `firebase-config.js` antes de `gym-party.js`.
- No se encontraron `private_key`, `service_account`,
  `-----BEGIN PRIVATE KEY-----`, `client_email` ni `firebase-adminsdk` en el
  repo, salvo los strings prohibidos usados por `scripts/validate-app.ps1` para
  validar que no aparezcan en `firebase-config.js`.

Prueba real contra Firebase:

- Config publicada detectada como real. Hash corto del `projectId` verificado:
  `754839EE855E` (no guardar ni imprimir secrets).
- Authentication anonimo: OK con dos usuarios anonimos.
- Crear sala: OK.
- Crear invite: OK.
- Crear miembro owner: OK.
- Segundo usuario leyendo sala antes de unirse: bloqueado por reglas, OK.
- Segundo usuario lee invite por codigo: OK.
- Segundo usuario se une con alias: OK.
- Segundo usuario lee sala despues de unirse: OK.
- Query de miembros por `partyId`: OK.
- Escritura de `workout_sessions_shared`: OK.
- Escritura de `workout_sets_shared`: OK.
- Lectura cruzada de sesiones/series entre miembros: OK.
- La sala/invite de prueba `party_codex_1782326425254` / `CX17823264` se
  desactivo al final de la prueba; los documentos quedan en Firestore porque
  las reglas no permiten delete.

Backup:

- La version publicada de `gym-party.js` contiene `exportableSettings`,
  `delete value.firebaseConfig` y `delete next.firebaseConfig`.
- `firebaseConfig` no debe salir en backups ni ser importado desde backups.

## 20. Verificacion local 2.5.5

Verificacion realizada el 2026-07-01:

- `scripts/sync-web-assets.ps1`: OK, assets Android sincronizados desde raiz.
- `scripts/validate-app.ps1 -CheckAndroidAssets`: OK, version `2.5.5`, cache
  PWA `v30`, assets web/Android sincronizados.
- `scripts/test-gym-party.mjs`: OK usando Node interno de Codex. Cubre demo,
  multi-miembro, estadisticas, tombstones de series eliminadas y
  backup/importacion.
- `scripts/test-workout-features.mjs`: OK. Cubre plan semanal, descanso, widget
  state, editar/eliminar serie, ejercicio manual, importacion directa y no
  sobrescritura.
- `scripts/test-service-worker.mjs`: OK. Cubre cache acotada, FDC libre y
  navegacion offline.
- `git diff --check`: OK.

Nota de entorno: `node` no estaba disponible en `PATH`; se uso
`C:\Users\acer\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin\node.exe`
para ejecutar los tests locales.

## 21. Verificacion local 2.5.6

Verificacion realizada el 2026-07-01:

- `scripts/sync-web-assets.ps1`: OK, `gym-party.js`, `advanced-features.js` y
  `sw.js` sincronizados hacia assets Android.
- `scripts/validate-app.ps1 -CheckAndroidAssets`: OK, version `2.5.6`, cache
  PWA `v31`, assets web/Android sincronizados.
- `scripts/test-gym-party.mjs`: OK usando Node interno de Codex.
- `scripts/test-workout-features.mjs`: OK usando Node interno de Codex.
- `scripts/test-service-worker.mjs`: OK usando Node interno de Codex.
- `git diff --check`: OK.

Cambio UX principal: el formulario de Gym Party ahora prioriza reps/kilos y
`Guardar serie` arriba; las series ya guardadas aparecen despues como resumen
compacto (`partyLoggedSets`, `partySetList compact`) junto a contadores reducidos.

## 22. Verificacion local 2.5.7

Verificacion realizada el 2026-07-01:

- `scripts/sync-web-assets.ps1`: OK, assets Android sincronizados desde raiz.
- `scripts/validate-app.ps1 -CheckAndroidAssets`: OK, version `2.5.7`, cache
  PWA `v32`, assets web/Android sincronizados.
- `scripts/test-gym-party.mjs`: OK. Incluye contratos de persistencia Firebase:
  `browserLocalPersistence`, `setPersistence`, `onAuthStateChanged`,
  `resumeFirebaseMembership` y validacion de UID con
  `assertFirebaseSessionMatchesMembership()`.
- `scripts/test-workout-features.mjs`: OK.
- `scripts/test-service-worker.mjs`: OK.

Resultado esperado para usuario invitado: si se une con codigo en el mismo
navegador/PWA, registra entrenamiento y cierra pestana/web, al volver conserva
`gymPartyMembership`, `workoutSessions`, `sharedWorkoutSessions`,
`sharedWorkoutSets` y la sesion anonima Firebase local. Si borra datos del sitio,
usa modo privado o cambia de navegador/dispositivo, debe unirse otra vez con el
codigo.

## 23. Verificacion local 2.5.8

Verificacion realizada el 2026-07-01:

- `scripts/sync-web-assets.ps1`: OK, assets Android sincronizados desde raiz.
- `scripts/validate-app.ps1 -CheckAndroidAssets`: OK, version `2.5.8`, cache
  PWA `v33`, assets web/Android sincronizados.
- `scripts/test-gym-party.mjs`: OK. Incluye contratos de acceso portable:
  `EmailAuthProvider`, `linkWithCredential`, `signInWithEmailAndPassword`,
  `restoreFirebaseMembershipForCurrentUser()` y exclusion de
  `portableAccessEmail` en export/import.
- `scripts/test-workout-features.mjs`: OK.
- `scripts/test-service-worker.mjs`: OK.

Resultado esperado para cambio de dispositivo: el usuario debe guardar acceso
email/clave antes de migrar. Eso vincula el usuario anonimo existente y conserva
el mismo UID. En el dispositivo nuevo, `Entrar desde otro dispositivo` restaura
la membresia, sala, sesiones compartidas e historial sincronizado. Si nunca se
guardo acceso y se perdio el dispositivo viejo, Firebase Anonymous no permite
recuperar el UID anterior; solo queda unirse nuevamente con codigo o importar
un backup manual.

## 24. Release 2.6.0 - endurecimiento y modularizacion incremental

Trabajo realizado en la rama `codex/gym-platform-hardening`, en commits
separados por fase:

1. Ejercicios extra persistentes por sesion/dia/biblioteca sin duplicados.
2. Ranking contextual por rutina, dia, frecuencia, favoritos y busqueda.
3. Editor visual de rutina con series objetivo, reps, descanso, copiar y deshacer.
4. Biblioteca versionada/migrable con alias y ejercicios personalizados.
5. Metricas corregidas para peso corporal, lastre, mejor serie y 1RM estimado.
6. Firestore Rules estrictas y pruebas negativas en Emulator.
7. Invitaciones revocables, regeneracion y salida/eliminacion privada segura.
8. Sync incremental con revision/dirty, LWW, tombstones, backoff y zonas horarias.
9. WebView Android endurecido con `WebViewAssetLoader` y allowlist de red.
10. APK debug separado de release firmado; release incluye checksum SHA-256.
11. PWA con actualizacion consentida, shortcuts y config Firebase `no-store`.
12. Registro rapido simplificado, barra de guardado, drafts, deshacer y descanso.
13. Accesibilidad movil: labels, foco, teclado, live region, safe-area y motion.
14. Playwright Android Chromium/iPhone WebKit y build release real en CI.
15. Modulos internos extraidos sin romper APIs: `workout-store.js`,
    `workout-plan.js`, `workout-ui.js`, `firebase-service.js`,
    `gym-party-metrics.js`, `gym-party-ui.js`.

Persistencia y compatibilidad:

- No se renombro ni elimino ninguna clave `protocolo_0_100_*` existente.
- `weeklyWorkoutPlan`, `workoutSessions`, `exerciseHistory`, biblioteca,
  preferencias, Gym Party y widget conservan migracion/fallback.
- Firebase config, email portable y codigo pendiente no salen en backups.
- Las series eliminadas conservan tombstone remoto pero no cuentan en resumen,
  mapa muscular, graficas ni historial visible.
- La app sigue funcionando sin Firebase en local/demo y sin AndroidBridge en web/iOS.

Firebase produccion:

- Habilitar Anonymous y, para cambio de dispositivo, Email/Password.
- Desplegar `firebase/firestore.rules` y `firebase/firestore.indexes.json`.
- La config publica llega por Secrets `FIREBASE_*`; no agregar service accounts.
- Cada miembro vincula su propio email/clave si necesita recuperar el mismo UID
  en otro dispositivo. El owner no guarda credenciales del amigo.

APK release:

- Version: `versionCode 31`, `versionName 2.6.0`.
- Cache web: `protocolo-0-100-pwa-v35`.
- Debug: `.github/workflows/build-debug-apk.yml`.
- Release firmado: `.github/workflows/build-release-apk.yml` con Secrets
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- No cambiar la clave de firma entre releases instalados.

Pruebas nuevas/relevantes:

- `scripts/test-module-boundaries.mjs`
- `scripts/test-gym-party-sync.mjs`
- `scripts/test-android-webview-security.mjs`
- `scripts/test-android-release.mjs`
- `scripts/test-accessibility.mjs`
- `firebase/rules.test.mjs`
- `tests/e2e/gym-flow.spec.mjs`

Verificacion integral ejecutada el 2026-07-10:

- `scripts/validate-app.ps1 -CheckAndroidAssets`: OK, version `2.6.0`, cache
  `v35`, 71 alimentos, 28 nutrientes, 253 IDs y assets Android sincronizados.
- Pruebas Node de service worker, Workout, metricas, Gym Party, sync,
  modularizacion, WebView, release y accesibilidad: todas OK.
- Playwright con `workers:1`: 5 pruebas OK en Android Chromium/iPhone WebKit y
  1 omitida intencionalmente (Service Worker solo Chromium).
- Firebase Emulator: owner/union validos y seis negativas criticas denegadas.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- Escaneo de secretos: sin Firebase API key real, service account, keystore ni
  private key rastreados; las coincidencias de texto son controles/documentacion.
- Gradle 8.10.2 + JDK 17 + Android SDK 35: `assembleDebug` OK, APK 1.434.302 bytes.
- `assembleRelease` con keystore efimero: OK, APK 1.134.336 bytes, firma v1/v2
  verificada por `apksigner`, SHA-256
  `37ADCC5889660651DAC5E33777D266965581A408686F0E513AA82BDCD6B5DCD4`.
- El build real detecto y se corrigio `android.useAndroidX=true`; el contrato
  queda cubierto por `test-android-release.mjs` y `validate-app.ps1`.
- El APK release local usa certificado efimero de prueba y no debe distribuirse
  como actualizacion. El artifact final debe compilarse en GitHub Actions con el
  keystore de produccion guardado en Secrets.

Limitaciones conocidas despues de este release:

- La validacion automatica no sustituye probar el widget en al menos un launcher
  Android real y Gym Party en dos dispositivos reales con el proyecto Firebase.
- El acceso portable requiere vincular email/clave antes de perder la sesion
  anonima original.
- No hay listeners realtime permanentes ni Cloud Functions; es intencional para
  reducir lecturas/costos en Spark.
- `weekly_member_stats` sigue calculado en cliente y es candidato a cache futuro.
- Los orquestadores grandes deben seguir reduciendose por extraccion incremental;
  no reescribir `index.html`, `workout-features.js` ni `gym-party.js` de golpe.

Antes de continuar en otro chat leer, en este orden:

1. `CODEX_HANDOFF.md` completo, especialmente esta seccion.
2. `README.md`.
3. `workout-store.js`, `workout-plan.js`, `workout-features.js`.
4. `firebase-service.js`, `gym-party-sync.js`, `gym-party-metrics.js`,
   `gym-party-ui.js`, `gym-party.js`.
5. `firebase/firestore.rules`, `firebase/firestore.indexes.json` y pruebas.
6. `android-native-wrapper/README_ANDROID.md`, `MainActivity.java` y widget.

## 25. Hotfix 2.6.1 - migracion de documentos Firestore legacy

Durante la verificacion real de `2.6.0` en GitHub Pages se detecto que salas
creadas por versiones antiguas conservaban en Firestore campos tecnicos como
`source` y `pendingSync`. Las Rules estrictas nuevas los rechazan. Como el
uploader incremental usaba `{merge:true}`, esos campos sobrevivian aunque el
payload actual ya los filtraba, dejando la cola en `permission-denied`.

Correccion:

- `uploadSyncQueue()` ahora usa `batch.set()` sin merge para documentos propios
  de `workout_sessions_shared` y `workout_sets_shared`.
- El reemplazo conserva todos los campos funcionales y elimina solo campos
  legacy/no permitidos; no borra sesiones ni series.
- Una sesion antigua sin `finishedAt` ya no acumula semanas de duracion: se
  comparte como 0/en curso. Duraciones importadas se limitan a 2.880 minutos,
  el maximo aceptado por Rules.
- `firebase/rules.test.mjs` crea un documento legacy con `source` y
  `pendingSync`, confirma que el reemplazo sanitizado esta permitido y prueba
  tambien las consultas reales de miembros/sesiones/sets.
- Version objetivo: `2.6.1`, Android `versionCode 32`, cache PWA `v42`.
- Las seis definiciones de `firebase/firestore.indexes.json` fueron creadas en
  Firebase Console y quedaron `Habilitado` el 2026-07-10.
- Las Rules endurecidas validadas en Emulator fueron publicadas en el proyecto
  `a-100-9d80a` el 2026-07-10.
- Verificacion del hotfix: Node Gym Party/sync/modulos/SW/release OK; Emulator
  OK con consultas reales y limpieza de documento legacy; Playwright 5 OK y 1
  omitida intencionalmente; `assembleRelease` firmado con la clave permanente
  OK.
