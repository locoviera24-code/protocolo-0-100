# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion: 2026-06-24
Rama esperada: `main`
Version actual: `2.4.1`
Android: `versionCode 13`, `versionName "2.4.1"`
Service worker cache: `protocolo-0-100-pwa-v16`
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
- PWA offline con cache v16.
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
  Auth anonimo, Firestore y reglas. La config puede llegar por `firebase-config.js`
  generado desde GitHub Secrets o por JSON pegado en la app. Sin configuracion,
  funciona demo/local.
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
- `gym-party.js`: nuevo modulo Gym Party.
- `advanced-features.js`: version `2.4.1`, backup/importacion Gym Party.
- `sw.js`: cache v16 e incluye `gym-party.js`.
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
  permite acceso universal desde archivos locales para que WebView pueda usar
  Firebase/FDC desde assets locales.
- `android-native-wrapper/app/build.gradle`: `versionCode 13`,
  `versionName 2.4.1`.
- `android-native-wrapper/app/src/main/assets/*`: sincronizado desde raiz.

Scripts/workflows:

- `scripts/sync-web-assets.ps1`: copia `firebase-config.js` y `gym-party.js`.
- `scripts/write-firebase-config.ps1`: genera `firebase-config.js` desde
  variables `FIREBASE_*` si existen.
- `scripts/validate-app.ps1`: valida contratos Gym Party y config Firebase.
- `scripts/test-gym-party.mjs`: prueba demo, multi-miembro, estadisticas y
  backup/importacion.
- `.github/workflows/*.yml`: corren `test-gym-party.mjs`.
- `.github/workflows/deploy-pages.yml`: publica `workout-features.js`,
  `firebase-config.js` y `gym-party.js`.
- `.github/workflows/build-debug-apk.yml`: release objetivo `v2.4.1`.

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
  `Crear codigo para mi amigo` y `Entrar con codigo`.
- Si `firebase-config.js` trae config real, el backend online queda
  preseleccionado con inputs hidden; el usuario no ve el selector tecnico.
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

- nombre/codigo/miembros/sync;
- copiar/enviar codigo;
- salir de sala;
- sincronizar ahora;
- exportar CSV comparativo;
- exportar mis datos compartidos JSON;
- Yo vs Amigo cuando hay dos miembros;
- vista de grupo para 3 a 10 miembros;
- volumen semanal;
- series semanales;
- sesiones por semana;
- cambio vs semana anterior;
- progreso por ejercicio;
- volumen por musculo;
- retos sanos opcionales.

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
- APK usa WebView local y permiso Internet; probar Firebase en dispositivo real.
- No hay Google login ni email/password en el MVP; se priorizo Auth anonimo.
- No hay Cloud Functions ni contador transaccional fuerte para `membersCount`;
  para uso serio con muchas altas simultaneas, agregar transacciones.
- `index.html` sigue monolitico.
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

- Probar Firebase real con dos cuentas anonimas.
- Probar iPhone/Safari/PWA con codigo de invitacion.
- Probar APK con Firebase desde WebView.
- Validar `firebase/firestore.rules` en emulator.
- Agregar Auth email/password opcional.
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
11. Si se publica APK, esperar workflow `Construir APK Android` y release
    `v2.4.1`.

## 16. Como probar la app

Automatico:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
node .\scripts\test-service-worker.mjs
node .\scripts\test-workout-features.mjs
node .\scripts\test-gym-party.mjs
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
2. Usuario A usa `Crear codigo para mi amigo`.
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

GitHub Actions publica release `v2.4.1` si se empuja a `main`.

## 18. Como configurar Firebase

Ver `firebase/README.md`.

Resumen:

1. Crear proyecto Firebase.
2. Activar Auth Anonymous.
3. Crear Firestore production.
4. Cargar config web por GitHub Secrets o en Gym Party.
5. Publicar `firebase/firestore.rules`.
6. Probar login anonimo.
7. Crear sala.
8. Invitar segundo usuario por codigo.

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
