# Compact PR gate report

Use the following core fields. Omit no core field; use `N/A` with a reason when a
field does not apply. Add task-specific fields only when they affect a decision.

```text
MODE
RISK
BASE_SHA
BRANCH
SCOPE
SOURCE_OF_TRUTH
RUNTIME_CHANGED
DATA_CHANGED
SCHEMA_CHANGED
BACKUP_IMPACT
ANDROID_IMPACT
STABLE_IMPACT
PREFLIGHT
LOCAL_GATE
TESTS
CI_RUN
CI_STATUS
PHYSICAL
DEBT
PR
HEAD
MERGE_STATUS
BLOCKERS
NEXT_EXACT_ACTION
```

## Evidence rules

- Status values are `PASS`, `PENDING`, `FAIL`, or `N/A` with justification.
- Tie CI, artifacts, and physical evidence to exact SHAs/builds.
- Separate automated, physical, and Stable evidence.
- State whether runtime, data, schema, backup, Android, or Stable changed.
- Do not hide blockers inside a summary.
- Make `NEXT_EXACT_ACTION` one concrete authorized next gate, not a list of
  speculative follow-ups.

## Conditional fields

Add fields such as artifact hash, device, migration path, release identity,
review threads, or post-merge CI only when the current mode and risk require
them. Do not expand routine R0/R1 reports into release-sized checklists.
