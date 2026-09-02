# ADR 001: WorkoutSessions es el historial canonico

## Status

Accepted

## Context

El producto tuvo registros legacy en `gymSessions`. Home, Progreso, Gym Party,
backup y Android necesitan observar las mismas sesiones y series.

## Decision

La entrada `workout:sessions` de `data/schema-registry.js`, persistida como
`protocolo_0_100_workout_sessions_v1`, es el unico historial canonico.
`gymSessions` existe solo para compatibilidad/migracion. Mutaciones Android y
reconciliaciones autorizadas terminan en `workoutSessions`.

## Consequences

Las vistas pueden derivar metricas sin guardar otro historial. Cualquier writer
de sesiones debe preservar identidad e idempotencia. El legacy no se usa para
crear sesiones nuevas.

## How to change this decision

Crear un ADR sustituto, schema nuevo, migracion reversible, compatibilidad de
backup y Android, y pruebas que demuestren cero perdida/duplicacion antes de
cambiar lectores o writers.
