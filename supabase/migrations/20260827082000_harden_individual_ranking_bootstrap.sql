-- Keep the official individual ranking derived from the canonical ranking ledger.
-- Historical bootstraps may refresh projections, but must not generate athlete-facing
-- ranking-movement notifications while the bootstrap projection is being rebuilt.

do $$
declare
  v_mismatch integer;
begin
  with expected(rule_code, points) as (
    values
      ('PARTICIPATION'::text, 8),
      ('WIN'::text, 6),
      ('LOSS'::text, 2),
      ('ACE'::text, 4),
      ('ATTACK'::text, 2)
  )
  select count(*)::integer
  into v_mismatch
  from expected e
  where not exists (
    select 1
    from public.ranking_rules r
    where r.rule_code = e.rule_code
      and r.points = e.points
      and r.active = true
      and r.event_context = 'ur_play'
      and r.season_id is null
  );

  if v_mismatch > 0 then
    raise exception 'INDIVIDUAL_RANKING_RULE_SET_MISMATCH';
  end if;
end
$$;

create or replace function private.apply_official_individual_ranking_order(
  target_season_id uuid,
  target_cycle_id uuid default null
)
returns void
language sql
set search_path = ''
as $function$
with ranked as (
  select
    re.id,
    row_number() over (
      order by
        re.wins desc,
        case
          when re.wins + re.losses > 0
            then re.wins::numeric / (re.wins + re.losses)
          else 0
        end desc,
        re.total_points desc,
        re.aces desc,
        re.attacks desc,
        re.reached_score_at asc nulls last,
        re.entity_id asc
    )::integer as general_position,
    case
      when re.level = 'leveling'::public.athlete_level then null
      else row_number() over (
        partition by re.level
        order by
          re.wins desc,
          case
            when re.wins + re.losses > 0
              then re.wins::numeric / (re.wins + re.losses)
            else 0
          end desc,
          re.total_points desc,
          re.aces desc,
          re.attacks desc,
          re.reached_score_at asc nulls last,
          re.entity_id asc
      )::integer
    end as current_position
  from public.ranking_entries re
  where re.ranking_type = 'individual'
    and re.season_id = target_season_id
    and re.cycle_id is not distinct from target_cycle_id
)
update public.ranking_entries re
set
  general_position = ranked.general_position,
  current_position = ranked.current_position,
  position_change = case
    when re.previous_position is null or ranked.current_position is null then null
    else re.previous_position - ranked.current_position
  end,
  movement = case
    when re.previous_position is null or ranked.current_position is null then 'new'
    when re.previous_position > ranked.current_position then 'up'
    when re.previous_position < ranked.current_position then 'down'
    else 'stable'
  end
from ranked
where re.id = ranked.id;
$function$;

create or replace function private.notify_ranking_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if current_setting('app.suppress_ranking_notifications', true) = 'on' then
    return new;
  end if;

  if new.ranking_type <> 'individual'
    or new.cycle_id is not null
    or new.position_change is null
    or new.position_change = 0 then
    return new;
  end if;

  perform private.enqueue_athlete_notification(
    new.entity_id,
    'ranking_movement',
    case
      when new.position_change > 0 then 'Você subiu no ranking'
      else 'Seu ranking foi atualizado'
    end,
    case
      when new.position_change > 0
        then 'Você ganhou ' || new.position_change || ' posição(ões) na classificação.'
      else 'Sua nova posição oficial é #' || new.current_position || '.'
    end,
    '/athlete/ranking',
    'ranking_entry',
    new.id,
    'ranking_movement:' || new.season_id || ':' || new.entity_id || ':' || new.refreshed_at,
    jsonb_build_object(
      'position', new.current_position,
      'change', new.position_change
    ),
    new.refreshed_at
  );

  return new;
end
$function$;

create or replace function private.refresh_rankings_after_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_season uuid;
  suppress_notifications boolean := false;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select season_id
    into target_season
    from public.ranking_transactions
    where processing_run_id = new.id
    limit 1;

    if target_season is not null then
      suppress_notifications :=
        coalesce(new.metadata ->> 'origin', '') = 'historical_import'
        or coalesce(new.metadata ->> 'suppress_athlete_notifications', '') = 'true';

      if suppress_notifications then
        perform set_config('app.suppress_ranking_notifications', 'on', true);
      end if;

      perform private.refresh_all_rankings(target_season);

      if suppress_notifications then
        perform set_config('app.suppress_ranking_notifications', 'off', true);
      end if;
    end if;
  end if;

  return new;
end
$function$;
