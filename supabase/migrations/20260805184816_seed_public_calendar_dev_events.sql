-- DEV-only fictitious public calendar fixtures for the Season 1 public experience.

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
