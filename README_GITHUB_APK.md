# Protocolo 0→100 — APK Android listo para compilar en GitHub

Este paquete está preparado para que GitHub Actions genere un APK instalable automáticamente.

## Qué contiene

- `index.html`: app web/PWA del protocolo.
- `manifest.webmanifest`, `sw.js`, `icons/`: archivos de PWA.
- `android-native-wrapper/`: app Android nativa que carga la web y agrega puentes para métricas reales del teléfono y reconocimiento de voz.
- `.github/workflows/build-debug-apk.yml`: flujo automático que compila el APK en GitHub.

## Cómo generar el APK sin Android Studio

1. Entrá a GitHub y creá un repositorio nuevo.
2. Subí **todo el contenido de esta carpeta** al repositorio. Deben quedar visibles en la raíz:
   - `.github/`
   - `android-native-wrapper/`
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icons/`
3. En GitHub, entrá a la pestaña **Actions**.
4. Abrí el workflow **Construir APK Android**.
5. Tocá **Run workflow**.
6. Esperá a que termine el proceso.
7. Abrí la ejecución terminada y descargá el artifact llamado **protocolo-0-100-apk**.
8. Descomprimí ese artifact: adentro estará `protocolo-0-100-debug.apk`.
9. Pasá ese APK a tu celular e instalalo.

## Primer uso en Android

1. Abrí la app instalada.
2. Entrá a la pestaña **Teléfono**.
3. Tocá **Conceder permiso de uso**.
4. Android abrirá una pantalla de Configuración.
5. Buscá la app **Protocolo 0→100** y activá el permiso de acceso a uso.
6. Volvé a la app.
7. Tocá **Sincronizar uso de hoy**.

## Aclaración importante

El APK generado es de tipo **debug**, firmado automáticamente por el proceso de compilación. Sirve para instalar y usar en tu celular. Para publicar en Play Store haría falta una versión release firmada con una clave propia.

Android no permite que una web local lea directamente las métricas de Bienestar Digital/Configuración. Por eso esta versión usa una app Android nativa con `UsageStatsManager` y requiere que vos actives manualmente el permiso de acceso a uso.

## Datos y privacidad

Los registros del protocolo se guardan localmente. La lectura del uso del teléfono se hace desde el propio dispositivo cuando la app tiene el permiso concedido.
