create or replace function public.admin_import_historical_ranking_aggregate(
  p_season_id uuid,
  p_source_ref text,
  p_individual jsonb,
  p_doubles jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid;
  v_run_id uuid;
  v_source_id uuid;
  v_operation_id uuid;
  v_individual_rows integer;
  v_double_rows integer;
  v_resolved_individual integer;
  v_resolved_doubles integer;
  v_transaction_count integer;
begin
  v_actor := private.require_admin_actor();

  if p_season_id is null or not exists (
    select 1 from public.seasons where id = p_season_id
  ) then
    raise exception 'HISTORICAL_RANKING_SEASON_INVALID';
  end if;

  if nullif(trim(p_source_ref), '') is null then
    raise exception 'HISTORICAL_RANKING_SOURCE_REQUIRED';
  end if;

  if jsonb_typeof(p_individual) <> 'array' or jsonb_typeof(p_doubles) <> 'array' then
    raise exception 'HISTORICAL_RANKING_ROWS_REQUIRED';
  end if;

  v_individual_rows := jsonb_array_length(p_individual);
  v_double_rows := jsonb_array_length(p_doubles);
  v_source_id := md5('historical-ranking-source|' || p_source_ref)::uuid;
  v_operation_id := md5('historical-ranking-operation|' || p_season_id::text || '|' || p_source_ref)::uuid;

  select count(*)
  into v_resolved_individual
  from jsonb_to_recordset(p_individual) as src(
    athlete_code text,
    participations integer,
    wins integer,
    losses integer,
    aces integer,
    attacks integer
  )
  join public.athletes a on a.athlete_code = src.athlete_code;

  if v_resolved_individual <> v_individual_rows then
    raise exception 'HISTORICAL_RANKING_ATHLETE_UNRESOLVED';
  end if;

  select count(*)
  into v_resolved_doubles
  from jsonb_to_recordset(p_doubles) as src(
    display_name text,
    wins integer,
    losses integer,
    aces integer,
    attacks integer
  )
  join public.competition_formations cf
    on cf.season_id = p_season_id
   and cf.display_name = src.display_name
   and cf.status = 'active';

  if v_resolved_doubles <> v_double_rows then
    raise exception 'HISTORICAL_RANKING_FORMATION_UNRESOLVED';
  end if;

  insert into public.ranking_processing_runs(
    source_type,
    source_id,
    status,
    input_fingerprint,
    client_operation_id,
    created_by,
    metadata
  ) values (
    'ranking_transaction',
    v_source_id,
    'processing',
    md5(p_individual::text || '|' || p_doubles::text),
    v_operation_id,
    v_actor,
    jsonb_build_object(
      'origin', 'historical_import',
      'source_ref', p_source_ref,
      'historical_date_unresolved', true,
      'individual_rows', v_individual_rows,
      'double_rows', v_double_rows
    )
  )
  on conflict (client_operation_id) do update set
    metadata = excluded.metadata,
    input_fingerprint = excluded.input_fingerprint
  returning id into v_run_id;

  with rules as (
    select distinct on (rule_code)
      id,
      rule_code,
      points,
      version
    from public.ranking_rules
    where active = true
      and rule_code in ('PARTICIPATION', 'WIN', 'LOSS', 'ACE', 'ATTACK')
      and (season_id is null or season_id = p_season_id)
    order by rule_code, (season_id is not null) desc, version desc
  ), source_rows as (
    select *
    from jsonb_to_recordset(p_individual) as src(
      athlete_code text,
      participations integer,
      wins integer,
      losses integer,
      aces integer,
      attacks integer
    )
  ), events as (
    select
      a.id as athlete_id,
      src.athlete_code,
      event.rule_code,
      occurrence.n
    from source_rows src
    join public.athletes a on a.athlete_code = src.athlete_code
    cross join lateral (
      values
        ('PARTICIPATION', greatest(coalesce(src.participations, 0), 0)),
        ('WIN', greatest(coalesce(src.wins, 0), 0)),
        ('LOSS', greatest(coalesce(src.losses, 0), 0)),
        ('ACE', greatest(coalesce(src.aces, 0), 0)),
        ('ATTACK', greatest(coalesce(src.attacks, 0), 0))
    ) event(rule_code, event_count)
    cross join lateral generate_series(1, event.event_count) occurrence(n)
  )
  insert into public.ranking_transactions(
    season_id,
    athlete_id,
    source_type,
    source_id,
    rule_id,
    rule_code,
    rule_version,
    points,
    points_applied,
    transaction_type,
    transaction_scope,
    status,
    event_context,
    event_context_data,
    metadata,
    processing_run_id,
    created_by,
    homologated_at,
    homologated_by
  )
  select
    p_season_id,
    e.athlete_id,
    'ranking_transaction',
    md5('individual|' || p_source_ref || '|' || e.athlete_code || '|' || e.rule_code || '|' || e.n::text)::uuid,
    r.id,
    r.rule_code,
    r.version,
    r.points,
    r.points,
    'earn',
    'athlete',
    'homologated',
    'ur_play',
    jsonb_build_object('historical_date_unresolved', true),
    jsonb_build_object(
      'origin', 'historical_import',
      'source_ref', p_source_ref,
      'scope', 'individual',
      'athlete_code', e.athlete_code,
      'occurrence', e.n
    ),
    v_run_id,
    v_actor,
    now(),
    v_actor
  from events e
  join rules r on r.rule_code = e.rule_code
  on conflict do nothing;

  with rules as (
    select distinct on (rule_code)
      id,
      rule_code,
      points,
      version
    from public.ranking_rules
    where active = true
      and rule_code in ('WIN', 'LOSS', 'ACE', 'ATTACK')
      and (season_id is null or season_id = p_season_id)
    order by rule_code, (season_id is not null) desc, version desc
  ), source_rows as (
    select *
    from jsonb_to_recordset(p_doubles) as src(
      display_name text,
      wins integer,
      losses integer,
      aces integer,
      attacks integer
    )
  ), events as (
    select
      cf.id as formation_id,
      cf.team_id,
      cf.pole_id,
      src.display_name,
      event.rule_code,
      occurrence.n
    from source_rows src
    join public.competition_formations cf
      on cf.season_id = p_season_id
     and cf.display_name = src.display_name
     and cf.status = 'active'
    cross join lateral (
      values
        ('WIN', greatest(coalesce(src.wins, 0), 0)),
        ('LOSS', greatest(coalesce(src.losses, 0), 0)),
        ('ACE', greatest(coalesce(src.aces, 0), 0)),
        ('ATTACK', greatest(coalesce(src.attacks, 0), 0))
    ) event(rule_code, event_count)
    cross join lateral generate_series(1, event.event_count) occurrence(n)
  )
  insert into public.ranking_transactions(
    season_id,
    team_id,
    pole_id,
    source_type,
    source_id,
    rule_id,
    rule_code,
    rule_version,
    points,
    points_applied,
    transaction_type,
    transaction_scope,
    status,
    event_context,
    event_context_data,
    metadata,
    processing_run_id,
    created_by,
    homologated_at,
    homologated_by,
    formation_id
  )
  select
    p_season_id,
    e.team_id,
    e.pole_id,
    'ranking_transaction',
    md5('doubles|' || p_source_ref || '|' || e.display_name || '|' || e.rule_code || '|' || e.n::text)::uuid,
    r.id,
    r.rule_code,
    r.version,
    r.points,
    r.points,
    'earn',
    'side',
    'homologated',
    'ur_play',
    jsonb_build_object('historical_date_unresolved', true),
    jsonb_build_object(
      'origin', 'historical_import',
      'source_ref', p_source_ref,
      'scope', 'doubles',
      'formation', e.display_name,
      'occurrence', e.n
    ),
    v_run_id,
    v_actor,
    now(),
    v_actor,
    e.formation_id
  from events e
  join rules r on r.rule_code = e.rule_code
  on conflict do nothing;

  select count(*)::integer
  into v_transaction_count
  from public.ranking_transactions
  where processing_run_id = v_run_id;

  update public.ranking_processing_runs
  set status = 'completed',
      completed_at = now(),
      transaction_count = v_transaction_count
  where id = v_run_id;

  perform private.refresh_all_rankings(p_season_id);

  return jsonb_build_object(
    'processing_run_id', v_run_id,
    'individual_rows', v_individual_rows,
    'double_rows', v_double_rows,
    'transaction_count', v_transaction_count,
    'writes_are_idempotent', true
  );
exception
  when others then
    if v_run_id is not null then
      update public.ranking_processing_runs
      set status = 'failed',
          completed_at = now(),
          error = sqlerrm
      where id = v_run_id;
    end if;
    raise;
end;
$$;

revoke all on function public.admin_import_historical_ranking_aggregate(uuid, text, jsonb, jsonb) from public;
grant execute on function public.admin_import_historical_ranking_aggregate(uuid, text, jsonb, jsonb) to authenticated;
