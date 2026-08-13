create or replace function private.refresh_team_ranking_scope(
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
  where ranking_type = 'team'
    and season_id = target_season_id
    and cycle_id is not distinct from target_cycle_id;

  delete from public.ranking_contributions
  where ranking_type = 'team'
    and season_id = target_season_id
    and cycle_id is not distinct from target_cycle_id;

  with tx_aggregate as (
    select
      rt.team_id,
      sum(rt.points_applied)::integer as total_points,
      sum(case when rt.rule_code in ('WIN','LOSS') then rt.points_applied else 0 end)::integer as result_points,
      sum(case when rt.rule_code in ('ACE','ATTACK') then rt.points_applied else 0 end)::integer as technical_points,
      sum(case when rt.rule_code = 'WIN' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as wins,
      sum(case when rt.rule_code = 'LOSS' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as losses,
      sum(case when rt.rule_code = 'ACE' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as aces,
      sum(case when rt.rule_code = 'ATTACK' then case when rt.transaction_type = 'reversal' then -1 else 1 end else 0 end)::integer as attacks,
      max(coalesce(rt.homologated_at, rt.created_at)) as reached_score_at
    from public.ranking_transactions rt
    where rt.season_id = target_season_id
      and rt.season_cycle_id is not distinct from target_cycle_id
      and rt.status = 'homologated'
      and rt.transaction_scope = 'side'
      and rt.team_id is not null
      and rt.formation_id is not null
      and rt.rule_code in ('WIN','LOSS','ACE','ATTACK')
    group by rt.team_id
    having sum(rt.points_applied) <> 0
  ), member_counts as (
    select
      ranked_team.team_id,
      count(distinct cfm.athlete_id)::integer as athletes_contributing
    from (
      select distinct rt.team_id, rt.formation_id
      from public.ranking_transactions rt
      where rt.season_id = target_season_id
        and rt.season_cycle_id is not distinct from target_cycle_id
        and rt.status = 'homologated'
        and rt.transaction_scope = 'side'
        and rt.team_id is not null
        and rt.formation_id is not null
        and rt.rule_code in ('WIN','LOSS','ACE','ATTACK')
    ) ranked_team
    join public.competition_formation_members cfm
      on cfm.formation_id = ranked_team.formation_id
    group by ranked_team.team_id
  ), enriched as (
    select
      tx.team_id,
      t.slug as entity_code,
      t.name as display_name,
      t.primary_pole_id as pole_id,
      p.name as pole_name,
      tx.total_points,
      tx.result_points,
      tx.technical_points,
      tx.wins,
      tx.losses,
      tx.aces,
      tx.attacks,
      coalesce(mc.athletes_contributing, 0)::integer as athletes_contributing,
      case
        when (tx.wins + tx.losses) > 0
          then round(tx.wins::numeric * 100 / (tx.wins + tx.losses), 4)
        else 0::numeric
      end as win_rate,
      tx.reached_score_at
    from tx_aggregate tx
    join public.teams t on t.id = tx.team_id and t.status = 'active'
    left join public.poles p on p.id = t.primary_pole_id
    left join member_counts mc on mc.team_id = tx.team_id
  ), positioned as (
    select
      e.*,
      row_number() over (
        order by e.total_points desc,
          e.wins desc,
          (e.wins + e.losses) desc,
          e.win_rate desc,
          e.technical_points desc,
          e.reached_score_at,
          e.team_id
      )::integer as position
    from enriched e
  )
  insert into public.ranking_entries(
    ranking_type, season_id, cycle_id, entity_id, entity_code, display_name,
    pole_id, pole_name, total_points, participation_points, result_points,
    technical_points, bonus_points, penalty_points, disciplinary_balance,
    games_played, wins, losses, win_rate, aces, attacks, athletes_contributing,
    teams_contributing, current_position, general_position, previous_position,
    position_change, movement, reached_score_at, refreshed_at
  )
  select
    'team', target_season_id, target_cycle_id, p.team_id, p.entity_code,
    p.display_name, p.pole_id, p.pole_name, p.total_points, 0,
    p.result_points, p.technical_points, 0, 0, 0,
    p.wins + p.losses, p.wins, p.losses, p.win_rate, p.aces, p.attacks,
    p.athletes_contributing, 1, p.position, p.position, previous.position,
    case when previous.position is null then null else previous.position - p.position end,
    case
      when previous.position is null then 'new'
      when previous.position > p.position then 'up'
      when previous.position < p.position then 'down'
      else 'stable'
    end,
    p.reached_score_at, now()
  from positioned p
  left join lateral (
    select s.position
    from public.ranking_snapshots s
    where s.ranking_type = 'team'
      and s.season_id = target_season_id
      and s.cycle_id is not distinct from target_cycle_id
      and s.entity_id = p.team_id
    order by s.captured_at desc, s.id desc
    limit 1
  ) previous on true;
end;
$$;

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
  perform private.refresh_team_ranking_scope(target_season_id, null);

  for cycle in
    select id from public.season_cycles where season_id = target_season_id
  loop
    perform private.refresh_ranking_scope(target_season_id, cycle.id);
    perform private.refresh_competition_formation_ranking_scope(target_season_id, cycle.id);
    perform private.refresh_team_ranking_scope(target_season_id, cycle.id);
  end loop;
end;
$$;
