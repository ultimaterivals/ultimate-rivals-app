create or replace function private.process_homologated_match(
  target_match uuid,
  operation_id uuid
)
returns public.ranking_processing_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  session_row public.ur_play_sessions;
  run_row public.ranking_processing_runs;
  previous_run public.ranking_processing_runs;
  rule_row public.ranking_rules;
  participant_row record;
  action_row record;
  game_point record;
  fingerprint text;
  inserted_count integer := 0;
  reversed_count integer := 0;
  event_time timestamptz;
  result_version integer;
begin
  if not private.can_homologate_match(target_match) then
    raise exception 'ranking processing denied' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranking:' || target_match::text, 0));
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = target_match for update;
  if result_row.result_status <> 'homologated' then
    raise exception 'homologated match result required' using errcode = '23514';
  end if;
  if match_row.event_context <> 'ur_play' then
    raise exception 'only UR Play ranking processing is operational' using errcode = '0A000';
  end if;
  select * into session_row from public.ur_play_sessions where id = match_row.session_id;
  event_time := coalesce(result_row.homologated_at, match_row.ended_at, now());
  select coalesce(max(version_number), 0) into result_version
  from public.match_result_versions where match_id = target_match;
  select md5(concat_ws('|',
    result_row.id::text, result_row.result_status::text,
    coalesce(result_row.winner_side_id::text, ''), result_row.score_a::text, result_row.score_b::text,
    result_version::text,
    coalesce((select string_agg(concat_ws(':', id, athlete_id, side_id, team_snapshot_id, pole_snapshot_id, status), ',' order by id)
      from public.match_participants where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, rally_id, athlete_id, side_id, action_type, status, version_number), ',' order by id)
      from public.match_technical_action_effective where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, effective_winning_side_id, effective_status), ',' order by rally_number)
      from public.match_rally_effective where match_id = target_match), '')
  )) into fingerprint;
  select * into run_row from public.ranking_processing_runs where client_operation_id = operation_id;
  if found then return run_row; end if;
  select * into previous_run
  from public.ranking_processing_runs
  where source_type = 'match_result' and source_id = target_match and status = 'completed'
  order by completed_at desc limit 1;
  if previous_run.input_fingerprint = fingerprint then
    insert into public.ranking_processing_runs(
      source_type, source_id, status, completed_at, input_fingerprint,
      client_operation_id, created_by, metadata
    ) values (
      'match_result', target_match, 'completed', now(), fingerprint,
      operation_id, auth.uid(), jsonb_build_object('no_op', true, 'reason', 'unchanged_input')
    ) returning * into run_row;
    return run_row;
  end if;
  insert into public.ranking_processing_runs(
    source_type, source_id, status, input_fingerprint, client_operation_id, created_by,
    metadata
  ) values (
    'match_result', target_match, 'processing', fingerprint, operation_id, auth.uid(),
    jsonb_build_object('result_version', result_version)
  ) returning * into run_row;

  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
    match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
    points, points_applied, transaction_type, transaction_scope, status, event_context,
    event_context_data, metadata, related_transaction_id, processing_run_id,
    created_by, homologated_at, homologated_by
  )
  select
    old.season_id, old.season_cycle_id, old.athlete_id, old.team_id, old.pole_id, old.roster_id,
    old.match_side_id, old.match_id, old.session_id, 'ranking_transaction', old.id,
    old.rule_id, old.rule_code, old.rule_version, -old.points, -old.points_applied,
    'reversal', old.transaction_scope, 'homologated', old.event_context,
    old.event_context_data,
    old.metadata || jsonb_build_object('reversal_reason', 'match_reprocessed', 'original_transaction_id', old.id),
    old.id, run_row.id, auth.uid(), event_time, result_row.homologated_by
  from public.ranking_transactions old
  where old.match_id = target_match
    and old.transaction_type <> 'reversal'
    and not exists (
      select 1 from public.ranking_transactions reversal
      where reversal.related_transaction_id = old.id and reversal.transaction_type = 'reversal'
    );
  get diagnostics reversed_count = row_count;

  for participant_row in
    select p.*, side.roster_id
    from public.match_participants p
    join public.match_sides side on side.id = p.side_id
    where p.match_id = target_match and p.status = 'active'
  loop
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'PARTICIPATION', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant_row.athlete_id,
        participant_row.team_snapshot_id, participant_row.pole_snapshot_id, participant_row.roster_id, participant_row.side_id,
        target_match, match_row.session_id, 'match_participant', participant_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code),
        jsonb_build_object('category', rule_row.point_category, 'participation_role', participant_row.participation_role),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case when participant_row.side_id = result_row.winner_side_id then 'WIN' else 'LOSS' end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant_row.athlete_id,
        participant_row.team_snapshot_id, participant_row.pole_snapshot_id, participant_row.roster_id, participant_row.side_id,
        target_match, match_row.session_id, 'match_result', result_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'winner_side_id', result_row.winner_side_id),
        jsonb_build_object('category', rule_row.point_category),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  for action_row in
    select action.*, participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
    from public.match_technical_action_effective action
    join public.match_rally_effective rally on rally.id = action.rally_id
      and rally.effective_status in ('valid', 'corrected')
      and rally.effective_winning_side_id = action.side_id
    join public.match_participants participant on participant.match_id = action.match_id
      and participant.athlete_id = action.athlete_id and participant.status = 'active'
    join public.match_sides side on side.id = participant.side_id
    where action.match_id = target_match and action.status <> 'void'
  loop
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case action_row.action_type
        when 'ace' then 'ACE'
        when 'attack' then 'ATTACK'
        when 'block' then 'BLOCK'
        when 'defense' then 'DEFENSE'
        when 'assist' then 'ASSIST'
      end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, action_row.athlete_id,
        action_row.team_snapshot_id, action_row.pole_snapshot_id, action_row.roster_id, action_row.side_id,
        target_match, match_row.session_id, 'technical_action', action_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_id', action_row.rally_id),
        jsonb_build_object('category', rule_row.point_category, 'action_type', action_row.action_type),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  select game.*, action.id as action_id, action.athlete_id, action.side_id,
    participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
  into game_point
  from public.match_game_points game
  join public.match_technical_action_effective action on action.rally_id = game.game_point_rally_id
    and action.status <> 'void' and action.side_id = game.winner_side_id
  join public.match_participants participant on participant.match_id = game.match_id
    and participant.athlete_id = action.athlete_id and participant.status = 'active'
  join public.match_sides side on side.id = participant.side_id
  where game.match_id = target_match;
  if found then
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'GAME_POINT', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, game_point.athlete_id,
        game_point.team_snapshot_id, game_point.pole_snapshot_id, game_point.roster_id, game_point.side_id,
        target_match, match_row.session_id, 'rally', game_point.game_point_rally_id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_number', game_point.game_point_rally_number),
        jsonb_build_object('category', rule_row.point_category, 'target_action_id', game_point.action_id),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end if;

  update public.ranking_processing_runs
  set status = 'completed', completed_at = now(),
      transaction_count = reversed_count + inserted_count,
      metadata = metadata || jsonb_build_object(
        'reversal_count', reversed_count,
        'generated_count', inserted_count,
        'streak_bonus_mode', 'highest_only',
        'collective_streak_distribution', 'disabled'
      )
  where id = run_row.id
  returning * into run_row;
  return run_row;
end;
$$;
