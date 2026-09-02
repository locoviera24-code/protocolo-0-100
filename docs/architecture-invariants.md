# Invariantes de arquitectura

Cada contrato se vincula con enforcement existente. Esta matriz evita crear un
segundo test que pruebe lo mismo con otro nombre.

## INV-001 - WorkoutSessions es canonico

- **WHY:** evita historias divergentes y perdida/duplicacion de series.
- **SOURCE OF TRUTH:** `data/schema-registry.js` (`workout:sessions`) y
  `workout-features.js`.
- **CURRENT ENFORCEMENT:** `APP_DATA` rechaza claves no registradas; el legacy se
  migra una vez.
- **TEST/GATE:** `scripts/test-schema-registry.mjs`,
  `tests/e2e/gym-canonical.spec.mjs`, `scripts/validate-app.ps1`.
- **FAILURE CONSEQUENCE:** Progreso, Home, backup y Android observarian
  historiales distintos.

## INV-002 - SAVE_SET es idempotente

- **WHY:** una reentrega nativa o doble evento no puede duplicar una serie.
- **SOURCE OF TRUTH:** contrato schema 1, `mutationId` y el importador nativo.
- **CURRENT ENFORCEMENT:** reducer/cola Android y deduplicacion del importador.
- **TEST/GATE:** `scripts/test-native-workout-importer.mjs`,
  `scripts/test-native-workout-controls.mjs`,
  `WorkoutQuickActionContractTest.java` y `scripts/test-workout-features.mjs`.
- **FAILURE CONSEQUENCE:** volumen, records e historial incorrectos.

## INV-003 - Home es una proyeccion

- **WHY:** el CTA diario no debe crear otro modelo Workout ni escribir al render.
- **SOURCE OF TRUTH:** `app/gym-home-state.js` sobre plan, sesiones y borrador.
- **CURRENT ENFORCEMENT:** selector puro; acciones delegan al logger/router.
- **TEST/GATE:** `scripts/test-gym-home-state.mjs` (inputs congelados) y
  `tests/e2e/gym-first-home.spec.mjs`.
- **FAILURE CONSEQUENCE:** sesiones duplicadas o estado Home incoherente.

## INV-004 - Toda key Web estructurada esta registrada

- **WHY:** ownership, validacion, retencion y backup deben ser auditables.
- **SOURCE OF TRUTH:** `data/schema-registry.js`.
- **CURRENT ENFORCEMENT:** `APP_DATA.write` falla para claves desconocidas.
- **TEST/GATE:** `scripts/test-schema-registry.mjs` escanea el runtime y valida
  unicidad, dominio, sensibilidad y backup.
- **FAILURE CONSEQUENCE:** datos invisibles para backup/reset/migracion.

## INV-005 - Backup schema cambia de forma controlada

- **WHY:** una importacion nunca debe borrar o reinterpretar datos en silencio.
- **SOURCE OF TRUTH:** entrada `backup:versionedState` y
  `data/backup-service.js`.
- **CURRENT ENFORCEMENT:** validacion de schemas futuros, sanitizacion, preview,
  snapshot y rollback.
- **TEST/GATE:** `scripts/test-backup-service.mjs`,
  `scripts/test-data-integrity.mjs`, `tests/e2e/backup-import.spec.mjs`.
- **FAILURE CONSEQUENCE:** backup incompatible o perdida de datos.

## INV-006 - Browser/PWA no pueden hacerse pasar por APK

- **WHY:** capacidades y permisos nativos requieren un bridge real.
- **SOURCE OF TRUTH:** `app/platform-capabilities.js`.
- **CURRENT ENFORCEMENT:** APK confiable exige `AndroidBridge.getAppInfo` como
  funcion.
- **TEST/GATE:** `scripts/test-platform-capabilities.mjs` cubre browser, PWA,
  objetos vacios, incompletos y spoof.
- **FAILURE CONSEQUENCE:** UI falsa y llamadas a capacidades inexistentes.

## INV-007 - Assets Web y Android son identicos

- **WHY:** el APK debe ejecutar el mismo candidato validado en Web.
- **SOURCE OF TRUTH:** archivos Web de la raiz.
- **CURRENT ENFORCEMENT:** `scripts/sync-web-assets.ps1` y su modo `-Check`.
- **TEST/GATE:** `scripts/validate-app.ps1 -CheckAndroidAssets` dentro del quality
  gate.
- **FAILURE CONSEQUENCE:** APK con codigo o metadata de otro build.

## INV-008 - Stable no avanza por un commit de desarrollo

- **WHY:** `main` candidato y produccion tienen ciclos distintos.
- **SOURCE OF TRUTH:** `app-version.json` frente a
  `.github/stable-release.json`.
- **CURRENT ENFORCEMENT:** Pages solo por metadata alineada; Android solo por
  dispatch, identidad canonica e inmutabilidad.
- **TEST/GATE:** `scripts/test-version-alignment.mjs`,
  `scripts/test-pages-release.mjs`, `scripts/test-android-release.mjs` y
  `scripts/test-quality-gate.mjs`.
- **FAILURE CONSEQUENCE:** publicacion accidental o sobrescritura de release.

## INV-009 - Pantalla bloqueada no filtra entrenamiento

- **WHY:** peso, reps, ejercicio, rutina y notas son sensibles en bloqueo seguro.
- **SOURCE OF TRUTH:** `WorkoutControlNotificationManager.publicVersion()`.
- **CURRENT ENFORCEMENT:** notificacion publica generica y visibilidad privada.
- **TEST/GATE:** `scripts/test-native-workout-controls.mjs` inspecciona titulo,
  texto y ausencia de campos sensibles.
- **FAILURE CONSEQUENCE:** exposicion de datos en la pantalla bloqueada.

## INV-010 - Cache PWA activa un build coherente

- **WHY:** no mezclar HTML de un build con JS/CSS de otro.
- **SOURCE OF TRUTH:** `app-version.json`, precache generado y `sw.js`.
- **CURRENT ENFORCEMENT:** staging, hashes, recursos requeridos y activacion
  consentida.
- **TEST/GATE:** `test:precache`, `scripts/test-service-worker.mjs` y artifact
  Web E2E del quality gate.
- **FAILURE CONSEQUENCE:** app rota u operaciones ejecutadas con contratos mixtos.

## Contratos aun no convertidos en invariantes verdes

El baseline contiene escrituras derivadas en `syncVersionedState()` y una
inicializacion implicita en `gym-party.js::settings()`. Se registran como deuda,
no como tests rojos ni como excepciones permitidas para codigo nuevo.
