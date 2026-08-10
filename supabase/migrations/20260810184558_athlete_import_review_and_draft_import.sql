create or replace function private.admin_review_athlete_import_row(
  p_row_id uuid,
  p_patch jsonb,
  p_validation_status text,
  p_issues jsonb
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_row public.athlete_import_rows%rowtype;
  v_status text := lower(trim(p_validation_status));
begin
  v_actor := private.require_admin_actor();
  if v_status not in ('ready','review','blocked','skipped') then raise exception 'INVALID_IMPORT_REVIEW_STATUS'; end if;
  if p_issues is null or jsonb_typeof(p_issues) <> 'array' then raise exception 'INVALID_IMPORT_ISSUES'; end if;
  select * into v_row from public.athlete_import_rows where id=p_row_id for update;
  if not found then raise exception 'IMPORT_ROW_NOT_FOUND'; end if;
  if v_row.validation_status='imported' then raise exception 'IMPORT_ROW_ALREADY_IMPORTED'; end if;

  update public.athlete_import_rows set
    full_name = coalesce(nullif(trim(p_patch->>'full_name'),''), full_name),
    public_name = case when p_patch ? 'public_name' then nullif(trim(p_patch->>'public_name'),'') else public_name end,
    birth_date = case when p_patch ? 'birth_date' then nullif(p_patch->>'birth_date','')::date else birth_date end,
    phone = case when p_patch ? 'phone' then nullif(trim(p_patch->>'phone'),'') else phone end,
    email = case when p_patch ? 'email' then nullif(lower(trim(p_patch->>'email')),'') else email end,
    pole_text = case when p_patch ? 'pole_text' then nullif(trim(p_patch->>'pole_text'),'') else pole_text end,
    categories_text = case when p_patch ? 'categories_text' then nullif(trim(p_patch->>'categories_text'),'') else categories_text end,
    days_text = case when p_patch ? 'days_text' then nullif(trim(p_patch->>'days_text'),'') else days_text end,
    shifts_text = case when p_patch ? 'shifts_text' then nullif(trim(p_patch->>'shifts_text'),'') else shifts_text end,
    team_text = case when p_patch ? 'team_text' then nullif(trim(p_patch->>'team_text'),'') else team_text end,
    experience_text = case when p_patch ? 'experience_text' then nullif(trim(p_patch->>'experience_text'),'') else experience_text end,
    validation_status = v_status,
    issues = p_issues,
    reviewed_by = v_actor,
    reviewed_at = now(),
    updated_at = now()
  where id=p_row_id;

  perform private.refresh_athlete_import_batch_counts(v_row.batch_id);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'athlete_import_row.reviewed','athlete_import_row',p_row_id,
    (select to_jsonb(r) - 'phone' - 'email' from public.athlete_import_rows r where r.id=p_row_id),
    jsonb_build_object('batch_id',v_row.batch_id,'validation_status',v_status));
end;
$$;

create or replace function public.admin_review_athlete_import_row(
  p_row_id uuid,p_patch jsonb,p_validation_status text,p_issues jsonb
)
returns void
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_review_athlete_import_row(p_row_id,p_patch,p_validation_status,p_issues); $$;

revoke all on function public.admin_review_athlete_import_row(uuid,jsonb,text,jsonb) from public,anon;
grant execute on function public.admin_review_athlete_import_row(uuid,jsonb,text,jsonb) to authenticated;

create or replace function private.admin_import_athlete_staging_row(p_row_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_row public.athlete_import_rows%rowtype;
  v_pole_id uuid;
  v_athlete_id uuid;
  v_public_name text;
  v_duplicate uuid;
begin
  v_actor := private.require_admin_actor();
  select * into v_row from public.athlete_import_rows where id=p_row_id for update;
  if not found then raise exception 'IMPORT_ROW_NOT_FOUND'; end if;
  if v_row.validation_status='imported' and v_row.imported_athlete_id is not null then return v_row.imported_athlete_id; end if;
  if v_row.validation_status<>'ready' then raise exception 'IMPORT_ROW_NOT_READY'; end if;
  if nullif(trim(v_row.full_name),'') is null then raise exception 'IMPORT_FULL_NAME_REQUIRED'; end if;
  v_public_name := coalesce(nullif(trim(v_row.public_name),''), trim(v_row.full_name));
  if v_row.birth_date is not null and v_row.birth_date > current_date then raise exception 'IMPORT_INVALID_BIRTH_DATE'; end if;

  if v_row.pole_text is not null then
    select p.id into v_pole_id from public.poles p
    where p.status='active'::entity_status
      and (lower(trim(p.name))=lower(trim(v_row.pole_text)) or lower(trim(p.city))=lower(trim(v_row.pole_text)))
    order by case when lower(trim(p.name))=lower(trim(v_row.pole_text)) then 0 else 1 end, p.created_at
    limit 1;
    if v_pole_id is null then raise exception 'IMPORT_POLE_NOT_ACTIVE:%', v_row.pole_text; end if;
  end if;

  select a.id into v_duplicate from public.athletes a
  where (v_row.email is not null and a.email_contact is not null and lower(a.email_contact)=lower(v_row.email))
     or (v_row.phone is not null and a.phone=v_row.phone)
     or (v_row.birth_date is not null and lower(trim(a.full_name))=lower(trim(v_row.full_name)) and a.birth_date=v_row.birth_date)
  limit 1;
  if v_duplicate is not null then raise exception 'IMPORT_DUPLICATE_ATHLETE:%', v_duplicate; end if;

  insert into public.athletes(full_name,public_name,birth_date,gender,phone,email_contact,primary_pole_id,status)
  values(trim(v_row.full_name),v_public_name,v_row.birth_date,'undisclosed'::gender_type,
    v_row.phone,v_row.email,v_pole_id,'draft'::athlete_status)
  returning id into v_athlete_id;

  update public.athlete_import_rows set
    validation_status='imported',imported_athlete_id=v_athlete_id,
    reviewed_by=coalesce(reviewed_by,v_actor),reviewed_at=coalesce(reviewed_at,now()),updated_at=now()
  where id=p_row_id;
  perform private.refresh_athlete_import_batch_counts(v_row.batch_id);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'athlete_import_row.imported','athlete',v_athlete_id,
    jsonb_build_object('status','draft','source_row',v_row.source_row,'batch_id',v_row.batch_id),
    jsonb_build_object('import_row_id',p_row_id,'legacy_id',v_row.legacy_id));
  return v_athlete_id;
end;
$$;

create or replace function public.admin_import_athlete_staging_row(p_row_id uuid)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_import_athlete_staging_row(p_row_id); $$;

revoke all on function public.admin_import_athlete_staging_row(uuid) from public,anon;
grant execute on function public.admin_import_athlete_staging_row(uuid) to authenticated;
