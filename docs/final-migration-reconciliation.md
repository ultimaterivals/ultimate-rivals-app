# Final migration reconciliation — RC1.1

Date: 2026-08-05

## Environment

- Supabase project: `ultimate-rivals-dev`
- Project ref: `jrzmqlhfkhaejvmiyxzy`
- Git branch: `feature/season-1-app-completion`
- Starting HEAD: `3afb0b86fae50559f264ccfda835e5a9fcebc565`
- Production touched: no
- Other Supabase projects touched: no
- Real data inserted: no

## Local history

- Local migration files: 73
- Zero-byte files: none
- Comment-only/no-op files before recovery: none detected
- Local consolidated finance migration:
  - `20260805165852_season_prizes_repasses_finance.sql`
  - SHA-256: `d8a4dd06434e760669bb6ef60ef4afe42b0bbc16841fc77ce7b7b975bc7c5831`

## DEV history

- DEV registered migrations: 78
- DEV history was read through the Supabase migration listing for `jrzmqlhfkhaejvmiyxzy`.
- DEV records six iterative finance/prizes/repasses migrations instead of the single local consolidated file:
  - `20260805170946` / `season_prizes_repasses_finance_core`
  - `20260805171334` / `season_finance_view_probe`
  - `20260805171453` / `season_finance_prize_repass_view`
  - `20260805171918` / `season_finance_summary_views`
  - `20260805171951` / `season_prizes_repasses_seed`
  - `20260805172038` / `season_prizes_repasses_finance_rls`

## Differences

The known finance/prizes/repasses drift remains unresolved.

RC1.1 also surfaced broader exact-version drift: multiple DEV migration entries use a remote migration `version` that does not equal the local file timestamp. In some cases, the DEV `name` embeds the intended local timestamp/name, but the migration history key is still different.

Representative map:

| LOCAL_VERSION    | LOCAL_NAME                         | LOCAL_FILE                                            | LOCAL_HASH                                                         | DEV_VERSION      | DEV_NAME                              | STATUS          |
| ---------------- | ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ | ---------------- | ------------------------------------- | --------------- |
| `20260801175729` | `extensions_and_types`             | `20260801175729_extensions_and_types.sql`             | `1c9ea664970b27b396ca5d7b8cc284e882af1175da13cf9930e741fcb0cef9f8` | `20260801193842` | `20260801175729_extensions_and_types` | `NAME_MISMATCH` |
| `20260801175738` | `identity_and_access`              | `20260801175738_identity_and_access.sql`              | `bc6909f9cd206fec7c11ac85b852ce6f122a689395212f3b781b46b1ac07682a` | `20260801193846` | `20260801175738_identity_and_access`  | `NAME_MISMATCH` |
| `20260801175746` | `core_entities`                    | `20260801175746_core_entities.sql`                    | `89225dd075293edf37329ece6b9e799a8b8e023bbc02613d89e13abf5d8435af` | `20260801193849` | `20260801175746_core_entities`        | `NAME_MISMATCH` |
| `20260801211243` | `teams_rosters_operational_domain` | `20260801211243_teams_rosters_operational_domain.sql` | `50b7d06e1fbaf49e05613510a47bd2ffa3788e2800592dc4c452d77e01e3c685` | `20260801212419` | `teams_rosters_operational_domain`    | `NAME_MISMATCH` |
| `20260805165852` | `season_prizes_repasses_finance`   | `20260805165852_season_prizes_repasses_finance.sql`   | `d8a4dd06434e760669bb6ef60ef4afe42b0bbc16841fc77ce7b7b975bc7c5831` | none             | none                                  | `LOCAL_ONLY`    |
| none             | none                               | none                                                  | none                                                               | `20260805170946` | `season_prizes_repasses_finance_core` | `DEV_ONLY`      |
| none             | none                               | none                                                  | none                                                               | `20260805171334` | `season_finance_view_probe`           | `DEV_ONLY`      |
| none             | none                               | none                                                  | none                                                               | `20260805171453` | `season_finance_prize_repass_view`    | `DEV_ONLY`      |
| none             | none                               | none                                                  | none                                                               | `20260805171918` | `season_finance_summary_views`        | `DEV_ONLY`      |
| none             | none                               | none                                                  | none                                                               | `20260805171951` | `season_prizes_repasses_seed`         | `DEV_ONLY`      |
| none             | none                               | none                                                  | none                                                               | `20260805172038` | `season_prizes_repasses_finance_rls`  | `DEV_ONLY`      |

## Strategy decision

No repair was executed.

Reason: RC1.1 requires `SCHEMA_EQUIVALENT = true` before any migration-history repair can be considered. That proof requires a fresh local replay. The current machine does not have Docker or a local Postgres runtime, and the instructions prohibit using another remote project as the disposable replay target.

## Schema comparison

DEV schema metadata was collected read-only.

| Kind     | Count | Name hash                          |
| -------- | ----: | ---------------------------------- |
| enum     |   102 | `fcf5449684285520d3c5de0666caff98` |
| function |   226 | `039143a54c8b3bcfdb06a9d09592cea9` |
| index    |   454 | `5771b25d8ec7c252cf671512326700f8` |
| policy   |   374 | `970a45b4e54992375459e2b3cf7e65f8` |
| table    |   131 | `e561f08a0a00e0333bb589b6d1f944b6` |
| trigger  |   205 | `a7e8295caf5dedfae0b202559aa32783` |
| view     |    49 | `ac478f1d4cd59692bffe676fc806b131` |

Fresh local schema hash: unavailable because local replay could not run.

`SCHEMA_EQUIVALENT`: not proven.

## Fresh replay

`FRESH_LOCAL_MIGRATION_REPLAY_PASS`: `FAIL_BLOCKED_BY_LOCAL_RUNTIME`

Blocking condition:

- Docker not found.
- `psql`, `postgres`, and `pg_ctl` not found.
- Supabase local DB start requires Docker.
- Creating a Supabase branch or another remote database would violate the RC1.1 replay constraint.

## Repair/no-op decisions

- Compatibility/no-op migration files created: none
- Migration history repair executed: no
- Remote schema modified: no
- Remote data modified: no
- Applied migrations edited: no
- Migrations deleted/renamed: no

This is intentionally conservative. Creating no-op files or repairing history without a replayed schema equivalence proof would hide drift rather than prove reproducibility.

## Final hashes

Known local consolidated finance migration hash:

- `20260805165852_season_prizes_repasses_finance.sql`
- `d8a4dd06434e760669bb6ef60ef4afe42b0bbc16841fc77ce7b7b975bc7c5831`

DEV object-name hashes:

- Tables: `e561f08a0a00e0333bb589b6d1f944b6`
- Views: `ac478f1d4cd59692bffe676fc806b131`
- Indexes: `5771b25d8ec7c252cf671512326700f8`
- Functions: `039143a54c8b3bcfdb06a9d09592cea9`
- Triggers: `a7e8295caf5dedfae0b202559aa32783`
- Policies: `970a45b4e54992375459e2b3cf7e65f8`
- Enums: `fcf5449684285520d3c5de0666caff98`

## Production migration strategy

Do not use the current DEV migration history as the direct production proof yet.

Required before production:

1. Run a fresh replay of all local migrations in a disposable local database.
2. Compare the fresh local schema to DEV, including tables, columns, types, enums, PK, FK, unique constraints, checks, indexes, functions, triggers, views, RLS, policies, and grants.
3. If equivalent, choose one documented reconciliation path:
   - restore faithful local migration files corresponding to the DEV iterative history, or
   - create explicit compatibility/no-op local files only where they represent already-provided schema effects, or
   - perform migration-history repair only if it changes history metadata and not schema/data.
4. Re-run fresh replay after reconciliation.
5. Confirm `LOCAL_FRESH_PASS` and `DEV_ALIGNMENT_PASS`.

## Final status

`MIGRATION_RECOVERY_NEEDS_MANUAL_DECISION`

`MIGRATION_SEQUENCE_REPRODUCIBLE` was not achieved in this environment.

Fase B Demand/Booking/Acquisition and Fase C RC2 verification must not start until this gate is green.
