-- The published individual ranking follows the official Season 1 order:
-- wins -> win rate -> Ranking Points -> aces -> attacks.
-- ranking_entries remains the immutable projection store; this public view is the
-- canonical published ordering and snapshots consume the same ordering.

create or replace view public.public_rankings
with (security_invoker = true)
as
with ranked as (
  select
    re.*,
    case
      when re.ranking_type = 'individual'::public.ranking_classification_type then
        row_number() over (
          partition by re.ranking_type, re.season_id, re.cycle_id
          order by
            re.wins desc,
            re.win_rate desc,
            re.total_points desc,
            re.aces desc,
            re.attacks desc,
            re.reached_score_at,
            re.entity_id
        )::integer
      else re.current_position
    end as official_current_position,
    case
      when re.ranking_type = 'individual'::public.ranking_classification_type then
        row_number() over (
          partition by re.ranking_type, re.season_id, re.cycle_id
          order by
            re.wins desc,
            re.win_rate desc,
            re.total_points desc,
            re.aces desc,
            re.attacks desc,
            re.reached_score_at,
            re.entity_id
        )::integer
      else re.general_position
    end as official_general_position
  from public.ranking_entries re
)
select
  ranked.id,
  ranked.ranking_type,
  ranked.season_id,
  ranked.cycle_id,
  ranked.entity_id,
  ranked.entity_code,
  ranked.display_name,
  ranked.level,
  ranked.team_id,
  ranked.team_name,
  ranked.pole_id,
  ranked.pole_name,
  ranked.category_code,
  ranked.format_code,
  ranked.total_points,
  ranked.games_played,
  ranked.wins,
  ranked.losses,
  ranked.win_rate,
  ranked.aces,
  ranked.attacks,
  ranked.blocks,
  ranked.defenses,
  ranked.assists,
  ranked.athletes_contributing,
  ranked.teams_contributing,
  ranked.official_current_position as current_position,
  ranked.official_general_position as general_position,
  ranked.previous_position,
  case
    when ranked.previous_position is null or ranked.official_current_position is null then null
    else ranked.previous_position - ranked.official_current_position
  end as position_change,
  case
    when ranked.previous_position is null then 'new'
    when ranked.official_current_position is null then ranked.movement
    when ranked.previous_position > ranked.official_current_position then 'up'
    when ranked.previous_position < ranked.official_current_position then 'down'
    else 'stable'
  end as movement,
  ranked.refreshed_at,
  case
    when ranked.ranking_type = 'individual'::public.ranking_classification_type
      and a.show_profile_photo_publicly
      and a.public_profile_visibility = 'sports_public'
    then a.avatar_url
    else null::text
  end as avatar_url
from ranked
left join public.athletes a
  on a.id = ranked.entity_id
 and ranked.ranking_type = 'individual'::public.ranking_classification_type;

grant select on public.public_rankings to anon, authenticated, service_role;

create or replace function public.capture_ranking_snapshot(
  target_season_id uuid,
  target_cycle_id uuid default null,
  target_reason public.ranking_snapshot_reason default 'manual'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  batch_id uuid := gen_random_uuid();
  inserted_count integer;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if target_cycle_id is not null and not exists(
    select 1 from public.season_cycles
    where id = target_cycle_id and season_id = target_season_id
  ) then
    raise exception 'cycle does not belong to season' using errcode = '23514';
  end if;

  perform private.refresh_all_rankings(target_season_id);

  insert into public.ranking_snapshots(
    snapshot_batch_id, ranking_type, season_id, cycle_id, entity_id, level,
    position, total_points, snapshot_reason, captured_by
  )
  select
    batch_id, ranking_type, season_id, cycle_id, entity_id, level,
    current_position, total_points, target_reason, (select auth.uid())
  from public.public_rankings
  where season_id = target_season_id
    and cycle_id is not distinct from target_cycle_id
    and current_position is not null;

  get diagnostics inserted_count = row_count;
  insert into public.ranking_operations(
    operation_type, season_id, cycle_id, snapshot_batch_id, reason, after_state, created_by
  )
  values(
    'snapshot', target_season_id, target_cycle_id, batch_id,
    'Captura de snapshot ' || target_reason::text,
    jsonb_build_object('entries', inserted_count),
    (select auth.uid())
  );
  return batch_id;
end;
$$;
