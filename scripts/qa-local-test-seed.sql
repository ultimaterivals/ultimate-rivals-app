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
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','operator@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000003','authenticated','authenticated','polemanager@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000004','authenticated','authenticated','teammanager@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000005','authenticated','authenticated','athlete@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000006','authenticated','authenticated','athlete2@test.ur.local',crypt(:'test_password', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','','','')
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
  ('20000000-0000-4000-8000-000000000001','[QA] Betim Polo A','dev-polo-bh','Belo Horizonte','MG','active'),
  ('20000000-0000-4000-8000-000000000002','[QA] Contagem Polo B','dev-polo-contagem','Contagem','MG','active')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  updated_at = now();

insert into public.venues (id, name, pole_id, city, state, status)
values
  ('30000000-0000-4000-8000-000000000001','[QA] Arena Betim','20000000-0000-4000-8000-000000000001','Belo Horizonte','MG','active'),
  ('30000000-0000-4000-8000-000000000002','[QA] Arena Contagem','20000000-0000-4000-8000-000000000002','Contagem','MG','active')
on conflict (id) do update set
  name = excluded.name,
  pole_id = excluded.pole_id,
  status = excluded.status,
  updated_at = now();

insert into public.calendar_q1_templates (
  pole_id,
  name,
  weekday,
  starts_at,
  ends_at,
  event_type,
  competition_mode,
  target_courts,
  alternates_friday,
  notes
)
select p.id, template.name, template.weekday, template.starts_at::time, template.ends_at::time,
  'ur_play'::public.calendar_event_type, 'scheduled_rounds', 1, template.alternates_friday,
  '[QA] Ephemeral Q1 template'
from public.poles p
join (
  values
    ('Betim', 'Betim segunda 18h', 1, '18:00', '20:00', false),
    ('Betim', 'Betim segunda 20h', 1, '20:00', '22:00', false),
    ('Betim', 'Betim terça 18h', 2, '18:00', '20:00', false),
    ('Betim', 'Betim terça 20h', 2, '20:00', '22:00', false),
    ('Contagem', 'Contagem quarta 18h', 3, '18:00', '20:00', false),
    ('Contagem', 'Contagem quarta 20h', 3, '20:00', '22:00', false),
    ('Contagem', 'Contagem quinta 18h', 4, '18:00', '20:00', false),
    ('Contagem', 'Contagem quinta 20h', 4, '20:00', '22:00', false),
    ('Betim', 'Sexta alternada Betim 18h', 5, '18:00', '20:00', true),
    ('Betim', 'Sexta alternada Betim 20h', 5, '20:00', '22:00', true),
    ('Contagem', 'Sexta alternada Contagem 18h', 5, '18:00', '20:00', true),
    ('Contagem', 'Sexta alternada Contagem 20h', 5, '20:00', '22:00', true)
) as template(pole_name, name, weekday, starts_at, ends_at, alternates_friday)
  on p.name like '%' || template.pole_name || '%'
on conflict (pole_id, weekday, starts_at, ends_at, event_type) do nothing;

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
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000005','[QA] Athlete A','QA Athlete A','2000-01-01','male','right','active'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000006','[QA] Athlete B','QA Athlete B','2000-01-02','female','right','active'),
  ('b0000000-0000-4000-8000-000000000003',null,'[QA] Athlete C','QA Athlete C','2000-01-03','female','right','active')
on conflict (id) do update set
  public_name = excluded.public_name,
  full_name = excluded.full_name,
  gender = excluded.gender,
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
  ('b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','athlete',now(),'active','a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','athlete',now(),'active','a0000000-0000-4000-8000-000000000001')
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
  ('b0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','n2','active',now(),'a0000000-0000-4000-8000-000000000001','[QA] baseline level'),
  ('b0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','n2','active',now(),'a0000000-0000-4000-8000-000000000001','[QA] baseline level')
on conflict do nothing;

with refs as (
  select
    (select id from public.competitive_categories where code = 'mixed') as mixed_category_id,
    (select id from public.competitive_formats where code = 'doubles') as doubles_format_id
)
insert into public.team_rosters (id, team_id, season_id, category_id, format_id, level, name, status)
select roster.id::uuid, roster.team_id::uuid, '10000000-0000-4000-8000-000000000001'::uuid,
  refs.mixed_category_id, refs.doubles_format_id, 'n2'::public.athlete_level, roster.name, 'active'::public.roster_status
from refs
cross join (
  values
    ('11000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','[QA] Team A Mixed Doubles'),
    ('11000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','[QA] Team B Mixed Doubles')
) as roster(id, team_id, name)
on conflict (id) do update set
  team_id = excluded.team_id,
  season_id = excluded.season_id,
  category_id = excluded.category_id,
  format_id = excluded.format_id,
  level = excluded.level,
  status = excluded.status,
  updated_at = now();

insert into public.team_roster_members (roster_id, athlete_id, role, status, joined_at)
values
  ('11000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','starter','active',now()),
  ('11000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','starter','active',now())
on conflict (roster_id, athlete_id) do nothing;

with partner as (
  insert into public.market_partners (id, code, name, category, status)
  values ('41000000-0000-4000-8000-000000000001','qa_market_partner','[QA] Market Partner','recovery','active')
  on conflict (code) do update set name = excluded.name, category = excluded.category, status = excluded.status, updated_at = now()
  returning id
), items as (
  insert into public.market_items (code, name, category, item_type, status, partner_id)
  select item.code, item.name, item.category::public.market_category, item.item_type::public.market_item_type, 'active', partner.id
  from partner
  cross join (
    values
      ('q1_recovery_item','Q1 Recovery','recovery','service'),
      ('q1_snack_item','Q1 Snack','food_partner','product'),
      ('q1_ur_shirt_item','Q1 UR Shirt','ur_merch','product'),
      ('q1_water_item','Q1 Water','hydration','product')
  ) as item(code, name, category, item_type)
  on conflict (code) do update set name = excluded.name, category = excluded.category, item_type = excluded.item_type, status = excluded.status, partner_id = excluded.partner_id, updated_at = now()
  returning id, code
)
insert into public.market_offers (item_id, code, name, status, brl_amount, accepts_brl, accepts_urc, starts_at)
select items.id, offer.code, offer.name, 'active', offer.amount, true, false, '2026-01-01 00:00:00+00'::timestamptz
from items
join (
  values
    ('q1_recovery_item','q1_recovery_brl','Q1 Recovery BRL',45.00::numeric),
    ('q1_snack_item','q1_snack_brl','Q1 Snack BRL',18.00::numeric),
    ('q1_ur_shirt_item','q1_ur_shirt_brl','Q1 UR Shirt BRL',89.00::numeric),
    ('q1_water_item','q1_water_brl','Q1 Water BRL',8.00::numeric)
) as offer(item_code, code, name, amount) on offer.item_code = items.code
on conflict (code) do update set
  name = excluded.name,
  status = excluded.status,
  brl_amount = excluded.brl_amount,
  accepts_brl = excluded.accepts_brl,
  accepts_urc = excluded.accepts_urc,
  updated_at = now();

insert into public.ranking_processing_runs (
  id,
  source_type,
  source_id,
  status,
  transaction_count,
  client_operation_id,
  created_by,
  metadata
)
values (
  '51000000-0000-4000-8000-000000000001',
  'ranking_transaction',
  '51000000-0000-4000-8000-000000000001',
  'pending',
  4,
  '51000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"seed":"athlete_app_feature_qa"}'::jsonb
)
on conflict (id) do update set
  status = 'pending',
  completed_at = null,
  transaction_count = excluded.transaction_count,
  metadata = excluded.metadata;

with cycle as (
  select id from public.season_cycles
  where season_id = '10000000-0000-4000-8000-000000000001'
  order by cycle_number
  limit 1
), win_rule as (
  select id, version from public.ranking_rules
  where rule_code = 'WIN' and event_context = 'ur_play' and active
  order by version desc
  limit 1
)
insert into public.ranking_transactions (
  season_id,
  season_cycle_id,
  athlete_id,
  team_id,
  pole_id,
  roster_id,
  source_type,
  source_id,
  rule_id,
  rule_code,
  rule_version,
  points,
  points_applied,
  transaction_type,
  transaction_scope,
  status,
  event_context,
  processing_run_id,
  created_by,
  homologated_at,
  homologated_by,
  client_operation_id
)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  case when tx.include_cycle then cycle.id else null end,
  tx.athlete_id::uuid,
  tx.team_id::uuid,
  tx.pole_id::uuid,
  tx.roster_id::uuid,
  'ranking_transaction'::public.ranking_source_type,
  tx.source_id::uuid,
  win_rule.id,
  'WIN',
  win_rule.version,
  tx.points,
  tx.points,
  'earn'::public.ranking_transaction_type,
  'athlete'::public.ranking_transaction_scope,
  'homologated'::public.ranking_transaction_status,
  'ur_play'::public.match_event_context,
  '51000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  now(),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  tx.operation_id::uuid
from cycle
cross join win_rule
cross join (
  values
    ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000101','51000000-0000-4000-8000-000000000201',20,true),
    ('b0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000102','51000000-0000-4000-8000-000000000202',12,true),
    ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000103','51000000-0000-4000-8000-000000000203',6,false),
    ('b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',null,'51000000-0000-4000-8000-000000000104','51000000-0000-4000-8000-000000000204',4,false)
) as tx(athlete_id, team_id, pole_id, roster_id, source_id, operation_id, points, include_cycle)
on conflict do nothing;

update public.ranking_processing_runs
set status = 'completed',
  completed_at = now(),
  transaction_count = (
    select count(*) from public.ranking_transactions
    where processing_run_id = '51000000-0000-4000-8000-000000000001'
  )
where id = '51000000-0000-4000-8000-000000000001';

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
