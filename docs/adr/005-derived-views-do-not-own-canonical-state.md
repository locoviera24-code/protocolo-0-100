# ADR 005: Las vistas derivadas no poseen estado canonico

## Status

Accepted

## Context

Home y Progreso combinan datos de entrenamiento, protocolo y nutricion para
responder preguntas de presentacion.

## Decision

Los selectores/modelos derivados reciben datos y devuelven presentacion o
metricas. No crean stores paralelos, sesiones ni schemas por el hecho de
renderizar. Home delega acciones al router/logger; Progreso lee fuentes
canonicas.

## Consequences

El mismo dato puede mostrarse en varias vistas sin adquirir varios owners. Las
escrituras heredadas durante render se consideran deuda registrada, no parte de
esta decision.

## How to change this decision

Si un calculo necesita persistencia, justificar owner, invalidez, retencion,
reconstruccion, backup y migracion en un ADR antes de agregar la key.
