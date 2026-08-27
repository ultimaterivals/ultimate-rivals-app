-- Historical import staging must preserve unknown dates as null and reject
-- known placeholder dates before writing any staging row.
create or replace function private.admin_stage_historical_import_batch(
  p_domain text,
  p_source_type text,
  p_source_ref text,
  p_source_version text,
  p_metadata jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog','public','private'
as $$
declare
  v_actor uuid := private.require_admin_actor();
  v_batch_id uuid;
  v_row jsonb;
  v_issues jsonb;
  v_digest text := md5(coalesce(p_rows,'[]'::jsonb)::text);
  v_source_row integer := 0;
  v_occurred_at timestamptz;
begin
  perform private.admin_historical_import_dry_run(
    p_domain,
    p_source_type,
    p_source_ref,
    p_source_version,
    p_rows
  );

  insert into public.historical_import_batches(
    domain,
    source_type,
    source_ref,
    source_version,
    source_digest,
    metadata,
    created_by
  )
  values(
    p_domain,
    trim(p_source_type),
    trim(p_source_ref),
    coalesce(trim(p_source_version),''),
    v_digest,
    coalesce(p_metadata,'{}'::jsonb),
    v_actor
  )
  on conflict (domain,source_type,source_ref,source_version,source_digest) do update
    set updated_at = now()
  returning id into v_batch_id;

  if exists (
    select 1
    from public.historical_import_rows
    where batch_id = v_batch_id
  ) then
    return v_batch_id;
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_source_row := v_source_row + 1;
    v_issues := private.historical_import_row_issues(p_domain,v_row);
    v_occurred_at := null;

    if nullif(trim(v_row->>'occurred_at'), '') is not null
      and not exists (
        select 1
        from jsonb_array_elements(v_issues) issue
        where issue->>'code' in ('INVALID_OCCURRED_AT','PLACEHOLDER_DATE_FORBIDDEN')
      ) then
      v_occurred_at := (v_row->>'occurred_at')::timestamptz;
    end if;

    insert into public.historical_import_rows(
      batch_id,
      source_row,
      legacy_id,
      source_id,
      occurred_at,
      canonical_keys,
      evidence,
      payload,
      validation_status,
      issues
    )
    values(
      v_batch_id,
      coalesce((v_row->>'source_row')::integer,v_source_row),
      nullif(trim(v_row->>'legacy_id'),''),
      nullif(trim(v_row->>'source_id'),''),
      v_occurred_at,
      coalesce(v_row->'canonical_keys','{}'::jsonb),
      coalesce(v_row->'evidence','{}'::jsonb),
      v_row,
      case when jsonb_array_length(v_issues)=0 then 'ready' else 'blocked' end,
      v_issues
    );
  end loop;

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values(
    v_actor,
    'historical_import_batch.staged',
    'historical_import_batch',
    v_batch_id,
    jsonb_build_object('rows',v_source_row),
    jsonb_build_object(
      'domain',p_domain,
      'source_type',p_source_type,
      'source_ref',p_source_ref,
      'source_version',coalesce(p_source_version,''),
      'dry_run',false
    )
  );

  return v_batch_id;
end;
$$;
