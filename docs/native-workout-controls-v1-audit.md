# Controles nativos de entrenamiento V1 - auditoría inicial

Fecha: 2026-07-28  
Rama: `feature/native-workout-controls-v1`  
Base estable: `baseline-stable-2.7` -> `a8d3253`  
HEAD de partida: `1a9186e`

## Comportamiento actual comprobado en código

- `WorkoutWidgetProvider` recibe ajustes de repeticiones, peso, repetición de la
  última serie, navegación y guardado aunque `MainActivity` no esté abierta.
- `WorkoutWidgetUpdateService` guarda todo el estado en
  `SharedPreferences("protocolo_workout_widget")`, clave `state_json`.
- Guardar desde el widget modifica una copia completa de `workoutSession` y
  `exerciseHistory` dentro de ese JSON. El `set.id` usa el reloj del sistema.
- La WebView importa después el JSON mediante
  `WORKOUT_FEATURES.importWidgetStateFromAndroid()`. La protección actual
  compara `lastNativeMutationAt`, reemplaza la sesión completa y luego escribe
  `workoutSessions` mediante `WorkoutRepository`/`APP_DATA`.
- La fuente privada canónica sigue siendo `workoutSessions`; el JSON nativo es
  un transporte provisional, pero todavía también funciona como historial
  mutable y no como cola append-only.
- La importación no duplica una sesión por `session.id`, pero no existe una cola
  de mutaciones ni una comprobación independiente por `setId`.
- `SharedPreferences.Editor.apply()` conserva el estado tras cerrar la
  actividad y normalmente tras reiniciar el teléfono. No existe `BOOT_COMPLETED`
  ni reconciliación explícita al arrancar.
- El temporizador actual de Workout es un `setInterval` de la WebView con
  `restTimerEndsAt` solo en memoria. No sobrevive a destruir la WebView.
- Gym Party posee una membresía singular en
  `protocolo_0_100_gym_party_membership_v1`. La serie nativa solo llega a la
  cola compartida cuando la app importa la sesión y ejecuta
  `syncFromLocalWorkouts()`.
- Sin conexión, el guardado nativo privado permanece en `SharedPreferences` y
  Gym Party queda pendiente hasta abrir la app y recuperar conectividad.
- Cada tap directo dispara una lectura, mutación, `apply()` y actualización del
  widget. Dos taps rápidos de Guardar no tienen ventana de deduplicación y
  pueden producir dos series distintas.
- Los `PendingIntent` del widget son explícitos, inmutables y tienen request
  codes estables por acción. No existe todavía notificación de entrenamiento.
- El widget dispone de layouts small y medium; no hay layout large.
- La última carga visible procede de `exerciseHistory`, pero no aplica toda la
  política de `comparisonKey`. No se muestra un récord comparable validado.

## Línea base ejecutada

Aprobado:

- Workout features, métricas, equipos, progresión y anomalías: 5/5 contratos;
- Gym Party y sincronización incremental: 2/2 contratos;
- Progreso: 3/3 contratos;
- schema registry, integridad, IndexedDB/repositorios y backup: 4/4 contratos;
- sincronización de assets web/Android;
- validación estructural: 496 IDs únicos;
- seguridad WebView y contrato de release Android.

Omisiones o límites de entorno, no atribuidos como aprobados:

- Firestore Emulator no inició porque `java` no estaba en `PATH`;
- Android debug no inició porque Gradle no estaba en `PATH` y el wrapper no
  incluye `gradlew`;
- la selección E2E multiplataforma superó el límite local de 20 minutos antes
  de producir un resultado terminal.

Los tres puntos deben repetirse con Java/Gradle configurados y con un timeout
adecuado antes de cerrar el proyecto.

## Decisiones para V1

- `workoutSessions` seguirá siendo la única fuente histórica privada.
- La capa nativa guardará estado compacto y una cola append-only; no volverá a
  usar el JSON completo del widget como única cola.
- La importación será idempotente por `mutation.id` y `setId`.
- Temporizador, widget y notificación leerán el mismo repositorio nativo.
- La sincronización cerrada no se declarará inmediata: como mínimo quedará
  durable y se procesará al abrir la app o recuperar conexión.
- Las funciones nuevas permanecerán detrás de flags apagadas por defecto. La
  línea estable y la etiqueta `baseline-stable-2.7` no se modificarán.
