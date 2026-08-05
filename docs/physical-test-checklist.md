# Checklist de pruebas físicas

Referencia objetivo: Protocolo 0->100 `2.7.0`, build web/PWA `90`, Android
`versionCode 33`.

Este documento separa resultados automatizados de pruebas sobre hardware real.
No marcar una prueba física por inferencia a partir de Playwright, Gradle o un
emulador de Firestore.

## Estado de esta línea base

- Automatizado: se registra en `CODEX_HANDOFF.md` con comando y resultado.
- Físico ejecutado durante este ciclo: ninguno.
- Pendiente manual: todas las casillas de dispositivo que siguen.

Anotar para cada ejecución: fecha, modelo, versión del sistema, navegador,
build probado y resultado. Adjuntar captura o diagnóstico solo si no contiene
datos personales.

## Web Core Flow P0

No hubo hardware conectado durante este ciclo. Las capturas automatizadas en
`docs/screenshots/web-core-flow-p0/` son evidencia visual, no sustituyen estas
pruebas físicas.

- [ ] Inicio a 390 x 844 muestra un solo CTA en los estados vacío, borrador,
  listo para guardar y día guardado.
- [ ] Completar el registro diario con el teclado abierto sin tapar el CTA ni
  perder el borrador.
- [ ] Guardar una serie con una mano y comprobar detalle exacto, Editar,
  Deshacer y Siguiente ejercicio.
- [ ] Confirmar que Deshacer afecta solo a la serie indicada aunque se haya
  guardado otra después.
- [ ] Registrar repeticiones/carga, peso corporal, asistencia, tiempo y
  distancia desde Entrenar.
- [ ] Registrar una comida con el teclado abierto y volver al resumen diario.
- [ ] Ver Progreso sin datos y con suficientes días/sesiones comparables.
- [ ] Activar y desactivar Funciones experimentales sin alterar registros,
  saldos ni recompensas existentes.
- [ ] Revisar la tabla Web/PWA frente a APK y sus estados con lector de
  pantalla y texto aumentado.
- [ ] Abrir los shortcuts PWA **Serie rápida** y el deep link de Gym Party.
- [ ] Forzar cierre, activar modo avión y volver a abrir sin perder cambios.
- [ ] Actualizar desde build 89 a build 90 sin mezclar HTML, CSS o JavaScript.
- [ ] Repetir el recorrido en Android Chrome y en iPhone Safari/PWA.

## iPhone y Safari/PWA

- [ ] Abrir la URL estable y comprobar versión/build en **Más > Acerca de**.
- [ ] Instalar desde Safari en la pantalla de inicio.
- [ ] Registrar el protocolo, un alimento y una sesión Gym.
- [ ] Cerrar Safari y la PWA de forma forzada; reabrir y comprobar persistencia.
- [ ] Activar modo avión, registrar localmente y comprobar el estado offline.
- [ ] Volver online y comprobar sincronización pendiente.
- [ ] Comprobar actualización con un borrador abierto y luego sin borradores.
- [ ] Exportar un backup e importarlo con **Fusionar**.
- [ ] Importar con **Reemplazar**, revisar eliminaciones y ejecutar **Deshacer**.
- [ ] Verificar funcionamiento bajo presión de almacenamiento de iOS.

## Android Chrome/PWA

- [ ] Abrir la web estable y comprobar versión/build.
- [ ] Instalar la PWA y validar los shortcuts de Inicio, Gym y Nutrición.
- [ ] Registrar datos, enviar la app a background y forzar el cierre.
- [ ] Reabrir y comprobar IndexedDB con fallback localStorage disponible.
- [ ] Probar offline, reconexión y actualización entre builds.
- [ ] Exportar, restaurar, Fusionar, Reemplazar y Deshacer.

## APK Android

- [ ] Instalar el APK release firmado.
- [ ] Actualizar desde un APK anterior firmado con la misma clave.
- [ ] Abrir Inicio, Gym, Nutrición y Gym Party mediante deep links.
- [ ] Registrar serie, tipo de serie y alimento; reiniciar el proceso.
- [ ] Probar voz y validar permisos denegados/aceptados.
- [ ] Agregar el widget pequeño y el mediano desde el selector del launcher.
- [ ] Registrar una serie desde el widget y comprobar actualización de progreso.
- [ ] Exportar y restaurar un backup desde el WebView.
- [ ] Comprobar background, offline y reconexión.

## Gym Party con dos dispositivos

- [ ] Crear sala en el primer dispositivo y unirse desde el segundo.
- [ ] Registrar series desde ambos y comprobar sincronización.
- [ ] Desconectar un dispositivo, registrar, reconectar y resolver pendientes.
- [ ] Expulsar un miembro y comprobar que no puede leer ni reactivarse.
- [ ] Probar abandono repetido sin reducir dos veces el contador.
- [ ] Archivar/cerrar sala y comprobar el estado en ambos dispositivos.

## Criterio de cierre manual

La línea base solo puede declararse validada físicamente cuando las cuatro
secciones anteriores tengan fecha, dispositivo y resultado. Un fallo debe
quedar registrado como issue antes de marcar la referencia como estable para
usuarios finales.
