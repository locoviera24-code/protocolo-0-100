# Controles Android de acceso rapido V1

Estado: beta en `codex/android-quick-access-v1`. No forma parte de la linea
estable 2.7 hasta que se fusione y publique de forma explicita.

## Experiencia

En **Gym > Acceso rapido durante el entrenamiento** se puede:

- solicitar al launcher que agregue el widget, cuando Android lo admite;
- ver si ya existe una instancia;
- activar la notificacion privada de entrenamiento de forma contextual;
- consultar pendientes sin exponer detalles de almacenamiento;
- abrir el diagnostico manual solo cuando sea necesario.

La PWA explica que estas funciones requieren el APK. No promete widgets de
keyguard: Android y el fabricante pueden no permitirlos. La pantalla de bloqueo
se cubre mediante una notificacion `VISIBILITY_PRIVATE` cuya version publica
solo dice **Entrenamiento en curso**.

## Flujo de datos

`WorkoutQuickActionReducer` es el unico punto que procesa acciones del widget y
de `WorkoutControlReceiver`. Antes de ejecutar una accion reclama su
`deliveryId`; una reentrega del mismo `PendingIntent` no vuelve a procesarse.

Una serie se guarda en este orden:

1. `WorkoutMutationQueue` persiste una mutacion `save_set` con UUID, fuente,
   revision esperada y payload.
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
crear una mutacion compensatoria `undo_set`. Si la serie aun no se importo, la
mutacion original queda `undone`; si ya se importo, el compensador elimina el
`setId` canonico. Una confirmacion tardia no puede reactivar una mutacion
deshecha.

## Layouts

- Compacto: valor preparado, Guardar y Editar; maximo cuatro acciones.
- Estandar: controles simetricos de reps y carga, Guardar, Repetir/Deshacer y
  Siguiente; maximo siete acciones.
- Expandido: agrega ajustes rapidos, Anterior, Siguiente y acceso a Gym.

La seleccion usa ancho y alto minimos/maximos del launcher. Todos los botones
funcionales miden al menos 48 dp. Tiempo y distancia no reutilizan controles de
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
`POST_NOTIFICATIONS` se solicita solo al tocar **Activar controles**. Si fue
rechazado, el mismo control abre los ajustes de notificaciones de Android.

## Compatibilidad y rollback

`state_json` permanece disponible para APK y datos anteriores. Las feature
flags `nativeWorkoutControlsV1`, `lockScreenWorkoutControls` y
`nativeRestTimer` controlan la beta. Con las flags apagadas se conserva el
comportamiento estable. `workoutSessions` sigue siendo la fuente canonica y los
backups schema 3 no cambian.

## Limites comprobables

- No hay Firebase nativo: Gym Party sincroniza despues de la importacion del
  WebView o al recuperar conectividad.
- No se declara compatibilidad de widget keyguard.
- Los previews no sustituyen pruebas en launcher o pantalla de bloqueo real.
- Las pruebas fisicas pendientes se enumeran en
  [physical-test-checklist.md](physical-test-checklist.md).
