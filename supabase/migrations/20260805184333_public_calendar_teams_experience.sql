-- Season 1 public experience: calendar and teams read models.

create or replace view public.public_calendar_events
with (security_invoker = true)
as
select
  ce.id,
  ce.name,
  ce.event_type,
  ce.status,
  ce.starts_at,
  ce.ends_at,
  ce.competition_mode,
  ce.capacity,
  ce.court_count_target,
  p.name as pole_name,
  v.name as venue_name
from public.calendar_events ce
left join public.poles p on p.id = ce.pole_id
left join public.venues v on v.id = ce.venue_id
where ce.status in ('planned','published','registration_open','in_progress','completed')
  and ce.ends_at >= now() - interval '30 days';

create or replace view public.public_teams
with (security_invoker = true)
as
select
  t.id,
  t.name,
  t.slug,
  t.short_name,
  t.logo_url,
  t.description,
  t.status,
  p.name as pole_name,
  pr.current_position as pole_ranking_position,
  tr.current_position as team_ranking_position,
  tr.total_points as team_ranking_points
from public.teams t
left join public.poles p on p.id = t.primary_pole_id
left join public.public_rankings pr
  on pr.ranking_type = 'pole'
  and pr.entity_id = t.primary_pole_id
  and pr.cycle_id is null
left join public.public_rankings tr
  on tr.ranking_type = 'team'
  and tr.entity_id = t.id
  and tr.cycle_id is null
where t.status = 'active';

grant select on public.public_calendar_events, public.public_teams to anon, authenticated;
