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
  ('91000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','A'),
  ('91000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','B')
on conflict (historical_match_id, athlete_id) do nothing;

-- Dedicated dual-capability account. Keep the existing admin fixture unchanged.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change
)
select instance_id, 'a0000000-0000-4000-8000-000000000007'::uuid,
  aud, role, 'admin-athlete@test.ur.local', encrypted_password, email_confirmed_at,
  now(), now(), raw_app_meta_data, '{}'::jsonb, false, '', '', '', '', '', ''
from auth.users where email = 'admin@test.ur.local'
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at)
select id, id, jsonb_build_object('sub',id::text,'email',email), 'email', id::text,
  now(), now(), now()
from auth.users where email = 'admin-athlete@test.ur.local'
on conflict (provider, provider_id) do nothing;

insert into public.profiles (id, display_name, role, status)
values ('a0000000-0000-4000-8000-000000000007','[QA] Admin Athlete','admin','active')
on conflict (id) do update set role=excluded.role, status=excluded.status;

insert into public.athletes (id, profile_id, public_name, full_name,
  birth_date, gender, dominant_hand, status)
values ('b0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007',
  '[QA] Admin Athlete','QA Admin Athlete','2000-01-07','male','right','active')
on conflict (id) do nothing;
