create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'
$$;

create or replace function private.has_any_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.current_app_role() = any(allowed)
$$;

create or replace function private.current_athlete_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.athletes a where a.profile_id = (select auth.uid())
$$;

create or replace function private.manages_pole(target_pole_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.access_assignments aa
    where aa.profile_id = (select auth.uid())
      and aa.role = 'pole_manager' and aa.scope_type = 'pole'
      and aa.pole_id = target_pole_id and aa.status = 'active'
      and aa.starts_at <= now() and (aa.ends_at is null or aa.ends_at > now())
  )
$$;

create or replace function private.manages_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.access_assignments aa
    where aa.profile_id = (select auth.uid())
      and aa.role = 'team_manager' and aa.scope_type = 'team'
      and aa.team_id = target_team_id and aa.status = 'active'
      and aa.starts_at <= now() and (aa.ends_at is null or aa.ends_at > now())
  )
$$;

revoke all on function private.current_app_role() from public, anon;
revoke all on function private.has_any_role(public.app_role[]) from public, anon;
revoke all on function private.current_athlete_id() from public, anon;
revoke all on function private.manages_pole(uuid) from public, anon;
revoke all on function private.manages_team(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.has_any_role(public.app_role[]) to authenticated;
grant execute on function private.current_athlete_id() to authenticated;
grant execute on function private.manages_pole(uuid) to authenticated;
grant execute on function private.manages_team(uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','athletes','seasons','poles','venues','courts','teams',
    'access_assignments','team_memberships','athlete_levels',
    'competitive_categories','competitive_formats','team_rosters',
    'team_roster_members','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.has_any_role(array['admin']::public.app_role[])));
create policy profiles_admin_insert on public.profiles for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy profiles_admin_update on public.profiles for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy athletes_select on public.athletes for select to authenticated using (
  profile_id = (select auth.uid())
  or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or exists (
    select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id
    where tm.athlete_id = athletes.id and tm.status = 'active'
      and ((select private.manages_team(tm.team_id)) or (select private.manages_pole(t.primary_pole_id)))
  )
);
create policy athletes_admin_insert on public.athletes for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy athletes_admin_update on public.athletes for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy athletes_admin_delete on public.athletes for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy seasons_select on public.seasons for select to authenticated
using ((select private.has_any_role(array['admin','operator','pole_manager','team_manager','athlete']::public.app_role[])));
create policy seasons_admin_all on public.seasons for all to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy categories_select on public.competitive_categories for select to authenticated using (status = 'active' or (select private.has_any_role(array['admin','operator']::public.app_role[])));
create policy categories_admin_all on public.competitive_categories for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy formats_select on public.competitive_formats for select to authenticated using (status = 'active' or (select private.has_any_role(array['admin','operator']::public.app_role[])));
create policy formats_admin_all on public.competitive_formats for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy poles_select on public.poles for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_pole(id))
  or exists (select 1 from public.teams t where t.primary_pole_id = poles.id and ((select private.manages_team(t.id)) or exists (select 1 from public.team_memberships tm where tm.team_id = t.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active')))
);
create policy poles_admin_all on public.poles for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy venues_select on public.venues for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_pole(pole_id)) or exists (select 1 from public.teams t where t.primary_pole_id = venues.pole_id and ((select private.manages_team(t.id)) or exists (select 1 from public.team_memberships tm where tm.team_id = t.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active'))));
create policy venues_admin_all on public.venues for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy courts_select on public.courts for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or exists (select 1 from public.venues v where v.id = courts.venue_id and ((select private.manages_pole(v.pole_id)) or exists (select 1 from public.teams t where t.primary_pole_id = v.pole_id and (select private.manages_team(t.id))))));
create policy courts_admin_all on public.courts for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy teams_select on public.teams for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_pole(primary_pole_id)) or (select private.manages_team(id))
  or exists (select 1 from public.team_memberships tm where tm.team_id = teams.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active')
);
create policy teams_admin_all on public.teams for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy assignments_select on public.access_assignments for select to authenticated using (profile_id = (select auth.uid()) or (select private.has_any_role(array['admin']::public.app_role[])));
create policy assignments_admin_all on public.access_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy memberships_select on public.team_memberships for select to authenticated using (
  athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_team(team_id)) or exists (select 1 from public.teams t where t.id = team_memberships.team_id and (select private.manages_pole(t.primary_pole_id)))
);
create policy memberships_admin_all on public.team_memberships for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy levels_select on public.athlete_levels for select to authenticated using (
  athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.athlete_id = athlete_levels.athlete_id and tm.status = 'active' and ((select private.manages_team(tm.team_id)) or (select private.manages_pole(t.primary_pole_id))))
);
create policy levels_admin_all on public.athlete_levels for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy rosters_select on public.team_rosters for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(team_id)) or exists (select 1 from public.teams t where t.id = team_rosters.team_id and (select private.manages_pole(t.primary_pole_id))) or exists (select 1 from public.team_roster_members trm where trm.roster_id = team_rosters.id and trm.athlete_id = (select private.current_athlete_id()) and trm.status = 'active'));
create policy rosters_admin_all on public.team_rosters for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy roster_members_select on public.team_roster_members for select to authenticated using (athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[])) or exists (select 1 from public.team_rosters tr join public.teams t on t.id = tr.team_id where tr.id = team_roster_members.roster_id and ((select private.manages_team(tr.team_id)) or (select private.manages_pole(t.primary_pole_id)))));
create policy roster_members_admin_all on public.team_roster_members for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy audit_admin_select on public.audit_logs for select to authenticated
using ((select private.has_any_role(array['admin','operator']::public.app_role[])));
