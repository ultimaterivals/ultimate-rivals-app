-- Development/test-only fixtures. Never use as production bootstrap data.
-- PROD rule: never run seeds with `supabase db push --include-seed` against PROD.

-- Development/test-only fixtures. Never use as production bootstrap data.
insert into public.seasons (
  id, name, code, starts_at, ends_at, ranking_cutoff_at, status
) values (
  '10000000-0000-4000-8000-000000000001',
  '[DEV] Temporada Teste 01',
  'dev-season-01',
  '2026-01-01 00:00:00+00',
  '2026-12-31 23:59:59+00',
  null,
  'draft'
) on conflict (code) do nothing;

insert into public.poles (id, name, slug, city, state, status) values
  ('20000000-0000-4000-8000-000000000001', '[DEV] Polo Teste BH', 'dev-polo-bh', 'Belo Horizonte', 'MG', 'draft'),
  ('20000000-0000-4000-8000-000000000002', '[DEV] Polo Teste Betim', 'dev-polo-betim', 'Betim', 'MG', 'draft'),
  ('20000000-0000-4000-8000-000000000003', '[DEV] Polo Teste Contagem', 'dev-polo-contagem', 'Contagem', 'MG', 'draft')
on conflict (slug) do nothing;

-- Source legacy fixture: 20260805175800_season_partner_market_views_seed_rls.sql
insert into public.market_partners (code, name, category, status, metadata)
values
  ('q1_hydration_partner', 'Parceiro DEV Hidratação', 'hydration', 'active', '{"fake_dev_seed":true}'::jsonb),
  ('q1_recovery_partner', 'Parceiro DEV Recovery', 'recovery', 'active', '{"fake_dev_seed":true}'::jsonb),
  ('q1_ur_merch', 'UR Merch DEV', 'ur_merch', 'active', '{"fake_dev_seed":true}'::jsonb)
on conflict (code) do update set name = excluded.name, category = excluded.category, status = excluded.status, metadata = excluded.metadata, updated_at = now();
insert into public.market_items (partner_id, code, name, category, item_type, description, status, metadata)
select mp.id, item.code, item.name, item.category::public.market_category, item.item_type::public.market_item_type, item.description, 'active'::public.entity_status, '{"fake_dev_seed":true}'::jsonb
from public.market_partners mp
join (
  values
    ('q1_hydration_partner', 'q1_water', 'Água / isotônico DEV', 'hydration', 'product', 'Item MVP para hidratação sem prescrição clínica.'),
    ('q1_hydration_partner', 'q1_snack', 'Barra/snack DEV', 'sports_food', 'product', 'Item MVP de alimento esportivo genérico.'),
    ('q1_recovery_partner', 'q1_recovery_service', 'Recovery parceiro DEV', 'recovery', 'service', 'Benefício operacional, sem prescrição médica.'),
    ('q1_ur_merch', 'q1_ur_shirt', 'Camisa UR DEV', 'ur_merch', 'product', 'Produto de merchandising UR.')
) as item(partner_code, code, name, category, item_type, description) on item.partner_code = mp.code
on conflict (code) do update set name = excluded.name, category = excluded.category, item_type = excluded.item_type, description = excluded.description, status = excluded.status, metadata = excluded.metadata, updated_at = now();
insert into public.market_offers (item_id, code, name, status, brl_amount, urc_amount, accepts_brl, accepts_urc, inventory_limit, per_athlete_limit, metadata)
select mi.id, offer.code, offer.name, 'active'::public.entity_status, offer.brl_amount, offer.urc_amount, offer.accepts_brl, offer.accepts_urc, offer.inventory_limit, 1, '{"fake_dev_seed":true}'::jsonb
from public.market_items mi
join (
  values
    ('q1_water', 'q1_water_brl', 'Água/isotônico BRL DEV', 8.00::numeric, null::integer, true, false, 100::integer),
    ('q1_snack', 'q1_snack_brl', 'Snack BRL DEV', 12.00::numeric, null::integer, true, false, 80::integer),
    ('q1_recovery_service', 'q1_recovery_brl', 'Recovery BRL DEV', 50.00::numeric, null::integer, true, false, 20::integer),
    ('q1_ur_shirt', 'q1_ur_shirt_brl', 'Camisa UR BRL DEV', 79.90::numeric, null::integer, true, false, 30::integer)
) as offer(item_code, code, name, brl_amount, urc_amount, accepts_brl, accepts_urc, inventory_limit) on offer.item_code = mi.code
on conflict (code) do update set name = excluded.name, brl_amount = excluded.brl_amount, urc_amount = excluded.urc_amount, accepts_brl = excluded.accepts_brl, accepts_urc = excluded.accepts_urc, inventory_limit = excluded.inventory_limit, metadata = excluded.metadata, updated_at = now();

-- Source legacy fixture: 20260805184816_seed_public_calendar_dev_events.sql
insert into public.calendar_events (
  id,
  season_id,
  season_cycle_id,
  pole_id,
  venue_id,
  event_type,
  name,
  status,
  competition_mode,
  starts_at,
  ends_at,
  timezone,
  capacity,
  court_count_target,
  notes,
  source,
  created_by,
  updated_by
)
select
  item.id::uuid,
  s.id,
  sc.id,
  p.id,
  v.id,
  item.event_type::public.calendar_event_type,
  item.name,
  item.status::public.calendar_event_status,
  item.competition_mode,
  item.starts_at::timestamptz,
  item.ends_at::timestamptz,
  'America/Sao_Paulo',
  item.capacity,
  item.court_count_target,
  'DEV fixture ficticia para experiencia publica. Nao usar dados reais.',
  item.source,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid
from (
  values
    (
      '71000000-0000-4000-8000-000000000001',
      'UR Play DEV Publico',
      'ur_play',
      'published',
      'rotation',
      '2026-08-08 18:00:00-03',
      '2026-08-08 21:00:00-03',
      32,
      2,
      'ur_play'
    ),
    (
      '71000000-0000-4000-8000-000000000002',
      'Treino DEV Fundamentos',
      'training',
      'published',
      null,
      '2026-08-10 19:00:00-03',
      '2026-08-10 20:30:00-03',
      18,
      1,
      'training'
    ),
    (
      '71000000-0000-4000-8000-000000000003',
      'UR Series DEV Rodada Aberta',
      'series',
      'registration_open',
      'tournament',
      '2026-08-15 09:00:00-03',
      '2026-08-15 15:00:00-03',
      48,
      3,
      'tournament'
    )
) as item(
  id,
  name,
  event_type,
  status,
  competition_mode,
  starts_at,
  ends_at,
  capacity,
  court_count_target,
  source
)
cross join lateral (
  select id from public.seasons order by starts_at desc limit 1
) s
left join lateral (
  select id from public.season_cycles where season_id = s.id order by cycle_number limit 1
) sc on true
cross join lateral (
  select id from public.poles where status = 'active' order by name limit 1
) p
left join lateral (
  select id from public.venues where status = 'active' and pole_id = p.id order by name limit 1
) v on true
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  updated_by = excluded.updated_by,
  updated_at = now();

-- Source legacy fixture: 20260805184934_fix_public_calendar_fixture_window.sql
update public.calendar_events
set
  starts_at = case id
    when '71000000-0000-4000-8000-000000000001'::uuid then date_trunc('day', now()) + interval '3 days 18 hours'
    when '71000000-0000-4000-8000-000000000002'::uuid then date_trunc('day', now()) + interval '5 days 19 hours'
    when '71000000-0000-4000-8000-000000000003'::uuid then date_trunc('day', now()) + interval '10 days 9 hours'
    else starts_at
  end,
  ends_at = case id
    when '71000000-0000-4000-8000-000000000001'::uuid then date_trunc('day', now()) + interval '3 days 21 hours'
    when '71000000-0000-4000-8000-000000000002'::uuid then date_trunc('day', now()) + interval '5 days 20 hours 30 minutes'
    when '71000000-0000-4000-8000-000000000003'::uuid then date_trunc('day', now()) + interval '10 days 15 hours'
    else ends_at
  end,
  updated_at = now()
where id in (
  '71000000-0000-4000-8000-000000000001'::uuid,
  '71000000-0000-4000-8000-000000000002'::uuid,
  '71000000-0000-4000-8000-000000000003'::uuid
);

-- Source legacy fixture: 20260805185130_seed_public_calendar_any_dev_pole.sql
insert into public.calendar_events (
  id,
  season_id,
  season_cycle_id,
  pole_id,
  venue_id,
  event_type,
  name,
  status,
  competition_mode,
  starts_at,
  ends_at,
  timezone,
  capacity,
  court_count_target,
  notes,
  source,
  created_by,
  updated_by
)
select
  item.id::uuid,
  s.id,
  sc.id,
  p.id,
  v.id,
  item.event_type::public.calendar_event_type,
  item.name,
  item.status::public.calendar_event_status,
  item.competition_mode,
  date_trunc('day', now()) + item.start_offset,
  date_trunc('day', now()) + item.end_offset,
  'America/Sao_Paulo',
  item.capacity,
  item.court_count_target,
  'DEV fixture ficticia para experiencia publica. Nao usar dados reais.',
  item.source,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid
from (
  values
    (
      '71000000-0000-4000-8000-000000000001',
      'UR Play DEV Publico',
      'ur_play',
      'published',
      'rotation',
      interval '3 days 18 hours',
      interval '3 days 21 hours',
      32,
      2,
      'ur_play'
    ),
    (
      '71000000-0000-4000-8000-000000000002',
      'Treino DEV Fundamentos',
      'training',
      'published',
      null,
      interval '5 days 19 hours',
      interval '5 days 20 hours 30 minutes',
      18,
      1,
      'training'
    ),
    (
      '71000000-0000-4000-8000-000000000003',
      'UR Series DEV Rodada Aberta',
      'series',
      'registration_open',
      'tournament',
      interval '10 days 9 hours',
      interval '10 days 15 hours',
      48,
      3,
      'tournament'
    )
) as item(
  id,
  name,
  event_type,
  status,
  competition_mode,
  start_offset,
  end_offset,
  capacity,
  court_count_target,
  source
)
cross join lateral (
  select id from public.seasons order by starts_at desc limit 1
) s
left join lateral (
  select id from public.season_cycles where season_id = s.id order by cycle_number limit 1
) sc on true
cross join lateral (
  select id from public.poles order by name limit 1
) p
left join lateral (
  select id from public.venues where pole_id = p.id order by name limit 1
) v on true
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  updated_by = excluded.updated_by,
  updated_at = now();

