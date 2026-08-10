alter table public.athlete_import_rows
  add column if not exists source_timestamp timestamptz,
  add column if not exists legacy_level text,
  add column if not exists legacy_categories_text text,
  add column if not exists active_candidate boolean not null default false;

create or replace function private.admin_stage_athlete_import_batch(
  p_source_type text,
  p_source_ref text,
  p_source_version text,
  p_metadata jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_batch_id uuid;
  v_row jsonb;
  v_status text;
  v_issues jsonb;
begin
  v_actor := private.require_admin_actor();
  if nullif(trim(p_source_type),'') is null or nullif(trim(p_source_ref),'') is null then
    raise exception 'IMPORT_SOURCE_REQUIRED';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'IMPORT_ROWS_REQUIRED';
  end if;

  insert into public.athlete_import_batches(source_type,source_ref,source_version,status,metadata,created_by)
  values(trim(p_source_type),trim(p_source_ref),nullif(trim(p_source_version),''),'review',coalesce(p_metadata,'{}'::jsonb),v_actor)
  returning id into v_batch_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_status := coalesce(v_row->>'validation_status','blocked');
    if v_status not in ('ready','review','blocked') then v_status := 'blocked'; end if;
    v_issues := case when jsonb_typeof(v_row->'issues')='array' then v_row->'issues' else '[]'::jsonb end;

    insert into public.athlete_import_rows(
      batch_id,source_row,source_timestamp,legacy_id,full_name,public_name,birth_date,phone,email,pole_text,
      categories_text,days_text,shifts_text,team_text,experience_text,participation_text,
      payment_declared,legacy_status,legacy_level,legacy_categories_text,active_candidate,
      proposed_gender,validation_status,issues
    ) values (
      v_batch_id,(v_row->>'source_row')::integer,nullif(v_row->>'source_timestamp','')::timestamptz,
      nullif(trim(v_row->>'legacy_id'),''),trim(v_row->>'full_name'),nullif(trim(v_row->>'public_name'),''),
      nullif(v_row->>'birth_date','')::date,nullif(trim(v_row->>'phone'),''),
      nullif(lower(trim(v_row->>'email')),''),nullif(trim(v_row->>'pole_text'),''),
      nullif(trim(v_row->>'categories_text'),''),nullif(trim(v_row->>'days_text'),''),
      nullif(trim(v_row->>'shifts_text'),''),nullif(trim(v_row->>'team_text'),''),
      nullif(trim(v_row->>'experience_text'),''),nullif(trim(v_row->>'participation_text'),''),
      nullif(trim(v_row->>'payment_declared'),''),nullif(trim(v_row->>'legacy_status'),''),
      nullif(trim(v_row->>'legacy_level'),''),nullif(trim(v_row->>'legacy_categories_text'),''),
      coalesce((v_row->>'active_candidate')::boolean,false),'undisclosed'::public.gender_type,
      v_status,v_issues
    );
  end loop;

  perform private.refresh_athlete_import_batch_counts(v_batch_id);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'athlete_import_batch.staged','athlete_import_batch',v_batch_id,
    (select to_jsonb(b) from public.athlete_import_batches b where b.id=v_batch_id),
    jsonb_build_object('source_type',p_source_type,'source_ref',p_source_ref));
  return v_batch_id;
end;
$$;
