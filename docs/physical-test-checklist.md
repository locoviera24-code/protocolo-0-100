# Checklist de pruebas físicas

Referencia objetivo beta: Protocolo 0->100 `2.7.0`, build web/PWA `95`, Android
`versionCode 39`, rama `codex/android-quick-access-v1`.

Este documento separa resultados automatizados de pruebas sobre hardware real.
No marcar una prueba física por inferencia a partir de Playwright, Gradle o un
emulador de Firestore.

## Estado de esta línea base

- Automatizado: se registra en `CODEX_HANDOFF.md` con comando y resultado.
- Físico ejecutado durante este ciclo: Samsung SM-A165M, Android 16, One UI 8,
  launcher Samsung, 23 de agosto de 2026.
- Pendiente manual: los casos marcados `BLOCKED` o sin ejecutar que siguen.

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
- [ ] Abrir **Gym > Acceso rapido durante el entrenamiento**.
- [ ] Tocar **Agregar widget** y comprobar el dialogo del launcher, si es compatible.
- [ ] Verificar el fallback manual en un launcher sin `requestPinAppWidget`.
- [ ] Agregar y redimensionar los widgets compacto, estandar y expandido.
- [ ] Pulsar -0,5/+0,5 repetidamente y confirmar que el widget no cambia de layout.
- [ ] Tocar el valor de carga, alternar a 5 kg y confirmar que no aparecen botones nuevos.
- [ ] Confirmar que el compacto conserva solo -0,5, Guardar, +0,5 y temporizador.
- [ ] Confirmar que ningun control queda oculto o truncado con fuente aumentada.
- [ ] Corregir reps y carga hacia abajo y hacia arriba desde el widget.
- [ ] Tocar el nombre del ejercicio, elegir uno no contiguo y confirmar el cambio directo.
- [ ] Confirmar que el ejercicio elegido muestra su ultima carga y su maximo comparable.
- [ ] Registrar una serie con un toque y comprobar actualizacion de progreso.
- [ ] Hacer doble toque accidental y confirmar que se guarda una sola serie.
- [ ] Guardar dos series deliberadas consecutivas y confirmar que ambas existen.
- [ ] Tocar **Deshacer** durante diez segundos con la WebView cerrada.
- [ ] Forzar cierre tras guardar y comprobar importacion unica al reabrir.
- [ ] Reiniciar el telefono con una mutacion pendiente y comprobar recuperacion.
- [ ] Probar kg, lb, peso corporal, lastre, asistencia, tiempo y distancia.
- [ ] Probar dia de descanso y ausencia de sesion.
- [ ] Activar controles y aceptar `POST_NOTIFICATIONS` desde la accion contextual.
- [ ] Tocar **Empezar entrenamiento** y confirmar que aparece la notificacion sin guardar antes una serie.
- [ ] Repetir con permiso denegado y comprobar acceso a Ajustes de Android.
- [ ] Bloquear el canal, comprobar **Revisar notificacion** y abrir sus ajustes.
- [ ] Bloquear el telefono y verificar la notificacion privada de entrenamiento.
- [ ] Confirmar en los ajustes OEM que **Controles de entrenamiento** puede mostrarse en bloqueo.
- [ ] Confirmar que la version publica solo dice **Entrenamiento en curso**.
- [ ] Probar Guardar, Deshacer, Siguiente y temporizador desde la notificacion.
- [ ] Finalizar/cancelar la sesion y confirmar que la notificacion desaparece.
- [ ] Cambiar fecha y zona horaria; comprobar actualizacion del widget.
- [ ] Actualizar desde APK anterior y comprobar cola, widget y preferencias.
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

## Registro de hardware de Controles Android V1

Ejecucion: 23 de agosto de 2026. Dispositivo: Samsung SM-A165M. SO: Android
16/API 36, One UI 8. Launcher: Samsung. Las correcciones se probaron primero en
`2.7.0+94`, `versionCode 38`; el candidato final `2.7.0+95`, `versionCode 39`
se instalo despues en el mismo dispositivo sin borrar datos. Evidencia local numerada bajo
`.tools/physical-sm-a165m-build94/`; no se incorpora al precache ni al APK.

| Caso | Resultado | Pasos y evidencia | Observaciones |
| --- | --- | --- | --- |
| Instalacion y actualizacion local | PASS | `adb install -r`; capturas 07, 32, 34, 118 y 121 | El candidato final 95/39 conserva IndexedDB, localStorage, sesion y preferencias con la misma clave local. Actualizar sobre el APK CI anterior queda BLOCKED por firma distinta; no se desinstalo ni borro datos. |
| Smoke y barras del sistema | PASS | Apertura repetida y captura 07 | La WebView empieza debajo de la barra de estado en Android 16. |
| Widget compacto | PASS | Captura 101 | Selector, reps, -0,5, +0,5, -5, +5, Guardar, temporizador, Ultima y Max. visibles, sin controles superpuestos. |
| Widget estandar | PASS | Captura 103 | One UI cambio de variante al redimensionar; contenido legible y controles activos. |
| Widget expandido | PASS | Capturas 104-105; host reporto 401 x 701 dp | Rutina, progreso y controles legibles. El espacio libre inferior pertenece al alto asignado por el launcher. |
| Selector directo | PASS | Capturas 68, 100, 106-107 | Seleccion no adyacente, cancelar/volver sin cambio y adopcion inmediata al reabrir WebView. No crea `SELECT_EXERCISE` publico. |
| Reps y peso | PASS | Capturas 62-67 | Reps +/- y -0,5/+0,5/-5/+5 funcionaron desde bloqueo; kg canonico, sin NaN, infinito ni peso negativo. |
| Doble toque y `SAVE_SET` | PASS | Captura 72 | Dos toques rapidos produjeron una sola serie canonica. |
| `UNDO_SET` | PASS | Captura 74 | Guardar y deshacer inmediato volvio de Serie 3 a Serie 2; el intento repetido no elimino otra serie. |
| Cola, cierre y redelivery | PASS | Capturas 78, 100 y 112 | Proceso destruido, importacion unica y ejercicio nativo sincronizado; `workoutSessions` con una sola aplicacion. |
| Temporizador | PASS | Capturas 80-81, 87-90 y 92-94 | Inicio, pausa, reanudacion, pantalla apagada, proceso destruido y final de descanso. Widget y notificacion coinciden. |
| Notificacion privada | PASS | Capturas 61-74 | Ejercicio, reps, cuatro ajustes de peso, Guardar y selector; acciones actualizan contenido. |
| Permiso de notificaciones | PASS | Capturas 108-110 | Concedido y revocado; sin crash. `Activar` abre los ajustes del canal y al restaurar vuelve la notificacion. |
| Pantalla bloqueada OEM | PASS | Capturas 61-74 y 90 | One UI 8 muestra contenido privado porque el equipo usa deslizamiento sin bloqueo seguro; el selector abre sin perder estado. |
| `publicVersion` fisica | BLOCKED | `dumpsys notification` confirma `VISIBILITY_PRIVATE` y public version generica | No se configuro PIN/patron; sin bloqueo seguro One UI muestra la version privada. No se marca PASS por analisis estructural. |
| Offline real | PASS | Capturas 112 y 114 | Wi-Fi y datos desactivados, guardado desde widget con proceso cerrado, apertura offline y reconexion. Quedo exactamente una serie de Dominadas. |
| Reinicio fisico | PASS | Capturas 115-116 | Antes de abrir la app el widget y la notificacion se restauraron; Gym mantuvo Serie 2 sin duplicados. |
| Repetir/anterior/siguiente | BLOCKED | Sin control expuesto en las superficies probadas | Contrato/reducer automatizados; no se atribuye PASS fisico. El selector directo cubre la navegacion cotidiana. |
| Tiempo y distancia como series | BLOCKED | La rutina de prueba no contiene esas modalidades | Temporizador de descanso si fue probado; `COMPLETE_TIME_SET` y `COMPLETE_DISTANCE_SET` quedan pendientes en hardware. |
| lb, asistencia, lastre y unilateral | BLOCKED | Modalidades ausentes en la rutina de prueba | Cubiertas por pruebas automatizadas, no por este recorrido fisico. |
| Gym Party entre dispositivos | BLOCKED | No hay segundo dispositivo | No se inventa sincronizacion fisica. |
| PWA Android e iPhone | BLOCKED | No se instalo una PWA separada ni hay iPhone | La APK beta no se confunde con stable 89. |

Defectos reproducidos y corregidos en este ciclo:

1. contenido bajo la barra de estado en Android 16;
2. widget sin relayout despues de redimensionar;
3. raiz del widget interceptando controles hijos en One UI;
4. compacto y vista previa recortados en dos columnas;
5. controles/textos superpuestos en Ajustes de Gym;
6. selector nativo no adoptado por la WebView al reabrir.

No queda ningun `FAIL` reproducible abierto. Los `BLOCKED` anteriores requieren
otra configuracion, modalidad o dispositivo y permanecen pendientes para la
revision humana.
