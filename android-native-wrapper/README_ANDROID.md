# Android wrapper - Protocolo 0->100

Proyecto Android nativo que empaqueta la PWA, expone puentes JavaScript
controlados y registra el widget real de pantalla de inicio.

## Arquitectura

- `MainActivity.java` carga assets con `WebViewAssetLoader` en
  `https://appassets.androidplatform.net/assets/index.html`.
- El WebView bloquea acceso a archivos/contenido, universal file URLs y mixed
  content; activa Safe Browsing y limita navegacion remota.
- `WorkoutWidgetProvider.java` recibe acciones del widget.
- `WorkoutQuickActionReducer.java` comparte la logica con la notificacion.
- `WorkoutMutationQueue.java` conserva mutaciones UUID pendientes hasta que el
  WebView confirma cada ID.
- `WorkoutWidgetUpdateService.java` calcula el dia y actualiza `RemoteViews`.
- `WorkoutControlNotificationManager.java` mantiene controles privados durante
  una sesion activa.
- `AndroidBridge` conserva `state_json`, expone la cola y permite solicitar el
  pin del widget sin cambiar las claves web existentes.
- `AndroidUsageBridge` mantiene la importacion opcional de uso del telefono.

## Sincronizar assets

Desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-assets.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-app.ps1 -CheckAndroidAssets
```

No editar manualmente `app/src/main/assets`; la fuente es la raiz del repo.

## Compilar debug

Requiere JDK 17, Android SDK platform 35, build-tools 35.0.0 y Gradle 8.10.2.

```powershell
cd android-native-wrapper
gradle :app:assembleDebug --stacktrace
```

Salida: `app/build/outputs/apk/debug/app-debug.apk`.

## Compilar release firmado

Crear una clave una sola vez y guardarla fuera del repositorio:

```powershell
keytool -genkeypair -v -keystore protocolo-release.jks -alias protocolo -keyalg RSA -keysize 2048 -validity 10000
```

Definir antes de compilar:

```powershell
$env:ANDROID_KEYSTORE_PATH='C:\ruta-segura\protocolo-release.jks'
$env:ANDROID_KEYSTORE_PASSWORD='...'
$env:ANDROID_KEY_ALIAS='protocolo'
$env:ANDROID_KEY_PASSWORD='...'
cd android-native-wrapper
gradle :app:assembleRelease --stacktrace
```

Salida: `app/build/outputs/apk/release/app-release.apk`.

Para GitHub Actions, codificar el keystore en base64 y crear estos Secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

El workflow `Publicar APK Android release` genera un APK versionado y un
checksum SHA-256. Nunca subir `.jks`, `.keystore`, service accounts o claves
privadas al repo.

## Instalar y agregar widget

1. Instalar el APK y abrirlo una vez.
2. Mantener presionada la pantalla de inicio del telefono.
3. Entrar en **Widgets**.
4. Buscar **Protocolo 0->100 - Gym**.
5. Agregarlo y redimensionarlo entre compacto, estandar y expandido.

Tambien puede solicitarse desde **Gym > Acceso rapido durante el
entrenamiento > Agregar widget** cuando el launcher admite
`requestPinAppWidget`.

El widget detecta el dia actual y, sin datos previos, usa la rutina semanal
predeterminada. El estandar permite corregir reps y peso en pasos de 0.5 kg; el
expandido agrega pasos de 5 kg. El compacto abre el editor cuando una correccion
no cabe de forma segura. RIR/RPE y notas largas se editan en el registro rapido.

Los controles de pantalla bloqueada usan una notificacion privada, no un widget
keyguard universal. Se activan de forma explicita y solicitan
`POST_NOTIFICATIONS` solo en ese momento.

## Permisos

- `INTERNET`: Firebase Gym Party y busqueda nutricional opcional desde el WebView.
- `POST_NOTIFICATIONS`: controles privados durante una sesion, solicitado de
  forma contextual en Android 13 o superior.
- `RECEIVE_BOOT_COMPLETED`: restaura el temporizador y refresca el widget.
- `VIBRATE`: feedback haptico breve y fin de descanso cuando esta habilitado.
- Acceso a estadisticas de uso: opcional y concedido manualmente desde la
  pantalla oficial de Android. La app funciona sin ese permiso.

## Prueba minima

Ejecutar `npm run test:native-controls`, `:app:testDebugUnitTest`,
`scripts/test-android-webview-security.mjs`, `scripts/test-android-release.mjs`,
sincronizar assets y compilar al menos `:app:assembleDebug`. Antes de publicar,
compilar tambien `:app:assembleRelease` con una clave de prueba o produccion y
verificar que el APK no este vacio.
