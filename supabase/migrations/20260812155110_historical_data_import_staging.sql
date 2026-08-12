-- Historical imports are evidence-first. They stage source records for review;
-- they never write ranking projections or the UR Coin ledger.
create table public.historical_import_batches (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in (
    'poles','categories','teams','team_memberships','events','matches','results','statistics'
  )),
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  source_ref text not null check (char_length(trim(source_ref)) between 1 and 500),
  source_version text not null default '',
  source_digest text not null check (source_digest ~ '^[0-9a-f]{32}$'),
  status text not null default 'review' check (status in ('review','approved','imported','cancelled')),
  imported_at timestamptz,
  imported_by uuid references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain, source_type, source_ref, source_version, source_digest)
);

create table public.historical_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.historical_import_batches(id) on delete cascade,
  source_row integer not null check (source_row > 0),
  legacy_id text,
  source_id text,
  occurred_at timestamptz,
  canonical_keys jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  validation_status text not null check (validation_status in ('ready','review','blocked','imported','skipped')),
  issues jsonb not null default '[]'::jsonb,
  imported_entity_id uuid,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, source_row)
);

create index historical_import_rows_batch_status_idx
  on public.historical_import_rows(batch_id, validation_status, source_row);
create index historical_import_rows_legacy_id_idx
  on public.historical_import_rows(legacy_id) where legacy_id is not null;

alter table public.historical_import_batches enable row level security;
alter table public.historical_import_batches force row level security;
alter table public.historical_import_rows enable row level security;
alter table public.historical_import_rows force row level security;

create policy historical_import_batches_admin_all on public.historical_import_batches
  for all to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy historical_import_rows_admin_all on public.historical_import_rows
  for all to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create trigger historical_import_batches_updated_at
before update on public.historical_import_batches
for each row execute function private.set_updated_at();
create trigger historical_import_rows_updated_at
before update on public.historical_import_rows
for each row execute function private.set_updated_at();
create trigger historical_import_batches_audit
after insert or update or delete on public.historical_import_batches
for each row execute function private.capture_audit_log();
create trigger historical_import_rows_audit
after insert or update or delete on public.historical_import_rows
for each row execute function private.capture_audit_log();

create or replace function private.historical_import_row_issues(
  p_domain text,
  p_row jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_issues jsonb := '[]'::jsonb;
begin
  if coalesce(nullif(trim(p_row->>'legacy_id'), ''), nullif(trim(p_row->>'source_id'), '')) is null then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('severity','error','code','SOURCE_ID_REQUIRED'));
  end if;
  if p_domain in ('events','matches','results','statistics') and nullif(p_row->>'occurred_at','') is null then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('severity','error','code','OCCURRED_AT_REQUIRED'));
  end if;
  if p_domain = 'matches' and (
    nullif(p_row->'canonical_keys'->>'home_legacy_id','') is null
    or nullif(p_row->'canonical_keys'->>'away_legacy_id','') is null
  ) then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('severity','error','code','MATCH_PARTICIPANTS_REQUIRED'));
  end if;
  if p_domain = 'results' and (
    nullif(p_row->'canonical_keys'->>'match_legacy_id','') is null
    or nullif(p_row->'payload'->>'winner_side','') is null
  ) then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('severity','error','code','RESULT_EVIDENCE_REQUIRED'));
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
set search_path = 'pg_catalog','public','private'
as $$
declare
  v_row jsonb;
  v_issues jsonb;
  v_total integer := 0;
  v_blocked integer := 0;
begin
  perform private.require_admin_actor();
  if p_domain not in ('poles','categories','teams','team_memberships','events','matches','results','statistics') then raise exception 'HISTORICAL_IMPORT_DOMAIN_INVALID'; end if;
  if nullif(trim(p_source_type),'') is null or nullif(trim(p_source_ref),'') is null then raise exception 'IMPORT_SOURCE_REQUIRED'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'IMPORT_ROWS_REQUIRED'; end if;
  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_total := v_total + 1;
    v_issues := private.historical_import_row_issues(p_domain,v_row);
    if jsonb_array_length(v_issues) > 0 then v_blocked := v_blocked + 1; end if;
  end loop;
  return jsonb_build_object('domain',p_domain,'source_type',p_source_type,'source_ref',p_source_ref,'source_version',coalesce(p_source_version,''),'total_rows',v_total,'ready_rows',v_total-v_blocked,'blocked_rows',v_blocked,'importable',v_blocked=0,'writes',0);
end;
$$;

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
begin
  perform private.admin_historical_import_dry_run(p_domain,p_source_type,p_source_ref,p_source_version,p_rows);
  insert into public.historical_import_batches(domain,source_type,source_ref,source_version,source_digest,metadata,created_by)
  values(p_domain,trim(p_source_type),trim(p_source_ref),coalesce(trim(p_source_version),''),v_digest,coalesce(p_metadata,'{}'::jsonb),v_actor)
  on conflict (domain,source_type,source_ref,source_version,source_digest) do update
    set updated_at=now()
  returning id into v_batch_id;

  if exists(select 1 from public.historical_import_rows where batch_id=v_batch_id) then return v_batch_id; end if;
  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_source_row := v_source_row + 1;
    v_issues := private.historical_import_row_issues(p_domain,v_row);
    insert into public.historical_import_rows(batch_id,source_row,legacy_id,source_id,occurred_at,canonical_keys,evidence,payload,validation_status,issues)
    values(v_batch_id,coalesce((v_row->>'source_row')::integer,v_source_row),nullif(trim(v_row->>'legacy_id'),''),nullif(trim(v_row->>'source_id'),''),nullif(v_row->>'occurred_at','')::timestamptz,coalesce(v_row->'canonical_keys','{}'::jsonb),coalesce(v_row->'evidence','{}'::jsonb),v_row,case when jsonb_array_length(v_issues)=0 then 'ready' else 'blocked' end,v_issues);
  end loop;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'historical_import_batch.staged','historical_import_batch',v_batch_id,jsonb_build_object('rows',v_source_row),jsonb_build_object('domain',p_domain,'source_type',p_source_type,'source_ref',p_source_ref,'source_version',coalesce(p_source_version,''),'dry_run',false));
  return v_batch_id;
end;
$$;

create or replace function public.admin_historical_import_dry_run(p_domain text,p_source_type text,p_source_ref text,p_source_version text,p_rows jsonb)
returns jsonb language sql set search_path = 'pg_catalog','public','private'
as $$ select private.admin_historical_import_dry_run(p_domain,p_source_type,p_source_ref,p_source_version,p_rows); $$;
create or replace function public.admin_stage_historical_import_batch(p_domain text,p_source_type text,p_source_ref text,p_source_version text,p_metadata jsonb,p_rows jsonb)
returns uuid language sql set search_path = 'pg_catalog','public','private'
as $$ select private.admin_stage_historical_import_batch(p_domain,p_source_type,p_source_ref,p_source_version,p_metadata,p_rows); $$;

revoke all on function public.admin_historical_import_dry_run(text,text,text,text,jsonb) from public,anon;
revoke all on function public.admin_stage_historical_import_batch(text,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.admin_historical_import_dry_run(text,text,text,text,jsonb) to authenticated;
grant execute on function public.admin_stage_historical_import_batch(text,text,text,text,jsonb,jsonb) to authenticated;
