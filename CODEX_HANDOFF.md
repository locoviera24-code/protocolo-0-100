# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion: 2026-07-30
Rama esperada: `codex/android-quick-access-v1`
Version actual: `2.7.0` (fuente unica: `app-version.json`)
Android: `versionCode 37`, `versionName "2.7.0"`
Service worker cache: `protocolo-0-100-pwa-2.7.0-b93`
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
- PWA offline con cache derivada `protocolo-0-100-pwa-2.7.0-b90` y
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
- `sw.js`: cache derivada del build 89, actualización atómica consentida y sin mezcla de assets; evita
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

## 53. Carga, equipo y modalidades canonicas de Gym

Bloque iniciado despues de `e0695b9` y cerrado sobre build 71:

- `gym/equipment.js` es el modelo canonico versionado para carga `total`,
  `perHand`, `perSide`, `bodyweight`, `addedLoad` y `assistance`; modalidades
  `reps`, `time`, `distance` y `assistance`; y lateralidad bilateral,
  izquierda, derecha o alternada. Los datos legacy sin estos campos se leen
  como repeticiones con carga total y no se reescriben masivamente.
- Las sesiones guardan kg canonicos y conservan valor/unidad originales,
  carga total normalizada, barra, asistencia positiva, equipo, gimnasio,
  incremento, lateralidad, duracion, distancia y ritmo derivado. La asistencia
  nunca usa peso negativo. `equipmentProfiles` se incluye en repositorios y
  backups schema 3 sin eliminar claves anteriores.
- El registro rapido de Gym y el registro directo de Gym Party permiten elegir
  modalidad, modo de carga, equipo, barra y lateralidad dentro de opciones
  secundarias. Plancha, caminata, bicicleta y estiramiento suave amplian la
  biblioteca v4 sin sobrescribir bibliotecas personalizadas.
- `workout-metrics.js` deriva volumen externo con `normalizedTotalKg`, separa
  lastre, peso corporal y asistencia, y suma tiempo/distancia con metricas
  propias. No calcula e1RM para tiempo, distancia, asistencia ni peso corporal
  sin una carga comparable.
- Progreso por ejercicio solo compara el contexto activo con igual
  `exerciseId`, modalidad, modo de carga, equipo, gimnasio y lateralidad. Barra,
  Smith, maquina y carga por mano no se mezclan. La vista y los records se
  adaptan a duracion, distancia y menor asistencia.
- Gym Party comparte en Firestore solo los datos de entrada minimos:
  `weightKg`, `barWeightKg`, `assistanceKg`, modalidad, modo de carga, equipo,
  lateralidad, duracion y distancia. Carga total, volumen y ritmo se derivan en
  cada cliente para evitar redundancia. Reconciliacion, tombstones y privacidad
  siguen funcionando; ocultar pesos tambien oculta barra y asistencia.
- `firebase/firestore.rules` limita los enums nuevos y mantiene documentos
  legacy validos. El primer intento de validar demasiados campos derivados
  supero el presupuesto de expresiones de Rules; el contrato se redujo al
  payload minimo y Firestore Emulator paso despues todas las pruebas positivas
  y negativas.
- `sw.js`, Pages, workflows, validador y `scripts/sync-web-assets.ps1` incluyen
  `gym/equipment.js`. Los assets Android contienen el mismo archivo y contrato.

Pruebas finales del bloque:

- contratos de equipo, metricas, Workout Features, musculos, ejercicios,
  Gym Party, sync incremental, limites modulares, version y datos: correctos;
- `validate-app.ps1 -CheckAndroidAssets`: correcto, cache build 71, 443 IDs
  estaticos unicos y paridad exacta entre web y Android;
- artifact Pages: 62 recursos con hash; `test-web-dist` y la prueba Chromium
  servida pasaron sin 404, solicitudes fallidas, errores de pagina o consola;
- Firestore Emulator con Java 21: correcto, incluidas modalidades validas,
  rechazo de enums desconocidos y todas las negativas de membresias. Los
  `PERMISSION_DENIED` del log pertenecen a negativas deliberadas;
- matriz E2E afectada en Android Chromium, iPhone WebKit y escritorio Chromium:
  53 aprobadas y una omision esperada del service worker en WebKit. Cubre
  borradores, Gym, tipos de serie, Gym Party, numeros nutricionales y Progreso;
- la primera matriz Android completa del bloque tuvo tres fallos dependientes
  de ejecutar en sabado de descanso. Se hicieron deterministas las fechas de
  prueba y los tres escenarios pasaron al reejecutarse. No se presenta como
  aprobada una suite iPhone completa: el intento anterior excedio el tiempo;
- Gradle 8.10.2 con Java 21 termino `:app:assembleDebug`. El APK debug actual
  mide 1.617.131 bytes, `versionCode 33`, `versionName 2.7.0-debug` y contiene
  los mismos assets del build web.

Las reglas nuevas se publicaron en Firebase produccion `a-100-9d80a` el 18 de
julio de 2026 despues de pasar Emulator. El CLI local no tenia sesion, por lo
que se uso la consola autenticada: la revision activa muestra `Hoy - 8:07 p.m.`
y no quedan cambios sin publicar. Produccion ya acepta modalidad, equipo,
barra, asistencia, duracion y distancia sin debilitar el contrato anterior.

Estado publicable del codigo: version `2.7.0`, Android `33`, build/cache `71`
(`protocolo-0-100-pwa-2.7.0-b71`), con reglas Firestore compatibles activas.

Pendiente siguiente exacto: construir el motor de progresion sobre series
efectivas comparables y prescripciones por ejercicio. Luego continuar con
anomalias/records, clasificacion muscular ambigua, IndexedDB primario, PWA
atomica y quality gate unico. No volver a implementar tipos de serie, artifact
Pages, membresias atomicas ni este modelo de equipo.

## 54. Motor de progresion explicable por ejercicio

Bloque iniciado sobre `914e58d` y preparado como build 72:

- `gym/progression-engine.js` concentra una API pura y versionada para
  `doubleProgression`, `loadProgression`, `repProgression`,
  `timeProgression`, `distanceProgression`, `assistanceReduction` y
  `maintainTechnique`. Ordena el historial, exige al menos dos sesiones y
  devuelve recomendacion, motivo, confianza, sesiones comparadas, datos usados,
  sugerencia concreta y bloqueos.
- Las comparaciones usan el mismo `exerciseId`, modalidad, semantica de carga,
  equipo, gimnasio y lateralidad. Solo cuentan series elegibles para progresion;
  calentamientos, series excluidas o incompletas no alimentan la recomendacion.
  Dolor/molestia, anomalias, caida marcada de RIR/RPE, bajada de rendimiento o
  cambio de contexto bloquean un aumento de carga.
- La doble progresion solo propone el incremento minimo cuando dos sesiones
  comparables completaron todas las series en el limite superior y dentro del
  RIR objetivo. Tiempo, distancia y asistencia usan magnitudes propias y nunca
  pasan por e1RM.
- La rutina semanal permite definir por ejercicio series, rango de reps, RIR,
  metodo e incremento minimo dentro de un bloque secundario `Progresion`. Los
  dias predeterminados incluyen valores conservadores, pero las rutinas ya
  guardadas se respetan y reciben valores de lectura por defecto sin una
  reescritura masiva.
- `progress/exercise-progress.js` delega en el motor y mantiene el heuristico
  anterior solo como fallback compatible. `progress/progress-view.js` muestra
  confianza, fechas comparadas, prescripcion y carga/reps/tiempo/distancia
  orientativos. Las sugerencias siguen identificadas como orientativas.
- `index.html`, `sw.js`, workflows, validador y sincronizacion Android incluyen
  el nuevo modulo. `scripts/test-progression-engine.mjs` cubre orden temporal,
  RIR ausente, dolor, cambio de equipo, series de calentamiento y todos los
  metodos de progresion principales.

Pruebas ejecutadas hasta este punto:

- motor de progresion, metricas de Gym, Workout Features y Progreso completo:
  correctos;
- `validate-app.ps1 -CheckAndroidAssets`: correcto, con paridad exacta entre
  web y Android, cache build 72 y 444 IDs estaticos unicos;
- fuente unica de version: `2.7.0`, Android 33 y build/cache 72 alineados;
- artifact web build 72: 63 recursos con hash; validacion estatica y prueba
  Chromium servida pasaron sin 404, errores de pagina o consola;
- E2E afectada de Gym y Progreso: 20 aprobadas en Android Chromium, iPhone
  WebKit y escritorio Chromium. La unica omision es la prueba de service worker
  en WebKit, no soportada por ese proyecto de Playwright;
- Gradle 8.10.2 con Java 21 termino `:app:assembleDebug`. El APK debug mide
  1.618.064 bytes, y el contrato de release/checksum tambien paso.

Estado publicable del bloque: `2.7.0`, Android `33`, build/cache `72`
(`protocolo-0-100-pwa-2.7.0-b72`). No se modificaron reglas Firestore ni schema
de backups en este bloque; Firebase, Gym Party, widget y datos legacy conservan
sus contratos existentes.

Pendiente siguiente exacto despues de cerrar estas pruebas: deteccion y
confirmacion de registros anomalos sin borrar datos, seguida por clasificacion
muscular ambigua de ejercicios personalizados. IndexedDB primario, PWA atomica
y quality gate unico continúan pendientes posteriores.

## 55. Revision conservadora de registros inusuales

Bloque iniciado despues de `4715322` y preparado como build 73:

- `gym/anomaly-detector.js` es un detector puro versionado. Evalua saltos de
  carga y volumen frente al propio historial comparable, reps/duracion/distancia
  improbables, una relacion compatible con confusion kg/lb y cambios de
  interpretacion entre total, por mano/lado, lastre y asistencia. No diagnostica
  ni borra valores y evita marcar calentamientos como records.
- `saveQuickSetPayload` y `updateQuickSetPayload` devuelven
  `confirmation-required` antes de persistir una serie sospechosa. El contrato
  se aplica tanto al registro Gym como al registro directo de Gym Party; una UI
  no puede eludirlo llamando al API local sin indicar una decision valida.
- `APP_CONFIRMATION.choose()` extiende el dialogo accesible existente sin usar
  `confirm` nativo. Las opciones son confirmar y contar, guardar sin record,
  guardar fuera de record/progresion o volver a editar. El foco regresa al
  control previo y Escape/cancelar no persisten la serie.
- Cada revision guarda un `anomalyReview` pequeno con version, decision, estado,
  severidad, codigos, fecha y firma tecnica. No contiene notas, emails,
  credenciales ni configuracion Firebase. `excludeFromRecords` y
  `excludeFromProgression` siguen siendo la fuente de elegibilidad para
  metricas, records, recomendaciones y Gym Party.
- Una serie sospechosa recibida desde el widget Android no se pierde: se marca
  `pending`, se conserva y queda temporalmente fuera de record/progresion. Al
  editarla en la app se exige confirmar, excluir o corregir. Una mutacion nativa
  ya conocida y sin cambios no se vuelve a marcar.
- **Progreso > Gym > Records** incluye `progressSuspiciousList`, una lista
  secundaria de registros revisados/pendientes. Los records principales se
  siguen derivando solo de series elegibles y no dependen de una clave mutable.
- `scripts/test-workout-anomalies.mjs`, Workout Features y Playwright cubren
  detector, decisiones, exclusiones, importacion nativa, persistencia, cancelar,
  lista de Progreso y el flujo directo de Gym Party.

Pruebas finales del bloque:

- detector puro, Workout Features, metricas, Progreso, Gym Party, limites
  modulares y fuente unica de version: correctos;
- `validate-app.ps1 -CheckAndroidAssets`: correcto, con paridad web/Android,
  cache build 73 y 446 IDs estaticos unicos;
- artifact web build 73: 64 recursos con hash; validacion estatica y prueba
  Chromium servida pasaron sin 404, errores de pagina o consola;
- E2E de anomalias, tipos de serie y mensajes/recuperacion: 36/36 aprobadas en
  Android Chromium, iPhone WebKit y escritorio Chromium. Cubre Gym, Gym Party,
  cancelar, tres decisiones, lista de Progreso y regresion del dialogo binario;
- Gradle 8.10.2 con Java 21 termino `:app:assembleDebug`. El APK debug mide
  1.620.287 bytes y contiene los mismos assets del build web.

Estado publicable del bloque: `2.7.0`, Android `33`, build/cache `73`
(`protocolo-0-100-pwa-2.7.0-b73`). No se modificaron Firestore Rules: Gym Party
comparte las exclusiones ya admitidas y mantiene el contrato remoto anterior.

Pendiente siguiente exacto: clasificacion muscular ambigua de ejercicios
personalizados con fuente/confianza y una cola `needs-review`, sin inventar que
`hombro` significa deltoides anterior ni que `pierna` significa cuadriceps.
Luego continuan IndexedDB primario, PWA atomica, quality gate unico y la
simplificacion adicional de Nutricion/busqueda externa.

## 56. Clasificacion muscular revisable para ejercicios personalizados

Bloque iniciado despues de `ee60f16` y preparado como build 74:

- `progress/muscle-taxonomy.js` sube su contrato a version 2. Los veinte IDs
  anatomicos se conservan, pero `hombro`, `espalda` y `pierna` dejan de ser
  aliases de un musculo especifico. Los ejercicios oficiales siguen usando su
  mapa estable por `exerciseId`; un ejercicio personalizado ambiguo se resuelve
  como `other` y `needs-review` en vez de inventar precision.
- La clasificacion de biblioteca guarda `primaryMuscles`,
  `secondaryMuscles`, `muscleClassificationSource`,
  `muscleClassificationConfidence` (`official`, `confirmed`, `inferred` o
  `needs-review`) y la version de taxonomia. Los secundarios siguen separados
  y no se suman al total principal.
- `workout-features.js` migra la biblioteca a version 5 de forma idempotente.
  Los ejercicios oficiales no se pueden reclasificar. Confirmar un ejercicio
  personalizado actualiza la biblioteca y las rutinas futuras; no reescribe
  `workoutSessions`, rutinas historicas ni backups anteriores.
- **Gym > Rutina > Biblioteca de ejercicios** muestra el numero de
  clasificaciones pendientes, permite filtrar la cola y abre un formulario con
  seleccion multiple de musculos principales y secundarios. La creacion de un
  ejercicio personalizado ofrece el mismo selector dentro de una seccion
  secundaria; dejarlo vacio crea una revision pendiente segura.
- `ui/form-dialog.js` admite grupos de checkboxes accesibles, con validacion
  inline y retorno de foco. `styles/components.css` y `styles/gym.css` agregan
  los estados y layouts responsivos usando tokens existentes.
- `progress/gym-progress-model.js` expone fuente, confianza y estado de revision
  por fila. Un registro ambiguo queda visible bajo **Otro / sin clasificar** y
  no contamina deltoides, espalda alta o cuadriceps.
- `scripts/test-muscle-progress.mjs`, `scripts/test-workout-features.mjs` y
  `tests/e2e/gym-flow.spec.mjs` cubren aliases ambiguos, ejercicios oficiales,
  multiples musculos, cola pendiente, persistencia tras recarga y la garantia
  de no reescribir sesiones historicas.

Pruebas ejecutadas hasta este punto:

- diseno, accesibilidad estatica, Inicio/Ajustes, datos, backups, Workout
  Features, metricas, equipo, progresion, anomalias, Progreso, Gym Party, sync,
  service worker y limites modulares: correctos;
- flujo de clasificacion: 3/3 aprobado en Android Chromium, iPhone WebKit y
  escritorio Chromium;
- el primer gate de version se detuvo como estaba previsto porque este handoff
  aun no mencionaba el build 74. Esta seccion corrige esa desalineacion antes
  de repetir el gate; no fue un fallo funcional;
- matriz E2E afectada de Gym, Progreso y mensajes/formularios: 41 aprobadas y
  una omision esperada del service worker en WebKit. Chromium cubrio instalacion
  y offline; WebKit cubrio la interfaz iPhone y el formulario multiseleccion;
- artifact web build 74: 64 recursos con hash, rutas profundas, modulos y
  service worker servidos sin 404 ni errores de consola;
- `validate-app.ps1 -CheckAndroidAssets`: correcto, con cache build 74, 446 IDs
  estaticos unicos y paridad exacta entre web y Android;
- seguridad WebView y contrato Android release: correctos;
- Gradle 8.10.2 con Java 21 termino `:app:assembleDebug`. El APK debug mide
  1.623.071 bytes y contiene los mismos assets del artifact web.

Estado del bloque: version `2.7.0`, Android `33`, build/cache `74`
(`protocolo-0-100-pwa-2.7.0-b74`). No se modificaron Firestore Rules ni el
schema de backups; Firebase, Gym Party, widget y datos legacy conservan sus
contratos existentes.

Pendiente siguiente despues de cerrar este bloque: promover IndexedDB por
dominio desde `shadow` con comparacion y rollback. Despues siguen PWA atomica,
quality gate unico y la simplificacion adicional de Nutricion con busqueda
externa abstraida. No volver a crear la taxonomia granular ni esta cola de
clasificacion.

## 57. Semantica de clasificacion y snapshots historicos

Bloque iniciado sobre `6b3a0a0` y preparado como build 75:

- La regresion completa previa del build 74 quedo en verde antes de editar:
  contratos y modulos correctos; artifact de 64 recursos sin 404; Playwright
  completo con 214 aprobadas, 14 omisiones condicionadas por plataforma y cero
  fallos; Firestore Emulator correcto; `:app:assembleDebug` correcto.
- `progress/muscle-taxonomy.js` sube a taxonomia 3 y separa los tres ejes que el
  build 74 mezclaba: `classificationStatus` (`official`, `confirmed`,
  `inferred`, `needs-review`), `classificationSource` y
  `classificationConfidence` (`high`, `medium`, `low`, `unknown`). Los campos
  legacy del build 74 siguen siendo legibles mediante adaptadores y no se hace
  una reescritura masiva.
- Cada ejercicio de una sesion nueva guarda `muscleClassificationSnapshot` con
  version, primarios, secundarios, estado, fuente, confianza y fecha de captura.
  Cambiar la biblioteca solo afecta sesiones futuras. Progreso usa primero el
  snapshot; los registros legacy sin snapshot se marcan
  `classificationDerived: true` y confianza baja/desconocida.
- **Gym > Rutina > Biblioteca > Clasificacion de sesiones antiguas** permite
  revisar cuantas sesiones legacy serian afectadas. Aplicar exige confirmacion,
  crea recovery snapshot mediante `APP_DATA.replaceMany` y ofrece Deshacer. La
  vista previa no modifica series, cargas, reps ni sesiones.
- Los ejercicios con varios musculos primarios aparecen en cada grupo declarado,
  pero una serie se cuenta una sola vez en el total general. `other` se conserva
  como no clasificado y ya no entra en el total anatomico; se informa por
  `unclassifiedSets`.
- El estado enviado al widget incluye el snapshot. El fallback nativo de
  `WorkoutWidgetUpdateService.java` agrega la clasificacion oficial a la rutina
  predeterminada, de modo que una sesion creada directamente desde el widget
  tambien conserva el contrato historico.
- Backups schema 3 preservan el snapshot sin cambiar schema ni perder
  compatibilidad. No se modificaron Firestore Rules, payloads privados ni datos
  de Gym Party.

Pruebas del bloque ejecutadas hasta este punto:

- modelos de taxonomia, Progreso muscular, Workout Features, backup y contrato
  Android: correctos;
- E2E afectada `gym-flow.spec.mjs`: 11 aprobadas y una omision esperada del
  service worker en WebKit; Android Chromium, iPhone WebKit y escritorio
  validaron clasificacion, recarga, Gym Party, registro, edicion y offline.
- artifact web build 75: 64 recursos con hash; rutas profundas, modulos y
  service worker cargaron sin 404, errores de pagina ni consola;
- `validate-app.ps1 -CheckAndroidAssets`: correcto, cache build 75, 446 IDs
  estaticos unicos y paridad exacta web/Android;
- Gradle 8.10.2 con Java 21 ejecuto un build limpio `:app:assembleDebug`. El APK
  debug mide 1.593.298 bytes y su SHA-256 es
  `D3D08078ED4233537BF7D81E4E8A061A72058F7C7F82DEE41DEEF4BF7734D20C`.

Estado preparado: version `2.7.0`, Android `33`, build/cache `75`
(`protocolo-0-100-pwa-2.7.0-b75`). La siguiente fase estructural exacta es crear
`data/schema-registry.js`, incluir `equipmentProfiles` en el dominio Workout y
derivar de ese registro IndexedDB, repositorios, backups, reset y diagnosticos
antes de promover ningun dominio desde `shadow`.

## 58. Registro unico de claves y schemas

Bloque iniciado sobre `07ec4ee` y preparado como build 76:

- `data/schema-registry.js` es la fuente unica para las 53 claves persistidas
  conocidas. Cada registro declara nombre, dominio, schema, valor inicial,
  validador, migracion, backup, campo y aliases de backup, sensibilidad, modo de
  almacenamiento, espejo, grupo de reset, retencion, serializacion, redaccion y
  claves legacy.
- `equipmentProfiles` pertenece ahora de forma verificable al dominio Workout y
  entra en el espejo IndexedDB y en backups. Recetas y porciones pertenecen a
  Nutricion. Las caches FDC declaran LRU/TTL; la configuracion FDC es sensible,
  queda solo en localStorage y no se exporta ni se copia a IndexedDB.
- `data/indexeddb.js`, `data/repositories.js` y `data/backup-service.js` derivan
  sus claves y campos del registro. Una escritura a una clave no registrada
  falla de forma explicita. Diagnosticos informa claves locales desconocidas.
  IndexedDB continua en `shadow`: este bloque no promovio ningun dominio ni
  borro claves legacy.
- Exportacion e importacion ya no tienen una ruta manual parcial. Ambas pasan
  por `BACKUP_SERVICE`; si el servicio no esta disponible, la operacion se
  rechaza sin modificar datos. La configuracion Firebase de Gym Party se
  redacta al exportar.
- Los resets selectivos derivan su alcance de `resetGroup`. Progreso obtiene las
  claves de Workout y Nutricion mediante el registro/repositorio y no lee
  `localStorage` directamente.
- `scripts/test-schema-registry.mjs` recorre automaticamente todo el codigo web
  fuente, comprueba que cada clave referenciada este registrada, valida
  unicidad, dominios, backups, sensibilidad, retencion y paridad contractual
  web/Android. `test:data` incluye esta auditoria.

Pruebas del bloque ejecutadas:

- registro de schemas, capa de datos, backup/importacion, Nutricion, FDC,
  Progreso, Workout Features, metricas, modulos, diseno y validacion estatica:
  correctos;
- E2E dirigida de backup, Ajustes, Gym y Nutricion en Android Chromium, iPhone
  WebKit y escritorio Chromium: 38 aprobadas y 3 omisiones condicionadas por
  plataforma. Un primer intento de Nutricion en escritorio perdio el contexto
  durante una navegacion; el caso aislado se repitio y aprobo, por lo que queda
  registrado como intermitencia de Playwright, no como fallo reproducible;
- artifact web build 76: 65 recursos con inventario y hashes, al incorporar
  `data/schema-registry.js`; la prueba servida abrio rutas profundas, modulos y
  service worker sin 404, errores de pagina ni consola;
- `validate-app.ps1 -CheckAndroidAssets` confirmo cache build 76, 446 IDs
  estaticos unicos y paridad exacta web/Android;
- Gradle 8.10.2 con Java 17 ejecuto un build limpio `:app:assembleDebug`. El APK
  debug mide 1.594.852 bytes y su SHA-256 es
  `F2032EFD22587EC1E755427C7320F8F6127CA6E1BCEADD7FC9F59C23F63F3326`.

Estado preparado: version `2.7.0`, Android `33`, build/cache `76`
(`protocolo-0-100-pwa-2.7.0-b76`). El siguiente bloque exacto es crear
validacion estructurada y cuarentena antes de promover Nutricion desde
IndexedDB `shadow` a lectura primaria. No iniciar a la vez la promocion de
Workout.

## 59. Integridad estructurada y cuarentena recuperable

Bloque iniciado despues de `4ad50bc` y preparado como build 77:

- `APP_SCHEMA_REGISTRY.validate()` devuelve `missing`, `valid`, `legacy`,
  `corrupt` o `unsupported`. Los registros con version propia declaran
  `versionField`; `protocolo_0_100_state_v2` acepta schema 2 como legacy,
  trabaja con schema 3 y rechaza versiones futuras.
- Los validadores de sesiones, biblioteca, perfiles de equipo, alimentos,
  recetas, comidas guardadas y datos compartidos exigen listas de objetos. Los
  borradores validan su contenedor versionado y la fecha inicial exige formato
  ISO. Las escrituras y `replaceMany` validan antes de tocar localStorage.
- `data/indexeddb.js` sube su base interna a version 2 y crea el store
  `quarantine`. `readResult`/`readIndexedResult` exponen el estado real. La API
  compatible `read` conserva el fallback para las vistas actuales, pero una
  corrupcion ya no es silenciosa: primero se copia el raw a cuarentena, luego
  se retira de la clave activa y se emite un estado visible.
- La cuarentena guarda clave, dominio, error, schema, fechas y ocurrencias. No
  guarda credenciales: claves marcadas sensibles se redactan; un JSON ilegible
  con redaccion Firebase tampoco conserva raw. Incluye APIs para listar,
  exportar, reparar/restaurar y eliminar.
- **Mas > Datos y copias** muestra solo cuando hace falta la tarjeta **Datos que
  necesitan revision**. Permite exportar una o todas las copias, editar el JSON
  en un dialogo accesible con validacion inline, restaurar solo contenido valido
  o eliminar la copia con confirmacion.
- La migracion shadow sube su contrato interno a version 2, omite claves
  corruptas y marca el dominio `review-needed`; nunca copia corrupcion hacia la
  futura fuente primaria. Claves desconocidas se conservan intactas y aparecen
  en diagnosticos.
- `data/backup-service.js` valida cada area mediante el registro antes de mostrar
  preview o aplicar. Un array mal formado o un perfil de equipo incompatible se
  rechaza sin crear una escritura parcial.
- Se corrigio `ui/form-dialog.js`: un campo multilinea ya no intenta asignar la
  propiedad de solo lectura `type` de `HTMLTextAreaElement`.

Pruebas del bloque:

- `test:data`, Nutricion, Workout Features, Gym Party, modulos y validacion
  estatica: correctos;
- E2E de cuarentena y redaccion: 6/6 aprobadas en Android Chromium, iPhone
  WebKit y escritorio Chromium. Cubre copia del raw, retiro seguro de la clave,
  UI, reparacion/restauracion y exclusion de un secreto FDC ilegible;
- regresion E2E de preview, importacion, rollback y reset selectivo: 9/9
  aprobadas en los tres motores;
- el primer intento de reparacion encontro el defecto real del textarea; tras
  corregir el componente, la matriz completa aprobo.

Estado preparado: version `2.7.0`, Android `33`, build/cache `77`
(`protocolo-0-100-pwa-2.7.0-b77`). El artifact contiene 65 recursos con hash y
su prueba servida paso sin 404, errores de pagina ni consola. La validacion de
assets confirmo 450 IDs unicos y paridad web/Android. Gradle 8.10.2 con Java 17
completo `clean assembleDebug`; el APK mide 1.599.154 bytes y su SHA-256 es
`2C0531B0CAE055C2D304B1A511902A28921EA92964C906F48BE0E5C4E5B07BA3`.

Siguiente fase exacta: promocion controlada de **NutritionRepository** desde
shadow a lectura primaria con feature flag, comparacion, divergencia visible y
rollback; no promover Workout en el mismo commit.

## 60. NutritionRepository como fuente primaria controlada

Bloque iniciado despues de `3b2019a` y preparado como build 78:

- `data/schema-registry.js` declara `primaryEligible` como parte del contrato
  persistido. Solo las claves duraderas, espejables y no legacy pueden ser
  candidatas a lectura primaria. Las caches FDC y de busqueda, que tienen TTL,
  quedan expresamente fuera de esta promocion.
- `data/indexeddb.js` promociona exclusivamente el dominio `nutrition` mediante
  `primaryDomains.nutrition`. Workout, Gym Party y Protocol permanecen en
  `shadow`; no se abrio una segunda migracion estructural.
- Al iniciar, Nutricion hidrata sus claves desde IndexedDB despues de validar
  ambos lados. Una escritura local pendiente prevalece como write-ahead y se
  reconcilia hacia IndexedDB. Si falta la copia compatible, se recupera desde
  IndexedDB. Los checksums, divergencias y recuperaciones quedan en metadatos.
- `localStorage` no se borra: sigue como copia compatible y permite rollback
  inmediato. Escrituras, borrados, importaciones, restauraciones, cuarentena y
  resets actualizan de forma coordinada la cache primaria y el espejo.
- `BroadcastChannel` y el evento `storage` actualizan otras pestanas. Al activar
  lectura primaria se solicita almacenamiento persistente cuando el navegador
  lo soporta, sin bloquear si la plataforma lo rechaza.
- **Mas > Datos y copias** muestra el modo real, diferencias reconciliadas y
  recuperaciones. Permite volver a lectura `localStorage`, reactivar IndexedDB
  y comprobar nuevamente sin eliminar ninguna copia.
- `tests/e2e/indexeddb-primary.spec.mjs` cubre promocion, exclusion de caches,
  divergencia local, rollback, recuperacion, coordinacion entre dos pestanas y
  controles visibles. La matriz completa paso 15/15 en Android Chromium,
  iPhone WebKit y escritorio Chromium.
- La regresion funcional de `nutrition-domain.spec.mjs` y
  `nutrition-recipes-portions.spec.mjs` paso 12/12 en las mismas tres
  plataformas con la lectura primaria activa. `test:data`, `test:nutrition` y
  `test:modules` tambien aprobaron antes de preparar los artefactos.
- La matriz final conjunta paso 27/27 sin omisiones en Android Chromium, iPhone
  WebKit y escritorio Chromium. `test:fdc` confirmo que la cache externa sigue
  distinguiendo nutrientes ausentes de ceros confirmados.
- El artifact web contiene 65 recursos con inventario y hashes. La prueba
  servida abrio rutas profundas, modulos y service worker sin 404, errores de
  pagina ni consola. La validacion encontro 453 IDs estaticos unicos y confirmo
  paridad exacta entre assets web y Android.
- Gradle 8.10.2 con Java 17 completo `clean assembleDebug`. El APK debug mide
  1.601.985 bytes y su SHA-256 es
  `6E2E5C4BECBDB5F44CDA2E2913E09D5FFD8D389E23A3ABBAA87256F30C3A15DA`.

Estado preparado: version `2.7.0`, Android `33`, build/cache `78`
(`protocolo-0-100-pwa-2.7.0-b78`). No se promovieron caches FDC ni otros
dominios. La siguiente fase debe ser un bloque aislado: simplificar la busqueda
nutricional mediante un servicio unificado y proveedor externo opcional, o
hacer atomica la PWA; no promover Workout en paralelo con ninguna de ellas.

## 61. Busqueda nutricional unificada y parsimoniosa

Bloque iniciado despues de `7f43125` y preparado como build 79:

- `nutrition/food-search-service.js` concentra la busqueda cotidiana. Primero
  ordena alimentos incluidos, personales, recetas, favoritos, recientes,
  frecuentes y guardados; una coincidencia exacta o un alias de alta confianza
  no genera trafico externo.
- Cuando la coincidencia interna es debil, ambigua o inexistente, el servicio
  consulta automaticamente el proveedor disponible. Usa debounce de 400 ms,
  `AbortController`, timeout, limite de resultados, deduplicacion y descarte de
  respuestas obsoletas. Una consulta de menos de tres caracteres nunca sale
  del dispositivo.
- `nutrition/food-provider.js` define `NutritionExternalProvider` con
  `isAvailable`, `health`, `search`, `getFood` y `normalize`. El adaptador actual
  conserva compatibilidad con `FDC_CLIENT`; la vista no conoce ni muestra el
  proveedor que respondio.
- La pantalla **Registrar alimento** tiene un buscador grande, voz integrada,
  una sola lista y la accion secundaria **No encuentro este alimento**. No
  muestra bases de datos, USDA, FDC, endpoints, API keys, cache, paginacion ni
  una accion manual de importar.
- Buscar `200 g de pollo` puede preseleccionar cantidad y unidad. Seleccionar un
  resultado externo lo normaliza, conserva procedencia/confianza/snapshot, lo
  guarda para uso posterior y continua a cantidad, comida y revision sin un
  paso de importacion.
- Sin conexion o sin proveedor configurado, la app sigue usando alimentos
  incluidos, personales, recetas y cache. El estado visible se limita a
  mensajes como **Buscando mas opciones**, **No encontramos mas coincidencias**
  o **Sin conexion**; nunca bloquea el registro.
- La configuracion tecnica queda plegada en **Mas > Ajustes > Nutricion >
  Diagnostico avanzado de fuentes**. No se agrego ninguna credencial al repo.
  Una clave de desarrollo configurada en el navegador sigue excluida de backup;
  produccion debe usar un proxy/backend que conserve el secreto del lado
  servidor.
- `fdc-client.js` acepta cancelacion y timeout externos. Se retiro del flujo
  normal la antigua busqueda paginada y el boton de importacion, pero se
  preservan cache, normalizacion, edicion diagnostica y compatibilidad de datos.
- Los nuevos modulos forman parte del service worker, del artifact Pages y del
  sincronizador Android. La validacion impide volver a introducir terminologia
  tecnica dentro de la tarjeta normal de registro.

Pruebas ejecutadas antes de preparar artefactos:

- `test:nutrition`, `test:fdc`, `test:modules`, service worker y validacion
  estatica: correctos;
- `nutrition-unified-search.spec.mjs`: 12/12 en Android Chromium, iPhone WebKit
  y escritorio Chromium. Cubre coincidencia local sin red, fallback automatico,
  normalizacion/cache, cancelacion, offline, ausencia de terminos tecnicos y
  flujo hasta cantidad;
- regresion Nutricion/borradores en escritorio: 25/25; dominio y
  recetas/porciones en las tres plataformas: 12/12, sin omisiones;
- datos/backups, Progreso, diseno, router, layout, Ajustes, Inicio, Workout y
  Gym Party aprobaron sus pruebas Node/contrato. La suite E2E agregada completa
  (261 casos entre proyectos) no se repitio en este bloque; se ejecutaron las
  matrices relacionadas indicadas arriba;
- el primer mock de transporte mediante interceptacion de red no era estable en
  WebKit. La prueba se corrigio para inyectar un transporte falso detras del
  contrato real `NutritionExternalProvider`; no se omitio ningun navegador ni
  se agrego una excepcion de produccion.

Verificacion publicable:

- el artifact Pages contiene 67 recursos con inventario y hashes. Las rutas
  profundas, modulos, manifest y service worker respondieron sin 404, errores
  de pagina ni errores de consola;
- `validate-app.ps1 -CheckAndroidAssets` confirmo 449 IDs estaticos unicos,
  cache build 79 y paridad exacta web/Android;
- Gradle 8.10.2 con Java 17 completo `clean assembleDebug`. El APK debug mide
  1.605.139 bytes y su SHA-256 es
  `6625698F8768F7CC4083EE37DF9E4862FBCA1ADBBB158C63D7AF00981CFDD553`.

Estado publicable: version `2.7.0`, Android `33`, build/cache `79`
(`protocolo-0-100-pwa-2.7.0-b79`). Siguiente fase estructural recomendada:
hacer atomica la instalacion PWA y despues crear un quality gate unico. No
promover Workout a IndexedDB en paralelo.

## 62. Instalacion PWA atomica

Bloque iniciado despues de `416da8f` y preparado como build 80:

- `scripts/precache-manifest.mjs` define el contrato unico de precache y
  clasifica recursos obligatorios/opcionales. `scripts/generate-precache-manifest.mjs`
  genera `precache-manifest.js` con version, build, cache, bytes y SHA-256.
- `scripts/build-web-dist.mjs` genera el manifiesto final desde las fuentes
  reales del artifact, incluida la configuracion Firebase temporal inyectada
  por Actions. `asset-manifest.json` sube a schema 2 e informa las cantidades
  obligatorias y opcionales; no mantiene otra lista manual.
- `sw.js` ya no usa `CORE_ASSETS` ni `cache.addAll`. Descarga primero a una
  cache staging, verifica todos los hashes obligatorios, copia el conjunto
  validado a la cache del build y limpia staging. Un 404 o hash incorrecto
  aborta la instalacion, elimina el build parcial y conserva la cache anterior.
- Iconos, manifest y `app-version.json` son opcionales durante la instalacion;
  sus fallos transitorios no invalidan el shell. JavaScript, CSS, HTML,
  configuracion publica y datos incluidos siguen siendo obligatorios.
- La navegacion controlada es cache-first para `index.html`: el worker activo
  no sustituye el HTML por una version cuyo JavaScript todavia no activo. Un
  asset ausente solo puede recuperarse de red si coincide con el hash esperado.
- `app/build-guard.js`, generado desde `app-version.json` y cargado antes de los
  demas modulos, cubre la transicion desde el antiguo worker build 79. Si recibe
  HTML y `app-version.js` de builds distintos, detiene el arranque, registra el
  worker correcto y ofrece **Actualizar ahora** en lugar de ejecutar una mezcla.
- `offline.html` ofrece recuperacion minima si la cache no dispone del shell.
  El mensaje `PWA_CACHE_DIAGNOSTIC` informa version, cache y recursos ausentes
  sin datos personales.
- El constructor Pages, workflow, validadores, prueba HTTP y sincronizador
  Android incluyen los nuevos recursos. Firebase sigue siendo network-only con
  stub local si no hay conexion y no se cachean llamadas de otros origenes.

Pruebas del bloque antes de preparar artefactos finales:

- service worker: instalacion completa, fallo opcional, 404 obligatorio, hash
  corrupto, rollback, cache anterior, consentimiento, Firebase, origen externo,
  navegacion coherente y diagnostico: correctos;
- guard de build: arranque alineado y bloqueo recuperable ante mezcla: correcto;
- generador reproducible, version unica y validacion estatica: correctos;
- artifact servido build 80: 70 recursos con inventario y hashes, sin 404,
  errores de pagina ni consola; service worker instalado y diagnostico sin
  faltantes obligatorios;
- `validate-app.ps1 -CheckAndroidAssets` confirmo build 80, 449 IDs estaticos
  unicos y paridad exacta web/Android;
- Gradle 8.10.2 con Java 17 completo `clean assembleDebug`. El APK debug mide
  1.611.706 bytes y su SHA-256 es
  `78F11347C1FF2ED1F9FF938FA313F41ACB2DAA76A700B586864DFA672F750E7A`.

Estado preparado: version `2.7.0`, Android `33`, build/cache `80`
(`protocolo-0-100-pwa-2.7.0-b80`). Siguiente fase recomendada: quality gate
unico para Pages/APK; no promover Workout a IndexedDB en el mismo commit.

## 63. Quality gate unico y canales de publicacion

Bloque iniciado despues de `ed66188`, sin cambiar el build 80 porque no modifica
assets de la aplicacion:

- `.github/workflows/quality-gate.yml` es reusable mediante `workflow_call` y
  tambien ejecutable manualmente. Acepta solo `beta` o `stable` y produce dos
  artifacts con nombre de canal: web completo y APK debug.
- El gate instala Node, Java, Playwright y Firestore Emulator; ejecuta PWA,
  version, Gym/widget, equipo, progresion, anomalias, Gym Party/sync, modulos,
  diseno, router, layout, Ajustes, datos/backups, Progreso, Nutricion/FDC,
  seguridad Android, accesibilidad, los 261 E2E y reglas Firestore.
- Despues de las pruebas genera la configuracion Firebase publica opcional,
  regenera sus hashes, sincroniza Android, vuelve a validar el artifact final y
  compila en el mismo job APK debug y release con una firma efimera.
- `.github/workflows/validate-app.yml` es el unico disparador automatico de la
  matriz en push/PR y usa canal beta. El APK debug manual, Pages y release llaman
  al mismo workflow; ya no mantienen copias divergentes de los pasos.
- Pages estable no se sobrescribe por cada commit. `deploy-pages.yml` es manual:
  `beta` solo conserva artifacts y `stable` descarga el artifact web que aprobo
  el gate y lo publica sin reconstruirlo.
- El release firmado espera el gate y conserva el flujo separado de keystore,
  APK versionado y SHA-256. Al inyectar Firebase vuelve a generar el precache
  antes de sincronizar assets.
- `scripts/test-quality-gate.mjs` comprueba consumidores, canales, ausencia de
  matrices duplicadas, E2E, Firestore, artifact web y builds Android. Las
  validaciones existentes derivan ahora sus expectativas del gate comun.

Verificacion local del bloque:

- `npm run test:quality-gate`: correcto;
- `node scripts/test-android-release.mjs`: correcto;
- `validate-app.ps1`: correcto sobre build/cache 80.

La ejecucion remota completa del reusable workflow queda a cargo de GitHub
Actions, porque incluye Firestore Emulator, los 261 E2E y Android release. El
siguiente paso exacto es observar la primera corrida beta y corregir cualquier
diferencia exclusiva del runner antes de publicar manualmente `stable`.

## 64. Correccion multiplataforma del precache y primera corrida remota

La primera ejecucion beta real del gate (`Validar aplicacion` #74, commit
`34f2a3d`) termino con error en **Probar PWA atomica y versionado**. Los pasos
de checkout, dependencias, Playwright, sincronizacion, validacion estructural y
contrato del quality gate habian pasado. La reproduccion sobre un checkout
limpio desde los blobs Git confirmo la causa: `precache-manifest.js` se habia
generado con bytes CRLF de Windows, mientras el runner Linux recibia LF. Esto
cambiaba bytes y SHA-256 aunque el contenido logico fuera identico.

Correccion preparada como build 81:

- `scripts/precache-manifest.mjs` normaliza finales de linea de recursos de
  texto antes de calcular bytes y SHA-256. Binarios conservan verificacion byte
  a byte.
- `scripts/generate-precache-manifest.mjs` y `scripts/build-web-dist.mjs` usan
  la misma huella canonica. El artifact web escribe texto LF para ser
  reproducible entre Windows y Linux.
- `sw.js` aplica la misma normalizacion al verificar respuestas; por ello un
  asset Android CRLF y el mismo asset Pages LF se validan contra un unico hash
  sin relajar la integridad del contenido.
- La prueba del service worker guarda cuerpos independientes en su cache mock,
  evitando que el comportamiento de streams de Undici oculte errores reales.
- Actions oficiales se actualizaron a las generaciones basadas en Node 24:
  checkout/setup-node `v7`, setup-java `v5`, upload-artifact `v7` y
  download-artifact `v8`.

Estado de version: `2.7.0`, Android `33`, build/cache `81`
(`protocolo-0-100-pwa-2.7.0-b81`). La corrida beta remota del commit que incluya
esta correccion debe quedar en verde antes de publicar manualmente `stable` o
abrir la promocion de otro dominio a IndexedDB.

La corrida beta #75 del commit `6f7a265` confirmo que **Probar PWA atomica y
versionado** ya pasa en Linux. El siguiente paso encontro una prueba heredada en
`scripts/test-schema-registry.mjs`: todavia buscaba la lista manual de assets
dentro de `sw.js`. El contrato correcto se valida ahora contra
`precache-manifest.js`, que es la fuente generada consumida por el worker. La
misma deuda se retiro de `test-data-layer.mjs` y `test-progress-view.mjs`; el
workflow Pages se valida como consumidor del gate reusable y ya no como lugar
donde se reconstruye manualmente el artifact.

La corrida beta #76 avanzo hasta los E2E: 239 pasaron y 14 quedaron omitidos,
pero expuso dos defectos reales. `APP_DATA.replaceMany()` serializaba fuera del
bloque recuperable y un valor circular escapaba sin devolver rollback. Ademas,
el evento tardio `app-data-primary-ready` podia ejecutar `renderSettingsData()`
mientras se editaba Ajustes y reponer los controles con los valores anteriores.
El build 82 protege toda la preparacion de `replaceMany()` y preserva controles
de Ajustes marcados como modificados hasta guardar; los renders de fondo ya no
pisan elecciones de tema, densidad, modo o unidad. Estado preparado: version
`2.7.0`, Android `33`, cache `protocolo-0-100-pwa-2.7.0-b82`.

Resultado remoto definitivo del bloque funcional: `Validar aplicacion` #77,
commit `e6a8cc2`, finalizo **Success** en 12m 11s. La matriz E2E registro 247
pruebas aprobadas y 14 omisiones conocidas; tambien pasaron reglas Firestore,
artifact web servido, service worker y APK debug/release de prueba. Artifacts:

- `protocolo-android-debug-beta`, 1.5 MB, SHA-256
  `1494b707ea2ddf443dbaa158d894424226ccf3aa5518cd99b79414f6943af3aa`;
- `protocolo-web-beta`, 315 KB, SHA-256
  `5761fbc1d7984c2056b020f489af16864324749546dab50703551980bc354c6a`.

La advertencia final de Node 20 se cerro actualizando
`android-actions/setup-android` a `v4` y `gradle/actions/setup-gradle` a `v6`
en el gate y en release. El proximo bloque estructural puede comenzar desde
build 82; no hace falta volver a tocar la PWA atomica ni el gate reusable salvo
una regresion comprobada.

Verificacion posterior: `Validar aplicacion` #78, commit `7200b86`, finalizo
**Success** en 12m 0s y ya no muestra la advertencia Node 20. Volvieron a pasar
247 E2E con 14 omisiones y la prueba de artifact servido. Artifacts definitivos
del HEAD funcional:

- `protocolo-android-debug-beta`, 1.5 MB, SHA-256
  `8ae82de2e7bb0052bc706714772c70749204d954dfd22d5470f976309c2cbf4c`;
- `protocolo-web-beta`, 315 KB, SHA-256
  `06d25fba2f567605accb495fa55f6d7b67e0ca7942fa6dace85f36264f06d4f4`.

## 65. WorkoutRepository como fuente primaria controlada

El build 83 promueve el dominio `workout` a lectura primaria desde IndexedDB,
manteniendo todas sus claves en `localStorage` como copia compatible de
escritura anticipada. La configuracion por dominio queda en
`protocolo_0_100_data_layer_v1`; tanto `nutrition` como `workout` estan activos
por defecto y pueden volver independientemente a modo compatible sin borrar
ninguna copia.

Cambios principales:

- `data/indexeddb.js` incluye `workout:true` en `primaryDomains` y expone
  `APP_DATA.isPrimaryReady(domain)` para coordinar consumidores sin asumir que
  abrir IndexedDB es sincrono.
- `workout-features.js` espera `APP_DATA.ready()` antes de crear rutina,
  biblioteca, historial, sesiones, perfiles de equipo, ajustes o estado del
  widget. Esto evita que valores predeterminados vacios sustituyan una copia
  recuperable cuando falta `localStorage` durante el arranque.
- `WORKOUT_FEATURES.ready()` es el contrato explicito para pruebas y clientes
  que necesiten operar inmediatamente despues de cargar la pagina.
- `workout-store.js` valida existencia mediante `APP_DATA.readResult()` cuando
  la capa de datos esta disponible, en lugar de decidir solo por presencia
  fisica en `localStorage`.
- **Mas > Datos y copias** muestra estado, divergencias y recuperaciones de Gym;
  permite rollback a lectura compatible, reactivacion y comprobacion manual.
- La reconciliacion conserva la regla local write-ahead: si existe una copia
  local valida mas reciente, se copia a IndexedDB; si falta localStorage, se
  recupera la copia valida de IndexedDB. Las dos copias se mantienen.
- Mientras quedan adaptadores legacy, una escritura directa valida en
  `localStorage` se detecta al leer, se adopta como write-ahead y se replica a
  IndexedDB sin exigir recarga. Una escritura corrupta se reporta y va a
  cuarentena antes de recuperar la copia primaria valida.
- El shell de Gym se inyecta sincronicamente, pero sus controles quedan
  `aria-busy`, `inert` y deshabilitados hasta finalizar hidratacion o fallback.
  Un render de arranque no puede sustituir valores que el usuario ya edito.

Pruebas locales del bloque antes del gate completo:

- `npm run test:data`: registro de 53 claves, integridad, repositorios,
  transacciones, backups y cuarentena aprobados.
- `tests/e2e/indexeddb-primary.spec.mjs`: 30/30 aprobadas en Android Chromium,
  iPhone WebKit y escritorio; cubre recuperacion antes de defaults,
  divergencia, write-ahead legacy sin recarga, rollback, reactivacion,
  coordinacion entre pestanas y fallback local cuando IndexedDB no esta
  disponible.
- `npm run test:progress`: modelos de Progreso, taxonomia muscular y progreso
  por ejercicio aprobados.
- La primera matriz amplia de Gym detecto que `gym-canonical.spec.mjs` esperaba
  un objeto global, no la hidratacion. Se agrego `WORKOUT_FEATURES.ready()` y la
  prueba ahora usa ese contrato. Tras regenerar el precache, la matriz
  `gym-canonical` + `gym-flow` aprobo 14 pruebas en las tres plataformas; la
  unica omision fue el service worker en WebKit, donde la UI iPhone si se probo.
- `validate-app.ps1`, versionado, precache, guard de build, artifact web y
  contrato Android aprobaron. El artifact contiene 70 recursos con hashes y
  rutas servibles sin 404.
- Los assets web se sincronizaron con `scripts/sync-web-assets.ps1` y
  `:app:assembleDebug` finalizo `BUILD SUCCESSFUL` con Gradle 8.10.2/JDK 17.

El primer gate remoto del commit `6c6bce3`, corrida #79, llego a 254 E2E
aprobados y 14 omitidos, pero fallo en cinco pruebas dependientes del tiempo.
La causa fue doble: lecturas primarias que no advertian escrituras legacy
directas posteriores a la hidratacion y un render tardio de Gym que podia
reemplazar controles durante una interaccion. Tras corregir ambos contratos:

- el conjunto completo que habia fallado (`data-integrity`, `drafts-time`,
  `gym-anomalies` y `layout-sticky`) aprobo 36 pruebas y mantuvo seis omisiones
  previstas en las tres plataformas;
- el caso de cancelar una anomalia aprobo cinco repeticiones consecutivas en
  iPhone WebKit;
- validacion, datos, version, precache, artifact web y APK debug volvieron a
  finalizar correctamente.

Resultado remoto definitivo: `Validar aplicacion` #80, commit `8d39c6a`,
finalizo **Success** en 12m 9s. El job unico
`Quality gate beta / Web, Firebase y Android` aprobo la matriz completa, incluidas
las reglas Firestore, el artifact web servido, Playwright multiplataforma y los
builds Android de prueba. Artifacts producidos:

- `protocolo-android-debug-beta`, 1.571.913 bytes;
- `protocolo-web-beta`, 323.183 bytes.

El bloque de `WorkoutRepository` primario queda cerrado en build 83. La siguiente
promocion debe seguir siendo un unico dominio por bloque. Segun el orden acordado,
corresponde disenar primero la retencion y reconciliacion de la cache nutricional
externa; no activar Gym Party o Protocolo como primarios simultaneamente.

## 66. Cache nutricional primaria con retencion controlada

El build 84 completa la promocion aislada de las dos caches nutricionales. No se
volvio a promover el historial completo de Nutricion: el registro de schemas
introduce `primaryGroup` y agrupa `cachedFdcFoods` y `fdcSearchCache` bajo
`nutritionCache`, manteniendo ambas claves dentro del dominio logico
`nutrition` para backup, reset y compatibilidad.

Contratos implementados:

- `APP_SCHEMA_REGISTRY.primaryGroupKeys()` es la fuente de los grupos primarios.
  `nutrition`, `workout` y `nutritionCache` se activan independientemente.
- La cache de busquedas aplica `ttl:24h`. Una entrada sin `cachedAt` valido o
  vencida se elimina de la copia activa y del espejo; no se interpreta como un
  resultado vigente.
- Los alimentos externos aplican `least-recently-used:750`. `fdc-client.js`
  conserva `cachedAt` y `lastAccessedAt`, mueve al final un alimento reutilizado
  y evita duplicados por `fdcId`.
- La retencion se ejecuta al leer, escribir e hidratar. El estado primario guarda
  `retentionPrunedCount`, divergencias y recuperaciones sin incluir contenido
  nutricional en diagnosticos.
- Activar un grupo crea snapshot previo. Si IndexedDB falla, se restaura
  `localStorage`, el flag anterior y la cache en memoria. El rollback visible no
  elimina ninguna copia.
- **Mas > Datos y copias** muestra una fila independiente **Cache nutricional**
  con estado, resultados vencidos depurados, rollback, reactivacion y reintento.
  Desactivarla no modifica comidas, recetas, objetivos ni historial.
- `FDC_CLIENT.ready()` permite a futuros consumidores esperar la hidratacion. El
  evento `app-data-primary-ready` repuebla Nutricion cuando una cache recuperada
  aparece despues del primer render.
- `fdcConfig` sigue exclusivamente en `localStorage`, marcado sensible y fuera
  de IndexedDB, backups, cuarentena exportada y diagnosticos.

Archivos funcionales principales:

- `data/schema-registry.js`;
- `data/indexeddb.js`;
- `fdc-client.js`;
- `index.html`;
- `tests/e2e/indexeddb-primary.spec.mjs`;
- `scripts/test-schema-registry.mjs`, `scripts/test-data-layer.mjs` y
  `scripts/test-fdc-confidence.mjs`;
- assets equivalentes de `android-native-wrapper/app/src/main/assets/`.

Verificacion local real:

- `npm run test:data`, `test:fdc`, `test:nutrition`, `test:version`,
  `test:precache` y `test:web-dist`: correctos;
- `indexeddb-primary.spec.mjs`: 36/36 en Android Chromium, iPhone WebKit y
  escritorio Chromium; incluye TTL, LRU, recuperacion, rollback independiente,
  UI, Nutricion duradera, Workout y coordinacion entre pestanas;
- `data-integrity`, `nutrition-domain` y `nutrition-unified-search`: 21/21 en
  las tres plataformas;
- artifact publicado local: 70 recursos con hash y ninguna ruta ausente;
- `web-dist.spec.mjs`: 1/1, sin 404 ni errores de pagina/consola y con service
  worker instalable;
- `validate-app.ps1 -CheckAndroidAssets`: version `2.7.0`, Android `33`, cache
  `protocolo-0-100-pwa-2.7.0-b84` y paridad web/Android correctas;
- `:app:assembleDebug`: correcto con Gradle 8.10.2/JDK 17; APK debug de
  1.746.537 bytes.

Resultado remoto definitivo: `Validar aplicacion` #81, commit `3a16e8c`,
finalizo **Success** en 14m 9s. El gate registro 268 E2E aprobadas y 14 omisiones
conocidas; tambien pasaron Firestore Emulator, artifact servido, service worker
y Android debug/release de prueba. Artifacts:

- `protocolo-android-debug-beta`, 1.5 MB, SHA-256
  `5eeb389e412afe24819e90522dd740d1f8897d4655eaf6fab68e233a2cef09d6`;
- `protocolo-web-beta`, 317 KB, SHA-256
  `785400e05800187b81cb91e2d71677152b8a6e02c514a251fd4855a048ad48f8`.

La siguiente promocion estructural debe auditar primero
`GymPartyLocalRepository` y su cola offline; no activar Gym Party y Protocolo a
la vez ni retirar aun las claves compatibles de `localStorage`.

## 67. Gym Party primario con hidratacion y cola recuperable

El build 85 promueve unicamente el grupo `gymParty` a lectura primaria en
IndexedDB. Protocolo continua en `shadow`; no se retiro ninguna clave compatible
de `localStorage` ni se modificaron datos remotos de Firebase.

Contratos implementados:

- `APP_DATA.DEFAULT_CONFIG.primaryDomains` activa `gymParty` junto con
  Nutricion, Workout y `nutritionCache`. Las ocho claves registradas de sala,
  membresia, sesiones/series compartidas, cola offline, marcas de sincronizacion
  y demo se hidratan como un unico grupo recuperable.
- `GYM_PARTY_FEATURES.ready()` espera `APP_DATA.ready()` antes del primer render,
  de aplicar un codigo de invitacion o de reanudar sincronizacion Firebase. La
  vista queda `aria-busy` e `inert` y muestra un estado breve mientras espera.
- Si IndexedDB no esta disponible, la inicializacion termina en modo compatible
  y conserva la sala y la cola en `localStorage`; el entrenamiento no se bloquea.
- Salir del dispositivo elimina la membresia mediante
  `GymPartyLocalRepository.removeByName('membership')`. La copia primaria tambien
  se elimina, por lo que una membresia abandonada no reaparece al recargar.
- La preferencia de sincronizacion automatica se lee mediante
  `SettingsRepository`; Gym Party ya no mantiene una lectura paralela directa.
- Cambios recibidos mediante `BroadcastChannel` o el evento `storage` refrescan
  la vista activa de Gym Party. Los cambios locales no crean bucles de render.
- **Mas > Datos y copias** incorpora una fila independiente **Gym Party** con
  estado, divergencias, recuperaciones, rollback, reactivacion y comprobacion.
  El rollback no modifica Nutricion, cache nutricional ni Workout.
- El test historico que simulaba otro miembro se adapto al contrato canonico
  `APP_DATA.write/remove`; escribir o borrar directamente en `localStorage` ya
  no representa una transaccion valida de un dominio primario.

Archivos funcionales principales:

- `data/indexeddb.js`;
- `gym-party.js`;
- `index.html`;
- `scripts/test-schema-registry.mjs`;
- `tests/e2e/indexeddb-primary.spec.mjs` y `tests/e2e/gym-flow.spec.mjs`;
- assets equivalentes de `android-native-wrapper/app/src/main/assets/`.

Verificacion local real:

- `test:data`, Gym Party, sync incremental, version, precache atomico, service
  worker y artifact web: correctos;
- artifact web: 70 recursos con hash, rutas profundas y ningun recurso ausente;
- `indexeddb-primary` + `gym-flow`: 62 pruebas aprobadas en Android Chromium,
  iPhone WebKit y escritorio Chromium; una omision prevista corresponde al
  service worker en WebKit;
- la matriz cubre recuperacion previa al render, rollback independiente,
  fallback sin IndexedDB, eliminacion persistente de membresia, cola offline,
  dos pestanas, invitacion y UI de Datos y copias;
- `validate-app.ps1 -CheckAndroidAssets`: version `2.7.0`, Android `33`, cache
  `protocolo-0-100-pwa-2.7.0-b85` y paridad web/Android correctas;
- `:app:assembleDebug`: `BUILD SUCCESSFUL` con Gradle 8.10.2/JDK 17; APK debug
  de 1.746.537 bytes.

La primera corrida remota del commit `2f5925a`, `Validar aplicacion` #82,
aprobo 282 E2E y omitio 14, pero fallo una prueba de cuarentena en escritorio.
La prueba aislada aprobo 20 repeticiones consecutivas. La auditoria encontro la
carrera subyacente: `clearAllData()` y `purgeKeys()` podian limpiar mientras la
inicializacion o una escritura espejo seguian pendientes. Ambas operaciones
esperan ahora `initialize()` y `flush()` antes de borrar. Se agrego una prueba
que escribe y borra sin espera intermedia; integridad y capa de datos aprobaron
21/21 casos en Android Chromium, iPhone WebKit y escritorio.

Resultado remoto definitivo: `Validar aplicacion` #83, commit `00b19fa`,
finalizo **Success** en 11m 54s. El gate aprobo 286 E2E y mantuvo 14 omisiones
conocidas; tambien pasaron Firestore Emulator, artifact servido, service worker
atomico y Android debug/release de prueba. Artifacts:

- `protocolo-android-debug-beta`, 1.5 MB, SHA-256
  `25c4c34dcafac098b98607958c732f17279a15ef8b7e3b284bcb5db2d84259c6`;
- `protocolo-web-beta`, 318 KB, SHA-256
  `c2d76a23eb54cc8ccc823767ce0871521a674adb47260ee925e61a37b83d9f80`.

El bloque de `GymPartyLocalRepository` primario queda cerrado en build 85. La
siguiente promocion estructural es `ProtocolRepository`; debe hacerse en otro
bloque, con rollback propio, sin retirar las claves legacy y sin mezclarla con
cambios de Firebase o Nutricion.

## 68. ProtocolRepository primario sin retirar compatibilidad

El build 86 promueve exclusivamente `protocolo_0_100_tracker_v1` a lectura
primaria desde IndexedDB. Con esto quedan activados los cinco grupos previstos:
`protocol`, `nutrition`, `nutritionCache`, `workout` y `gymParty`. No se borró
ninguna clave de `localStorage` y el modo global continúa identificado como
`shadow` durante el período de compatibilidad.

Contratos implementados:

- `APP_DATA.DEFAULT_CONFIG.primaryDomains.protocol` queda activo por defecto y
  conserva merge compatible para configuraciones anteriores que no tenían ese
  flag.
- `APP_SCHEMA_REGISTRY.primaryGroupKeys().protocol` contiene solamente el
  historial `dailyLogs`. `startDate`, `actionDismissed` y
  `legacyGymSessions` permanecen fuera del grupo primario por ser configuración
  local o formato de migración.
- `PROTOCOL_FEATURES.ready()` espera la hidratación, vuelve a cargar el registro
  de la fecha seleccionada y elimina `aria-busy` solo cuando Inicio puede leer
  la copia reconciliada. Si IndexedDB no existe, resuelve en modo compatible y
  la interfaz continúa funcionando con `localStorage`.
- Una copia local válida sigue teniendo semántica write-ahead: se reconcilia
  hacia IndexedDB y la divergencia queda en metadatos. Si falta la copia local,
  la versión válida de IndexedDB se restaura también a `localStorage`.
- Cambios recibidos por `BroadcastChannel` o `storage` actualizan las métricas
  visibles sin reemplazar los campos que el usuario está editando.
- **Más > Datos y copias** muestra una fila **Registro diario** con estado,
  divergencias, recuperaciones, reintento, rollback y reactivación. Cambiar el
  modo no toca Gym, Nutrición, cache nutricional ni Gym Party.
- Reset selectivo, importación schema 3, Deshacer y backups antiguos conservan
  sus contratos; `localStorage` sigue siendo una copia compatible exportable.

Archivos funcionales principales:

- `data/indexeddb.js`;
- `index.html`;
- `scripts/test-schema-registry.mjs`;
- `tests/e2e/indexeddb-primary.spec.mjs`;
- `app-version.json`, `app-version.js`, `precache-manifest.js` y assets
  equivalentes de `android-native-wrapper/app/src/main/assets/`.

Verificación local real:

- contratos de versión, precache, módulos, diseño, router, layout, Inicio,
  Ajustes, datos, backups, Nutrición, FDC, Progreso y quality gate: correctos;
- 15/15 pruebas específicas de Protocolo primario en Android Chromium, iPhone
  WebKit y escritorio Chromium;
- la matriz relacionada de backup, capa de datos, Inicio y Progreso aprobó 49
  casos y mantuvo dos omisiones previstas por plataforma;
- la matriz completa de almacenamiento aprobó 62 casos antes de dividir una
  prueba acumulativa que excedía 45 segundos en WebKit; las dos pruebas
  resultantes aprobaron después de la división;
- artifact web: 70 recursos con hash, sin rutas ausentes; prueba servida 1/1,
  sin errores de página o consola y con service worker instalable;
- service worker atómico: 64 recursos obligatorios, 4 opcionales y cache
  `protocolo-0-100-pwa-2.7.0-b86`;
- `validate-app.ps1 -CheckAndroidAssets`: paridad web/Android correcta;
- `:app:assembleDebug`: `BUILD SUCCESSFUL` con Gradle 8.10.2/JDK 17; APK debug
  de 1.746.537 bytes, SHA-256
  `FDC6D19EA1E5317C4D47B7D44B49C3877C88A2D9CE07610829528F8EAF45723C`.

La primera corrida remota del commit `0addaf8`, `Validar aplicacion` #84,
aprobó 300 E2E y omitió 14, pero falló el menú contextual de Nutrición en
Android Chromium porque el evento de hidratación de Protocolo ejecutaba
`renderAll()` y podía reemplazar un menú abierto. La persistencia primaria no
falló. Se separó `renderProtocol()` del render global: hidratación, rollback y
cambios entre pestañas actualizan únicamente Inicio, historial y Progreso, sin
volver a montar Nutrición, Gym o Gym Party. El caso que falló aprobó diez
repeticiones consecutivas y luego 3/3 plataformas; además ahora verifica de
forma determinista que un evento `app-data-primary-ready` de Protocolo no
desconecta el menú nutricional abierto. Las 15 pruebas específicas de
Protocolo continuaron en verde después de la corrección.

La segunda corrida remota del commit `c3e3076`, `Validar aplicacion` #85,
aprobó 299 E2E y omitió 14, pero marcó dos fallos Android Chromium durante la
preparación de integridad y recuperación de Gym Party. El trace de Playwright
confirmó que `page.goto()` había finalizado y que el contexto se reemplazó
mientras la prueba esperaba `APP_DATA.ready()`; no falló ninguna aserción de
cuarentena, membresía, cola ni recuperación.

`tests/e2e/helpers/app-ready.mjs` centraliza ahora la espera estable de
`APP_DATA` y de los dominios opcionales tras navegación o recarga. Solo reintenta
cuando Chromium informa que el documento fue reemplazado; cualquier error de
inicialización real se sigue propagando. Las preparaciones de integridad e
IndexedDB usan este contrato, incluidas las recargas de Gym Party y su segunda
pestaña. Verificación posterior: 60/60 repeticiones de los dos casos que
fallaron durante 7,2 minutos, y 72/72 casos de integridad/IndexedDB en Android
Chromium, iPhone WebKit y escritorio Chromium durante 8,2 minutos.

Resultado remoto definitivo: `Validar aplicacion` #86, commit `cedfaff`,
finalizó **Success** en 14m 23s. El gate aprobó 301 E2E y mantuvo 14 omisiones
conocidas; también pasaron Firestore Emulator, artifact servido, service worker
atómico y Android debug/release de prueba. Artifacts:

- `protocolo-android-debug-beta`, 1,5 MB, SHA-256
  `03c8692d4c18b07efe8773dd9232b09fff74bcaef20ec805c172cc12118b6681`;
- `protocolo-web-beta`, 319 KB, SHA-256
  `efe723c6347556ad6bb6afd695f9afb6a67db1363e1b7fd4278943ea69f603af`.

El bloque de `ProtocolRepository` primario queda cerrado en build 86. No debe
promoverse otro dominio de inmediato: los cinco grupos previstos ya son
primarios. El siguiente trabajo estructural debe ser un período de
compatibilidad con auditoría de divergencias y pruebas instaladas en Safari/iOS
y Android real antes de considerar retirar alguna clave legacy.

## 69. Auditoría de compatibilidad de las dos copias locales

El build 87 inicia el período de observación posterior a la promoción de los
cinco grupos primarios. No retira ninguna clave legacy ni cambia qué copia se
usa para leer; añade evidencia técnica persistente sobre reconciliaciones y
recuperaciones ya resueltas.

Contratos implementados:

- `data/indexeddb.js` conserva en `meta/compatibility:audit` un máximo de 100
  eventos. Cada evento contiene solo dominio, clave registrada, nombre técnico,
  tipo, resolución y fecha; nunca raw, checksums, valores, notas o credenciales.
- Los acumulados por dominio guardan comprobaciones, divergencias y
  recuperaciones. La actualización usa una transacción `readwrite`, por lo que
  dos pestañas no pierden incrementos entre sí.
- `APP_DATA.compatibilityAudit()` consulta el historial;
  `verifyCompatibility()` rehidrata únicamente los grupos primarios activos;
  `compatibilityAuditExport()` produce un diagnóstico redactado; y
  `clearCompatibilityAudit()` elimina solo metadatos técnicos.
- El historial se borra junto con **Borrar todos los datos locales**, pero su
  borrado independiente no modifica `localStorage`, registros IndexedDB,
  cuarentena ni snapshots de recuperación.
- **Más > Datos y copias** muestra un panel plegado con comprobaciones,
  diferencias resueltas, recuperaciones y última revisión. Permite comprobar
  las cinco áreas, exportar el diagnóstico y borrar el historial mediante el
  diálogo interno accesible.
- Sin IndexedDB, el panel informa el modo compatible y no bloquea la app.

Archivos funcionales principales:

- `data/indexeddb.js`;
- `index.html`;
- `scripts/test-data-layer.mjs` y `scripts/validate-app.ps1`;
- `tests/e2e/data-compatibility.spec.mjs`;
- `README.md` y este handoff.

Verificación local previa al empaquetado:

- validadores de capa de datos, integridad y aplicación: correctos;
- 15/15 escenarios específicos en Android Chromium, iPhone WebKit y escritorio
  Chromium: divergencia, persistencia, redacción, recuperación, borrado sin
  pérdida, exportación, 320 px, dos pestañas y fallback sin IndexedDB;
- la regresión conjunta ejecutó 102 casos: 100 pasaron y dos expectativas de
  historial vacío fallaron porque había un ajuste automático válido ya
  registrado; tras alinear la expectativa con el contrato real, el flujo
  visual/exportación aprobó 9/9 repeticiones en las tres plataformas.

Empaquetado local verificado:

- versión `2.7.0`, Android `33`, build/cache `87` alineados;
- precache atómico con 64 recursos obligatorios y 4 opcionales;
- artifact web de 70 recursos con hash, sin rutas ausentes; prueba servida 1/1,
  sin errores de página/consola y con service worker instalable;
- paridad de assets web/Android correcta;
- `:app:assembleDebug` finalizó `BUILD SUCCESSFUL` con Gradle 8.10.2/JDK 17;
  APK debug de 1.746.537 bytes, SHA-256
  `DE0FC82AF6B2527DA7C93C6D5AC8B351E8F1979A133FE57123A20E133B19D80C`.

Resultado remoto definitivo: `Validar aplicacion` #87, commit `14778e9`,
finalizó **Success** en 13m 05s. El gate aprobó 316 E2E y mantuvo 14 omisiones
conocidas; la verificación servida del artifact aprobó 1/1. También pasaron
Firestore Emulator, service worker atómico, Android debug/release de prueba y
  paridad de assets. Artifacts:

- `protocolo-android-debug-beta`, 1,51 MB, SHA-256
  `3bf28ae51b52bf74b9d8809c9cfb494f3fd30f8acd137ea8d398ceeee0605a8d`;
- `protocolo-web-beta`, 321 KB, SHA-256
  `1e3c6b8c35cc0d8c73210207acb417c984d04540f25a0450c39fb30f23e71052`.

El bloque queda cerrado y publicado en build 87. No retirar aún ninguna clave
de `localStorage`: el próximo paso exacto es observar divergencias reales y
realizar pruebas instaladas en Safari/iOS y Android físicos antes de decidir la
retirada gradual de compatibilidad legacy.

## 70. Importación explícita y recuperable por área

El build 88 amplía el importador seguro existente sin cambiar el schema 3 ni
las claves históricas. `data/backup-service.js` genera ahora un plan puro antes
de escribir y agrupa los datos reconocidos por dominio.

Contratos implementados:

- Cada área incluida permite elegir **Fusionar**, **Reemplazar** o **Conservar
  actual**. Fusionar es el valor inicial y conserva registros locales que no
  estén en el archivo; Reemplazar restaura exactamente el área y muestra antes
  cuántos registros o valores locales desaparecerían; Conservar actual excluye
  el área de la transacción.
- Arrays se combinan por ID estable, fecha o identidad canónica; duplicados
  dentro del archivo se detectan y se consolidan de forma determinista. Los
  objetos se combinan por propiedad y los valores escalares conservan su
  contrato de schema.
- Los conflictos permiten usar el archivo, conservar este dispositivo o
  revisar uno por uno. La vista previa separa nuevos, actualizados, conflictos,
  eliminaciones y duplicados.
- `APP_DATA.replaceMany()` sigue siendo la única escritura final: crea snapshot
  previo, aplica todas las áreas en una transacción lógica y revierte si falla.
  El panel Deshacer continúa restaurando la copia anterior.
- Una configuración Firebase local nunca participa en comparaciones ni
  eliminaciones. Aunque se elija Reemplazar Gym Party, `firebaseConfig` se
  conserva únicamente en el dispositivo y sigue excluido de backup.
- Backups schema 1/legacy mantienen el modo Fusionar por defecto; áreas que no
  estén presentes en el archivo no se modifican.

Interfaz:

- El diálogo **Antes de importar** muestra controles por área y una advertencia
  persistente cuando Reemplazar eliminaría datos locales.
- La revisión individual es accesible mediante `fieldset`, `legend`, controles
  etiquetados y foco restaurado al botón que abrió el selector de archivo.
- A 320 px el diálogo no genera scroll horizontal. Datos de usuario usados como
  etiquetas se escapan antes de renderizarse.

Archivos principales:

- `data/backup-service.js`;
- `index.html` y `styles/components.css`;
- `scripts/test-backup-service.mjs` y `scripts/validate-app.ps1`;
- `tests/e2e/backup-import.spec.mjs`;
- `README.md`, `app-version.json` y este handoff.

Verificación previa al empaquetado:

- unidad de backup, capa de datos e integridad: correctas;
- validación estructural: 476 IDs únicos y contratos nuevos presentes;
- 15 escenarios específicos de importación en Android Chromium, iPhone WebKit
  y escritorio Chromium: preview, schema futuro, fusión, conflicto individual,
  reemplazo, conservación, duplicados, XSS, Deshacer, foco y 320 px;
- regresión conjunta de backup, integridad, cuarentena, IndexedDB primario,
  compatibilidad y dos pestañas: 117/117 aprobadas en 12m 58s.

Empaquetado local verificado:

- versión `2.7.0`, Android `33`, build/cache `88` alineados;
- precache atómico con 64 recursos obligatorios y 4 opcionales;
- artifact web de 70 recursos con inventario y hashes, sin 404 ni errores de
  página/consola; prueba servida 1/1 y service worker instalable;
- paridad exacta entre assets web y Android;
- `:app:assembleDebug` finalizó correctamente con Gradle 8.10.2/JDK 17;
  APK debug de 1.746.537 bytes, SHA-256
  `D60D3B0F48152B5E59411625605B76226095D0502C94DC4E85CE9949C78E8767`.

Resultado remoto definitivo: `Validar aplicacion` #88, commit `29e86e7`,
finalizó **Success** en 15m 36s. El gate aprobó 325 E2E y mantuvo 14 omisiones
conocidas; la verificación servida del artifact aprobó 1/1. También pasaron
Firestore Emulator, service worker atómico, Android debug/release de prueba y
paridad de assets. Artifacts:

- `protocolo-android-debug-beta`, 1,51 MB, SHA-256
  `0958e34e8bd305ba84b802264adee42e596742ac003c0fe7b7d3d24d0d633574`;
- `protocolo-web-beta`, 325 KB, SHA-256
  `02d0f373d342fb76433d9d2dd723b5fbcbe2c17afbe2092fb45875ec55a8bf7a`.

El bloque queda cerrado y publicado en build 88. El período de compatibilidad
entre IndexedDB y `localStorage` continúa sin cambios; no retirar claves legacy
antes de observar divergencias reales y completar pruebas en dispositivos
físicos.

## 71. Línea base real de cierre del build 88

La continuación partió de `main` limpio en `c6b8614`, con versión `2.7.0`,
Android `versionCode 33`, build/cache 88 y backup schema 3. La verificación
pública contradijo la frase "publicado" de la sección anterior: al iniciar este
bloque `https://locoviera24-code.github.io/protocolo-0-100/` y sus recursos
principales respondían 404. El artifact beta y el quality gate #88 existen, pero
eso no equivale a un despliegue estable de GitHub Pages. No afirmar que el build
88 está publicado hasta ejecutar y verificar el workflow estable.

La regresión local completa inició 339 escenarios y produjo 324 aprobados, 14
omisiones conocidas y un fallo WebKit en la administración de alimentos propios.
El fallo era reproducible: una hidratación asíncrona volvía a renderizar
`customFoodsList` y cerraba el menú contextual antes de que WebKit pudiera activar
su opción. `advanced-features.js` conserva ahora el menú abierto por ID y
`index.html` controla explícitamente la apertura de un único menú.

Verificación de la corrección:

- 3/3 escenarios del flujo duplicar, archivar, fusionar, eliminar y Deshacer en
  Android Chromium, iPhone WebKit y escritorio Chromium;
- validación estructural correcta: versión 2.7.0, cache build 88, 71 alimentos,
  28 nutrientes y 476 IDs únicos;
- no se modificaron datos, schemas, claves legacy ni la fuente primaria de ningún
  dominio.

Siguiente bloque exacto: generar metadatos verificables del artifact, mostrarlos
en `Más > Acerca de` y añadir una comprobación de actualización sin caché ni
recarga automática insegura.

## 72. Metadatos verificables y actualización segura

`Más > Acerca de` ya no muestra solo etiquetas de versión. La vista obtiene el
contrato `build-info.json` y presenta versión, build, canal, commit abreviado,
fecha del artifact, cache activa, estado del service worker y versión Android.
La acción **Comprobar actualización** solicita `build-info.json` y
`app-version.json` con `__pwa_update_check`; `sw.js` deja pasar exclusivamente
esa consulta a red para evitar comparar contra su propia cache activa.

El nuevo módulo `app/build-info.js` valida el contrato, compara builds y evita
activar una actualización cuando existen borradores, ajustes sin guardar,
diálogos/importaciones abiertos o escrituras de `APP_DATA` pendientes. El banner
PWA existente usa el mismo guard. La recarga sigue ocurriendo solo después del
consentimiento y de `controllerchange`.

El artifact no usa un commit escrito a mano:

- `scripts/build-info.mjs` construye metadatos desde `app-version.json`,
  `GITHUB_SHA` y `QUALITY_CHANNEL`;
- `scripts/build-web-dist.mjs` genera el archivo exacto dentro de `dist-pages`;
- el quality gate genera el mismo contrato antes de sincronizar Android;
- el checkout conserva un fallback identificado como `development`.

Empaquetado y pruebas del bloque:

- precache build 88: 66 recursos obligatorios y 4 opcionales;
- artifact web: 72 recursos con inventario y hashes, incluidos
  `build-info.json` y `app/build-info.js`;
- service worker atómico, bypass de comprobación y rollback correctos;
- validación/paridad Android correctas, 483 IDs estáticos únicos;
- 28 aprobadas y 2 omisiones esperadas en la matriz Acerca de/Ajustes sobre
  Android Chromium, iPhone WebKit y escritorio Chromium;
- la URL pública seguía sin estar disponible al cerrar este bloque; no existe
  todavía un commit público verificable de esta continuación.

Siguiente bloque exacto: simplificar la vista normal de `Datos y copias` y mover
modos de almacenamiento, checksums, divergencias y recuperaciones dentro de un
único `Diagnóstico avanzado`, sin retirar ninguna herramienta ni clave legacy.

## 73. Datos y copias con complejidad progresiva

La ruta `?module=more&view=data` muestra primero un único estado comprensible,
última exportación, última importación, espacio utilizado, cantidad de elementos
que necesitan revisión y las acciones Exportar, Importar, Deshacer y
restablecimiento selectivo. `navigator.storage.estimate()` amplía la estimación
cuando está disponible y mantiene el cálculo de `localStorage` como fallback.

Todos los controles técnicos existentes se conservaron, pero ahora viven dentro
de `#dataAdvancedDiagnostics`, cerrado por defecto:

- schema, claves locales y estado IndexedDB;
- fuente primaria/compatible de Protocolo, Nutrición, cache, Workout y Gym Party;
- reactivación, comprobación y rollback por dominio;
- divergencias, recuperaciones y el historial técnico limitado;
- exportación del diagnóstico redactado y limpieza exclusiva de metadatos.

La tarjeta principal cambia a **Hay elementos que necesitan revisión** cuando
existe cuarentena, un dominio `review-needed` o un error recuperable. Los datos
en cuarentena siguen visibles fuera del diagnóstico para que reparar/exportar no
quede oculto. No se retiró `localStorage`, no cambió ningún schema y no se tocó
la política de retención.

Verificación:

- 12/12 escenarios de Datos y copias, compatibilidad y rollback visibles en las
  tres plataformas Playwright;
- 6/6 escenarios de cuarentena, reparación y redacción en las tres plataformas;
- precache y paridad Android regenerados; validación estructural con 489 IDs
  únicos;
- el panel técnico está oculto inicialmente y sus controles siguen operativos
  después de abrirlo, recargar y cambiar de modo.

Siguiente bloque exacto: separar definitivamente la administración de alimentos
y recetas del registro diario, y ocultar la configuración técnica nutricional
salvo en modo desarrollo/soporte/diagnóstico.

## 74. Administración nutricional separada del registro

El flujo **Nutrición > Agregar** ya no contiene el editor completo de recetas ni
el formulario expandible de alimentos propios. La pantalla mantiene una sola
tarea: buscar, elegir cantidad, elegir comida, revisar y guardar. La acción
**No encuentro este alimento** abre la vista secundaria **Mis alimentos y
recetas**, donde están la creación manual, alimentos existentes y recetas.

La vista secundaria reutiliza `customFoods`, `recipes`, `NutritionRepository`,
los borradores y los snapshots existentes. No crea claves ni modelos paralelos.
Al usar un alimento recién creado se regresa al paso Cantidad; al elegir una
receta desde el buscador se mantiene el flujo normal. Editar una receta sigue
sin modificar entradas históricas.

La ruta de Ajustes ofrece un acceso directo a esta vista, pero ya no mueve la
lista de alimentos propios dentro del formulario de configuración. Los tabs
principales siguen siendo solo Hoy, Agregar y Progreso.

Verificación del bloque:

- 18/18 escenarios nutricionales dirigidos en escritorio Chromium;
- 3/3 recorridos críticos de administración, recetas y separación visual en
  iPhone WebKit, y 3/3 en Android Chromium;
- una primera ejecución cruzada agotó el límite externo y no se contabilizó;
  las matrices se repitieron por plataforma para obtener resultados concluyentes;
- recetas, snapshots, Deshacer, objetivos y Gym Party conservaron sus contratos;
- no cambiaron schemas, claves legacy ni fuentes primarias.

Siguiente bloque exacto: ocultar `fdcSettingsCard` en builds estables salvo modo
soporte/diagnóstico y mostrar al usuario solo el estado simple de búsqueda
ampliada u offline.

## 75. Diagnóstico nutricional reservado para soporte

`#fdcSettingsCard` ya no se monta en Ajustes de Nutrición. Se conserva completo
dentro de **Más > Datos y copias > Diagnóstico avanzado > Nutrición**, pero
permanece oculto en builds estables. Se habilita únicamente cuando el canal es
`development`, la URL contiene `diagnostics=1`/`support=1` o existe una sesión de
soporte activada explícitamente. `diagnostics=0`/`support=0` la desactiva.

La pantalla normal de Ajustes muestra solamente `#nutritionExpandedSearchStatus`
con uno de tres estados: **Búsqueda ampliada disponible**, **Búsqueda ampliada no
disponible** o **Modo offline**. Los cambios `online`/`offline` actualizan ese
estado sin exponer proveedor, endpoint, IDs ni credenciales.

El contrato remoto quedó endurecido sin borrar compatibilidad: un `backendUrl`
configurado sigue habilitando la búsqueda en cualquier canal; una API key
guardada en el navegador solo habilita llamadas directas durante desarrollo o
soporte. Las claves legacy permanecen locales, no se exportan y no se eliminan.

Pruebas del bloque:

- 9/9 en Android Chromium, iPhone WebKit y escritorio Chromium: build estable
  oculto, soporte explícito visible y transición a offline;
- el caso estable comprobó que una clave local legacy no habilita red;
- 4/4 escenarios del buscador unificado en escritorio Chromium; una expectativa
  antigua que buscaba el formulario inline se actualizó al nuevo acceso
  **Crear este alimento** y el recorrido offline quedó aprobado;
- no cambiaron schemas, caché nutricional, comidas, recetas ni IndexedDB.

Siguiente bloque exacto: integrar `@axe-core/playwright`, ejecutar auditorías
reales sobre las vistas centrales y documentar únicamente excepciones concretas.

## 76. Auditoría axe y contratos de foco

Se agregó `@axe-core/playwright` y el escenario
`tests/e2e/accessibility-axe.spec.mjs`. El gate analiza Inicio, Gym, Nutrición,
Progreso, Más, Datos y copias y Gym Party con reglas WCAG A/AA en Android
Chromium, iPhone WebKit y escritorio Chromium. El workflow ejecuta axe de forma
explícita y luego evita duplicarlo en la matriz E2E restante.

La primera ejecución encontró dos defectos reales compartidos:

- `#sideDrawer` tenía `aria-hidden=true`, pero sus botones seguían en el orden de
  foco;
- las vistas Registro/Resumen usaban `aria-selected` sobre botones sin rol de
  tab.

El drawer ahora usa `inert` mientras está cerrado, lo retira al abrirse y
restaura el foco al control de apertura. Registro/Resumen forman un tablist real
con `aria-controls`, tabpanels, roving `tabindex` y soporte de flechas,
Home/End. La navegación por teclado actualiza la URL sin desviar el foco al
encabezado.

Resultados:

- 21/21 auditorías axe sobre las siete vistas y tres plataformas, sin
  infracciones `serious` o `critical` y sin reglas excluidas;
- 6/6 recorridos conductuales de tabs y drawer en las tres plataformas;
- contratos estáticos de accesibilidad, router y layout aprobados;
- `docs/accessibility-exceptions.md` documenta que actualmente no hay
  excepciones activas.

Siguiente bloque exacto: completar manifest, iconos dedicados, screenshots y
validación de la experiencia instalable sin cambiar la orientación ni romper
shortcuts existentes.

## 77. Manifest y experiencia instalable completos

`manifest.webmanifest` ya no fuerza orientación vertical: declara `any`. Los
iconos normales de 192/512 px conservan `purpose: any` y existen archivos
maskable separados, generados con una zona segura real mediante
`scripts/generate-pwa-icons.ps1`. Inicio, Gym, serie rápida, Nutrición y Gym
Party tienen iconos de shortcut propios.

Se agregaron capturas reproducibles y sin datos personales para los factores
`narrow` (390x844, Inicio) y `wide` (1440x900, Gym). El generador
`scripts/capture-pwa-screenshots.mjs` levanta un servidor efímero, usa contextos
limpios de Chromium y guarda las dimensiones exactas declaradas por el
manifiesto.

`scripts/test-manifest.mjs` valida JSON, orientación, rutas, dimensiones PNG,
separación `any`/`maskable`, iconos diferenciados y screenshots. El quality gate
lo ejecuta junto al contrato PWA. El constructor web descubre estos recursos a
partir del manifiesto y `scripts/sync-web-assets.ps1` los copia al APK.

Verificación del bloque:

- manifest: 4 iconos, 5 shortcuts y 2 screenshots válidos;
- precache: 80 recursos descubiertos para build 88;
- artifact: 81 recursos con hash y rutas profundas sin 404;
- Playwright del artifact: 1/1, service worker instalado y sin errores de página;
- validación estructural y paridad Android aprobadas con 496 IDs estáticos.

Siguiente bloque exacto: documentar las pruebas físicas sin atribuir resultados
no ejecutados, incrementar una sola vez el build publicable, ejecutar la suite
completa y establecer la referencia `baseline-stable-2.7` si el gate y la
publicación real quedan verificados.

## 78. Cierre local del ciclo 2.7

El build web/PWA se incrementó una sola vez a `89` por el conjunto funcional
cerrado en los bloques 72-77. La versión permanece `2.7.0` y Android conserva
`versionCode 33`; no hubo cambio de schema ni retirada de claves legacy.

La primera regresión completa del build 89 ejecutó 384 escenarios y expuso 9
fallos reales o contratos desactualizados. Se corrigieron antes de continuar:

- la comparación de actualización ya deriva el siguiente build desde
  `app-version.json`;
- la validación de alimento propio entra por **No encuentro este alimento**;
- el drawer permanente de escritorio deja de estar `inert`, mientras el móvil
  oculto conserva `aria-hidden` e `inert`;
- si `build-info.json` falta o es inválido, el diagnóstico técnico se mantiene
  cerrado por defecto;
- las pruebas de metadatos que interceptan red bloquean el service worker para
  que WebKit no responda desde una caché previa.

Resultados locales concluyentes:

- contratos estáticos completos: aprobados;
- Playwright: 373 aprobados, 14 omitidos, 0 fallos en 46,8 minutos sobre Android
  Chromium, iPhone WebKit y escritorio Chromium;
- axe está incluido en esa matriz y no reportó infracciones graves en las siete
  vistas centrales;
- Firestore Emulator: aprobado; los `PERMISSION_DENIED` visibles corresponden
  a operaciones negativas que las reglas deben rechazar;
- artifact web: 81 recursos con SHA-256, rutas profundas y service worker sin
  404 ni errores de página;
- Android Gradle 8.10.2/JDK 17: `assembleDebug` y `assembleRelease` aprobados;
- debug: 1.924.907 bytes, SHA-256
  `8B0438183AC9173B764CBFA86A97280D0ADE4AC5436083ECC6A53EA62761B35C`;
- release de prueba con firma efímera: 1.504.426 bytes, SHA-256
  `6AFD7A6CADC047EC4B42BB004B524CE24E90DF898751B146CE9FE83DCF9A60D4`,
  verificado con esquemas APK v1 y v2. No reemplaza el release firmado real;
- paridad web/Android aprobada con 496 IDs estáticos.

Verificación pública realizada el 28 de julio de 2026 antes de este commit:
GitHub Pages respondía 200, pero servía `2.7.0` build `79` y no tenía
`build-info.json`. Por tanto, el build 89 todavía no estaba publicado y no debe
afirmarse lo contrario. `gh auth status` indicó que no existe sesión CLI para
despachar el workflow estable.

`docs/physical-test-checklist.md` distingue automatización de hardware. Durante
este ciclo `adb devices -l` no detectó dispositivos: iPhone, Android Chrome,
APK instalado, widget y Gym Party con dos teléfonos siguen pendientes manuales.

Siguiente acción exacta: enviar este commit a `main`, esperar el quality gate
remoto, ejecutar manualmente **Publicar PWA en GitHub Pages** con canal
`stable`, repetir el smoke público y solo entonces considerar publicado el
build 89. La referencia `baseline-stable-2.7` debe apuntar al commit probado.

## 79. Despacho estable mediante línea base explícita

El commit `ab62fbf` fue enviado a `main` y el quality gate remoto
`30397932600` terminó correctamente. La sesión del navegador y `gh` no estaban
autenticadas para usar `workflow_dispatch`; no se accedió ni se expuso ningún
token almacenado.

`deploy-pages.yml` acepta ahora, además del despacho manual, exclusivamente
etiquetas `baseline-stable-*`. La etiqueta se interpreta como canal `stable`,
ejecuta el mismo quality gate completo y solo después permite el despliegue.
No existe disparador por ramas, por lo que un push normal a `main` sigue sin
sobrescribir la web estable. `scripts/test-quality-gate.mjs` y
`scripts/validate-app.ps1` verifican ese límite.

Siguiente acción exacta: validar y enviar este contrato, crear
`baseline-stable-2.7`, esperar el gate/despliegue y comprobar que la URL pública
sirve `2.7.0` build `89` con el commit etiquetado antes de declarar cerrada la
línea base.

## 80. Ajuste a la política del entorno Pages

La etiqueta `baseline-stable-2.7` disparó el run `30399703693`. El quality gate
terminó correctamente (346 E2E generales, 27 escenarios axe y 1 smoke del
artifact), pero GitHub rechazó el job de despliegue porque la política del
entorno `github-pages` no admite tags como rama de despliegue. No se publicó un
artifact parcial y la web estable permaneció en build 79.

El disparador explícito se trasladó a `.github/stable-release.json`. El workflow
solo escucha cambios de ese archivo en `main`, rama permitida por el entorno;
los pushes normales siguen sin publicar. El despacho manual `stable` permanece
disponible. El marcador contiene únicamente versión, build, canal y fecha, sin
secretos ni datos de usuario.

Siguiente acción exacta: enviar este commit, esperar el nuevo gate estable,
verificar build 89 en Pages y mover `baseline-stable-2.7` al commit publicado.

## 81. Línea base 2.7 publicada y cerrada

La solicitud versionada desde `main` produjo el run estable `30401061473` sobre
el commit `a8d3253359d7975ec37163e5dd7fd5a4846df658`. Terminó correctamente en
17 minutos y 14 segundos:

- Playwright del artifact: 1 aprobado;
- matriz Android Chromium, iPhone WebKit y escritorio: 346 aprobados y 14
  omisiones conocidas;
- axe: 27 aprobados;
- Firestore Emulator y Android debug/release de prueba incluidos en el gate;
- despliegue Pages: aprobado en 14 segundos;
- artifact `github-pages`: 494 KB, SHA-256
  `34f1f4a66f0a80bc1eef8c8fead5e4276bae93add3993bb48ca1ad2a5029005e`;
- artifact `protocolo-web-stable`: 518 KB, SHA-256
  `42468d1b9884166977b78166ae6dc65e45d4a027064f7cf52caeb8fa6529694e`;
- artifact `protocolo-android-debug-stable`: 1,7 MB, SHA-256
  `619c1dd27ce1902ffd9a58ceb7fabd22f6eb992cdb324a5854c6f08303248aee`.

La URL pública sirve `2.7.0`, build `89`, canal `stable`, commit `a8d3253` y
cache `protocolo-0-100-pwa-2.7.0-b89`. Se descargaron y verificaron los 81
recursos declarados en `asset-manifest.json`: 0 respuestas fallidas, 0 tamaños
incorrectos y 0 hashes divergentes. El smoke real abrió Acerca de, Gym,
Nutrición y Datos y copias sin activar recuperación; la consola pública quedó
sin warnings ni errores. El navegador que conservaba el build previo mostró el
aviso de actualización y, después de la acción explícita, abrió build 89 sin
mezcla de assets.

La etiqueta anotada `baseline-stable-2.7` apunta al commit publicado
`a8d3253359d7975ec37163e5dd7fd5a4846df658`. La única advertencia del run es la
deprecación futura de Node.js 20 en acciones oficiales de Pages; GitHub las
ejecutó con Node.js 24 y no afectó el resultado.

No se ejecutaron pruebas físicas en este cierre: `adb devices -l` no detectó
dispositivos. Siguen pendientes manualmente iPhone/Safari, Android Chrome/PWA,
APK instalado y actualización desde APK anterior, widget en launcher, voz y
Gym Party entre dos teléfonos. La checklist exacta está en
`docs/physical-test-checklist.md`. No debe atribuirse ningún resultado físico
hasta completarla.

## 82. Controles Android de acceso rapido V1 en rama beta

La rama `codex/android-quick-access-v1` parte de `main` build 89 y no modifica
la referencia estable `baseline-stable-2.7`. El bloque P0 reemplaza la logica
monolitica del widget por tres responsabilidades nativas:

- `WorkoutQuickActionReducer` procesa las mismas acciones para widget y
  notificacion;
- `WorkoutNativeRepository` conserva snapshot, revision y entregas procesadas;
- `WorkoutMutationQueue` mantiene hasta 200 mutaciones durables `pending`,
  `imported`, `rejected` o `undone` con UUID y cuarentena de entradas corruptas.

`NativeWorkoutControlRepository` escribe `save_set` antes de actualizar la UI,
valida la revision esperada, bloquea doble toque accidental durante 650 ms y
crea `undo_set` compensatorio durante diez segundos. Una confirmacion tardia
solo puede importar mutaciones que continuen `pending`, por lo que no reactiva
una serie ya deshecha. `gym/native-workout-importer.js` aplica y deshace por
`setId` de forma idempotente; despues de importar prepara la sincronizacion
existente de Gym Party, sin introducir Firebase nativo.

El widget usa `widget_workout_compact.xml`,
`widget_workout_standard.xml` y `widget_workout_expanded.xml`; los nombres
small/medium se conservan como aliases. La seleccion combina ancho y alto del
launcher. No hay controles de 1 dp, los botones funcionales miden 48 dp, el
compacto tiene hasta cuatro acciones y el estandar siete. Peso corporal no
muestra `0 kg`; tiempo y distancia abren el editor cuando no pueden corregirse
con seguridad desde `RemoteViews`.

`MainActivity.AndroidBridge` expone JSON estructurado para capacidades,
instalacion mediante `requestPinAppWidget`, cola pendiente, confirmacion por IDs
y ciclo de la notificacion. Gym contiene **Acceso rapido durante el
entrenamiento**; en web explica que se requiere el APK y en Android ofrece
**Agregar widget** y **Activar controles**. El permiso de notificaciones se
solicita solo desde esa accion; si ya fue rechazado se abren Ajustes de Android.

La notificacion usa canal de importancia baja, maximo tres acciones,
`VISIBILITY_PRIVATE` y una version publica que solo indica **Entrenamiento en
curso**. No usa full-screen intent ni declara widget keyguard. El descanso usa
reloj monotonico y `AlarmManager`; se recalibra tras reinicio. Fecha, zona
horaria y reemplazo de paquete refrescan las superficies.

Verificacion real del bloque hasta este punto:

- `scripts/test-native-workout-controls.mjs`: aprobado; ejecuta importacion,
  reentrega, deduplicacion, Deshacer y Deshacer repetido, ademas de contratos
  Android y layouts;
- importador nativo, guia de carga y `test-workout-features`: aprobados;
- Android `:app:assembleDebug` con JDK 17/Gradle 8.10.2: aprobado en 67 s;
- previews de los tres layouts en `docs/previews/`;
- hardware fisico: no disponible, todas las pruebas de launcher, bloqueo,
  permiso y reinicio siguen pendientes y no se consideran aprobadas.

Antes de cerrar la rama faltan sincronizar assets web/Android, incrementar una
sola vez el build beta, ejecutar gate completo, producir artifacts, actualizar
la checklist fisica, enviar la rama y abrir el pull request. No publicar stable.

## 83. Empaquetado beta 90 y validacion local

El bloque completo incrementa una sola vez `app-version.json`: version `2.7.0`,
build web/PWA `90` y Android `versionCode 34`. La solicitud estable
`.github/stable-release.json` permanece deliberadamente en build 89; la prueba
del quality gate permite que una beta este por delante, pero rechaza una
solicitud estable futura o de otra version. Por tanto esta rama no publica ni
solicita stable.

Resultados locales posteriores al empaquetado:

- version, cache `protocolo-0-100-pwa-2.7.0-b90` y Android 34 alineados;
- precache: 83 recursos descubiertos;
- artifact `dist-pages`: 84 recursos con SHA-256, rutas profundas y cero 404;
- smoke del artifact: 1/1, service worker instalado y sin errores de pagina;
- acceso rapido E2E: 6/6 en Android Chromium, iPhone WebKit y escritorio;
- axe: 27/27 en las tres plataformas, sin infracciones graves;
- contratos de Workout, datos, backup, PWA, Gym Party, Progreso, Nutricion,
  router, layout, Ajustes, seguridad Android y release: aprobados;
- Firestore Emulator: aprobado; los `PERMISSION_DENIED` del log corresponden a
  casos negativos que las reglas deben rechazar;
- paridad web/Android: aprobada con 496 IDs estaticos;
- Android `assembleDebug`: aprobado; APK de 1.874.536 bytes, SHA-256
  `E548DF5D59AA0243777D28654750FE1CF1D2C239E8B7A13D648BFF02E8AC0A72`.

El primer intento local de axe se cancelo por el timeout de cuatro minutos; la
repeticion con margen termino correctamente en 5,2 minutos. El primer intento
de Firestore no encontro Java en `PATH`; al incorporar el JDK 21 local, la
suite ejecuto y aprobo. No se ocultan estos intentos de entorno.

`adb devices -l` no detecto hardware. No se ejecutaron pruebas fisicas de
launcher, redimensionamiento, doble toque, bloqueo, permiso, proceso destruido,
reinicio o actualizacion desde APK anterior. Todas permanecen sin marcar en
`docs/physical-test-checklist.md`.

Siguiente accion exacta: commit del build 90, push de
`codex/android-quick-access-v1`, pull request draft, quality gate remoto beta y
descarga de sus artifacts. No fusionar a `main` ni publicar stable desde este
bloque.

## 84. Pull request y correccion del primer gate remoto

La rama se envio a GitHub y el pull request borrador es el numero 1,
`Android: controles rapidos de entrenamiento v1`. El primer quality gate remoto
fue el run `30481489857`. Completo correctamente contratos, PWA, axe y 349
escenarios E2E, con 14 omisiones documentadas, pero fallo antes de Firestore y
Android por tres ejecuciones del mismo escenario de borradores.

La causa no fue una regresion funcional: `tests/e2e/drafts-time.spec.mjs`
seleccionaba todos los `summary` descendientes de `planAdvancedEditor`. Tras
incorporar paneles anidados, el locator dejo de ser estricto. Ademas, la recarga
usada para probar persistencia vuelve a plegar el `details`, por lo que el test
intentaba pulsar un boton oculto. El escenario ahora selecciona el `summary`
directo con `:scope > summary` y reabre el panel despues de `page.reload()`.

Validacion local de la correccion:

- escenario afectado: 3/3 en Android Chromium, iPhone WebKit y escritorio;
- archivo completo `drafts-time.spec.mjs`: 18/18 en los tres proyectos;
- no se cambio la aplicacion ni se relajo la comprobacion de restauracion y
  limpieza del borrador.

Siguiente accion exacta: enviar este commit correctivo, esperar el nuevo quality
gate hasta Firestore, artifact web y Android, y registrar los artifacts. Las
pruebas fisicas siguen pendientes; no fusionar ni publicar stable.

## 85. Carrera de inicializacion IndexedDB detectada por CI

El segundo quality gate remoto fue el run `30483471213`. La correccion de
borradores quedo validada y la matriz avanzo a 351 escenarios aprobados con 14
omisiones, pero una ejecucion de escritorio fallo al recuperar la cache
nutricional. El fallo fue `Execution context was destroyed` entre
`page.reload()` y una llamada directa a `window.APP_DATA.ready()`; no hubo una
divergencia ni perdida de datos.

`tests/e2e/indexeddb-primary.spec.mjs` ya importaba el helper comun
`waitForAppReady`, que reintenta de forma acotada cuando una navegacion sustituye
el contexto. La recarga afectada ahora usa ese helper en lugar de una llamada
directa vulnerable a la carrera. Se mantienen todas las expectativas sobre
recuperacion, copia compatible en localStorage, aislamiento del historial y
rollback.

Validacion local:

- caso afectado repetido cinco veces en escritorio: 5/5;
- caso afectado en Android Chromium, iPhone WebKit y escritorio: 3/3.

El commit con esta correccion se envio y el siguiente gate completo alcanzo los
pasos que los dos runs anteriores no habian podido ejecutar.

## 86. Quality gate beta aprobado y artifacts remotos

El run remoto definitivo del codigo fue `30484923207`, sobre el commit
`6c3e63d`. Termino aprobado en 18 minutos y 6 segundos:

- axe: 27 escenarios aprobados;
- E2E funcional: 352 aprobados y 14 omitidos ya documentados;
- Firestore Emulator: aprobado;
- artifact web final y service worker: aprobados;
- Android debug y release de prueba: aprobados;
- paridad de assets: aprobada.

Artifacts del run:

- `protocolo-web-beta`, artifact `8737724132`, 539.956 bytes comprimidos;
- `protocolo-android-debug-beta`, artifact `8737724993`, 1.824.188 bytes
  comprimidos;
- APK descargado `protocolo-0-100-debug.apk`: 1.872.205 bytes, SHA-256
  `82646530DD7F4D146618484D9FDDE99281CE41061637FBFFD2948F0639F495F7`.

El pull request numero 1 permanece borrador. La rama no se fusiono, la etiqueta
`baseline-stable-2.7` no se movio y stable build 89 no se publico de nuevo. No
hubo hardware ADB conectado: todas las pruebas fisicas de widget, launcher,
bloqueo, notificacion, reinicio y actualizacion continúan pendientes en
`docs/physical-test-checklist.md`.

## 87. Correccion de widget estable y controles de bloqueo, beta 91

La correccion parte de `285eeef` y mantiene la rama
`codex/android-quick-access-v1`. Se incremento una sola vez el paquete beta a
version `2.7.0`, build web/PWA `91` y Android `versionCode 35`; stable continua
en build 89 y no se modifica la referencia `baseline-stable-2.7`.

Problemas confirmados y solucionados:

- `ensureSession()` creaba la sesion web pero no ejecutaba
  `syncWorkoutWidget()`. Android conservaba `sessionStatus: sin iniciar` y
  `WorkoutControlNotificationManager` cancelaba la notificacion. Ahora tocar
  **Empezar entrenamiento** publica inmediatamente `en progreso`.
- `WorkoutWidgetUpdateService.selectLayout()` usaba el maximo entre tamaños de
  orientaciones. El primer toque podia reconstruir un compacto como expandido.
  La seleccion usa el tamaño actual/minimo y reserva expandido para una altura y
  anchura realmente grandes.
- compacto queda en -5, Guardar, +5 y temporizador; estandar y expandido usan
  -5/+5 para carga. El expandido elimina Anterior, Abrir, Editar y la segunda
  pareja de ajustes rápidos. No hay controles de 1 dp ni botones menores a
  48 dp.
- `getWorkoutWidgetStatus()` diferencia `disabled`, `permission-required`,
  `waiting-for-session`, `active` y `not-posted`. El ultimo se basa en
  `NotificationManager.getActiveNotifications()`, no solo en tener permiso.
  **Revisar notificacion** abre directamente el canal Android **Controles de
  entrenamiento**.

Archivos funcionales principales: `workout-features.js`, `MainActivity.java`,
`WorkoutControlNotificationManager.java`, `WorkoutWidgetUpdateService.java` y
los layouts `widget_workout_compact.xml`, `widget_workout_standard.xml` y
`widget_workout_expanded.xml`. Los assets WebView están sincronizados; previews,
README, documentación Android y checklist física reflejan la interfaz nueva.

Resultados locales reales:

- version alineada: 2.7.0, Android 35, cache
  `protocolo-0-100-pwa-2.7.0-b91`;
- contratos nativos, guia de carga e importador idempotente: aprobados;
- artifact web: 84 recursos con hash y sin recursos faltantes;
- `validate-app.ps1 -CheckAndroidAssets`: aprobado, 496 IDs y paridad exacta;
- acceso rapido: 6/6 en Android Chromium, iPhone WebKit y escritorio Chromium;
- Android `:app:clean :app:assembleDebug`: aprobado con Java 17 y Gradle
  8.10.2; APK local de 1.875.449 bytes y SHA-256
  `7D7B9A80E3ED3587B987E55BE292A920440A22ED9A2DE58D17D9CC4E2B4CCE9E`.

El primer intento de compilacion detecto una referencia inexistente a `unit` en
el modelo visual; se agrego el campo derivado del snapshot y la recompilacion
paso. El primer validador general tambien conservaba la expectativa obsoleta de
`widgetPreviousButton`; ahora valida `widgetNextButton` y los limites reales.

No se detecto hardware con `adb devices -l`. Launcher, pantalla bloqueada,
canal OEM, reinicio y actualizacion desde APK anterior siguen pendientes de
prueba fisica. Para probar: instalar el APK, abrir **Gym > Rutina > Acceso rapido
durante el entrenamiento**, tocar **Activar controles**, aceptar notificaciones,
tocar **Empezar entrenamiento** y bloquear el telefono. Si aparece **Revisar
notificacion**, habilitar el canal en los ajustes que abre la app.

El primer intento del quality gate `30493302864` termino con 351 E2E aprobados,
14 omisiones y un unico fallo WebKit en el escenario de alimento personalizado.
Ese dominio no fue modificado; el caso paso localmente 5/5 al repetirlo. La
reejecucion completa (attempt 2, job `90720259439`) aprobo en 17 min 22 s:
352 E2E, 14 omisiones documentadas, 27 axe, Firestore Emulator, artifact web,
Android debug/release y paridad de assets.

Artifacts remotos del run:

- `protocolo-web-beta`, artifact `8741451912`, 540.292 bytes comprimidos;
- `protocolo-android-debug-beta`, artifact `8741452495`, 1.825.189 bytes
  comprimidos;
- APK extraido: 1.873.071 bytes, SHA-256
  `C686EEF45418D60B83C3AF06B4C23B4277EF2CB94302A48E9E6B6E4C0FF9FAEF`.

La prerelease publica, no estable, es
`v2.7.0-native-controls-v1-beta.4`. Su descarga directa fue comprobada sin
credenciales con HTTP 200:
`https://github.com/locoviera24-code/protocolo-0-100/releases/download/v2.7.0-native-controls-v1-beta.4/protocolo-0-100-v2.7.0-build91-android-quick-access-beta.apk`.
La etiqueta apunta al commit funcional `20df644`; el pull request 1 permanece
borrador, no se fusiono a main y stable build 89 no fue modificado.

## 88. Selector directo, paso de carga estable y bloqueo, beta 92

Este bloque mantiene `2.7.0`, incrementa una sola vez el build web/PWA a `92`
y Android a `versionCode 36`. La rama sigue siendo
`codex/android-quick-access-v1`; no se fusiono a `main`, no se movio
`baseline-stable-2.7` y stable build 89 permanece intacto.

Cambios funcionales:

- `WorkoutExercisePickerActivity` abre una lista nativa de todos los ejercicios
  de la rutina desde el nombre actual, desde **Elegir** en el widget y desde la
  accion **Ejercicio** de la notificacion. La seleccion usa el reducer comun y
  persiste el indice sin crear una serie ni abrir el WebView completo.
- Los botones de carga vuelven a usar `0,5 kg` por defecto. Tocar el valor de
  peso alterna el paso entre `0,5` y `5 kg`; no aparecen controles adicionales
  ni cambia el layout. El mismo contrato se aplica al registro web de Gym.
- `buildWorkoutWidgetState()` publica `exerciseLoadGuidance` por cada ejercicio.
  Al seleccionarlo, Android actualiza **Ultima** y **Max.** usando la guia
  comparable por ejercicio, equipo, modalidad y semantica de carga. El compacto
  utiliza su linea breve para esa guia; estandar y expandido la muestran aparte.
- La notificacion usa el canal nuevo `workout_controls_v5`, silencioso y de
  `IMPORTANCE_DEFAULT`. Los canales Android son inmutables; cambiar el ID evita
  heredar la prioridad baja de instalaciones anteriores. El permiso se solicita
  al activar controles o iniciar una sesion desde ese flujo, y **Configurar
  bloqueo** abre los ajustes exactos del canal.
- Android moderno no expone un widget keyguard general. La experiencia de
  bloqueo es la notificacion persistente `VISIBILITY_PRIVATE`, con version
  publica generica. El fabricante todavia puede exigir habilitar notificaciones
  en pantalla bloqueada; la app no afirma poder saltar esa politica.
- Gym reduce carga visual: resumen superior 2x2 en movil, rutina del dia plegada,
  registro primero, cuatro ajustes de carga visibles, una sola accion primaria Guardar,
  acciones contextuales compactas y configuracion Android/salud plegada.

Archivos principales: `workout-features.js`, `styles/gym.css`,
`WorkoutWidgetUpdateService.java`, `WorkoutQuickActionReducer.java`,
`WorkoutControlNotificationManager.java`, `WorkoutExercisePickerActivity.java`,
`AndroidManifest.xml`, los tres layouts RemoteViews, pruebas E2E/nativas y
`docs/previews/widget-workout-*.svg`.

Resultados locales reales del build 92:

- contratos completos de Workout, datos, backup, PWA, Gym Party, Nutricion,
  Progreso, seguridad Android y paridad: aprobados;
- axe: 27/27 en Android Chromium, iPhone WebKit y escritorio;
- E2E funcional: 355 aprobados, 14 omitidos por plataforma, 0 fallos, en 44 min;
- Firestore Emulator: aprobado; los `PERMISSION_DENIED` corresponden a casos
  negativos esperados por las reglas;
- artifact web: 84 recursos con hash, cero faltantes y smoke del service worker
  1/1;
- Android `assembleDebug` y `assembleRelease`: aprobados con Java 17/Gradle
  8.10.2. Debug final: 1.889.345 bytes, SHA-256
  `1281ACDCF34322B06C983EE1BC86E4C0C8C730281ACF5567912D76CCDBC97D1E`;
  release de prueba: 1.544.134 bytes, SHA-256
  `F9E9C5102F1BCC65DA404329748C2D3026A250E8DE6BB8CB3BD20B91FD120BDC`.

El primer intento E2E fue cortado por el limite local de 30 minutos sin resumen;
la repeticion con margen termino completa. No habia dispositivo en `adb devices
-l`: launcher real, visibilidad OEM en bloqueo, reinicio y actualizacion desde
APK anterior siguen pendientes y no se marcan como aprobados. La checklist
actualizada esta en `docs/physical-test-checklist.md`.

El quality gate remoto `30504161727` valido el commit funcional `55c9cf2`. Sus
dos primeros intentos encontraron dos timeouts intermitentes distintos y no
relacionados de Nutricion en iPhone WebKit; las matrices restantes aprobaron y
la repeticion local del archivo de recetas paso 30/30. El attempt 3 completo
termino verde con 355 E2E aprobados, 14 omisiones documentadas, 27 axe,
Firestore Emulator, artifact web, Android debug/release y paridad aprobados.

Artifacts del run:

- `protocolo-web-beta`, artifact `8745874268`, 541.783 bytes comprimidos;
- `protocolo-android-debug-beta`, artifact `8745874673`, 1.830.720 bytes
  comprimidos;
- APK extraido: 1.878.673 bytes, SHA-256
  `1EA9D7573653651F000CCA4675D6AAE53920A0682F1052C53477ECCD129B7E87`.

La prerelease publica no estable es `v2.7.0-native-controls-v1-beta.5`. La
descarga directa fue comprobada sin credenciales con HTTP 200 y el mismo hash:
`https://github.com/locoviera24-code/protocolo-0-100/releases/download/v2.7.0-native-controls-v1-beta.5/protocolo-0-100-v2.7.0-build92-android-quick-access-beta.apk`.
El tag apunta a `55c9cf2`; el pull request 1 sigue en borrador, no se fusiono a
`main` y stable build 89 no fue modificado.

Ese artifact debug quedo supersedido para instalacion por el APK release firmado
descrito a continuacion. No publicar stable hasta tener evidencia fisica.

### APK release firmado beta 6

El artifact debug de beta 5 sirve para validacion, pero la instalacion destinada
al usuario debe usar la firma release persistente. Se despacho
`build-release-apk.yml` sobre la rama y el run `30507861678` termino verde:
quality gate completo y job **Compilar APK firmado y publicar checksum**
aprobados. Creo la prerelease `v2.7.0-native-controls-v1-beta.6` con:

- APK firmado: 1.542.371 bytes;
- SHA-256:
  `F6D7AA50BC72D37DDBB5D8041FDB7BE6698825891162E398006624585FF26CB3`;
- descarga directa comprobada sin credenciales con HTTP 200:
  `https://github.com/locoviera24-code/protocolo-0-100/releases/download/v2.7.0-native-controls-v1-beta.6/protocolo-0-100-v2.7.0-release.apk`;
- checksum publico:
  `https://github.com/locoviera24-code/protocolo-0-100/releases/download/v2.7.0-native-controls-v1-beta.6/protocolo-0-100-v2.7.0-release.apk.sha256`.

El workflow creo inicialmente el tag sobre la rama predeterminada aunque habia
compilado el checkout correcto. Se movio el tag beta 6 a `a72266f` y se corrigio
`build-release-apk.yml` para usar `gh release create --target "$GITHUB_SHA"` en
futuros releases. Stable y `baseline-stable-2.7` siguen intactos.

Beta 6 queda conservada solo como antecedente y fue supersedida por la correccion
build 93 descrita a continuacion. No recomendarla para probar los controles.

### Correccion visible build 93

La auditoria posterior a beta 6 confirmo que la experiencia publicada no
coincidia con lo solicitado: el peso alternaba entre pasos de 0,5 y 5 al tocar
el valor, el selector directo no era evidente en todos los tamaños y el acceso
de bloqueo quedaba dentro de un bloque plegado. Ademas, una instalacion APK
actualizada podia seguir controlada por un service worker antiguo del origen
`appassets`, mostrando assets anteriores aunque el paquete contuviera archivos
nuevos.

El build 93 corrige esos contratos:

- los tres layouts RemoteViews muestran simultaneamente `-0,5`, `+0,5`, `-5`
  y `+5`; tocar el peso ya no cambia de layout ni despliega acciones;
- `Elegir · <ejercicio>` abre `WorkoutExercisePickerActivity` desde cualquier
  layout; la seleccion recalcula `Ultima` y `Max.` para ese ejercicio;
- `notification_workout_controls.xml` aporta la vista expandida privada con
  los mismos cuatro ajustes, reps, Guardar y selector directo;
- el canal `workout_controls_v5` evita heredar un canal anterior ocultado y
  `openWorkoutNotificationSettings()` garantiza que el canal exista;
- Gym muestra una barra visible de estado de pantalla de bloqueo junto al
  registro y publica explicitamente la sesion al iniciar;
- el registro web queda en una columna a 600 px o menos, con cuatro ajustes que
  caben a 320/390 px, serie calculada oculta y una sola accion primaria;
- `MainActivity.auditPackagedWebCache()` elimina solamente caches PWA del
  origen empaquetado y desregistra workers antiguos. No toca localStorage,
  IndexedDB ni backups; luego recarga los assets incluidos en el APK;
- el widget requiere como minimo 180 x 230 dp. Tras actualizar conviene quitarlo
  y volverlo a agregar para que el launcher aplique las nuevas dimensiones.

Archivos principales del bloque: `WorkoutWidgetUpdateService.java`,
`WorkoutControlNotificationManager.java`, `NativeWorkoutControlRepository.java`,
`MainActivity.java`, `widget_workout_compact.xml`,
`widget_workout_standard.xml`, `widget_workout_expanded.xml`,
`notification_workout_controls.xml`, `workout_widget_info.xml`,
`workout-features.js`, `styles/gym.css`, `styles/responsive.css`, pruebas y
previews de `docs/previews/`.

Resultados comprobados antes del gate final:

- version alineada `2.7.0`, Android `37`, build/cache `93`;
- contratos nativos, orientacion de carga, importador idempotente y Workout:
  aprobados;
- validacion con paridad Android y artifact web de 84 recursos sin 404:
  aprobada;
- regresion Playwright completa: 380 aprobadas y 14 omisiones en 51,1 min;
  aparecieron dos fallos aislados (viewport de la nueva prueba y conversion lb
  en WebKit). El contrato de viewport se corrigio y las repeticiones dirigidas
  terminaron 4/4; el caso WebKit no requirio cambios de producto;
- Playwright Android quick access posterior: 3/3 en Android Chromium, iPhone
  WebKit y Chromium escritorio con viewport movil explicito;
- Firestore Emulator: aprobado con las reglas actuales;
- Android `assembleDebug` y `assembleRelease`: aprobados con Java 17/Gradle
  8.10.2 despues de compilar la limpieza de cache empaquetada;
- APK local debug: 1.946.242 bytes, SHA-256
  `D892A4469E842167A1B128AD5C70A88B4C0032A4E61E7515F02B5FEE00DC8F72`;
- APK local release firmado solo con keystore de prueba: 1.547.952 bytes,
  SHA-256
  `2CC3770E9BEDED9E670C91BE1CCDFF1F08CADCB1E493B93727B7CF77625DD4B9`;
- inspeccion visual en 390 x 844: cuatro controles visibles, una columna y cero
  scroll horizontal;
- hardware Android conectado: ninguno; launcher, OEM y bloqueo real siguen
  expresamente pendientes en `docs/physical-test-checklist.md`.

La prerelease firmada beta 7, su checksum y los resultados del quality gate se
deben registrar aqui solamente despues de que GitHub Actions termine. No
fusionar a `main` ni publicar stable.
