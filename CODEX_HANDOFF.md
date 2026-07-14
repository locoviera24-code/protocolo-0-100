# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion: 2026-07-12
Rama esperada: `main`
Version actual: `2.7.0` (fuente unica: `app-version.json`)
Android: `versionCode 33`, `versionName "2.7.0"`
Service worker cache: `protocolo-0-100-pwa-2.7.0-b58`
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
- PWA offline con cache derivada `protocolo-0-100-pwa-2.7.0-b58` y
  actualizacion consentida desde el aviso visible.
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
- `advanced-features.js`: version `2.7.0`, backup/importacion Gym Party.
- `sw.js`: cache build 58, actualizacion consentida, incluye modulos nuevos y evita
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
- `android-native-wrapper/app/build.gradle`: `versionCode 33`,
  `versionName 2.7.0`, firma release solo desde variables seguras.
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
- IndexedDB funciona como espejo transaccional por dominios, pero
  `localStorage` sigue siendo la fuente sincrona compatible. La lectura
  primaria desde IndexedDB y el retiro gradual de claves grandes siguen
  pendientes hasta completar pruebas por dominio.

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

- Probar Firebase real de produccion con dos cuentas/dispositivos usando las
  reglas ya publicadas el 13 de julio de 2026.
- Probar iPhone/Safari/PWA con codigo de invitacion.
- Probar APK con Firebase desde WebView.
- Verificar el widget en launchers Android reales; RemoteViews varia por fabricante.
- Cachear `weekly_member_stats`.
- Paginacion historica si hay muchas sesiones.
- Mejorar comparador seleccionando miembros especificos para salas >5.

## 15. Proximos pasos recomendados

1. Ejecutar validaciones.
2. Crear una sala de prueba desde Android/web en Firebase real.
3. Unirse desde iPhone/Safari con una segunda cuenta.
4. Registrar entrenamiento local.
5. Sincronizar y comprobar salida, reingreso voluntario y expulsion.
6. Revisar dashboard Gym Party.
7. Exportar backup JSON y CSV comparativo.
8. Para APK final ejecutar `Publicar APK Android release` con Secrets de firma
   y conservar la misma clave para futuras actualizaciones `v2.7.0`.

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
- `firebase/firestore.rules` del build 70 se publico en `a-100-9d80a` el 13 de
  julio de 2026. La revision activa contiene `membershipRevision`,
  `lastMembershipMutation` y las restricciones de reactivacion del bloque 52.
- Los indices no cambiaron en este bloque. Mantener
  `firebase/firestore.indexes.json` sincronizado cuando se agreguen consultas.
- La config publica llega por Secrets `FIREBASE_*`; no agregar service accounts.
- Cada miembro vincula su propio email/clave si necesita recuperar el mismo UID
  en otro dispositivo. El owner no guarda credenciales del amigo.

APK release:

- Version: `versionCode 33`, `versionName 2.7.0`.
- Cache web: `protocolo-0-100-pwa-2.7.0-b70`.
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
- Version objetivo: `2.6.1`, Android `versionCode 32`, cache PWA `v44`.
- Las seis definiciones de `firebase/firestore.indexes.json` fueron creadas en
  Firebase Console y quedaron `Habilitado` el 2026-07-10.
- Las Rules endurecidas validadas en Emulator fueron publicadas en el proyecto
  `a-100-9d80a` el 2026-07-10.
- Verificacion del hotfix: Node Gym Party/sync/modulos/SW/release OK; Emulator
  OK con consultas reales y limpieza de documento legacy; Playwright 5 OK y 1
  omitida intencionalmente; `assembleRelease` firmado con la clave permanente
  OK.

## 26. Release 2.7.0 - arquitectura visual y sync legacy

Estado funcional:

- Navegacion movil inferior: `Inicio`, `Gym`, `Nutricion`, `Progreso`, `Mas`.
- Navegacion de escritorio: lateral compacta permanente desde 1024 px.
- `setModule('gym-party')`, URLs `gymPartyCode`, shortcuts PWA y claves de
  localStorage se mantienen sin migraciones destructivas.
- El boton superior permanente de Gym Party queda oculto por compatibilidad;
  los accesos visibles son Inicio, `Gym > Grupo` y enlaces de invitacion.
- Inicio muestra fecha, plan, una accion principal y registro esencial. La
  explicacion, campos secundarios y acciones destructivas quedan plegados.
- Gym prioriza `#quickSetLoggerPanel`; el registro legacy y el historial completo
  siguen disponibles en `details`. `workoutConfigPanel` conserva rutina/widget.
- Gym Party ofrece `Entrenar`, `Grupo`, `Progreso`; el registrador sigue usando
  `workoutSessions`, biblioteca, rutina semanal e historial compartidos.
- Nutricion prioriza calorias, proteina, fibra, agua y agregar alimento. Asistente,
  USDA/FDC, micronutrientes y configuracion siguen disponibles bajo demanda.
- Progreso prioriza tendencia y consejo. Focus Coins, insignias, rankings,
  referidos y terminos siguen intactos en paneles secundarios.

Sistema visual y archivos:

- `styles/tokens.css`: colores semanticos, tipografia, espacios, radios, alturas,
  z-index, safe areas y alias compatibles con CSS historico.
- `styles/base.css`: base, tipografia, iconos SVG, foco y movimiento reducido.
- `styles/components.css`: botones, formularios, estados, superficies y modales.
- `styles/modules.css`: navegacion, Inicio, Gym, Gym Party, Nutricion y Progreso.
- `styles/responsive.css`: 320-430 px, tablet, escritorio, teclado y print.
- `index.html`: barra inferior/lateral, modulo `tab-mas`, jerarquia de Inicio,
  Nutricion/Progreso y controles secundarios.
- `workout-features.js`: inserta el dashboard debajo de `.gymSectionNav` para
  conservar el orden visual sin cambiar APIs.
- `gym-party.js`: secciones compartidas y sanitizacion Firestore por allowlist.
- `scripts/sync-web-assets.ps1`, `sw.js`, workflow Pages y validador incluyen CSS.
- `tests/e2e/visual-navigation.spec.mjs` y `playwright.config.mjs` cubren Android,
  iPhone y escritorio 1440x900.

Correccion Firebase adicional:

- `firestorePayload(value, collectionName)` aplica allowlist independiente para
  `workout_sessions_shared` y `workout_sets_shared`; elimina campos legacy aunque
  hayan quedado en `syncQueue` o en un backup antiguo.
- Si un batch es rechazado, `uploadSyncQueue()` reintenta cada documento,
  sincroniza los validos y conserva solo los fallidos con colección/ID/error.
- Rules permite que el dueño complete `id`/`localSessionId` o `sessionId`
  ausentes en documentos legacy propios, sin cambiar `partyId` ni `userId`.
- La prueba real previa confirmo que lecturas de sala, miembros, sesiones y series
  funcionan; el rechazo estaba exclusivamente en `subir cambios` legacy.
- No se exportan `firebaseConfig`, email portable ni codigo pendiente. No hay
  service accounts, keystores ni claves privadas rastreadas.

Verificacion Firebase real posterior:

- Las Rules con `validSessionUpdate()` fueron publicadas en Firebase Console el
  2026-07-11 despues de pasar Emulator.
- La sala real `party_1782432255538_au3hta` sincronizo 16 documentos legacy,
  descargo 1 cambio remoto y quedo en `0 pendiente(s)`.
- El conflicto remoto detectado se resolvio mediante la estrategia LWW existente;
  no se perdieron sesiones ni series locales.

Compatibilidad que no debe reescribirse:

- No reemplazar `index.html`, `workout-features.js` o `gym-party.js` completos.
- No renombrar IDs, `data-*`, `AndroidBridge`, claves `protocolo_0_100_*`,
  colecciones Firestore ni acciones de widget sin migracion y pruebas.
- No separar Gym Party del registro local: debe seguir sincronizando el mismo
  `workoutSession`, series e historial.
- Mantener los cinco CSS externos en PWA, workflow Pages y assets del APK.

Pruebas relevantes para continuar:

1. `powershell -ExecutionPolicy Bypass -File scripts/validate-app.ps1 -CheckAndroidAssets`
2. `node scripts/test-service-worker.mjs`
3. `node scripts/test-workout-features.mjs`
4. `node scripts/test-gym-party.mjs`
5. `node scripts/test-gym-party-sync.mjs`
6. `npm run test:e2e`
7. `npm run test:rules`
8. Gradle `:app:assembleDebug` y `:app:assembleRelease` con firma segura.

Antes de continuar leer: este archivo completo, `README.md`, los cinco archivos
en `styles/`, `index.html`, `workout-features.js`, `gym-party.js`,
`firebase/firestore.rules`, `tests/e2e/*.mjs`, `sw.js` y el wrapper Android.

Verificacion local final de `2.7.0`:

- Validador con assets Android: OK, cache `v45`, 71 alimentos, 28 nutrientes y
  255 IDs estaticos unicos.
- Node: service worker, Workout, metricas, Gym Party, sync incremental, limites
  modulares, WebView, release y accesibilidad: OK.
- Firestore Emulator con Java 21: owner atomico, consultas de sync, limpieza
  legacy y seis negativas criticas: OK.
- Playwright: 15 pruebas OK y 6 omisiones intencionales por plataforma; Android
  Chromium, iPhone WebKit y escritorio Chromium 1440x900.
- Anchos 320, 360, 390, 412 y 430 px: sin scroll horizontal accidental.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- `assembleDebug` y `assembleRelease`: OK. APK release local: 1.145.085 bytes,
  firma v1/v2 valida con certificado permanente y SHA-256
  `3A6063BA1E518BAF7D5A5603514365951524982479AFA005F09D5F5D59571A16`.
- Archivo local verificable: `dist/protocolo-0-100-v2.7.0-release.apk` y `.sha256`.

Bugs/limitaciones conocidos:

- El widget nativo requiere comprobacion manual en un launcher Android real;
  RemoteViews no puede replicar toda la UI web.
- Gym Party evita listeners permanentes para ahorrar cuota Spark; sincroniza al
  abrir, guardar, recuperar conexion o pulsar sincronizar.
- El acceso en otro dispositivo exige vincular email/clave antes de perder la
  sesion anonima original.
- El gran bloque CSS historico de `index.html` ya fue extraido; no reintroducir
  bloques `<style>` ni hojas inyectadas desde JavaScript.

## 27. Refactor UX/UI - bloque 1: migracion CSS

Estado verificado el 2026-07-11 sobre el codigo real:

- `index.html` ya no contiene un bloque `<style>`. Las reglas historicas que
  siguen siendo necesarias viven en `styles/features.css`; durante la
  extraccion se descartaron 299 selectores ya cubiertos por base, componentes,
  modulos o responsive.
- `ensureWorkoutStyles()` fue eliminado de `workout-features.js`; su layout
  vive en `styles/gym.css`.
- `ensureStyles()` fue eliminado de `gym-party.js`; su layout vive en
  `styles/gym-party.css`.
- El orden CSS es tokens, base, componentes, features, Gym, Gym Party, modulos
  y responsive.
- Los controles de formulario usan `width: 100%` y `min-width: 0`. Esto
  evita que el ancho intrinseco de un `select` amplie el layout viewport y
  desplace la barra inferior fuera del visual viewport en Chromium movil.
- `scripts/test-design-system.mjs` impide reintroducir bloques `<style>`,
  hojas inyectadas, emojis en navegacion y nuevas constantes visuales fuera de
  `scripts/design-token-allowlist.json`.
- El sincronizador Android, el validador y los cuatro workflows incluyen las
  ocho hojas externas y `npm run test:design`.

Linea base previa al bloque: validacion y diez pruebas Node OK; Firestore
Emulator OK; Playwright 15 OK y 6 omisiones intencionales por plataforma;
`npm audit` sin vulnerabilidades.

Pendientes reales del rediseño:

- router jerarquico con historial, deep links y Atrás;
- coordinador de sticky, teclado y safe areas;
- Inicio adaptativo y pantallas reales de Mas, Ajustes, Datos y Acerca de;
- Progreso consolidado, flujo Nutricion por pasos y combobox de Gym;
- mensajes/estados centrales, modos guiado/compacto, historiales responsive y
  modularizacion adicional de los orquestadores.

## 28. Refactor UX/UI - bloque 2: router y navegacion

- `ui/router.js` implementa rutas `module/view`, `pushState`,
  `replaceState`, `popstate`, historial interno, parent route y Atrás.
- Rutas canonicas: `home/register`, `home/overview`, `gym/train`,
  `gym/routine`, `gym/group`, `gym/progress`, `nutrition/meals`,
  `progress/overview` y `more/*`.
- Los alias `protocolo`, `nutricion`, `progreso`, `mas` y
  `gym-party` siguen funcionando. El alias Gym Party se normaliza a
  `?module=gym&view=group`.
- `setModule()` y `activateTab()` se mantienen como APIs compatibles y
  delegan al router una vez iniciado. Widget Android, shortcuts PWA y enlaces
  de invitacion conservan sus entradas.
- La topbar tiene `#routeBackBtn`; las vistas internas actualizan titulo,
  subtitulo, foco, `document.title` y `#globalLiveRegion`. Solo el destino
  principal activo conserva `aria-current="page"`.
- `Mas` tiene pantallas propias para Telefono, Plan, Ayuda, Ajustes, Datos y
  copias, Privacidad y Acerca de. `Ajustes` ya no abre `tab-dashboard`.
- Se elimino el gesto global `touchstart/touchend` que abria un drawer oculto
  y podia interferir con el gesto Atrás de iPhone.
- `manifest.webmanifest` usa shortcuts canonicos con `module/view`.
- `scripts/test-router.mjs` cubre aliases, URL, historial y popstate;
  `tests/e2e/router.spec.mjs` cubre deep links, recarga, Atrás, foco y Mas.
- Cache actual: `protocolo-0-100-pwa-v48`. `ui/router.js` se publica,
  cachea y sincroniza dentro del APK.
- Verificacion del bloque: validador con 267 IDs unicos y assets Android
  sincronizados; pruebas router/design OK; Playwright 24 OK y 6 omisiones
  intencionales en Android Chromium, iPhone WebKit y escritorio Chromium.

Pendiente despues de este bloque: coordinar sticky/teclado, completar el
contenido funcional de Ajustes/Datos/Acerca de, consolidar Progreso, simplificar
Nutricion y Gym, centralizar mensajes/estados y terminar accesibilidad.

## 29. Refactor UX/UI - bloque 3: presupuesto sticky

- `ui/navigation.js` mide la topbar, la navegacion contextual visible, la
  unica accion sticky activa, la barra inferior, banners y `visualViewport`.
- Publica en `:root` las variables `--layout-topbar-height`,
  `--layout-context-height`, `--layout-bottom-nav-height`,
  `--layout-action-height`, `--layout-banner-height` y
  `--layout-keyboard-inset`.
- `.gymSectionNav`, `.partySectionNav` y `.nutritionNav` usan la altura
  medida de la topbar. `.dailySaveBar`, `.quickStickyActions` y
  `.partyStickySave` comparten una sola regla de posicion; una segunda accion
  visible se degrada automaticamente a posicion estatica.
- El teclado se detecta combinando `focusin/focusout` con
  `visualViewport`; al abrirse se oculta la barra inferior y se mantiene la
  accion del formulario por encima del inset disponible.
- `.updateBanner`, `.appBanner` y `#toast` reservan barra inferior y
  accion activa. `advanced-features.js` emite `layout-refresh` al crear el
  aviso PWA.
- En movil la topbar se compacta al bajar; en escritorio las acciones quedan
  estaticas. Scroll padding y scroll margin usan las alturas activas.
- La heuristica antigua basada solo en diferencia de altura fue eliminada de
  `index.html`.
- Cache actual: `protocolo-0-100-pwa-v49`; `ui/navigation.js` se publica,
  cachea y sincroniza dentro del APK.
- Pruebas: `scripts/test-layout-coordinator.mjs` valida contratos y
  `tests/e2e/layout-sticky.spec.mjs` verifica 320x568, teclado, banner y
  escritorio.
- Verificacion del bloque: validador con assets Android y cache v49 OK; layout
  E2E 3 OK y 6 omisiones por proyecto; router+navegacion visual 16 OK y 5
  omisiones intencionales, sin scroll horizontal entre 320 y 430 px.

Pendiente: completar contenido y preferencias de Inicio/Mas, consolidar
Progreso, simplificar Nutricion y Gym, centralizar mensajes/estados y ampliar
accesibilidad visual.

## 30. Refactor UX/UI - bloque 4: Inicio y Ajustes

- Inicio tiene `#homeStatusCard` antes del formulario en movil. Resume score,
  estado, racha, datos esenciales pendientes y una accion contextual.
- Estados: `empty`, `partial`, `ready` y `complete`. La accion cambia
  entre empezar, continuar, guardar y ver progreso.
- El aside de score inferior se oculta en movil para no duplicar la informacion;
  permanece en escritorio. Al completar la accion diaria, `#actionFocusCard`
  se compacta y muestra la proxima recomendacion.
- Nueva clave `protocolo_0_100_ui_preferences_v1`: apariencia, densidad,
  modo guiado/compacto, kg/lb, RIR/RPE, orientacion nutricional, recordatorios
  y sync automatico.
- Ajustes aplica `data-density` y `data-experience-mode` sin modificar datos
  de usuario; kg/lb y RIR se sincronizan con `gymSettings`.
- Datos y copias muestra ultima exportacion
  (`protocolo_0_100_backup_meta_v1`), estimacion de localStorage, schema y
  cantidad de claves. Permite reset selectivo de protocolo, Gym, Nutricion o UI
  y un borrado total separado en zona de peligro.
- El backup completo incluye `uiPreferences`; la importacion las restaura.
  `firebaseConfig` y credenciales siguen excluidos.
- Acerca de muestra web `2.7.0`, cache, fecha y version Android. El puente
  `AndroidBridge.getAppInfo()` devuelve versionName/versionCode sin exponer
  identificadores privados.
- Cache actual: `protocolo-0-100-pwa-v50`.
- Pruebas: `scripts/test-home-settings.mjs` y
  `tests/e2e/home-settings.spec.mjs`.
- Verificacion del bloque: validador web/PWA/Android, contratos de design,
  router, layout e Inicio/Ajustes OK; Playwright completo con 37 pruebas OK y
  14 omisiones intencionales por proyecto; `:app:assembleDebug` OK con Java 17.
  Gradle solo informa la advertencia previa de una API WebView obsoleta.

Pendiente: onboarding completo del modo guiado, Progreso consolidado, flujo de
Nutricion por pasos, combobox Gym, mensajes/estados centrales e historiales
responsive.

## 31. Refactor UX/UI - bloque 5: Progreso consolidado

- `progress/progress-view.js` convierte Progreso en el centro analitico para
  Habitos, Gym y Nutricion sin crear claves nuevas ni duplicar datos.
- Deep links internos: `progress/overview`, `progress/habits`, `progress/gym`,
  `progress/nutrition`, `progress/history` y `progress/achievements`.
- La portada muestra tendencia de 7 y 30 dias, consistencia, cambio contra el
  periodo anterior, area mas fuerte, area a mejorar y una proxima accion.
- Los filtros `#progressPeriod` y `#progressArea` permiten revisar 7, 30, 90
  dias o todo el historial. Los graficos de barras usan `progress`, leyenda
  textual y una escala comun; no dependen solo del color.
- Gym reutiliza `workoutSessions` y `WORKOUT_METRICS`; Nutricion reutiliza
  `protocolo_0_100_nutrition_entries_v1`; Habitos conserva los calculos del
  tracker. No se modifica ni migra localStorage.
- `home/overview` queda como ruta compatible que dirige al unico panel de
  Progreso. Focus Coins, rankings, afiliados y recompensas quedan plegados en
  Logros.
- `progress/progress-view.js` se publica en Pages, se cachea offline y se
  sincroniza dentro del APK. Cache actual: `protocolo-0-100-pwa-v51`.
- Pruebas agregadas: `scripts/test-progress-view.mjs` y
  `tests/e2e/progress.spec.mjs`.

- Durante la matriz completa se detecto un fallo real en iPhone WebKit: al
  cerrar el teclado, `bottomNav` podia reaparecer encima del boton Crear sala
  antes de completar el toque. `ui/navigation.js` mantiene ahora una ventana
  de estabilizacion de 450 ms y Gym Party delega acciones desde
  `#gymPartyRoot`, resistente a sus rerenders.
- Verificacion del bloque: validador web/PWA/Android OK con 315 IDs unicos;
  contratos Progreso/design/router/layout/Gym Party OK; Playwright completo 43
  OK y 14 omisiones intencionales; la regresion iPhone paso 5 repeticiones;
  Firestore Emulator OK y `:app:assembleDebug` OK.

Pendiente: historiales responsive reutilizables, flujo Nutricion por pasos,
combobox Gym, mensajes/estados centrales, accesibilidad final y rendimiento.

## 32. Refactor robusta - sistema visual y version unica

- `styles/features.css` ya no contiene una segunda declaracion `:root` y fue
  formateado junto con `styles/gym.css` y `styles/gym-party.css`.
- Colores, superficies translucidas, overlays, estados, graficos, mapa
  muscular, navegacion, radios, tipografia y elevacion usan tokens definidos
  en `styles/tokens.css`.
- `scripts/design-token-allowlist.json` conserva cero excepciones para colores,
  radios, sombras y tamanos tipograficos directos. Los 19 estilos inline
  heredados/dinamicos siguen inventariados y son deuda explicita, no se
  consideran migrados.
- `app-version.json` es la fuente unica: version `2.7.0`, Android
  `versionCode 33`, build web/cache `54` y fecha `2026-07-12`.
- `app-version.js` es el artefacto generado para web y service worker;
  `scripts/sync-app-version.mjs` lo regenera y alinea package/lockfile.
- `index.html`, Acerca de, `advanced-features.js`, `sw.js`, Gradle y el workflow
  release consumen o validan esa fuente. Cache derivado:
  `protocolo-0-100-pwa-2.7.0-b54`; APK:
  `protocolo-0-100-v2.7.0-release.apk`.
- `scripts/test-version-alignment.mjs` y `npm run test:version` fallan ante
  divergencias. Pages y workflows Android ejecutan este contrato.

- Verificacion del bloque: assets Android sincronizados; validador con 315 IDs
  unicos; design/version/service-worker OK; Playwright visual, Inicio/Ajustes y
  Progreso 23 OK con 7 omisiones intencionales; `:app:assembleDebug` OK leyendo
  `app-version.json`.

Pendiente real: migrar los 19 estilos inline permitidos, terminar responsive
de historiales/Nutricion y crear el sistema central de mensajes/estados.

## 33. Refactor robusta - contratos funcionales de Ajustes (parcial)

- Apariencia `system` observa `(prefers-color-scheme: light)`, reacciona a
  cambios y aplica un juego completo de tokens claros/oscuros. Tambien actualiza
  `meta[name=theme-color]`.
- Densidad compacta reduce espacios de tarjetas, listas, formularios y tablas
  sin modificar `--touch-target: 44px`.
- Modo compacto oculta explicaciones repetidas, ejemplos y heroes secundarios;
  modo guiado conserva toda la ayuda. La funcionalidad permanece disponible.
- `settingsNutritionGuidance=false` oculta diagnostico, recomendaciones y
  combinaciones, sin borrar comidas ni objetivos.
- Recordatorios significa ahora un recordatorio interno al abrir/volver a la
  app. La etiqueta aclara que la web no garantiza notificaciones de fondo.
- `settingsAutoSync=false` impide sync automatico al abrir Gym Party, despues
  de guardar y al recuperar conexion; la cola local sigue guardandose y el
  boton manual continua disponible.
- Pruebas: `scripts/test-settings-contract.mjs` y Playwright de Ajustes en los
  tres proyectos. Resultado: 16 OK, 2 omisiones moviles intencionales.

- Pesos se guardan siempre en kg canonicos. Web, Progreso y Gym Party convierten
  solo al mostrar/editar; cambiar a lb no reescribe sesiones historicas. El
  widget muestra lb y convierte a kg antes de mutar `workoutSession`.
- Verificacion kg/lb: prueba unitaria 132.5 lb -> 60.1 kg, Playwright 3/3 y
  `:app:assembleDebug` OK.

Pendiente antes de declarar Ajustes completo: onboarding reabrible del modo
guiado; probar autosync con Firebase Emulator y aclarar/implementar recordatorios
Android fuera del cronometro de descanso.

## 34. Refactor robusta - repositorios e IndexedDB gradual

- `data/indexeddb.js` crea `protocolo_0_100_data` con almacenes `records`,
  `meta` y `recovery`. El modo inicial es `shadow`: conserva todas las claves
  historicas como fuente sincrona y replica en una cola asincrona.
- Migraciones v1 por dominio: `protocol`, `workout`, `nutrition`, `gymParty`,
  `settings` y `backup`. Son idempotentes, crean snapshot previo y una
  transaccion fallida restaura el estado local.
- `data/repositories.js` expone `ProtocolRepository`, `WorkoutRepository`,
  `NutritionRepository`, `GymPartyLocalRepository`, `SettingsRepository` y
  `BackupRepository`, ademas de instancias en `window.APP_REPOSITORIES`.
- `index.html`, `workout-store.js`, `workout-ranking.js`, `fdc-client.js` y
  `gym-party.js` escriben por la capa compatible. Backups JSON y nombres de
  claves no cambiaron.
- `BroadcastChannel` y el evento `storage` anuncian entre pestanas solo clave,
  dominio, origen y fecha; nunca transmiten el contenido del registro.
- Errores de cuota/migracion se clasifican y emiten como `app-data-error` con
  un mensaje recuperable. `Mas > Datos y copias` muestra el estado de la copia
  interna sin exponer datos.
- El espejo elimina `firebaseConfig` de los ajustes Gym Party y no incluye la
  clave FDC. El restablecimiento selectivo purga clave, espejo y snapshots del
  area; borrar todo limpia tambien metadatos y recuperacion IndexedDB.
- Assets nuevos se cachean en PWA, se publican en Pages y se sincronizan al
  APK. Cache actual: `protocolo-0-100-pwa-2.7.0-b53`.
- Pruebas: `scripts/test-data-layer.mjs` y
  `tests/e2e/data-layer.spec.mjs`. Cubren migracion real, idempotencia, espejo,
  rollback, dos pestanas, exclusion Firebase y purga.
- Verificacion del bloque: Node/validador OK; Android Chromium 24 OK y 2
  omisiones; iPhone WebKit 19 OK y 7 omisiones; escritorio Chromium 21 OK y 5
  omisiones. La carrera de recarga del reset selectivo detectada en escritorio
  se elimino y su regresion paso 3 repeticiones. Firestore Emulator y
  `:app:assembleDebug` terminaron correctamente.

Pendiente real de esta fase: migrar la lectura primaria de cada dominio solo
despues de medir estabilidad; probar cuota agotada con una inyeccion controlada;
mantener la migracion gradual hasta retirar escrituras sincronas grandes.

## 35. Refactor robusta - importacion segura y recuperable

- `data/backup-service.js` valida tipo raiz, tamaño maximo de 8 MB, schema,
  profundidad, cantidad de elementos, numeros y cadenas antes de escribir.
- Rechaza JSON vacio/invalido y schemas posteriores a 3. Conserva backups
  legacy con `entries[]` y acepta los aliases actuales `dailyLogs/meals`.
- Sanea claves `__proto__`, `prototype` y `constructor`, elimina controles de
  cadenas y limita tamaños. Nunca importa `firebaseConfig` de Gym Party ni la
  configuracion FDC.
- El modal `#importPreviewBackdrop` informa registros nuevos, reemplazos,
  conflictos, areas y campos ignorados. Usa `textContent`, dialogo modal,
  Escape, foco y confirmacion explicita.
- `APP_DATA.replaceMany()` soporta claves raw controladas para `startDate` y
  modulo activo. La importacion completa se aplica en una sola transaccion con
  snapshot previo y rollback automatico.
- `protocolo_0_100_import_history_v1` guarda solo metadatos de las ultimas 10
  operaciones. `#importUndoPanel` permite restaurar el snapshot anterior y
  reaparece tras recargar si la importacion sigue siendo la ultima operacion.
- `window.importCompleteBackupData()` conserva su API publica y delega al
  servicio seguro cuando la nueva capa esta disponible.
- PWA, Pages, workflows y APK incluyen `data/backup-service.js`. Cache actual:
  `protocolo-0-100-pwa-2.7.0-b54`.
- Pruebas: `scripts/test-backup-service.mjs` y
  `tests/e2e/backup-import.spec.mjs`. La matriz visible paso 6/6 en Android
  Chromium, iPhone WebKit y escritorio Chromium.

Pendiente real: agregar historial visual de migraciones, probar una interrupcion
forzada de IndexedDB/cuota y consolidar este feedback en el sistema central de
Snackbar/InlineValidation que sigue pendiente.

## 36. Nutricion - linea base y extraccion del dominio

Linea base confirmada en `main` antes de editar:

- HEAD `449af5e`, version `2.7.0`, Android `33`, build/cache `54`.
- Assets Android sincronizados y validador estructural correcto con 331 IDs.
- Playwright completo: 70 pruebas aprobadas y 14 omisiones intencionales.
- Firestore Emulator correcto; las denegaciones `PERMISSION_DENIED` del log son
  los casos negativos esperados por la suite.
- `:app:assembleDebug` correcto.
- Se detecto un fallo local de `test:version`: comparaba CRLF de Windows contra
  LF generado. `scripts/sync-app-version.mjs` normaliza finales de linea en
  modo check; los valores de version nunca estuvieron desalineados.

Extraccion implementada sin modificar datos ni interfaz:

- `nutrition/nutrition-store.js`: claves y acceso mediante
  `NutritionRepository`, con fallback compatible.
- `nutrition/nutrition-model.js`: normalizacion, comidas canonicas, unidades,
  conversion a gramos, totales y construccion de entradas.
- `nutrition/food-search.js`: busqueda pura por nombre/alias, tildes, plurales
  y similitud.
- `nutrition/food-entry-flow.js`: maquina de estados pura para
  buscar/alimento/cantidad/comida/revision.
- `nutrition/meal-history.js`: recientes, frecuencia y copia de comidas.
- `nutrition/nutrition-confidence.js`: diferencia nutrientes conocidos,
  estimados y desconocidos; desconocido no se persiste como cero en entradas
  nuevas.
- `nutrition/nutrition-view.js`: view models del dia y las cuatro metricas
  principales.
- Las APIs globales `nutritionTargets`, `allFoods`, `normalizeFoodText`,
  `findCatalogFood`, `buildFoodEntry`, `canonicalUnit`, `amountToGrams`,
  `nutritionTotals` y el render existente se mantienen como adaptadores.
- `getLocalData/setLocalData` delegan al repositorio dueño de la clave cuando
  esta disponible. IndexedDB permanece en modo shadow.
- Los siete modulos se publican en Pages, se precachean y se copian al APK.

Pruebas nuevas:

- `scripts/test-nutrition-modules.mjs`: store, modelo, aliases/plurales,
  porciones, flujo, historial, confianza y view.
- `tests/e2e/nutrition-domain.spec.mjs`: 3/3 en Android Chromium, iPhone
  WebKit y escritorio; valida repositorio, espejo IndexedDB, backup y recarga.
- Regresion final completa despues de integrar: 73 pruebas aprobadas y 14
  omisiones intencionales; cero fallos. `:app:assembleDebug` volvio a compilar
  con los siete assets Nutricion sincronizados.

La extraccion de dominio quedo cerrada en `fc513ec`. El siguiente bloque de UX
se documenta en la seccion 37.

## 37. Nutricion - Hoy simple, agua separada y ajustes secundarios

Implementado sobre `fc513ec`, sin cambiar claves ni schema:

- La navegacion normal de Nutricion queda en tres destinos: `Hoy`, `Agregar` y
  `Progreso`. Cobertura se abre como detalle secundario desde Hoy.
- `#nutritionTodayCard` concentra fecha, calorias, proteina, fibra, agua, un
  unico CTA `Agregar alimento`, comidas agrupadas y controles de hidratacion.
- `renderNutrition()` usa `NUTRITION_VIEW.dayModel()` y
  `NUTRITION_MODEL.groupByMeal()`. Ya no muestra una lista plana ni duplica el
  score orientativo en la portada.
- Agua se guarda con `saveNutritionWater()`, ofrece `+250 ml`, `+500 ml`,
  edicion manual y `undoNutritionWater()`. Al guardar agua se conserva el peso
  previo de esa fecha.
- Peso corporal se guarda por separado con `saveNutritionWeight()` en
  `Mas > Ajustes > Nutricion`; continua almacenado en la misma estructura
  `bodyMetrics`, en kg canonicos. La preferencia lb convierte solo entrada,
  salida e historial; no reescribe registros.
- Objetivos, alimentos personalizados y configuracion FDC se mueven en runtime
  a `#nutritionSettingsMount`. No aparecen en el flujo diario.
- Los campos manuales de macros/micronutrientes estan plegados bajo `Crear
  alimento personalizado`. Frecuentes, copia y acciones destructivas quedan
  en un detalle secundario.
- `nutritionDiagnosisCard` y los textos principales ahora hablan de
  `Cobertura estimada de lo registrado`, sin presentar diagnostico clinico.
- Se corrigieron los selectores CSS corruptos `#fdcSearchCard` y
  `#fdcSettingsCard`. El validador de colores distingue IDs CSS que comienzan
  con letras hexadecimales de colores reales.
- `tests/e2e/nutrition-today.spec.mjs` prueba las tres vistas, ajustes fuera del
  flujo, agrupacion por comida, agua/peso independientes, Deshacer y 320 px.

Verificacion final del bloque:

- Validadores y todos los `scripts/test-*.mjs`: correctos.
- Playwright completo: 82 aprobadas, 14 omisiones intencionales, cero fallos
  en Android Chromium, iPhone WebKit y escritorio Chromium.
- Tras completar kg/lb corporal, la suite dirigida de Nutricion paso 12/12 en
  las tres plataformas y el APK se recompilo correctamente.
- Firestore Emulator: correcto; las denegaciones del log son los seis casos
  negativos esperados por las reglas.
- Assets web/Android: sincronizados y comprobados bit a bit.
- Android `:app:assembleDebug`: `BUILD SUCCESSFUL` con Java 17.

Estado de version del bloque: `2.7.0`, Android `33`, build/cache `55`:
`protocolo-0-100-pwa-2.7.0-b55`.

Pendiente exacto de Nutricion: convertir `Agregar` en el flujo guiado completo
buscar > alimento > cantidad > comida > revisar > guardar; agregar menu
contextual editar/duplicar/mover/copiar/eliminar con Deshacer; completar la
cobertura honesta por nutriente y mover la clave FDC a modo desarrollador.

## 38. Nutricion - flujo guiado de alta

Implementado despues de `d45f1bb`:

- `#nutritionBuilderCard` usa cuatro pasos visibles: Alimento, Cantidad, Comida
  y Revisar. Cada transicion mueve foco y scroll al encabezado correcto.
- `NUTRITION_ENTRY_FLOW` es el controlador del recorrido; no se creo una
  segunda estructura de entradas ni se cambiaron claves.
- La primera pantalla usa `NUTRITION_FOOD_SEARCH.rank()` y
  `NUTRITION_MEAL_HISTORY` para mostrar recientes, frecuentes y resultados
  locales sin repetir alimentos entre grupos.
- El selector completo se conserva como alternativa plegada para
  compatibilidad. USDA sigue siendo una busqueda secundaria y explicita.
- Cantidad acepta g, ml, unidad, taza, cucharada, rebanada, lata o porcion y
  convierte mediante `NUTRITION_MODEL.amountToGrams()`.
- Revision muestra nombre, cantidad, comida, calorias y macros antes de
  escribir. Un alimento personalizado no se persiste hasta pulsar Guardar.
- Guardar vuelve a Hoy y expone `Deshacer ultimo alimento`; si la persistencia
  no se completa, no se ejecuta el cambio de vista.
- El banner de actualizacion se contrae en 320 px para reducir obstruccion sin
  tapar la navegacion.
- Pruebas dirigidas: 21/21 en Android Chromium, iPhone WebKit y escritorio,
  mas aserciones de foco, alimento personalizado, recientes, unidades y
  Deshacer.
- Regresion completa final: 91 aprobadas, 14 omisiones intencionales y cero
  fallos. Assets Android comprobados bit a bit y `:app:assembleDebug` termino
  con `BUILD SUCCESSFUL`.

Estado publicable de este bloque: version `2.7.0`, Android `33`, build/cache
`56` (`protocolo-0-100-pwa-2.7.0-b56`).

Pendiente real de Nutricion: menu contextual para editar/duplicar/mover/copiar
y eliminar con Deshacer; favoritos; cobertura honesta completa por nutriente;
clave FDC en modo desarrollador. El flujo principal ya no es monolitico.

## 39. Progreso personal por musculo

Implementado despues de `4f7a613`:

- Nuevos modulos puros: `progress/progress-data-model.js`,
  `progress/gym-progress-model.js` y `progress/muscle-progress.js`.
- `Progreso > Gym` tiene dos alcances reales: Resumen y Musculos. No se
  agregaron botones vacios para Ejercicios o Records; pertenecen al siguiente
  bloque.
- Deep links: `progressScope=muscle&muscle=<id>`. Seleccionar otro musculo crea
  historial y Atrás restaura selector, metricas y ejercicios.
- El mapa corporal es interactivo y accesible; incluye resumen textual. En 320
  px no recorta botones ni genera scroll horizontal.
- Formula principal: cada set guardado cuenta una vez en `exercise.muscle` o
  en el `group` canonico de la biblioteca. `secondaryMuscles` se conserva como
  metadato, pero no se suma al total principal.
- Por musculo se calculan series de la semana, series de cuatro semanas,
  sesiones, frecuencia semanal, volumen externo, ejercicios, cambio contra el
  periodo anterior, cuatro barras semanales y ultima fecha.
- Estados: `no-data`, `insufficient`, `partial` y `sufficient`. No se muestran
  series optimas universales ni diagnosticos de sobreentrenamiento.
- Peso corporal conserva reps y frecuencia sin presentar `0 kg` como fuerza.
- `scripts/test-muscle-progress.mjs` verifica periodo real, no doble conteo,
  peso corporal, cambios y estados. `tests/e2e/progress-muscle.spec.mjs` pasa
  9/9 en Android Chromium, iPhone WebKit y escritorio, incluyendo 320 px.
- Regresion completa: 100 aprobadas, 14 omisiones intencionales, cero fallos.
  Assets Android sincronizados y `:app:assembleDebug` termino correctamente.

Estado publicable: version `2.7.0`, Android `33`, build/cache `57`
(`protocolo-0-100-pwa-2.7.0-b57`). Los tres modulos se precachean, se publican
en Pages y se sincronizan al APK.

Pendiente exacto: Progreso por ejercicio, busqueda accesible, variantes,
mejores series/pesos, e1RM conservador, records derivados y sugerencia de
progresion. Despues, corregir el resumen integral y retirar escritura nueva en
`gymSessions`.

## 40. Progreso por ejercicio, fuerza y records

Implementado despues de `af6bafb`:

- Nuevos modulos: `progress/exercise-progress.js` y
  `progress/personal-records.js`.
- `Progreso > Gym` agrega alcances funcionales Ejercicios y Records. Deep link:
  `progressScope=exercise&exerciseId=<id>`; Atrás restaura el ejercicio.
- Las variantes no se mezclan: se usa `exerciseId` canonico y aliases solo para
  migracion/busqueda.
- Metricas: ultima sesion, mejor carga, mejor serie, reps maximas, volumen,
  series, sesiones, cambio contra periodo anterior e historial reciente.
- e1RM usa Epley `peso * (1 + reps / 30)` solo entre 1 y 12 reps, con carga
  positiva y fuera de peso corporal. La UI explica que es estimado.
- Peso corporal muestra reps maximas, lastre y volumen de lastre; nunca usa
  `0 kg` como indicador de fuerza.
- Records son derivados del historial: carga, e1RM, reps, volumen de sesion,
  reps de peso corporal y lastre. No dependen de una clave mutable ni se
  duplican por volver a sincronizar una sesion.
- Recomendacion conservadora exige dos sesiones y explica sus datos. Bloquea
  aumentos ante dolor/molestia, caida de reps/carga o empeoramiento marcado de
  RIR/RPE.
- `scripts/test-exercise-progress.mjs` cubre variantes, e1RM, peso corporal,
  recomendacion y records. `tests/e2e/progress-exercise.spec.mjs` pasa 9/9 en
  Android Chromium, iPhone WebKit y escritorio.
- Regresion completa: 109 aprobadas, 14 omisiones intencionales y cero fallos.
  Assets Android sincronizados y APK debug compilado correctamente.

Estado publicable: version `2.7.0`, Android `33`, build/cache `58`
(`protocolo-0-100-pwa-2.7.0-b58`).

Pendiente siguiente: corregir el resumen integral separando cobertura,
constancia y tendencia; migrar `gymSessions` a solo legacy; luego menu completo
de edicion en Nutricion y sistema central de mensajes.

## 41. Resumen integral honesto y Gym canonico

Implementado despues de `44203e1`:

- `progress/progress-view.js` separa cobertura de registro, constancia y
  tendencia. Ya no compara como resultados equivalentes el score de habitos,
  las sesiones Gym y los dias de Nutricion.
- Las tarjetas usan `Mejor tendencia observada` y `Area con menos registros`.
  La segunda describe cantidad de datos y no presenta ausencia de registros
  como bajo rendimiento.
- El periodo `Todo` usa el primer y ultimo dato observados. La expectativa Gym
  se deriva de los dias entrenables de `weeklyWorkoutPlan`, no de tres sesiones
  semanales hardcodeadas.
- Progreso solo lee `workoutSessions`. `migrateLegacyGymSessions()` migra
  `gymSessions` de forma idempotente, conserva fecha, rutina, ejercicios,
  series, reps, peso, RIR y notas, y no elimina la fuente legacy.
- Las sesiones nuevas creadas desde el formulario antiguo y desde el registro
  rapido se escriben unicamente en `workoutSessions`. `gymSessions` queda para
  importacion y compatibilidad con backups anteriores.
- `tests/e2e/gym-canonical.spec.mjs` verifica migracion unica y que un guardado
  nuevo no modifica la coleccion legacy. `tests/e2e/progress.spec.mjs` verifica
  periodo observado, plan semanal real y cobertura diferenciada.
- Regresion completa: 115 aprobadas, 14 omisiones intencionales y cero fallos
  en Android Chromium, iPhone WebKit y escritorio.
- Assets Android comprobados con `validate-app.ps1 -CheckAndroidAssets` y
  `:app:assembleDebug` finalizo con `BUILD SUCCESSFUL`.

Estado publicable de este bloque: version `2.7.0`, Android `33`, build/cache
`59` (`protocolo-0-100-pwa-2.7.0-b59`).

Pendiente siguiente: menu contextual completo de alimentos con editar,
duplicar, mover, copiar y eliminar con Deshacer; despues cobertura nutricional
honesta por nutriente y sistema central de mensajes.

## 42. Edicion contextual de comidas

Implementado despues de `755745d`:

- Cada `nutritionFoodRow` muestra un unico disparador `Opciones`; las seis
  acciones quedan dentro de un popover y no saturan la portada diaria.
- Editar cantidad recalcula calorias, macros y nutrientes de forma
  proporcional. Mover permite cambiar comida y fecha sin crear otra entrada.
- Duplicar conserva el dia y la comida; copiar abre una hoja accesible para
  elegir fecha y comida destino; guardar como frecuente crea una plantilla de
  un alimento reutilizable.
- Eliminar, editar, mover, duplicar y copiar toman una instantanea previa de
  `nutritionEntries`. `Deshacer ultimo cambio` restaura exactamente ese estado
  mediante `NutritionRepository`; no se creo una clave paralela.
- El editor usa dialogo modal con retorno de foco, Escape, trampa de foco,
  backdrop cerrable, campos etiquetados y accion principal visible en movil.
- Se agregaron tokens semanticos para elevacion y capa de popover. La revision
  visual a 390 x 844 confirmo menu superpuesto, hoja inferior sin scroll
  horizontal y contenido principal sin compresion.
- `tests/e2e/nutrition-today.spec.mjs` verifica por interfaz edicion con
  recalculo, mover, eliminar/Deshacer, duplicar, copiar y frecuente. Resultado
  dirigido: 24/24 en Android Chromium, iPhone WebKit y escritorio.
- Regresion completa: 121 aprobadas, 14 omisiones intencionales y cero fallos.
- Assets Android sincronizados y verificados; `:app:assembleDebug` termino con
  `BUILD SUCCESSFUL` despues de incorporar el dialogo y los nuevos estilos.

Estado publicable: version `2.7.0`, Android `33`, build/cache `60`
(`protocolo-0-100-pwa-2.7.0-b60`).

Pendiente siguiente: cobertura nutricional honesta por nutriente, distinguiendo
conocido, estimado, desconocido, no informado y cero confirmado; luego sistema
central de mensajes y estados.

## 43. Cobertura nutricional honesta

Implementado despues de `1e090e2`:

- `nutrition/nutrition-confidence.js` define cinco estados: `known`,
  `estimated`, `unknown`, `notReported` y `confirmedZero`.
- `nutrition-data.js` y `fdc-client.js` agregan `reportedNutrients`. Mantienen
  ceros numericos por compatibilidad, pero solo los ceros presentes en la
  fuente o editados explicitamente cuentan como confirmados.
- Entradas y backups previos siguen siendo legibles. Para alimentos legacy sin
  metadatos, la normalizacion conservadora considera informados los valores no
  nulos; no reescribe el historial.
- La portada Hoy muestra `Sin datos` o `parcial` para fibra cuando corresponde.
  Ya no presenta automaticamente `0 g` por ausencia de informacion.
- `nutritionAssessmentForDate()` calcula primero cobertura y confianza. Con
  cobertura insuficiente no produce score; con cobertura baja muestra rango;
  con confianza media/alta permite score orientativo.
- Cada fila explica proporcion de alimentos con dato, estimaciones, ceros
  confirmados y campos desconocidos/no informados. Una fila no evaluable no
  usa barra de meta ni lenguaje de bajo/alto.
- Recomendaciones, combinaciones y tendencias solo usan nutrientes con al menos
  55% de cobertura en el periodo. Ausencia de datos no genera una falsa
  recomendacion por supuesto deficit.
- `scripts/test-nutrition-modules.mjs` cubre los cinco estados y presentacion de
  score. `scripts/test-fdc-confidence.mjs` valida ausente frente a cero FDC.
- `tests/e2e/nutrition-today.spec.mjs` valida desconocido, cero confirmado y
  rango con cobertura baja. Resultado dirigido: 33/33 en Android Chromium,
  iPhone WebKit y escritorio.
- Regresion completa: 130 aprobadas, 14 omisiones intencionales y cero fallos.
- Assets Android sincronizados y verificados; `:app:assembleDebug` termino con
  `BUILD SUCCESSFUL`.

Estado publicable: version `2.7.0`, Android `33`, build/cache `61`
(`protocolo-0-100-pwa-2.7.0-b61`).

Pendiente siguiente: sistema central de mensajes/estados y migracion gradual
de `flash`, errores inline, offline, sincronizacion y acciones Deshacer.

## 44. Mensajes y recuperacion central

Implementado despues de `7a15e02`:

- Nuevos modulos: `ui/notifications.js`, `ui/inline-validation.js`,
  `ui/confirmation-dialog.js`, `ui/error-boundary.js` y
  `ui/recovery-view.js`.
- `flash()` permanece como API compatible, pero delega en un unico snackbar
  tokenizado. Puede mostrar tono, duracion y una accion `Deshacer`; reemplaza
  el toast anterior con colores y posicion hardcodeados.
- El banner central mantiene prioridades: offline desplaza temporalmente una
  actualizacion PWA pendiente y esta reaparece al recuperar conexion. Solo hay
  un banner visual activo y el coordinador sticky reserva su altura.
- La actualizacion del service worker usa `APP_NOTIFICATIONS.showBanner()` y
  deja de crear HTML/CSS independiente. En modo seguro no fuerza updates.
- Nutricion usa errores inline para nombre, cantidad y fecha. Cada input recibe
  `aria-invalid` y `aria-errormessage`; el error se retira al corregirlo.
- Restablecimiento selectivo y borrado total usan el dialogo interno con foco,
  Escape, cancelacion y confirmacion. Ya no dependen de `window.confirm`.
- `APP_ERROR_BOUNDARY` conserva hasta 20 metadatos de error, elimina correos y
  patrones de credenciales, captura `error`/`unhandledrejection` y protege los
  renders globales. No envia telemetria.
- La vista de recuperacion permite reintentar, reiniciar solo la interfaz,
  activar modo seguro o exportar diagnostico. No borra registros; el modo
  seguro omite FDC avanzado y actualizacion PWA automatica.
- Los cinco modulos se precachean y se incluyen en el APK.
- `tests/e2e/notifications-recovery.spec.mjs` cubre reemplazo de snackbar,
  Deshacer, validacion ARIA, prioridad offline, confirmacion, sanitizacion y
  recuperacion sin perdida. El archivo pasa 18/18 en las tres plataformas,
  incluido layout movil y retorno de foco especifico para iOS/WebKit.
- Regresion completa: 148 aprobadas, 14 omisiones intencionales y cero fallos.
- Assets Android sincronizados y verificados; `:app:assembleDebug` termino con
  `BUILD SUCCESSFUL`.

Estado publicable: version `2.7.0`, Android `33`, build/cache `62`
(`protocolo-0-100-pwa-2.7.0-b62`).

Pendiente real: migrar progresivamente los `confirm`, `prompt` y `alert`
restantes de Gym/Gym Party/FDC; agregar estados de sync mas detallados; luego
borradores y ciclo temporal. La infraestructura central ya esta operativa.

## 45. Dialogos internos y estados reales de sincronizacion

Implementado despues de `86ae508`:

- La linea base confirmada fue `main` limpio en `86ae508`, version `2.7.0`,
  Android `33` y build/cache `62`. IndexedDB seguia en modo shadow.
- `ui/form-dialog.js` agrega un formulario modal reutilizable con campos creados
  mediante DOM seguro, validacion inline, Escape, trampa de foco, retorno de
  foco y una unica accion primaria.
- `APP_CONFIRMATION.inform()` reutiliza el dialogo central para ayuda extensa.
  Gym, Gym Party, FDC, rutinas e instalacion ya no usan `window.alert`,
  `window.confirm` ni `window.prompt`. El unico `.prompt()` restante es el
  metodo estandar `BeforeInstallPrompt.prompt()` de la instalacion PWA.
- Las ediciones breves de alimento FDC, alimento personalizado, comida
  frecuente, copia de comida y ejercicio usan `APP_FORM_DIALOG`. Los borrados,
  finalizacion, exportacion, salida de sala e invitaciones usan
  `APP_CONFIRMATION`.
- `gym-party-ui.js` expone `syncState()`. La sala diferencia: guardado local,
  pendiente, sincronizando, sincronizado, conflicto resuelto, error recuperable
  y acceso requerido. Muestra ultima sincronizacion y cantidad pendiente.
- `syncNow()` guarda el estado transitorio, conserva la cola offline, permite
  reintentar errores y marca perdida de acceso sin borrar datos locales.
- El fixture E2E de Progreso muscular dejo de depender del dia anterior; usa
  hoy y siete dias atras, por lo que no se rompe al pasar de domingo a lunes.
- Linea base externa: Firestore Emulator con Java 21 paso reglas y seis
  negativas criticas; Android `:app:assembleDebug` paso con Java 17.
- Las 14 omisiones conocidas son intencionales por matriz, no funciones sin
  probar: Service Worker en iPhone WebKit (1); Inicio movil solo Pixel (2);
  dos pruebas sticky moviles solo Pixel (4); sticky escritorio solo desktop
  (2); navegacion inferior movil no desktop (1); anchos 320-430 solo Pixel
  (2); sidebar escritorio solo desktop (2). Total: 14.
- Pruebas dirigidas del bloque: 38 aprobadas, una omision intencional y cero
  fallos en Android Chromium, iPhone WebKit y escritorio. Incluyen dialogo de
  formulario, flujo Gym Party, offline y Progreso en cambio de semana.
- Regresion completa build 63: 151 aprobadas, 14 omisiones intencionales y
  cero fallos en 12.8 minutos. Pasaron ademas version, modulos, diseno, router,
  layout, Ajustes, datos, Nutricion, FDC, Progreso, service worker, Gym,
  Gym Party, seguridad Android, release Android y accesibilidad estatica.
- Assets Android verificados y APK debug recompilado despues de los cambios:
  `:app:assembleDebug` termino con `BUILD SUCCESSFUL`.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `63`
(`protocolo-0-100-pwa-2.7.0-b63`).

Pendiente siguiente exacto: crear el dominio versionado de borradores con
debounce, expiracion, descarte, restauracion segura y coordinacion temporal
mediante `visibilitychange`, `pagehide`, `BroadcastChannel` y `storage`.

## 46. Borradores persistentes y ciclo temporal

Implementado despues de `b032084`:

- `app/drafts.js` crea el dominio local versionado
  `protocolo_0_100_drafts_v1`. Guarda con debounce, limita cada borrador a
  256 KB y el conjunto a 40 elementos, vence por defecto a los 14 dias,
  purga entradas expiradas y permite descartar manualmente desde el snackbar.
- Los payloads eliminan campos de credenciales, secretos, tokens,
  `firebaseConfig`, service accounts y API keys. Los borradores son estado
  transitorio local y no se agregaron al backup exportable.
- `pagehide` y `visibilitychange` fuerzan el flush pendiente. Los cambios se
  coordinan entre pestanas con `BroadcastChannel` y fallback por evento
  `storage`; los errores de cuota muestran un banner recuperable sin borrar el
  formulario abierto.
- Hay restauracion y limpieza despues de guardado exitoso para: registro diario
  y nota; alta de alimento y alimento personalizado; serie Gym; rutina semanal;
  creacion/union de Gym Party; privacidad de la sala; y serie desde Gym Party.
  Los borradores de Gym y Gym Party amplian los `Map` en memoria existentes en
  vez de reemplazar sus APIs.
- Nutricion vuelve a abrir el flujo Agregar cuando existe un alimento pendiente
  para la fecha seleccionada. Conserva alimento, paso, porcion, unidad, comida
  y campos personalizados.
- `app/dates.js` conserva fechas elegidas manualmente, detecta paso de
  medianoche, zona horaria, regreso desde background y cambios entre pestanas.
  Solo mueve fechas automaticas; nunca cambia una fecha marcada como manual.
- `app-time-context-changed` vuelve a renderizar Inicio, Gym, Gym Party y widget
  al cambiar el contexto temporal. Las selecciones manuales sobreviven recarga
  y cierre de PWA.
- `tests/e2e/drafts-time.spec.mjs` prueba recarga/pagehide real, alimento,
  serie, rutina, formularios de sala, privacidad, expiracion, fecha manual y
  dos pestanas. Resultado dirigido: 18/18 en Android Chromium, iPhone WebKit y
  escritorio.
- `app/drafts.js` y `app/dates.js` se agregaron al precache y al sincronizador
  de assets Android. El wrapper contiene copias identicas.

- Las 20 pruebas unitarias/estructurales pasan: version, modulos, diseno,
  router, layout, Ajustes, datos, backup, Nutricion, FDC, Progreso, Gym, Gym
  Party, service worker, accesibilidad estatica, seguridad/release Android y
  sincronizacion de assets.
- Regresion E2E completa: 183 casos, 169 aprobados, 14 omisiones intencionales
  de matriz ya enumeradas en la seccion 45 y cero fallos, en 15.4 minutos.
- Firestore Emulator con Java 21 paso reglas, owner atomico, consultas sync,
  limpieza legacy y seis negativas criticas denegadas. Los mensajes
  `PERMISSION_DENIED` del log corresponden a esas pruebas negativas esperadas.
- Assets web/Android verificados y APK debug recompilado: Gradle
  `:app:assembleDebug` termino con `BUILD SUCCESSFUL` (32 tareas).

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `64`
(`protocolo-0-100-pwa-2.7.0-b64`).

Pendiente siguiente exacto despues de cerrar este bloque: recetas y platos
compuestos, porciones habituales/`Agregar igual`, parser numerico localizado y
objetivos nutricionales transparentes. No iniciar taxonomia Gym hasta cerrar
ese bloque de Nutricion con pruebas.

## 47. Recetas y porciones habituales

Implementado despues de `b3bf3d1`:

- `nutrition/recipes.js` agrega un modelo local separado para recetas y platos
  compuestos. Cada receta conserva ingredientes con `foodId`, nombre, cantidad,
  unidad, gramos y snapshot nutricional; calcula peso total, porciones,
  nutrientes totales y nutrientes por porcion.
- Las recetas se exponen al flujo existente como alimentos `recipe:<id>`. No se
  creo un segundo registro diario. Cada entrada guarda `recipeId` y
  `recipeSnapshot`, de modo que editar, archivar o eliminar una receta no cambia
  dias anteriores.
- La interfaz plegada **Recetas y platos compuestos** permite crear, editar,
  duplicar, archivar, restaurar, eliminar con Deshacer, guardar como frecuente y
  registrar una porcion o gramos. Incluye ayudas para guiso, tortilla, tarta,
  rapidita, sandwich y licuado sin inventar sus valores nutricionales.
- `nutrition/portions.js` recuerda por alimento la ultima cantidad, unidad,
  comida, fecha, frecuencia, favorito y las ultimas tres combinaciones. La
  busqueda prioriza **Agregar igual que la ultima vez**, favoritos, recientes,
  frecuentes, recetas y comidas frecuentes, sin repetir un alimento en varios
  grupos visibles.
- La comida sugerida depende del horario solo como valor inicial editable. Los
  botones de porcion rapida actualizan tanto el estado como el input visible.
- Nuevas claves locales: `protocolo_0_100_recipes_v1` (array) y
  `protocolo_0_100_food_portions_v1` (objeto por alimento). Ambas pasan por
  `NutritionRepository`, se espejan en IndexedDB shadow, participan en reset
  selectivo y se incluyen como `recipes`/`foodPortions` en backup schema 3.
  Backups anteriores siguen siendo validos.
- La precision interna de recetas evita redondear prematuramente los valores por
  100 g. El redondeo final de calorias corrige errores binarios alrededor de
  `.5`; los valores historicos existentes no se reescriben.
- `scripts/test-nutrition-modules.mjs` cubre calculo por porcion, validacion,
  snapshot historico, tres combinaciones, favoritos y persistencia. El test de
  backup verifica las dos claves nuevas.
- `tests/e2e/nutrition-recipes-portions.spec.mjs` cubre crear/registrar/editar
  receta, snapshot, backup, `Agregar igual`, porcion rapida, favoritos y recarga.
  Resultado dirigido: 9/9 en Android Chromium, iPhone WebKit y escritorio.
- `nutrition/recipes.js`, `nutrition/portions.js`, `index.html`, stores, backup,
  repositorios, service worker, estilos, validadores y sincronizador Android se
  actualizaron juntos. Las copias Android se generan con
  `scripts/sync-web-assets.ps1`.

- La validacion estructural con assets Android y los 23 contratos ejecutables
  pasaron: version, modulos, diseno, router, layout, Ajustes, datos, backup,
  Nutricion, FDC, Progreso, service worker, Gym, Gym Party, seguridad/release
  Android y accesibilidad estatica.
- Regresion E2E completa: 192 casos, 178 aprobados, 14 omisiones intencionales
  de matriz ya documentadas en la seccion 45 y cero fallos, en 17.5 minutos.
- Firestore Emulator con Java 21 paso reglas, owner atomico, consultas sync,
  limpieza legacy y seis negativas criticas denegadas. Los mensajes
  `PERMISSION_DENIED` corresponden a esas negativas esperadas.
- Assets Android verificados y APK debug recompilado con Java 17:
  `:app:assembleDebug` termino correctamente y genero `app-debug.apk`.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `65`
(`protocolo-0-100-pwa-2.7.0-b65`).

Pendiente siguiente exacto: crear `app/numbers.js` para numeros localizados y
cerrar objetivos nutricionales transparentes. Despues iniciar taxonomia muscular
granular; no mezclar esos cambios con este commit de recetas y porciones.

## 48. Numeros localizados, objetivos transparentes y alimentos propios

Implementado despues de `b73b258`:

- `app/numbers.js` es el servicio numerico comun. Acepta coma o punto decimal y
  separadores de miles (`7,5`, `7.5`, `1.000,5`, `1,000.5`), devuelve numeros
  neutrales y presenta valores con `Intl.NumberFormat("es-PY")`.
- El parser se usa en el registro diario, alimentos, recetas, agua, peso,
  objetivos, edicion FDC, registro rapido Gym, rutinas y Gym Party. Los pesos
  siguen guardandose en kg canonicos; cambiar la unidad visible no reescribe el
  historial.
- Los objetivos nutricionales ahora son explicitamente manuales. Se retiraron
  edad, sexo, altura y objetivo porque no participaban en ningun calculo. Cada
  meta guarda `value`, `source: "manual"`, `updatedAt` y
  `calculationVersion: "manual-v1"` dentro de `nutritionTargets._meta`. El
  perfil legacy se conserva para backups antiguos, pero no se presenta como
  personalizacion efectiva.
- Crear un alimento personalizado muestra solo nombre, porcion, calorias,
  proteina, carbohidratos y grasa. Fibra, sodio, micronutrientes, fuente,
  confianza y aliases quedan dentro de **Datos opcionales**.
- La creacion detecta nombres y aliases duplicados. En Ajustes, cada alimento
  propio tiene un unico menu para editar, duplicar como plantilla, archivar,
  restaurar, fusionar o eliminar. Fusionar migra el `foodId` al canonico pero
  conserva nombres, calorias y nutrientes ya registrados; fusion y borrado
  ofrecen Deshacer.
- `app/numbers.js` se carga antes de los dominios que lo usan, entra en el cache
  PWA, se sincroniza al wrapper Android y tiene prueba unitaria propia.
- `tests/e2e/nutrition-numbers-targets.spec.mjs` valida coma decimal, campos
  basicos/opcionales, duplicados, procedencia de metas, ciclo de alimentos
  propios y peso localizado en Gym Party. La regresion dirigida de Nutricion
  paso 45/45 escenarios: 15 escritorio, 15 Android Chromium y 15 iPhone
  WebKit, sin fallos.
- La regresion E2E completa de build 66 paso 204 casos: 190 aprobados, 14
  omisiones intencionales de matriz y cero fallos. Por plataforma: Android
  Chromium 66/68 con 2 skips de escritorio; iPhone WebKit 61/68 con 7 skips de
  capacidades/matriz; escritorio Chromium 63/68 con 5 skips moviles.
- Firestore Emulator con Java 21 paso owner atomico, consultas de sync,
  limpieza legacy y seis negativas criticas denegadas. Los mensajes
  `PERMISSION_DENIED` del log pertenecen a esas pruebas negativas esperadas.
- `scripts/validate-app.ps1` paso con version/cache alineados y 442 IDs
  estaticos unicos. `scripts/sync-web-assets.ps1 -Check` confirmo igualdad web
  y Android. Gradle con Java 17 termino `:app:assembleDebug` correctamente y
  genero `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk`.
- IndexedDB continua en modo shadow. No se cambiaron schemas de backup, claves
  locales, reglas Firebase ni datos historicos.

Archivos web principales del bloque: `app/numbers.js`, `index.html`,
`advanced-features.js`, `workout-features.js`, `gym-party.js`,
`nutrition/nutrition-model.js`, `nutrition/recipes.js`,
`nutrition/portions.js`, `styles/features.css`, `sw.js`, pruebas, README y
sincronizador Android. Sus copias bajo
`android-native-wrapper/app/src/main/assets/` se generan desde esas fuentes.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `66`
(`protocolo-0-100-pwa-2.7.0-b66`).

Pendiente siguiente exacto: implementar `progress/muscle-taxonomy.js` con IDs
granulares y migracion compatible de musculos primarios/secundarios. Despues,
en un bloque separado, extender tipos de serie; no abrir ambas migraciones a la
vez. IndexedDB primario, PWA atomica, quality gate unico y hardening adicional
de Gym Party/Android siguen pendientes posteriores.

## 49. Taxonomia muscular granular y mapa anatomico

Implementado despues de `7be3a5e`:

- `progress/muscle-taxonomy.js` define una taxonomia versionada con 20 IDs
  estables: `chest`, `lats`, `upper-back`, `traps`, `front-delts`,
  `side-delts`, `rear-delts`, `biceps`, `brachialis`, `triceps`, `forearms`,
  `core`, `lower-back`, `glutes`, `quads`, `hamstrings`, `adductors`,
  `abductors`, `calves` y `tibialis`. `other` queda como categoria suplementaria
  solo para datos que no pueden clasificarse sin inventar precision.
- La biblioteca oficial Gym sube a `EXERCISE_LIBRARY_VERSION = 3`. Cada
  ejercicio tiene `primaryMuscles` y `secondaryMuscles` canonicos. La migracion
  es idempotente, conserva `group`, `muscle`, aliases e IDs antiguos en campos
  `legacyPrimaryMuscles`, `legacySecondaryMuscles` y `legacyIds`, pero esos
  textos legacy no se suman a las metricas anatomicas.
- Las clasificaciones oficiales conocidas prevalecen sobre etiquetas amplias
  antiguas. Por ejemplo, Dominadas se atribuye primariamente a `lats` y Press de
  banca a `chest`; sus secundarios se conservan en una serie separada.
- `progress/gym-progress-model.js` resuelve sesiones historicas mediante el ID
  canonico del ejercicio. `progress/muscle-progress.js` cuenta cada serie una
  sola vez en su primer musculo primario. Los secundarios exponen metricas
  separadas (`secondaryCurrent`, `secondaryWeekly`, etc.) y nunca alteran los
  totales principales.
- **Progreso > Gym > Musculos** muestra frente y espalda, permite abrir los 20
  grupos incluso sin datos y conserva deep links como
  `progressScope=muscle&muscle=chest`. URLs legacy como `muscle=pecho` se
  normalizan sin perder la ruta.
- El control **Mostrar secundarios por separado** revela una estimacion
  adicional con series, grafica y ejercicios propios. La interfaz explica que
  no equivale a una medicion fisiologica exacta ni define un volumen universal
  optimo.
- El mapa ofrece puntos SVG operables con teclado y una lista de botones
  equivalente, por lo que no depende solo de color, posicion o precision tactil.
  A 320 px mantiene frente/espalda, etiquetas y navegacion sin scroll horizontal
  del documento.
- `sw.js`, el validador, el sincronizador Android y las pruebas cargan la
  taxonomia antes de cualquier consumidor. La prueba de migracion verifica que
  una etiqueta personalizada se conserva como metadata mientras la metrica usa
  el ID anatomico oficial.
- No se reescriben `workoutSessions`, backups ni registros historicos. La
  migracion afecta la representacion de la biblioteca y el calculo derivado;
  `workoutSessions` sigue siendo la fuente canonica de Gym e IndexedDB continua
  en modo shadow.

- Las pruebas unitarias de Gym y Progreso pasan, incluidos los 20 IDs,
  migracion legacy, no doble conteo y secundarios separados. La validacion
  estructural confirma cache `b67`, 443 IDs estaticos unicos y assets Android
  iguales a las fuentes web.
- La regresion E2E completa cubre 207 escenarios: 193 aprobados, 14 omisiones
  intencionales de matriz y cero fallos. Por plataforma: Android Chromium 67/69
  con 2 skips de escritorio; iPhone WebKit 62/69 con 7 skips de capacidades;
  escritorio Chromium 64/69 con 5 skips moviles.
- La primera corrida WebKit detecto que el snackbar de guardado interceptaba el
  boton **Editar serie**. `styles/components.css` ahora deja pasar los eventos
  por el mensaje y mantiene interactiva solo la accion opcional; los dos casos
  afectados pasaron dirigidos y luego dentro de la matriz WebKit completa.
- Firestore Emulator con Java 21 paso owner atomico, consultas sync, limpieza
  legacy y las negativas criticas esperadas. No se modificaron reglas ni datos
  remotos en este bloque.
- `scripts/sync-web-assets.ps1 -Check` confirma paridad web/Android. Gradle con
  Java 17 termino `:app:assembleDebug` y genero
  `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk`.

Estado del bloque: version `2.7.0`, Android `33`, build/cache `67`
(`protocolo-0-100-pwa-2.7.0-b67`).

Pendiente siguiente exacto: extender las series con `setType` (`warmup`,
`working`, `backoff`, `drop`, `technique`, `failure`, `assisted`) y exclusiones
de records/progresion, con migracion legacy a `working`. Debe hacerse como un
bloque aislado que actualice modelo local, Firebase, backups, Gym Party, widget
y pruebas. IndexedDB primario, PWA atomica, quality gate unico y hardening
adicional de Gym Party/Android permanecen como fases posteriores.

## 50. Tipos de serie y metricas efectivas

Bloque iniciado despues de `ccd1d02`:

- `gym/set-model.js` centraliza el schema versionado y los siete tipos:
  `warmup`, `working`, `backoff`, `drop`, `technique`, `failure` y `assisted`.
  Un set legacy sin `setType` se interpreta como `working` durante la lectura,
  sin reescribir ni borrar el historial existente.
- Las series nuevas guardan explicitamente `setType`, `completed`,
  `excludeFromRecords` y `excludeFromProgression`. El total visible incluye
  todos los sets completados; reps y volumen principal usan solo `working`.
  Records aceptan `working` y `backoff` validos; progresion usa `working` no
  excluidos. Calentamientos y tipos suplementarios se muestran por separado.
- Gym y Gym Party ofrecen el selector dentro de opciones secundarias para no
  agregar friccion al registro normal. Repetir ultima serie prioriza una serie
  comparable para progresion. La edicion conserva el tipo guardado.
- `workout-metrics.js`, Progreso por musculo/ejercicio y
  `gym-party-metrics.js` aplican la misma semantica. Una carga alta de
  calentamiento no crea un record ni infla volumen, e1RM o recomendacion.
- Gym Party comparte los cuatro campos nuevos, los reconcilia a
  `workoutSessions` y los conserva en su cola local. Las notas continúan
  privadas. `firebase/firestore.rules` acepta solo los siete tipos conocidos y
  mantiene compatibles los documentos anteriores donde el campo no existe.
- El widget Android guarda `working` por defecto y recalcula resumen, historial
  y ultima serie con las mismas reglas. No cambia el contrato de botones ni el
  bridge existente.
- Backups schema 3 conservan los campos nuevos dentro de `workoutSessions`; no
  se agrego una clave local paralela ni se modifico el schema general.
- `gym/set-model.js` se carga antes de metricas, entra en el cache PWA, Pages y
  assets Android. La prueba E2E `tests/e2e/gym-set-types.spec.mjs` ya paso 6/6
  casos en Android Chromium, iPhone WebKit y escritorio.

- La suite de contratos completa paso: version, service worker, modulos,
  sistema visual, router, layout, Inicio/Ajustes, repositorios/backup,
  Nutricion, FDC, Progreso, Gym, Gym Party, accesibilidad y seguridad/release
  Android. `scripts/validate-app.ps1 -CheckAndroidAssets` confirmo 443 IDs
  estaticos unicos y paridad exacta entre web y wrapper Android.
- La regresion E2E completa cubrio 213 escenarios: 199 aprobados, 14 omisiones
  intencionales de matriz y cero fallos. Por plataforma: Android Chromium 69/71
  con 2 skips de escritorio; iPhone WebKit 64/71 con 7 skips de capacidades;
  escritorio Chromium 66/71 con 5 skips moviles.
- Firestore Emulator con Java 21 paso owner atomico, consultas sync, limpieza
  legacy y seis negativas criticas. Los `PERMISSION_DENIED` del log son las
  denegaciones esperadas; tambien se rechazo un `setType` fuera de la lista.
- Gradle 8.10.2 con Java 17 termino `:app:assembleDebug` y genero
  `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk` de
  1.609.380 bytes. El codigo Java del widget compila con el nuevo contrato.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `68`
(`protocolo-0-100-pwa-2.7.0-b68`).

Pendiente siguiente exacto: implementar semantica de carga/equipo y modalidades
de ejercicios (`total`, por lado, por mano, peso corporal, carga agregada,
asistencia, tiempo y distancia) en un bloque separado. Despues construir el
motor de progresion sobre series efectivas comparables. IndexedDB primario, PWA
atomica, quality gate unico y hardening adicional de Gym Party/Android siguen
como fases posteriores; no mezclarlos con el proximo cambio de modelo Gym.

## 51. Artifact unico y verificable para GitHub Pages

Bloque iniciado despues de `0098966`:

- La inspeccion del sitio publicado reprodujo el fallo real del pipeline
  anterior: `https://locoviera24-code.github.io/protocolo-0-100/app/numbers.js`
  devolvia 404. Como consecuencia `APP_NUMBERS`, `APP_DRAFTS` y
  `WORKOUT_SET_MODEL` quedaban indefinidos y la portada registraba un error en
  `calcDay`. El codigo fuente local no era la causa; `deploy-pages.yml` no
  copiaba el directorio `app/`.
- `scripts/build-web-dist.mjs` reemplaza las listas manuales de `mkdir/cp`.
  Parte de `index.html`, `manifest.webmanifest`, `sw.js` y
  `app-version.json`, descubre scripts, estilos, iconos, shortcuts y recursos
  cacheados, conserva directorios y falla si una referencia requerida no existe.
- El constructor limpia solo `dist-pages`, copia el cierre de dependencias y
  genera `asset-manifest.json` con ruta, bytes y SHA-256 de cada recurso. El
  artifact actual contiene 61 recursos e incluye `app/numbers.js`,
  `app/drafts.js`, `app/dates.js`, todos los modulos Gym/Progreso/Nutricion y
  el stub seguro de Firebase.
- `WEB_FIREBASE_CONFIG_PATH` permite que Actions sustituya exclusivamente
  `firebase-config.js` desde un archivo temporal generado con Secrets. El
  archivo final tambien queda dentro del inventario hash; no se escribe ningun
  secret en el repositorio.
- `scripts/test-web-dist.mjs` reconstruye el artifact, compara descubrimiento e
  inventario, verifica hashes, simula una dependencia ausente, sirve los 61
  recursos y siete rutas profundas por HTTP y exige respuesta 200.
- `playwright.web-dist.config.mjs` y
  `tests/web-dist/web-dist.spec.mjs` abren Inicio, Gym, Nutricion, Progreso,
  Gym Party, Mas y Datos/copias desde `dist-pages`. Comprueban modulos globales,
  manifest, iconos, service worker, solicitudes fallidas, respuestas 4xx/5xx,
  errores de pagina y consola.
- Pages observa ahora `app/**` y los archivos del constructor/pruebas. El
  workflow general de validacion ejecuta el mismo chequeo. El workflow Pages
  instala Chromium, prueba primero el artifact con stub, genera la configuracion
  publica Firebase en un temporal y reconstruye el artifact final antes de
  subirlo.
- `scripts/serve-static.mjs` acepta una raiz explicita para probar exactamente
  `dist-pages`, no el repositorio fuente. Los validadores antiguos ya no exigen
  comandos `cp` que recreaban una segunda lista divergente.

- El test HTTP paso con el stub y con una configuracion Firebase temporal
  inyectada mediante `WEB_FIREBASE_CONFIG_PATH`. La prueba Chromium del artifact
  paso 1/1: siete rutas, 61 assets, manifest, iconos y service worker sin 404,
  solicitudes fallidas, errores de pagina ni errores de consola.
- La suite de contratos completa paso con build 69. La regresion E2E general
  cubrio 213 escenarios: 199 aprobados, 14 omisiones intencionales de matriz y
  cero fallos. Por plataforma conserva 69/71 Android Chromium, 64/71 iPhone
  WebKit y 66/71 escritorio Chromium.
- Firestore Emulator con Java 21 paso las reglas y negativas existentes. Gradle
  8.10.2 con Java 17 termino `:app:assembleDebug`; el APK debug resultante mide
  1.609.380 bytes. `scripts/sync-web-assets.ps1 -Check` y
  `validate-app.ps1 -CheckAndroidAssets` confirman paridad web/Android.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `69`
(`protocolo-0-100-pwa-2.7.0-b69`).

Pendiente siguiente exacto: cerrar en reglas y servicio Firebase la transicion
ilegal `gym_party_members.active: false -> true`, proteger `membersCount` y
usos de invitacion, y agregar negativas para miembro expulsado/inactivo,
abandono repetido y capacidad concurrente. Tipos de serie ya esta terminado en
el bloque 50; no volver a implementarlo.

## 52. Membresias Gym Party atomicas y reactivacion controlada

Bloque iniciado despues de `c2a1848`:

- `firebase/firestore.rules` ya no permite que un miembro cambie libremente
  `active`. Una salida voluntaria escribe `deactivationReason: left`; una
  expulsion escribe `removed`; el cierre del owner escribe `archived`.
- Cada alta, salida, reactivacion o expulsion cambia en la misma transaccion
  `gym_parties.membersCount`, `gym_party_invites.membersCount`, `uses` cuando
  corresponde y `membershipRevision`. `lastMembershipMutation` identifica
  `userId`, actor, operacion, invitacion y fecha para que Rules pueda validar el
  miembro exacto.
- `id`, `partyId`, `userId`, `role` e `inviteCode` siguen inmutables. El owner
  tampoco puede editar arbitrariamente `membersCount` o `uses`.
- Solo una membresia que salio voluntariamente puede reactivarse con su misma
  invitacion todavia vigente. Un expulsado y un documento legacy inactivo sin
  motivo no pueden auto-reactivarse. Un miembro inactivo tampoco puede leer
  sesiones ni series de la sala.
- `gym-party.js` usa la invitacion como documento de acceso para el alta, sin
  exponer el documento privado de la sala al usuario que aun no es miembro.
  La revision se espeja en la invitacion; las reglas comparan internamente la
  sala, invitacion y membresia. El cliente detecta contadores incompatibles y
  conserva todos los entrenamientos locales ante el error.
- `firebase/rules.test.mjs` separa escenarios y cubre reingreso voluntario,
  salida repetida, expulsion, lectura inactiva, documento legacy, invitacion de
  un uso, reutilizacion, campos prohibidos y dos altas concurrentes en el ultimo
  cupo. Tambien conserva las pruebas de sesiones, sets y payloads legacy.
- `firebase/schema.md`, `firebase/README.md`, `README.md`, el validador y las
  pruebas Gym Party documentan el contrato nuevo. Los assets web y Android
  contienen el mismo `gym-party.js`.

Pruebas finales del bloque:

- Suite de contratos completa correcta: version, service worker, modulos,
  diseno, router, layout, Ajustes, datos, Progreso, Nutricion, Gym, Gym Party,
  accesibilidad y seguridad Android. Paridad web/Android confirmada.
- Artifact web build 70: 61 recursos con hash y siete rutas profundas; la
  prueba Chromium paso 1/1 sin 404, errores de pagina o consola.
- E2E completa ejecutada por plataforma para evitar el timeout del comando
  agregado: Android Chromium 69/71 con 2 skips, iPhone WebKit 64/71 con 7
  skips y escritorio Chromium 66/71 con 5 skips. Total: 199 aprobadas, 14
  omisiones intencionales y cero fallos.
- El workflow remoto previo de `c2a1848` habia tenido un unico fallo transitorio
  en `progress.spec.mjs` sobre iPhone WebKit (198 aprobadas). En el estado
  actual esa plataforma paso completa y el archivo de Progreso paso ademas
  cinco repeticiones seguidas: 15/15.
- Firestore Emulator con Java 21 correcto. Las denegaciones
  `PERMISSION_DENIED` del log corresponden a las negativas deliberadas.
- Las mismas reglas se publicaron en Firebase produccion `a-100-9d80a` el 13
  de julio de 2026. La consola mostro la nueva revision activa y ningun cambio
  sin publicar. No se creo una sala artificial en produccion para no dejar
  datos de prueba; la prueba final con dos dispositivos reales sigue pendiente.
- Gradle 8.10.2 con Java 17 termino `:app:assembleDebug`; el APK debug mide
  1.662.763 bytes y contiene el mismo `gym-party.js` del build web.

Estado publicable del bloque: version `2.7.0`, Android `33`, build/cache `70`
(`protocolo-0-100-pwa-2.7.0-b70`).

Pendiente siguiente exacto: implementar semantica de carga y equipo
(`total`, por mano, por lado, peso corporal, lastre y asistencia) junto con las
modalidades por repeticiones, tiempo y distancia. No volver a abrir tipos de
serie, artifact Pages ni este contrato de membresias salvo que una regresion
demuestre un fallo real.
