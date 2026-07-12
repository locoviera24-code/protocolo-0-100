# Protocolo 0->100

PWA y APK Android para medir habitos, atencion, actividad fisica y nutricion con el principio "Lo que no se mide no se mejora". Los datos funcionan primero de forma local y privada; no existe una cuenta ni un backend obligatorio.

## Modulos

- **Protocolo diario:** pantalla, sueno, lectura, actividad offline, accion clave, score y tendencias.
- **Gym:** rutinas, ejercicios por musculo, series, repeticiones, peso, RIR, volumen e historial.
- **Widget Android de gimnasio:** widget nativo de pantalla de inicio con rutina del dia, progreso y registro directo incremental de series.
- **Gym Party:** sala privada opcional para compartir entrenamientos, comparar progreso semanal/mensual y probar graficas en modo demo.
- **Nutricion:** portada simple Hoy/Agregar/Progreso, comidas agrupadas, agua independiente, busqueda por alias, cantidades, frecuentes, alimentos propios y metas editables.
- **USDA FoodData Central opcional:** busqueda paginada, detalle por `fdcId`, normalizacion por 100 g, cache offline e importador JSON.
- **Progreso integral:** scores separados e integral, Focus Coins no financieros, recompensas, rankings mensuales opcionales y referidos simulados.
- **Telefono Android:** importacion opcional de estadisticas de uso con permiso explicito.

## Navegacion y diseno

La version actual `v2.7.0` (build web `57`, Android `33`) usa una barra inferior movil con cinco destinos: **Inicio**,
**Gym**, **Nutricion**, **Progreso** y **Mas**. En escritorio usa una barra
lateral compacta. Gym Party se abre desde **Gym > Grupo**, desde un acceso
discreto en Inicio o mediante un enlace `gymPartyCode`; ya no ocupa un boton
permanente en todas las pantallas.

La navegación conserva estado en URLs `module/view`, por ejemplo
`?module=gym&view=train`, `?module=gym&view=group` y
`?module=more&view=settings`. Atrás, recarga y los botones del navegador
restauran la misma vista; los enlaces antiguos siguen aceptándose como alias.

La interfaz conserva todos los controles y datos, pero muestra primero la tarea
principal. Ajustes, explicaciones, acciones destructivas, micronutrientes,
recompensas y administracion de sala usan secciones plegables. Los estilos se
centralizan en hojas externas: `styles/tokens.css`, `styles/base.css`,
`styles/components.css`, `styles/features.css`, `styles/gym.css`,
`styles/gym-party.css`, `styles/modules.css` y `styles/responsive.css`.
Gym y Gym Party ya no crean bloques CSS desde JavaScript.

En móvil, Inicio muestra primero un estado compacto con score, racha, datos
pendientes y una acción. **Más > Ajustes** guarda apariencia, densidad, modo
guiado/compacto, unidad y preferencias de módulos. **Datos y copias** muestra
uso local, schema, última exportación y restablecimientos selectivos.

## Arquitectura

`app-version.json` es la fuente unica de version. `app-version.js` se genera
con `node scripts/sync-app-version.mjs`; `npm run test:version` valida paquete,
lockfile, web, cache PWA, Gradle, nombre del APK y documentacion.

La raiz del repositorio es la fuente de la PWA y tambien se sincroniza dentro del APK:

```text
index.html                  Interfaz, protocolo, gym y nutricion
styles/*.css                Tokens, base, componentes y estilos por modulo
ui/router.js                Router module/view, historial, deep links y Atrás
ui/navigation.js            Coordinador de sticky, banners, teclado y safe areas
data/indexeddb.js           Espejo transaccional, migraciones y recuperacion local
data/repositories.js        Repositorios por dominio sobre claves compatibles
data/backup-service.js      Validacion, preview, importacion transaccional y Deshacer
nutrition/nutrition-store.js Repositorio compatible y claves del dominio Nutricion
nutrition/nutrition-model.js Totales, porciones, comidas y entradas puras
nutrition/food-search.js    Ranking tolerante a aliases, tildes y plurales
nutrition/food-entry-flow.js Estado del futuro flujo guiado de alta
nutrition/meal-history.js   Recientes, frecuentes y copia de comidas
nutrition/nutrition-confidence.js Cobertura conocida, estimada y desconocida
nutrition/nutrition-view.js View models del dia y progreso principal
progress/progress-data-model.js Ventanas temporales y cambios comparables
progress/gym-progress-model.js Sesiones y grupos musculares canonicos
progress/muscle-progress.js Series, volumen y frecuencia por musculo
workout-store.js            Acceso conservador y versionado al repositorio Gym
workout-plan.js             Normalizacion, deduplicacion e insercion en rutinas
workout-ui.js               Renderizadores pequenos y anuncios accesibles de Gym
workout-features.js         Orquestador de rutina, registro, historial y widget Android
firebase-config.js          Stub seguro; GitHub Actions puede generar config Firebase publica
firebase-service.js         Deteccion de config y carga diferida del SDK Firebase
gym-party-sync.js           Reconciliacion incremental, LWW, tombstones y backoff
gym-party-metrics.js        Agregados semanales compartidos y fuerza/peso corporal
gym-party-ui.js             Componentes pequenos y estado de sincronizacion
gym-party.js                Orquestador de sala, demo, privacidad y comparativas
nutrition-data.js           Base local estructurada de alimentos y nutrientes
fdc-client.js               Cliente opcional USDA FDC, normalizacion y cache
advanced-features.js        Cobertura, diagnostico, tendencias, backup y gamificacion
manifest.webmanifest        Configuracion instalable
sw.js                       Cache y funcionamiento offline
scripts/validate-app.ps1    Validaciones estructurales
scripts/test-service-worker.mjs Prueba de cache/offline/FDC
scripts/test-workout-features.mjs Prueba de rutina, widget e importacion directa
scripts/test-gym-party.mjs  Prueba de demo, multi-miembro, estadisticas y backup Gym Party
scripts/test-module-boundaries.mjs Prueba de contratos entre modulos extraidos
scripts/sync-web-assets.ps1 Sincronizacion web -> Android
scripts/write-firebase-config.ps1 Genera firebase-config.js desde secrets FIREBASE_*
android-native-wrapper/     Proyecto Android con WebView y widget nativo
firebase/                   Reglas, esquema y configuracion ejemplo para Gym Party
.github/workflows/          Publicacion Pages, validacion y compilacion APK
```

`advanced-features.js` mantiene un estado consolidado con `schemaVersion: 3`. No se incluyen API keys en backups. El service worker usa navegacion `network-first`, conserva offline los assets principales y no intercepta llamadas FDC ni otros origenes.

Nutricion mantiene por compatibilidad sus APIs globales actuales, pero el
nucleo ya se divide en `nutrition/*.js`. Las lecturas y escrituras pasan por
`NutritionRepository` cuando existe y continúan en modo shadow: IndexedDB aún
no es la fuente primaria. La vista normal tiene solo **Hoy**, **Agregar** y
**Progreso**. Hoy agrupa alimentos por comida y separa el agua; peso corporal,
objetivos, alimentos propios y FDC viven en **Mas > Ajustes > Nutricion**. Las
claves y formatos de backup no cambiaron. **Agregar** guía alimento, cantidad,
unidad, comida y revisión en cuatro pasos; muestra recientes/frecuentes,
calcula macros antes de guardar y ofrece Deshacer.

Antes de importar un JSON, la app valida tamaño y schema, sanea claves y
cadenas, muestra registros nuevos/reemplazados/conflictos y crea una copia
interna. Tras aplicar el archivo, **Datos y copias** ofrece **Deshacer
importación** incluso después de recargar mientras esa sea la última operación.
Los backups antiguos con `entries[]` siguen siendo compatibles; un schema
posterior al soportado se rechaza sin modificar datos.

## Gym Party

Gym Party es una sala privada y opcional para compartir entrenamientos de gym y
comparar progreso semanal/mensual. Funciona en Android, iPhone/iOS desde
Safari/PWA, navegador web y APK Android. No depende de `AndroidBridge`.

Estados principales:

- sin sala: pantalla simple con accion principal **Crear codigo para invitar**;
- unirse: bloque plegado **Ya tengo un codigo**;
- demo, privacidad, exportacion y Firebase: opciones plegadas para no saturar;
- dashboard: registro rapido directo de la rutina del dia y resumen semanal;
- invitacion/codigo/sincronizacion: apartado plegado para usarlo solo cuando
  hace falta invitar o administrar la sala;
- metricas avanzadas: graficas, exportacion, privacidad y sesiones dentro de
  secciones plegadas.

Acceso rapido:

- acceso discreto **Entrenamiento compartido** en Inicio;
- seccion **Gym > Grupo**;
- enlaces de invitacion con `gymPartyCode`.

Flujo recomendado:

1. Abrir **Gym > Grupo**.
2. Escribir alias y tocar **Crear codigo para invitar**.
3. Tocar **Enviar codigo**.
4. El amigo abre el link/codigo desde iPhone, Safari o PWA.
5. En **Entrar con codigo**, escribe alias y entra a la sala.

Desde el dashboard de Gym Party se puede registrar la serie sin volver al
modulo Gym: elegir ejercicio de la rutina del dia, cargar reps/kilos y tocar
**Guardar serie**. Esa rutina diaria usa la misma fuente que el widget Android:
Lunes Torso A, Martes Pierna A, Miercoles Torso B, Jueves Pierna B, Viernes
Torso C, Sabado descanso suave y Domingo revision/descanso.

La vista principal se mantiene deliberadamente limpia: foco en registrar el
entrenamiento y revisar el resumen semanal. El codigo para invitar, sincronizar,
exportar y administrar sala queda en **Grupo e invitaciones**,
plegado por defecto. Las graficas, racha, sesiones recientes, exportacion y
privacidad quedan en secciones plegadas. Cada serie guardada aparece como una
tarjeta compacta con **Editar** y **Eliminar**, para corregir
reps/kilos/RIR/RPE/nota sin rehacer el entrenamiento.

El registro rapido pone primero ejercicio, repeticiones, kilos y el boton
**Guardar serie** en una barra estable para reducir desplazamiento. Las series
ya registradas aparecen despues en tarjetas compactas con editar, eliminar y
deshacer. No muestra navegacion anterior/siguiente innecesaria en web: se elige
directamente fecha y ejercicio. Tambien permite **Agregar ejercicio extra** cuando se hace un movimiento fuera
de la rutina habitual; ese ejercicio queda dentro de la misma `workoutSession`,
entra al historial, al volumen, al backup y a la sincronizacion de la sala.
El selector **Dia de entrenamiento** permite elegir ayer u otra fecha para
editar ejercicios, series, reps y kilos de ese dia sin salir de Gym Party. En
web se evita mostrar botones de atras/siguiente/completar ejercicio para que el
registro sea mas directo: elegir fecha, elegir ejercicio, guardar serie.

Debajo del resumen semanal hay un apartado **Editar series de la semana**. Desde
ahi se puede abrir o eliminar cualquier serie registrada en la semana
seleccionada. Al eliminar una serie, el resumen semanal, sesiones recientes,
graficas y mapa muscular se recalculan desde las series visibles; los totales
viejos de la sesion no se reutilizan.

Gym Party incluye una tarjeta de racha y nivel: cuenta dias consecutivos con
sesiones registradas, muestra insignias sanas y usa como referencia principal
la comparacion contra tu propia semana anterior.

Dentro de **Ver graficas, mapa muscular y comparaciones** hay un cuerpo humano
mas detallado con lineas a los grupos musculares principales. Al tocar un
musculo se despliegan graficas de barras por semana, series, reps, volumen,
mejor peso registrado, ejercicios realizados y comparacion por miembro. Cada
ejercicio tiene boton **Comparar ejercicio** para ver series, reps, mejor peso,
volumen y cambio contra la semana anterior. El objetivo es detectar equilibrio,
tendencia y progreso de fuerza sin perseguir mas volumen a cualquier costo.

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
4. Habilitar Email/Password si queres recuperar la misma Gym Party desde otro dispositivo.
5. Activar Cloud Firestore.
6. Publicar `firebase/firestore.rules`.
7. Cargar la configuracion web de una de estas formas:
   - en GitHub Secrets para que Actions genere `firebase-config.js`;
   - o pegando el JSON en **Gym Party > Firebase opcional**.
8. Crear sala Firebase y compartir el codigo.

Al unirse con codigo desde el mismo navegador, Gym Party guarda la membresia y
la sesion anonima de Firebase de forma local. Si tu amigo cierra Safari/Chrome,
cierra la pestana o vuelve a abrir la PWA, la app restaura esa sala y sincroniza
en segundo plano. Si usa modo privado, borra datos del sitio o cambia de
navegador/dispositivo, debera unirse otra vez con el codigo.

Para cambiar de dispositivo sin perder continuidad, primero abrir
**Grupo e invitaciones > Guardar acceso para otro dispositivo** y
guardar email/clave. En el telefono nuevo usar **Entrar desde otro dispositivo**
con ese email/clave. El email se usa solo para Firebase Auth; no se comparte con
los miembros de la sala ni sale en backups.

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

La edicion semanal usa un selector de fecha directo. Al editar o eliminar una
serie propia, Gym Party reconstruye los datos compartidos desde el registro
local para que graficas, mapa muscular y lista semanal no muestren copias
antiguas.

La sincronizacion Firebase es incremental. Cada fila conserva revision, estado
dirty, fecha local/zona horaria y `updatedAt`; los conflictos se resuelven por
ultima escritura conocida (LWW). Las eliminaciones viajan como tombstones para
que una serie borrada no reaparezca al descargar datos remotos. Ante error se
aplica backoff y los datos locales siguen disponibles.
Al subir una fila propia se reemplaza el documento remoto con el payload
sanitizado. Esto elimina campos tecnicos que versiones anteriores pudieron
guardar por error (`source`, `pendingSync`) sin borrar la sesion ni la serie.

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

### Progreso consolidado

`Progreso` concentra la vista general, habitos, Gym, Nutricion, historial y
logros. Sus deep links usan `?module=progress&view=overview|habits|gym|nutrition|history|achievements`.
El selector de periodo permite comparar 7, 30, 90 dias o todo el historial;
los graficos incluyen resumen textual y una escala comun accesible.

Dentro de **Progreso > Gym > Musculos**, el mapa corporal abre cada grupo y
muestra series de la semana, ultimas cuatro semanas, frecuencia, volumen,
ejercicios y periodo anterior. Cada serie se atribuye una sola vez al grupo
primario registrado; los musculos secundarios no se suman de forma oculta.
Deep link: `?module=progress&view=gym&progressScope=muscle&muscle=pecho`.

Validar estructura:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1
node ./scripts/test-service-worker.mjs
node ./scripts/test-workout-features.mjs
node ./scripts/test-workout-metrics.mjs
node ./scripts/test-gym-party.mjs
node ./scripts/test-gym-party-sync.mjs
node ./scripts/test-module-boundaries.mjs
node ./scripts/test-android-webview-security.mjs
node ./scripts/test-android-release.mjs
node ./scripts/test-accessibility.mjs
npm run test:design
npm run test:router
npm run test:layout
npm run test:home-settings
npm run test:rules
npm run test:e2e
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

El APK debug queda en `android-native-wrapper/app/build/outputs/apk/debug/app-debug.apk`.
El release firmado requiere `ANDROID_KEYSTORE_PATH`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`, y
se compila con `gradle :app:assembleRelease --stacktrace`. GitHub Actions usa el
keystore codificado en `ANDROID_KEYSTORE_BASE64` y nunca lo guarda en el repo.

## Publicacion

- **PWA:** el workflow `Publicar PWA en GitHub Pages` publica los archivos raiz.
- **APK debug:** el workflow `Construir APK Android` publica un artifact temporal para pruebas.
- **APK release:** el workflow `Publicar APK Android release` compila `v2.7.0` con firma privada desde GitHub Secrets, publica el APK versionado y adjunta su checksum SHA-256.

La PWA no activa una nueva version a mitad de un registro: muestra aviso y solo
envia `SKIP_WAITING` cuando el usuario toca **Actualizar ahora**. El APK release
es distinto del debug y debe conservar siempre la misma clave de firma para
permitir actualizaciones sobre una instalacion previa.

## Seguridad

La app usa lenguaje orientativo y no diagnostica deficiencias ni sustituye a entrenadores, nutricionistas, medicos u otros profesionales de salud. Ajusta cargas segun tecnica, dolor, fatiga y seguridad.

Android carga los assets internos mediante `WebViewAssetLoader` sobre
`https://appassets.androidplatform.net`; bloquea acceso a archivos/contenido,
mixed content y navegacion remota no permitida. Firebase, FDC y enlaces externos
se restringen por origen y los enlaces normales se abren fuera del WebView.

Focus Coins es solo gamificacion: no es dinero, inversion ni criptomoneda; no es transferible ni intercambiable por dinero. Referidos, conversiones, comisiones y rankings son simulaciones locales hasta conectar un backend real.
