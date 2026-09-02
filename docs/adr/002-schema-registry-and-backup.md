# ADR 002: Registro unico de persistencia y backup controlado

## Status

Accepted

## Context

La app funciona local-first con datos en varios dominios, retenciones distintas,
IndexedDB, compatibilidad localStorage y export/import portable.

## Decision

`data/schema-registry.js` registra toda clave Web estructurada y define dominio,
schema, validacion, retencion, sensibilidad, storage y backup. `APP_DATA` aplica
el registro. `BACKUP_SERVICE` genera el contrato portable desde el mapa de
campos del registro y usa schema versionado, preview, snapshot y rollback.

## Consequences

Una key desconocida no puede escribirse por `APP_DATA`. Los datos sensibles se
excluyen o redactan. Las claves local-only y transitorias siguen registradas,
aunque no entren al backup.

## How to change this decision

Coordinar registro, servicio de backup, migraciones y tests. Un aumento del
schema portable requiere compatibilidad hacia atras y ADR explicito.
