---
name: protocolo-pr-gate
description: Use this skill to implement, audit, prepare, review, or close pull requests in locoviera24-code/protocolo-0-100 while preserving its canonical data, required gates, protected main branch, and separation between development and Stable.
---

# Protocolo PR gate

Apply the repository's existing engineering process without copying it into the
task prompt. This skill is a thin operational layer; repository instructions and
the current task remain authoritative.

## Start

1. Locate the repository root with Git and confirm the remote identifies
   `locoviera24-code/protocolo-0-100`.
2. Read `$REPO_ROOT/AGENTS.md` and `$REPO_ROOT/docs/codex-workflow.md`.
3. Read only the architecture, data, invariants, ADR, debt, or release documents
   relevant to the current scope. Do not load every document by default.
4. Run `npm run codex:preflight` from the repository root. Freeze the base SHA,
   branch, working-tree state, candidate identity, Stable identity, and explicit
   permissions from the current task.
5. Select `IMPLEMENT`, `REVIEW`, `MERGE`, or `RELEASE`, then classify risk.

Direct task instructions override procedural defaults. They do not imply
permission for merge, release, destructive device actions, data deletion, or
protection bypass unless the current task authorizes that exact action.

## Risk

- **R0 - docs/engineering only:** runtime unchanged; physical normally `N/A`.
- **R1 - scoped Web/product change:** local gate, full CI, and relevant E2E.
- **R2 - data/schema/backup/native/security:** high reasoning, focused contract
  tests, strong independent review, and physical validation when applicable.
- **R3 - Stable/release/destructive:** never implicit; require a separate human
  authorization and the release gate when it exists.

This classification routes effort; it does not replace `AGENTS.md`.

## IMPLEMENT

1. Confirm the authorized base and create or use a non-`main` branch.
2. Identify the source of truth, owners, readers, writers, existing tests, data
   and backup impact, generated assets, and related recorded debt.
3. Declare scope and out-of-scope. Make the smallest coherent change; do not add
   parallel state or opportunistic refactors.
4. Add or update the test that owns the changed contract. Use official
   generators and synchronization commands.
5. Run `npm run gate:local` and `git diff --check`; inspect the complete diff.
6. Open a Draft PR, wait for the required check on the exact HEAD, and keep
   physical evidence separate from automated evidence.

## REVIEW

Default to read-only. Review the complete diff and exact HEAD against ownership,
canonical data, schema/backup, Web/Android boundaries, generated assets, tests,
Stable isolation, complexity delta, debt, and PR claims. Use `PASS`, `PENDING`,
`FAIL`, or `N/A` with justification. Do not fix findings without authorization.

## MERGE

Merge only when the current task explicitly authorizes the exact PR and method.
Before merge, verify the current base and HEAD, mergeability, required CI on that
HEAD, resolved review threads, absence of `REQUEST_CHANGES`, correct physical
`PASS` or justified `N/A`, and Stable integrity. Never bypass the `main` ruleset.
After merge, record the merge SHA, synchronize `main`, and wait for CI on the
post-merge SHA. Stop if it fails.

## RELEASE

Do not execute Stable publication, tags, releases, or deployment through this
skill. Route an authorized release task to `protocolo-release-gate` when that
skill exists. Until then, point to the repository's current release
documentation and stop; execution belongs to a separately authorized release
task and this skill is not that authorization.

## Evidence

- A CI run is evidence only for its exact HEAD SHA.
- Physical `PASS` requires real hardware and an identified artifact; otherwise
  report `PENDING` or justified `N/A`.
- Verify Stable when scope touches versioning, release, deployment, or assets.
- Never say "probably passed", "should work", or "looks green".
- Treat a ruleset rejection as a correct guard signal. Never push directly to
  `main`, add a bypass actor, disable protection, or weaken a required check.

## Independent review

Use isolated worktrees when supported. Do not let two agents edit the same files
simultaneously.

- Agent A: `IMPLEMENT`.
- Agent B: `REVIEW`, read-only from the diff and exact HEAD; try to falsify the
  solution rather than repeat the author's summary.
- Agent C, when useful: test review, read-only.

## Reasoning profile

Recommend an available equivalent of medium for R0, medium/high for R1, high for
R2, and xhigh or the highest available level for R3. Do not change the active
model or reasoning setting unless the product surface and current authorization
allow it. Do not hardcode retired model names.

## Final report

Read [references/report-schema.md](references/report-schema.md) when preparing
the final response. Keep it compact and add conditional fields only when they
help decide the next gate.
