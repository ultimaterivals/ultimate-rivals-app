-- Canonical persistent competition formations for doubles independent of teams.
-- Official doubles ranking: wins -> win rate -> game points -> aces -> attacks.
-- Game points include one WIN/LOSS per side plus the athletes' ACE/ATTACK actions.
-- PARTICIPATION is intentionally excluded from doubles.

create type public.competition_formation_status as enum ('active', 'inactive', 'archived');

create table public.competition_formations (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  format_id uuid not null references public.competitive_formats(id) on delete restrict,
  category_id uuid references public.competitive_categories(id) on delete restrict,
  level public.athlete_level,
  team_id uuid references public.teams(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) > 0),
  member_signature text not null,
  status public.competition_formation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (season_id, format_id, category_id, level, member_signature)
);

create table public.competition_formation_members (
  formation_id uuid not null references public.competition_formations(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  position_order smallint not null check (position_order > 0),
  created_at timestamptz not null default now(),
  primary key (formation_id, athlete_id),
  unique (formation_id, position_order)
);

alter table public.match_sides
  add column formation_id uuid references public.competition_formations(id) on delete restrict;

alter table public.ranking_transactions
  add column formation_id uuid references public.competition_formations(id) on delete restrict;

create index match_sides_formation_idx on public.match_sides(formation_id)
where formation_id is not null;

create index ranking_transactions_formation_idx
on public.ranking_transactions(formation_id, season_id, season_cycle_id, created_at)
where formation_id is not null;

alter table public.competition_formations enable row level security;
alter table public.competition_formations force row level security;
alter table public.competition_formation_members enable row level security;
alter table public.competition_formation_members force row level security;

revoke all on public.competition_formations from anon, authenticated;
revoke all on public.competition_formation_members from anon, authenticated;

create or replace function private.ensure_match_side_competition_formation(target_side uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_side public.match_sides;
  v_match public.matches;
  v_session public.ur_play_sessions;
  v_format_code text;
  v_signature text;
  v_display_name text;
  v_member_count integer;
  v_pole_id uuid;
  v_formation_id uuid;
begin
  select * into v_side
  from public.match_sides
  where id = target_side
  for update;

  if not found then
    return null;
  end if;

  if v_side.formation_id is not null then
    return v_side.formation_id;
  end if;

  select * into v_match from public.matches where id = v_side.match_id;
  select * into v_session from public.ur_play_sessions where id = v_match.session_id;
  select code into v_format_code from public.competitive_formats where id = v_match.format_id;

  -- V1 canonical standalone formation is required for doubles. Other formats
  -- continue to use their existing projection until their formation rules are homologated.
  if v_format_code <> 'doubles' then
    return null;
  end if;

  select
    md5(string_agg(mp.athlete_id::text, ',' order by mp.athlete_id::text)),
    coalesce(nullif(btrim(v_side.label), ''), string_agg(coalesce(a.public_name, a.full_name, a.athlete_code), ' e ' order by mp.position_order)),
    count(*)::integer,
    case when count(distinct mp.pole_snapshot_id) = 1 then min(mp.pole_snapshot_id) else null end
  into v_signature, v_display_name, v_member_count, v_pole_id
  from public.match_participants mp
  join public.athletes a on a.id = mp.athlete_id
  where mp.side_id = target_side
    and mp.match_id = v_match.id
    and mp.status = 'active';

  if v_member_count <> 2 or v_signature is null then
    return null;
  end if;

  select cf.id into v_formation_id
  from public.competition_formations cf
  where cf.season_id = v_session.season_id
    and cf.format_id = v_match.format_id
    and cf.category_id is not distinct from v_match.category_id
    and cf.level is not distinct from v_match.level
    and cf.member_signature = v_signature
    and cf.status = 'active'
  limit 1;

  if v_formation_id is null then
    insert into public.competition_formations(
      season_id, format_id, category_id, level, team_id, pole_id,
      display_name, member_signature, status
    ) values (
      v_session.season_id, v_match.format_id, v_match.category_id, v_match.level,
      v_side.team_id, v_pole_id, v_display_name, v_signature, 'active'
    )
    returning id into v_formation_id;
  end if;

  insert into public.competition_formation_members(formation_id, athlete_id, position_order)
  select v_formation_id, mp.athlete_id, mp.position_order
  from public.match_participants mp
  where mp.side_id = target_side
    and mp.match_id = v_match.id
    and mp.status = 'active'
  on conflict (formation_id, athlete_id) do nothing;

  update public.match_sides
  set formation_id = v_formation_id
  where id = target_side;

  return v_formation_id;
end;
$$;

revoke all on function private.ensure_match_side_competition_formation(uuid)
from public, anon, authenticated;

create or replace function private.mirror_athlete_ranking_to_competition_formation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_formation_id uuid;
  v_related_side_transaction uuid;
begin
  if new.transaction_scope <> 'athlete'
    or new.status <> 'homologated'
    or new.match_side_id is null
    or new.match_id is null
    or new.rule_code not in ('WIN', 'LOSS', 'ACE', 'ATTACK') then
    return new;
  end if;

  v_formation_id := private.ensure_match_side_competition_formation(new.match_side_id);
  if v_formation_id is null then
    return new;
  end if;

  if new.transaction_type = 'reversal' then
    select tx.id into v_related_side_transaction
    from public.ranking_transactions tx
    where tx.formation_id = v_formation_id
      and tx.match_side_id = new.match_side_id
      and tx.source_type = new.source_type
      and tx.source_id = new.source_id
      and tx.rule_code = new.rule_code
      and tx.transaction_scope = 'side'
      and tx.transaction_type = 'earn'
    order by tx.created_at desc
    limit 1;

    if v_related_side_transaction is null then
      return new;
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
    new.season_id, new.season_cycle_id, null, new.team_id, new.pole_id, new.roster_id,
    new.match_side_id, v_formation_id, new.match_id, new.session_id,
    new.source_type, new.source_id, new.rule_id, new.rule_code, new.rule_version,
    new.points, new.points_applied, new.transaction_type, 'side', new.status,
    new.event_context, new.event_context_data,
    new.metadata || jsonb_build_object('competition_formation_mirror', true),
    v_related_side_transaction, new.processing_run_id, new.created_by,
    new.homologated_at, new.homologated_by, null
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.mirror_athlete_ranking_to_competition_formation()
from public, anon, authenticated;

drop trigger if exists ranking_transactions_competition_formation_mirror
on public.ranking_transactions;

create trigger ranking_transactions_competition_formation_mirror
after insert on public.ranking_transactions
for each row
execute function private.mirror_athlete_ranking_to_competition_formation();

create or replace function private.refresh_competition_formation_ranking_scope(
  target_season_id uuid,
  target_cycle_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ranking_entries
  where ranking_type = 'doubles'
    and season_id = target_season_id
    and cycle_id is not distinct from target_cycle_id;

  delete from public.ranking_contributions
  where ranking_type = 'doubles'
    and season_id = target_season_id
    and cycle_id is not distinct from target_cycle_id;

  with aggregate_rows as (
    select
      cf.id as entity_id,
      cf.display_name,
      cf.level,
      cf.team_id,
      t.name as team_name,
      cf.pole_id,
      p.name as pole_name,
      cc.code as category_code,
      fmt.code as format_code,
      sum(rt.points_applied)::integer as total_points,
      sum(case when rt.rule_code in ('WIN', 'LOSS') then rt.points_applied else 0 end)::integer as result_points,
      sum(case when rt.rule_code in ('ACE', 'ATTACK') then rt.points_applied else 0 end)::integer as technical_points,
      sum(case when rt.rule_code = 'WIN' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as wins,
      sum(case when rt.rule_code = 'LOSS' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as losses,
      sum(case when rt.rule_code = 'ACE' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as aces,
      sum(case when rt.rule_code = 'ATTACK' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as attacks,
      count(distinct cfm.athlete_id)::integer as athletes_contributing,
      max(rt.created_at) as reached_score_at
    from public.competition_formations cf
    join public.competitive_formats fmt on fmt.id = cf.format_id and fmt.code = 'doubles'
    left join public.competitive_categories cc on cc.id = cf.category_id
    left join public.teams t on t.id = cf.team_id
    left join public.poles p on p.id = cf.pole_id
    join public.ranking_transactions rt
      on rt.formation_id = cf.id
     and rt.transaction_scope = 'side'
     and rt.status = 'homologated'
     and rt.season_id = target_season_id
     and rt.season_cycle_id is not distinct from target_cycle_id
     and rt.rule_code in ('WIN', 'LOSS', 'ACE', 'ATTACK')
    left join public.competition_formation_members cfm on cfm.formation_id = cf.id
    where cf.season_id = target_season_id
      and cf.status = 'active'
    group by
      cf.id, cf.display_name, cf.level, cf.team_id, t.name,
      cf.pole_id, p.name, cc.code, fmt.code
    having sum(rt.points_applied) <> 0
  ), positioned as (
    select
      ar.*,
      case when (ar.wins + ar.losses) > 0
        then round(ar.wins::numeric * 100 / (ar.wins + ar.losses), 4)
        else 0::numeric
      end as calculated_win_rate,
      row_number() over (
        partition by ar.level
        order by
          ar.wins desc,
          case when (ar.wins + ar.losses) > 0 then ar.wins::numeric / (ar.wins + ar.losses) else 0 end desc,
          ar.total_points desc,
          ar.aces desc,
          ar.attacks desc,
          ar.reached_score_at,
          ar.entity_id
      )::integer as current_position,
      row_number() over (
        order by
          ar.wins desc,
          case when (ar.wins + ar.losses) > 0 then ar.wins::numeric / (ar.wins + ar.losses) else 0 end desc,
          ar.total_points desc,
          ar.aces desc,
          ar.attacks desc,
          ar.reached_score_at,
          ar.entity_id
      )::integer as general_position
    from aggregate_rows ar
  )
  insert into public.ranking_entries(
    ranking_type, season_id, cycle_id, entity_id, entity_code, display_name,
    level, team_id, team_name, pole_id, pole_name, category_code, format_code,
    total_points, participation_points, result_points, technical_points,
    bonus_points, penalty_points, disciplinary_balance, games_played, wins,
    losses, win_rate, aces, attacks, blocks, defenses, assists,
    athletes_contributing, teams_contributing, current_position,
    general_position, previous_position, position_change, movement,
    reached_score_at, refreshed_at
  )
  select
    'doubles', target_season_id, target_cycle_id, p.entity_id, null, p.display_name,
    p.level, p.team_id, p.team_name, p.pole_id, p.pole_name,
    p.category_code, p.format_code, p.total_points, 0, p.result_points,
    p.technical_points, 0, 0, 0, p.wins + p.losses, p.wins, p.losses,
    p.calculated_win_rate, p.aces, p.attacks, 0, 0, 0,
    p.athletes_contributing, case when p.team_id is null then 0 else 1 end,
    p.current_position, p.general_position, null, null, 'new',
    p.reached_score_at, now()
  from positioned p;
end;
$$;

revoke all on function private.refresh_competition_formation_ranking_scope(uuid, uuid)
from public, anon, authenticated;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cycle record;
begin
  if (select auth.uid()) is not null
    and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('ranking-refresh:' || target_season_id::text));

  perform private.refresh_ranking_scope(target_season_id, null);
  perform private.refresh_competition_formation_ranking_scope(target_season_id, null);

  for cycle in
    select id from public.season_cycles where season_id = target_season_id
  loop
    perform private.refresh_ranking_scope(target_season_id, cycle.id);
    perform private.refresh_competition_formation_ranking_scope(target_season_id, cycle.id);
  end loop;
end;
$$;

revoke all on function private.refresh_all_rankings(uuid) from public, anon, authenticated;
grant execute on function private.refresh_all_rankings(uuid) to authenticated;
