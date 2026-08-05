# Rebase de Android Quick Access sobre Web Core Flow P0

Web Core Flow P0 define el contrato canónico en
`gym/workout-quick-actions.js`. La rama `codex/android-quick-access-v1` sigue
separada y no fue fusionada ni modificada durante este bloque.

## Diferencias comprobadas

| Web Core schema 1 | Rama Android actual | Adaptación requerida |
| --- | --- | --- |
| `actionType` | reducer Java recibe acciones Android crudas y la cola usa `type` | Producir/leer `actionType` en el borde nativo. |
| `UNDO_SET` | `UNDO_LAST_SET` y cola `undo_set` | Resolver el `setId` exacto y emitir `UNDO_SET`. |
| `SAVE_SET` | cola `save_set` con un payload nativo amplio | Envolver el payload válido sin mantener otro schema público. |
| `ADJUST_WEIGHT.deltaKg` | reducer deriva incrementos del intent y del estado del widget | Convertir a kg antes de crear el envelope. |
| `COMPLETE_DISTANCE_SET` | no está implementado por el reducer revisado | Añadirlo o responder `UNSUPPORTED_ACTION`. |
| Nueve acciones públicas | Android añade `SELECT_EXERCISE` y `TOGGLE_WEIGHT_STEP` | Mantenerlas como comandos locales de UI; no presentarlas como mutaciones Workout schema 1. |
| códigos estables del contrato | resultados nativos como `saved`, `duplicate-delivery` y errores de texto | Mapear a `OK`, `DUPLICATE_MUTATION` u otro código estable. |

La cola `WorkoutMutationQueue` ya aporta durabilidad, límite, retención y
confirmación parcial. `gym/native-workout-importer.js` ya protege `setId`, pero
actualmente valida `save_set`/`undo_set`. Ambos deben adaptarse en el mismo
commit para que no convivan dos schemas de mutación.

## Conflictos previsibles

- `workout-features.js`;
- `index.html`;
- `styles/gym.css`;
- `gym/native-workout-importer.js`;
- lista de assets de `scripts/sync-web-assets.ps1`;
- pruebas Workout, widget y E2E;
- documentación y `CODEX_HANDOFF.md`.

Los Java del reducer, repositorio, cola y notificación no existen en `main`, por
lo que su conflicto será semántico más que textual.

## Orden recomendado

1. Fusionar Web Core Flow P0 en `main` después de aprobar su PR.
2. Rebasar `codex/android-quick-access-v1` sobre ese `main`.
3. Conservar la UX web y resolver manualmente los archivos compartidos.
4. Adaptar productores Java, cola e importer al schema 1 en un único bloque.
5. Eliminar el schema público paralelo en minúsculas; permitir adaptadores solo
   al leer mutaciones legacy ya persistidas.
6. Regenerar assets Android y repetir todos los gates.

## Pruebas que Android debe repetir

- cada acción y las tres fuentes;
- UUID/redelivery/doble toque;
- revisión esperada;
- confirmación parcial de la cola;
- `SAVE_SET` y `UNDO_SET` idempotentes;
- kg/lb, peso corporal, lastre, asistencia, tiempo, distancia y lateralidad;
- cierre de proceso, reinicio y cola parcialmente corrupta;
- widget compacto/estándar/expandido;
- notificación privada y pública;
- importación a `workoutSessions` sin duplicados;
- backup schema 3, IndexedDB/localStorage y Gym Party posterior;
- Android debug/release y paridad de assets;
- validación física pendiente en dispositivo real.

No se debe conservar un schema web y otro Android como contratos igualmente
canónicos. El adaptador legacy es temporal; el schema 1 es la frontera pública.
