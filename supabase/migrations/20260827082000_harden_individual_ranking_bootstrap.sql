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
  );

  if v_mismatch > 0 then
    raise exception 'INDIVIDUAL_RANKING_RULE_SET_MISMATCH';
  end if;
end
$$;

-- Replay contract copied from the competitive source of truth:
-- UR_Rankings_Oficiais_Apos_UR_Play_28-08_FINAL.xlsx / Ranking Individual.
-- It proves the approved scoring rules reproduce all 27 official rows and their order.
do $$
declare
  v_bad_rows integer;
  v_participation_events integer;
begin
  with final_source(position, athlete, games, wins, losses, aces, attacks, total_points) as (
    values
      (1, 'Driely', 22, 19, 3, 24, 49, 330),
      (2, 'Juliana', 22, 19, 3, 23, 34, 296),
      (3, 'Kim', 22, 11, 11, 22, 28, 248),
      (4, 'Poly', 22, 11, 11, 16, 30, 228),
      (5, 'Thalita', 13, 7, 6, 7, 15, 120),
      (6, 'Thay', 10, 6, 4, 14, 15, 138),
      (7, 'Silvana', 10, 6, 4, 6, 16, 108),
      (8, 'Lilian', 13, 6, 7, 12, 26, 166),
      (9, 'Priscila', 13, 6, 7, 9, 19, 140),
      (10, 'Lara', 13, 6, 7, 10, 13, 132),
      (11, 'Val', 16, 6, 10, 16, 25, 186),
      (12, 'Eliene', 18, 6, 12, 8, 29, 166),
      (13, 'Jaque', 8, 5, 3, 8, 19, 114),
      (14, 'Thaís', 13, 5, 8, 11, 21, 140),
      (15, 'Carolina', 13, 5, 8, 5, 22, 118),
      (16, 'Naty', 6, 4, 2, 2, 4, 52),
      (17, 'Kesia', 9, 4, 5, 7, 22, 114),
      (18, 'Fany', 9, 4, 5, 5, 16, 94),
      (19, 'Nina', 9, 4, 5, 5, 13, 88),
      (20, 'Manu', 4, 2, 2, 4, 5, 50),
      (21, 'Luana', 4, 2, 2, 2, 4, 40),
      (22, 'Stephani', 6, 2, 4, 8, 5, 70),
      (23, 'Day', 6, 2, 4, 3, 6, 52),
      (24, 'Carol', 4, 1, 3, 2, 4, 36),
      (25, 'Esther', 5, 1, 4, 2, 8, 46),
      (26, 'Michele', 5, 0, 5, 5, 2, 42),
      (27, 'Viviane', 5, 0, 5, 0, 3, 24)
  ), calculated as (
    select
      fs.*,
      fs.total_points
        - fs.wins * 6
        - fs.losses * 2
        - fs.aces * 4
        - fs.attacks * 2 as participation_points,
      row_number() over (
        order by
          fs.wins desc,
          case when fs.games > 0 then fs.wins::numeric / fs.games else 0 end desc,
          fs.total_points desc,
          fs.aces desc,
          fs.attacks desc,
          fs.athlete asc
      )::integer as calculated_position
    from final_source fs
  )
  select count(*)::integer
  into v_bad_rows
  from calculated c
  where c.games <> c.wins + c.losses
    or c.participation_points <= 0
    or mod(c.participation_points, 8) <> 0
    or c.position <> c.calculated_position;

  if v_bad_rows > 0 then
    raise exception 'FINAL_INDIVIDUAL_RANKING_RECONCILIATION_FAILED';
  end if;

  with final_source(position, athlete, games, wins, losses, aces, attacks, total_points) as (
    values
      (1, 'Driely', 22, 19, 3, 24, 49, 330),
      (2, 'Juliana', 22, 19, 3, 23, 34, 296),
      (3, 'Kim', 22, 11, 11, 22, 28, 248),
      (4, 'Poly', 22, 11, 11, 16, 30, 228),
      (5, 'Thalita', 13, 7, 6, 7, 15, 120),
      (6, 'Thay', 10, 6, 4, 14, 15, 138),
      (7, 'Silvana', 10, 6, 4, 6, 16, 108),
      (8, 'Lilian', 13, 6, 7, 12, 26, 166),
      (9, 'Priscila', 13, 6, 7, 9, 19, 140),
      (10, 'Lara', 13, 6, 7, 10, 13, 132),
      (11, 'Val', 16, 6, 10, 16, 25, 186),
      (12, 'Eliene', 18, 6, 12, 8, 29, 166),
      (13, 'Jaque', 8, 5, 3, 8, 19, 114),
      (14, 'Thaís', 13, 5, 8, 11, 21, 140),
      (15, 'Carolina', 13, 5, 8, 5, 22, 118),
      (16, 'Naty', 6, 4, 2, 2, 4, 52),
      (17, 'Kesia', 9, 4, 5, 7, 22, 114),
      (18, 'Fany', 9, 4, 5, 5, 16, 94),
      (19, 'Nina', 9, 4, 5, 5, 13, 88),
      (20, 'Manu', 4, 2, 2, 4, 5, 50),
      (21, 'Luana', 4, 2, 2, 2, 4, 40),
      (22, 'Stephani', 6, 2, 4, 8, 5, 70),
      (23, 'Day', 6, 2, 4, 3, 6, 52),
      (24, 'Carol', 4, 1, 3, 2, 4, 36),
      (25, 'Esther', 5, 1, 4, 2, 8, 46),
      (26, 'Michele', 5, 0, 5, 5, 2, 42),
      (27, 'Viviane', 5, 0, 5, 0, 3, 24)
  )
  select sum(
    (total_points - wins * 6 - losses * 2 - aces * 4 - attacks * 2) / 8
  )::integer
  into v_participation_events
  from final_source;

  if v_participation_events <> 36 then
    raise exception 'FINAL_PARTICIPATION_EVENT_COUNT_MISMATCH';
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
