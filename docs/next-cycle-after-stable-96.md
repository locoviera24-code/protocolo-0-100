# Roadmap posterior a Stable 2.7.0+96

## Propósito

Este documento prioriza el siguiente ciclo sin modificar la línea publicada.
No es una especificación de implementación ni autoriza una nueva release.

## Production baseline congelado

| Identidad | Valor |
| --- | --- |
| Baseline de producción | `main@609f3e40e3b4c7966ea01a199d41a9223344f82e` |
| Web/PWA Stable | `2.7.0+96` |
| Android Stable | `v2.7.0-build.96`, `versionCode 40` |
| Contrato Workout Quick Actions | schema 1 |
| Backup | schema 3 |
| Fuente canónica de entrenamiento | `workoutSessions` |

Stable 96 queda congelado. El tag Android y sus assets son inmutables. Ningún
cambio nuevo debe reutilizar build 96, `versionCode 40` ni el tag
`v2.7.0-build.96`.

## Estado funcional actual

- **Inicio:** CTA contextual único para empezar, continuar, guardar o ver el
  resumen; borradores y campos esenciales conservan foco y recuperación.
- **Gym:** Entrenar abre el registro rápido; la edición completa sigue disponible
  como edición avanzada. Guardar identifica la serie exacta y Deshacer opera por
  `setId` sin eliminar una serie editada o posterior.
- **Android Quick Access:** widgets compacto, estándar y expandido, selector,
  notificación privada, `publicVersion`, cola durable e importación idempotente
  fueron probados en Samsung SM-A165M.
- **Nutrición:** flujo local-first para alimentos, comidas, agua, recetas,
  porciones, alimentos propios y caché nutricional. La búsqueda ampliada es
  opcional y conserva fallback local/offline.
- **Progreso:** render diferido `rendered + dirty`, estados de datos insuficientes
  y vistas de hábitos, Gym, nutrición, historial y logros.
- **Más:** datos/copias, privacidad, diagnóstico y Experimental están separados
  de los flujos cotidianos.
- **PWA:** instalación, shortcuts, actualización atómica, precache verificado,
  offline y rutas profundas.
- **Datos:** IndexedDB primario con compatibilidad localStorage, cuarentena,
  recuperación, backups schema 3 y adaptadores legacy no destructivos.
- **Gym Party:** local/demo siempre disponible; la web Stable recibe configuración
  Firebase pública de producción y las reglas pasan Firestore Emulator.
- **Accesibilidad:** 33 recorridos Axe sin reglas desactivadas, navegación por
  teclado y cobertura automatizada en Android Chromium, WebKit iPhone y escritorio.

No hay issues ni PR productivos abiertos al realizar esta auditoría. La matriz
Stable vigente aprobó 403 escenarios funcionales, 14 omisiones deliberadas por
plataforma, 33 Axe, Firestore, artifact/offline, service worker, Android y
paridad web/assets.

## Hallazgos confirmados

### Bug reproducible

1. **La interfaz describe incorrectamente capacidades Android ya publicadas.**
   `index.html` todavía muestra Notificación y Pantalla bloqueada como
   **En desarrollo**; `app/platform-capabilities.js` devuelve `pending` y
   `workout-features.js` afirma que los controles no están disponibles en
   Stable. Stable 96 sí incluye y validó físicamente widget, notificación y
   `publicVersion`. La función opera, pero la información de disponibilidad es
   falsa y puede impedir que una persona la active.

No se identificó otro bug funcional reproducible. Los fallos físicos corregidos
durante Stable 96 permanecen cubiertos por regresiones.

### Deuda técnica con evidencia

- La shell carga 62 scripts (aprox. 855 KB sin comprimir), ocho hojas de estilo
  (aprox. 110 KB) y un `index.html` de aprox. 335 KB en cualquier ruta. La PWA
  reduce red, pero no el parseo y la inicialización en equipos modestos. Antes de
  dividir módulos se necesitan métricas de arranque y cambio de ruta.
- `index.html`, `gym-party.js` y `workout-features.js` concentran mucha
  orquestación. Sus límites actuales están probados; una división general sin
  medición tendría más riesgo que valor.
- Persisten referencias históricas que pueden confundirse con estado actual. Por
  ejemplo, una sección de `README.md` todavía dice que build 96 no tenía APK
  Stable, aunque una sección posterior documenta correctamente la publicación.
- Los adaptadores de `gymSessions` y mutaciones Android legacy son deuda
  intencional de compatibilidad. No deben retirarse sin telemetría o una política
  explícita de antigüedad soportada.

### Riesgos aceptados que siguen pendientes

| Riesgo | Estado | Decisión para el siguiente ciclo |
| --- | --- | --- |
| Gym Party físico multi-cliente con backend compartido | `RISK ACCEPTED` | Priorizar: ya existe configuración Firebase en la web Stable y es la superficie pendiente con mayor riesgo de sincronización/datos. |
| PWA física iPhone | `RISK ACCEPTED` | Validar, pero no bloquear por sí sola el primer fix pequeño. WebKit automatizado reduce riesgo lógico; faltan instalación, teclado, IndexedDB, actualización y backup en hardware. |
| Segundo OEM/launcher Android | `RISK ACCEPTED` | Validar después del flujo multi-cliente. RemoteViews, redimensionado, batería y notificaciones pueden variar por fabricante. |

Los tres casos siguen siendo validación/hardening. Ninguno es una feature nueva y
ninguno puede registrarse como PASS sin observación física.

## Clasificación de oportunidades

La prioridad combina impacto, urgencia y valor de usuario frente a riesgo y
esfuerzo. Todos los puntajes usan escala 1-10; un esfuerzo o riesgo alto reduce
la conveniencia de entrar primero. `Confianza` describe la solidez de la
evidencia, no la facilidad del cambio.

| # | Oportunidad | Tipo | Impacto | Urgencia | Riesgo | Esfuerzo | Valor usuario | Confianza |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Corregir la verdad de capacidades Stable y centralizar sus estados | bug / UX | 7 | 9 | 3 | 2 | 8 | Alta |
| 2 | Cerrar Gym Party real con dos clientes, reconexión e idempotencia | datos / seguridad / test | 8 | 8 | 8 | 5 | 7 | Alta |
| 3 | Habilitar búsqueda nutricional ampliada mediante backend sin exponer claves | funcionalidad / infraestructura | 8 | 6 | 7 | 8 | 9 | Media |
| 4 | Calificar PWA en iPhone físico: instalación, teclado, update, backup y offline | test / UX | 7 | 6 | 6 | 4 | 7 | Media |
| 5 | Añadir una prueba de upgrade con fixtures Stable N-1 para datos y backups | test / datos | 8 | 5 | 4 | 5 | 6 | Alta |
| 6 | Ejecutar accesibilidad física con VoiceOver/TalkBack, zoom y texto aumentado | test / UX | 7 | 5 | 5 | 5 | 7 | Media |
| 7 | Calificar widgets/notificaciones en un segundo OEM y launcher | test / Android | 7 | 6 | 7 | 4 | 6 | Alta |
| 8 | Medir arranque y aplicar carga/inicialización por ruta solo donde mejore el presupuesto | rendimiento / deuda técnica | 7 | 4 | 7 | 7 | 8 | Media |
| 9 | Eliminar contradicciones de documentación mediante una fuente de estado versionada | deuda técnica / documentación | 4 | 6 | 2 | 3 | 4 | Alta |
| 10 | Definir criterios de graduación para Coins, rankings, referidos y afiliados | experimental / producto | 5 | 3 | 8 | 8 | 4 | Media |

Resumen de la auditoría:

- bugs reales reproducibles: **1**;
- mejoras UX concretas: **2** (capacidad Stable y búsqueda nutricional ampliada);
- features candidatas: **2** (backend nutricional y posible graduación experimental);
- validaciones/hardening pendientes: **4** (Gym Party, iPhone, segundo OEM y
  tecnologías de asistencia);
- deuda/test/infraestructura priorizable: **3** (upgrade N-1, rendimiento y
  consistencia documental).

## Top 3 recomendado

### 1. Verdad de capacidades Stable

**Problema actual.** Una persona con Stable 96 recibe mensajes contradictorios:
la función Android está publicada y funciona, pero Acerca de y Ajustes de Gym la
presentan como beta, pendiente o no disponible en Stable.

**Evidencia.** `app/platform-capabilities.js`, la tabla de `index.html` y los
estados de `workout-features.js` conservan el contrato anterior a la integración
Android. Las pruebas actuales fijan esos textos antiguos.

**Usuario afectado.** Toda persona que consulta capacidades desde Web/PWA o APK,
especialmente quien intenta descubrir widget y controles de entrenamiento.

**Solución propuesta.** Centralizar estados por runtime y capacidad demostrable:
Web/PWA debe indicar `Solo APK`; el APK debe indicar `Disponible` o `Requiere
permiso` según el bridge y el estado real. Mantener la advertencia OEM para
pantalla bloqueada sin prometer universalidad. Retirar referencias a una beta ya
publicada.

**Superficie probable.** `app/platform-capabilities.js`, `index.html`,
`workout-features.js`, `scripts/test-platform-capabilities.mjs`, E2E Web Core y
Android Quick Access; después, sincronización oficial de assets Android.

**Impactos.** Web/PWA: sí. Android: assets WebView y verificación física breve;
no requiere Java/Kotlin. Datos/schema: ninguno. Backup: ninguno. Firebase:
ninguno.

**Pruebas.** Browser, PWA standalone, bridge incompleto y APK confiable; estados
sin permiso/con permiso/sesión activa; tabla accesible; axe; 320/390 px; paridad
web/assets; smoke en el Samsung y un navegador.

**Riesgo de regresión.** Bajo si la detección sigue siendo conservadora y no se
confunde un objeto Android incompleto con el APK.

**Tamaño.** `S`.

### 2. Gym Party multi-cliente con backend compartido

**Problema actual.** Reglas, cola, tombstones, reconciliación y backoff tienen
cobertura automatizada, pero no existe PASS físico de dos clientes contra un
backend común. La web Stable ya recibe configuración Firebase, por lo que el
riesgo dejó de ser puramente teórico.

**Evidencia.** `docs/physical-test-checklist.md` conserva el caso como
`BLOCKED/RISK ACCEPTED`; `firebase/README.md` documenta el flujo y el Firebase
público Stable está configurado. Firestore Emulator pasa, pero no reemplaza red,
auth persistida ni dos runtimes reales.

**Usuario afectado.** Personas que crean una sala y comparten entrenamientos.

**Solución propuesta.** Primero ejecutar un protocolo con datos sintéticos en dos
clientes reales: crear/unirse, subir/recibir, editar/eliminar, offline/reconectar,
expulsión, reingreso autorizado y ausencia de duplicados. Usar un entorno de
prueba controlado con las mismas reglas; modificar código solo ante un defecto
reproducible.

**Superficie probable.** `gym-party.js`, `gym-party-sync.js`,
`firebase-service.js`, reglas/índices, tests de Emulator y E2E de dos contextos.

**Impactos.** Web/PWA: sí. Android: WebView como segundo runtime, sin Firebase
nativo. Datos/schema: conservar modelos y tombstones actuales; cualquier cambio
debe ser compatible. Backup: schema 3 intacto. Firebase: sí, es el centro del
trabajo.

**Pruebas.** Emulator concurrente, dos contextos E2E, desktop + Samsung físico,
offline/reconexión, idempotencia, privacidad entre salas y revisión de costos.

**Riesgo de regresión.** Alto por sincronización y privacidad; debe tener gates
separados y rollback a modo local sin borrar cola ni sala.

**Tamaño.** `M` para validación; `L` solo si aparece un defecto de protocolo.

### 3. Búsqueda nutricional ampliada sin claves en el cliente

**Problema actual.** Registrar comida es un flujo central, pero Stable muestra
`Búsqueda ampliada no disponible` cuando la base local no alcanza. El cliente ya
define un contrato futuro `/foods/search` y `/food/{fdcId}`, sin backend de
producción que proteja la clave y aplique límites.

**Evidencia.** `fdc-client.js`, `nutrition/food-provider.js`,
`nutrition/food-search-service.js` y el estado de `advanced-features.js` tienen
fallback, caché y manejo de error listos; la ruta backend permanece pendiente.

**Usuario afectado.** Quien registra alimentos que no están en la base local,
especialmente desde móvil con teclado abierto.

**Solución propuesta.** Implementar un proxy mínimo con allowlist de endpoints,
validación, rate limit, timeout y caché; nunca entregar la clave USDA al cliente.
Conservar búsqueda local, alimentos propios y caché offline como fallback. La UI
debe explicar disponibilidad sin bloquear el registro.

**Superficie probable.** Cliente FDC, proveedor/buscador nutricional, UI de
estado, configuración de despliegue y un servicio backend acotado. No usar
Firebase nativo Android.

**Impactos.** Web/PWA: sí. Android: assets WebView, sin lógica nativa. Datos/schema:
mantener el snapshot nutricional actual. Backup: schema 3 intacto. Firebase:
no es obligatorio; elegir infraestructura por costo y control de secretos.

**Pruebas.** Contratos backend, límites y entradas inválidas; claves ausentes en
artifact/logs; online/offline/timeout/429; deduplicación local-remota; E2E de
registro; teclado móvil; accesibilidad y caché PWA.

**Riesgo de regresión.** Medio-alto por dependencia externa, costos y precisión
nutricional. Debe desplegarse con feature flag operativa y fallback local.

**Tamaño.** `L`.

## Orden y dependencias

1. Ejecutar el fix de verdad de capacidades como bloque pequeño independiente.
2. Cerrar Gym Party multi-cliente antes de ampliar otras superficies compartidas.
3. Diseñar el backend nutricional con presupuesto, privacidad y operación
   definidos antes de escribir integración productiva.
4. Programar iPhone y segundo OEM como campañas de validación, no mezclarlas con
   refactors.
5. Medir rendimiento después de los tres bloques anteriores; optimizar solo los
   renders, scripts o listeners que superen un presupuesto acordado.

## Estrategia de versionado del próximo candidato

No se cambia versionado en este roadmap. Para el primer PR productivo:

- mantener `version: 2.7.0` salvo decisión semántica explícita;
- usar como siguiente beta Web/PWA un build **mayor que 96**; el valor natural es
  97 si sigue libre al cerrar el bloque;
- mantener `versionCode 40` solo si el cambio es exclusivamente web y no se
  empaqueta/distribuye un APK;
- usar un `versionCode` **mayor que 40** (naturalmente 41 si sigue libre) cuando
  el cambio modifique assets empaquetados o Android y se genere un APK beta;
- incrementar una sola vez al cierre del bloque, regenerar precache y sincronizar
  assets mediante los scripts oficiales;
- no tocar `.github/stable-release.json` ni publicar Stable desde un PR de
  desarrollo.

La iniciativa #1 afecta los assets empaquetados del APK; si se distribuye para
prueba física, su candidato esperado sería `2.7.0+97` / `versionCode 41`, sujeto
a comprobar disponibilidad al comenzar.

## Estrategia de tests

- Gate proporcional durante desarrollo y quality gate completo antes de cualquier
  beta distribuible.
- Mantener como piso 403 Playwright, 14 skips deliberados, 33 Axe, Firestore,
  artifact/offline, service worker, Android JVM/debug/release y paridad.
- Ninguna validación física se convierte en PASS por Playwright, emulador o
  Gradle.
- Todo bug debe reproducirse antes del fix y adquirir una regresión automatizada.
- Cambios de datos deben probar backup schema 3, fixture anterior, merge,
  reemplazo, rollback y compatibilidad localStorage/IndexedDB.
- Cambios Android deben probar doble toque, redelivery, proceso destruido,
  actualización y la superficie física afectada.

## Qué no conviene hacer todavía

- No migrar a otro framework ni reescribir la arquitectura estable.
- No dividir archivos grandes solo por tamaño; primero medir parseo, listeners,
  renders y memoria.
- No retirar adaptadores legacy ni cambiar schema 3 sin evidencia de necesidad y
  migración compatible.
- No crear un segundo modelo de Workout ni otro contrato público de mutaciones.
- No activar Coins, rankings, referidos o afiliados por defecto. Antes deben tener
  propósito de usuario, reglas de privacidad, backend autenticado y criterios de
  salida; no debe añadirse monetización simulada al flujo principal.
- No añadir Firebase nativo Android para cerrar Gym Party.
- No ampliar reconocimiento de voz o uso automático del teléfono hasta revisar
  permisos, privacidad y beneficio medible.
- No modificar ni reemplazar Stable 96, su tag o su release.

## Criterios de éxito del próximo ciclo

- El estado visible de cada capacidad coincide con el runtime y la versión
  realmente publicada.
- No queda ningún FAIL de privacidad, datos o acción cotidiana.
- Gym Party multi-cliente tiene resultado físico explícito o un blocker externo
  documentado con causa y decisión.
- El registro diario, de serie y de comida conserva o mejora su tiempo de tarea
  sin añadir acciones principales competidoras.
- No cambia `workoutSessions`, backup schema 3 ni claves persistentes sin una
  migración compatible y aprobada.
- La cobertura automatizada no disminuye y cada cambio de riesgo adquiere pruebas
  específicas.
- Las validaciones iPhone/OEM permanecen honestamente PASS, FAIL, BLOCKED o N/A.
- Stable 96 continúa inmutable hasta una promoción posterior y explícita.
