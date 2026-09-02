## Objective

<!-- Un resultado observable y verificable. -->

## Scope

<!-- Archivos, dominios y comportamientos incluidos. -->

## Out of scope

<!-- Lo que deliberadamente no cambia. -->

## Architecture and data

- Source of truth affected: <!-- none / exact source -->
- New canonical models: <!-- 0 or list + ADR -->
- New persistent stores: <!-- 0 or list -->
- New storage keys: <!-- 0 or registry entries -->
- New schema versions: <!-- 0 or migration/ADR -->
- Schema/migration: <!-- N/A or compatibility plan -->
- Backup impact: <!-- none / included / excluded + reason -->
- New modules: <!-- 0 or list + owner -->
- Deleted obsolete code: <!-- 0 or list + evidence -->

## Platform impact

- Web/PWA impact:
- Android impact:
- Generated assets: <!-- unchanged / regenerated with canonical script -->
- Stable impact: <!-- must normally be none -->

## Verification

- [ ] `npm run codex:preflight`
- [ ] `npm run gate:local`
- [ ] `git diff --check`
- Tests added/updated:
- Full CI run:
- Physical test: <!-- PASS / FAIL / PENDING / N/A with reason -->

## Change control

- Technical debt created/closed:
- Complexity delta: <!-- modules/keys/schemas added or removed -->
- Rollback:
- Follow-ups explicitly excluded:
