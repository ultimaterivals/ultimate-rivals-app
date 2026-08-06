-- Season 1 completion — staff/refereeing read models.

create or replace view public.admin_staff_directory
with (security_invoker = true)
as
select
  spr.id,
  spr.profile_id,
  p.display_name,
  spr.role,
  src.label,
  src.category,
  src.formal_officiating,
  spr.pole_id,
  poles.name as pole_name,
  spr.status,
  spr.assigned_at
from public.staff_profile_roles spr
join public.staff_role_catalog src on src.role = spr.role
join public.profiles p on p.id = spr.profile_id
left join public.poles on poles.id = spr.pole_id;

create or replace view public.match_officiating_operations
with (security_invoker = true)
as
select
  m.id as match_id,
  m.match_code,
  m.status as match_status,
  m.session_id,
  m.court_id,
  c.name as court_name,
  moa.profile_id,
  p.display_name,
  moa.role,
  moa.status as assignment_status,
  moa.starts_at,
  moa.ends_at,
  case when tm.id is null then 'ur_play' else 'tournament' end as match_scope
from public.matches m
left join public.match_official_assignments moa on moa.match_id = m.id
left join public.profiles p on p.id = moa.profile_id
left join public.courts c on c.id = m.court_id
left join public.tournament_matches tm on tm.match_id = m.id;
