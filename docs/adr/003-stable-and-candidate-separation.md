# ADR 003: Stable y candidato son identidades separadas

## Status

Accepted

## Context

`main` puede contener el siguiente candidato mientras Web/PWA y Android Stable
siguen sirviendo una version anterior validada.

## Decision

`app-version.json` identifica el candidato. `.github/stable-release.json`
identifica la promocion Web Stable. Android se publica por workflow manual con
tag build-qualified inmutable. Ningun canal Stable se infiere solo desde `main`.

## Consequences

Un merge de feature ejecuta CI beta, no promociona Stable. Pages requiere
metadata alineada. Android y Web pueden registrar SHAs administrativos
distintos; el diff permitido debe auditarse.

## How to change this decision

Requiere ADR sustituto, plan de migracion de releases, guards equivalentes y
autorizacion humana. Releases publicas existentes no se mueven ni sobrescriben.
