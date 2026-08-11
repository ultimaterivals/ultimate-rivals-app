create table if not exists public.ur_play_post_session_tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  task_key text not null,
  status text not null default 'pending',
  managed_by text not null default 'human',
  blocking boolean not null default true,
  due_at timestamptz not null,
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_post_session_tasks_unique unique(session_id,task_key),
  constraint ur_play_post_session_task_key_check check (
    task_key in (
      'ranking_data','ur_coins','finance','incidents','development',
      'media','retention','feedback','report'
    )
  ),
  constraint ur_play_post_session_task_status_check check (
    status in ('pending','in_progress','completed','waived')
  ),
  constraint ur_play_post_session_task_manager_check check (
    managed_by in ('system','human')
  ),
  constraint ur_play_post_session_task_waiver_check check (
    (status <> 'waived') or (
      waived_at is not null and waived_by is not null and char_length(trim(coalesce(waiver_reason,''))) >= 10
    )
  )
);

create index if not exists ur_play_post_session_tasks_session_idx
  on public.ur_play_post_session_tasks(session_id,status,due_at);

create table if not exists public.ur_play_post_session_closures (
  session_id uuid primary key references public.ur_play_sessions(id) on delete cascade,
  status text not null default 'closed',
  closed_at timestamptz not null,
  closed_by uuid not null references public.profiles(id),
  task_snapshot jsonb not null default '[]'::jsonb,
  notes text,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_post_session_closure_status_check check (status in ('closed','reopened')),
  constraint ur_play_post_session_reopen_check check (
    status <> 'reopened' or (
      reopened_at is not null and reopened_by is not null and char_length(trim(coalesce(reopen_reason,''))) >= 10
    )
  )
);

alter table public.ur_play_post_session_tasks enable row level security;
alter table public.ur_play_post_session_closures enable row level security;

revoke all on table public.ur_play_post_session_tasks from public, anon;
revoke all on table public.ur_play_post_session_closures from public, anon;
grant select on table public.ur_play_post_session_tasks to authenticated, service_role;
grant select on table public.ur_play_post_session_closures to authenticated, service_role;

create policy ur_play_post_session_tasks_read
on public.ur_play_post_session_tasks
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create policy ur_play_post_session_closures_read
on public.ur_play_post_session_closures
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.ensure_ur_play_post_session_tasks(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
  v_base timestamptz := now();
begin
  select * into v_session
  from public.ur_play_sessions
  where id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then return; end if;

  insert into public.ur_play_post_session_tasks(
    session_id,task_key,status,managed_by,blocking,due_at
  ) values
    (target_session,'ranking_data','pending','system',true,v_base+interval '24 hours'),
    (target_session,'ur_coins','pending','human',true,v_base+interval '24 hours'),
    (target_session,'finance','pending','human',true,v_base+interval '24 hours'),
    (target_session,'incidents','pending','human',true,v_base+interval '24 hours'),
    (target_session,'development','pending','human',true,v_base+interval '24 hours'),
    (target_session,'media','pending','human',true,v_base+interval '48 hours'),
    (target_session,'retention','pending','human',true,v_base+interval '48 hours'),
    (target_session,'feedback','pending','human',true,v_base+interval '48 hours'),
    (target_session,'report','pending','human',true,v_base+interval '48 hours')
  on conflict(session_id,task_key) do nothing;
end;
$function$;

revoke all on function private.ensure_ur_play_post_session_tasks(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_ur_play_post_session_tasks(uuid)
  to service_role;

create or replace function private.refresh_ur_play_post_session_automatic_tasks(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_match_count integer := 0;
  v_ranked_match_count integer := 0;
  v_transaction_count integer := 0;
  v_ready boolean := false;
begin
  perform private.ensure_ur_play_post_session_tasks(target_session);

  select count(*)::integer
  into v_match_count
  from public.matches m
  where m.session_id=target_session and m.status='completed';

  select count(*)::integer
  into v_ranked_match_count
  from public.matches m
  where m.session_id=target_session
    and m.status='completed'
    and exists (
      select 1
      from public.ranking_processing_runs r
      where r.source_type='match_result'
        and r.source_id=m.id
        and r.status='completed'
    );

  select count(*)::integer
  into v_transaction_count
  from public.ranking_transactions t
  where t.session_id=target_session and t.status='homologated';

  v_ready := v_match_count > 0 and v_ranked_match_count=v_match_count;

  update public.ur_play_post_session_tasks
  set
    status=case when v_ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object(
      'completed_matches',v_match_count,
      'ranked_matches',v_ranked_match_count,
      'ranking_transactions',v_transaction_count,
      'verified_at',now()
    ),
    completed_at=case when v_ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='ranking_data';
end;
$function$;

revoke all on function private.refresh_ur_play_post_session_automatic_tasks(uuid)
  from public, anon, authenticated;
grant execute on function private.refresh_ur_play_post_session_automatic_tasks(uuid)
  to service_role;

create or replace function private.sync_ur_play_post_session_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.ensure_ur_play_post_session_tasks(new.id);
    perform private.refresh_ur_play_post_session_automatic_tasks(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_ur_play_post_session_on_completion()
  from public, anon, authenticated;

drop trigger if exists ur_play_session_seed_post_session on public.ur_play_sessions;
create trigger ur_play_session_seed_post_session
after update of status on public.ur_play_sessions
for each row
execute function private.sync_ur_play_post_session_on_completion();

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
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  perform private.refresh_ur_play_post_session_automatic_tasks(target_session);
end;
$function$;

revoke all on function private.admin_refresh_ur_play_post_session(uuid)
  from public, anon;
grant execute on function private.admin_refresh_ur_play_post_session(uuid)
  to authenticated, service_role;

create or replace function public.admin_refresh_ur_play_post_session(target_session uuid)
returns void
language sql
security invoker
set search_path to ''
as $function$
  select private.admin_refresh_ur_play_post_session(target_session);
$function$;

revoke all on function public.admin_refresh_ur_play_post_session(uuid)
  from public, anon;
grant execute on function public.admin_refresh_ur_play_post_session(uuid)
  to authenticated, service_role;

create or replace function private.set_ur_play_post_session_task(
  target_session uuid,
  target_task_key text,
  target_status text,
  target_notes text default null,
  target_waiver_reason text default null
)
returns public.ur_play_post_session_tasks
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_task public.ur_play_post_session_tasks%rowtype;
  v_reason text := nullif(trim(coalesce(target_waiver_reason,'')),'');
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if target_status not in ('pending','in_progress','completed','waived') then
    raise exception 'INVALID_POST_SESSION_TASK_STATUS' using errcode='23514';
  end if;
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  perform private.ensure_ur_play_post_session_tasks(target_session);
  select * into v_task
  from public.ur_play_post_session_tasks
  where session_id=target_session and task_key=target_task_key
  for update;
  if not found then raise exception 'POST_SESSION_TASK_NOT_FOUND'; end if;
  if v_task.managed_by='system' then
    raise exception 'SYSTEM_POST_SESSION_TASK_READ_ONLY' using errcode='23514';
  end if;

  if target_status='waived' then
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'ADMIN_POST_SESSION_WAIVER_REQUIRED' using errcode='42501';
    end if;
    if v_reason is null or char_length(v_reason)<10 then
      raise exception 'POST_SESSION_WAIVER_REASON_REQUIRED' using errcode='23514';
    end if;
  end if;

  update public.ur_play_post_session_tasks
  set
    status=target_status,
    notes=v_notes,
    completed_at=case when target_status='completed' then now() else null end,
    completed_by=case when target_status='completed' then v_actor else null end,
    waived_at=case when target_status='waived' then now() else null end,
    waived_by=case when target_status='waived' then v_actor else null end,
    waiver_reason=case when target_status='waived' then v_reason else null end,
    updated_at=now()
  where id=v_task.id
  returning * into v_task;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values (
    v_actor,
    case when target_status='waived'
      then 'ur_play.post_session_task.waived'
      else 'ur_play.post_session_task.updated'
    end,
    'ur_play_post_session_task',
    v_task.id,
    jsonb_build_object(
      'session_id',target_session,
      'task_key',target_task_key,
      'status',target_status,
      'notes',v_notes
    ),
    jsonb_build_object('waiver_reason',v_reason)
  );

  return v_task;
end;
$function$;

revoke all on function private.set_ur_play_post_session_task(uuid,text,text,text,text)
  from public, anon;
grant execute on function private.set_ur_play_post_session_task(uuid,text,text,text,text)
  to authenticated, service_role;

create or replace function public.set_ur_play_post_session_task(
  target_session uuid,
  target_task_key text,
  target_status text,
  target_notes text default null,
  target_waiver_reason text default null
)
returns public.ur_play_post_session_tasks
language sql
security invoker
set search_path to ''
as $function$
  select private.set_ur_play_post_session_task(
    target_session,target_task_key,target_status,target_notes,target_waiver_reason
  );
$function$;

revoke all on function public.set_ur_play_post_session_task(uuid,text,text,text,text)
  from public, anon;
grant execute on function public.set_ur_play_post_session_task(uuid,text,text,text,text)
  to authenticated, service_role;

create or replace function private.ur_play_post_session_readiness(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  total_tasks integer,
  completed_tasks integer,
  waived_tasks integer,
  pending_tasks integer,
  overdue_tasks integer,
  ready boolean,
  closed boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status public.ur_play_session_status;
  v_total integer := 0;
  v_completed integer := 0;
  v_waived integer := 0;
  v_pending integer := 0;
  v_overdue integer := 0;
  v_closed boolean := false;
begin
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select s.status into v_status
  from public.ur_play_sessions s
  where s.id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;

  select
    count(*)::integer,
    count(*) filter(where status='completed')::integer,
    count(*) filter(where status='waived')::integer,
    count(*) filter(where status not in ('completed','waived'))::integer,
    count(*) filter(where status not in ('completed','waived') and due_at<now())::integer
  into v_total,v_completed,v_waived,v_pending,v_overdue
  from public.ur_play_post_session_tasks
  where session_id=target_session and blocking=true;

  select exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) into v_closed;

  return query select
    v_status,v_total,v_completed,v_waived,v_pending,v_overdue,
    (v_status='completed' and v_total=9 and v_pending=0),
    v_closed;
end;
$function$;

revoke all on function private.ur_play_post_session_readiness(uuid)
  from public, anon;
grant execute on function private.ur_play_post_session_readiness(uuid)
  to authenticated, service_role;

create or replace function public.get_ur_play_post_session_readiness(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  total_tasks integer,
  completed_tasks integer,
  waived_tasks integer,
  pending_tasks integer,
  overdue_tasks integer,
  ready boolean,
  closed boolean
)
language sql
security invoker
set search_path to ''
as $function$
  select * from private.ur_play_post_session_readiness(target_session);
$function$;

revoke all on function public.get_ur_play_post_session_readiness(uuid)
  from public, anon;
grant execute on function public.get_ur_play_post_session_readiness(uuid)
  to authenticated, service_role;

create or replace function private.finalize_ur_play_post_session(
  target_session uuid,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_readiness record;
  v_snapshot jsonb;
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  perform private.refresh_ur_play_post_session_automatic_tasks(target_session);
  select * into v_readiness from private.ur_play_post_session_readiness(target_session);
  if not v_readiness.ready then
    raise exception 'POST_SESSION_NOT_READY' using errcode='23514';
  end if;

  select jsonb_agg(jsonb_build_object(
    'task_key',task_key,
    'status',status,
    'managed_by',managed_by,
    'completed_at',completed_at,
    'completed_by',completed_by,
    'waived_at',waived_at,
    'waived_by',waived_by,
    'waiver_reason',waiver_reason,
    'notes',notes,
    'evidence',evidence
  ) order by task_key)
  into v_snapshot
  from public.ur_play_post_session_tasks
  where session_id=target_session;

  insert into public.ur_play_post_session_closures(
    session_id,status,closed_at,closed_by,task_snapshot,notes,
    reopened_at,reopened_by,reopen_reason,updated_at
  ) values(
    target_session,'closed',now(),v_actor,coalesce(v_snapshot,'[]'::jsonb),v_notes,
    null,null,null,now()
  )
  on conflict(session_id) do update
  set
    status='closed',
    closed_at=excluded.closed_at,
    closed_by=excluded.closed_by,
    task_snapshot=excluded.task_snapshot,
    notes=excluded.notes,
    reopened_at=null,
    reopened_by=null,
    reopen_reason=null,
    updated_at=now();

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values(
    v_actor,
    'ur_play.post_session_closed',
    'ur_play_session',
    target_session,
    jsonb_build_object(
      'status','closed',
      'tasks',v_readiness.total_tasks,
      'completed',v_readiness.completed_tasks,
      'waived',v_readiness.waived_tasks
    ),
    jsonb_build_object('notes',v_notes)
  );

  return jsonb_build_object(
    'session_id',target_session,
    'status','closed',
    'closed_at',now(),
    'tasks',v_readiness.total_tasks,
    'completed',v_readiness.completed_tasks,
    'waived',v_readiness.waived_tasks
  );
end;
$function$;

revoke all on function private.finalize_ur_play_post_session(uuid,text)
  from public, anon;
grant execute on function private.finalize_ur_play_post_session(uuid,text)
  to authenticated, service_role;

create or replace function public.finalize_ur_play_post_session(
  target_session uuid,
  target_notes text default null
)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
  select private.finalize_ur_play_post_session(target_session,target_notes);
$function$;

revoke all on function public.finalize_ur_play_post_session(uuid,text)
  from public, anon;
grant execute on function public.finalize_ur_play_post_session(uuid,text)
  to authenticated, service_role;

create or replace function private.reopen_ur_play_post_session(
  target_session uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_POST_SESSION_REOPEN_REQUIRED' using errcode='42501';
  end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'POST_SESSION_REOPEN_REASON_REQUIRED' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_NOT_CLOSED' using errcode='23514';
  end if;

  update public.ur_play_post_session_closures
  set
    status='reopened',
    reopened_at=now(),
    reopened_by=v_actor,
    reopen_reason=v_reason,
    updated_at=now()
  where session_id=target_session;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values(
    v_actor,
    'ur_play.post_session_reopened',
    'ur_play_session',
    target_session,
    jsonb_build_object('status','reopened'),
    jsonb_build_object('reason',v_reason)
  );

  return jsonb_build_object('session_id',target_session,'status','reopened');
end;
$function$;

revoke all on function private.reopen_ur_play_post_session(uuid,text)
  from public, anon;
grant execute on function private.reopen_ur_play_post_session(uuid,text)
  to authenticated, service_role;

create or replace function public.reopen_ur_play_post_session(
  target_session uuid,
  target_reason text
)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
  select private.reopen_ur_play_post_session(target_session,target_reason);
$function$;

revoke all on function public.reopen_ur_play_post_session(uuid,text)
  from public, anon;
grant execute on function public.reopen_ur_play_post_session(uuid,text)
  to authenticated, service_role;

insert into public.ur_play_post_session_tasks(
  session_id,task_key,status,managed_by,blocking,due_at
)
select s.id,v.task_key,'pending',v.managed_by,true,now()+make_interval(hours=>v.hours)
from public.ur_play_sessions s
cross join (values
  ('ranking_data','system',24),
  ('ur_coins','human',24),
  ('finance','human',24),
  ('incidents','human',24),
  ('development','human',24),
  ('media','human',48),
  ('retention','human',48),
  ('feedback','human',48),
  ('report','human',48)
) as v(task_key,managed_by,hours)
where s.status='completed'
on conflict(session_id,task_key) do nothing;
