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

## gym_party_members

Documento: `gym_party_members/{partyId}_{userId}`

- `id`
- `partyId`
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

## workout_sets_shared

Documento: `workout_sets_shared/{partyId}_{userId}_{localSessionId}_{exerciseId}_{setId}`

- `id`
- `partyId`
- `sessionId`
- `userId`
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
