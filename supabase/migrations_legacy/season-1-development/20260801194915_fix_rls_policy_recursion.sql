-- Keep cross-entity authorization outside RLS expressions so policies never
-- recurse through one another. These helpers execute as their migration owner,
-- expose only booleans, and cannot be called by anon.
create or replace function private.is_active_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_memberships tm
    where tm.team_id = target_team_id
      and tm.athlete_id = private.current_athlete_id()
      and tm.status = 'active'
  )
$$;

create or replace function private.team_is_in_managed_pole(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team_id and private.manages_pole(t.primary_pole_id)
  )
$$;

create or replace function private.can_access_athlete(target_athlete_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or target_athlete_id = private.current_athlete_id()
    or exists (
      select 1 from public.team_memberships tm
      join public.teams t on t.id = tm.team_id
      where tm.athlete_id = target_athlete_id and tm.status = 'active'
        and (private.manages_team(tm.team_id) or private.manages_pole(t.primary_pole_id))
    )
$$;

create or replace function private.can_access_pole(target_pole_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(target_pole_id)
    or exists (
      select 1 from public.teams t
      where t.primary_pole_id = target_pole_id
        and (private.manages_team(t.id) or private.is_active_team_member(t.id))
    )
$$;

create or replace function private.can_access_roster(target_roster_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1 from public.team_rosters tr
      where tr.id = target_roster_id
        and (private.manages_team(tr.team_id)
          or private.team_is_in_managed_pole(tr.team_id)
          or private.is_active_team_member(tr.team_id))
    )
$$;

revoke all on function private.is_active_team_member(uuid) from public, anon;
revoke all on function private.team_is_in_managed_pole(uuid) from public, anon;
revoke all on function private.can_access_athlete(uuid) from public, anon;
revoke all on function private.can_access_pole(uuid) from public, anon;
revoke all on function private.can_access_roster(uuid) from public, anon;
grant execute on function private.is_active_team_member(uuid) to authenticated;
grant execute on function private.team_is_in_managed_pole(uuid) to authenticated;
grant execute on function private.can_access_athlete(uuid) to authenticated;
grant execute on function private.can_access_pole(uuid) to authenticated;
grant execute on function private.can_access_roster(uuid) to authenticated;

drop policy athletes_select on public.athletes;
create policy athletes_select on public.athletes for select to authenticated
using ((select private.can_access_athlete(id)));

drop policy poles_select on public.poles;
create policy poles_select on public.poles for select to authenticated
using ((select private.can_access_pole(id)));

drop policy venues_select on public.venues;
create policy venues_select on public.venues for select to authenticated
using ((select private.can_access_pole(pole_id)));

drop policy courts_select on public.courts;
create policy courts_select on public.courts for select to authenticated using (
  exists (select 1 from public.venues v where v.id = courts.venue_id
    and (select private.can_access_pole(v.pole_id)))
);

drop policy teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_pole(primary_pole_id))
  or (select private.manages_team(id))
  or (select private.is_active_team_member(id))
);

drop policy memberships_select on public.team_memberships;
create policy memberships_select on public.team_memberships for select to authenticated using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_team(team_id))
  or (select private.team_is_in_managed_pole(team_id))
);

drop policy levels_select on public.athlete_levels;
create policy levels_select on public.athlete_levels for select to authenticated
using ((select private.can_access_athlete(athlete_id)));

drop policy rosters_select on public.team_rosters;
create policy rosters_select on public.team_rosters for select to authenticated
using ((select private.can_access_roster(id)));

drop policy roster_members_select on public.team_roster_members;
create policy roster_members_select on public.team_roster_members for select to authenticated
using ((select private.can_access_roster(roster_id)));
