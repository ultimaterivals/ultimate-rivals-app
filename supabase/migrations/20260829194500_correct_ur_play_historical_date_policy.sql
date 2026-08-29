-- Corrects the historical date policy after confirmation that UR Play began on
-- 28/07/2026. 28/08/2026 is not globally invalid and must not be blocked.
-- Historical dates remain evidence-first: known dates are preserved and unknown
-- dates remain null. This migration does not infer 28/07/2026 for every game.

alter table public.historical_match_results
  drop constraint if exists historical_match_results_no_placeholder_20260828;

alter table public.historical_import_rows
  drop constraint if exists historical_import_rows_no_placeholder_20260828;

create or replace function private.historical_import_row_issues(
  p_domain text,
  p_row jsonb
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_issues jsonb := '[]'::jsonb;
  v_occurred_at timestamptz;
begin
  if coalesce(nullif(trim(p_row->>'legacy_id'), ''), nullif(trim(p_row->>'source_id'), '')) is null then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity','error','code','SOURCE_ID_REQUIRED')
    );
  end if;

  if nullif(trim(p_row->>'occurred_at'), '') is not null then
    begin
      v_occurred_at := (p_row->>'occurred_at')::timestamptz;
    exception when others then
      v_issues := v_issues || jsonb_build_array(
        jsonb_build_object('severity','error','code','INVALID_OCCURRED_AT')
      );
    end;
  end if;

  if p_domain = 'matches' and (
    nullif(p_row->'canonical_keys'->>'home_legacy_id','') is null
    or nullif(p_row->'canonical_keys'->>'away_legacy_id','') is null
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity','error','code','MATCH_PARTICIPANTS_REQUIRED')
    );
  end if;

  if p_domain = 'results' and (
    nullif(p_row->'canonical_keys'->>'match_legacy_id','') is null
    or nullif(p_row->'payload'->>'winner_side','') is null
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity','error','code','RESULT_EVIDENCE_REQUIRED')
    );
  end if;

  return v_issues;
end;
$$;

create or replace function public.admin_upsert_historical_match_result(
  p_season_id uuid,
  p_provenance text,
  p_legacy_game_id integer,
  p_occurred_at timestamptz,
  p_time_label text,
  p_side_a_label text,
  p_side_b_label text,
  p_score_a smallint,
  p_score_b smallint,
  p_winner_side text,
  p_participants jsonb,
  p_source_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.require_admin_actor();
  v_match_id uuid;
  v_participant_count integer;
  v_distinct_participant_count integer;
begin
  if nullif(trim(p_provenance), '') is null then
    raise exception 'HISTORICAL_PROVENANCE_REQUIRED';
  end if;

  if p_legacy_game_id is null or p_legacy_game_id <= 0 then
    raise exception 'HISTORICAL_LEGACY_GAME_ID_INVALID';
  end if;

  if nullif(trim(p_side_a_label), '') is null
    or nullif(trim(p_side_b_label), '') is null then
    raise exception 'HISTORICAL_SIDE_LABEL_REQUIRED';
  end if;

  if p_score_a is null or p_score_a < 0 or p_score_b is null or p_score_b < 0 then
    raise exception 'HISTORICAL_SCORE_INVALID';
  end if;

  if p_winner_side not in ('A', 'B') then
    raise exception 'HISTORICAL_WINNER_SIDE_INVALID';
  end if;

  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'HISTORICAL_PARTICIPANTS_REQUIRED';
  end if;

  select count(*), count(distinct (participant->>'athlete_id'))
  into v_participant_count, v_distinct_participant_count
  from jsonb_array_elements(p_participants) participant;

  if v_participant_count < 2 or v_participant_count <> v_distinct_participant_count then
    raise exception 'HISTORICAL_PARTICIPANTS_INVALID';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_participants) participant
    where nullif(participant->>'athlete_id', '') is null
      or participant->>'side' not in ('A', 'B')
  ) then
    raise exception 'HISTORICAL_PARTICIPANT_INVALID';
  end if;

  insert into public.historical_match_results (
    season_id,
    source_ref,
    provenance,
    legacy_game_id,
    occurred_at,
    time_label,
    side_a_label,
    side_b_label,
    score_a,
    score_b,
    winner_side,
    source_metadata
  ) values (
    p_season_id,
    trim(p_provenance),
    trim(p_provenance),
    p_legacy_game_id,
    p_occurred_at,
    nullif(trim(p_time_label), ''),
    trim(p_side_a_label),
    trim(p_side_b_label),
    p_score_a,
    p_score_b,
    p_winner_side,
    coalesce(p_source_metadata, '{}'::jsonb)
  )
  on conflict (provenance, legacy_game_id) do update
  set season_id = excluded.season_id,
      source_ref = excluded.source_ref,
      occurred_at = excluded.occurred_at,
      time_label = excluded.time_label,
      side_a_label = excluded.side_a_label,
      side_b_label = excluded.side_b_label,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      winner_side = excluded.winner_side,
      source_metadata = excluded.source_metadata
  returning id into v_match_id;

  delete from public.historical_match_participants hmp
  where hmp.historical_match_id = v_match_id
    and not exists (
      select 1
      from jsonb_array_elements(p_participants) participant
      where (participant->>'athlete_id')::uuid = hmp.athlete_id
    );

  insert into public.historical_match_participants (
    historical_match_id,
    athlete_id,
    side
  )
  select
    v_match_id,
    (participant->>'athlete_id')::uuid,
    participant->>'side'
  from jsonb_array_elements(p_participants) participant
  on conflict (historical_match_id, athlete_id) do update
  set side = excluded.side;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    v_actor,
    'historical_match_result.upserted',
    'historical_match_result',
    v_match_id,
    jsonb_build_object(
      'provenance', trim(p_provenance),
      'legacy_game_id', p_legacy_game_id,
      'occurred_at', p_occurred_at,
      'participant_count', v_participant_count
    ),
    jsonb_build_object('explicit_historical_import', true)
  );

  return v_match_id;
end;
$$;

comment on column public.historical_match_results.occurred_at is
  'Nullable historical event timestamp. UR Play began on 2026-07-28; never infer that date for unrelated games, and never replace an unknown source date with a later event date.';

comment on function public.admin_upsert_historical_match_result(
  uuid,text,integer,timestamptz,text,text,text,smallint,smallint,text,jsonb,jsonb
) is
  'Explicit idempotent import into the isolated historical projection. Dates are evidence-first; UR Play began on 2026-07-28. Does not create Court Ops matches, ranking transactions, ranking entries or UR Coins.';
