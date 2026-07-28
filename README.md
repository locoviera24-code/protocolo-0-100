# Protocolo 0->100

PWA y APK Android para medir habitos, atencion, actividad fisica y nutricion con el principio "Lo que no se mide no se mejora". Los datos funcionan primero de forma local y privada; no existe una cuenta ni un backend obligatorio.

## Modulos

- **Protocolo diario:** pantalla, sueno, lectura, actividad offline, accion clave, score y tendencias.
- **Gym:** rutinas, ejercicios por musculo, series, repeticiones, peso, RIR, volumen e historial.
- **Widget Android de gimnasio:** widget nativo de pantalla de inicio con rutina del dia, progreso y registro directo incremental de series.
- **Gym Party:** sala privada opcional para compartir entrenamientos, comparar progreso semanal/mensual y probar graficas en modo demo.
- **Nutricion:** portada simple Hoy/Agregar/Progreso, comidas agrupadas, agua independiente, buscador unico, recetas, porciones habituales, alimentos propios y metas editables.
- **Fuentes nutricionales opcionales:** la busqueda prioriza datos guardados y, si no encuentra una coincidencia suficiente, puede consultar automaticamente un proveedor externo configurado de forma segura.
- **Progreso integral:** scores separados e integral, Focus Coins no financieros, recompensas, rankings mensuales opcionales y referidos simulados.
- **Telefono Android:** importacion opcional de estadisticas de uso con permiso explicito.

## Navegacion y diseno

La version actual `v2.7.0` (build web `89`, Android `33`) usa una barra inferior movil con cinco destinos: **Inicio**,
**Gym**, **Nutricion**, **Progreso** y **Mas**. En escritorio usa una barra
lateral compacta. Gym Party se abre desde **Gym > Grupo**, desde un acceso
discreto en Inicio o mediante un enlace `gymPartyCode`; ya no ocupa un boton
permanente en todas las pantallas.

**Mas > Acerca de** muestra version, build, canal, commit abreviado, fecha del
artifact, cache activa y estado del service worker. **Comprobar actualizacion**
consulta `build-info.json` y `app-version.json` sin usar la copia cacheada. La
app no activa un worker nuevo mientras existan borradores, formularios sin
guardar, una importacion abierta o escrituras locales pendientes. El artifact
de CI genera esos metadatos desde `app-version.json`, `GITHUB_SHA` y el canal;
el checkout local se identifica expresamente como desarrollo.

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

El resumen integral separa cobertura de datos, constancia y tendencia. El
periodo **Todo** usa el intervalo realmente observado y Gym calcula la
expectativa desde la rutina semanal del usuario. `workoutSessions` es la fuente
canonica para sesiones nuevas; `gymSessions` se conserva unicamente para
migrar e importar backups antiguos.

En Nutricion, cada alimento registrado concentra sus acciones en un menu
contextual: editar cantidad, mover de comida, duplicar, copiar a otra fecha,
guardar como frecuente o eliminar. Los cambios sobre entradas ofrecen
`Deshacer` y no modifican retroactivamente la definicion del alimento.

La pantalla **Registrar alimento** presenta un solo buscador para habituales,
favoritos, recientes, recetas, alimentos propios e incluidos. La busqueda
prioriza **Agregar igual que la ultima vez** y combina los resultados sin
duplicar el mismo alimento ni pedir que se elija una base de datos. Si la
coincidencia interna es debil o inexistente, consulta automaticamente el
proveedor externo disponible; seleccionar un resultado lo normaliza, lo guarda
para uso offline y continua directamente a cantidad, comida y revision.
Cada alimento recuerda cantidad, unidad, comida habitual y las ultimas tres
combinaciones. La comida sugerida por horario es solo un valor inicial editable.
Las recetas calculan nutrientes desde snapshots de ingredientes y permiten
registrar una porcion o gramos. Editarlas no cambia registros historicos. Su
editor y la administracion de alimentos propios viven en **Nutricion > Mis
alimentos y recetas**; el flujo cotidiano **Agregar** conserva solamente la
busqueda y los cuatro pasos de registro. Elegir una receta desde el buscador
continua directamente a cantidad, comida y revision.

La app no necesita un proveedor externo para funcionar. Sin conexion o sin un
backend configurado conserva alimentos incluidos, personales, recetas y datos
guardados. El flujo cotidiano no muestra USDA, FDC, endpoints ni API keys. La
configuracion tecnica solo aparece en builds de desarrollo o al activar soporte,
dentro de **Mas > Datos y copias > Diagnostico avanzado > Nutricion**. En un
build estable se muestra unicamente **Busqueda ampliada disponible**, **no
disponible** o **Modo offline**. Una clave guardada directamente en el navegador
se reserva para desarrollo, puede borrarse y nunca entra en backups; un build
estable solo habilita consultas productivas mediante un proxy o backend con el
secreto del lado servidor.

Los campos numericos de registro aceptan coma o punto decimal y separadores de
miles (`7,5`, `7.5`, `1.000,5` o `1,000.5`). La app guarda numeros neutrales y
los presenta con formato `es-PY`; los pesos siguen almacenandose en kg
canonicos. Los objetivos nutricionales son manuales y conservan valor, origen,
fecha de actualizacion y version de calculo. La app no simula una calculadora a
partir de edad, sexo o altura.

El formulario de alimento personalizado muestra primero solo nombre, porcion,
calorias y macros. Fibra, sodio, micronutrientes, fuente, confianza y aliases
quedan en una seccion opcional. En Ajustes se pueden editar, duplicar como
plantilla, archivar, restaurar, fusionar o eliminar definiciones; las entradas
historicas conservan sus snapshots y las eliminaciones ofrecen Deshacer.

La cobertura nutricional distingue datos conocidos, estimados, desconocidos,
no informados y ceros confirmados. Con cobertura insuficiente no calcula score;
con cobertura baja muestra un rango; solo muestra una cifra orientativa cuando
la muestra alcanza confianza media o alta. Los valores desconocidos nunca se
tratan como cero.

Los mensajes usan una capa central: snackbar para resultados breves, validacion
junto al campo, banner unico para offline/actualizaciones, dialogo interno para
decisiones destructivas y formulario modal accesible para ediciones breves.
Gym, Gym Party y FDC ya no usan `alert`, `confirm` ni `prompt` nativos. Un boundary local conserva un registro circular
sanitizado y ofrece reintentar, reiniciar interfaz, modo seguro o exportar un
diagnostico sin datos personales ni credenciales.

En móvil, Inicio muestra primero un estado compacto con score, racha, datos
pendientes y una acción. **Más > Ajustes** guarda apariencia, densidad, modo
guiado/compacto, unidad y preferencias de módulos. **Datos y copias** muestra
un estado general, última exportación e importación, espacio utilizado,
elementos que necesitan revisión y restablecimientos selectivos. Los detalles
de IndexedDB/localStorage, modos por dominio, claves, divergencias,
recuperaciones y rollback permanecen disponibles dentro de **Diagnóstico
avanzado**, cerrado por defecto. La app elige el almacenamiento; una persona no
necesita cambiar su tecnología para usar copias. Antes de
importar permite decidir por área entre **Fusionar**, **Reemplazar** o
**Conservar actual**. La vista previa identifica registros nuevos,
actualizaciones, conflictos, duplicados y eliminaciones; los conflictos pueden
resolverse con una regla por área o revisarse individualmente. Fusionar conserva
los registros locales ausentes del archivo. Reemplazar advierte expresamente
qué se eliminará, crea una copia automática y mantiene disponible Deshacer.

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
ui/notifications.js         Snackbar y banner unico con prioridades y Deshacer
ui/inline-validation.js     Errores asociados al campo mediante ARIA
ui/confirmation-dialog.js   Confirmaciones accesibles sin dialogo nativo
ui/error-boundary.js        Log circular sanitizado y captura de fallos
ui/recovery-view.js         Reintento, reinicio, modo seguro y diagnostico local
app/drafts.js               Borradores versionados, expiracion y coordinacion entre pestanas
app/dates.js                Medianoche, zona horaria, background y fechas manuales
app/build-guard.js          Impide arrancar con HTML y modulos de builds distintos
data/schema-registry.js     Fuente unica de claves, schemas, backup, reset y retencion
data/indexeddb.js           Espejo transaccional, migraciones y recuperacion local
data/repositories.js        Repositorios por dominio sobre claves compatibles
data/backup-service.js      Plan por area, preview, importacion transaccional y Deshacer
nutrition/nutrition-store.js Repositorio compatible y claves del dominio Nutricion
nutrition/nutrition-model.js Totales, porciones, comidas y entradas puras
nutrition/recipes.js         Recetas, ingredientes snapshot y nutricion por porcion
nutrition/portions.js        Porciones habituales, favoritos y accion Agregar igual
nutrition/food-search.js    Ranking tolerante a aliases, tildes y plurales
nutrition/food-provider.js  Contrato opcional de proveedor y normalizacion externa
nutrition/food-search-service.js Busqueda unificada, debounce, cache y cancelacion
nutrition/food-entry-flow.js Estado del futuro flujo guiado de alta
nutrition/meal-history.js   Recientes, frecuentes y copia de comidas
nutrition/nutrition-confidence.js Cobertura conocida, estimada y desconocida
nutrition/nutrition-view.js View models del dia y progreso principal
progress/progress-data-model.js Ventanas temporales y cambios comparables
progress/gym-progress-model.js Sesiones y grupos musculares canonicos
progress/muscle-taxonomy.js  IDs anatomicos estables y compatibilidad legacy
progress/muscle-progress.js Series, volumen y frecuencia por musculo
progress/exercise-progress.js Fuerza, historial y sugerencia por ejercicio
progress/personal-records.js Records derivados de sesiones canonicas
gym/anomaly-detector.js     Revision conservadora de registros inusuales
gym/progression-engine.js   Prescripciones y sugerencias conservadoras comparables
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
fdc-client.js               Transporte tecnico opcional, normalizacion y cache
advanced-features.js        Cobertura, diagnostico, tendencias, backup y gamificacion
manifest.webmanifest        Configuracion instalable
precache-manifest.js        Inventario generado de recursos, bytes y SHA-256
offline.html                Recuperacion minima cuando no existe shell disponible
sw.js                       Instalacion atomica, cache por build y funcionamiento offline
icons/icon-maskable-*.png   Iconos maskable con zona segura propia
icons/shortcut-*.png        Iconos diferenciados para accesos directos
screenshots/*.png           Capturas instalables movil y escritorio
scripts/precache-manifest.mjs Clasificacion obligatoria/opcional del shell
scripts/generate-precache-manifest.mjs Generador reproducible para web y Android
scripts/generate-pwa-icons.ps1 Generador reproducible de iconos PWA
scripts/capture-pwa-screenshots.mjs Captura vistas limpias sin datos personales
scripts/test-manifest.mjs   Valida rutas, dimensiones, purposes y shortcuts
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

`advanced-features.js` mantiene un estado consolidado con `schemaVersion: 3`.
No se incluyen API keys en backups. El service worker instala cada build en una
cache temporal, verifica bytes y SHA-256 de todos los recursos obligatorios y
solo prepara la cache activa cuando el conjunto esta completo. Los iconos y el
manifest son opcionales durante el precache: un fallo transitorio suyo no
bloquea la app. La navegacion controlada usa el `index.html` del mismo build y
evita mezclar HTML nuevo con JavaScript o CSS anterior. La version previa se
conserva hasta activar la nueva y las llamadas FDC u otros origenes no se
interceptan.

`data/schema-registry.js` registra cada clave persistida con dominio, version,
valor inicial, validador, migracion, campo de backup, sensibilidad, modo de
almacenamiento, reset y retencion. IndexedDB, repositorios, exportacion,
importacion, restablecimientos y diagnosticos derivan sus contratos de ese
registro. La configuracion FDC permanece local y excluida; la configuracion
Firebase embebida en Gym Party se elimina al exportar. Protocolo diario,
Nutricion, Workout, Gym Party y el grupo independiente de cache nutricional
usan IndexedDB como fuente primaria, con comparacion de checksums, recuperacion
y rollback visibles. La cache de busquedas elimina resultados despues de 24
horas y los alimentos
externos se limitan a los 750 usados mas recientemente; la poda se aplica a
IndexedDB y a su copia compatible sin tocar comidas, recetas ni historiales.
La inicializacion de Gym y Gym Party espera la hidratacion antes de crear
valores o iniciar sincronizacion. En Gym Party esto protege membresia, sala,
datos compartidos y cola offline. `localStorage` se conserva como copia
compatible de escritura anticipada, no se borran claves legacy y Protocolo
conserva `startDate`, acciones descartadas y sesiones Gym legacy fuera de su
grupo primario. `PROTOCOL_FEATURES.ready()` garantiza que Inicio vuelva a leer
el registro diario recuperado antes de declararse hidratado.

Durante el período de compatibilidad, **Más > Datos y copias > Diagnóstico
avanzado > Historial técnico de compatibilidad** conserva hasta 100 eventos de reconciliación o
recuperación. Solo registra dominio, clave técnica, resolución y fecha: no
incluye valores, notas, credenciales, configuración Firebase ni contenido de
salud. Desde ese panel se pueden comprobar conjuntamente las cinco áreas,
exportar un diagnóstico técnico o borrar únicamente ese historial. Borrarlo no
modifica `localStorage`, IndexedDB ni los registros del usuario. Las
actualizaciones concurrentes desde dos pestañas se serializan mediante
transacciones IndexedDB.

Las lecturas de repositorio distinguen `missing`, `valid`, `legacy`, `corrupt`
y `unsupported`. Si una clave conocida contiene JSON roto o una estructura no
compatible, se copia primero a la cuarentena de IndexedDB y se retira de la
lectura activa; no se sobrescribe con `[]` o `{}`. En **Datos y copias** se puede
exportar, reparar y restaurar esa copia o eliminarla de forma explicita. Las
configuraciones sensibles se redactan y nunca exponen su contenido en la
cuarentena. Una migracion shadow no copia registros que necesiten revision.

Nutricion mantiene por compatibilidad sus APIs globales actuales, pero el
nucleo ya se divide en `nutrition/*.js`. Las lecturas y escrituras pasan por
`NutritionRepository`; las claves duraderas se hidratan y leen desde IndexedDB
despues de validarlas. Si falta la copia de `localStorage`, se recupera desde
IndexedDB; si ambas divergen, la copia local pendiente se reconcilia sin perder
datos. **Mas > Datos y copias** permite volver al modo compatible o reactivar
la lectura primaria. La vista normal tiene solo **Hoy**, **Agregar** y
**Progreso**. Hoy agrupa alimentos por comida y separa el agua; peso corporal,
objetivos viven en **Mas > Ajustes > Nutricion** y la administracion de alimentos
y recetas vive en **Nutricion > Mis alimentos y recetas**. El diagnostico de
fuentes permanece fuera del uso normal. Los
backups schema 3 incorporan las claves opcionales `recipes` y `foodPortions`;
archivos anteriores siguen siendo compatibles. **Agregar** guía alimento, cantidad,
unidad, comida y revisión en cuatro pasos; muestra recientes/frecuentes,
calcula macros antes de guardar y ofrece Deshacer.

Los formularios de registro diario, alimento, serie Gym, rutina, creacion de
Gym Party y privacidad guardan borradores locales con debounce. Se restauran
tras recarga, cierre de PWA o reinicio del WebView, muestran una accion para
descartarlos y se eliminan solo despues de un guardado exitoso. Los borradores
vencen automaticamente, no incluyen configuracion Firebase ni credenciales y
no sustituyen los backups exportables. La fecha seleccionada manualmente se
conserva; el cambio de dia o zona horaria solo actualiza fechas automaticas.

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

El registro de Gym y Gym Party admite seis interpretaciones de carga: total,
por mano, por lado con barra, peso corporal, lastre y asistencia. El valor se
guarda siempre en kg canónicos, pero conserva la forma en que fue ingresado.
También admite ejercicios por repeticiones, tiempo y distancia. Plancha,
caminata, bicicleta y estiramiento suave están disponibles como ejemplos sin
forzar un cálculo de e1RM donde no corresponde.

Los pesos y recomendaciones de **Progreso > Gym > Ejercicios** solo comparan
series con el mismo ejercicio, equipo, gimnasio, lateralidad, modalidad y modo
de carga. Cambiar de barra a Smith o de carga total a carga por mano inicia un
contexto comparable distinto; el volumen general continúa sumándose con la
carga total normalizada. Los documentos compartidos de Gym Party transmiten
solo los datos mínimos y derivan volumen, carga total y ritmo en cada cliente.

Cada ejercicio de la rutina puede definir series objetivo, rango de
repeticiones, RIR, incremento minimo y metodo de progresion. El motor exige al
menos dos sesiones comparables y usa unicamente series validas para progresion;
un calentamiento, una exclusion, un cambio de equipo, una molestia o un dato
marcado para revision no provocan una sugerencia de subir carga. La vista de
Progreso explica las sesiones y objetivos usados, el nivel de confianza y el
incremento orientativo. Las recomendaciones son conservadoras y no sustituyen
criterio tecnico ni profesional.

Antes de aceptar como record un salto ampliamente superior al historial, la
app muestra una revision interna. Se puede confirmar y contar, conservar sin
record, conservar fuera de record y progresion, o volver a editar. Se revisan
posibles confusiones kg/lb, reps o volumen extremos, cambios entre carga total
y carga por mano/lado, y cambios entre lastre y asistencia. Ningun valor se
borra automaticamente. **Progreso > Gym > Records** mantiene una lista plegada
de los registros revisados. Una mutacion sospechosa recibida desde el widget se
guarda como pendiente y queda temporalmente excluida hasta confirmarla en la
app.

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

Las altas, salidas y reactivaciones usan una transaccion unica que vincula el
miembro con `membersCount`, usos de invitacion y una revision monotona. Salir
voluntariamente permite reingresar solo si la misma invitacion sigue vigente;
una membresia expulsada o un documento inactivo antiguo no se puede reactivar
por cuenta propia. Publicar siempre las reglas actuales antes de probar esta
version con salas reales.

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
La interfaz distingue **Guardado localmente**, **Pendiente de sincronizacion**,
**Sincronizando**, **Sincronizado**, **Conflicto resuelto**, **Error recuperable**
y **Requiere acceso**, además de mostrar última sincronización y cambios pendientes.

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

Los ejercicios oficiales conservan una clasificación muscular validada. Al
crear un ejercicio personalizado se pueden elegir varios músculos principales y
secundarios. Etiquetas amplias como `hombro`, `espalda` o `pierna` no se
convierten automáticamente en un músculo específico: quedan como **Otro / sin
clasificar** hasta revisarlas en **Gym > Rutina > Biblioteca de ejercicios**.
La revisión actualiza la biblioteca y los análisis futuros sin reescribir
sesiones históricas. Desde el build 75 cada sesión nueva guarda un snapshot de
su clasificación; cambiar luego la biblioteca no altera ese análisis. Las
sesiones antiguas se mantienen derivadas y solo pueden fijarse desde
**Clasificación de sesiones antiguas**, con vista previa, snapshot de
recuperación y Deshacer. Los secundarios se muestran por separado y no se
suman de forma oculta al total general.

### Tipos de serie

Gym y Gym Party permiten marcar cada serie como **Calentamiento**, **Efectiva**,
**Back-off**, **Drop**, **Tecnica**, **Al fallo** o **Asistida**. Los registros
anteriores que no tienen `setType` se interpretan como `working` sin reescribir
el historial. Las series nuevas guardan tambien `completed`,
`excludeFromRecords` y `excludeFromProgression`.

El conteo visible incluye todas las series completadas. El volumen, las
repeticiones principales, el progreso muscular y las sugerencias usan solo
series efectivas. Los records aceptan series efectivas y back-off validas; los
calentamientos y tipos suplementarios permanecen visibles por separado. El
widget Android registra series efectivas por defecto y conserva esta semantica
al recalcular resumen e historial.

## Desarrollo y validacion

### Progreso consolidado

`Progreso` concentra la vista general, habitos, Gym, Nutricion, historial y
logros. Sus deep links usan `?module=progress&view=overview|habits|gym|nutrition|history|achievements`.
El selector de periodo permite comparar 7, 30, 90 dias o todo el historial;
los graficos incluyen resumen textual y una escala comun accesible.

Dentro de **Progreso > Gym > Musculos**, el mapa corporal frente/espalda abre
20 grupos anatomicos con IDs estables (`chest`, `lats`, `upper-back`,
`front-delts`, `quads`, etc.) y muestra series de la semana, ultimas cuatro
semanas, frecuencia, volumen, ejercicios y periodo anterior. Cada serie se
atribuye una sola vez al musculo primario. Una opcion separada permite explorar
los musculos secundarios sin sumarlos de forma oculta ni presentar el resultado
como una medicion fisiologica exacta. Los nombres legacy se conservan durante la
migracion. Deep link canonico:
`?module=progress&view=gym&progressScope=muscle&muscle=chest`.

**Ejercicios** mantiene variantes separadas por ID y muestra mejor carga,
mejor serie, e1RM estimado, reps, volumen, sesiones, gráfico seleccionable y
recomendación explicada. **Récords** deriva marcas desde el historial. Para
peso corporal se muestran reps y lastre, no `0 kg` como indicador de fuerza.

Validar estructura:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/validate-app.ps1
node ./scripts/test-service-worker.mjs
node ./scripts/test-workout-features.mjs
node ./scripts/test-workout-metrics.mjs
node ./scripts/test-progression-engine.mjs
node ./scripts/test-workout-anomalies.mjs
node ./scripts/test-gym-party.mjs
node ./scripts/test-gym-party-sync.mjs
node ./scripts/test-module-boundaries.mjs
node ./scripts/test-android-webview-security.mjs
node ./scripts/test-android-release.mjs
node ./scripts/test-accessibility.mjs
npm run test:axe
npm run test:manifest
npm run test:precache
npm run test:quality-gate
npm run test:design
npm run test:router
npm run test:layout
npm run test:home-settings
npm run build:web
npm run test:web-dist
npm run test:web-dist:e2e
npm run test:rules
npm run test:e2e
```

Sincronizar la version web dentro del APK y comprobarla:

```powershell
node ./scripts/generate-build-info.mjs
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

`.github/workflows/quality-gate.yml` es la unica matriz publicable. Ejecuta
contratos, datos/backups, PWA atomica, Nutricion, Progreso, Gym, Gym Party,
Playwright en Android/iPhone/escritorio, Firestore Emulator, axe sobre las siete
vistas centrales, accesibilidad conductual y
compilacion Android debug/release con firma efimera. Solo despues sube el
artifact web y el APK debug del canal seleccionado.

La auditoria axe no tiene reglas desactivadas. Las excepciones, si alguna se
necesita en el futuro, deben quedar justificadas en
`docs/accessibility-exceptions.md` con regla, navegador, issue y fecha de
revision.

- **Beta automatica:** `Validar aplicacion` se ejecuta en `main`, `master` y pull
  requests. Produce `protocolo-web-beta` y `protocolo-android-debug-beta`; no
  reemplaza la web estable.
- **PWA estable:** ejecutar manualmente `Publicar PWA en GitHub Pages` con canal
  `stable`. El job descarga exactamente el artifact aprobado por el gate; un
  recurso ausente, error de consola, E2E, reglas o Android fallido impide
  publicar. El canal `beta` solo genera artifacts descargables.
- **APK debug:** `Construir APK Android validado` es manual y reutiliza el mismo
  gate; no recompila desde una matriz mas debil.
- **APK release:** `Publicar APK Android release` espera el mismo gate y luego
  compila `v2.7.0` con la firma privada de GitHub Secrets, publica el APK
  versionado y adjunta su checksum SHA-256.

`scripts/build-web-dist.mjs` descubre las dependencias declaradas en HTML,
manifest, service worker y CSS, conserva su estructura en `dist-pages` y genera
`asset-manifest.json` con SHA-256. No existe una segunda lista de archivos en
los workflows consumidores.

La PWA no activa una nueva version a mitad de un registro: muestra aviso y solo
envia `SKIP_WAITING` cuando el usuario toca **Actualizar ahora**. El APK release
es distinto del debug y debe conservar siempre la misma clave de firma para
permitir actualizaciones sobre una instalacion previa.

El manifiesto permite orientacion libre. Usa iconos `any` y `maskable`
separados, capturas verificadas para telefono y escritorio y accesos directos
con iconos propios para Inicio, Gym, serie rapida, Nutricion y Gym Party. Para
regenerar los recursos visuales se ejecutan
`powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1` y
`npm run build:pwa-screenshots`; `npm run test:manifest` comprueba dimensiones,
rutas y que los iconos de shortcut no sean copias entre si.

Las pruebas sobre hardware no se deducen de Playwright ni de Gradle. La
checklist [docs/physical-test-checklist.md](docs/physical-test-checklist.md)
separa lo automatizado de lo ejecutado físicamente y deja los recorridos
pendientes para iPhone/Safari, Android Chrome/PWA, APK/widget y Gym Party con
dos dispositivos.

## Seguridad

La app usa lenguaje orientativo y no diagnostica deficiencias ni sustituye a entrenadores, nutricionistas, medicos u otros profesionales de salud. Ajusta cargas segun tecnica, dolor, fatiga y seguridad.

Android carga los assets internos mediante `WebViewAssetLoader` sobre
`https://appassets.androidplatform.net`; bloquea acceso a archivos/contenido,
mixed content y navegacion remota no permitida. Firebase, FDC y enlaces externos
se restringen por origen y los enlaces normales se abren fuera del WebView.

Focus Coins es solo gamificacion: no es dinero, inversion ni criptomoneda; no es transferible ni intercambiable por dinero. Referidos, conversiones, comisiones y rankings son simulaciones locales hasta conectar un backend real.
