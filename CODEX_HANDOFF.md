# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion del handoff: 2026-06-23
Rama principal: `main`
Version web/Android actual: `2.3.0`
Esquema de datos consolidado: `3`
Cache actual del service worker: `protocolo-0-100-pwa-v12`

## 1. Estado actual

La app es una PWA instalable compatible con GitHub Pages y un APK Android con
WebView. La raiz del repositorio es la fuente de verdad web; los assets se
copian a `android-native-wrapper/app/src/main/assets/` con
`scripts/sync-web-assets.ps1`.

Modulos activos:

- Protocolo diario: pantalla, sueno, lectura, actividad offline, accion clave,
  score, historial y tendencias.
- Gym: rutina semanal editable, entrenamiento del dia, registro rapido,
  historial por ejercicio, volumen y score gym.
- Widget Android nativo: rutina del dia, controles directos reps/kg, guardar
  serie desde pantalla de inicio, repetir ultima serie y siguiente ejercicio.
- Nutricion: alimentos locales, asistente texto/voz, objetivos, cobertura,
  diagnostico orientativo y FoodData Central opcional.
- Backup/importacion: snapshot `schemaVersion: 3`, CSV y migraciones seguras.
- PWA/offline: manifest relativo, service worker acotado y cache versionado.

El APK publicado es debug/personal. Para Play Store hace falta release firmado.

## 2. Archivos clave

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | UI principal, navegacion, protocolo, gym legacy, nutricion y puentes base. |
| `workout-features.js` | Rutina semanal, registro rapido, historial gym, estado del widget e importacion de registros nativos. |
| `advanced-features.js` | Version app, backup v3, cobertura, diagnostico, FDC, coins, rankings y recompensas. |
| `sw.js` | Cache PWA `protocolo-0-100-pwa-v12`, navegacion network-first y assets principales. |
| `manifest.webmanifest` | Metadata PWA para GitHub Pages. |
| `scripts/sync-web-assets.ps1` | Copia assets web al wrapper Android. |
| `scripts/validate-app.ps1` | Contratos estructurales web, PWA, backup, widget y assets Android. |
| `scripts/test-workout-features.mjs` | Rutina semanal, no sobrescritura, estado widget e importacion directa desde Android. |
| `android-native-wrapper/app/src/main/java/com/protocolo/cien/MainActivity.java` | WebView, `AndroidBridge`, intents de widget y puentes Android. |
| `android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetProvider.java` | `AppWidgetProvider` y dispatch de acciones directas. |
| `android-native-wrapper/app/src/main/java/com/protocolo/cien/WorkoutWidgetUpdateService.java` | Render `RemoteViews`, mutacion `SharedPreferences`, guardado directo de series y fallback por dia. |
| `android-native-wrapper/app/src/main/res/layout/widget_workout_small.xml` | Widget compacto con guardado rapido minimo. |
| `android-native-wrapper/app/src/main/res/layout/widget_workout_medium.xml` | Widget mediano con controles reps/kg, guardar, repetir y siguiente. |
| `android-native-wrapper/app/src/main/res/xml/workout_widget_info.xml` | Metadata para aparecer en Widgets del launcher. |
| `.github/workflows/build-debug-apk.yml` | Compila APK debug y publica release `v2.3.0`. |

No editar manualmente `android-native-wrapper/app/src/main/assets/*`; cambiar
la raiz web y ejecutar la sincronizacion.

## 3. Widget Android directo

El widget real vive en el APK, no en GitHub Pages. Usa:

- `AppWidgetProvider`
- `AppWidgetManager`
- `RemoteViews`
- `SharedPreferences`
- `AndroidBridge.saveWorkoutWidgetData(json)`
- `AndroidBridge.getWorkoutWidgetData()`
- `AndroidBridge.updateWorkoutWidget()`

Acciones principales:

- `ACTION_OPEN_TODAY_WORKOUT`: abre Gym / Entrenamiento de hoy.
- `ACTION_QUICK_LOG_SET`: abre Registro rapido en la app.
- `ACTION_REFRESH_WORKOUT_WIDGET`: refresca RemoteViews.
- `ACTION_WIDGET_REPS_DOWN` / `ACTION_WIDGET_REPS_UP`: ajusta reps desde el widget.
- `ACTION_WIDGET_WEIGHT_DOWN` / `ACTION_WIDGET_WEIGHT_UP`: ajusta kilos en pasos de 2.5 kg.
- `ACTION_WIDGET_SAVE_SET`: guarda serie directamente en `SharedPreferences`.
- `ACTION_WIDGET_REPEAT_LAST`: carga ultima serie conocida.
- `ACTION_WIDGET_NEXT_EXERCISE`: avanza al siguiente ejercicio.

Limitacion aceptada: `RemoteViews` no ofrece teclado/formulario libre estable
para RIR/RPE y notas largas. El widget si registra directamente reps/kg y crea
o actualiza la sesion; la pantalla completa sigue existiendo para detalles.

El JSON compartido `workoutWidgetState` usa `schemaVersion: 2` e incluye:

- rutina semanal (`weeklyWorkoutPlan`);
- resumen del dia;
- ejercicios con sets;
- `quickLog` con reps, peso, unidad, set actual y ejercicio actual;
- `workoutSession` importable por la web;
- `exerciseHistory`;
- `lastNativeMutationAt` y `lastNativeMutationSource: "android-widget-direct"`.

Cuando la WebView abre o renderiza Gym, `workout-features.js` llama
`AndroidBridge.getWorkoutWidgetData()`. Si encuentra una mutacion nativa mas
nueva, importa `workoutSession` y `exerciseHistory` a `localStorage` antes de
volver a sincronizar hacia Android. Esto evita perder series guardadas desde el
launcher.

## 4. Rutina predeterminada

Se crea solo si no existe `weeklyWorkoutPlan`. No sobrescribir rutinas editadas.
El boton `Restablecer rutina predeterminada` vuelve a cargar la rutina exacta.

- Lunes: Torso A.
- Martes: Pierna A.
- Miercoles: Torso B.
- Jueves: Pierna B.
- Viernes: Torso C.
- Sabado: descanso / actividad suave.
- Domingo: descanso / revision semanal.

Torso incluye Peck deck, Press de banca, Dominadas, Jalon al pecho sentado,
Laterales en polea, Press militar en maquina, Curl martillo, Curl con barra Z
sentado y Extension de triceps en polea. Pierna incluye Prensa, Extension de
cuadriceps, Aductores, Pantorrillas sentado y Tibial anterior.

## 5. Persistencia

Claves principales en `localStorage`:

- `protocolo_0_100_tracker_v1`
- `protocolo_0_100_gym_sessions_v1`
- `protocolo_0_100_weekly_workout_plan_v1`
- `protocolo_0_100_workout_sessions_v1`
- `protocolo_0_100_exercise_history_v1`
- `protocolo_0_100_exercise_library_v1`
- `protocolo_0_100_gym_settings_v1`
- `protocolo_0_100_workout_widget_state_v1`
- `protocolo_0_100_nutrition_entries_v1`
- `protocolo_0_100_state_v2` con `schemaVersion: 3`

No renombrar ni borrar claves sin migracion explicita. El backup completo debe
seguir incluyendo rutina, sesiones, historial, biblioteca, ajustes y estado de
widget. La configuracion FDC/API key no debe exportarse.

## 6. Validacion

Comandos esperados:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
node .\scripts\test-service-worker.mjs
node .\scripts\test-workout-features.mjs
git diff --check
```

Compilacion local APK:

```powershell
cd android-native-wrapper
gradle :app:assembleDebug --stacktrace
```

Si Java/Gradle no estan instalados localmente, la compilacion se verifica en
GitHub Actions con Java 17, Android SDK 35 y Gradle 8.10.2.

## 7. Pruebas manuales criticas

1. Instalar APK `v2.3.0`.
2. Agregar widget `Protocolo 0->100 · Gym`.
3. Confirmar que muestra rutina del dia.
4. Ajustar reps y kilos desde el widget.
5. Tocar `Guardar serie` sin abrir la app.
6. Confirmar que suben series/progreso en el widget.
7. Tocar `Repetir` y guardar otra serie.
8. Tocar `Siguiente` y confirmar cambio de ejercicio.
9. Abrir app desde el widget y confirmar que la sesion aparece en Gym.
10. Exportar backup y confirmar `workoutSessions`, `exerciseHistory` y `workoutWidgetState`.
11. Importar backup en perfil limpio y confirmar restauracion.
12. Revisar PWA/GitHub Pages para confirmar que nutricion, habitos, score y offline no se rompieron.

## 8. Reglas de continuidad

- No reescribir toda la app.
- Mantener orden de scripts: `nutrition-data.js`, `fdc-client.js`, script inline
  de `index.html`, `workout-features.js`, `advanced-features.js`.
- No editar assets Android generados sin sincronizar desde raiz.
- No borrar datos previos de nutricion, habitos, score, pantalla, sueno,
  lectura, gym ni backups.
- Mantener lenguaje no culpabilizante: "segun lo registrado", "prioriza
  tecnica", "si estas fatigado, mantener carga tambien cuenta".
- No convertir Focus Coins/referidos/rankings mock en dinero o promesa de valor.

## 9. Pendientes razonables

- Probar manualmente el widget en launchers reales.
- Agregar pruebas instrumentadas Android para `WorkoutWidgetUpdateService`.
- Crear APK release firmado si se distribuye fuera de uso personal.
- Migrar datos voluminosos a IndexedDB.
- Implementar backend/proxy para FDC antes de uso publico con API key.
