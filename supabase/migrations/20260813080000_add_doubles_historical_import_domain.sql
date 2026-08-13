-- Align the historical import contract with the documented doubles.csv pipeline.
-- Doubles are staged only; this migration does not create formations, rankings,
-- memberships or historical competitive transactions.

create or replace function private.historical_import_row_issues(p_domain text, p_row jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_issues jsonb := '[]'::jsonb;
begin
  if coalesce(
    nullif(trim(p_row->>'legacy_id'), ''),
    nullif(trim(p_row->>'source_id'), '')
  ) is null then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'SOURCE_ID_REQUIRED')
    );
  end if;

  if p_domain in ('events', 'matches', 'results', 'statistics')
    and nullif(p_row->>'occurred_at', '') is null then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'OCCURRED_AT_REQUIRED')
    );
  end if;

  if p_domain = 'doubles' and (
    nullif(p_row->'canonical_keys'->>'athlete_one_id', '') is null
    or nullif(p_row->'canonical_keys'->>'athlete_two_id', '') is null
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'DOUBLE_MEMBERS_REQUIRED')
    );
  end if;

  if p_domain = 'doubles'
    and nullif(p_row->'canonical_keys'->>'athlete_one_id', '') is not null
    and p_row->'canonical_keys'->>'athlete_one_id'
      = p_row->'canonical_keys'->>'athlete_two_id' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'DOUBLE_MEMBERS_MUST_DIFFER')
    );
  end if;

  if p_domain = 'doubles' and coalesce(p_row->'evidence', '{}'::jsonb) = '{}'::jsonb then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'DOUBLE_EVIDENCE_REQUIRED')
    );
  end if;

  if p_domain = 'matches' and (
    nullif(p_row->'canonical_keys'->>'home_legacy_id', '') is null
    or nullif(p_row->'canonical_keys'->>'away_legacy_id', '') is null
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'MATCH_PARTICIPANTS_REQUIRED')
    );
  end if;

  if p_domain = 'results' and (
    nullif(p_row->'canonical_keys'->>'match_legacy_id', '') is null
    or nullif(p_row->'payload'->>'winner_side', '') is null
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('severity', 'error', 'code', 'RESULT_EVIDENCE_REQUIRED')
    );
  end if;

  return v_issues;
end;
$$;

create or replace function private.admin_historical_import_dry_run(
  p_domain text,
  p_source_type text,
  p_source_ref text,
  p_source_version text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_row jsonb;
  v_issues jsonb;
  v_total integer := 0;
  v_blocked integer := 0;
begin
  perform private.require_admin_actor();

  if p_domain not in (
    'poles',
    'categories',
    'teams',
    'doubles',
    'team_memberships',
    'events',
    'matches',
    'results',
    'statistics'
  ) then
    raise exception 'HISTORICAL_IMPORT_DOMAIN_INVALID';
  end if;

  if nullif(trim(p_source_type), '') is null
    or nullif(trim(p_source_ref), '') is null then
    raise exception 'IMPORT_SOURCE_REQUIRED';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'IMPORT_ROWS_REQUIRED';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_total := v_total + 1;
    v_issues := private.historical_import_row_issues(p_domain, v_row);
    if jsonb_array_length(v_issues) > 0 then
      v_blocked := v_blocked + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'domain', p_domain,
    'source_type', p_source_type,
    'source_ref', p_source_ref,
    'source_version', coalesce(p_source_version, ''),
    'total_rows', v_total,
    'ready_rows', v_total - v_blocked,
    'blocked_rows', v_blocked,
    'importable', v_blocked = 0,
    'writes', 0
  );
end;
$$;
