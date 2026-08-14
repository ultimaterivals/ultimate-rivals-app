create or replace function private.apply_official_individual_ranking_order(
  target_season_id uuid,
  target_cycle_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $function$
  with ranked as (
    select
      re.id,
      row_number() over (
        order by
          re.wins desc,
          case when (re.wins + re.losses) > 0
            then re.wins::numeric / (re.wins + re.losses)
            else 0::numeric end desc,
          re.total_points desc,
          re.aces desc,
          re.attacks desc,
          re.reached_score_at,
          re.entity_id
      )::integer as general_position,
      case
        when re.level = 'leveling'::public.athlete_level then null
        else row_number() over (
          partition by re.level
          order by
            re.wins desc,
            case when (re.wins + re.losses) > 0
              then re.wins::numeric / (re.wins + re.losses)
              else 0::numeric end desc,
            re.total_points desc,
            re.aces desc,
            re.attacks desc,
            re.reached_score_at,
            re.entity_id
        )::integer
      end as current_position
    from public.ranking_entries re
    where re.ranking_type = 'individual'
      and re.season_id = target_season_id
      and re.cycle_id is not distinct from target_cycle_id
  )
  update public.ranking_entries re
  set general_position = ranked.general_position,
      current_position = ranked.current_position,
      position_change = case
        when re.previous_position is null or ranked.current_position is null then null
        else re.previous_position - ranked.current_position end,
      movement = case
        when re.previous_position is null then 'new'
        when ranked.current_position is null then 'new'
        when re.previous_position > ranked.current_position then 'up'
        when re.previous_position < ranked.current_position then 'down'
        else 'stable' end
  from ranked
  where re.id = ranked.id;
$function$;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare cycle record;
begin
  if (select auth.uid()) is not null
    and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:' || target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id, null);
  perform private.apply_official_individual_ranking_order(target_season_id, null);
  perform private.refresh_competition_formation_ranking_scope(target_season_id, null);
  perform private.refresh_team_ranking_scope(target_season_id, null);
  for cycle in select id from public.season_cycles where season_id = target_season_id loop
    perform private.refresh_ranking_scope(target_season_id, cycle.id);
    perform private.apply_official_individual_ranking_order(target_season_id, cycle.id);
    perform private.refresh_competition_formation_ranking_scope(target_season_id, cycle.id);
    perform private.refresh_team_ranking_scope(target_season_id, cycle.id);
  end loop;
end;
$function$;

comment on function private.apply_official_individual_ranking_order(uuid, uuid) is
  'Canonical individual ranking order: wins, win rate, points, aces, attacks, then deterministic tie breakers.';
