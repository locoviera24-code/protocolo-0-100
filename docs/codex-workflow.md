# Workflow de desarrollo con Codex

Este proceso reduce cambios accidentales sin reemplazar revision humana ni
protecciones GitHub. La futura Skill Codex debe ser una capa fina que invoque
este documento, no otra copia de reglas.

## 1. Precheck

Ejecutar:

```bash
npm run codex:preflight
```

El comando es read-only y muestra raiz, rama, HEAD, working tree, candidato,
Stable, backup schema y herramientas. ADB ausente es warning; para una tarea que
requiere telefono usar:

```bash
npm run codex:preflight -- --require-android
```

Si identidad/base difieren de una tarea congelada, detenerse y auditar antes de
adaptar. Nunca limpiar cambios ajenos para obtener un arbol aparentemente limpio.

## 2. Audit

1. Leer `AGENTS.md` y los docs de arquitectura/datos.
2. Localizar source of truth, writers, readers, schema, backup y tests actuales.
3. Revisar diff/base real y deuda relacionada.
4. Marcar `UNKNOWN / NEEDS DECISION` cuando el codigo no demuestre una afirmacion.
5. Definir scope y out-of-scope antes de editar.

Codex puede inventariar y proponer. Un cambio de modelo canonico, schema,
privacidad, release o politica necesita decision humana explicita.

## 3. Implement

- Crear rama desde la base auditada.
- Hacer el cambio minimo.
- No agregar almacenamiento paralelo ni writes desde vistas derivadas.
- No mezclar refactors oportunistas.
- Usar generadores/sincronizadores oficiales.
- Agregar regresion al test que ya posee el contrato; crear suite nueva solo si
  existe una invariance critica sin owner.

## 4. Local gate

Ejecutar:

```bash
npm run gate:local
git diff --check
```

`gate:local` reutiliza 27 etapas deterministas existentes: version/precache,
manifest, contratos de quality/release/Pages/service worker, modulos, router,
layout, Home, settings, datos/backup, Workout, controles nativos, Gym Party,
Progreso, Nutricion, WebView, accesibilidad estatica y paridad Web/Android.

No descarga browsers, no inicia Firestore Emulator, no compila Gradle, no exige
telefono y no regenera archivos. Falla en la primera etapa roja y muestra
duracion por etapa y total. No sustituye el quality gate remoto.

## 5. PR Draft

Abrir Draft con la plantilla completa. Declarar modelos, keys, schemas y modulos
nuevos incluso cuando el valor sea cero. Registrar impacto Stable como `none`
salvo tarea de release autorizada.

Codex puede crear y actualizar el PR, pero no debe marcarlo listo ni fusionarlo
si la tarea no lo autoriza expresamente.

## 6. CI

Esperar el quality gate completo del HEAD exacto. Incluye contratos, Playwright,
Axe, Firestore, artifact Web, offline/service worker, Android JVM/APKs, firma
efimera y paridad. Un run de otro SHA no es evidencia.

Ante fallo:

1. reproducir;
2. clasificar producto/test/infraestructura;
3. no relajar assertion, aumentar timeout o agregar skip por reflejo;
4. corregir la causa dentro del scope;
5. volver a validar el nuevo HEAD.

## 7. Independent review

Una revision independiente comprueba diff completo, ownership, seguridad,
datos, tests, generated assets y que el body coincide con el codigo. Los threads
y `REQUEST_CHANGES` deben quedar resueltos antes de pedir merge.

## 8. Physical when needed

Es gate humano para cambios Android, interaccion movil critica o defectos
fisicos. Registrar dispositivo, build/SHA del artifact, casos, crash y ANR. No
reutilizar una autorizacion destructiva historica. Docs/engineering-only es
`N/A`, no PASS.

## 9. Human merge

El metodo y PR exactos requieren autorizacion. Tras merge, sincronizar `main`,
confirmar SHA/version/canales y esperar CI automatico. Si falla, no iniciar el
siguiente feature.

## 10. Separate stable release

Merge a `main` no publica. Una tarea separada congela SHA, revisa guards,
versionado, firma, tag/release inexistentes, rollback y autorizacion del
operador. Android y Web/PWA se promueven por sus mecanismos propios. No mover ni
sobrescribir releases existentes.

## Gates humanos que permanecen

- aceptar o cambiar una decision arquitectonica;
- autorizar migraciones y cambios de backup;
- aprobar pruebas fisicas y cualquier accion destructiva exacta;
- aprobar merge;
- configurar branch protection/rulesets;
- autorizar y ejecutar Stable.
