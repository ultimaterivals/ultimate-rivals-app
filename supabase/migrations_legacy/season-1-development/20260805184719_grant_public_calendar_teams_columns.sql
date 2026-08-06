-- Minimal anon grants for public calendar/team read models.
-- Column-level grants avoid exposing operational/private fields through PostgREST.

create policy calendar_events_public_select
  on public.calendar_events
  for select
  to anon
  using (
    status in ('planned','published','registration_open','in_progress','completed')
    and ends_at >= now() - interval '30 days'
  );

create policy teams_public_select
  on public.teams
  for select
  to anon
  using (status = 'active');

create policy poles_public_select
  on public.poles
  for select
  to anon
  using (status = 'active');

create policy venues_public_select
  on public.venues
  for select
  to anon
  using (status = 'active');

grant select (
  id,
  name,
  event_type,
  status,
  starts_at,
  ends_at,
  competition_mode,
  capacity,
  court_count_target,
  pole_id,
  venue_id
) on public.calendar_events to anon;

grant select (id, name, status) on public.poles to anon;
grant select (id, name, status) on public.venues to anon;

grant select (
  id,
  name,
  slug,
  short_name,
  logo_url,
  description,
  status,
  primary_pole_id
) on public.teams to anon;
