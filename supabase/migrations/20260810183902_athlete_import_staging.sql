create table if not exists public.athlete_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_ref text not null,
  source_version text,
  status text not null default 'draft' check (status in ('draft','review','approved','completed','cancelled')),
  total_rows integer not null default 0 check (total_rows >= 0),
  ready_rows integer not null default 0 check (ready_rows >= 0),
  review_rows integer not null default 0 check (review_rows >= 0),
  blocked_rows integer not null default 0 check (blocked_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.athlete_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.athlete_import_batches(id) on delete cascade,
  source_row integer not null check (source_row > 0),
  legacy_id text,
  full_name text not null,
  public_name text,
  birth_date date,
  phone text,
  email text,
  pole_text text,
  categories_text text,
  days_text text,
  shifts_text text,
  team_text text,
  experience_text text,
  participation_text text,
  payment_declared text,
  legacy_status text,
  proposed_gender public.gender_type not null default 'undisclosed'::public.gender_type,
  validation_status text not null check (validation_status in ('ready','review','blocked','imported','skipped')),
  issues jsonb not null default '[]'::jsonb,
  imported_athlete_id uuid references public.athletes(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(batch_id,source_row)
);

create index if not exists athlete_import_rows_batch_status_idx
  on public.athlete_import_rows(batch_id,validation_status,source_row);
create index if not exists athlete_import_rows_email_idx
  on public.athlete_import_rows(lower(email)) where email is not null;
create index if not exists athlete_import_rows_phone_idx
  on public.athlete_import_rows(phone) where phone is not null;

alter table public.athlete_import_batches enable row level security;
alter table public.athlete_import_rows enable row level security;

create policy athlete_import_batches_admin_all on public.athlete_import_batches
  for all to authenticated
  using (private.has_any_role(array['admin'::app_role]))
  with check (private.has_any_role(array['admin'::app_role]));
create policy athlete_import_rows_admin_all on public.athlete_import_rows
  for all to authenticated
  using (private.has_any_role(array['admin'::app_role]))
  with check (private.has_any_role(array['admin'::app_role]));

create or replace function private.refresh_athlete_import_batch_counts(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
begin
  update public.athlete_import_batches b
  set total_rows = x.total_rows,
      ready_rows = x.ready_rows,
      review_rows = x.review_rows,
      blocked_rows = x.blocked_rows,
      imported_rows = x.imported_rows,
      updated_at = now()
  from (
    select count(*)::integer total_rows,
           count(*) filter (where validation_status='ready')::integer ready_rows,
           count(*) filter (where validation_status='review')::integer review_rows,
           count(*) filter (where validation_status='blocked')::integer blocked_rows,
           count(*) filter (where validation_status='imported')::integer imported_rows
    from public.athlete_import_rows
    where batch_id=p_batch_id
  ) x
  where b.id=p_batch_id;
end;
$$;

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
      batch_id,source_row,legacy_id,full_name,public_name,birth_date,phone,email,pole_text,
      categories_text,days_text,shifts_text,team_text,experience_text,participation_text,
      payment_declared,legacy_status,proposed_gender,validation_status,issues
    ) values (
      v_batch_id,(v_row->>'source_row')::integer,nullif(trim(v_row->>'legacy_id'),''),
      trim(v_row->>'full_name'),nullif(trim(v_row->>'public_name'),''),
      nullif(v_row->>'birth_date','')::date,nullif(trim(v_row->>'phone'),''),
      nullif(lower(trim(v_row->>'email')),''),nullif(trim(v_row->>'pole_text'),''),
      nullif(trim(v_row->>'categories_text'),''),nullif(trim(v_row->>'days_text'),''),
      nullif(trim(v_row->>'shifts_text'),''),nullif(trim(v_row->>'team_text'),''),
      nullif(trim(v_row->>'experience_text'),''),nullif(trim(v_row->>'participation_text'),''),
      nullif(trim(v_row->>'payment_declared'),''),nullif(trim(v_row->>'legacy_status'),''),
      'undisclosed'::public.gender_type,v_status,v_issues
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

create or replace function public.admin_stage_athlete_import_batch(
  p_source_type text,p_source_ref text,p_source_version text,p_metadata jsonb,p_rows jsonb
)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_stage_athlete_import_batch(p_source_type,p_source_ref,p_source_version,p_metadata,p_rows); $$;

revoke all on function public.admin_stage_athlete_import_batch(text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.admin_stage_athlete_import_batch(text,text,text,jsonb,jsonb) to authenticated;
