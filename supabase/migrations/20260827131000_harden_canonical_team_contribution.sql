-- Canonical team contribution hardening.
-- Teams aggregate evidenced competition formations; attribution is frozen at the
-- competitive event instant and never inferred from a later team change.
-- Composition limits are data parameters, not UI constants.

create table public.team_competition_parameters (
  format_code text primary key,
  max_formations_per_team_category integer check (
    max_formations_per_team_category is null or max_formations_per_team_category > 0
  ),
  required_starters integer not null check (required_starters > 0),
  max_reserves integer not null check (max_reserves >= 0),
  updated_at timestamptz not null default now()
);

insert into public.team_competition_parameters(
  format_code,
  max_formations_per_team_category,
  required_starters,
  max_reserves
) values
  ('doubles', 5, 2, 0),
  ('fours', null, 4, 3)
on conflict (format_code) do nothing;

alter table public.team_competition_parameters enable row level security;
alter table public.team_competition_parameters force row level security;

revoke all on public.team_competition_parameters from anon, authenticated;
grant select on public.team_competition_parameters to authenticated;
grant all on public.team_competition_parameters to service_role;

create policy team_competition_parameters_select
on public.team_competition_parameters
for select to authenticated
using (true);

create trigger team_competition_parameters_updated_at
before update on public.team_competition_parameters
for each row execute function private.set_updated_at();

create or replace function private.enforce_roster_member_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid := coalesce(new.roster_id, old.roster_id);
  format_code text;
  active_count integer;
  starters integer;
  reserves integer;
  params public.team_competition_parameters;
begin
  select f.code
    into format_code
  from public.team_rosters r
  join public.competitive_formats f on f.id = r.format_id
  where r.id = rid;

  if format_code is null then
    raise exception 'roster format not found' using errcode = '23503';
  end if;

  select *
    into params
  from public.team_competition_parameters p
  where p.format_code = format_code;

  if not found then
    raise exception 'team composition parameters missing for format %', format_code
      using errcode = '23514';
  end if;

  select
    count(*),
    count(*) filter (where role in ('starter', 'captain')),
    count(*) filter (where role = 'reserve')
  into active_count, starters, reserves
  from public.team_roster_members
  where roster_id = rid
    and status = 'active';

  if active_count > params.required_starters + params.max_reserves
    or starters > params.required_starters
    or reserves > params.max_reserves then
    raise exception 'invalid % composition', format_code using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.validate_roster_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  format_code text;
  active_count integer;
  starters integer;
  reserves integer;
  params public.team_competition_parameters;
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    select code into format_code
    from public.competitive_formats
    where id = new.format_id;

    select * into params
    from public.team_competition_parameters p
    where p.format_code = format_code;

    if not found then
      raise exception 'team composition parameters missing for format %', format_code
        using errcode = '23514';
    end if;

    select
      count(*),
      count(*) filter (where role in ('starter', 'captain')),
      count(*) filter (where role = 'reserve')
    into active_count, starters, reserves
    from public.team_roster_members
    where roster_id = new.id
      and status = 'active';

    if starters <> params.required_starters
      or reserves > params.max_reserves
      or active_count <> starters + reserves then
      raise exception 'invalid active % composition', format_code
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_doubles_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
  total integer;
  max_formations integer;
begin
  select f.code into code
  from public.competitive_formats f
  where f.id = new.format_id;

  if new.level = 'leveling' then
    raise exception 'leveling cannot form competitive roster' using errcode = '23514';
  end if;

  select p.max_formations_per_team_category
    into max_formations
  from public.team_competition_parameters p
  where p.format_code = code;

  if not found then
    raise exception 'team composition parameters missing for format %', code
      using errcode = '23514';
  end if;

  if max_formations is not null then
    select count(*) into total
    from public.team_rosters r
    where r.team_id = new.team_id
      and r.season_id = new.season_id
      and r.category_id = new.category_id
      and r.format_id = new.format_id
      and r.status <> 'archived'
      and r.id <> new.id;

    if total >= max_formations then
      raise exception 'maximum % % formations per team/category/season', max_formations, code
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

-- Linking a canonical formation requires explicit evidence and respects the same
-- parameter used by roster guardrails. It never manufactures a team.
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
  v_format_code text;
  v_max_formations integer;
  v_current_formations integer;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team linkage required' using errcode = '42501';
  end if;

  if reason is null or length(btrim(reason)) < 4 then
    raise exception 'team linkage evidence required' using errcode = '23514';
  end if;

  select * into v_formation
  from public.competition_formations
  where id = target_formation
  for update;

  if not found or v_formation.status <> 'active' then
    raise exception 'active competition formation required' using errcode = '23514';
  end if;

  if v_formation.team_id is not null and v_formation.team_id <> target_team then
    raise exception 'explicit formation transfer required' using errcode = '23514';
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

  select f.code into v_format_code
  from public.competitive_formats f
  where f.id = v_formation.format_id;

  select p.max_formations_per_team_category
    into v_max_formations
  from public.team_competition_parameters p
  where p.format_code = v_format_code;

  if not found then
    raise exception 'team composition parameters missing for format %', v_format_code
      using errcode = '23514';
  end if;

  if v_max_formations is not null and v_formation.team_id is null then
    select count(*)::integer into v_current_formations
    from public.competition_formations cf
    where cf.team_id = target_team
      and cf.season_id = v_formation.season_id
      and cf.format_id = v_formation.format_id
      and cf.category_id is not distinct from v_formation.category_id
      and cf.status = 'active'
      and cf.id <> v_formation.id;

    if v_current_formations >= v_max_formations then
      raise exception 'maximum % % formations per team/category/season',
        v_max_formations, v_format_code using errcode = '23514';
    end if;
  end if;

  if not exists (
    select 1 from public.competition_formation_members
    where formation_id = v_formation.id
  ) then
    raise exception 'formation has no members' using errcode = '23514';
  end if;

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
      raise exception 'formation member already linked to another active team'
        using errcode = '23514';
    end if;

    if not found then
      insert into public.team_memberships(
        athlete_id, team_id, season_id, membership_type, starts_at, status, created_by
      ) values (
        v_member.athlete_id, target_team, v_formation.season_id,
        'athlete', effective_at, 'active', auth.uid()
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
    actor_user_id, action, entity_type, entity_id, before_data, after_data, metadata
  ) values (
    auth.uid(), 'competition_formation_team_linked', 'competition_formation',
    v_formation.id, v_before, v_after,
    jsonb_build_object(
      'team_id', target_team,
      'season_id', v_formation.season_id,
      'effective_at', effective_at,
      'reason', reason,
      'evidence_required', true
    )
  );

  return v_formation;
end;
$$;

-- Resolve team attribution from temporal athlete membership at the match instant.
-- The mutable current formation.team_id is deliberately not used for scoring.
create or replace function private.mirror_athlete_ranking_to_competition_formation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_formation_id uuid;
  v_formation_team_id uuid;
  v_event_at timestamptz;
  v_related_side_transaction uuid;
  v_existing_side_transaction uuid;
begin
  if new.transaction_scope <> 'athlete'
    or new.status <> 'homologated'
    or new.match_side_id is null
    or new.match_id is null
    or new.rule_code not in ('WIN', 'LOSS', 'ACE', 'ATTACK') then
    return new;
  end if;

  v_formation_id := private.ensure_match_side_competition_formation(new.match_side_id);
  if v_formation_id is null then return new; end if;

  if new.rule_code in ('WIN', 'LOSS') then
    select tx.id into v_existing_side_transaction
    from public.ranking_transactions tx
    where tx.formation_id = v_formation_id
      and tx.match_id = new.match_id
      and tx.match_side_id = new.match_side_id
      and tx.rule_code = new.rule_code
      and tx.transaction_scope = 'side'
      and tx.transaction_type = new.transaction_type
      and tx.status = 'homologated'
    order by tx.created_at asc
    limit 1;
  else
    select tx.id into v_existing_side_transaction
    from public.ranking_transactions tx
    where tx.formation_id = v_formation_id
      and tx.match_side_id = new.match_side_id
      and tx.source_type = new.source_type
      and tx.source_id = new.source_id
      and tx.rule_code = new.rule_code
      and tx.transaction_scope = 'side'
      and tx.transaction_type = new.transaction_type
      and tx.status = 'homologated'
    order by tx.created_at asc
    limit 1;
  end if;

  if v_existing_side_transaction is not null then
    return new;
  end if;

  if new.transaction_type = 'reversal' then
    select tx.id, tx.team_id
      into v_related_side_transaction, v_formation_team_id
    from public.ranking_transactions tx
    where tx.formation_id = v_formation_id
      and tx.match_side_id = new.match_side_id
      and tx.rule_code = new.rule_code
      and tx.transaction_scope = 'side'
      and tx.transaction_type = 'earn'
      and (
        new.rule_code in ('WIN', 'LOSS')
        or (tx.source_type = new.source_type and tx.source_id = new.source_id)
      )
    order by tx.created_at asc
    limit 1;

    if v_related_side_transaction is null then return new; end if;
  else
    select coalesce(m.started_at, s.starts_at)
      into v_event_at
    from public.matches m
    left join public.ur_play_sessions s on s.id = m.session_id
    where m.id = new.match_id;

    if v_event_at is not null then
      select tm.team_id
        into v_formation_team_id
      from public.team_memberships tm
      join public.competition_formation_members cfm
        on cfm.athlete_id = tm.athlete_id
       and cfm.formation_id = v_formation_id
      where tm.season_id = new.season_id
        and tm.status = 'active'
        and tm.starts_at <= v_event_at
        and (tm.ends_at is null or tm.ends_at > v_event_at)
      group by tm.team_id
      having count(distinct tm.athlete_id) = (
        select count(*)
        from public.competition_formation_members members
        where members.formation_id = v_formation_id
      )
      order by tm.team_id
      limit 1;
    end if;
  end if;

  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id,
    match_side_id, formation_id, match_id, session_id, source_type, source_id,
    rule_id, rule_code, rule_version, points, points_applied, transaction_type,
    transaction_scope, status, event_context, event_context_data, metadata,
    related_transaction_id, processing_run_id, created_by, homologated_at,
    homologated_by, client_operation_id
  ) values (
    new.season_id, new.season_cycle_id, null, v_formation_team_id, new.pole_id,
    new.roster_id, new.match_side_id, v_formation_id, new.match_id,
    new.session_id, new.source_type, new.source_id, new.rule_id, new.rule_code,
    new.rule_version, new.points, new.points_applied, new.transaction_type,
    'side', new.status, new.event_context, new.event_context_data,
    new.metadata || jsonb_build_object(
      'competition_formation_mirror', true,
      'canonical_team_attribution', true,
      'team_attribution_event_at', v_event_at
    ),
    v_related_side_transaction, new.processing_run_id, new.created_by,
    new.homologated_at, new.homologated_by, null
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Athlete-safe team contribution projection. Only current members of the team
-- (or admin Preview) can read it; the projection is derived from canonical side
-- transactions with frozen team attribution.
create or replace function public.get_athlete_team_contributions(p_team_id uuid)
returns table (
  formation_id uuid,
  formation_name text,
  total_points integer,
  games_played integer,
  wins integer,
  losses integer,
  result_points integer,
  technical_points integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_athlete_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select a.id into v_athlete_id
  from public.athletes a
  where a.profile_id = v_user_id;

  if not exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = p_team_id
      and tm.athlete_id = v_athlete_id
      and tm.status = 'active'
      and tm.starts_at <= now()
      and (tm.ends_at is null or tm.ends_at > now())
  ) and not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'team contribution access denied' using errcode = '42501';
  end if;

  return query
  select
    rt.formation_id,
    cf.display_name,
    sum(rt.points_applied)::integer,
    count(distinct rt.match_id)::integer,
    sum(case when rt.rule_code = 'WIN' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer,
    sum(case when rt.rule_code = 'LOSS' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer,
    sum(case when rt.rule_code in ('WIN','LOSS') then rt.points_applied else 0 end)::integer,
    sum(case when rt.rule_code in ('ACE','ATTACK') then rt.points_applied else 0 end)::integer
  from public.ranking_transactions rt
  join public.competition_formations cf on cf.id = rt.formation_id
  where rt.team_id = p_team_id
    and rt.formation_id is not null
    and rt.transaction_scope = 'side'
    and rt.status = 'homologated'
    and rt.rule_code in ('WIN','LOSS','ACE','ATTACK')
  group by rt.formation_id, cf.display_name
  having sum(rt.points_applied) <> 0
  order by sum(rt.points_applied) desc, cf.display_name asc, rt.formation_id;
end;
$$;

revoke all on function public.get_athlete_team_contributions(uuid) from public, anon;
grant execute on function public.get_athlete_team_contributions(uuid) to authenticated;

comment on function public.get_athlete_team_contributions(uuid) is
  'Athlete-safe canonical team contribution by formation. Uses frozen team_id on homologated side ranking transactions; no historical team inference.';
