-- Canonical admin operation for linking an existing competition formation to a team.
-- A formation may exist independently; linking it creates season-scoped athlete memberships
-- for its members and affects only future registrations/matches through their frozen team snapshots.
-- Existing historical match/ranking snapshots are never rewritten by this operation.

create or replace function private.admin_link_competition_formation_team(
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
  v_formation public.competition_formations;
  v_team public.teams;
  v_season public.seasons;
  v_member record;
  v_existing public.team_memberships;
  v_before jsonb;
  v_after jsonb;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team linkage required' using errcode = '42501';
  end if;

  select * into v_formation
  from public.competition_formations
  where id = target_formation
  for update;

  if not found or v_formation.status <> 'active' then
    raise exception 'active competition formation required' using errcode = '23514';
  end if;

  select * into v_team
  from public.teams
  where id = target_team
  for update;

  if not found or v_team.status <> 'active' then
    raise exception 'active team required' using errcode = '23514';
  end if;

  select * into v_season
  from public.seasons
  where id = v_formation.season_id;

  if not found then
    raise exception 'formation season not found' using errcode = '23503';
  end if;

  if effective_at < v_season.starts_at or effective_at >= v_season.ends_at then
    raise exception 'team linkage effective date outside formation season' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.competition_formation_members
    where formation_id = v_formation.id
  ) then
    raise exception 'formation has no members' using errcode = '23514';
  end if;

  -- Never perform an implicit transfer. If a member already represents another
  -- team at the effective instant, an explicit transfer/termination operation is required.
  for v_member in
    select athlete_id
    from public.competition_formation_members
    where formation_id = v_formation.id
    order by position_order
  loop
    select * into v_existing
    from public.team_memberships tm
    where tm.athlete_id = v_member.athlete_id
      and tm.season_id = v_formation.season_id
      and tm.status = 'active'
      and tm.starts_at <= effective_at
      and (tm.ends_at is null or tm.ends_at > effective_at)
    order by tm.starts_at desc
    limit 1;

    if found and v_existing.team_id <> target_team then
      raise exception 'formation member already linked to another active team' using errcode = '23514';
    end if;

    if not found then
      insert into public.team_memberships(
        athlete_id,
        team_id,
        season_id,
        membership_type,
        starts_at,
        status,
        created_by
      ) values (
        v_member.athlete_id,
        target_team,
        v_formation.season_id,
        'athlete',
        effective_at,
        'active',
        auth.uid()
      );
    end if;
  end loop;

  v_before := to_jsonb(v_formation);

  update public.competition_formations
  set team_id = target_team,
      pole_id = coalesce(pole_id, v_team.primary_pole_id),
      updated_at = now()
  where id = v_formation.id
  returning * into v_formation;

  v_after := to_jsonb(v_formation);

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    auth.uid(),
    'competition_formation_team_linked',
    'competition_formation',
    v_formation.id,
    v_before,
    v_after,
    jsonb_build_object(
      'team_id', target_team,
      'season_id', v_formation.season_id,
      'effective_at', effective_at,
      'reason', reason
    )
  );

  return v_formation;
end;
$$;

revoke all on function private.admin_link_competition_formation_team(uuid, uuid, timestamptz, text)
from public, anon, authenticated;

grant execute on function private.admin_link_competition_formation_team(uuid, uuid, timestamptz, text)
to authenticated;

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
  select private.admin_link_competition_formation_team(
    target_formation,
    target_team,
    effective_at,
    reason
  )
$$;

revoke all on function public.admin_link_competition_formation_team(uuid, uuid, timestamptz, text)
from public, anon;

grant execute on function public.admin_link_competition_formation_team(uuid, uuid, timestamptz, text)
to authenticated;
