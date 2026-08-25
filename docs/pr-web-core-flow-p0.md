# Web Core Flow P0

> Documento historico del PR Web Core #2. El PR fue fusionado en `main` y el
> rebase Android descrito como accion futura tambien fue completado; Android
> Quick Access V1 quedo integrado por el merge commit `39c40a2`.

## Problema y resultado

Inicio, Gym y Progreso mostraban acciones o paneles con el mismo peso visual.
El registro rapido competia con la sesion avanzada, los vacios de Progreso
construian vistas sin datos y las capacidades Web/PWA/APK no se expresaban de
forma verificable.

Ahora Inicio usa un CTA determinista para empezar, continuar, guardar o revisar
el dia. Gym abre en Entrenar, confirma la serie exacta y ofrece Editar, Deshacer
idempotente durante 10 segundos y Siguiente ejercicio. Progreso renderiza solo
el scope activo, invalida por dominio y muestra umbrales y CTA concretos.
Focus Coins, rankings, referidos y afiliados viven en Funciones experimentales,
pausadas salvo decision explicita.

## UX anterior y nueva

- Inicio: varias acciones equivalentes -> un CTA primario y guardado inferior
  secundario sobre la misma funcion.
- Gym: registro rapido y sesion completa competian -> Entrenar primero y
  Edicion avanzada bajo demanda.
- Guardado: mensaje generico -> detalle canonico, foco restaurado y Deshacer
  ligado al `setId` y snapshot exactos.
- Progreso: paneles ocultos o vacios -> carga diferida `rendered + dirty` y
  estados insuficientes accionables.
- Plataformas: lenguaje tecnico y promesas ambiguas -> capacidades
  conservadoras de navegador, PWA y APK.

Evidencias fuera del artifact productivo:

- `docs/screenshots/web-core-flow-p0/mobile-home.png`
- `docs/screenshots/web-core-flow-p0/mobile-gym.png`
- `docs/screenshots/web-core-flow-p0/mobile-progress-empty.png`
- `docs/screenshots/web-core-flow-p0/desktop-experimental.png`
- `docs/screenshots/web-core-flow-p0/desktop-capabilities.png`

## Arquitectura y contratos

- `app/home-state.js`: evaluador puro del CTA de Inicio.
- `app/platform-capabilities.js`: runtime e instalacion sin inferencias falsas ni
  persistencia.
- `app/data-events.js`: evento minimo de invalidacion por dominio, sin contenido
  personal; IndexedDB agrupa restauraciones masivas.
- `progress/progress-view.js`: cache `rendered + dirty`, invalidacion y foco por
  scope.
- `gym/workout-quick-actions.js`: contrato schema 1 puro para nueve acciones,
  tres fuentes y resultados con codigos estables.
- El modelo canonico sigue siendo `workoutSessions`; no existe otro modelo de
  series ni persistencia dentro del contrato rapido.

## Datos y compatibilidad

No cambian schemas, claves persistentes, backup schema 3 ni Android
`versionCode 33`. `experimentalFeaturesEnabled` solo se escribe tras una accion
explicita; leer Progreso o Experimental no muta datos. Los usuarios con historial
previo eligen seguir usando las funciones o mantenerlas pausadas. Sesiones,
saldos, recompensas, rankings, referidos y backups anteriores permanecen
intactos.

El contrato Android futuro debe adaptarse al schema web unico. No se incorporo
ningun commit de `codex/android-quick-access-v1`; el mapeo y el orden de rebase
estan documentados en `docs/web-core-android-rebase.md`.

## Privacidad

Los eventos de invalidacion no incluyen objetos completos ni datos personales.
El contrato rapido no contiene credenciales ni datos sociales. La tabla no
afirma que una PWA esta instalada cuando el navegador no puede comprobarlo.
Las capturas usan almacenamiento limpio y no entran al precache ni al APK.

## Resultados por gate

- Gate A: estados de Inicio, foco, guardado exacto, edicion, modalidades y
  Deshacer aprobados.
- Gate B: capacidades, eventos, lazy Progreso, deep links, back/forward,
  estados insuficientes y Experimental aprobados sin mutaciones en lectura.
- Gate C: nueve acciones, tres fuentes, UUID/UTC/revisiones, limite UTF-8,
  prototype pollution y resultados aplicados/rechazados/ignorados aprobados.
- Gate D: contratos estaticos, datos, backup, Nutricion, FDC, Gym, Gym Party,
  service worker, manifest, seguridad WebView y release Android aprobados.
- Playwright: 421 aprobados y 14 omitidos por matriz; Axe aporta 33 aprobados
  dentro de ese total, sin exclusiones.
- Artifact web: 85 recursos con hash; smoke servido sin 404, errores de pagina
  o consola, con rutas profundas, service worker y offline.
- Firestore Emulator: aprobado; las denegaciones del log son casos negativos
  esperados.
- Android: debug y release de prueba compilados, release verificado con firma
  v1/v2 y paridad exacta de assets.
- Diagnostico: se corrigio una carrera de renders asincronos y la transicion de
  Nutricion, Workout y Gym Party paso 9/9 repeticiones en iPhone WebKit.
- Hardware fisico: no disponible; todas las casillas permanecen pendientes.

Artifacts locales de cierre:

- Web ZIP: 541.207 bytes, SHA-256
  `3D6F30C629D522E68A1FB94D2B425B197D48875DFFAF50131F6504C93A3A8ED0`.
- Android debug: 1.947.497 bytes, SHA-256
  `F07C6731E6DB4484AFE64B33709D8E10AFF2FABBB57A3B1E7E5F613AAF24DE3D`.
- Android release de prueba: 1.516.563 bytes, SHA-256
  `BFBF728A6EF88D976BFEAA0B41F37186E2902CD5B36DBFE56CCA77ED896D063A`.

## Hallazgos de la auditoria final

- La deteccion del APK ahora exige el metodo confiable `getAppInfo`; un objeto
  global incompleto ya no hace que una pestaña se presente como APK.
- Deshacer rechaza cualquier serie editada, aunque sus valores finales vuelvan
  a coincidir con los guardados originalmente.
- Experimental incorpora eventos posteriores del mismo dia de activacion sin
  recalcular eventos previos ni persistir metadatos transitorios.
- Se retiro lenguaje de snapshots de las vistas cotidianas de recetas y de la
  clasificacion historica de Gym.

Los cuatro hallazgos incluyen pruebas de regresion y forman un unico commit de
cierre. No cambian schemas, claves ni el modelo `workoutSessions`.

## Riesgos

- La deteccion de instalacion puede ser `unknown` por limitacion del navegador.
- Notificacion y pantalla bloqueada no forman parte de esta rama; la UI las
  describe como beta pendiente o en desarrollo, no como stable disponible.
- La rama Android usa nombres y envelopes distintos hasta su rebase; no deben
  convivir dos schemas de mutacion.
- La firma release local es efimera y no sirve para distribuir ni actualizar la
  aplicacion instalada.

## Conflictos previstos del rebase Android

Los archivos con mayor probabilidad de conflicto son `index.html`,
`workout-features.js`, `styles/gym.css`, `precache-manifest.js`, los assets
copiados del wrapper y la documentacion. La rama Android debe conservar sus
componentes Java, reemplazar su envelope por el contrato web y repetir pruebas
de importacion, idempotencia, widget, notificacion, Gradle y paridad.

## Rollback

Revertir los commits de esta rama restaura la UX del build 89. No se
requiere migracion inversa porque no cambiaron schemas ni claves. El canal
estable permanece en build 89 y no se publico desde esta rama.

## Accion siguiente historica (completada)

En ese momento correspondia revisar Web Core y despues rebasar
`codex/android-quick-access-v1` sobre `main`. Ambos pasos ya se completaron; el
resultado usa un solo schema de mutacion y fue validado automatica y fisicamente
antes del merge Android.
