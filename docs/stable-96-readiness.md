# Auditoría de preparación stable 2.7.0+96

Fecha de auditoría: 2026-08-25; cierre de blocker: 2026-08-26

Estado: **READY FOR STABLE**

Alcance: auditoría solamente; no se publicó web, PWA ni APK y no se modificó la configuración stable.

## Identidad

| Elemento | Valor |
| --- | --- |
| Árbol productivo auditado | `420da1b6b79fa01c48c61d43b0eec5402decc90a` |
| Base `main` tras fusionar la auditoría histórica | `342ec29aa4868ede9e00fc64c12e484607f50157` |
| Merge Android Quick Access | `39c40a204b79b502aeee50a6b7048ad1e94f6fe6` |
| Candidato Android validado físicamente | `a69657d89a841386c1fcc648594edbdc22e1b6cd` |
| Versión | `2.7.0` |
| Build web/PWA candidato | `96` |
| Android `versionCode` | `40` |
| Backup | schema `3` |
| Stable web/PWA publicado | `2.7.0+89`; metadata Android `33` en ese baseline |
| Commit stable publicado | `a8d3253359d7975ec37163e5dd7fd5a4846df658` |
| URL stable | `https://locoviera24-code.github.io/protocolo-0-100/` |
| Último APK no-prerelease | `v2.6.0`, Android `versionCode 31` |

El PR documental #3 se fusionó mediante merge commit
`420da1b6b79fa01c48c61d43b0eec5402decc90a`. La diferencia de árbol respecto
del merge Android contiene únicamente los seis archivos Markdown del cierre.
El sitio publicado seguía declarando build `89`, Android `33` y commit
`a8d3253` al realizar esta auditoría.

## Resultado por área

| Área | Estado | Evidencia | Bloqueante |
| --- | --- | --- | --- |
| Identidad del candidato | PASS | Los archivos de versión, guard, worker, precache y Gradle se alinean en `2.7.0+96` / `40`. | No |
| Stable actual | PASS | `.github/stable-release.json` y Pages permanecen en `2.7.0+89`; el último APK estable es `v2.6.0`/31. | No |
| Web Core Flow | PASS | Gate Web Core y regresión integrada: CTA único, Gym rápido, Progreso diferido y Experimental opt-in. | No |
| Android Quick Access | PASS | Gate automático y validación física Samsung sobre el mismo árbol productivo. | No |
| Persistencia | PASS | IndexedDB versión 2, claves existentes y `workoutSessions` canónico se conservan. | No |
| Backup/restore | PASS | Schema 3 sin cambios; pruebas de merge, replace, keep, rollback y undo. | No |
| PWA update/cache | PASS | Precache validado, activación atómica y bloqueo de update con trabajo pendiente. | No |
| Firebase | PASS | Secrets requeridos presentes; el artifact de CI usa configuración generada y las reglas pasan en emulador. | No |
| Gym Party multi-cliente físico | RISK ACCEPTED | Función opcional y local-first; reglas y sync están automatizados, pero falta prueba real con backend común. | No |
| PWA iPhone física | RISK ACCEPTED | WebKit automatizado cubre flujos; falta Safari/PWA en hardware real. | No |
| Segundo OEM/launcher | RISK ACCEPTED | Samsung One UI 8 está validado; widget, batería y launcher pueden variar por OEM. | No |
| Firma Android de producción | RISK ACCEPTED | Los cuatro Secrets requeridos existen y el workflow estable los exige; el certificado del candidato debe compararse con el APK público antes de subirlo. | No |
| Política de tag/APK | PASS | Stable usa `v2.7.0-build.96`, APK/checksum incluyen build y `versionCode` 40, y cualquier tag o release existente aborta sin `--clobber`. | No |
| Quality gate post-merge documental | PASS | Run `32911832691`, attempt 2, sobre `420da1b`: matriz completa verde. | No |

## Diferencia stable 89 a candidato 96

La comparación entre `a8d3253359d7975ec37163e5dd7fd5a4846df658` y el candidato
abarca 37 commits, 119 archivos, 9.793 inserciones y 1.142 eliminaciones.

| Dominio | Cambio relevante | Riesgo principal |
| --- | --- | --- |
| Web Core Flow | Inicio contextual, registro rápido de Gym, estados vacíos y Experimental separado. | Regresión de navegación o foco; cubierto por router, E2E y Axe. |
| Android Quick Access | Widgets compacto/estándar/expandido, selector, notificación privada y cola durable. | OEM, permisos, redelivery y privacidad; Samsung físico y JVM cubiertos. |
| Gym | Entrenar primero, edición avanzada conservada, recibo exacto, editar y deshacer por `setId`. | Pérdida o eliminación del set incorrecto; pruebas y física cubiertas. |
| Workout Quick Actions | Contrato público schema 1 con nueve acciones y tres fuentes. | Incompatibilidad legacy; adaptadores web/native conservados. |
| Nutrición | No cambia el modelo; se añadió protección de hidratación temprana del cache. | Carrera de carga inicial; regresión automatizada incluida. |
| Progreso | Render `rendered + dirty` e invalidación por eventos de dominio. | Vista obsoleta; cubierto por tests de invalidación/deep link. |
| PWA | Capacidades conservadoras, acceso rápido y artifacts versionados. | Diferencias de instalación por plataforma. |
| Service worker | Manifest con hash/tamaño, staging y activación controlada. | Mezcla 89/96; el worker conserva cache anterior hasta validar el nuevo. |
| Persistencia | Eventos de cambio de datos y cola Android durable. | Doble aplicación; deduplicación por `mutationId`. |
| Backup | Sin cambio de schema ni servicio de backup. | Importación legacy; suite schema 1/3 y transacciones. |
| Firebase/Gym Party | Importación nativa precede al sync web existente; config pública opcional de CI. | Prueba física multi-cliente pendiente. |
| Android nativo | Java 17, receivers estrictos, RemoteViews y foreground notification. | Variación OEM y lifecycle. |
| Permisos | Notificaciones y boot se gestionan sin bloquear Gym. | Denegación/OEM; física Samsung cubierta. |
| Notificaciones | Contenido privado y `publicVersion` genérica. | Exposición en lockscreen; prueba física con bloqueo seguro PASS. |
| Versionado | Web 89→96 y Android 33→40 en el baseline fuente; el APK público salta de 31→40. La versión semántica pasa de 2.6.0 a 2.7.0 para APK. | La identidad inmutable incorpora build 96 y `versionCode` 40; resta ejecutar el plan de publicación separado. |

## Compatibilidad de datos

- IndexedDB conserva `DB_VERSION = 2`; no hay borrado ni recreación de base en la ruta de actualización.
- `workoutSessions` sigue siendo la fuente canónica. `gymSessions` permanece como clave legacy de migración/importación.
- Las claves de Nutrición, Progreso, preferencias y ledger experimental no se renombran ni se eliminan.
- Experimental no escribe al leer ni recalcula saldos históricos; desactivado no genera recompensas nuevas.
- `WorkoutMutationQueue` usa SharedPreferences durable, `commit()`, límite/retención, cuarentena por entrada y confirmación parcial.
- El adaptador legacy transforma `type`, `save_set`, `undo_set` y `UNDO_LAST_SET` a schema 1 en memoria; no reescribe toda la cola al abrir.
- La deduplicación usa `mutationId`; la cola es transporte y no reemplaza el modelo web.
- Las búsquedas de `clear`, `deleteDatabase`, `DROP`, `wipe` y equivalentes no muestran una migración destructiva productiva. El borrado encontrado pertenece al reset explícito del usuario o a tests.

Resultado: la actualización 89→96 no requiere pérdida de IndexedDB, localStorage,
SharedPreferences, Workout, Nutrición, Progreso ni datos experimentales.

## Backup y restore

`data/backup-service.js` es idéntico entre stable 89 y el candidato. El formato
permanece en schema 3 y mantiene:

- importación de backups legacy y schema 3;
- modos Fusionar, Reemplazar y Conservar;
- preview y advertencia antes de reemplazar;
- snapshot de recuperación y rollback transaccional;
- Deshacer mediante recovery;
- filtrado de claves peligrosas y redacción de configuración Firebase;
- Workout, Nutrición, Progreso, preferencias y datos legacy.

La suite cubre schema futuro rechazado sin mutación, conflictos, reemplazo,
historial, undo y migración canónica de Gym. No existe una migración de backup
para este release porque el schema no cambió.

## Service worker y actualización PWA

La ruta 89→96 evita mezclar un shell antiguo con assets nuevos:

1. instala el nuevo precache en staging;
2. valida archivo, bytes y SHA-256 antes de promoverlo;
3. conserva el cache anterior si falla cualquier asset requerido;
4. no ejecuta `skipWaiting` automáticamente;
5. impide activar si hay borradores, formularios/importación abiertos o trabajo sin guardar;
6. fuerza `APP_DRAFTS.flushAll()` y `APP_DATA.flush()` antes de enviar `SKIP_WAITING`;
7. elimina caches anteriores solo durante `activate` y conserva caches ajenos;
8. sirve navegación profunda desde un shell consistente;
9. `app/build-guard.js` detecta metadatos mezclados y solicita actualizar.

Se consideran cubiertas recarga, offline, deep links, rollback de instalación y
pestaña antigua. iPhone standalone permanece como riesgo físico aceptado, no como PASS.

## Firma Android de producción

El workflow `build-release-apk.yml` exige, sin imprimir sus valores:

- `ANDROID_KEYSTORE_BASE64`;
- `ANDROID_KEYSTORE_PASSWORD`;
- `ANDROID_KEY_ALIAS`;
- `ANDROID_KEY_PASSWORD`.

Los cuatro Secrets existen en Actions y mantienen fechas de configuración del
2026-07-10. El mismo workflow produjo releases anteriores, incluido `v2.6.0`.
El quality gate normal usa una clave efímera deliberada y por eso no demuestra
la identidad de producción. La actualización física ya aprobada usó APKs con
una misma firma local, no el APK público `v2.6.0`. Se acepta el riesgo porque
los Secrets de firma no cambiaron desde esa release, pero el plan debe verificar
el certificado del candidato contra el APK público antes de subirlo, sin extraer
ni revelar el keystore.

## Gate cerrado de tag y artifacts inmutables

La política aprobada deriva la identidad stable exclusivamente de
`app-version.json`:

```text
tag: v2.7.0-build.96
APK: protocolo-0-100-v2.7.0-build.96-android.40-release.apk
checksum: protocolo-0-100-v2.7.0-build.96-android.40-release.apk.sha256
```

El workflow de APK stable:

- solo se inicia mediante `workflow_dispatch`;
- exige `main` para una publicación no prerelease;
- calcula `v<version>-build.<build>` y rechaza cualquier `release_tag` stable distinto;
- comprueba que no exista ni la GitHub Release ni el tag antes de crear;
- aborta cada caso de existencia con `exit 1`;
- crea la release contra `--target "$GITHUB_SHA"`;
- no usa `gh release upload`, no usa `--clobber` y nunca mueve un tag;
- publica APK y checksum con build 96 y `versionCode` 40 en sus nombres;
- no modifica `.github/stable-release.json` ni despliega Pages;
- conserva la firma exclusivamente mediante los cuatro Secrets Android ya auditados.

Las regresiones deterministas cubren identidad vacía stable, rechazo de
`v2.7.0`, rama stable distinta de `main`, prerelease sin sufijo, versión/build/
`versionCode` inválidos, nombres exactos del candidato, ausencia de upload o
clobber y orden de los rechazos antes de `gh release create`.

La política no crea por sí misma ningún tag o release. La publicación continúa
siendo una tarea separada y debe comparar certificado, commit y SHA-256 antes de
su ejecución. Con este gate cerrado, no queda un blocker técnico abierto para
preparar stable.

## Canales stable independientes

### Web/PWA

- Workflow: `.github/workflows/deploy-pages.yml`.
- Destino: GitHub Pages, `https://locoviera24-code.github.io/protocolo-0-100/`.
- `channel=beta` solo genera artifacts; `channel=stable` despliega.
- Un push a `main` que cambie `.github/stable-release.json` también dispara el despliegue stable.
- El artifact aprobado por quality gate se publica completo; el archivo stable es el registro/trigger de promoción.

### APK Android

- Workflow: `.github/workflows/build-release-apk.yml`.
- Ejecuta quality gate, genera config Firebase opcional, sincroniza assets y compila con Java 17/Gradle.
- Firma con los cuatro Secrets de producción.
- Publica APK y archivo SHA-256 en un GitHub Release.
- No despliega Pages ni modifica `.github/stable-release.json`.

Los canales no se publican automáticamente juntos. Su orden, validación y
rollback deben definirse en un plan de release separado.

## Firebase y Gym Party

- Los seis Secrets `FIREBASE_*` esperados existen en Actions.
- Con los campos requeridos, CI genera una configuración web pública; no incluye service accounts ni claves privadas.
- Sin Secrets, el script conserva un stub seguro y Gym Party funciona solo en modo local/demo, con mensaje de alcance.
- El artifact beta validado de `main` contiene configuración generada, no el stub.
- Firestore Emulator valida reglas, denegaciones esperadas, revisión y sincronización.
- La importación Android actualiza primero `workoutSessions`; Gym Party sincroniza después mediante la capa web existente.

La prueba física con dos clientes y backend común sigue BLOCKED. Se acepta como
riesgo porque Gym Party es opcional, el dato primario es local y el modo sin
backend está delimitado. Si la estrategia stable lo promociona como función
principal, esa decisión deberá reabrir este gate.

## Evidencia física y riesgos residuales

Samsung SM-A165M, Android 16/API 36, One UI 8:

- PASS: instalación/actualización con firma compatible, widgets en tres tamaños,
  selector, reps/carga, SAVE/UNDO, doble toque, cola, cierre de proceso, reinicio,
  offline, notificación privada/pública, permiso, kg/lb, asistencia, lastre,
  unilateral, tiempo, distancia y PWA Android.
- RISK ACCEPTED: PWA iPhone sin hardware. La matriz WebKit cubre lógica, pero no
  equivale a Safari standalone físico, teclado, viewport ni actualización real.
- RISK ACCEPTED: segundo OEM/launcher. RemoteViews, redimensionado, batería,
  lockscreen y permisos pueden variar. Para un primer stable se acepta con
  notificación/app como fallback y seguimiento temprano en otro OEM.
- RISK ACCEPTED: Gym Party multi-cliente con backend común, por su carácter opcional.

No se convirtió ningún pendiente físico en PASS y no se repitió la matriz
Samsung porque el merge documental no cambia el árbol productivo validado.

## Quality gate

El árbol productivo Android fue validado antes del merge y el merge documental
disparó nuevamente el workflow completo sobre `main`:

| Evidencia | Resultado |
| --- | --- |
| Run post-merge | `32911832691`, attempt 2, success en 16m25s |
| SHA | `420da1b6b79fa01c48c61d43b0eec5402decc90a` |
| Playwright funcional | 403 PASS |
| Omisiones deliberadas | 14 |
| Axe | 33/33 PASS |
| Firestore Emulator | PASS |
| Artifact/smoke/offline/service worker | PASS |
| Android JVM/debug/release/firma de prueba | PASS |
| Paridad web/Android | PASS |
| Artifact web | `protocolo-web-beta`, 556.561 bytes, `sha256:001d324257d86774da8e3f684c7d120d4ffa2b58276be632a1fe1f5ee2951e24` |
| Artifact Android | `protocolo-android-debug-beta`, 1.857.942 bytes, `sha256:4fd5a54c3007ff8c579f8029c408fef754ac8d9d4d14a21dd305be1dd7fb5b98` |

El attempt 1 finalizó con 402 PASS y una carrera en la aserción de cache dirty
de Progreso después de cambiar de pestaña. La prueba exacta pasó 5/5 al
reproducirla localmente sin cambios; el attempt 2 pasó la matriz completa. No se
relajó la aserción, no se añadió espera y no se modificó producto ni tests. CI
no sustituye ni amplía la evidencia física registrada.

El cierre de la política inmutable añade pruebas estructurales y unitarias sin
cambiar producto. Su HEAD final debe completar nuevamente el quality gate del
PR y `main` debe repetir el gate en canal beta después del merge; los Run ID y
hashes de artifacts se registran en el PR para no convertir este documento en
una referencia circular que requiera otro commit tras cada ejecución.

## Recomendación final

**READY FOR STABLE**

Blockers concretos restantes: ninguno.

Permanecen como **RISK ACCEPTED**, no como PASS: PWA iPhone física, segundo
OEM/launcher y Gym Party físico multi-cliente. Deben constar en el plan de
publicación, en los criterios de aborto y en la observación posterior al release.
La declaración READY autoriza diseñar y revisar el plan; no publica, etiqueta ni
promueve por sí misma el candidato.

## Acciones prohibidas durante esta auditoría

No se modificó `.github/stable-release.json`, no se disparó `channel=stable`,
no se ejecutó el workflow de release APK, no se creó tag ni GitHub Release, no
se publicó Pages, no se movió `baseline-stable-2.7` y no se cambió versión,
build, `versionCode` o schema.
