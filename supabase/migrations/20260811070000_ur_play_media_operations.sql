create table if not exists public.ur_play_media_deliverables (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  deliverable_key text not null,
  status text not null default 'pending',
  blocking boolean not null default true,
  due_at timestamptz not null,
  channel text,
  publication_url text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_media_deliverables_unique unique(session_id,deliverable_key),
  constraint ur_play_media_deliverable_key_check check (
    deliverable_key in (
      'result_summary',
      'photo_carousel',
      'athlete_highlights',
      'best_moments',
      'ranking_update',
      'next_event_announcement'
    )
  ),
  constraint ur_play_media_deliverable_status_check check (
    status in ('pending','in_progress','published','waived')
  ),
  constraint ur_play_media_deliverable_channel_check check (
    channel is null or channel in (
      'instagram_post','instagram_story','reel','youtube','whatsapp','app','other'
    )
  ),
  constraint ur_play_media_deliverable_publication_check check (
    status <> 'published' or (
      published_at is not null
      and published_by is not null
      and channel is not null
      and (
        nullif(trim(coalesce(publication_url,'')),'') is not null
        or media_asset_id is not null
      )
    )
  ),
  constraint ur_play_media_deliverable_waiver_check check (
    status <> 'waived' or (
      waived_at is not null
      and waived_by is not null
      and char_length(trim(coalesce(waiver_reason,''))) >= 10
    )
  )
);

create index if not exists ur_play_media_deliverables_session_idx
  on public.ur_play_media_deliverables(session_id,status,due_at);

alter table public.ur_play_media_deliverables enable row level security;

revoke all on table public.ur_play_media_deliverables from public, anon;
grant select on table public.ur_play_media_deliverables to authenticated, service_role;

create policy ur_play_media_deliverables_read
on public.ur_play_media_deliverables
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.assert_ur_play_media_mutable(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if exists (
    select 1
    from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
end;
$function$;

revoke all on function private.assert_ur_play_media_mutable(uuid)
  from public, anon, authenticated;
grant execute on function private.assert_ur_play_media_mutable(uuid)
  to service_role;

create or replace function private.ensure_ur_play_media_deliverables(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
begin
  select * into v_session
  from public.ur_play_sessions
  where id=target_session;

  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  if v_session.status <> 'completed' then
    return;
  end if;

  perform private.ensure_ur_play_post_session_tasks(target_session);

  insert into public.ur_play_media_deliverables(
    session_id,deliverable_key,status,blocking,due_at
  ) values
    (target_session,'result_summary','pending',true,v_session.ends_at + interval '4 hours'),
    (target_session,'photo_carousel','pending',true,v_session.ends_at + interval '24 hours'),
    (target_session,'athlete_highlights','pending',true,v_session.ends_at + interval '24 hours'),
    (target_session,'best_moments','pending',true,v_session.ends_at + interval '48 hours'),
    (target_session,'ranking_update','pending',true,v_session.ends_at + interval '48 hours'),
    (target_session,'next_event_announcement','pending',false,v_session.ends_at + interval '7 days')
  on conflict(session_id,deliverable_key) do nothing;

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    blocking=true,
    due_at=v_session.ends_at + interval '48 hours',
    updated_at=now()
  where session_id=target_session and task_key='media';
end;
$function$;

revoke all on function private.ensure_ur_play_media_deliverables(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_ur_play_media_deliverables(uuid)
  to service_role;

create or replace function private.refresh_ur_play_media_deliverables(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_total integer := 0;
  v_blocking integer := 0;
  v_published integer := 0;
  v_waived integer := 0;
  v_pending integer := 0;
  v_overdue integer := 0;
  v_nonblocking_pending integer := 0;
  v_ready boolean := false;
begin
  perform private.ensure_ur_play_media_deliverables(target_session);

  select
    count(*)::integer,
    count(*) filter(where blocking)::integer,
    count(*) filter(where status='published')::integer,
    count(*) filter(where status='waived')::integer,
    count(*) filter(where blocking and status not in ('published','waived'))::integer,
    count(*) filter(where blocking and status not in ('published','waived') and due_at<now())::integer,
    count(*) filter(where not blocking and status not in ('published','waived'))::integer
  into
    v_total,
    v_blocking,
    v_published,
    v_waived,
    v_pending,
    v_overdue,
    v_nonblocking_pending
  from public.ur_play_media_deliverables
  where session_id=target_session;

  v_ready := v_blocking=5 and v_pending=0;

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    status=case when v_ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object(
      'total_deliverables',v_total,
      'blocking_deliverables',v_blocking,
      'published_deliverables',v_published,
      'waived_deliverables',v_waived,
      'pending_blocking_deliverables',v_pending,
      'overdue_blocking_deliverables',v_overdue,
      'nonblocking_pending_deliverables',v_nonblocking_pending,
      'verified_at',now()
    ),
    completed_at=case when v_ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='media';
end;
$function$;

revoke all on function private.refresh_ur_play_media_deliverables(uuid)
  from public, anon, authenticated;
grant execute on function private.refresh_ur_play_media_deliverables(uuid)
  to service_role;

create or replace function private.guard_ur_play_media_after_360_close()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session uuid := coalesce(new.session_id,old.session_id);
begin
  perform private.assert_ur_play_media_mutable(v_session);
  return coalesce(new,old);
end;
$function$;

revoke all on function private.guard_ur_play_media_after_360_close()
  from public, anon, authenticated;

drop trigger if exists ur_play_media_guard_360_close on public.ur_play_media_deliverables;
create trigger ur_play_media_guard_360_close
before insert or update or delete on public.ur_play_media_deliverables
for each row
execute function private.guard_ur_play_media_after_360_close();

create or replace function private.set_ur_play_media_deliverable_in_progress(
  target_deliverable uuid,
  target_notes text default null
)
returns public.ur_play_media_deliverables
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_media_deliverables%rowtype;
  v_before jsonb;
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  select * into v_row
  from public.ur_play_media_deliverables
  where id=target_deliverable
  for update;

  if not found then raise exception 'MEDIA_DELIVERABLE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_media_mutable(v_row.session_id);

  if v_row.status in ('published','waived') then
    raise exception 'MEDIA_DELIVERABLE_ALREADY_RESOLVED' using errcode='23514';
  end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_media_deliverables
  set status='in_progress',notes=v_notes,updated_at=now()
  where id=target_deliverable
  returning * into v_row;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata
  ) values (
    v_actor,
    'ur_play.media.in_progress',
    'ur_play_media_deliverable',
    v_row.id,
    v_before,
    to_jsonb(v_row),
    jsonb_build_object('session_id',v_row.session_id,'deliverable_key',v_row.deliverable_key)
  );

  perform private.refresh_ur_play_media_deliverables(v_row.session_id);
  return v_row;
end;
$function$;

revoke all on function private.set_ur_play_media_deliverable_in_progress(uuid,text)
  from public, anon;
grant execute on function private.set_ur_play_media_deliverable_in_progress(uuid,text)
  to authenticated, service_role;

create or replace function public.set_ur_play_media_deliverable_in_progress(
  target_deliverable uuid,
  target_notes text default null
)
returns public.ur_play_media_deliverables
language sql
security invoker
set search_path to ''
as $function$
  select private.set_ur_play_media_deliverable_in_progress(target_deliverable,target_notes);
$function$;

revoke all on function public.set_ur_play_media_deliverable_in_progress(uuid,text)
  from public, anon;
grant execute on function public.set_ur_play_media_deliverable_in_progress(uuid,text)
  to authenticated, service_role;

create or replace function private.publish_ur_play_media_deliverable(
  target_deliverable uuid,
  target_channel text,
  target_publication_url text default null,
  target_media_asset uuid default null,
  target_notes text default null
)
returns public.ur_play_media_deliverables
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_media_deliverables%rowtype;
  v_before jsonb;
  v_url text := nullif(trim(coalesce(target_publication_url,'')),'');
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
  v_asset_session uuid;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;
  if target_channel not in ('instagram_post','instagram_story','reel','youtube','whatsapp','app','other') then
    raise exception 'INVALID_MEDIA_CHANNEL' using errcode='23514';
  end if;
  if v_url is null and target_media_asset is null then
    raise exception 'MEDIA_PUBLICATION_EVIDENCE_REQUIRED' using errcode='23514';
  end if;

  select * into v_row
  from public.ur_play_media_deliverables
  where id=target_deliverable
  for update;

  if not found then raise exception 'MEDIA_DELIVERABLE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_media_mutable(v_row.session_id);

  if target_media_asset is not null then
    select ma.ur_play_session_id into v_asset_session
    from public.media_assets ma
    where ma.id=target_media_asset;
    if not found then raise exception 'MEDIA_ASSET_NOT_FOUND'; end if;
    if v_asset_session is distinct from v_row.session_id then
      raise exception 'MEDIA_ASSET_SESSION_MISMATCH' using errcode='23514';
    end if;
  end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_media_deliverables
  set
    status='published',
    channel=target_channel,
    publication_url=v_url,
    media_asset_id=target_media_asset,
    notes=v_notes,
    published_at=now(),
    published_by=v_actor,
    waived_at=null,
    waived_by=null,
    waiver_reason=null,
    updated_at=now()
  where id=target_deliverable
  returning * into v_row;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata
  ) values (
    v_actor,
    'ur_play.media.published',
    'ur_play_media_deliverable',
    v_row.id,
    v_before,
    to_jsonb(v_row),
    jsonb_build_object('session_id',v_row.session_id,'deliverable_key',v_row.deliverable_key)
  );

  perform private.refresh_ur_play_media_deliverables(v_row.session_id);
  return v_row;
end;
$function$;

revoke all on function private.publish_ur_play_media_deliverable(uuid,text,text,uuid,text)
  from public, anon;
grant execute on function private.publish_ur_play_media_deliverable(uuid,text,text,uuid,text)
  to authenticated, service_role;

create or replace function public.publish_ur_play_media_deliverable(
  target_deliverable uuid,
  target_channel text,
  target_publication_url text default null,
  target_media_asset uuid default null,
  target_notes text default null
)
returns public.ur_play_media_deliverables
language sql
security invoker
set search_path to ''
as $function$
  select private.publish_ur_play_media_deliverable(
    target_deliverable,target_channel,target_publication_url,target_media_asset,target_notes
  );
$function$;

revoke all on function public.publish_ur_play_media_deliverable(uuid,text,text,uuid,text)
  from public, anon;
grant execute on function public.publish_ur_play_media_deliverable(uuid,text,text,uuid,text)
  to authenticated, service_role;

create or replace function private.waive_ur_play_media_deliverable(
  target_deliverable uuid,
  target_reason text
)
returns public.ur_play_media_deliverables
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_media_deliverables%rowtype;
  v_before jsonb;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_MEDIA_WAIVER_REQUIRED' using errcode='42501';
  end if;
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'MEDIA_WAIVER_REASON_REQUIRED' using errcode='23514';
  end if;

  select * into v_row
  from public.ur_play_media_deliverables
  where id=target_deliverable
  for update;

  if not found then raise exception 'MEDIA_DELIVERABLE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_media_mutable(v_row.session_id);

  v_before := to_jsonb(v_row);

  update public.ur_play_media_deliverables
  set
    status='waived',
    waived_at=now(),
    waived_by=v_actor,
    waiver_reason=v_reason,
    published_at=null,
    published_by=null,
    channel=null,
    publication_url=null,
    media_asset_id=null,
    updated_at=now()
  where id=target_deliverable
  returning * into v_row;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata
  ) values (
    v_actor,
    'ur_play.media.waived',
    'ur_play_media_deliverable',
    v_row.id,
    v_before,
    to_jsonb(v_row),
    jsonb_build_object('session_id',v_row.session_id,'deliverable_key',v_row.deliverable_key,'reason',v_reason)
  );

  perform private.refresh_ur_play_media_deliverables(v_row.session_id);
  return v_row;
end;
$function$;

revoke all on function private.waive_ur_play_media_deliverable(uuid,text)
  from public, anon;
grant execute on function private.waive_ur_play_media_deliverable(uuid,text)
  to authenticated, service_role;

create or replace function public.waive_ur_play_media_deliverable(
  target_deliverable uuid,
  target_reason text
)
returns public.ur_play_media_deliverables
language sql
security invoker
set search_path to ''
as $function$
  select private.waive_ur_play_media_deliverable(target_deliverable,target_reason);
$function$;

revoke all on function public.waive_ur_play_media_deliverable(uuid,text)
  from public, anon;
grant execute on function public.waive_ur_play_media_deliverable(uuid,text)
  to authenticated, service_role;

create or replace function private.sync_ur_play_media_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.ensure_ur_play_media_deliverables(new.id);
    perform private.refresh_ur_play_media_deliverables(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_ur_play_media_on_completion()
  from public, anon, authenticated;

drop trigger if exists ur_play_session_seed_media on public.ur_play_sessions;
create trigger ur_play_session_seed_media
after update of status on public.ur_play_sessions
for each row
execute function private.sync_ur_play_media_on_completion();

create or replace function private.admin_refresh_ur_play_post_session(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514'; end if;

  perform private.refresh_ur_play_post_session_automatic_tasks(target_session);
  perform private.refresh_ur_play_finance_task(target_session);
  perform private.refresh_ur_play_incident_task(target_session);
  perform private.refresh_ur_play_media_deliverables(target_session);
end;
$function$;

revoke all on function private.admin_refresh_ur_play_post_session(uuid)
  from public, anon;
grant execute on function private.admin_refresh_ur_play_post_session(uuid)
  to authenticated, service_role;

do $migration$
declare
  v_session record;
begin
  for v_session in
    select s.id
    from public.ur_play_sessions s
    where s.status='completed'
      and not exists (
        select 1
        from public.ur_play_post_session_closures c
        where c.session_id=s.id and c.status='closed'
      )
  loop
    perform private.ensure_ur_play_media_deliverables(v_session.id);
    perform private.refresh_ur_play_media_deliverables(v_session.id);
  end loop;
end;
$migration$;