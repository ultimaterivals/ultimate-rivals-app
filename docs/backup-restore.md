# Backup and restore

No production backup or restore was executed during the Season 1 production gate.

## Backup before production migrations

Before the first production migration and before every later production schema
change:

1. Confirm project name and project ref.
2. Confirm the Git commit to be deployed.
3. Export schema and data using Supabase official tooling or `pg_dump`.
4. Record timestamp, operator, source commit, destination project and storage
   location.
5. Confirm restore credentials are available to the release owner.

## Restore rehearsal

Restore first into an isolated environment, never directly into production as a
first attempt. Validate:

- migration version table;
- RLS policies;
- Auth login and redirect behavior;
- private Storage access;
- admin, operator, team manager and athlete smoke paths;
- audit log continuity.

## Rollback policy

- Application rollback: redeploy the previous known-good application build.
- Database rollback: prefer forward-fix migrations when data has already been
  written; use full restore only for severe release-stopping incidents.
- Data rollback: require owner approval and an incident record.
- Real data must never be restored into DEV without explicit privacy approval
  and a documented sanitization plan.
