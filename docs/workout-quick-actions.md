# Contrato público de acciones rápidas de Workout

Estado: schema 1. Consumidores previstos: web, widget Android y notificación
Android.

`gym/workout-quick-actions.js` es un módulo puro. Describe intenciones y
resultados, pero no persiste datos, no crea series y no sustituye
`workoutSessions`. El consumidor aplica una acción mediante el modelo Workout
existente y usa `mutationId` para garantizar idempotencia.

## Envelope

| Campo | Regla |
| --- | --- |
| `schemaVersion` | `1`. |
| `payloadVersion` | `1`. |
| `actionType` | Uno de los nueve tipos documentados. |
| `mutationId` | UUID v4 estable para reintentos de la misma mutación. |
| `source` | `web`, `android-widget` o `android-notification`. |
| `sessionId` | ID no vacío de la sesión privada. |
| `exerciseId` | ID canónico no vacío del ejercicio. |
| `createdAt` | ISO 8601 UTC canónico, con sufijo `Z`. |
| `clientVersion` | Versión y build, por ejemplo `2.7.0+90`. |
| `expectedRevision` | Entero no negativo o `null`. |
| `payload` | JSON seguro de hasta 16 KiB UTF-8. |

No existe `actionId`: `mutationId` identifica la operación durable y también
la correlaciona con su resultado.

## Payload por acción

| `actionType` | Payload |
| --- | --- |
| `ADJUST_REPS` | `{ "delta": 1 }`; entero distinto de cero. |
| `ADJUST_WEIGHT` | `{ "deltaKg": 0.5 }`; kg canónicos, finito y distinto de cero. |
| `SAVE_SET` | `{ "setId": "set-3", "values": { ... } }`; `values` se entrega al modelo canónico de series. |
| `UNDO_SET` | `{ "setId": "set-3" }`; objetivo exacto, nunca “la última serie” implícita. |
| `REPEAT_LAST_SET` | `{ "sourceSetId": "set-2" }`. |
| `PREVIOUS_EXERCISE` | `{}`. |
| `NEXT_EXERCISE` | `{}`. |
| `COMPLETE_TIME_SET` | `{ "setId": "set-time", "durationSeconds": 60 }`. |
| `COMPLETE_DISTANCE_SET` | `{ "setId": "set-distance", "distanceMeters": 1000, "durationSeconds": 300 }`; duración opcional. |

Unidades canónicas:

- carga externa, lastre y asistencia: kilogramos;
- tiempo: segundos;
- distancia: metros;
- repeticiones: enteros.

La conversión desde libras pertenece a la interfaz productora. El envelope no
transporta una unidad ambigua. La semántica de `measurementMode`, `loadMode`,
equipo y lateralidad sigue perteneciendo al modelo de Workout, no a este
contrato.

## Ejemplo válido

```json
{
  "schemaVersion": 1,
  "payloadVersion": 1,
  "actionType": "SAVE_SET",
  "mutationId": "11111111-1111-4111-8111-111111111111",
  "source": "android-widget",
  "sessionId": "session-2026-08-03",
  "exerciseId": "press-banca",
  "createdAt": "2026-08-03T12:00:00.000Z",
  "clientVersion": "2.7.0+90",
  "expectedRevision": 3,
  "payload": {
    "setId": "set-3",
    "values": { "reps": 8, "weightKg": 60, "setType": "working" }
  }
}
```

Ejemplos inválidos:

```json
{ "actionType": "ADJUST_WEIGHT", "payload": { "delta": 5, "unit": "lb" } }
```

Debe convertirse antes a `deltaKg` y completar el envelope.

```json
{ "actionType": "SAVE_SET", "payload": { "setId": "set-3" } }
```

`SAVE_SET` requiere el objeto `values`. Los valores numéricos deben ser números
JSON finitos. También se rechazan
`NaN`, `Infinity`, ciclos, más de 12 niveles, objetos no JSON, más de 16 KiB
UTF-8 y las claves `__proto__`, `prototype` o `constructor` en cualquier nivel.

## Resultados

El resultado contiene:

- `schemaVersion`;
- `mutationId`;
- `status`: `applied`, `rejected` o `ignored`;
- `resultingRevision`: entero no negativo o `null`;
- `errorCode`;
- `errorMessage` opcional y no contractual;
- `appliedAt`: fecha ISO UTC para `applied`, `null` en los demás estados.

`OK` solo es válido con `applied`. `rejected` e `ignored` siempre usan otro
código estable:

- `INVALID_SCHEMA`;
- `INVALID_PAYLOAD`;
- `REVISION_CONFLICT`;
- `DUPLICATE_MUTATION`;
- `SESSION_NOT_FOUND`;
- `EXERCISE_NOT_FOUND`;
- `SET_NOT_FOUND`;
- `UNSUPPORTED_ACTION`.

```json
{
  "schemaVersion": 1,
  "mutationId": "11111111-1111-4111-8111-111111111111",
  "status": "applied",
  "resultingRevision": 4,
  "errorCode": "OK",
  "appliedAt": "2026-08-03T12:00:01.000Z"
}
```

El código es contractual. `errorMessage` puede traducirse y nunca debe dirigir
la lógica.

## Idempotencia y revisión

Un reintento conserva el mismo `mutationId`. El consumidor registra los IDs ya
aplicados y responde `ignored` con `DUPLICATE_MUTATION` sin crear otra serie.
`expectedRevision` permite rechazar con `REVISION_CONFLICT` una acción creada
sobre un estado anterior. `createAction(input, { now, uuid })` admite reloj y
UUID inyectados para pruebas deterministas.

## Implementacion Android beta

Android Quick Access V1 adopta este contrato desde el build 94. La cola nativa
expone solamente envelopes schema 1 y conserva estado de transporte fuera del
envelope. Un adaptador temporal convierte en memoria entradas persistidas con
`type`, `save_set`, `undo_set` o `UNDO_LAST_SET`; no se crean nuevas entradas
legacy ni se reescribe toda la cola al leerla. `workoutSessions` permanece como
fuente canonica y Gym Party sincroniza despues de la importacion privada.

La cola, SharedPreferences y el bridge son implementaciones de transporte, no
parte de este contrato puro. No existe Firebase nativo ni un segundo historial
Workout.
