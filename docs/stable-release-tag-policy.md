# Política de identidad e inmutabilidad de releases

Esta política separa la versión semántica del número de build y evita que una
publicación posterior reemplace silenciosamente artifacts ya distribuidos.

## Identidad

La identidad stable se deriva únicamente de `app-version.json`:

```text
tag: v<version>-build.<build>
APK: protocolo-0-100-<tag>-android.<versionCode>-release.apk
```

Para el candidato actual:

```text
tag: v2.7.0-build.96
APK: protocolo-0-100-v2.7.0-build.96-android.40-release.apk
```

La versión semántica comunica compatibilidad del producto. `build` identifica
un artifact web/PWA concreto y `versionCode` mantiene el orden de actualización
Android. Ninguno de esos tres valores se omite de la trazabilidad del APK.

## Stable

- Se inicia solamente mediante `workflow_dispatch` de
  `.github/workflows/build-release-apk.yml`.
- Debe ejecutarse con ref `main`.
- Si `release_tag` queda vacío, el workflow usa el tag canónico calculado.
- Si se proporciona, debe coincidir exactamente con el tag canónico.
- El tag y la GitHub Release no deben existir antes del despacho.
- Una release existente provoca fallo; no se mueven tags ni se usa `--clobber`.
- Tag, commit, APK, certificado y SHA-256 deben corresponder al mismo candidato.
- Antes de crear la release, el workflow obtiene el ultimo release no-prerelease,
  exige un unico APK y compara certificado, `applicationId` y `versionCode`.
- Si el baseline no puede descargarse, la firma difiere, cambia el paquete o el
  `versionCode` no aumenta, la publicacion falla cerrada.
- Pages stable exige que version/build de `.github/stable-release.json`
  coincidan con `app-version.json`. La via canonica es un PR minimo que promueva
  ese registro; un dispatch stable desalineado falla y beta no se bloquea.

## Prerelease

Una prerelease requiere `prerelease=true` y un tag explícito con sufijo:

```text
v<version>-build.<build>-<sufijo>
```

Ejemplo:

```text
v2.7.0-build.96-rc.1
```

El sufijo acepta letras ASCII, números, puntos y guiones. Las prereleases pueden
ejecutarse desde una rama candidata, pero conservan el mismo build y
`versionCode` declarados en su commit.

## Canales separados

Este workflow publica exclusivamente el APK en GitHub Releases. No despliega
Pages ni modifica `.github/stable-release.json`. La promoción Web/PWA se realiza
por `.github/workflows/deploy-pages.yml` y requiere una decisión separada.

## Reejecución y rollback

Una reejecución después de crear la release falla en lugar de reemplazarla. Si
la publicación fue incorrecta, se conserva la evidencia, se revierte el código
por el procedimiento normal y se genera un build/versionCode nuevo. No se
reutiliza el tag ni se sobrescribe el APK descargado por usuarios.

Antes de cualquier stable deben verificarse sin revelar secretos:

1. certificado del APK candidato frente al último APK público compatible;
2. SHA-256 generado y descargado;
3. commit objetivo del tag;
4. versión, build y `versionCode` dentro del artifact;
5. rollback de Web/PWA y APK como operaciones independientes.

## Alcance de este cambio

La política y su validación no crean tags, releases ni artifacts públicos. No
modifican versión, build, `versionCode`, backup schema ni el canal stable actual.
