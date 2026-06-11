# Android wrapper — Protocolo 0→100

Esta carpeta contiene el proyecto Android que carga `index.html` dentro de un WebView y expone un puente JavaScript llamado `AndroidUsageBridge`.

Funciones principales:

- Abrir la app como APK Android.
- Pedir acceso a estadísticas de uso mediante la pantalla oficial de Android.
- Leer uso de apps del día con `UsageStatsManager`.
- Devolver a la web minutos totales, minutos no esenciales estimados y lista de apps usadas.

## Compilación recomendada

Usar el workflow incluido en:

`.github/workflows/build-debug-apk.yml`

Desde GitHub: **Actions > Construir APK Android > Run workflow**.

## Permiso necesario

Android exige activar manualmente el permiso especial de acceso a uso. La app abre la pantalla correcta, pero el usuario debe habilitarlo.
