# Final migration audit — RC1

Environment audited:

- Supabase project: `ultimate-rivals-dev`
- Project ref: `jrzmqlhfkhaejvmiyxzy`
- Git branch: `feature/season-1-app-completion`
- Baseline HEAD at audit start: `301f3581be0500f793596e064b68708ea94041ec`

## LOCAL MIGRATIONS

- Local SQL migration files: 73.
- Zero-byte migrations: none.
- Comment-only/no-op migrations: none detected.
- Special file requested by RC1, `20260805175811_season_ur_coins_media_reports_core.sql`: not present locally.
- The current wallet/media/report implementation is present locally as:
  - `20260805181713_season_wallet_media_reports_core.sql`
  - `20260805181725_season_wallet_media_reports_rls_seed.sql`
  - `20260805183618_optimize_season_report_summary.sql`

## DEV MIGRATIONS

The DEV migration history was read from `supabase_migrations.schema_migrations` on project `jrzmqlhfkhaejvmiyxzy`.

- DEV registered migrations: 78.
- Special file requested by RC1, `20260805175811_season_ur_coins_media_reports_core.sql`: not registered in DEV history.
- The DEV wallet/media/report migrations are registered as:
  - `season_wallet_media_reports_core`
  - `season_wallet_media_reports_rls_seed`
  - `optimize_season_report_summary`

## EMPTY/NO-OP MIGRATIONS

No local zero-byte or comment-only SQL migration files were found.

The previously discussed placeholder `20260805173258_season_venue_sponsor_market_operations.sql` is also not present locally and is not registered in DEV history.

## RECONCILIATIONS

Normalized local/DEV comparison found one local migration without a corresponding DEV history entry:

- Local only:
  - `20260805165852_season_prizes_repasses_finance.sql`

DEV contains six finance/prize/repass migrations that do not have corresponding local migration files:

- `season_prizes_repasses_finance_core`
- `season_finance_view_probe`
- `season_finance_prize_repass_view`
- `season_finance_summary_views`
- `season_prizes_repasses_seed`
- `season_prizes_repasses_finance_rls`

This indicates historical drift: the local repository currently has a consolidated finance/prizes/repasses migration, while DEV history records an iterative sequence.

RC1 explicitly forbids rewriting already applied migrations or hiding drift. Therefore this audit does not edit applied migration history and does not mark the sequence reproducible.

## FINAL STATUS

`MIGRATION_SEQUENCE_NOT_REPRODUCIBLE`

RC1 launch verification must stop before READY until migration history is reconciled safely. Acceptable next actions are a deliberate migration-history reconciliation plan, not product feature work, not PROD access, and not rewriting applied DEV migrations.
