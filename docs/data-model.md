# Mapa de datos

La fuente ejecutable es `data/schema-registry.js`. Este documento explica los
datos criticos y no duplica la lista completa de claves. Si hay una diferencia,
manda el registro y debe corregirse la documentacion.

## Camino de acceso Web

```text
dominio -> APP_REPOSITORIES -> APP_DATA -> validacion del registry
                                      -> localStorage compatible/write-ahead
                                      -> IndexedDB primario o espejo
```

`storageMode`, `primaryEligible`, `retention`, `backup`, `sensitive` y
`redaction` del registro determinan el comportamiento real.

## Datos criticos

| Data | Owner | Fuente canonica | Writers | Readers | Storage / backup | Tipo |
|---|---|---|---|---|---|---|
| Registro diario | Protocolo | `protocol:dailyLogs` | formulario diario via `ProtocolRepository` | Home, Progreso, backup | APP_DATA; backup `entries` | PRIMARY |
| Plan semanal | Workout | `workout:weeklyPlan` | editor de rutina | Gym, Home, Progreso | APP_DATA; backup `weeklyWorkoutPlan` | PRIMARY |
| Sesiones y series | Workout | `workout:sessions` (`workoutSessions`) | `workout-features.js`, importador nativo y reconciliacion autorizada | Gym, Home, Progreso, Gym Party | APP_DATA; backup `workoutSessions` | PRIMARY |
| `gymSessions` legacy | Migracion Workout | `protocol:legacyGymSessions` | codigo legado/importaciones antiguas | migrador unidireccional | migration-only; alias de backup | LEGACY, NO CANONICAL |
| Biblioteca/historial/equipo/preferencias Gym | Workout | entradas `workout:*` del registro | servicios Gym | Gym y Progreso | APP_DATA; backup segun registro | PRIMARY/SUPPORTING |
| Borradores | Drafts | `drafts:drafts` | `APP_DRAFTS` | formularios | localStorage, TTL 14 dias, no backup | TRANSIENT USER WORK |
| Nutricion | Nutrition | entradas `nutrition:*` | `NUTRITION_STORE`, recetas, porciones y proveedor | Nutricion, Progreso, backup | APP_DATA; backup segun registro | PRIMARY |
| Cache nutricional | Nutrition | `cachedFdcFoods`, `fdcSearchCache` | cliente/proveedor | buscador | LRU/TTL; la cache de busqueda no entra al backup | DERIVED CACHE |
| Progreso | Progress | registros de Protocolo, Workout y Nutricion | ninguno propio | vistas y modelos `progress/` | no hay store canonico de Progreso | DERIVED |
| Home Gym-first | Home | plan + `workoutSessions` + borradores | ninguno | `app/gym-home-state.js` | no persiste estado de Home | DERIVED |
| Gym Party local | Gym Party | entradas `gymParty:*` | `gym-party.js` y sync | UI, sync, backup | APP_DATA; Firebase config se redacta | PRIMARY LOCAL/SYNC |
| Gym Party remoto | Gym Party/Firebase | colecciones allowlisted y reglas Firestore | sincronizador autenticado | clientes de la sala | Firestore opcional; no reemplaza datos locales | REMOTE PROJECTION |
| Preferencias y flags | Settings | entradas `settings:*` | Ajustes y `APP_FEATURE_FLAGS` | todos los dominios afectados | local/APP_DATA; backup selectivo | PRIMARY CONFIG |
| Estado agregado `state_v2` | Backup/compatibilidad experimental | entradas canonicas anteriores | `syncVersionedState()` | export/sync experimental | local; no backup | DERIVED SNAPSHOT, NO CANONICAL |
| Cola Quick Actions Android | Android Workout | SharedPreferences + contrato schema 1 | widget/notificacion/reducer nativo | importador Web y diagnostico nativo | dispositivo Android; no backup Web independiente | TRANSIENT DURABLE QUEUE |
| Estado widget Android | Android Workout | SharedPreferences y `workout:widgetState` | bridge/sincronizador | widget, notificacion, Web | copia de control; el historial sigue en `workoutSessions` | DERIVED CONTROL STATE |
| Backup | Backup | `BACKUP_SERVICE` + registro | export/import explicitos | usuario y restore | JSON schema indicado por `backup:versionedState` | PORTABLE SNAPSHOT |

## Writers y reglas

- Una serie Web se incorpora mediante las operaciones de `workout-features.js`
  y termina en `workout:sessions`.
- Una serie nativa primero es una mutacion schema 1 en SharedPreferences; el
  importador valida `mutationId`, evita reentregas y actualiza el mismo historial.
- Gym Party comparte/reconcilia proyecciones identificadas, pero no crea un
  historial canónico paralelo.
- Home y Progreso no escriben sus resultados calculados.
- Una key nueva requiere entrada de registro antes de poder pasar
  `test-schema-registry.mjs`; `APP_DATA.write` rechaza claves desconocidas.

## Backup y migraciones

`data/backup-service.js` construye campos desde `backupFieldMap()`, excluye datos
sensibles, limita tamaño/profundidad, valida schema y aplica cambios mediante
snapshot recuperable. Los modos son fusionar, reemplazar y conservar. Un cambio
de schema requiere:

1. decision documentada en ADR;
2. migracion y compatibilidad hacia atras;
3. ajuste coordinado del registro y servicio de backup;
4. pruebas de export, import, conflictos, rollback y datos legacy;
5. decision explicita para cada dato nuevo sobre backup y sensibilidad.

## Sensibilidad

La configuracion local de FDC esta marcada sensible y no entra al backup. Gym
Party elimina `firebaseConfig` de mirrors y backups. Los borradores filtran
campos que parezcan secretos. Los secretos de firma y Firebase CI nunca son
datos de aplicacion ni artifacts.

## Deuda conocida

Hay claves literales repetidas y fallbacks directos a localStorage; el registro
impide claves desconocidas, pero no elimina por si mismo el riesgo de drift. El
agregado `state_v2` se reconstruye desde render en el baseline actual. Ver
`docs/technical-debt-register.md`; no copiar esos patrones en codigo nuevo.
