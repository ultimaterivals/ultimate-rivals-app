# Production migration plan — Season 1

Status: `PRODUCTION_RELEASE_PLAN_BLOCKED` until PROD-forbidden DEV fixtures are
removed from, or safely gated outside, the canonical production replay path.

## Canonical chain rule

- Git repository migrations are the canonical source.
- GitHub Actions Migration Replay is the replay proof.
- DEV history remains `DIVERGENT_DOCUMENTED`.
- Do not synchronize PROD from DEV history.
- Do not clone DEV schema manually.
- PROD must start empty and receive the canonical repository chain only after
  the PROD-forbidden seed issue below is resolved.

## Blocker

The canonical chain currently contains migrations that insert explicit DEV/fake
fixtures:

- `20260805175800_season_partner_market_views_seed_rls.sql`
- `20260805184816_seed_public_calendar_dev_events.sql`
- `20260805185130_seed_public_calendar_any_dev_pole.sql`

These create fake partners, offers and public calendar events. They are
excellent for DEV but must not create real production content. Because applied
migrations must not be edited casually, the safe production strategy is:

1. create a new additive migration/script that moves DEV fixture creation behind
   an explicit environment guard or extracts it to DEV-only seed execution;
2. prove fresh replay again;
3. only then provision PROD from the canonical chain.

## Ordered migration map

| Version        | File                                               | Domain                                   | PROD safety                                                                 |
| -------------- | -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 20260801175729 | `extensions_and_types`                             | Extensions, private schema, enums        | Safe, with `btree_gist` note below                                          |
| 20260801175738 | `identity_and_access`                              | profiles, athletes                       | Safe schema                                                                 |
| 20260801175746 | `core_entities`                                    | seasons, poles, venues/courts refs       | Safe reference data only                                                    |
| 20260801175753 | `team_domain`                                      | teams/access/memberships                 | Safe schema                                                                 |
| 20260801175800 | `audit`                                            | audit logs/triggers                      | Safe operational trigger inserts                                            |
| 20260801175810 | `rls`                                              | baseline RLS                             | Safe                                                                        |
| 20260801175817 | `indexes_and_grants`                               | indexes/grants                           | Safe                                                                        |
| 20260801194915 | `fix_rls_policy_recursion`                         | RLS hardening                            | Safe                                                                        |
| 20260801200421 | `athlete_360_domain`                               | athlete private fields, avatar bucket    | Safe; creates private bucket                                                |
| 20260801201248 | `restrict_athlete_private_rows`                    | privacy/RLS                              | Safe                                                                        |
| 20260801201920 | `athlete_csv_transactional_import`                 | import RPC                               | Safe                                                                        |
| 20260801210306 | `allow_admin_avatar_uploads`                       | storage policy                           | Safe                                                                        |
| 20260801211243 | `teams_rosters_operational_domain`                 | teams, rosters, team logo bucket         | Safe; creates private bucket                                                |
| 20260801215832 | `seasons_leveling_assessments_progression`         | seasons, leveling, assessments           | Safe reference/rule data                                                    |
| 20260801220708 | `fix_assessment_score_transaction`                 | assessment transaction fix               | Safe                                                                        |
| 20260801224652 | `ur_play_sessions_registration_checkin`            | UR Play sessions, registration, check-in | Safe schema/RPC                                                             |
| 20260802000052 | `court_ops_matches_queue`                          | Court Ops queue/matches                  | Safe trigger backfill on existing PROD-empty data                           |
| 20260802001145 | `harden_match_participant_concurrency`             | concurrency                              | Safe                                                                        |
| 20260802001743 | `index_court_ops_foreign_keys`                     | indexes                                  | Safe                                                                        |
| 20260802005640 | `allow_assigned_staff_court_ops_read`              | RLS read scope                           | Safe                                                                        |
| 20260802014220 | `sprint_7_1_match_squads_and_court_reassignment`   | squads/reserves/courts                   | Safe schema/RPC                                                             |
| 20260802020226 | `fix_sprint_7_1_squad_athlete_aliases`             | RPC fix                                  | Safe                                                                        |
| 20260802020514 | `allow_squad_enum_assignment_casts`                | casts                                    | Safe                                                                        |
| 20260802020703 | `qualify_squad_position_constraint`                | constraint fix                           | Safe                                                                        |
| 20260802023800 | `scope_match_start_queue_to_session`               | queue scope                              | Safe                                                                        |
| 20260802025000 | `restore_participant_team_manager_match_read`      | RLS read scope                           | Safe                                                                        |
| 20260802104936 | `add_pending_review_match_status`                  | enum/status                              | Safe                                                                        |
| 20260802104947 | `scoring_engine_rallies_results`                   | scoring engine                           | Safe schema/RPC                                                             |
| 20260802113020 | `fix_scoring_stale_sequence_error_code`            | scoring fix                              | Safe                                                                        |
| 20260802121203 | `index_scoring_foreign_keys`                       | indexes                                  | Safe                                                                        |
| 20260802133109 | `ranking_ledger_engine`                            | ranking ledger/rules                     | Safe reference rules                                                        |
| 20260802134749 | `fix_ranking_participant_alias`                    | ranking fix                              | Safe                                                                        |
| 20260802135105 | `index_ranking_foreign_keys`                       | indexes                                  | Safe                                                                        |
| 20260802142334 | `refine_ranking_rls_policies`                      | RLS                                      | Safe                                                                        |
| 20260802151416 | `official_rankings_classifications`                | public/private rankings                  | Safe schema/RPC                                                             |
| 20260802152824 | `harden_closed_ranking_cycles`                     | ranking hardening                        | Safe                                                                        |
| 20260802153242 | `allow_controlled_ranking_refresh`                 | admin RPC                                | Safe                                                                        |
| 20260802154337 | `allow_authorized_coordinator_ranking_refresh`     | coordinator RPC                          | Safe                                                                        |
| 20260802164258 | `athlete_internal_notifications`                   | notifications                            | Safe                                                                        |
| 20260805032015 | `sprint_12_tournament_engine`                      | tournaments                              | Safe schema                                                                 |
| 20260805053040 | `sprint_12_reconcile_multiset_core`                | tournament reconciliation                | Safe                                                                        |
| 20260805053356 | `sprint_12_reconcile_tournament_access_function`   | RLS helper                               | Safe                                                                        |
| 20260805053407 | `sprint_12_reconcile_tournaments_rls`              | RLS                                      | Safe                                                                        |
| 20260805053417 | `sprint_12_reconcile_tournament_divisions_rls`     | RLS                                      | Safe                                                                        |
| 20260805053427 | `sprint_12_reconcile_tournament_registrations_rls` | RLS                                      | Safe                                                                        |
| 20260805053436 | `sprint_12_reconcile_tournament_matches_rls`       | RLS                                      | Safe                                                                        |
| 20260805053752 | `sprint_12_consolidate_remaining_tournament_rls`   | RLS                                      | Safe                                                                        |
| 20260805154400 | `season_calendar_operations`                       | calendar templates                       | Safe reference templates                                                    |
| 20260805160051 | `season_calendar_rls_and_index_advisor_cleanup`    | RLS/indexes                              | Safe                                                                        |
| 20260805160817 | `season_staff_refereeing_core`                     | staff roles                              | Safe reference catalog                                                      |
| 20260805160927 | `season_staff_refereeing_views`                    | views                                    | Safe                                                                        |
| 20260805160937 | `season_staff_refereeing_result_guard`             | guard                                    | Safe                                                                        |
| 20260805161001 | `season_staff_refereeing_rls`                      | RLS                                      | Safe                                                                        |
| 20260805162805 | `season_commercial_types_tables`                   | products/pricing/payments                | Safe schema                                                                 |
| 20260805162929 | `season_commercial_indexes_seeds`                  | product/package seed                     | Review: configurable Q1 reference data; safe only if owner accepts defaults |
| 20260805162957 | `season_commercial_views_rls`                      | commercial views/RLS                     | Safe                                                                        |
| 20260805164229 | `season_development_training_hunter_tables`        | development/training/Hunter              | Review: reference themes, no real athletes                                  |
| 20260805164245 | `season_development_training_hunter_indexes_view`  | views/indexes                            | Safe                                                                        |
| 20260805164324 | `season_development_training_hunter_rls`           | RLS                                      | Safe                                                                        |
| 20260805165852 | `season_prizes_repasses_finance`                   | finance/prizes/repasses                  | Review: templates/repass plan need owner approval                           |
| 20260805172235 | `cleanup_prize_plan_policy_duplication`            | RLS cleanup                              | Safe                                                                        |
| 20260805175750 | `season_partner_market_core`                       | partners/market schema                   | Safe schema                                                                 |
| 20260805175800 | `season_partner_market_views_seed_rls`             | partner/market views + DEV seeds         | **PROD_FORBIDDEN until gated**                                              |
| 20260805181120 | `fix_public_market_anon_policies`                  | public market RLS                        | Safe after seed blocker resolved                                            |
| 20260805181713 | `season_wallet_media_reports_core`                 | wallet/media/reports                     | Safe schema                                                                 |
| 20260805181725 | `season_wallet_media_reports_rls_seed`             | wallet rules/RLS                         | Review: reference URC rules, no fake people                                 |
| 20260805183618 | `optimize_season_report_summary`                   | report performance                       | Safe                                                                        |
| 20260805184333 | `public_calendar_teams_experience`                 | public pages/views                       | Safe                                                                        |
| 20260805184719 | `grant_public_calendar_teams_columns`              | grants                                   | Safe                                                                        |
| 20260805184816 | `seed_public_calendar_dev_events`                  | DEV public fixtures                      | **PROD_FORBIDDEN until gated**                                              |
| 20260805184934 | `fix_public_calendar_fixture_window`               | DEV fixture date movement                | **PROD_FORBIDDEN dependency**                                               |
| 20260805185130 | `seed_public_calendar_any_dev_pole`                | DEV public fixtures fallback             | **PROD_FORBIDDEN until gated**                                              |
| 20260805190631 | `expand_season1_notification_types`                | notification enum                        | Safe                                                                        |
| 20260805210438 | `drop_stale_tournament_policies`                   | fresh replay hardening                   | Safe                                                                        |
| 20260805212524 | `agenda_demand_booking_acquisition`                | agenda/demand/acquisition                | Safe schema/RLS                                                             |
| 20260805214732 | `fix_demand_formation_policy_recursion`            | RLS fix                                  | Safe                                                                        |
| 20260805220028 | `harden_demand_advisors`                           | advisor hardening                        | Safe                                                                        |
| 20260805220208 | `index_remaining_demand_foreign_keys`              | indexes                                  | Safe                                                                        |

## `btree_gist`

The chain installs `btree_gist` in `public`. Supabase Security Advisor warns
about extensions in public. It is historical and currently used as a general
Postgres capability for exclusion/range-safe modeling. Do not move it in DEV
now. For PROD, prefer testing whether a fresh chain can install extensions into
a dedicated `extensions` schema without regression. If not proven before
launch, accept as `HISTORICAL_ACCEPTED` and place a technical backlog item.
