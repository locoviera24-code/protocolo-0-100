# Plan de publicacion Stable 2.7.0+96

Estado: **PLAN PARA REVISION; NO EJECUTADO**

Este documento define una publicacion posterior y explicitamente autorizada.
No crea tags, GitHub Releases ni despliegues, y no modifica
`.github/stable-release.json`.

## Identidad bloqueada del candidato

| Elemento | Valor |
| --- | --- |
| Commit a publicar | `c0d409b29d5c185e2f85e92ac49cd8e939077db0` |
| Version | `2.7.0` |
| Build web/PWA | `96` |
| Android `versionCode` | `40` |
| Backup | schema `3` |
| Tag APK previsto | `v2.7.0-build.96` |
| APK previsto | `protocolo-0-100-v2.7.0-build.96-android.40-release.apk` |
| Checksum previsto | `protocolo-0-100-v2.7.0-build.96-android.40-release.apk.sha256` |
| Stable actual antes de publicar | `2.7.0+89` |

La publicacion debe abortarse si `main` deja de apuntar al commit indicado o si
cambia version, build, `versionCode`, backup schema o metadata stable antes de
comenzar. Cualquier correccion posterior requiere una nueva identidad de build;
no se debe reutilizar este tag.

## Evidencia previa

El quality gate beta post-merge `33017845835`, attempt 1, valido exactamente el
commit candidato en 18m26s:

- 403 pruebas Playwright aprobadas y 14 omisiones deliberadas;
- Axe 33/33;
- Firestore Emulator, artifact web, smoke, offline y service worker aprobados;
- Android JVM, debug, release con firma efimera y paridad web/Android aprobados;
- artifact `protocolo-web-beta`: 556.564 bytes, digest
  `sha256:69b2d37f8d4afe8c9c301ef4b4b00e6a7275fea01a4eb514c1dbfebdbac0cc50`;
- artifact `protocolo-android-debug-beta`: 1.857.945 bytes, digest
  `sha256:e19458f4a8fa118e2ae7ae3fd31cc9500efec3f5491ab0b7e869697d02700669`;
- APK debug contenido: 1.906.949 bytes, SHA-256
  `c53e4476949eb4456b45a84304bea62ab4251bc4959fc0a5a310c927c9b6382c`.

Estos hashes prueban el gate beta, no sustituyen el SHA-256 del APK estable
firmado. El hash estable se conoce solo cuando se construye el artifact exacto
con la firma de produccion.

## Orden recomendado

1. Congelar el SHA candidato y repetir las comprobaciones previas de identidad,
   tag/release inexistentes y quality gate verde.
2. Verificar la firma Android de produccion y preparar el APK estable sin
   exponer el keystore.
3. Publicar primero el APK y su checksum mediante el workflow Android estable.
4. Descargar el APK publicado, verificar firma, hash, version y actualizacion
   sobre el ultimo APK publico compatible.
5. Solo despues de validar Android, promover Web/PWA build 96 mediante el flujo
   de Pages estable.
6. Ejecutar smoke conjunto de APK, web, PWA, rutas profundas, offline y update.

Publicar Android primero mantiene Web/PWA 89 disponible mientras se valida el
canal con mayor dependencia de firma. Los canales siguen siendo independientes:
un fallo Android no debe forzar una promocion web, y un rollback web no debe
mover ni reemplazar un release Android.

## Preflight obligatorio

Antes de cualquier workflow con canal estable:

1. Confirmar que `main` y `origin/main` apuntan al SHA candidato y que el arbol
   esta limpio.
2. Confirmar `2.7.0+96`, Android `40`, backup schema `3` y stable `89`.
3. Confirmar que no existen el tag ni la GitHub Release
   `v2.7.0-build.96`.
4. Confirmar que el quality gate mas reciente sobre el SHA candidato esta verde.
5. Confirmar que los cuatro Secrets Android requeridos existen, sin imprimir sus
   valores.
6. Confirmar que la configuracion Firebase esperada esta disponible y que el
   artifact no cae accidentalmente al stub/demo.
7. Descargar y conservar localmente la evidencia del ultimo Pages estable y del
   ultimo APK publico compatible para rollback y comparacion.

## Verificacion del certificado Android

La firma debe compararse **antes de crear la GitHub Release**:

1. Descargar el ultimo APK publico compatible desde su release oficial.
2. Obtener con `apksigner verify --print-certs` el digest SHA-256 del certificado
   del APK anterior. El digest del certificado es publico; el keystore y sus
   contrasenas no lo son.
3. En el entorno protegido de Actions, construir el candidato con los Secrets de
   produccion y obtener el mismo digest del APK candidato.
4. Comparar ambos digests y abortar antes de `gh release create` si difieren.
5. No descargar, imprimir ni persistir el keystore. El archivo temporal debe
   eliminarse mediante el paso `always()` ya definido.

La tarea de publicacion debe asegurar un punto de control verificable entre la
compilacion firmada y `gh release create`. Si el workflow no puede demostrar esa
comparacion antes de publicar, se considera criterio de aborto y debe ajustarse
en un PR separado.

## Publicacion Android prevista

La tarea autorizada debe ejecutar `.github/workflows/build-release-apk.yml`
desde `main`, con `prerelease=false` y el tag vacio o exactamente igual a
`v2.7.0-build.96`.

Antes de confirmar la publicacion se debe verificar que el workflow:

- deriva la identidad desde `app-version.json`;
- aborta si ya existe el tag o la release;
- no usa `gh release upload` ni `--clobber`;
- crea la release contra `--target "$GITHUB_SHA"`;
- adjunta el APK y el checksum con los nombres previstos;
- no despliega Pages ni modifica `.github/stable-release.json`.

Tras publicar:

1. Descargar ambos assets desde la GitHub Release.
2. Calcular SHA-256 del APK descargado y compararlo con el archivo `.sha256`.
3. Verificar que tag, release y commit objetivo coinciden con el SHA candidato.
4. Verificar paquete, `versionName 2.7.0`, `versionCode 40` y certificado.
5. Instalar como actualizacion sobre el ultimo APK publico compatible sin borrar
   datos y comprobar inicio, Gym, nutricion, progreso, widget y notificacion.

## Promocion Web/PWA prevista

Solo despues de validar Android, la tarea autorizada debe promover build 96 con
`.github/workflows/deploy-pages.yml` en `channel=stable` y actualizar el registro
stable mediante el procedimiento versionado del repositorio.

La promocion debe:

- ejecutar el quality gate sobre el mismo SHA candidato;
- publicar el artifact completo, nunca archivos sueltos;
- declarar build 96 y el SHA candidato en `build-info.json`;
- mantener hashes de precache y service worker consistentes;
- evitar mezcla de HTML 89 con JavaScript/CSS 96;
- conservar la evidencia del deployment anterior antes de reemplazarlo.

## Smoke post-release

### Web/PWA y Pages

1. Abrir la URL de Pages en una sesion limpia y comprobar build 96.
2. Verificar carga inicial, recarga, una ruta profunda y navegacion por Inicio,
   Gym, Nutricion, Progreso y Mas.
3. Confirmar registro diario, serie y comida con datos sinteticos.
4. Confirmar service worker, precache, update desde una pestana antigua y modo
   offline.
5. Confirmar que no quedan recursos del build 89 servidos dentro del shell 96.
6. Verificar PWA instalada y recuperacion tras cierre forzado cuando haya
   hardware disponible.

### Android

1. Descargar desde la release publica, no reutilizar el artifact local.
2. Verificar checksum y certificado.
3. Actualizar una instalacion compatible conservando IndexedDB, localStorage,
   SharedPreferences, backups y `workoutSessions`.
4. Comprobar app, widgets, selector, SAVE/UNDO, cola, notificacion privada y
   `publicVersion`.
5. Confirmar funcionamiento offline y reentrega idempotente al reconectar.

## Rollback

### Web/PWA

- Abortando antes del deploy, conservar Pages en build 89.
- Si el deploy 96 falla, redeplegar el ultimo artifact estable conocido desde su
  SHA y run aprobados, y verificar que Pages vuelve a declarar build 89.
- Registrar el rollback en un commit/PR separado; no mezclar archivos 89 y 96 ni
  editar manualmente recursos publicados.
- Mantener la cache anterior hasta confirmar que el shell restaurado es completo.

### Android

- Una GitHub Release publicada es inmutable: no mover el tag, sobrescribir el APK
  ni usar `--clobber`.
- Si el APK 96/40 presenta un defecto, detener la promocion web si aun no ocurrio,
  documentar el incidente y preparar un build y `versionCode` nuevos.
- El rollback Android es una actualizacion correctiva con identidad nueva; nunca
  una sustitucion silenciosa del release anterior.

## Criterios de aborto

Abortar antes de publicar cualquiera de los canales si ocurre al menos uno:

- `main` no coincide con el SHA candidato o el arbol no esta limpio;
- version, build, `versionCode`, backup schema o metadata stable difieren;
- quality gate incompleto, cancelado o fallido;
- tag o GitHub Release candidatos ya existentes;
- certificado del APK candidato distinto del ultimo APK publico compatible;
- Secrets de firma o Firebase faltantes/inconsistentes;
- artifact, checksum, nombres o commit objetivo no coinciden;
- regresion de datos, backup, update PWA, offline, permisos o privacidad;
- imposibilidad de conservar evidencia y una ruta concreta de rollback;
- cualquier accion intentaria usar `--clobber`, mover un tag o sobrescribir un
  release existente.

## Criterios de exito

La publicacion se considera completa solo cuando:

- tag `v2.7.0-build.96` y release apuntan al SHA candidato;
- APK y checksum publicos coinciden, y certificado/versionado son correctos;
- la actualizacion Android conserva los datos y supera el smoke fisico;
- Pages sirve exclusivamente `2.7.0+96` con service worker y precache coherentes;
- carga, recarga, ruta profunda, offline y acciones cotidianas funcionan;
- ambos canales conservan artifacts, hashes, Run IDs y evidencia de rollback;
- no se ha convertido en PASS ninguno de los riesgos fisicos aceptados sin
  observacion real.

## Riesgos aceptados y seguimiento

Permanecen como **RISK ACCEPTED**, no como PASS:

- PWA iPhone fisica pendiente;
- segundo OEM/launcher Android pendiente;
- Gym Party fisico multi-cliente con backend compartido pendiente.

Estos riesgos no impiden preparar el plan, pero deben observarse despues de la
publicacion y reabrir el gate si aparece perdida de datos, exposicion de
informacion o fallo de una funcion principal.

## Acciones no realizadas por este plan

No se creo `v2.7.0-build.96`, no se creo una GitHub Release, no se ejecuto
`build-release-apk.yml`, no se desplego Pages, no se modifico
`.github/stable-release.json`, no se movio el baseline stable y no se publico
ningun APK.
