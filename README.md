# Protocolo 0→100

Aplicacion instalable para registrar pantalla, sueno, lectura, actividad offline y reconstruccion de atencion. Calcula un puntaje diario, muestra tendencias y propone una accion clave segun el dia del protocolo.

Los datos se guardan localmente en el dispositivo. No hay servidor propio ni cuentas de usuario.

## Versiones incluidas

- **PWA:** funciona en navegador, se puede instalar y usar offline.
- **APK Android:** carga la misma app y puede importar estadisticas de uso con permiso explicito de Android.

## Publicar la PWA con GitHub Pages

1. Sube el contenido de este proyecto a un repositorio de GitHub.
2. En **Settings > Pages > Build and deployment > Source**, elige **GitHub Actions**.
3. Ejecuta **Actions > Publicar PWA en GitHub Pages > Run workflow**.

GitHub mostrara la URL publica al terminar el workflow.

## Generar el APK

1. Abre **Actions > Construir APK Android**.
2. Pulsa **Run workflow**.
3. Descarga el artifact `protocolo-0-100-apk`.
4. Descomprimelo e instala `protocolo-0-100-debug.apk` en Android.

El APK es una compilacion `debug`, adecuada para uso personal. Publicar en Play Store requiere una compilacion `release` firmada con una clave privada.

## Desarrollo

La version web de la raiz es la fuente principal. Antes de compilar Android localmente, sincronizala:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/sync-web-assets.ps1
```

Para comprobar que la copia Android esta actualizada:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/sync-web-assets.ps1 -Check
```

Estructura principal:

```text
index.html                         App web
manifest.webmanifest               Configuracion PWA
sw.js                              Soporte offline
icons/                             Iconos PWA
android-native-wrapper/            Proyecto Android
scripts/sync-web-assets.ps1        Sincronizacion web -> Android
.github/workflows/                 Publicacion PWA y compilacion APK
```

## Permiso de uso en Android

En el APK, abre la pestana **Telefono**, pulsa **Conceder permiso de uso**, habilita Protocolo 0→100 y vuelve a la app. Luego pulsa **Sincronizar uso de hoy desde Android**.

La clasificacion de uso no esencial es una estimacion basada en paquetes conocidos y conviene revisarla.
