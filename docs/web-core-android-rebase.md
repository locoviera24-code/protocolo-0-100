# Integracion de Android Quick Access con Web Core Flow P0

Estado: rebase completado sobre `main` `569cb591`. La rama Android conserva sus
commits funcionales y adopta el contrato publico definido por
`gym/workout-quick-actions.js`.

## Contrato resultante

Existe un solo contrato publico: Workout Quick Actions schema 1.

- campo discriminador: `actionType`, nunca `type` para escrituras nuevas;
- guardado: `SAVE_SET`;
- compensacion: `UNDO_SET` con el `setId` exacto;
- peso: kg canonico;
- tiempo: segundos;
- distancia: metros;
- identidad: UUID v4 y timestamp ISO 8601 UTC;
- concurrencia: `expectedRevision` entero no negativo o `null`;
- seguridad: payload maximo de 16 KiB UTF-8 y rechazo recursivo de
  `__proto__`, `prototype` y `constructor`.

`SELECT_EXERCISE` y `TOGGLE_WEIGHT_STEP` siguen siendo comandos locales de la
interfaz Android. No se escriben en la cola como acciones publicas.

## Transporte nativo

`WorkoutMutationQueue` conserva internamente dos niveles:

1. `action`: envelope schema 1 que puede leer la WebView;
2. `transport`: estado de importacion, deduplicacion, ventana de Deshacer,
   destinos y errores de reintento.

El bridge expone solamente `action`. Los metadatos internos no forman otro
schema de Workout. `workoutSessions` sigue siendo la fuente canonica; la cola
solo transporta cambios pendientes y Gym Party sincroniza despues de la
importacion privada existente.

## Compatibilidad legacy

`WorkoutQuickActionContract.adaptLegacy()` y
`NATIVE_WORKOUT_IMPORTER.adaptLegacy()` aceptan temporalmente:

- `save_set`;
- `undo_set`;
- `UNDO_LAST_SET`;
- registros antiguos con `type`.

La adaptacion ocurre en memoria. Leer la cola no la reescribe, una entrada
corrupta no descarta las sanas y la confirmacion sigue siendo parcial por
`mutationId`. Ningun productor nuevo crea esos formatos.

El adaptador podra eliminarse solo despues de publicar una version estable que
importe colas legacy, mantenerla durante al menos un ciclo estable adicional y
comprobar en diagnostico manual que no quedan entradas antiguas. Eliminarlo
nunca debe borrar mutaciones pendientes.

## Conflictos resueltos durante el rebase

- `workout-features.js`: conserva Inicio/Gym de Web Core e integra bridge,
  notificacion, timer e importador Android.
- `index.html`, `styles/gym.css` y `styles/responsive.css`: conserva el flujo
  Entrenar primero y los layouts moviles de Web Core junto a los controles
  nativos.
- `scripts/sync-web-assets.ps1`: conserva modulos Web Core y agrega los modulos
  Android que se empaquetan.
- precache y assets Android: se regeneran desde la raiz web; no se editan como
  copias independientes.
- README, handoff y checklist: distinguen build 94 beta, stable 89 y pruebas
  fisicas pendientes.

## Pruebas repetidas

- nueve acciones y tres fuentes;
- schema/payload futuro, UUID, UTC, revision y resultados estables;
- limite UTF-8, valores no finitos, ciclos y prototype pollution;
- cola vacia, parcialmente corrupta, orden, retencion y confirmacion parcial;
- redelivery, doble toque y dos guardados deliberados;
- adaptacion legacy sin doble aplicacion ni escritura durante la lectura;
- `SAVE_SET` y `UNDO_SET` idempotentes sobre `workoutSessions`;
- contratos Web Core, artifact web, Android debug/release y paridad de assets.

Resultado local del 2026-08-05:

- Playwright: 397 funcionales + 33 Axe = 430 aprobadas; 14 omisiones
  deliberadas por plataforma;
- Firestore Emulator: aprobado;
- artifact web de 88 recursos, offline y smoke servido: aprobados;
- unitarias Android, debug, release firmado de prueba y paridad: aprobados;
- build `2.7.0+94`, Android `versionCode 38`, backup schema 3 y stable 89.

El gate remoto posterior al push reescrito aprobo en el run `31030685854`,
intento 1, en 21m08s. Repitio los 397 escenarios funcionales, 33 Axe, 14
omisiones deliberadas, Firestore Emulator, artifact/offline, Android
debug/release y paridad. SHA-256 de los artifacts descargados: web ZIP
`8D027951784745212803EED5A9F6E4AC9177D7C0F32A75B86CD5E7AEC31D91DE`,
Android ZIP
`B2AF63353EA20F88284C2E0EE4EC7C9D9CC08EA03F5631A13D9D0147C746D16F` y
APK debug contenido
`9DF971213C28D7CB92B21BA1F72210B9ED438D99D298FE16522DD8A5827999BB`.

Las pruebas de launcher, reinicio real, instalacion sobre APK anterior,
notificacion en bloqueo y comportamiento OEM siguen pendientes en
`docs/physical-test-checklist.md`.

## Rollback

La referencia inmutable previa al rebase es
`backup/android-quick-access-v1-pre-web-core-9464faa`, que apunta a
`9464faaad3d7bd81db2d71fc6aabf40aeb4dc7d5`. Tambien se pueden revertir solo
los commits de integracion posteriores al rebase. Ninguna opcion modifica
`main`, Web Core build 90, datos Workout ni la cola legacy.
