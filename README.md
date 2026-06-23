# Protocolo 0→100

PWA y APK Android para medir hábitos, atención, actividad física y nutrición con el principio **“Lo que no se mide no se mejora”**. Los datos funcionan primero de forma local y privada; no existe una cuenta ni un backend obligatorio.

## Módulos

- **Protocolo diario:** pantalla, sueño, lectura, actividad offline, acción clave, score y tendencias.
- **Gym:** rutinas, ejercicios por músculo, series, repeticiones, peso, RIR, volumen e historial.
- **Nutrición:** 71 alimentos base curados, búsqueda por alias, cantidades en gramos, comidas frecuentes, alimentos propios, asistente por texto/voz, hidratación y metas editables.
- **USDA FoodData Central opcional:** búsqueda paginada, detalle por `fdcId`, normalización por 100 g, caché offline e importador JSON de datasets descargados.
- **Cobertura nutricional:** barras de macros, vitaminas y minerales; diagnóstico diario orientativo, alimentos recomendados y tendencias semanales/mensuales.
- **Progreso integral:** scores separados e integral, Focus Coins no financieros, recompensas, rankings mensuales opcionales y referidos simulados.
- **Teléfono Android:** importación opcional de estadísticas de uso con permiso explícito.
- **Widget Android de gimnasio:** widget nativo de pantalla de inicio con rutina del día, progreso y acceso al registro rápido de series.

## Arquitectura web

La raíz del repositorio es la fuente de la PWA y también se sincroniza dentro del APK:

```text
index.html                  Interfaz, núcleo del protocolo, gym y asistente
workout-features.js         Rutina semanal, registro rápido, historial gym y estado del widget Android
nutrition-data.js           Base local estructurada de alimentos y nutrientes
fdc-client.js               Cliente opcional USDA FDC, normalización y caché
advanced-features.js        Cobertura, diagnóstico, tendencias, backup y gamificación
manifest.webmanifest        Configuración instalable
sw.js                       Cache y funcionamiento offline
scripts/validate-app.ps1    Validaciones estructurales
scripts/test-service-worker.mjs Prueba ejecutable de cache/offline/FDC
scripts/sync-web-assets.ps1 Sincronización web -> Android
android-native-wrapper/     Proyecto Android
.github/workflows/          Publicación Pages y compilación APK
```

`advanced-features.js` mantiene un estado consolidado con `schemaVersion: 3`, migra los datos locales anteriores y restaura todos los campos del backup completo. Los alimentos preparados y regionales incluyen nivel de confianza y fuente; varios valores son aproximados y pueden editarse.

La integración FoodData Central es híbrida:

1. busca primero en la base local curada;
2. después en `cachedFdcFoods`;
3. consulta FDC únicamente si el usuario configuró una API key personal o un backend/proxy.

No hay ninguna API key dentro del repositorio. La clave personal, si se usa, queda en el `localStorage` del dispositivo y no se incluye en backups. Para producción debe usarse un backend que proteja la clave. Los datasets FDC no forman parte del bundle; el importador JSON es opcional y limita la cantidad almacenada para cuidar rendimiento.

El service worker usa navegación `network-first`, conserva offline únicamente los assets principales de la app y no intercepta llamadas FDC ni otros orígenes. Los workflows validan contratos web, PWA, widget Android y assets Android antes de publicar.

## Widget Android de gimnasio

La PWA/GitHub Pages no puede crear widgets nativos. El widget real vive en el APK Android y usa `AppWidgetProvider`, `AppWidgetManager`, `RemoteViews` y `SharedPreferences`.

La app web guarda `weeklyWorkoutPlan`, `workoutSessions`, `exerciseHistory`, `exerciseLibrary`, `gymSettings` y `workoutWidgetState`. En Android, `AndroidBridge.saveWorkoutWidgetData(json)` sincroniza un resumen mínimo para que el widget lo lea aunque la app no esté abierta. Si todavía no hay datos, el widget usa la rutina predeterminada según el día actual.

Para agregarlo: instalá el APK, mantené presionada la pantalla de inicio, entrá a **Widgets**, buscá **Protocolo 0→100 · Gym** y agregalo. Los botones abren directamente Gym / Entrenamiento de hoy o Registro rápido de serie.

Rutina predeterminada: lunes Torso A, martes Pierna A, miércoles Torso B, jueves Pierna B, viernes Torso C, sábado descanso o actividad suave y domingo descanso o revisión semanal. Android `RemoteViews` no es cómodo para editar reps/kg dentro del widget, por eso el registro rápido se abre dentro de la app.

Dentro de la app, en **Gym**, se puede editar la rutina semanal, copiar un día a otro, restablecer la rutina predeterminada exacta, cambiar kg/lb, activar RIR/RPE y actualizar manualmente el widget. El registro rápido guarda ejercicio actual, número de serie, repeticiones, kilos o lastre, peso corporal, RIR/RPE opcional y nota; al finalizar calcula duración, series, volumen, cumplimiento e historial por ejercicio.

## Seguridad

La app usa lenguaje orientativo y no diagnostica deficiencias ni sustituye a nutricionistas, médicos u otros profesionales de salud. No premia restricción extrema, déficit agresivo, sueño insuficiente u obsesión.

Focus Coins es solo gamificación: no es dinero, inversión ni criptomoneda; no es transferible ni intercambiable por dinero. Referidos, conversiones, comisiones y rankings son simulaciones locales hasta conectar un backend real.

## Desarrollo y validación

Validar estructura:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1
node ./scripts/test-service-worker.mjs
```

Sincronizar la versión web dentro del APK y comprobarla:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1 -CheckAndroidAssets
```

Compilar APK debug localmente requiere Java 17, Android SDK y Gradle:

```powershell
cd android-native-wrapper
gradle :app:assembleDebug --stacktrace
```

El APK resultante queda en `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk`. Para instalarlo manualmente puede usarse Android Studio, `adb install -r app-debug.apk` o la descarga del release de GitHub Actions.

## Publicación

- **PWA:** el workflow `Publicar PWA en GitHub Pages` publica los archivos raíz.
- **APK:** el workflow `Construir APK Android` compila el wrapper y publica la descarga directa de la versión `v2.2.0`.

El APK generado es `debug`, apropiado para uso personal. Publicar en Play Store requiere una compilación `release` firmada con una clave privada.

Fuente ampliada: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.
