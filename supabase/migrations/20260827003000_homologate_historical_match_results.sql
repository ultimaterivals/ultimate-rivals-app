-- Homologates the historical read model without connecting it to Court Ops,
-- ranking or UR Coins. Historical records remain an isolated, evidence-first
-- projection until an explicit downstream flow is executed.

alter table public.historical_match_results
  add column if not exists provenance text;

update public.historical_match_results
set provenance = source_ref
where provenance is null or nullif(trim(provenance), '') is null;

alter table public.historical_match_results
  alter column provenance set not null;

create unique index if not exists historical_match_results_provenance_legacy_idx
  on public.historical_match_results(provenance, legacy_game_id);

-- 28/08/2026 is not a valid historical fallback. Existing placeholder values
-- are deliberately converted to unknown rather than preserved as false facts.
update public.historical_match_results
set occurred_at = null
where occurred_at is not null
  and (occurred_at at time zone 'America/Sao_Paulo')::date = date '2026-08-28';

update public.historical_import_rows
set occurred_at = null
where occurred_at is not null
  and (occurred_at at time zone 'America/Sao_Paulo')::date = date '2026-08-28';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'historical_match_results_no_placeholder_20260828'
      and conrelid = 'public.historical_match_results'::regclass
  ) then
    alter table public.historical_match_results
      add constraint historical_match_results_no_placeholder_20260828
      check (
        occurred_at is null
        or (occurred_at at time zone 'America/Sao_Paulo')::date <> date '2026-08-28'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'historical_import_rows_no_placeholder_20260828'
      and conrelid = 'public.historical_import_rows'::regclass
  ) then
    alter table public.historical_import_rows
      add constraint historical_import_rows_no_placeholder_20260828
      check (
        occurred_at is null
        or (occurred_at at time zone 'America/Sao_Paulo')::date <> date '2026-08-28'
      );
  end if;
end;
$$;

-- Unknown historical dates are valid. Supplied dates are validated and the
-- forbidden 28/08/2026 placeholder is rejected.
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
      if (v_occurred_at at time zone 'America/Sao_Paulo')::date = date '2026-08-28' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('severity','error','code','PLACEHOLDER_DATE_FORBIDDEN')
        );
      end if;
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

-- Raw tables contain operational provenance and participant identifiers.
-- Athlete-facing access is therefore RPC-only with an explicit safe shape.
revoke select on public.historical_match_results from anon, authenticated;
revoke select on public.historical_match_participants from anon, authenticated;
revoke insert, update, delete on public.historical_match_results from anon, authenticated;
revoke insert, update, delete on public.historical_match_participants from anon, authenticated;

create or replace function public.get_athlete_historical_match_results(
  p_athlete_id uuid
)
returns table (
  id uuid,
  legacy_game_id integer,
  occurred_at timestamptz,
  provenance text,
  side_a_label text,
  side_b_label text,
  score_a smallint,
  score_b smallint,
  winner_side text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and a.profile_id = v_user_id
  ) and not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'historical results access denied' using errcode = '42501';
  end if;

  return query
  select
    hmr.id,
    hmr.legacy_game_id,
    hmr.occurred_at,
    hmr.provenance,
    hmr.side_a_label,
    hmr.side_b_label,
    hmr.score_a,
    hmr.score_b,
    hmr.winner_side
  from public.historical_match_results hmr
  where exists (
    select 1
    from public.historical_match_participants hmp
    where hmp.historical_match_id = hmr.id
      and hmp.athlete_id = p_athlete_id
  )
  order by hmr.legacy_game_id desc
  limit 100;
end;
$$;

revoke all on function public.get_athlete_historical_match_results(uuid) from public, anon;
grant execute on function public.get_athlete_historical_match_results(uuid) to authenticated;

-- Final historical import is explicit and idempotent by provenance + legacy ID.
-- It writes only the isolated historical projection and its participants.
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

  if p_occurred_at is not null
    and (p_occurred_at at time zone 'America/Sao_Paulo')::date = date '2026-08-28' then
    raise exception 'HISTORICAL_PLACEHOLDER_DATE_FORBIDDEN';
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

revoke all on function public.admin_upsert_historical_match_result(
  uuid,text,integer,timestamptz,text,text,text,smallint,smallint,text,jsonb,jsonb
) from public, anon;
grant execute on function public.admin_upsert_historical_match_result(
  uuid,text,integer,timestamptz,text,text,text,smallint,smallint,text,jsonb,jsonb
) to authenticated;

comment on column public.historical_match_results.provenance is
  'Stable external/source provenance paired with legacy_game_id for historical identity and idempotent import.';
comment on function public.get_athlete_historical_match_results(uuid) is
  'Safe athlete read model. Returns only participated historical matches and no internal metadata.';
comment on function public.admin_upsert_historical_match_result(
  uuid,text,integer,timestamptz,text,text,text,smallint,smallint,text,jsonb,jsonb
) is
  'Explicit idempotent import into the isolated historical projection. Does not create Court Ops matches, ranking transactions, ranking entries or UR Coins.';
