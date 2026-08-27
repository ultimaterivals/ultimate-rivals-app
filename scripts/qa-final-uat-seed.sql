-- Ephemeral-only fixtures for the final Athlete App UAT.
-- This file is executed only by App V1 Isolated QA against disposable Supabase.
-- Never run against DEV, PROD, or any hosted project.

\set ON_ERROR_STOP on

insert into public.historical_match_results (
  id,
  season_id,
  source_ref,
  provenance,
  legacy_game_id,
  occurred_at,
  time_label,
  side_a_label,
  side_b_label,
  score_a,
  score_b,
  winner_side,
  source_metadata
)
values (
  '91000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '[QA] final-uat-history',
  '[QA] final-uat-history',
  9001,
  null,
  null,
  '[QA] Athlete A / Athlete C',
  '[QA] Athlete B / Guest',
  11,
  8,
  'A',
  '{"origin":"final_uat_disposable_fixture","historical_date_unresolved":true}'::jsonb
)
on conflict (source_ref, legacy_game_id) do update set
  occurred_at = excluded.occurred_at,
  time_label = excluded.time_label,
  side_a_label = excluded.side_a_label,
  side_b_label = excluded.side_b_label,
  score_a = excluded.score_a,
  score_b = excluded.score_b,
  winner_side = excluded.winner_side,
  source_metadata = excluded.source_metadata;

insert into public.historical_match_participants (
  historical_match_id,
  athlete_id,
  side
)
values
  ('91000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','A'),
  ('91000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','B')
on conflict (historical_match_id, athlete_id) do nothing;
