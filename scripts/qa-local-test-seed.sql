-- Ephemeral QA-only seed for GitHub Actions Supabase local stack.
-- Never run against DEV, PROD, or any hosted project.

\set ON_ERROR_STOP on

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change
)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','operator@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000003','authenticated','authenticated','polemanager@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000004','authenticated','authenticated','teammanager@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000005','authenticated','authenticated','athlete@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000006','authenticated','authenticated','athlete2@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','')
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change_token_current = excluded.email_change_token_current,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  now(),
  now(),
  now()
from auth.users
where email like '%@test.ur.local'
on conflict (provider, provider_id) do update set updated_at = now();

insert into public.profiles (id, display_name, role, status)
values
  ('a0000000-0000-4000-8000-000000000001','[QA] Admin','admin','active'),
  ('a0000000-0000-4000-8000-000000000002','[QA] Operator','operator','active'),
  ('a0000000-0000-4000-8000-000000000003','[QA] Pole Manager','pole_manager','active'),
  ('a0000000-0000-4000-8000-000000000004','[QA] Team Manager','team_manager','active'),
  ('a0000000-0000-4000-8000-000000000005','[QA] Athlete A','athlete','active'),
  ('a0000000-0000-4000-8000-000000000006','[QA] Athlete B','athlete','active')
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.seasons (
  id,
  name,
  code,
  starts_at,
  ends_at,
  ranking_cutoff_at,
  status
)
values (
  '10000000-0000-4000-8000-000000000001',
  '[QA] Season 1',
  'qa-season-1',
  '2026-01-01 00:00:00+00',
  '2026-12-31 23:59:59+00',
  '2026-12-31 23:59:59+00',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  ranking_cutoff_at = excluded.ranking_cutoff_at,
  status = excluded.status,
  updated_at = now();

insert into public.poles (id, name, slug, city, state, status)
values
  ('20000000-0000-4000-8000-000000000001','[QA] Polo A','qa-polo-a','Belo Horizonte','MG','active'),
  ('20000000-0000-4000-8000-000000000002','[QA] Polo B','qa-polo-b','Contagem','MG','active')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.teams (id, name, slug, short_name, status, primary_pole_id)
values
  ('c0000000-0000-4000-8000-000000000001','[QA] Team A','qa-team-a','QAA','active','20000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002','[QA] Team B','qa-team-b','QAB','active','20000000-0000-4000-8000-000000000002')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.athletes (
  id,
  profile_id,
  public_name,
  full_name,
  birth_date,
  gender,
  dominant_hand,
  status
)
values
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000005','[QA] Athlete A','QA Athlete A','2000-01-01','undisclosed','right','active'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000006','[QA] Athlete B','QA Athlete B','2000-01-02','undisclosed','right','active')
on conflict (id) do update set
  public_name = excluded.public_name,
  full_name = excluded.full_name,
  status = excluded.status,
  updated_at = now();

insert into public.access_assignments (
  profile_id,
  role,
  scope_type,
  pole_id,
  team_id,
  starts_at,
  status,
  created_by
)
values
  ('a0000000-0000-4000-8000-000000000003','pole_manager','pole','20000000-0000-4000-8000-000000000001',null,now(),'active','a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004','team_manager','team',null,'c0000000-0000-4000-8000-000000000001',now(),'active','a0000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.team_memberships (
  athlete_id,
  team_id,
  season_id,
  membership_type,
  starts_at,
  status,
  created_by
)
values
  ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','athlete',now(),'active','a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','athlete',now(),'active','a0000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.athlete_levels (
  athlete_id,
  season_id,
  level,
  status,
  starts_at,
  assigned_by,
  reason
)
values
  ('b0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','n2','active',now(),'a0000000-0000-4000-8000-000000000001','[QA] baseline level'),
  ('b0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','n2','active',now(),'a0000000-0000-4000-8000-000000000001','[QA] baseline level')
on conflict do nothing;

insert into public.notifications (
  athlete_id,
  notification_type,
  title,
  body,
  action_href,
  source_type,
  idempotency_key
)
values (
  'b0000000-0000-4000-8000-000000000001',
  'ranking_movement',
  '[QA] Ranking atualizado',
  'Sua posição competitiva foi atualizada no ambiente efêmero.',
  '/athlete/ranking',
  'qa_seed',
  'qa_seed:notification:athlete_a'
) on conflict (idempotency_key) do nothing;
