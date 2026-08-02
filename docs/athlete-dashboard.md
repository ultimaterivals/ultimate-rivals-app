# Athlete dashboard

`getAthleteDashboard` is the server-side aggregator for `/athlete`. It resolves the athlete once, executes independent reads in parallel, then performs a small second phase for team, pole, formation, and contribution ranking contexts.

It reuses the official domains for identity, seasons, registrations, court operations, scoring, ranking, rosters, and progression. It does not persist a large dashboard JSON document or recalculate sporting facts in React.

## Priority

1. Current match or reserve call.
2. Next confirmed/waitlisted UR Play registration.
3. Official ranking and next target.
4. Homologated monthly performance.
5. Team, pole, and official formations.
6. Development.

Match history uses participant RLS and keeps `level_snapshot`, `team_snapshot_id`, and `pole_snapshot_id` semantics. Ranking points only appear for homologated results.
