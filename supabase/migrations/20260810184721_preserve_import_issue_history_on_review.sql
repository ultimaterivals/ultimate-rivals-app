alter table public.athlete_import_rows
  add column if not exists review_resolution jsonb not null default '{}'::jsonb;

drop function if exists public.admin_review_athlete_import_row(uuid,jsonb,text,jsonb);
drop function if exists private.admin_review_athlete_import_row(uuid,jsonb,text,jsonb);

create function private.admin_review_athlete_import_row(
  p_row_id uuid,
  p_patch jsonb,
  p_validation_status text,
  p_resolution jsonb
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
  if p_resolution is null or jsonb_typeof(p_resolution) <> 'object' then raise exception 'INVALID_IMPORT_REVIEW_RESOLUTION'; end if;
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
    review_resolution = p_resolution,
    reviewed_by = v_actor,
    reviewed_at = now(),
    updated_at = now()
  where id=p_row_id;

  perform private.refresh_athlete_import_batch_counts(v_row.batch_id);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(v_actor,'athlete_import_row.reviewed','athlete_import_row',p_row_id,
    jsonb_build_object('validation_status',v_row.validation_status,'issues',v_row.issues,'review_resolution',v_row.review_resolution),
    (select jsonb_build_object('validation_status',r.validation_status,'issues',r.issues,'review_resolution',r.review_resolution) from public.athlete_import_rows r where r.id=p_row_id),
    jsonb_build_object('batch_id',v_row.batch_id));
end;
$$;

create function public.admin_review_athlete_import_row(
  p_row_id uuid,p_patch jsonb,p_validation_status text,p_resolution jsonb
)
returns void
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_review_athlete_import_row(p_row_id,p_patch,p_validation_status,p_resolution); $$;

revoke all on function public.admin_review_athlete_import_row(uuid,jsonb,text,jsonb) from public,anon;
grant execute on function public.admin_review_athlete_import_row(uuid,jsonb,text,jsonb) to authenticated;
