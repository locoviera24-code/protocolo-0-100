# Protocolo 0->100

PWA y APK Android para medir habitos, atencion, actividad fisica y nutricion con el principio "Lo que no se mide no se mejora". Los datos funcionan primero de forma local y privada; no existe una cuenta ni un backend obligatorio.

## Modulos

- **Protocolo diario:** pantalla, sueno, lectura, actividad offline, accion clave, score y tendencias.
- **Gym:** rutinas, ejercicios por musculo, series, repeticiones, peso, RIR, volumen e historial.
- **Widget Android de gimnasio:** widget nativo de pantalla de inicio con rutina del dia, progreso y registro directo incremental de series.
- **Nutricion:** alimentos base curados, busqueda por alias, cantidades en gramos, comidas frecuentes, alimentos propios, asistente por texto/voz, hidratacion y metas editables.
- **USDA FoodData Central opcional:** busqueda paginada, detalle por `fdcId`, normalizacion por 100 g, cache offline e importador JSON.
- **Progreso integral:** scores separados e integral, Focus Coins no financieros, recompensas, rankings mensuales opcionales y referidos simulados.
- **Telefono Android:** importacion opcional de estadisticas de uso con permiso explicito.

## Arquitectura

La raiz del repositorio es la fuente de la PWA y tambien se sincroniza dentro del APK:

```text
index.html                  Interfaz, protocolo, gym y nutricion
workout-features.js         Rutina semanal, registro rapido, historial gym y estado del widget Android
nutrition-data.js           Base local estructurada de alimentos y nutrientes
fdc-client.js               Cliente opcional USDA FDC, normalizacion y cache
advanced-features.js        Cobertura, diagnostico, tendencias, backup y gamificacion
manifest.webmanifest        Configuracion instalable
sw.js                       Cache y funcionamiento offline
scripts/validate-app.ps1    Validaciones estructurales
scripts/test-service-worker.mjs Prueba de cache/offline/FDC
scripts/test-workout-features.mjs Prueba de rutina, widget e importacion directa
scripts/sync-web-assets.ps1 Sincronizacion web -> Android
android-native-wrapper/     Proyecto Android con WebView y widget nativo
.github/workflows/          Publicacion Pages, validacion y compilacion APK
```

`advanced-features.js` mantiene un estado consolidado con `schemaVersion: 3`. No se incluyen API keys en backups. El service worker usa navegacion `network-first`, conserva offline los assets principales y no intercepta llamadas FDC ni otros origenes.

## Widget Android de gimnasio

La PWA/GitHub Pages no puede crear widgets nativos. El widget real vive en el APK Android y usa `AppWidgetProvider`, `AppWidgetManager`, `RemoteViews` y `SharedPreferences`.

La app web sincroniza `weeklyWorkoutPlan`, `workoutSessions`, `exerciseHistory`, `exerciseLibrary`, `gymSettings` y `workoutWidgetState` mediante `AndroidBridge.saveWorkoutWidgetData(json)`. Si todavia no hay datos, Android usa la rutina predeterminada segun el dia actual.

Desde la pantalla de inicio el widget permite:

- ver el entrenamiento del dia;
- ver el ejercicio actual;
- subir/bajar repeticiones;
- subir/bajar kilos siempre en pasos de 0.5 kg;
- tocar **Guardar serie** sin abrir la app;
- tocar **Repetir** para cargar la ultima serie conocida;
- tocar **Atras** para volver al ejercicio anterior;
- tocar **Siguiente** para avanzar de ejercicio;
- abrir Gym / Entrenamiento de hoy o Registro rapido cuando hace falta una edicion completa.

Limitacion practica: `RemoteViews` no ofrece un formulario libre comodo con teclado, RIR/RPE y notas largas. Para eso el boton de abrir registro rapido sigue entrando directo a la pantalla completa. El registro directo del widget cubre el flujo estable de gimnasio: reps, kilos, guardar, repetir y siguiente.

Para agregarlo: instala el APK, manten presionada la pantalla de inicio, entra a **Widgets**, busca **Protocolo 0->100 · Gym** y agregalo. El widget pequeno ofrece guardado rapido minimo; el mediano muestra controles completos.

Rutina predeterminada: lunes Torso A, martes Pierna A, miercoles Torso B, jueves Pierna B, viernes Torso C, sabado descanso o actividad suave y domingo descanso o revision semanal. Dentro de **Gym** se puede editar la rutina semanal, copiar un dia a otro, restablecer la rutina predeterminada exacta, cambiar kg/lb, activar RIR/RPE y actualizar manualmente el widget.

## Desarrollo y validacion

Validar estructura:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1
node ./scripts/test-service-worker.mjs
node ./scripts/test-workout-features.mjs
```

Sincronizar la version web dentro del APK y comprobarla:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1 -CheckAndroidAssets
```

Compilar APK debug localmente requiere Java 17, Android SDK y Gradle:

```powershell
cd android-native-wrapper
gradle :app:assembleDebug --stacktrace
```

El APK resultante queda en `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk`. Tambien se publica por GitHub Actions como asset del release.

## Publicacion

- **PWA:** el workflow `Publicar PWA en GitHub Pages` publica los archivos raiz.
- **APK:** el workflow `Construir APK Android` compila el wrapper y publica la descarga directa de la version `v2.3.1`.

El APK generado es `debug`, apropiado para uso personal. Publicar en Play Store requiere una compilacion `release` firmada con una clave privada.

## Seguridad

La app usa lenguaje orientativo y no diagnostica deficiencias ni sustituye a entrenadores, nutricionistas, medicos u otros profesionales de salud. Ajusta cargas segun tecnica, dolor, fatiga y seguridad.

Focus Coins es solo gamificacion: no es dinero, inversion ni criptomoneda; no es transferible ni intercambiable por dinero. Referidos, conversiones, comisiones y rankings son simulaciones locales hasta conectar un backend real.
