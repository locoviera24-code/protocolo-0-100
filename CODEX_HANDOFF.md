# CODEX_HANDOFF - Protocolo 0->100

Ultima actualizacion del handoff: 2026-06-12  
Rama principal: `main`  
Version web/Android actual: `2.1.1`
Esquema de datos consolidado: `3`  
Cache actual del service worker: `protocolo-0-100-pwa-v10`

## 1. Estado actual de la app

La app es una PWA funcional, instalable y compatible con GitHub Pages. Tambien
existe un wrapper Android que carga los mismos archivos web y agrega puentes
nativos para voz y estadisticas de uso.

Modulos funcionales:

- Protocolo 0->100: registro diario, plan progresivo, score, historial,
  estadisticas, rachas, insignias y mantenimiento posterior al dia 100.
- Gimnasio: rutinas, ejercicios predefinidos y personalizados, series,
  repeticiones, peso, RIR, volumen e historial.
- Nutricion: alimentos locales, registro por gramos/comida, asistente de texto
  y voz, objetivos, cobertura diaria, diagnostico orientativo, recomendaciones
  y tendencias.
- USDA FoodData Central: busqueda hibrida local/cache/remota, importacion y
  edicion de alimentos, sin exponer una API key en el repositorio.
- Progreso integral: scores separados y score integral opcional.
- Gamificacion: Focus Coins, recompensas, rankings mensuales opcionales y
  referidos/afiliados simulados localmente.
- Persistencia: datos versionados en `localStorage`, migracion, backup JSON y
  exportaciones CSV.
- PWA: manifest, funcionamiento offline, cache versionado y aviso de nueva
  version.

Estado de publicacion:

- PWA publicada, ultima verificada:
  <https://locoviera24-code.github.io/protocolo-0-100/?v=210>
- APK debug personal:
  <https://github.com/locoviera24-code/protocolo-0-100/releases/download/v2.1.0/protocolo-0-100-debug.apk>
- Ultima publicacion verificada: version `2.1.0`; Pages y APK respondieron
  correctamente.
- Estado del repositorio: version `2.1.1` preparada con importacion v3
  completa, cache PWA acotada y validaciones CI; falta verificar su publicacion.

La nutricion es orientativa. La app evita diagnosticos medicos y debe conservar
frases como "segun lo registrado", "podrias priorizar" y "conviene revisar".

## 2. Archivos modificados y responsabilidad actual

Archivos fuente principales:

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | UI principal, navegacion, protocolo, gimnasio, registro nutricional, asistente nutricional y eventos base. |
| `nutrition-data.js` | Base local curada de 71 alimentos y definiciones de 28 nutrientes. |
| `fdc-client.js` | Cliente opcional de FoodData Central, normalizacion, cache y importador de datasets JSON compatibles. |
| `advanced-features.js` | Cobertura, diagnostico, recomendaciones, tendencias, comidas guardadas, backup v3, FDC UI, coins, rankings, recompensas y referidos. |
| `manifest.webmanifest` | Metadata de instalacion PWA. |
| `sw.js` | Cache offline acotada, navegacion network-first y version del service worker. |
| `README.md` | Documentacion general, despliegue y uso. |
| `scripts/validate-app.ps1` | Validaciones estructurales, de seguridad y sincronizacion. |
| `scripts/test-service-worker.mjs` | Prueba aislada de cache, offline, FDC y caches ajenos. |
| `scripts/sync-web-assets.ps1` | Copia los assets web fuente al wrapper Android. |
| `.github/workflows/deploy-pages.yml` | Publicacion automatica en GitHub Pages. |
| `.github/workflows/build-debug-apk.yml` | Compilacion del APK debug y publicacion de release. |
| `.github/workflows/validate-app.yml` | Validacion CI de contratos web/PWA y assets Android. |
| `android-native-wrapper/app/src/main/assets/*` | Copias generadas de los archivos web para Android. |
| `CODEX_HANDOFF.md` | Este contrato tecnico para continuar el desarrollo. |

Los archivos web de la raiz son la fuente de verdad. No editar directamente
`android-native-wrapper/app/src/main/assets/*`; ejecutar
`scripts/sync-web-assets.ps1` despues de cambiar la web.

## 3. Funciones principales implementadas

### Nucleo, protocolo y navegacion

- `planForDay`, `scoreEntry`, `readForm`, `saveEntry`, `renderAll`
- `setModule`, `activateTab`
- Registro diario, score individual, plan por fase, historial y estadisticas.

### Gimnasio

- `saveGymSession`, `renderGym`
- Rutinas, ejercicios por musculo, ejercicio personalizado, series,
  repeticiones, peso, RIR y volumen.

### Nutricion base y asistente

- `saveCustomFoodDefinition`, `allFoods`, `buildFoodEntry`, `addFood`,
  `renderNutrition`
- `parseNutritionStatement`, `analyzeNutritionText`,
  `confirmNutritionAssistant`
- Registro por gramos, medidas comunes, aliases aprendidos, previsualizacion y
  confirmacion antes de guardar.

### Diagnostico y recomendaciones

- `nutrientTotalsForDate`, `nutritionScoreForDate`, `renderCoverage`,
  `renderDiagnosis`, `scoredFoodsForDate`, `renderNutritionTrends`
- Barras de cobertura, tratamiento especial de limites como sodio,
  recomendaciones concretas y promedios semanales/mensuales.

### FoodData Central

- UI: `runFdcSearch`, `importFdcFood`, `renderFdcCachedFoods`,
  `importFdcDataset`
- Cliente: `normalizeFood`, `searchFoods`, `hybridSearch`, `getFoodDetails`,
  `importFood`, `importDataset` y metodos de configuracion/cache.
- Orden de busqueda: base local -> cache FDC -> API FDC si hay API key o
  backend configurado.

### Datos, backup y gamificacion

- `buildCompleteBackup`, `importCompleteBackupData`, `syncVersionedState`,
  `migrateAdvancedState`
- `renderIntegralScore`, `rebuildCoinLedger`, `renderRankings`,
  `renderReferral`
- Backup completo v3, CSV, Focus Coins, recompensas, rankings opcionales y
  referidos mock/locales.
- La importacion v3 restaura tambien modulo activo, ledger, rankings,
  recompensas y un referido nulo, sin importar configuracion FDC.

## 4. Estructura actual de datos en localStorage

### Claves principales

| Clave | Contenido |
| --- | --- |
| `protocolo_0_100_tracker_v1` | Array de registros diarios del protocolo. |
| `protocolo_0_100_start_date_v1` | Fecha inicial del protocolo. |
| `protocolo_0_100_action_dismissed_v1` | Mapa de acciones descartadas por fecha. |
| `protocolo_0_100_gym_sessions_v1` | Array de sesiones de gimnasio. |
| `protocolo_0_100_nutrition_entries_v1` | Array de alimentos consumidos. |
| `protocolo_0_100_nutrition_targets_v1` | Objetivos nutricionales editables. |
| `protocolo_0_100_body_metrics_v1` | Agua, peso y fecha de guardado por dia. |
| `protocolo_0_100_active_module_v1` | Modulo activo. |
| `protocolo_0_100_custom_foods_v1` | Alimentos personalizados/editados. |
| `protocolo_0_100_nutrition_aliases_v1` | Aliases aprendidos por el asistente. |
| `protocolo_0_100_saved_meals_v1` | Comidas frecuentes guardadas. |
| `protocolo_0_100_nutrition_profile_v1` | Perfil y preferencias nutricionales. |
| `protocolo_0_100_state_v2` | Snapshot consolidado con `schemaVersion: 3`. |
| `protocolo_0_100_referral_codes_v1` | Codigos de referido mock. |
| `protocolo_0_100_user_referral_v1` | Codigo aplicado por el usuario. |
| `protocolo_0_100_coin_ledger_v1` | Historial de Focus Coins. |
| `protocolo_0_100_ranking_settings_v1` | Alias y participacion en rankings. |
| `protocolo_0_100_monthly_rankings_v1` | Rankings mensuales locales/mock. |
| `protocolo_0_100_rewards_v1` | Recompensas e insignias. |
| `protocolo_0_100_cached_fdc_foods_v1` | Alimentos FDC importados/cacheados. |
| `protocolo_0_100_fdc_search_cache_v1` | Resultados temporales de busquedas FDC. |
| `protocolo_0_100_fdc_config_v1` | API key personal, backend URL y page size. |

`protocolo_0_100_state_v2` conserva su nombre antiguo por compatibilidad, pero
su contenido actual usa `schemaVersion: 3`. No renombrar la clave sin una
migracion explicita.

### Formas de datos relevantes

Registro diario:

```js
{
  date, day, totalScreen, nonEssential, sleepHours, noSocialMins,
  readingMins, offlineMins, anxiety, measuredScreen, wakeNoSocial,
  stableSchedule, phoneOutBed, noPhoneBed, writingDone, readBeforeScroll,
  keyActionDone, note, phoneImported, phoneImportedAt, phoneDetectedTotal,
  phoneDetectedNonEssential, phoneMetricSource, savedAt, score, parts, phase,
  keyAction, planGoal, planLimit, planReading, planNight
}
```

Sesion de gimnasio:

```js
{
  id, date, routine,
  items: [{ id, muscle, name, sets, reps, weight, rir }],
  notes, volume, savedAt
}
```

Entrada nutricional:

```js
{
  id, foodId, fdcId, date, meal, name, grams,
  calories, protein, carbs, fat,
  nutrients: { fiber, sugar, sodium, /* micronutrientes */ },
  source, sourceCitation, savedAt
}
```

Alimento FDC cacheado/importado:

```js
{
  id: `fdc-${fdcId}`, fdcId, name, description, aliases, category,
  portionGrams, calories, protein, carbs, fat,
  nutrients, units, dataType, brandOwner, servingSize, servingSizeUnit,
  confidence, source: "USDA FoodData Central", sourceCitation,
  importedAt, fdcImported: true, custom: true
}
```

Snapshot consolidado:

```js
{
  schemaVersion: 3,
  appVersion: "2.1.1",
  updatedAt,
  settings: { activeModule, nutritionProfile, ranking },
  dailyLogs, gymSessions, meals, customFoods, cachedFdcFoods,
  nutritionTargets, bodyMetrics, savedMeals, referralCodes, userReferral,
  coinLedger, monthlyRankings, rewards
}
```

El backup completo incluye tambien aliases legacy como `startDate`, `entries`,
`nutritionEntries`, `nutritionAliases` y `exportedAt`. La configuracion FDC y
su API key no deben incluirse en el backup.

## 5. Cambios pendientes

- Mover las llamadas FDC a un backend/proxy antes de uso publico con API key.
- Sustituir rankings, referidos, conversiones, comisiones y recompensas mock por
  servicios multiusuario con autenticacion y base de datos.
- Dividir gradualmente `index.html` en modulos sin cambiar contratos globales ni
  el orden de carga actual.
- Crear formularios completos para editar alimentos personalizados/FDC; hoy la
  edicion avanzada usa varios `prompt()`.
- Ampliar el importador FDC para ZIP/CSV o procesamiento por streaming.
- Añadir pruebas automatizadas de navegador, migraciones y calculos
  nutricionales.
- Preparar APK firmado de produccion si se publica fuera del uso personal.
- Revisar y adaptar objetivos nutricionales por pais/edad con asesoramiento
  profesional antes de afirmar mayor precision clinica.

## 6. Bugs conocidos y limitaciones

- `index.html` sigue siendo grande y parcialmente monolitico.
- Todo se guarda por dispositivo/navegador; no existe sincronizacion cloud.
- `localStorage` puede alcanzar su cuota con muchos datos o alimentos FDC. La
  cache FDC se limita a 750 alimentos y la cache de busqueda a 40 entradas/24 h.
- El modo FDC directo guarda una API key personal en el dispositivo. Es valido
  solo para pruebas/uso personal, no para produccion publica.
- Las descripciones remotas USDA suelen estar en ingles. La base local cubre
  nombres frecuentes en español/LatAm.
- El importador FDC acepta JSON compatible, no ZIP/CSV, y puede consumir memoria
  al analizar datasets grandes.
- El mapeo FDC puede omitir nutrientes o unidades no soportados. Marcas,
  coccion y porciones varian; por eso los alimentos importados son editables.
- La edicion de alimentos usa dialogos `prompt()` secuenciales y no expone
  todos los micronutrientes en un unico formulario.
- Rankings, afiliados, conversiones, comisiones y premium son simulaciones
  locales; no representan pagos ni competencia real.
- El service worker usa network-first para navegaciones y cache-first con
  revalidacion solo para assets principales. Tras desplegar, una pestaña ya
  abierta puede requerir una recarga para activar todos los cambios.
- La PWA del navegador no puede leer estadisticas Android; esa funcion requiere
  el puente del APK y permiso del usuario.
- Voz y reconocimiento dependen del navegador/permisos; el puente Android suele
  ser mas estable.
- El APK publicado es debug/personal, no una version firmada para Play Store.
- No hay suite E2E automatizada; actualmente se usa validacion estructural y
  pruebas manuales.

## 7. Como probar la app en GitHub Pages

1. Ejecutar las validaciones locales indicadas en la seccion 8.
2. Hacer push a `main`.
3. Verificar que finalice el workflow `Publicar PWA en GitHub Pages`.
4. Abrir
   `https://locoviera24-code.github.io/protocolo-0-100/?v=<cache-buster>`.
5. Si aparece el aviso de nueva version o se ve comportamiento anterior,
   recargar una vez.
6. Revisar la consola del navegador: no debe haber errores JavaScript.
7. Probar con ancho movil y confirmar que no exista scroll horizontal.

Para cambios web que tambien deban llegar al APK:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
```

Incrementar version web/Android, cache del service worker y tag de release
cuando corresponda publicar una nueva version.

## 8. Como probar funciones criticas

### Validacion local

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
node .\scripts\test-service-worker.mjs
git diff --check
```

### Nutricion y comidas

1. Abrir menu lateral -> `Nutricion` -> `Registrar`.
2. Registrar `200 g` de pechuga de pollo. Resultado local esperado aproximado:
   `330 kcal`, `62 g` de proteina y `512 mg` de potasio.
3. Probar el asistente con: `Almorce 200 g de pollo, una taza de arroz y media palta`.
4. Confirmar que detecta tres elementos, muestra previsualizacion y solo guarda
   despues de confirmar.
5. Guardar una comida frecuente, cargarla, repetir la comida de ayer, copiarla
   a otra fecha y eliminar un alimento.
6. Revisar totales de comida/dia, barras y diagnostico. El diagnostico debe
   decir "segun lo registrado" y no afirmar deficiencias medicas.

### FoodData Central

1. Sin API key: la busqueda debe devolver solo base local y cache FDC.
2. En ajustes FDC, configurar temporalmente una API key personal y buscar
   `broccoli`; comprobar limite/paginacion.
3. Importar un resultado y verificar fuente, `fdcId`, valores por 100 g,
   edicion y eliminacion.
4. Borrar la API key y repetir la busqueda; el alimento importado debe aparecer
   desde cache.
5. Exportar backup y confirmar que `cachedFdcFoods` esta incluido, pero la API
   key/configuracion FDC no.

### Scores, coins y rankings

1. Guardar un dia completo en Protocolo.
2. Verificar score, historial, progreso y score integral.
3. Revisar que Focus Coins se generen una sola vez por motivo/fecha.
4. Probar alias publico y salida voluntaria de rankings.
5. Confirmar que no se premien restriccion agresiva, sueño insuficiente ni
   sobreentrenamiento.

### Backup y CSV

1. Exportar backup JSON completo.
2. Confirmar `schemaVersion: 3`, logs, gimnasio, comidas, alimentos
   personalizados, cache FDC, coins y preferencias.
3. Importar el backup en un perfil/navegador limpio.
4. Verificar que no se pierdan datos previos ni se importe una API key FDC.
5. Exportar CSV de registros diarios, comidas y nutrientes diarios.

### PWA y service worker

1. En DevTools -> Application, revisar manifest, service worker y cache
   `protocolo-0-100-pwa-v10`.
2. Cargar la app online una vez, activar modo offline y recargar.
3. Confirmar que abren los modulos principales y que estan cacheados
   `index.html`, `nutrition-data.js`, `fdc-client.js`,
   `advanced-features.js`, manifest e iconos.
4. Confirmar que llamadas FDC/remotas no sean interceptadas ni respondidas con
   `index.html`.
5. Al cambiar assets web, incrementar el nombre de cache en `sw.js`, desplegar
   y comprobar el aviso de nueva version/recarga.

## 9. Partes que no deben reescribirse sin necesidad

- No reescribir toda la app ni reemplazar `index.html` de una vez. Refactorizar
  por modulos pequeños, conservando comportamiento y migraciones.
- Mantener este orden de scripts clasicos:
  1. `nutrition-data.js`
  2. `fdc-client.js`
  3. script principal inline de `index.html`
  4. `advanced-features.js`
- `advanced-features.js` envuelve globales como `renderNutrition` y
  `renderAll`; no renombrarlos ni cambiar el orden sin adaptar esos wrappers.
- No renombrar ni eliminar claves `localStorage` existentes sin migracion.
- No incluir claves FDC reales en codigo, commits, backups ni capturas.
- No eliminar campos legacy del backup sin probar importacion de datos viejos.
- No editar directamente los assets Android generados; sincronizarlos desde la
  raiz.
- No reemplazar el lenguaje nutricional seguro por afirmaciones medicas,
  culpabilizantes o de restriccion extrema.
- No convertir Focus Coins en dinero, cripto, activo transferible o promesa de
  valor.

## 10. Proximos pasos recomendados

1. Añadir pruebas unitarias para normalizacion FDC, calculos por gramos,
   cobertura, recomendaciones, score y migraciones; hoy CI cubre contratos
   estructurales, versiones, PWA y sincronizacion Android.
2. Extraer primero storage/migraciones y nutricion de `index.html` a modulos
   independientes, manteniendo una capa global compatible.
3. Implementar un proxy/backend FDC con rate limiting, cache y secretos fuera
   del cliente.
4. Migrar datos voluminosos, especialmente cache FDC, de `localStorage` a
   IndexedDB.
5. Crear formularios accesibles para alimentos y metas, reemplazando
   `prompt()`.
6. Añadir autenticacion y backend solo cuando se implementen rankings/referidos
   reales; conservar modo local/offline.
7. Crear pruebas E2E moviles para registro diario, nutricion, backup, offline y
   actualizacion del service worker.
8. Preparar firma, privacidad, terminos y canal de actualizacion antes de una
   distribucion publica del APK.
