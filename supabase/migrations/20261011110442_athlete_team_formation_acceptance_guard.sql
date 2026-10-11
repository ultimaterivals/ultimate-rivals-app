-- Linking a formation can no longer silently create team memberships.
-- Lock each accepted membership until the original linkage function completes.
revoke execute on function private.admin_link_competition_formation_team(
  uuid, uuid, timestamptz, text
) from authenticated;

create function private.admin_link_competition_formation_team_after_acceptance(
  target_formation uuid,
  target_team uuid,
  effective_at timestamptz default now(),
  reason text default null
)
returns public.competition_formations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_member record;
begin
  if auth.uid() is null
    or not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team linkage required' using errcode = '42501';
  end if;

  select season_id into v_season_id
  from public.competition_formations
  where id = target_formation
  for update;
  if not found then
    raise exception 'formation not found' using errcode = '23503';
  end if;

  for v_member in
    select athlete_id from public.competition_formation_members
    where formation_id = target_formation
  loop
    perform 1 from public.team_memberships m
    where m.athlete_id = v_member.athlete_id
      and m.team_id = target_team
      and m.season_id = v_season_id
      and m.status = 'active'
      and m.starts_at <= effective_at
      and (m.ends_at is null or m.ends_at > effective_at)
    for share;
    if not found then
      raise exception 'every formation member must accept a team invitation first'
        using errcode = '23514';
    end if;
  end loop;

  return private.admin_link_competition_formation_team(
    target_formation, target_team, effective_at, reason
  );
end;
$$;

revoke all on function private.admin_link_competition_formation_team_after_acceptance(
  uuid, uuid, timestamptz, text
) from public, anon, authenticated;
grant execute on function private.admin_link_competition_formation_team_after_acceptance(
  uuid, uuid, timestamptz, text
) to authenticated;

create or replace function public.admin_link_competition_formation_team(
  target_formation uuid,
  target_team uuid,
  effective_at timestamptz default now(),
  reason text default null
)
returns public.competition_formations
language sql
security invoker
set search_path = ''
as $$
  select private.admin_link_competition_formation_team_after_acceptance(
    target_formation, target_team, effective_at, reason
  )
$$;

revoke all on function public.admin_link_competition_formation_team(
  uuid, uuid, timestamptz, text
) from public, anon;
grant execute on function public.admin_link_competition_formation_team(
  uuid, uuid, timestamptz, text
) to authenticated;
