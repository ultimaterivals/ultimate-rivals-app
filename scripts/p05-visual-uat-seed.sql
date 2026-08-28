-- P05 ephemeral visual fixture only.
-- Loaded exclusively by the disposable GitHub Actions Supabase stack.

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
values
  (
    '81000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'qa:p05:historical:1',
    'qa:p05:historical:1',
    9001,
    '2026-02-10 22:00:00+00',
    null,
    '[QA] Athlete A / [QA] Athlete C',
    '[QA] Athlete B / [QA] Rival D',
    11,
    8,
    'A',
    '{"seed":"p05_visual_uat"}'::jsonb
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'qa:p05:historical:2',
    'qa:p05:historical:2',
    9002,
    null,
    null,
    '[QA] Athlete A / [QA] Athlete C',
    '[QA] Athlete B / [QA] Rival E',
    9,
    11,
    'B',
    '{"seed":"p05_visual_uat","date":"unknown"}'::jsonb
  )
on conflict (id) do update set
  occurred_at = excluded.occurred_at,
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
  ('81000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','A'),
  ('81000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','A'),
  ('81000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','B'),
  ('81000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','A'),
  ('81000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000003','A'),
  ('81000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','B')
on conflict (historical_match_id, athlete_id) do nothing;
