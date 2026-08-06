# Production seed audit — Season 1

No real data was inserted during this gate.

## Classifications

| Source                                                                                                      | Classification               | PROD decision                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `supabase/seed.sql`                                                                                         | `DEV_ONLY`                   | Never run against PROD. Contains `[DEV]` seasons/poles and test data.                                   |
| E2E/integration fixtures in `tests/`                                                                        | `TEST_ONLY`                  | Never run against PROD except a separately approved controlled smoke with cleanup.                      |
| `20260801175746_core_entities.sql` competitive categories/formats                                           | `SAFE_REFERENCE_DATA`        | Safe. Official domain constants.                                                                        |
| `20260805154400_season_calendar_operations.sql` Q1 templates                                                | `SAFE_REFERENCE_DATA`        | Safe templates; owner config still required.                                                            |
| `20260805160817_season_staff_refereeing_core.sql` staff role catalog                                        | `SAFE_REFERENCE_DATA`        | Safe.                                                                                                   |
| `20260805162929_season_commercial_indexes_seeds.sql` products/pricing/packages                              | `PROD_REQUIRED_REVIEW`       | Technical seed may be useful, but final prices/packages require owner approval before real publication. |
| `20260805164229_season_development_training_hunter_tables.sql` Hunter themes                                | `SAFE_REFERENCE_DATA_REVIEW` | Safe if accepted as official Season 1 themes.                                                           |
| `20260805165852_season_prizes_repasses_finance.sql` prize/repass templates                                  | `PROD_REQUIRED_REVIEW`       | Safe schema/templates, but monetary values require owner approval.                                      |
| `20260805175800_season_partner_market_views_seed_rls.sql` market partners/items/offers with `fake_dev_seed` | `PROD_FORBIDDEN`             | Blocker until gated/extracted from PROD replay.                                                         |
| `20260805181725_season_wallet_media_reports_rls_seed.sql` UR Coin rule set                                  | `PROD_REQUIRED_REVIEW`       | Safe reference rules only if owner approves Season 1 values.                                            |
| `20260805184816_seed_public_calendar_dev_events.sql`                                                        | `PROD_FORBIDDEN`             | Blocker until gated/extracted from PROD replay.                                                         |
| `20260805184934_fix_public_calendar_fixture_window.sql`                                                     | `DEV_ONLY`                   | It only adjusts DEV fixture visibility; should not run in PROD path.                                    |
| `20260805185130_seed_public_calendar_any_dev_pole.sql`                                                      | `PROD_FORBIDDEN`             | Blocker until gated/extracted from PROD replay.                                                         |

## PROD-forbidden entities

The current canonical chain can create fake:

- public calendar events;
- market partners;
- market items;
- market offers.

No fake athlete/team/venue/sponsor/payment should be migrated from DEV into
PROD. Real Season 1 data must be created through the approved UI/import/runbook
after PROD is provisioned.

## Required remediation before PROD

Create an additive production-readiness change that ensures DEV fixtures are not
executed in PROD fresh replay. Acceptable approaches:

1. move DEV fixtures to `supabase/seed.sql` only and keep PROD replay schema-only;
2. guard fixture inserts behind an explicit environment table/setting that is
   false/missing in PROD;
3. create a dedicated PROD bootstrap runbook for only approved real reference
   data.

Do not edit already-applied migrations merely to hide the issue.
