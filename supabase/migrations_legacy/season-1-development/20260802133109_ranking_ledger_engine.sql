create type public.ranking_transaction_type as enum ('earn', 'penalty', 'reversal', 'correction');
create type public.ranking_transaction_status as enum ('pending', 'homologated', 'reversed', 'void');
create type public.ranking_transaction_scope as enum ('athlete', 'side', 'team');
create type public.ranking_source_type as enum (
  'match_result',
  'match_participant',
  'technical_action',
  'rally',
  'recognition',
  'disciplinary_event',
  'ranking_transaction'
);
create type public.ranking_point_category as enum ('participation', 'result', 'technical', 'bonus', 'penalty');
create type public.ranking_processing_status as enum ('pending', 'processing', 'completed', 'failed', 'superseded');
create type public.match_recognition_type as enum ('mvp', 'fair_play', 'highlight', 'hunter');
create type public.merit_event_status as enum ('pending', 'homologated', 'void');
create type public.disciplinary_event_type as enum ('yellow_card', 'red_card');

create table public.ranking_rules (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  rule_code text not null check (rule_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null check (char_length(trim(description)) between 5 and 500),
  event_context public.match_event_context,
  transaction_scope public.ranking_transaction_scope not null default 'athlete',
  point_category public.ranking_point_category not null,
  points integer not null,
  active boolean not null default true,
  valid_from timestamptz not null,
  valid_until timestamptz,
  version integer not null check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint ranking_rules_period check (valid_until is null or valid_until > valid_from),
  unique nulls not distinct (season_id, rule_code, event_context, version)
);

create table public.ranking_processing_runs (
  id uuid primary key default gen_random_uuid(),
  source_type public.ranking_source_type not null,
  source_id uuid not null,
  status public.ranking_processing_status not null default 'pending',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  input_fingerprint text,
  client_operation_id uuid unique,
  created_by uuid references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  constraint ranking_processing_completion check (
    (status in ('completed', 'failed', 'superseded') and completed_at is not null)
    or (status in ('pending', 'processing') and completed_at is null)
  )
);

create table public.ranking_transactions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  season_cycle_id uuid references public.season_cycles(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  roster_id uuid references public.team_rosters(id) on delete restrict,
  match_side_id uuid references public.match_sides(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  session_id uuid references public.ur_play_sessions(id) on delete restrict,
  source_type public.ranking_source_type not null,
  source_id uuid not null,
  rule_id uuid not null references public.ranking_rules(id) on delete restrict,
  rule_code text not null,
  rule_version integer not null check (rule_version > 0),
  points integer not null,
  points_applied integer not null,
  transaction_type public.ranking_transaction_type not null,
  transaction_scope public.ranking_transaction_scope not null,
  status public.ranking_transaction_status not null,
  event_context public.match_event_context not null,
  event_context_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  related_transaction_id uuid references public.ranking_transactions(id) on delete restrict,
  processing_run_id uuid not null references public.ranking_processing_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  homologated_by uuid references public.profiles(id) on delete restrict,
  client_operation_id uuid,
  constraint ranking_transaction_target check (
    (transaction_scope = 'athlete' and athlete_id is not null)
    or (transaction_scope = 'side' and match_side_id is not null)
    or (transaction_scope = 'team' and team_id is not null)
  ),
  constraint ranking_transaction_points_frozen check (points = points_applied),
  constraint ranking_transaction_homologation check (
    (status = 'homologated' and homologated_at is not null and homologated_by is not null)
    or status <> 'homologated'
  ),
  constraint ranking_transaction_relation check (
    (transaction_type = 'reversal' and related_transaction_id is not null)
    or (transaction_type <> 'reversal' and related_transaction_id is null)
  ),
  unique nulls not distinct (
    processing_run_id, source_type, source_id, athlete_id, match_side_id, rule_code, transaction_type
  )
);

create unique index ranking_transactions_one_reversal
on public.ranking_transactions(related_transaction_id)
where transaction_type = 'reversal';

create table public.match_recognitions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  recognition_type public.match_recognition_type not null,
  status public.merit_event_status not null default 'pending',
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid unique,
  constraint match_recognition_homologation check (
    (status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or status <> 'homologated'
  ),
  unique (match_id, athlete_id, recognition_type)
);

create table public.disciplinary_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  session_id uuid references public.ur_play_sessions(id) on delete restrict,
  event_type public.disciplinary_event_type not null,
  status public.merit_event_status not null default 'pending',
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid unique,
  constraint disciplinary_event_source check (match_id is not null or session_id is not null),
  constraint disciplinary_event_homologation check (
    (status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or status <> 'homologated'
  )
);

create index ranking_rules_lookup
on public.ranking_rules(rule_code, event_context, season_id, active, valid_from desc, version desc);
create index ranking_processing_source
on public.ranking_processing_runs(source_type, source_id, started_at desc);
create index ranking_processing_status
on public.ranking_processing_runs(status, started_at desc);
create index ranking_transactions_athlete_season
on public.ranking_transactions(athlete_id, season_id, created_at desc)
where athlete_id is not null;
create index ranking_transactions_team_season
on public.ranking_transactions(team_id, season_id, created_at desc)
where team_id is not null;
create index ranking_transactions_pole_season
on public.ranking_transactions(pole_id, season_id, created_at desc)
where pole_id is not null;
create index ranking_transactions_source
on public.ranking_transactions(source_type, source_id);
create index ranking_transactions_match
on public.ranking_transactions(match_id, created_at desc)
where match_id is not null;
create index ranking_transactions_rule
on public.ranking_transactions(rule_id);
create index ranking_transactions_status_created
on public.ranking_transactions(status, created_at desc);
create index ranking_transactions_processing_run
on public.ranking_transactions(processing_run_id);
create index ranking_transactions_season_cycle
on public.ranking_transactions(season_cycle_id)
where season_cycle_id is not null;
create index ranking_transactions_roster
on public.ranking_transactions(roster_id)
where roster_id is not null;
create index ranking_transactions_match_side
on public.ranking_transactions(match_side_id)
where match_side_id is not null;
create index ranking_transactions_related
on public.ranking_transactions(related_transaction_id)
where related_transaction_id is not null;
create index match_recognitions_match on public.match_recognitions(match_id, status);
create index match_recognitions_athlete on public.match_recognitions(athlete_id, created_at desc);
create index disciplinary_events_athlete on public.disciplinary_events(athlete_id, created_at desc);
create index disciplinary_events_match on public.disciplinary_events(match_id) where match_id is not null;
create index disciplinary_events_session on public.disciplinary_events(session_id) where session_id is not null;

insert into public.ranking_rules(
  rule_code, name, description, event_context, transaction_scope,
  point_category, points, active, valid_from, version, metadata
)
values
  ('PARTICIPATION', 'Participação em jogo', 'Participante efetivo de partida homologada.', 'ur_play', 'athlete', 'participation', 8, true, '2026-01-01', 1, '{}'),
  ('WIN', 'Vitória', 'Participante efetivo do lado vencedor.', 'ur_play', 'athlete', 'result', 6, true, '2026-01-01', 1, '{}'),
  ('LOSS', 'Derrota', 'Participante efetivo do lado perdedor.', 'ur_play', 'athlete', 'result', 2, true, '2026-01-01', 1, '{}'),
  ('ACE', 'Ace', 'Ação técnica homologada de ace.', 'ur_play', 'athlete', 'technical', 4, true, '2026-01-01', 1, '{}'),
  ('ATTACK', 'Ataque', 'Ação técnica homologada de ataque.', 'ur_play', 'athlete', 'technical', 2, true, '2026-01-01', 1, '{}'),
  ('BLOCK', 'Bloqueio', 'Ação técnica homologada de bloqueio.', 'ur_play', 'athlete', 'technical', 3, true, '2026-01-01', 1, '{}'),
  ('DEFENSE', 'Defesa', 'Ação técnica homologada de defesa.', 'ur_play', 'athlete', 'technical', 1, true, '2026-01-01', 1, '{}'),
  ('ASSIST', 'Assistência', 'Ação técnica homologada de assistência.', 'ur_play', 'athlete', 'technical', 1, true, '2026-01-01', 1, '{}'),
  ('STREAK_3', 'Sequência de 3', 'Mérito coletivo de lado preparado sem distribuição individual.', 'ur_play', 'side', 'bonus', 5, false, '2026-01-01', 1, '{"streak_bonus_mode":"highest_only","distribution":"pending"}'),
  ('STREAK_5', 'Sequência de 5', 'Mérito coletivo de lado preparado sem distribuição individual.', 'ur_play', 'side', 'bonus', 10, false, '2026-01-01', 1, '{"streak_bonus_mode":"highest_only","distribution":"pending"}'),
  ('GAME_POINT', 'Game point', 'Bônus do autor identificado da ação técnica do rally decisivo.', 'ur_play', 'athlete', 'bonus', 6, true, '2026-01-01', 1, '{"target":"final_rally_technical_action_author"}'),
  ('COMEBACK', 'Comeback', 'Regra preparada; déficit mínimo e homologação oficial pendentes.', 'ur_play', 'side', 'bonus', 12, false, '2026-01-01', 1, '{"comeback_min_deficit":3,"approval":"pending"}'),
  ('MVP', 'MVP', 'Reconhecimento manual homologado, sem seleção automática.', 'ur_play', 'athlete', 'bonus', 10, true, '2026-01-01', 1, '{"source":"match_recognition"}'),
  ('FAIR_PLAY', 'Fair Play', 'Reconhecimento manual homologado, sem seleção automática.', 'ur_play', 'athlete', 'bonus', 5, true, '2026-01-01', 1, '{"source":"match_recognition"}'),
  ('YELLOW_CARD', 'Cartão amarelo', 'Penalidade disciplinar homologada.', 'ur_play', 'athlete', 'penalty', -5, true, '2026-01-01', 1, '{"source":"disciplinary_event"}'),
  ('RED_CARD', 'Cartão vermelho', 'Penalidade disciplinar homologada.', 'ur_play', 'athlete', 'penalty', -20, true, '2026-01-01', 1, '{"source":"disciplinary_event"}'),
  ('SQUAD_RESERVE_PRESENT', 'Reserva presente', 'Mérito por presença de reserva preparado, sem atribuição automática no UR Play.', 'ur_play', 'athlete', 'participation', 0, false, '2026-01-01', 1, '{"distribution":"disabled"}');

create or replace function private.reject_ranking_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'ranking ledger is append-only; use reversal or correction' using errcode = '55000';
end;
$$;

revoke all on function private.reject_ranking_transaction_mutation() from public, anon, authenticated;
create trigger ranking_transactions_append_only
before update or delete on public.ranking_transactions
for each row execute function private.reject_ranking_transaction_mutation();

create or replace function private.protect_ranking_rule_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ranking rules are versioned and cannot be deleted' using errcode = '55000';
  end if;
  if exists (select 1 from public.ranking_transactions where rule_id = old.id) and (
    new.rule_code is distinct from old.rule_code
    or new.season_id is distinct from old.season_id
    or new.event_context is distinct from old.event_context
    or new.transaction_scope is distinct from old.transaction_scope
    or new.point_category is distinct from old.point_category
    or new.points is distinct from old.points
    or new.valid_from is distinct from old.valid_from
    or new.version is distinct from old.version
  ) then
    raise exception 'referenced ranking rule is frozen; create a new version' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_ranking_rule_history() from public, anon, authenticated;
create trigger ranking_rules_protect_history
before update or delete on public.ranking_rules
for each row execute function private.protect_ranking_rule_history();

create or replace function private.resolve_ranking_rule(
  target_season uuid,
  target_rule_code text,
  target_context public.match_event_context,
  occurred_at timestamptz
)
returns public.ranking_rules
language sql
stable
security definer
set search_path = ''
as $$
  select rule.*
  from public.ranking_rules rule
  where rule.rule_code = target_rule_code
    and rule.active
    and (rule.season_id = target_season or rule.season_id is null)
    and (rule.event_context = target_context or rule.event_context is null)
    and rule.valid_from <= occurred_at
    and (rule.valid_until is null or rule.valid_until > occurred_at)
  order by
    (rule.season_id is not null) desc,
    (rule.event_context is not null) desc,
    rule.valid_from desc,
    rule.version desc
  limit 1;
$$;

revoke all on function private.resolve_ranking_rule(uuid,text,public.match_event_context,timestamptz)
from public, anon, authenticated;

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
  participant record;
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

  for participant in
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
        session_row.season_id, session_row.season_cycle_id, participant.athlete_id,
        participant.team_snapshot_id, participant.pole_snapshot_id, participant.roster_id, participant.side_id,
        target_match, match_row.session_id, 'match_participant', participant.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code),
        jsonb_build_object('category', rule_row.point_category, 'participation_role', participant.participation_role),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case when participant.side_id = result_row.winner_side_id then 'WIN' else 'LOSS' end,
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
        session_row.season_id, session_row.season_cycle_id, participant.athlete_id,
        participant.team_snapshot_id, participant.pole_snapshot_id, participant.roster_id, participant.side_id,
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

revoke all on function private.process_homologated_match(uuid,uuid) from public, anon;
grant execute on function private.process_homologated_match(uuid,uuid) to authenticated;

create or replace function public.process_homologated_match(target_match uuid, operation_id uuid)
returns public.ranking_processing_runs
language sql
security invoker
set search_path = ''
as $$ select private.process_homologated_match(target_match, operation_id) $$;

revoke all on function public.process_homologated_match(uuid,uuid) from public, anon;
grant execute on function public.process_homologated_match(uuid,uuid) to authenticated;

create or replace function private.reverse_ranking_for_void(target_match uuid, operation_id uuid)
returns public.ranking_processing_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  run_row public.ranking_processing_runs;
  reversed_count integer;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin ranking reversal required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranking:' || target_match::text, 0));
  select * into run_row from public.ranking_processing_runs where client_operation_id = operation_id;
  if found then return run_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = target_match for update;
  if result_row.result_status <> 'void' then
    raise exception 'void match result required' using errcode = '23514';
  end if;
  insert into public.ranking_processing_runs(
    source_type, source_id, status, input_fingerprint, client_operation_id, created_by, metadata
  ) values (
    'match_result', target_match, 'processing', md5('void:' || target_match::text || ':' || result_row.updated_at::text),
    operation_id, auth.uid(), jsonb_build_object('reason', result_row.correction_reason)
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
    old.metadata || jsonb_build_object('reversal_reason', 'match_void', 'original_transaction_id', old.id),
    old.id, run_row.id, auth.uid(), now(), auth.uid()
  from public.ranking_transactions old
  where old.match_id = target_match
    and old.transaction_type <> 'reversal'
    and not exists (
      select 1 from public.ranking_transactions reversal
      where reversal.related_transaction_id = old.id and reversal.transaction_type = 'reversal'
    );
  get diagnostics reversed_count = row_count;
  update public.ranking_processing_runs
  set status = 'completed', completed_at = now(), transaction_count = reversed_count,
      metadata = metadata || jsonb_build_object('reversal_count', reversed_count)
  where id = run_row.id returning * into run_row;
  return run_row;
end;
$$;

revoke all on function private.reverse_ranking_for_void(uuid,uuid) from public, anon;
grant execute on function private.reverse_ranking_for_void(uuid,uuid) to authenticated;

create view public.athlete_ranking_totals
with (security_invoker = true)
as
select
  transaction.athlete_id,
  transaction.season_id,
  sum(transaction.points)::integer as total_points,
  sum(transaction.points) filter (where rule.point_category = 'participation')::integer as participation_points,
  sum(transaction.points) filter (where rule.point_category = 'result')::integer as result_points,
  sum(transaction.points) filter (where rule.point_category = 'technical')::integer as technical_points,
  sum(transaction.points) filter (where rule.point_category = 'bonus')::integer as bonus_points,
  sum(transaction.points) filter (where rule.point_category = 'penalty')::integer as penalty_points
from public.ranking_transactions transaction
join public.ranking_rules rule on rule.id = transaction.rule_id
where transaction.status = 'homologated' and transaction.athlete_id is not null
group by transaction.athlete_id, transaction.season_id;

create view public.team_ranking_totals
with (security_invoker = true)
as
select team_id, season_id, sum(points)::integer as total_points,
  count(*) filter (where transaction_type <> 'reversal')::integer as contribution_count
from public.ranking_transactions
where status = 'homologated' and team_id is not null
group by team_id, season_id;

create view public.pole_ranking_totals
with (security_invoker = true)
as
select pole_id, season_id, sum(points)::integer as total_points,
  count(*) filter (where transaction_type <> 'reversal')::integer as contribution_count
from public.ranking_transactions
where status = 'homologated' and pole_id is not null
group by pole_id, season_id;

create view public.formation_ranking_totals
with (security_invoker = true)
as
select roster_id, match_side_id, season_id, sum(points)::integer as total_points
from public.ranking_transactions
where status = 'homologated' and (roster_id is not null or match_side_id is not null)
group by roster_id, match_side_id, season_id;

create view public.athlete_ranking_history
with (security_invoker = true)
as
select
  transaction.id,
  transaction.athlete_id,
  transaction.season_id,
  transaction.season_cycle_id,
  transaction.match_id,
  transaction.session_id,
  transaction.rule_code,
  rule.name as rule_name,
  rule.point_category,
  transaction.points,
  transaction.transaction_type,
  transaction.event_context,
  transaction.event_context_data,
  transaction.created_at,
  match.match_code,
  session.name as session_name
from public.ranking_transactions transaction
join public.ranking_rules rule on rule.id = transaction.rule_id
left join public.matches match on match.id = transaction.match_id
left join public.ur_play_sessions session on session.id = transaction.session_id
where transaction.status = 'homologated';

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ranking_rules', 'ranking_processing_runs', 'ranking_transactions',
    'match_recognitions', 'disciplinary_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

create policy ranking_rules_read on public.ranking_rules
for select to authenticated using (true);
create policy ranking_rules_admin on public.ranking_rules
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ranking_runs_read on public.ranking_processing_runs
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or (source_type = 'match_result' and exists (
    select 1 from public.matches match
    where match.id = source_id and private.operates_ur_play_session(match.session_id)
  ))
);

create policy ranking_transactions_read on public.ranking_transactions
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or athlete_id = private.current_athlete_id()
  or (team_id is not null and private.manages_team(team_id))
  or (pole_id is not null and private.manages_pole(pole_id))
  or (match_id is not null and exists (
    select 1 from public.matches match
    where match.id = match_id and private.operates_ur_play_session(match.session_id)
  ))
);

create policy match_recognitions_read on public.match_recognitions
for select to authenticated
using (private.can_read_match(match_id));
create policy match_recognitions_admin on public.match_recognitions
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy disciplinary_events_read on public.disciplinary_events
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or athlete_id = private.current_athlete_id()
  or (match_id is not null and private.can_read_match(match_id))
);
create policy disciplinary_events_admin on public.disciplinary_events
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

grant select on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events to authenticated;
grant insert, update on public.ranking_rules, public.match_recognitions, public.disciplinary_events to authenticated;
grant select on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history to authenticated;
grant all on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events to service_role;
grant select on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history to service_role;
revoke all on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events from anon;
revoke all on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history from anon;

create or replace function private.homologate_match_result(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_homologate_match(match_row.id) then raise exception 'homologation denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if match_row.status <> 'pending_review' or result_row.result_status <> 'under_review' then
    raise exception 'result under review required' using errcode = '23514';
  end if;
  if not score.is_game_over
    or result_row.score_a <> score.score_a
    or result_row.score_b <> score.score_b
    or result_row.winner_side_id is distinct from score.winner_side_id then
    raise exception 'result is inconsistent with rallies' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'homologated', homologated_by = auth.uid(),
      homologated_at = now(), updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = score.winner_side_id,
      final_score_a = score.score_a, final_score_b = score.score_b,
      ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, 'Result homologated', operation_id);
  perform private.process_homologated_match(target_match, operation_id);
  return result_row;
end;
$$;

create or replace function private.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin void required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'void reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if match_row.status = 'cancelled' then raise exception 'cancelled match cannot be voided' using errcode = '23514'; end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  insert into public.match_results(
    match_id, winner_side_id, score_a, score_b, result_status, correction_reason
  ) values (
    match_row.id, null, coalesce(score.score_a, 0), coalesce(score.score_b, 0), 'void', reason
  )
  on conflict (match_id) do update
  set winner_side_id = null,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      result_status = 'void',
      homologated_by = null,
      homologated_at = null,
      correction_reason = excluded.correction_reason,
      updated_at = now()
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = null,
      final_score_a = coalesce(score.score_a, 0),
      final_score_b = coalesce(score.score_b, 0),
      ready_for_scoring = false,
      voided_at = now(), void_reason = reason,
      ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.release_match_queue_after_game(match_row.id);
  perform private.append_match_result_version(result_row, reason, operation_id);
  perform private.reverse_ranking_for_void(target_match, operation_id);
  return result_row;
end;
$$;
