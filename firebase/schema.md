# Gym Party Firestore Schema

Gym Party usa datos de gimnasio compartidos de forma opt-in. No sube nutricion,
sueno, ansiedad, pantalla, notas privadas ni correo visible por defecto.

## users_public_profile

Documento: `users_public_profile/{uid}`

- `uid`
- `alias`
- `avatar`
- `createdAt`
- `updatedAt`

## gym_parties

Documento: `gym_parties/{partyId}`

- `id`
- `name`
- `inviteCode`
- `createdBy`
- `createdAt`
- `updatedAt`
- `active`
- `privacyMode`
- `membersCount`
- `maxMembers`
- `membershipRevision`: revision monotona de cambios de membresia
- `lastMembershipMutation`: `userId`, `actorId`, `operation`, `inviteCode` y
  `at`; permite que Rules vincule el contador con el miembro exacto

## gym_party_members

Documento: `gym_party_members/{partyId}_{userId}`

- `id`
- `partyId`
- `inviteCode` inmutable usado al crear la membresia
- `userId`
- `aliasInParty`
- `role`: `owner` o `member`
- `joinedAt`
- `active`
- `shareGymData`
- `shareAggregateOnly`
- `shareSetDetails`
- `hideAbsoluteWeights`
- `anonymousAlias`
- `shareGeneralScore`
- `deactivationReason`: `left`, `removed` o `archived`
- `deactivatedBy`
- `deactivatedAt`
- `reactivatedAt`
- `reactivationCount`

## workout_sessions_shared

Documento: `workout_sessions_shared/{partyId}_{userId}_{localSessionId}`

- `id`
- `partyId`
- `userId`
- `localSessionId`
- `date`
- `weekday`
- `routineName`
- `startedAt`
- `finishedAt`
- `durationMinutes`
- `exercisesCompleted`
- `totalSets`
- `totalReps`
- `totalVolume`
- `createdAt`
- `updatedAt`
- `revision`
- `localDate`
- `timeZone`
- `utcOffset`
- `deletedReason`: opcional al retirar datos compartidos

## workout_sets_shared

Documento: `workout_sets_shared/{partyId}_{userId}_{localSessionId}_{exerciseId}_{setId}`

- `id`
- `partyId`
- `sessionId`
- `userId`
- `localExerciseId`
- `localSetId`
- `exerciseId`
- `exerciseName`
- `muscleGroup`
- `setNumber`
- `reps`
- `weightKg`
- `rir`
- `rpe`
- `isBodyweight`
- `date`
- `createdAt`
- `updatedAt`
- `deleted`: boolean opcional. Cuando una serie se elimina en la app, se marca
  como `true` para ocultarla de graficas/metrica y sincronizar el cambio sin
  requerir `delete` fisico en Firestore.
- `deletedAt`: fecha del tombstone
- `deletedReason`: opcional, por ejemplo `privacy-removal`
- `revision`
- `localDate`
- `timeZone`
- `utcOffset`

## gym_party_invites

Documento: `gym_party_invites/{inviteCode}`

- `inviteCode`
- `partyId`
- `partyName`
- `createdBy`
- `createdAt`
- `updatedAt`
- `active`
- `membersCount`
- `maxMembers`
- `uses`
- `maxUses`: opcional
- `expiresAt`: opcional
- `membershipRevision`: espejo de la revision de la sala

## weekly_member_stats

Documento sugerido: `weekly_member_stats/{partyId}_{userId}_{weekStart}`

- `partyId`
- `userId`
- `weekStart`
- `sessionsCount`
- `totalSets`
- `totalReps`
- `totalVolume`
- `exercisesCount`
- `consistencyScore`
- `changeVsPreviousWeek`

En el MVP web actual las estadisticas se calculan en cliente y pueden cachearse
a futuro para reducir lecturas.

## Identidad e invariantes

- Los IDs de membresia siguen `{partyId}_{userId}`.
- Sesiones y sets compartidos conservan `partyId`, `userId` y su ID local; las
  reglas impiden cambiarlos despues de crear el documento.
- `members[]` no se guarda dentro de `gym_parties`; los miembros viven en
  `gym_party_members` para evitar duplicacion y escrituras conflictivas.
- El limite recomendado/validado es 10 miembros.
- `membersCount`, `uses` y `membershipRevision` solo cambian junto con la sala,
  la invitacion vigente y el miembro afectado en una misma transaccion.
- Un miembro activo puede salir voluntariamente (`left`). Solo esa salida se
  puede reactivar con la misma invitacion todavia vigente. Una expulsion
  (`removed`) y un documento inactivo legacy no permiten auto-reactivacion.
- `id`, `partyId`, `userId`, `role` e `inviteCode` de una membresia son
  inmutables.
- La fecha de calendario (`date`/`localDate`) se conserva separada del timestamp
  UTC para que las semanas no cambien por zona horaria.
- `dirty`, `syncState`, `attempts`, `lastError` y el backoff viven solo en
  `localStorage`/`syncQueue`; se eliminan al sanitizar la escritura remota y no
  forman parte del documento Firestore permitido por Rules.
