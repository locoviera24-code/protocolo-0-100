# Controles Android de acceso rapido V1

Estado: beta `2.7.0+94`, Android `versionCode 38`, en
`codex/android-quick-access-v1`. No forma parte de la linea estable 2.7 hasta
que se fusione y publique de forma explicita.

## Experiencia

En **Gym > Acceso rapido durante el entrenamiento** se puede:

- solicitar al launcher que agregue el widget, cuando Android lo admite;
- ver si ya existe una instancia;
- activar la notificacion privada de entrenamiento de forma contextual;
- consultar pendientes sin exponer detalles de almacenamiento;
- abrir el diagnostico manual solo cuando sea necesario.

La PWA explica que estas funciones requieren el APK. No promete widgets de
keyguard: Android moderno no ofrece esa superficie de forma general. La pantalla
de bloqueo se cubre mediante una notificacion persistente `VISIBILITY_PRIVATE`
cuya version publica solo dice **Entrenamiento en curso**. El canal es silencioso
y de importancia predeterminada para que los fabricantes no lo oculten por ser
de prioridad baja; su visibilidad final sigue dependiendo de los ajustes del
telefono.

## Flujo de datos

`WorkoutQuickActionReducer` es el unico punto que procesa acciones del widget y
de `WorkoutControlReceiver`. Antes de ejecutar una accion reclama su
`deliveryId`; una reentrega del mismo `PendingIntent` no vuelve a procesarse.

Una serie se guarda en este orden:

1. `WorkoutMutationQueue` persiste una accion `SAVE_SET` schema 1 con UUID,
   fuente, revision esperada y payload seguro.
2. Se actualiza el snapshot compatible `state_json`.
3. Se actualizan widget y notificacion.
4. El WebView lee solamente mutaciones `pending`.
5. `NATIVE_WORKOUT_IMPORTER` incorpora cada `setId` una sola vez en
   `workoutSessions`.
6. El bridge confirma por ID; la cola lo marca `imported`.
7. Gym Party prepara su sincronizacion despues de la importacion privada.

La cola es transporte durable, no un segundo historial. Conserva hasta 200
mutaciones y retiene importadas durante siete dias. Una entrada corrupta se
separa en una cuarentena nativa y no invalida las entradas sanas.

## Deshacer

Durante diez segundos, `WorkoutMutationQueue.latestUndoableSave()` permite
crear una mutacion compensatoria `UNDO_SET` dirigida al `setId` exacto. Si la serie aun no se importo, la
mutacion original queda `undone`; si ya se importo, el compensador elimina el
`setId` canonico. Una confirmacion tardia no puede reactivar una mutacion
deshecha.

La cola guarda el envelope publico dentro de `action` y los metadatos de
transporte dentro de `transport`. El bridge entrega solo el schema 1. Un
adaptador de lectura acepta temporalmente `save_set`, `undo_set`,
`UNDO_LAST_SET` y envelopes con `type` ya persistidos; no los vuelve a escribir
ni permite que productores nuevos los creen.

## Layouts

- Compacto: selector directo, valor preparado, -0,5, +0,5, -5, Guardar y +5.
- Estandar: agrega correccion simetrica de reps y contexto de la serie.
- Expandido: agrega solamente rutina, progreso, temporizador y guia de carga.

Los pasos de 0,5 y 5 kg permanecen visibles simultaneamente: tocar el peso no
cambia de layout ni revela una botonera adicional. Tocar **Elegir · ejercicio**
abre `WorkoutExercisePickerActivity`, una lista nativa de
la rutina que selecciona cualquier ejercicio directamente. El snapshot publica
`exerciseLoadGuidance` por ejercicio; al seleccionar se actualizan **Ultima** y
**Max.** usando solamente series comparables por equipo, modalidad y carga.

La seleccion usa el ancho y alto actuales informados por el launcher; las
dimensiones maximas de otra orientacion no pueden cambiar el layout tras un
toque. Todos los botones funcionales miden al menos 48 dp. Tiempo y distancia no reutilizan controles de
repeticiones: muestran la metrica y abren el editor si hace falta corregirla.
Peso corporal sin lastre muestra **Peso corporal**, no `0 kg`.

Previews de estructura, no capturas fisicas:

- [compacto](previews/widget-workout-compact.svg)
- [estandar](previews/widget-workout-standard.svg)
- [expandido](previews/widget-workout-expanded.svg)

## Temporizador y ciclo de vida

El descanso persiste tiempos monotónicos y referencias de reloj civil. No
escribe un contador cada segundo. `AlarmManager` despierta al final del
descanso; no se mantiene un foreground service innecesario. Tras reinicio o
actualizacion del APK se recalibra el reloj, se actualizan superficies y se
reprograma la alarma. Cambio de fecha y zona horaria actualizan el widget.

## Privacidad

La notificacion activa existe solo durante una sesion `en progreso`. No usa
full-screen intents, no abre la actividad sobre el bloqueo y no expone grupos,
miembros, codigos, emails, notas o Firebase IDs. El permiso
`POST_NOTIFICATIONS` se solicita al tocar **Activar controles** o al iniciar el
entrenamiento desde ese flujo. Si fue rechazado, el mismo control abre los
ajustes del canal **Controles de entrenamiento**.
La sesion web se envia a Android en el mismo momento en que se toca **Empezar
entrenamiento**. El estado comprueba ademas si la notificacion quedo realmente
publicada; si Android bloquea el canal, **Revisar notificacion** abre sus ajustes.
La notificacion usa un canal nuevo para no heredar un canal anterior ocultado
por el fabricante. Su vista expandida ofrece -0,5, +0,5, -5, +5, Guardar y el
selector de ejercicio; Android puede exigir desbloquear antes de abrir este
ultimo. La barra de estado junto al registro indica si está activa, esperando
una sesión, sin permiso u ocultada por Android.

## Compatibilidad y rollback

`state_json` permanece disponible para APK y datos anteriores. Las feature
flags `nativeWorkoutControlsV1`, `lockScreenWorkoutControls` y
`nativeRestTimer` controlan la beta. Con las flags apagadas se conserva el
comportamiento estable. `workoutSessions` sigue siendo la fuente canonica y los
backups schema 3 no cambian.

El host empaquetado no necesita un service worker para funcionar offline. En la
primera carga tras actualizar, `MainActivity.auditPackagedWebCache()` desregistra
workers antiguos y elimina solo caches cuyo nombre comienza con
`protocolo-0-100-pwa-`; despues recarga los assets del APK. No borra IndexedDB,
localStorage ni datos personales. Esto evita una mezcla visible entre una beta
nueva y recursos retenidos por una beta anterior.

## Limites comprobables

- No hay Firebase nativo: Gym Party sincroniza despues de la importacion del
  WebView o al recuperar conectividad.
- No se declara compatibilidad de widget keyguard.
- Los previews no sustituyen pruebas en launcher o pantalla de bloqueo real.
- Las pruebas fisicas pendientes se enumeran en
  [physical-test-checklist.md](physical-test-checklist.md).
