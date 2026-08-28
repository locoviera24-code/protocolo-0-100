# Cierre post-release Stable 2.7.0+96

Fecha de publicacion: 27 de agosto de 2026.

## Identidad de produccion

| Campo | Valor |
| --- | --- |
| Version | `2.7.0` |
| Web/PWA build | `96` |
| Android `versionCode` | `40` |
| Backup schema | `3` |
| `ANDROID_RELEASE_SHA` | `9675f026f05c35c9d9aed570df3a4b45879d9040` |
| `WEB_PROMOTION_SHA` | `2ee22731d63732e094de87c6bae2d29e1c3bb495` |
| Registro stable | `2.7.0+96`, canal `stable`, solicitado `2026-08-27` |
| Cache PWA | `protocolo-0-100-pwa-2.7.0-b96` |

La diferencia entre ambos SHA es exclusivamente administrativa. El diff
`9675f026..2ee22731` contiene solo `.github/stable-release.json`, que promueve
el registro Web/PWA de build 89 a build 96. No hay cambios productivos entre
el arbol publicado para Android y el servido por Pages.

## Android Stable

- Tag inmutable: `v2.7.0-build.96`.
- GitHub Release ID: `377949226`.
- Estado: publicado, no draft y no prerelease.
- Target: `9675f026f05c35c9d9aed570df3a4b45879d9040`.
- APK: `protocolo-0-100-v2.7.0-build.96-android.40-release.apk`.
- APK SHA-256:
  `f1b3b7ba13ab1891bd807af1a084d9679735eb1140b1f8c90fb069ae0b35f61b`.
- Package: `com.protocolo.cien`.
- `versionName`: `2.7.0`; `versionCode`: `40`.
- Certificado SHA-256:
  `47d8139d1fddaeed130baa6c774c69a04d066192010666d24e22e64d98cc3a6d`.
- Continuidad: certificado y package iguales al APK Stable anterior; el
  `versionCode` subio de 31 a 40.

El APK descargado desde la release publica se valido fisicamente en un Samsung
SM-A165M con Android 16/API 36, One UI 8 y launcher Samsung. El checksum,
package, certificado, instalacion publica e instalacion posterior mediante
`adb install -r` pasaron. Inicio, Gym, selector, guardado unico de serie,
widget, notificacion, background/foreground, warm start y cold start pasaron;
no se observaron crashes ni ANR.

La primera instalacion publica requirio retirar, con autorizacion humana, una
instalacion local firmada con una clave de prueba diferente. Eso es la
proteccion normal de Android ante certificados incompatibles y no un fallo del
APK de produccion. Una instalacion posterior del mismo APK publico con
`adb install -r` conservo los datos sinteticos creados en Stable.

## Web/PWA Stable

- PR de promocion: `#8 Release: promote Web/PWA Stable to build 96`.
- Merge: `2ee22731d63732e094de87c6bae2d29e1c3bb495`.
- Cambio del PR: solo `.github/stable-release.json`, build 89 a 96.
- Pages run: `33110470010`, resultado `success`.
- Guard de alineacion de promocion: PASS.
- Playwright: 403 PASS; 14 skips deliberados por plataforma.
- Axe: 33/33.
- Firestore Emulator: PASS.
- Artifact web, smoke, offline, service worker, Android gate y paridad: PASS.
- Artifact `protocolo-web-stable` SHA-256:
  `8e8eae3c1d889e7b791cab70aa809bcc5217c2251525d255bc0b5a14bccc2962`.
- Artifact `github-pages` SHA-256:
  `9cb4c790e27d47fcc8583ef3d7ba8db5c7978bb36534d02afc8724a9be0b6010`.

La verificacion publica confirmo build `2.7.0+96`, Android 40, canal `stable`
y commit `2ee22731d63732e094de87c6bae2d29e1c3bb495`. Inicio, Gym, Nutricion,
Progreso y Mas respondieron 200. Navegacion profunda, recarga y shell offline
pasaron. El service worker usa build 96 y la cache
`protocolo-0-100-pwa-2.7.0-b96`; no se observo mezcla de assets 89/96.

## Riesgos residuales aceptados

Estos casos no son PASS y permanecen como `RISK ACCEPTED`:

- PWA fisica en iPhone pendiente.
- Segundo OEM/launcher Android pendiente.
- Gym Party fisico multi-cliente con backend compartido pendiente.

Fueron aceptados antes de publicar. No aparecio evidencia nueva de perdida de
datos, exposicion de privacidad ni fallo de los flujos principales.

## Rollback

- Android: no mover ni sobrescribir `v2.7.0-build.96`. Cualquier correccion se
  publica como una version/build y `versionCode` superiores, con tag y release
  nuevos, conservando la continuidad del certificado.
- Web/PWA: no editar Pages manualmente. Preparar una promocion administrativa
  revisada hacia un artifact previamente validado, mantener metadata y codigo
  alineados, ejecutar el gate completo y verificar cache, rutas y rollback.
- En ambos canales, conservar backup schema 3 y no borrar IndexedDB,
  localStorage, SharedPreferences ni `workoutSessions`.

## Declaracion final

**STABLE 2.7.0+96 CLOSED — PRODUCTION BASELINE**
