# Migration strategy v1

Status: `SEASON_1_V1_BASELINE_STRATEGY_ACTIVE`.

## Active production chain

Starting on branch `release/season-1-v1`, `supabase/migrations/` contains the
new production canonical chain:

- `20260806000000_season_1_v1_production_baseline.sql`

This baseline is schema-first and excludes top-level operational DML. Required
catalog/configuration records live in `scripts/production-reference-data.sql`.

## Legacy chain

The full Season 1 development chain is preserved under:

- `supabase/migrations_legacy/season-1-development/`

It is audit-only. Do not push it to future PROD. Do not edit it casually. The
index with hashes is maintained in `docs/legacy-migration-index.md`.

## Future database changes

After Season 1 v1 reaches PROD:

1. never edit the applied baseline;
2. create a new migration after the baseline for every schema change;
3. keep DEV/test seed data outside `supabase/migrations/`;
4. run the production baseline replay workflow before release approval;
5. keep reference data idempotent and explicit.

## DEV status

The current DEV project is classified as `LEGACY_DEV_ENVIRONMENT`.

Do not force the historical DEV migration table to look like the v1 production
baseline. Future work should use either:

- a new clean staging/DEV project created from baseline v1; or
- an audited transition plan that reconciles DEV history without reset.
