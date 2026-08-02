# Athlete Experience

## Product promise

The athlete portal answers six questions without exposing administrative tables: who the athlete is, where they stand, how they are performing, when they play, what changed, and what the next target is.

The visual hierarchy is fixed: current match, next UR Play, ranking, recent performance, team, and development. Empty states never invent a ranking, comparison, formation position, or achievement.

## Routes

- `/athlete`: contextual home.
- `/athlete/performance`: season, current-cycle, and last-games statistics.
- `/athlete/matches`: personal match history.
- `/athlete/matches/[id]`: participant-scoped match detail and ledger breakdown.
- `/athlete/journey`: evidence-backed career timeline.
- `/athlete/notifications`: private internal inbox.
- Existing ranking, development, UR Play, points, and profile routes remain the domain sources.

Current `queued`, `called`, `ready`, or `in_progress` matches outrank secondary content. A squad member with `squad_role = reserve` is labeled `RESERVA` and is never represented as a starter. Pending results display no ranking points.

The route-level loading boundary uses stable skeleton dimensions. The error boundary provides a useful retry message while technical details stay server-side.
