# Architecture Decision Records

Los ADR registran decisiones durables ya presentes en codigo y tests. No son
una lista de deseos.

## Estados

- `Accepted`: decision vigente.
- `Superseded`: reemplazada por otro ADR enlazado.
- `Deprecated`: vigente solo para compatibilidad durante una migracion.

## Indice

1. [WorkoutSessions canonico](001-workout-sessions-canonical.md)
2. [Registro de schemas y backup](002-schema-registry-and-backup.md)
3. [Separacion Stable/candidato](003-stable-and-candidate-separation.md)
4. [Limite Web/Android](004-web-android-boundary.md)
5. [Vistas derivadas sin ownership canonico](005-derived-views-do-not-own-canonical-state.md)

Un cambio de decision debe agregar o reemplazar un ADR, definir migracion y
actualizar tests/documentacion relacionados. No editar el pasado para fingir
que la decision nueva siempre existio.
