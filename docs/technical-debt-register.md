# Registro de deuda tecnica

Este archivo hace visible la deuda; no autoriza corregirla dentro de otro PR.
Severidad: P0 riesgo inmediato de datos/seguridad, P1 riesgo arquitectonico
relevante, P2 mantenibilidad, P3 limpieza.

## Resumen

- P0: 0
- P1 open: 4
- P1 closed/guarded: 1
- P2: 4
- P3: 1

## Hallazgos

| ID | Severity | Area | Evidence | Risk | Proposed direction | Status |
|---|---|---|---|---|---|---|
| GOV-001 | P1 | GitHub governance | Historicamente `main` no estaba protegida. El ruleset activo `Protect main` (ID `22116471`) ahora exige PR, cero aprobaciones, resolucion de threads y el check estricto `Quality gate beta / Web, Firebase y Android`; bloquea force push/delete y no tiene bypass actors. | Mitigado; una eliminacion o deriva futura del ruleset reabriria el riesgo. | Verificar el ruleset por API en cambios de gobernanza y usar PRs reales como prueba operacional; conservar merge commits. | CLOSED / GUARDED |
| DATA-001 | P1 | Estado derivado | `advanced-features.js::syncVersionedState()` copia muchos stores en `protocolo_0_100_state_v2`; `renderAdvancedProgress()` y el wrapper de `renderAll()` lo escriben. | Snapshot duplicado y escritura por render pueden quedar desalineados o ocultar ownership. | Separar export/sync explicito; reconstruir bajo demanda y eliminar writes de render con migracion si se retira la key. | OPEN |
| DATA-002 | P1 | Gym Party | `gym-party.js::settings()` crea y persiste `localUserId` cuando una lectura no lo encuentra; se invoca desde caminos de render. | Lecturas con side effects, carreras y tests menos deterministas. | Mover identidad a inicializacion/comando explicito e idempotente. | OPEN |
| DATA-003 | P1 | Backup schema | Schema 3 aparece en la entrada `backup:versionedState`, `BACKUP_SERVICE.CURRENT_SCHEMA` y el agregado experimental; no existe una derivacion unica. | Un cambio parcial puede exportar/aceptar contratos incompatibles. | Derivar el servicio del registro o agregar una comprobacion unica de alineacion antes del proximo cambio de schema. | OPEN |
| ARCH-001 | P1 | Modulos principales | `index.html`, `gym-party.js` y `workout-features.js` superan aproximadamente 3.300, 3.000 y 2.400 lineas; mezclan composicion, UI y orquestacion. | Cambios pequenos tienen diff y blast radius altos; ownership dificil de revisar. | Extraer por comportamiento en PRs separados, manteniendo APIs y regresiones; no hacer refactor masivo. | OPEN |
| DATA-004 | P2 | Acceso a storage | `rg` identifica referencias directas a localStorage en 14 archivos runtime fuera de `data/`: Workout, Nutrition, Gym Party, drafts, flags, recovery, ranking, FDC, Home e `index.html`. Las claves si estan registradas. | Algunos caminos de compatibilidad omiten observabilidad uniforme de repositorios. | Migrar gradualmente a repositorios por dominio sin retirar write-ahead/legacy sin evidencia. | OPEN |
| ARCH-002 | P2 | Dependencias globales | `index.html` controla orden de decenas de scripts globales; `test-module-boundaries.mjs` comprueba contratos por globals/texto, no un DAG importable. | Dependencia de orden y renombres dificiles de detectar estaticamente. | Extraer modulos puros primero y reforzar limites al tocar cada dominio. | OPEN |
| GEN-001 | P2 | Assets Android | El arbol Web se duplica bajo `android-native-wrapper/.../assets/`. | Drift si alguien edita/copia fuera del script. | Mantener copia generada, `sync-web-assets.ps1` y `-CheckAndroidAssets`; evaluar generar solo en build en una decision futura. | ACCEPTED RISK / GUARDED |
| DOC-001 | P2 | Handoff/version visible | Historicamente, `CODEX_HANDOFF.md` declaraba la rama Phase 0 como esperada y `README.md` presentaba `97/41` como candidato actual. Ambos documentos distinguen ahora la historia de Home `97/41` del candidato vigente resuelto desde `app-version.json` (`98/42`). | Riesgo cerrado; una referencia estatica futura podria volver a quedar obsoleta. | Mantener separado el estado actual de la historia y contrastar siempre la identidad candidata con `app-version.json`. | CLOSED |
| DOC-002 | P3 | Documentacion bootstrap | `README_GITHUB_APK.md` y `SUBIR_A_GITHUB_PARA_GENERAR_APK.txt` describen crear otro repo y nombres antiguos de artifact. | Confusion, no corrupcion del runtime. | Archivar o reescribir como guia actual en PR documental. | OPEN |

## Reglas de mantenimiento

- Agregar evidencia concreta; no registrar preferencias sin impacto.
- Cerrar una deuda solo con PR/commit y test o justificacion verificable.
- Si una deuda se acepta, documentar guard actual y condicion de revision.
- Una deuda P0 detiene features hasta resolverse o recibir decision humana
  explicita.
