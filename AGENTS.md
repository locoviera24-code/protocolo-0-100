# Constitucion de trabajo del repositorio

Estas reglas aplican a todo el repositorio. Antes de editar, leer este archivo y
los documentos enlazados. Las decisiones durables viven en el repositorio, no
en el contexto de un chat.

## Fuentes de verdad

- Workout: `workoutSessions`, registrado como `workout:sessions` en
  `data/schema-registry.js`, es el historial canonico. No crear una segunda
  historia o sesion canonica sin ADR, migracion y compatibilidad explicitas.
- Persistencia Web: `data/schema-registry.js` define claves, dominio, schema,
  retencion, sensibilidad y participacion en backup. Toda nueva clave
  estructurada debe registrarse alli.
- Backup: el schema vigente se resuelve desde la entrada `backup:versionedState`
  del registro. Cambiarlo exige migracion, compatibilidad hacia atras, tests y ADR.
- Android Quick Actions: conservar el contrato publico schema 1 de
  `gym/workout-quick-actions.js` y su equivalente Android salvo migracion
  explicita.
- Version candidata: leer `app-version.json`.
- Stable publicado/solicitado: leer `.github/stable-release.json`. Nunca inferir
  Stable desde `main`.
- Arquitectura y datos: `docs/architecture.md`, `docs/data-model.md` y
  `docs/architecture-invariants.md`.
- Decisiones: `docs/adr/`. Deuda conocida: `docs/technical-debt-register.md`.

## Una sola fuente de verdad

Antes de crear algo como `newWorkoutHistory`, `activeWorkoutCache`,
`gymSessionsV2` o `newRoutineStore`, preguntar si puede derivarse de una fuente
existente. Si puede, no crear almacenamiento paralelo. Una vista derivada puede
calcular y presentar estado; no se convierte por eso en propietaria del dato.

## Scope de cambios

- Un PR tiene un objetivo coherente.
- No mezclar feature, refactor oportunista, deuda ajena y release.
- No corregir fuera de scope salvo que el defecto bloquee el objetivo y quede
  demostrada la causalidad.
- No convertir deuda registrada en trabajo implícito del PR actual.

## Datos

No agregar una clave persistente sin declarar owner, lectores, escritores,
schema, sensibilidad, retencion, decision de backup, tests y migracion cuando
corresponda. No escribir almacenamiento durante el render de una vista derivada.
Las excepciones heredadas se registran como deuda y no justifican excepciones
nuevas.

## Archivos generados

No editar manualmente `android-native-wrapper/app/src/main/assets/`. Usar
`scripts/sync-web-assets.ps1`; comprobar paridad con
`scripts/validate-app.ps1 -CheckAndroidAssets`. Version, build info y precache se
gestionan con los scripts existentes.

## Web y Android

Browser/PWA normales no reciben capacidades APK sin el marcador contractual
`AndroidBridge.getAppInfo`. Este marcador identifica el contrato esperado del
wrapper; no autentica criptograficamente el runtime ni reemplaza las defensas
de WebView, CSP o contra inyeccion de scripts. Una capacidad nativa Android no
implica paridad universal en Web/PWA ni entre OEM.

## Stable y releases

Stable y `main` development son canales distintos. Nunca cambiar metadata
Stable, desplegar Pages, crear/mover tags ni crear/subir releases sin
autorizacion humana explicita para esa accion. Los releases Android publicos
existentes son operacionalmente inmutables.

## Tests

Un fallo no es automaticamente un flake. Primero reproducir y clasificar. No
aumentar timeouts por reflejo, relajar assertions, agregar skips ni rerunear hasta
verde sin analisis. Reusar el test que ya posee el contrato antes de duplicarlo.

## Validacion fisica

No declarar PASS fisico sin prueba real. Nunca desinstalar Stable, limpiar sus
datos, hacer factory reset u OEM unlock sin autorizacion explicita para esa
accion exacta.

## Secrets

Nunca committear keystores, passwords, tokens, credenciales, codigos de
emparejamiento ADB ni otros secretos. No imprimirlos en logs ni artifacts.

## Workflow Codex

1. Inicio: `npm run codex:preflight`.
2. Auditar fuentes de verdad y tests antes de editar.
3. Implementar el cambio minimo dentro del scope.
4. Antes del PR: `npm run gate:local` y `git diff --check`.
5. Abrir PR Draft; esperar CI completo y revision independiente.
6. Realizar prueba fisica solo si el riesgo lo requiere.
7. Merge humano; verificar CI post-merge.
8. Tratar cualquier release Stable como un gate humano separado.

El detalle operativo esta en `docs/codex-workflow.md`.
