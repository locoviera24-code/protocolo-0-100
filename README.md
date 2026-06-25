# Protocolo 0->100

PWA y APK Android para medir habitos, atencion, actividad fisica y nutricion con el principio "Lo que no se mide no se mejora". Los datos funcionan primero de forma local y privada; no existe una cuenta ni un backend obligatorio.

## Modulos

- **Protocolo diario:** pantalla, sueno, lectura, actividad offline, accion clave, score y tendencias.
- **Gym:** rutinas, ejercicios por musculo, series, repeticiones, peso, RIR, volumen e historial.
- **Widget Android de gimnasio:** widget nativo de pantalla de inicio con rutina del dia, progreso y registro directo incremental de series.
- **Gym Party:** sala privada opcional para compartir entrenamientos, comparar progreso semanal/mensual y probar graficas en modo demo.
- **Nutricion:** alimentos base curados, busqueda por alias, cantidades en gramos, comidas frecuentes, alimentos propios, asistente por texto/voz, hidratacion y metas editables.
- **USDA FoodData Central opcional:** busqueda paginada, detalle por `fdcId`, normalizacion por 100 g, cache offline e importador JSON.
- **Progreso integral:** scores separados e integral, Focus Coins no financieros, recompensas, rankings mensuales opcionales y referidos simulados.
- **Telefono Android:** importacion opcional de estadisticas de uso con permiso explicito.

## Arquitectura

La raiz del repositorio es la fuente de la PWA y tambien se sincroniza dentro del APK:

```text
index.html                  Interfaz, protocolo, gym y nutricion
workout-features.js         Rutina semanal, registro rapido, historial gym y estado del widget Android
firebase-config.js          Stub seguro; GitHub Actions puede generar config Firebase publica
gym-party.js                Sala Gym Party, demo local, privacidad, Firebase opcional y comparativas
nutrition-data.js           Base local estructurada de alimentos y nutrientes
fdc-client.js               Cliente opcional USDA FDC, normalizacion y cache
advanced-features.js        Cobertura, diagnostico, tendencias, backup y gamificacion
manifest.webmanifest        Configuracion instalable
sw.js                       Cache y funcionamiento offline
scripts/validate-app.ps1    Validaciones estructurales
scripts/test-service-worker.mjs Prueba de cache/offline/FDC
scripts/test-workout-features.mjs Prueba de rutina, widget e importacion directa
scripts/test-gym-party.mjs  Prueba de demo, multi-miembro, estadisticas y backup Gym Party
scripts/sync-web-assets.ps1 Sincronizacion web -> Android
scripts/write-firebase-config.ps1 Genera firebase-config.js desde secrets FIREBASE_*
android-native-wrapper/     Proyecto Android con WebView y widget nativo
firebase/                   Reglas, esquema y configuracion ejemplo para Gym Party
.github/workflows/          Publicacion Pages, validacion y compilacion APK
```

`advanced-features.js` mantiene un estado consolidado con `schemaVersion: 3`. No se incluyen API keys en backups. El service worker usa navegacion `network-first`, conserva offline los assets principales y no intercepta llamadas FDC ni otros origenes.

## Gym Party

Gym Party es una sala privada y opcional para compartir entrenamientos de gym y
comparar progreso semanal/mensual. Funciona en Android, iPhone/iOS desde
Safari/PWA, navegador web y APK Android. No depende de `AndroidBridge`.

Estados principales:

- sin sala: crear Gym Party, unirse con codigo o probar demo;
- crear sala: nombre, alias, privacidad y backend local/Firebase;
- unirse: codigo de invitacion, alias y consentimiento;
- dashboard: miembros, codigo, sincronizacion, comparativas, graficas, ultimas
  sesiones compartidas, privacidad y exportacion.

Acceso rapido:

- boton **Gym Party** fijo en la barra superior;
- tarjeta **Entrenar con un amigo** en la pantalla principal;
- tarjeta **Sesion privada compartida** dentro de Gym.

Flujo recomendado:

1. Tocar **Gym Party**.
2. En **Crear codigo para mi amigo**, escribir alias y crear codigo.
3. Tocar **Enviar codigo** o **Copiar codigo**.
4. El amigo abre el link/codigo desde iPhone, Safari o PWA.
5. En **Entrar con codigo**, escribe alias y entra a la sala.

El minimo esta pensado para 2 personas, pero internamente usa `members[]`,
`partyId`, `userId`, sesiones y series por usuario. El limite recomendado es
`MAX_GYM_PARTY_MEMBERS = 10`.

Datos compartidos por defecto:

- alias;
- entrenamientos;
- ejercicios;
- series;
- repeticiones;
- kilos;
- volumen;
- fecha;
- duracion;
- progreso semanal.

No se comparte por defecto nutricion, sueno, ansiedad, pantalla, peso corporal,
notas privadas, correo visible ni datos personales.

### Modo demo

En **Gym Party > Probar modo demo** se generan datos ficticios de 2 a 4 semanas
para `Yo`, `Amigo` y opcionalmente mas miembros. Sirve para probar UI, graficas,
comparacion semanal, volumen por musculo y progreso por ejercicio antes de
configurar Firebase.

### Firebase Spark opcional

Para usar dos telefonos reales, incluido iPhone + Android:

1. Crear proyecto en Firebase.
2. Activar Authentication.
3. Habilitar login Anonymous.
4. Activar Cloud Firestore.
5. Publicar `firebase/firestore.rules`.
6. Cargar la configuracion web de una de estas formas:
   - en GitHub Secrets para que Actions genere `firebase-config.js`;
   - o pegando el JSON en **Gym Party > Firebase opcional**.
7. Crear sala Firebase y compartir el codigo.

Secrets esperados para publicar web/APK ya configurados:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID` opcional
- `FIREBASE_STORAGE_BUCKET` opcional

Archivos de soporte:

- `firebase/README.md`
- `firebase/firestore.rules`
- `firebase/schema.md`
- `firebase/sample-config.js`
- `firebase-config.js`

No se incluyen credenciales reales. La API key web de Firebase es publica; la
seguridad depende de Firestore Rules. No usar service accounts ni claves
privadas en frontend.

### Offline y exportacion

Los entrenamientos se guardan primero localmente. Si hay sala activa y compartir
gym esta habilitado, `gym-party.js` prepara sesiones y series compartidas. Si no
hay conexion, deja operaciones en `syncQueue`; al volver online o tocar
**Sincronizar ahora**, intenta subir a Firestore.

Gym Party permite exportar CSV comparativo de la sala y JSON con mis datos
compartidos. El CSV no incluye datos privados de nutricion, sueno, ansiedad,
pantalla ni notas personales.

## Widget Android de gimnasio

La PWA/GitHub Pages no puede crear widgets nativos. El widget real vive en el APK Android y usa `AppWidgetProvider`, `AppWidgetManager`, `RemoteViews` y `SharedPreferences`.

La app web sincroniza `weeklyWorkoutPlan`, `workoutSessions`, `exerciseHistory`, `exerciseLibrary`, `gymSettings` y `workoutWidgetState` mediante `AndroidBridge.saveWorkoutWidgetData(json)`. Si todavia no hay datos, Android usa la rutina predeterminada segun el dia actual.

Desde la pantalla de inicio el widget permite:

- ver el entrenamiento del dia;
- ver el ejercicio actual;
- ver series del ejercicio actual y total de series del musculo activo por separado;
- subir/bajar repeticiones;
- subir/bajar kilos siempre en pasos de 0.5 kg;
- usar ajuste rapido de peso de 5 kg para evitar muchos taps en cargas altas;
- tocar **Guardar serie** sin abrir la app;
- tocar **Repetir** para cargar la ultima serie conocida;
- tocar **Atras** para volver al ejercicio anterior;
- tocar **Siguiente** para avanzar de ejercicio;
- abrir Gym / Entrenamiento de hoy o Registro rapido cuando hace falta una edicion completa.

Limitacion practica: `RemoteViews` no ofrece un formulario libre comodo con teclado, RIR/RPE y notas largas. Para eso el boton de abrir registro rapido sigue entrando directo a la pantalla completa. El registro directo del widget cubre el flujo estable de gimnasio: reps, kilos, ajustes rapidos de peso, guardar, repetir, atras y siguiente.

El APK tiene permiso de Internet para que Gym Party/Firebase pueda sincronizar
desde el WebView. En iPhone se usa la PWA/Safari; no hay dependencia del widget
Android.

Para agregarlo: instala el APK, manten presionada la pantalla de inicio, entra a **Widgets**, busca **Protocolo 0->100 · Gym** y agregalo. El widget pequeno ofrece guardado rapido minimo; el mediano muestra controles completos.

Rutina predeterminada: lunes Torso A, martes Pierna A, miercoles Torso B, jueves Pierna B, viernes Torso C, sabado descanso o actividad suave y domingo descanso o revision semanal. Dentro de **Gym** se puede editar la rutina semanal, copiar un dia a otro, restablecer la rutina predeterminada exacta, cambiar kg/lb, activar RIR/RPE y actualizar manualmente el widget.

## Desarrollo y validacion

Validar estructura:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1
node ./scripts/test-service-worker.mjs
node ./scripts/test-workout-features.mjs
node ./scripts/test-gym-party.mjs
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
- **APK:** el workflow `Construir APK Android` compila el wrapper y publica la descarga directa de la version `v2.4.5`.

El APK generado es `debug`, apropiado para uso personal. Publicar en Play Store requiere una compilacion `release` firmada con una clave privada.

## Seguridad

La app usa lenguaje orientativo y no diagnostica deficiencias ni sustituye a entrenadores, nutricionistas, medicos u otros profesionales de salud. Ajusta cargas segun tecnica, dolor, fatiga y seguridad.

Focus Coins es solo gamificacion: no es dinero, inversion ni criptomoneda; no es transferible ni intercambiable por dinero. Referidos, conversiones, comisiones y rankings son simulaciones locales hasta conectar un backend real.
