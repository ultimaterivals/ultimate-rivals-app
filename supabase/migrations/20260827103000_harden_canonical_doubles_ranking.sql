-- Canonical doubles hardening.
-- A doubles formation is identified by athlete ids, can exist without a team,
-- receives exactly one WIN/LOSS per match side, and receives technical actions
-- from the athletes that compose the formation. Individual PARTICIPATION never
-- contributes to doubles.

create or replace function private.mirror_athlete_ranking_to_competition_formation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_formation_id uuid;
  v_formation_team_id uuid;
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
  if v_formation_id is null then
    return new;
  end if;

  select cf.team_id
    into v_formation_team_id
  from public.competition_formations cf
  where cf.id = v_formation_id;

  -- WIN/LOSS belong to the match side, not to each athlete. The athlete ledger
  -- contains one result event per athlete, so the doubles mirror must collapse
  -- those events to exactly one side event.
  if new.rule_code in ('WIN', 'LOSS') then
    select tx.id
      into v_existing_side_transaction
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

    if v_existing_side_transaction is not null then
      return new;
    end if;
  else
    -- Technical events remain distinct, but retries of the same canonical source
    -- are idempotent.
    select tx.id
      into v_existing_side_transaction
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

    if v_existing_side_transaction is not null then
      return new;
    end if;
  end if;

  if new.transaction_type = 'reversal' then
    select tx.id
      into v_related_side_transaction
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
    new.season_id, new.season_cycle_id, null, v_formation_team_id, new.pole_id,
    new.roster_id, new.match_side_id, v_formation_id, new.match_id,
    new.session_id, new.source_type, new.source_id, new.rule_id, new.rule_code,
    new.rule_version, new.points, new.points_applied, new.transaction_type,
    'side', new.status, new.event_context, new.event_context_data,
    new.metadata || jsonb_build_object(
      'competition_formation_mirror', true,
      'canonical_doubles', true
    ),
    v_related_side_transaction, new.processing_run_id, new.created_by,
    new.homologated_at, new.homologated_by, null
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.mirror_athlete_ranking_to_competition_formation()
from public, anon, authenticated;

-- Explicit helper for historical/bootstrap formation identity. Display names are
-- presentation only; identity is the ordered set of athlete UUIDs. team_id is
-- optional and never synthesized.
create or replace function private.ensure_historical_doubles_formation(
  p_season_id uuid,
  p_format_id uuid,
  p_category_id uuid,
  p_level public.athlete_level,
  p_athlete_one_id uuid,
  p_athlete_two_id uuid,
  p_display_name text,
  p_pole_id uuid default null,
  p_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signature text;
  v_formation_id uuid;
  v_first uuid;
  v_second uuid;
begin
  if p_athlete_one_id is null
    or p_athlete_two_id is null
    or p_athlete_one_id = p_athlete_two_id then
    raise exception 'DOUBLE_MEMBERS_INVALID';
  end if;

  if not exists (select 1 from public.athletes where id = p_athlete_one_id)
    or not exists (select 1 from public.athletes where id = p_athlete_two_id) then
    raise exception 'DOUBLE_MEMBER_NOT_FOUND';
  end if;

  if p_athlete_one_id::text < p_athlete_two_id::text then
    v_first := p_athlete_one_id;
    v_second := p_athlete_two_id;
  else
    v_first := p_athlete_two_id;
    v_second := p_athlete_one_id;
  end if;

  v_signature := md5(v_first::text || ',' || v_second::text);

  select cf.id
    into v_formation_id
  from public.competition_formations cf
  where cf.season_id = p_season_id
    and cf.format_id = p_format_id
    and cf.category_id is not distinct from p_category_id
    and cf.level is not distinct from p_level
    and cf.member_signature = v_signature
  limit 1;

  if v_formation_id is null then
    insert into public.competition_formations(
      season_id, format_id, category_id, level, team_id, pole_id,
      display_name, member_signature, status
    ) values (
      p_season_id, p_format_id, p_category_id, p_level, p_team_id, p_pole_id,
      coalesce(nullif(btrim(p_display_name), ''), 'Dupla'), v_signature, 'active'
    )
    returning id into v_formation_id;
  end if;

  insert into public.competition_formation_members(formation_id, athlete_id, position_order)
  values
    (v_formation_id, v_first, 1),
    (v_formation_id, v_second, 2)
  on conflict (formation_id, athlete_id) do nothing;

  return v_formation_id;
end;
$$;

revoke all on function private.ensure_historical_doubles_formation(
  uuid, uuid, uuid, public.athlete_level, uuid, uuid, text, uuid, uuid
) from public, anon, authenticated;

-- FINAL source reconciliation:
-- UR_Rankings_Oficiais_Apos_UR_Play_28-08_FINAL.xlsx / Ranking Duplas.
-- Points de Jogo = WIN*6 + LOSS*2 + ACE*4 + ATTACK*2.
-- There is no doubles PARTICIPATION component.
do $$
declare
  v_bad_rows integer;
begin
  with final_source(position, pair_name, games, wins, losses, aces, attacks, game_points) as (
    values
      (1, 'Driely e Juliana', 22, 19, 3, 47, 83, 474),
      (2, 'Kim e Poly', 22, 11, 11, 38, 58, 356),
      (3, 'Silvana e Thay', 10, 6, 4, 20, 31, 186),
      (4, 'Lara e Priscila', 13, 6, 7, 19, 32, 190),
      (5, 'Lilian e Jaque', 8, 5, 3, 14, 39, 170),
      (6, 'Carolina e Thaís', 13, 5, 8, 16, 43, 196),
      (7, 'Naty e Thalita', 6, 4, 2, 7, 6, 68),
      (8, 'Nina e Val', 9, 4, 5, 18, 27, 160),
      (9, 'Fany e Kesia', 9, 4, 5, 12, 38, 158),
      (10, 'Eliene e Thalita', 7, 3, 4, 3, 21, 80),
      (11, 'Luana e Manu', 4, 2, 2, 6, 9, 58),
      (12, 'Day e Stephani', 6, 2, 4, 11, 11, 86),
      (13, 'Eliene e Val', 7, 2, 5, 6, 28, 102),
      (14, 'Carol e Eliene', 4, 1, 3, 6, 8, 52),
      (15, 'Esther e Lilian', 5, 1, 4, 8, 14, 74),
      (16, 'Michele e Viviane', 5, 0, 5, 5, 5, 40)
  ), calculated as (
    select
      fs.*,
      fs.wins * 6 + fs.losses * 2 + fs.aces * 4 + fs.attacks * 2 as calculated_points,
      row_number() over (
        order by
          fs.wins desc,
          case when fs.games > 0 then fs.wins::numeric / fs.games else 0 end desc,
          fs.game_points desc,
          fs.aces desc,
          fs.attacks desc,
          fs.pair_name asc
      )::integer as calculated_position
    from final_source fs
  )
  select count(*)::integer
    into v_bad_rows
  from calculated c
  where c.games <> c.wins + c.losses
    or c.calculated_points <> c.game_points
    or c.position <> c.calculated_position;

  if v_bad_rows > 0 then
    raise exception 'FINAL_DOUBLES_RANKING_RECONCILIATION_FAILED';
  end if;
end
$$;
