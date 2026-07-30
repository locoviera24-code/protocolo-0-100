# Acceso rapido Android P0

Estado: candidato P0 en `codex/android-quick-access-p0`, version `2.7.0`,
build web/PWA `90` y Android `versionCode 34`. No modifica
`baseline-stable-2.7`, no esta fusionado en `main` y no publica stable.

## Experiencia

En **Gym > Acceso rapido durante el entrenamiento** se puede:

- solicitar al launcher el widget mediante `requestPinAppWidget`;
- comprobar si existe una instancia real;
- activar controles privados durante una sesion;
- ver si un cambio esta guardado en el dispositivo, pendiente de importar,
  pendiente de sincronizar o necesita atencion.

La PWA explica que widget y controles nativos requieren el APK. Android moderno
no ofrece un widget keyguard universal; esta version no declara `keyguard`. La
superficie oficial en pantalla bloqueada es una notificacion privada y su
disponibilidad final depende de la version de Android y del fabricante.

## Arquitectura

Las responsabilidades quedan separadas:

- `WorkoutQuickActionReducer` procesa acciones del widget y la notificacion;
- `WorkoutNativeRepository` conserva snapshot, revision y entregas procesadas;
- `WorkoutMutationQueue` guarda la cola durable y su cuarentena;
- `NativeWorkoutControlRepository` crea `save_set` y `undo_set`;
- `WorkoutWidgetUpdateService` solo prepara y renderiza `RemoteViews`;
- `WorkoutControlNotificationManager` construye la notificacion;
- `gym/native-workout-importer.js` aplica la cola al historial canonico.

`state_json` se conserva como snapshot compatible. No es la cola ni un segundo
historial. `workoutSessions` sigue siendo la fuente privada canonica.

## Cola e idempotencia

Cada serie se guarda como una mutacion con UUID, `sessionId`, `exerciseId`,
`setId`, revision esperada, fuente, payload, estado y fechas. Los estados son
`pending`, `imported`, `rejected` y `undone`.

El guardado sigue este orden:

1. persistir `save_set` mediante `SharedPreferences.commit()`;
2. actualizar el snapshot compatible y el estado visual;
3. actualizar widget y notificacion;
4. importar por `setId` al abrir o reactivar el WebView;
5. confirmar individualmente cada `mutationId`;
6. dejar que Gym Party use su sincronizacion web existente.

La idempotencia combina:

- UUID por mutacion;
- `deliveryId` persistido antes de procesar cada `PendingIntent`;
- revision esperada;
- ventana de 650 ms para doble toque accidental;
- deduplicacion global por `setId` en el importador.

Una reentrega no crea otra serie. Dos guardados posteriores siguen siendo
validos.

## Deshacer

Durante diez segundos, la accion contextual crea una mutacion compensatoria
`undo_set`. La serie original pasa a `undone` y no puede reactivarse mediante
una confirmacion tardia. Si ya estaba importada, el WebView elimina exactamente
su `setId`. La operacion no depende de que la WebView este abierta.

## Widgets

- **Compacto:** selector, serie y valor preparados, Guardar, Editar o Deshacer
  y temporizador. Maximo cuatro botones; el editor resuelve las correcciones que
  no caben.
- **Estandar:** selector, reps -/+, carga -/+0,5, Guardar y Siguiente, que se
  convierte en Deshacer durante la ventana. Maximo siete acciones.
- **Expandido:** agrega -/+5 kg, progreso breve y orientacion de carga.

Los layouts usan ancho y alto actuales del launcher. No existen controles
funcionales de 1 dp; todos los botones miden al menos 48 dp. El selector nativo
permite saltar directamente a cualquier ejercicio de la rutina. La guia
**Ultima** y **Mejor** respeta ejercicio, equipo, modalidad, semantica de carga,
lateralidad, calentamientos, exclusiones y anomalias pendientes.

Peso corporal sin lastre no muestra `0 kg`. Asistencia conserva su campo
positivo. Tiempo y distancia usan sus metricas; si no pueden editarse con
seguridad en el widget, **Editar** abre el registro enfocado.

Previews estructurales:

- [widget compacto](previews/widget-workout-compact.svg)
- [widget estandar](previews/widget-workout-standard.svg)
- [widget expandido](previews/widget-workout-expanded.svg)

## Notificacion y bloqueo

La notificacion solo existe cuando hay una sesion `en progreso` y la persona
activo los controles. En Android 13 o superior se solicita
`POST_NOTIFICATIONS` desde esa accion, nunca al primer arranque.

El canal **Controles de entrenamiento** es silencioso, sin heads-up y de
importancia baja. Cada estado ofrece exactamente tres acciones:

- normal: `+1 rep`, `Guardar`, `Siguiente`;
- tras guardar: `Deshacer`, `Editar`, `Siguiente`.

El contenido detallado fuerza `VISIBILITY_PRIVATE`, incluso si existe una
preferencia legacy `public`. La version publica solo dice
**Entrenamiento en curso** y **Controles disponibles al desbloquear**. No usa
full-screen intents ni muestra peso, reps, notas, historial o Gym Party.

Previews estructurales:

- [notificacion privada](previews/notification-workout-private.svg)
- [notificacion publica](previews/notification-workout-public.svg)

## Temporizador y ciclo de vida

El descanso usa referencias de `elapsedRealtime`; no persiste un contador por
segundo ni inicia un foreground service. `AlarmManager` programa el final.
Pausa, reanudacion y restauracion sobreviven al proceso. Reinicio,
`MY_PACKAGE_REPLACED`, cambio de fecha y zona horaria recalculan las
superficies necesarias.

## Compatibilidad y rollback

Las feature flags `nativeWorkoutControlsV1`, `lockScreenWorkoutControls` y
`nativeRestTimer` estan apagadas por defecto. Con ellas apagadas permanece el
comportamiento estable. No cambia backup schema 3, no se elimina `state_json`,
no se agrega Firebase nativo y no se modifican Nutricion, Protocolo ni la
publicacion estable.

La cola conserva hasta 200 mutaciones; las importadas se retienen siete dias.
Una entrada parcialmente corrupta se pone en cuarentena sin descartar las
entradas sanas.

## Verificacion

Automatizada:

- `npm run test:native-controls`;
- `gradle :app:testDebugUnitTest`;
- `gradle :app:assembleDebug`;
- Playwright para descubrimiento web y bridge simulado;
- regresion Workout, datos, backup, Gym Party, PWA y paridad Android.

Los SVG y PNG son previews, no capturas de un telefono. Las pruebas fisicas de
launcher, bloqueo, permisos, reinicio y actualizacion permanecen pendientes
hasta disponer de hardware, segun
[physical-test-checklist.md](physical-test-checklist.md).
