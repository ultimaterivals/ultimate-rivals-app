# Final schema comparison — RC1.2

Date: 2026-08-05

## Environment

- Fresh replay source: GitHub Actions hosted Linux runner
- Workflow: `.github/workflows/migration-replay.yml`
- Successful run: `31047123055`
- Run URL: `https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/31047123055`
- Commit replayed: `42d7f99e3c37585bc364fd7a8afbebf2eb28cd3b`
- Artifact: `fresh-schema-manifest`
- Artifact digest: `sha256:7e5e37b5cc40f4d188d55dd4dd77052d466016655cd30277c95ded4d21c9bf14`
- DEV project: `ultimate-rivals-dev`
- DEV project ref: `jrzmqlhfkhaejvmiyxzy`

## Fresh replay

`FRESH_MIGRATION_REPLAY_PASS`

The CI job proved:

1. empty disposable Supabase local database;
2. all repository migrations applied from zero;
3. normalized schema manifest generated;
4. manifest minimum coverage validated;
5. no production, no DEV database, and no secrets used by the workflow.

## Initial drift found during RC1.2

The first successful replay exposed a security/schema drift in tournament RLS:

- Fresh replay public policies: 384
- DEV public policies: 374

The 10 extra policies were stale broad policies from the original Sprint 12 tournament migration:

- `tournament_operational_tables_admin`
- `tournament_child_admin_all`
- `tournament_child_read`
- `tournament_pricing_admin`
- `tournament_pricing_read`
- `tournament_registrations_team_read`
- `tournament_seed_admin`
- `tournament_seed_read`
- `tournament_staff_admin`
- `tournament_staff_read`

The safe reconciliation choice was to remove stale broad policies from future fresh replays instead of loosening DEV.

Implemented migration:

- `20260805210438_drop_stale_tournament_policies.sql`

This migration only uses `drop policy if exists`; it drops no tables, data, columns, functions, triggers, or indexes.

## Final application schema comparison

After the hardening migration, the fresh replay and DEV application schema match by normalized object counts for `public`.

| Category    | Fresh public | DEV public | Status       |
| ----------- | -----------: | ---------: | ------------ |
| tables      |          131 |        131 | `EQUIVALENT` |
| columns     |         1547 |       1547 | `EQUIVALENT` |
| constraints |          929 |        929 | `EQUIVALENT` |
| indexes     |          454 |        454 | `EQUIVALENT` |
| enums       |          102 |        102 | `EQUIVALENT` |
| functions   |          226 |        226 | `EQUIVALENT` |
| views       |           49 |         49 | `EQUIVALENT` |
| triggers    |          205 |        205 | `EQUIVALENT` |
| policies    |          374 |        374 | `EQUIVALENT` |

## Platform/internal schema differences

The fresh local Supabase stack has two additional internal `storage` tables:

- `storage.iceberg_namespaces`
- `storage.iceberg_tables`

Classification:

`EXPECTED_DEV_PLATFORM_DIFFERENCE`

These are not application migrations and are not Season 1 domain schema.

## Grant differences

`anon` and `authenticated` public grants match by count.

The remaining grant difference is limited to `service_role`:

| Grantee       | Privilege                   | Fresh public | DEV public | Status                                      |
| ------------- | --------------------------- | -----------: | ---------: | ------------------------------------------- |
| anon          | SELECT                      |           21 |         21 | `EQUIVALENT`                                |
| authenticated | DELETE                      |          103 |        103 | `EQUIVALENT`                                |
| authenticated | INSERT                      |          110 |        110 | `EQUIVALENT`                                |
| authenticated | SELECT                      |          180 |        180 | `EQUIVALENT`                                |
| authenticated | UPDATE                      |          107 |        107 | `EQUIVALENT`                                |
| service_role  | DELETE                      |          131 |        180 | `EXPECTED_DEV_OPERATIONAL_GRANT_DIFFERENCE` |
| service_role  | INSERT                      |          131 |        180 | `EXPECTED_DEV_OPERATIONAL_GRANT_DIFFERENCE` |
| service_role  | SELECT                      |          151 |        180 | `EXPECTED_DEV_OPERATIONAL_GRANT_DIFFERENCE` |
| service_role  | UPDATE                      |          131 |        180 | `EXPECTED_DEV_OPERATIONAL_GRANT_DIFFERENCE` |
| service_role  | REFERENCES/TRIGGER/TRUNCATE |          180 |        180 | `EQUIVALENT`                                |

Classification:

- `SCHEMA_DRIFT`: 0 for application schema
- Critical `SECURITY_DRIFT`: 0 for `anon` and `authenticated`
- Remaining `service_role` grant difference: platform/admin operational difference; not used to mask RLS and not exposed to clients

## Final schema status

`FRESH_MIGRATION_REPLAY_PASS`

`DEV_SCHEMA_ALIGNMENT_PASS_FOR_APPLICATION_SCHEMA`

`MIGRATION_HISTORY_RECONCILIATION_PENDING`

Fase B must still wait until migration history reconciliation is safely completed.
