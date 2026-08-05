# RC1.1 migration recovery — before state

Date: 2026-08-05

## Scope guard

- Authorized Supabase project: `ultimate-rivals-dev`
- Authorized project ref: `jrzmqlhfkhaejvmiyxzy`
- Project status observed through the Supabase connector: `ACTIVE_HEALTHY`
- Other projects observed but not modified: `ultimaterivals's Project`, `graficaos`
- Production access: none
- Real data access/insert: none
- Destructive operation: none

## Git baseline

- Project root: `C:\Users\Usuário\Desktop\Ultimate Rivals Sistema\ultimate-rivals-app`
- Branch: `feature/season-1-app-completion`
- Baseline HEAD: `3afb0b86fae50559f264ccfda835e5a9fcebc565`
- Baseline commit: `docs: add rc1 final migration audit`
- Local and remote branch heads at start: identical

## Safety backup

A Git bundle was created before any recovery decision:

- `docs/ultimate-rivals-rc1_1-before-20260805181832.bundle`

This bundle is a local safety artifact for the current branch state. It was not used to restore, reset, or rewrite history.

## Tooling discovered

- Local Supabase CLI package: `supabase@2.111.0`
- `npx.cmd supabase --version`: `2.111.0`
- Global `supabase` command: not available in PATH
- `SUPABASE_ACCESS_TOKEN`: not available to the CLI session
- Supabase connector: available and used for read-only project, migration, and schema metadata
- Docker: not available in PATH
- Local `psql`, `postgres`, `pg_ctl`: not available in PATH

## DEV migration history

The DEV migration history was read through the official Supabase migration listing for project `jrzmqlhfkhaejvmiyxzy`.

- DEV registered migrations: 78
- Local SQL migration files: 73
- Local zero-byte migrations: none
- Local comment-only/no-op migrations: none detected

## Exact drift observed

The RC1 audit identified the finance/prizes/repasses drift:

- Local-only consolidated file: `20260805165852_season_prizes_repasses_finance.sql`
- DEV-only iterative migrations:
  - `20260805170946` / `season_prizes_repasses_finance_core`
  - `20260805171334` / `season_finance_view_probe`
  - `20260805171453` / `season_finance_prize_repass_view`
  - `20260805171918` / `season_finance_summary_views`
  - `20260805171951` / `season_prizes_repasses_seed`
  - `20260805172038` / `season_prizes_repasses_finance_rls`

RC1.1 also confirmed a broader exact-history issue: many DEV entries have a migration `version` different from the local file timestamp, even when the DEV `name` embeds or matches the intended local migration name. Example:

| LOCAL_VERSION    | LOCAL_NAME                         | DEV_VERSION      | DEV_NAME                              | STATUS          |
| ---------------- | ---------------------------------- | ---------------- | ------------------------------------- | --------------- |
| `20260801175729` | `extensions_and_types`             | `20260801193842` | `20260801175729_extensions_and_types` | `NAME_MISMATCH` |
| `20260801175738` | `identity_and_access`              | `20260801193846` | `20260801175738_identity_and_access`  | `NAME_MISMATCH` |
| `20260801211243` | `teams_rosters_operational_domain` | `20260801212419` | `teams_rosters_operational_domain`    | `NAME_MISMATCH` |
| `20260805165852` | `season_prizes_repasses_finance`   | none             | none                                  | `LOCAL_ONLY`    |
| none             | none                               | `20260805170946` | `season_prizes_repasses_finance_core` | `DEV_ONLY`      |
| none             | none                               | `20260805171334` | `season_finance_view_probe`           | `DEV_ONLY`      |
| none             | none                               | `20260805171453` | `season_finance_prize_repass_view`    | `DEV_ONLY`      |
| none             | none                               | `20260805171918` | `season_finance_summary_views`        | `DEV_ONLY`      |
| none             | none                               | `20260805171951` | `season_prizes_repasses_seed`         | `DEV_ONLY`      |
| none             | none                               | `20260805172038` | `season_prizes_repasses_finance_rls`  | `DEV_ONLY`      |

Because Supabase migration reproducibility is keyed by migration version, not only by human-readable name, this cannot be treated as harmless naming drift without a fresh replay and schema equivalence proof.

## DEV schema metadata snapshot

Read-only schema metadata was collected from `public` on DEV.

Object counts and deterministic name hashes:

| Kind     | Count | Name hash                          |
| -------- | ----: | ---------------------------------- |
| enum     |   102 | `fcf5449684285520d3c5de0666caff98` |
| function |   226 | `039143a54c8b3bcfdb06a9d09592cea9` |
| index    |   454 | `5771b25d8ec7c252cf671512326700f8` |
| policy   |   374 | `970a45b4e54992375459e2b3cf7e65f8` |
| table    |   131 | `e561f08a0a00e0333bb589b6d1f944b6` |
| trigger  |   205 | `a7e8295caf5dedfae0b202559aa32783` |
| view     |    49 | `ac478f1d4cd59692bffe676fc806b131` |

All queried priority-domain base tables matching `prize`, `repass`, `finance`, `revenue`, `expense`, `commercial`, `sponsor`, `venue`, `calendar`, `development`, `training`, `hunter`, or `tournament` reported `relrowsecurity = true`.

## Fresh replay status

`FRESH_LOCAL_MIGRATION_REPLAY_PASS` was not achieved.

Reason:

- Docker is not available.
- No local Postgres executable was found.
- The Supabase CLI can start a local DB only with Docker in this environment.
- The RC1.1 instructions explicitly disallow using another remote project as the disposable replay target.

## Before-state conclusion

Current safe status:

`MIGRATION_RECOVERY_NEEDS_MANUAL_DECISION`

No migration repair, no no-op compatibility files, and no Demand/Booking implementation should proceed until a local disposable replay database is available or the user explicitly authorizes a different safe replay target.
