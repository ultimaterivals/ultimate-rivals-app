create table if not exists public.ur_play_session_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.ur_play_sessions(id) on delete cascade,
  status text not null default 'draft',
  report_version integer not null default 0,
  system_snapshot jsonb not null default '{}'::jsonb,
  snapshot_at timestamptz,
  what_worked text,
  risks_and_failures text,
  key_learning text,
  decision_summary text,
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_session_reports_status_check check (status in ('draft','finalized')),
  constraint ur_play_session_reports_version_check check (report_version >= 0),
  constraint ur_play_session_reports_finalized_check check (
    status <> 'finalized' or (
      finalized_at is not null
      and finalized_by is not null
      and snapshot_at is not null
      and char_length(trim(coalesce(what_worked,''))) >= 10
      and char_length(trim(coalesce(risks_and_failures,''))) >= 10
      and char_length(trim(coalesce(key_learning,''))) >= 10
      and char_length(trim(coalesce(decision_summary,''))) >= 10
    )
  ),
  constraint ur_play_session_reports_reopen_reason_check check (
    reopen_reason is null or char_length(trim(reopen_reason)) >= 10
  )
);

create table if not exists public.ur_play_report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.ur_play_session_reports(id) on delete cascade,
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  priority text not null default 'medium',
  owner_id uuid not null references public.profiles(id),
  due_at timestamptz not null,
  status text not null default 'open',
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint ur_play_report_actions_title_check check (
    char_length(trim(title)) between 5 and 180
  ),
  constraint ur_play_report_actions_description_check check (
    description is null or char_length(trim(description)) <= 2000
  ),
  constraint ur_play_report_actions_category_check check (
    category in ('operation','sports','finance','safety','development','media','retention','feedback','product','commercial','other')
  ),
  constraint ur_play_report_actions_priority_check check (
    priority in ('low','medium','high','critical')
  ),
  constraint ur_play_report_actions_status_check check (
    status in ('open','completed','waived')
  ),
  constraint ur_play_report_actions_completed_check check (
    status <> 'completed' or (completed_at is not null and completed_by is not null)
  ),
  constraint ur_play_report_actions_waiver_check check (
    status <> 'waived' or (
      waived_at is not null
      and waived_by is not null
      and char_length(trim(coalesce(waiver_reason,''))) >= 10
    )
  )
);

create index if not exists ur_play_report_actions_session_idx
  on public.ur_play_report_actions(session_id,status,due_at);
create index if not exists ur_play_report_actions_owner_idx
  on public.ur_play_report_actions(owner_id,status,due_at);

alter table public.ur_play_session_reports enable row level security;
alter table public.ur_play_report_actions enable row level security;
alter table public.ur_play_session_reports force row level security;
alter table public.ur_play_report_actions force row level security;

revoke all on table public.ur_play_session_reports from public, anon, authenticated;
revoke all on table public.ur_play_report_actions from public, anon, authenticated;
grant select on table public.ur_play_session_reports to authenticated, service_role;
grant select on table public.ur_play_report_actions to authenticated, service_role;

create policy ur_play_session_reports_read
on public.ur_play_session_reports
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create policy ur_play_report_actions_read
on public.ur_play_report_actions
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.assert_ur_play_report_editable(target_session uuid)
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

revoke all on function private.assert_ur_play_report_editable(uuid)
  from public, anon, authenticated;
grant execute on function private.assert_ur_play_report_editable(uuid)
  to service_role;

create or replace function private.build_ur_play_report_snapshot(target_session uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
  v_confirmed integer := 0;
  v_present integer := 0;
  v_no_show integer := 0;
  v_tasks jsonb := '{}'::jsonb;
begin
  select * into v_session
  from public.ur_play_sessions
  where id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;

  select
    count(*) filter(where registration_status='confirmed')::integer,
    count(*) filter(where registration_status='confirmed' and attendance_status in ('checked_in','present'))::integer,
    count(*) filter(where registration_status='confirmed' and attendance_status='no_show')::integer
  into v_confirmed,v_present,v_no_show
  from public.ur_play_registrations
  where session_id=target_session;

  select coalesce(
    jsonb_object_agg(
      task_key,
      jsonb_build_object(
        'status',status,
        'managed_by',managed_by,
        'blocking',blocking,
        'evidence',coalesce(evidence,'{}'::jsonb),
        'completed_at',completed_at,
        'waived_at',waived_at
      )
    ) filter(where task_key<>'report'),
    '{}'::jsonb
  )
  into v_tasks
  from public.ur_play_post_session_tasks
  where session_id=target_session;

  return jsonb_build_object(
    'generated_at',now(),
    'session',jsonb_build_object(
      'id',v_session.id,
      'name',v_session.name,
      'starts_at',v_session.starts_at,
      'ends_at',v_session.ends_at,
      'pole_id',v_session.pole_id,
      'venue_id',v_session.venue_id,
      'capacity',v_session.capacity,
      'status',v_session.status
    ),
    'attendance',jsonb_build_object(
      'confirmed',v_confirmed,
      'present',v_present,
      'no_show',v_no_show,
      'attendance_rate_pct',case when v_confirmed=0 then 0 else round((v_present::numeric/v_confirmed::numeric)*100,2) end
    ),
    'tasks',v_tasks
  );
end;
$function$;

revoke all on function private.build_ur_play_report_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function private.build_ur_play_report_snapshot(uuid)
  to service_role;

create or replace function private.ensure_ur_play_session_report(target_session uuid)
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
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status<>'completed' then return; end if;

  perform private.ensure_ur_play_post_session_tasks(target_session);

  insert into public.ur_play_session_reports(session_id,status,system_snapshot,snapshot_at)
  values(target_session,'draft',private.build_ur_play_report_snapshot(target_session),now())
  on conflict(session_id) do nothing;

  update public.ur_play_post_session_tasks
  set managed_by='system',blocking=true,due_at=v_session.ends_at+interval '48 hours',updated_at=now()
  where session_id=target_session and task_key='report';
end;
$function$;

revoke all on function private.ensure_ur_play_session_report(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_ur_play_session_report(uuid)
  to service_role;

create or replace function private.refresh_ur_play_report_task(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_report public.ur_play_session_reports%rowtype;
  v_upstream_total integer := 0;
  v_upstream_pending integer := 0;
  v_action_count integer := 0;
  v_human_ready boolean := false;
begin
  perform private.ensure_ur_play_session_report(target_session);

  select * into v_report
  from public.ur_play_session_reports
  where session_id=target_session;
  if not found then return; end if;

  if v_report.status='draft' then
    update public.ur_play_session_reports
    set system_snapshot=private.build_ur_play_report_snapshot(target_session),
        snapshot_at=now(),updated_at=now()
    where id=v_report.id
    returning * into v_report;
  end if;

  select
    count(*)::integer,
    count(*) filter(where blocking and status not in ('completed','waived'))::integer
  into v_upstream_total,v_upstream_pending
  from public.ur_play_post_session_tasks
  where session_id=target_session and task_key<>'report';

  select count(*) filter(where status<>'waived')::integer
  into v_action_count
  from public.ur_play_report_actions
  where report_id=v_report.id;

  v_human_ready :=
    char_length(trim(coalesce(v_report.what_worked,'')))>=10
    and char_length(trim(coalesce(v_report.risks_and_failures,'')))>=10
    and char_length(trim(coalesce(v_report.key_learning,'')))>=10
    and char_length(trim(coalesce(v_report.decision_summary,'')))>=10;

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    status=case when v_report.status='finalized' then 'completed' else 'in_progress' end,
    evidence=jsonb_build_object(
      'report_id',v_report.id,
      'report_status',v_report.status,
      'report_version',v_report.report_version,
      'snapshot_at',v_report.snapshot_at,
      'upstream_tasks_total',v_upstream_total,
      'upstream_tasks_pending',v_upstream_pending,
      'action_items',v_action_count,
      'human_reflection_ready',v_human_ready,
      'verified_at',now()
    ),
    completed_at=case when v_report.status='finalized' then coalesce(completed_at,v_report.finalized_at,now()) else null end,
    completed_by=case when v_report.status='finalized' then coalesce(completed_by,v_report.finalized_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='report';
end;
$function$;

revoke all on function private.refresh_ur_play_report_task(uuid)
  from public, anon, authenticated;
grant execute on function private.refresh_ur_play_report_task(uuid)
  to service_role;

create or replace function private.save_ur_play_session_report_draft(
  target_session uuid,
  target_what_worked text,
  target_risks_and_failures text,
  target_key_learning text,
  target_decision_summary text
)
returns public.ur_play_session_reports
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_report public.ur_play_session_reports%rowtype;
  v_before jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_report_editable(target_session);
  perform private.ensure_ur_play_session_report(target_session);

  select * into v_report
  from public.ur_play_session_reports
  where session_id=target_session
  for update;
  if v_report.status='finalized' then
    raise exception 'REPORT_ALREADY_FINALIZED' using errcode='23514';
  end if;

  v_before := to_jsonb(v_report);

  update public.ur_play_session_reports
  set
    what_worked=nullif(trim(coalesce(target_what_worked,'')),''),
    risks_and_failures=nullif(trim(coalesce(target_risks_and_failures,'')),''),
    key_learning=nullif(trim(coalesce(target_key_learning,'')),''),
    decision_summary=nullif(trim(coalesce(target_decision_summary,'')),''),
    system_snapshot=private.build_ur_play_report_snapshot(target_session),
    snapshot_at=now(),updated_at=now()
  where id=v_report.id
  returning * into v_report;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.report.draft_saved','ur_play_session_report',v_report.id,
    v_before,to_jsonb(v_report),jsonb_build_object('session_id',target_session)
  );

  perform private.refresh_ur_play_report_task(target_session);
  return v_report;
end;
$function$;

revoke all on function private.save_ur_play_session_report_draft(uuid,text,text,text,text)
  from public, anon;
grant execute on function private.save_ur_play_session_report_draft(uuid,text,text,text,text)
  to authenticated, service_role;

create or replace function public.save_ur_play_session_report_draft(
  target_session uuid,
  target_what_worked text,
  target_risks_and_failures text,
  target_key_learning text,
  target_decision_summary text
)
returns public.ur_play_session_reports
language sql
security invoker
set search_path to ''
as $function$
  select private.save_ur_play_session_report_draft(
    target_session,target_what_worked,target_risks_and_failures,
    target_key_learning,target_decision_summary
  );
$function$;

revoke all on function public.save_ur_play_session_report_draft(uuid,text,text,text,text)
  from public, anon;
grant execute on function public.save_ur_play_session_report_draft(uuid,text,text,text,text)
  to authenticated, service_role;

create or replace function private.add_ur_play_report_action(
  target_session uuid,
  target_title text,
  target_description text,
  target_category text,
  target_priority text,
  target_owner uuid,
  target_due_at timestamptz
)
returns public.ur_play_report_actions
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_report public.ur_play_session_reports%rowtype;
  v_action public.ur_play_report_actions%rowtype;
  v_owner uuid := coalesce(target_owner,v_actor);
  v_title text := trim(coalesce(target_title,''));
  v_description text := nullif(trim(coalesce(target_description,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_report_editable(target_session);
  perform private.ensure_ur_play_session_report(target_session);

  if char_length(v_title)<5 then raise exception 'REPORT_ACTION_TITLE_REQUIRED' using errcode='23514'; end if;
  if target_category not in ('operation','sports','finance','safety','development','media','retention','feedback','product','commercial','other') then
    raise exception 'INVALID_REPORT_ACTION_CATEGORY' using errcode='23514';
  end if;
  if target_priority not in ('low','medium','high','critical') then
    raise exception 'INVALID_REPORT_ACTION_PRIORITY' using errcode='23514';
  end if;
  if target_due_at is null then raise exception 'REPORT_ACTION_DUE_AT_REQUIRED' using errcode='23514'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_owner and p.status='active') then
    raise exception 'REPORT_ACTION_OWNER_INVALID' using errcode='23514';
  end if;

  select * into v_report
  from public.ur_play_session_reports
  where session_id=target_session
  for update;
  if v_report.status='finalized' then raise exception 'REPORT_ALREADY_FINALIZED' using errcode='23514'; end if;

  insert into public.ur_play_report_actions(
    report_id,session_id,title,description,category,priority,owner_id,due_at,created_by
  ) values(
    v_report.id,target_session,v_title,v_description,target_category,target_priority,v_owner,target_due_at,v_actor
  ) returning * into v_action;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.report.action_created','ur_play_report_action',v_action.id,
    to_jsonb(v_action),jsonb_build_object('session_id',target_session,'report_id',v_report.id)
  );

  perform private.refresh_ur_play_report_task(target_session);
  return v_action;
end;
$function$;

revoke all on function private.add_ur_play_report_action(uuid,text,text,text,text,uuid,timestamptz)
  from public, anon;
grant execute on function private.add_ur_play_report_action(uuid,text,text,text,text,uuid,timestamptz)
  to authenticated, service_role;

create or replace function public.add_ur_play_report_action(
  target_session uuid,
  target_title text,
  target_description text,
  target_category text,
  target_priority text,
  target_owner uuid,
  target_due_at timestamptz
)
returns public.ur_play_report_actions
language sql
security invoker
set search_path to ''
as $function$
  select private.add_ur_play_report_action(
    target_session,target_title,target_description,target_category,
    target_priority,target_owner,target_due_at
  );
$function$;

revoke all on function public.add_ur_play_report_action(uuid,text,text,text,text,uuid,timestamptz)
  from public, anon;
grant execute on function public.add_ur_play_report_action(uuid,text,text,text,text,uuid,timestamptz)
  to authenticated, service_role;

create or replace function private.finalize_ur_play_session_report(target_session uuid)
returns public.ur_play_session_reports
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_report public.ur_play_session_reports%rowtype;
  v_upstream_total integer := 0;
  v_upstream_pending integer := 0;
  v_action_count integer := 0;
  v_before jsonb;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_report_editable(target_session);
  perform private.ensure_ur_play_session_report(target_session);

  select * into v_report
  from public.ur_play_session_reports
  where session_id=target_session
  for update;
  if v_report.status='finalized' then return v_report; end if;

  select
    count(*)::integer,
    count(*) filter(where blocking and status not in ('completed','waived'))::integer
  into v_upstream_total,v_upstream_pending
  from public.ur_play_post_session_tasks
  where session_id=target_session and task_key<>'report';

  if v_upstream_total<>8 or v_upstream_pending<>0 then
    raise exception 'REPORT_DEPENDENCIES_PENDING' using errcode='23514';
  end if;

  if char_length(trim(coalesce(v_report.what_worked,'')))<10
     or char_length(trim(coalesce(v_report.risks_and_failures,'')))<10
     or char_length(trim(coalesce(v_report.key_learning,'')))<10
     or char_length(trim(coalesce(v_report.decision_summary,'')))<10 then
    raise exception 'REPORT_REFLECTION_INCOMPLETE' using errcode='23514';
  end if;

  select count(*) filter(where status<>'waived')::integer
  into v_action_count
  from public.ur_play_report_actions
  where report_id=v_report.id;
  if v_action_count<1 then raise exception 'REPORT_ACTION_REQUIRED' using errcode='23514'; end if;

  v_before := to_jsonb(v_report);

  update public.ur_play_session_reports
  set
    status='finalized',report_version=report_version+1,
    system_snapshot=private.build_ur_play_report_snapshot(target_session),
    snapshot_at=now(),finalized_at=now(),finalized_by=v_actor,
    updated_at=now()
  where id=v_report.id
  returning * into v_report;

  update public.ur_play_post_session_tasks
  set
    managed_by='system',status='completed',
    evidence=jsonb_build_object(
      'report_id',v_report.id,
      'report_status','finalized',
      'report_version',v_report.report_version,
      'snapshot_at',v_report.snapshot_at,
      'upstream_tasks_total',v_upstream_total,
      'upstream_tasks_pending',0,
      'action_items',v_action_count,
      'human_reflection_ready',true,
      'verified_at',now()
    ),
    completed_at=now(),completed_by=v_actor,updated_at=now()
  where session_id=target_session and task_key='report';

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.report.finalized','ur_play_session_report',v_report.id,
    v_before,to_jsonb(v_report),jsonb_build_object('session_id',target_session,'action_items',v_action_count)
  );

  return v_report;
end;
$function$;

revoke all on function private.finalize_ur_play_session_report(uuid)
  from public, anon;
grant execute on function private.finalize_ur_play_session_report(uuid)
  to authenticated, service_role;

create or replace function public.finalize_ur_play_session_report(target_session uuid)
returns public.ur_play_session_reports
language sql
security invoker
set search_path to ''
as $function$
  select private.finalize_ur_play_session_report(target_session);
$function$;

revoke all on function public.finalize_ur_play_session_report(uuid)
  from public, anon;
grant execute on function public.finalize_ur_play_session_report(uuid)
  to authenticated, service_role;

create or replace function private.reopen_ur_play_session_report(
  target_session uuid,
  target_reason text
)
returns public.ur_play_session_reports
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_report public.ur_play_session_reports%rowtype;
  v_before jsonb;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_REPORT_REOPEN_REQUIRED' using errcode='42501';
  end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_report_editable(target_session);
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'REPORT_REOPEN_REASON_REQUIRED' using errcode='23514';
  end if;

  select * into v_report
  from public.ur_play_session_reports
  where session_id=target_session
  for update;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  if v_report.status<>'finalized' then return v_report; end if;

  v_before := to_jsonb(v_report);
  update public.ur_play_session_reports
  set
    status='draft',finalized_at=null,finalized_by=null,
    reopened_at=now(),reopened_by=v_actor,reopen_reason=v_reason,
    system_snapshot=private.build_ur_play_report_snapshot(target_session),
    snapshot_at=now(),updated_at=now()
  where id=v_report.id
  returning * into v_report;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.report.reopened','ur_play_session_report',v_report.id,
    v_before,to_jsonb(v_report),jsonb_build_object('session_id',target_session,'reason',v_reason)
  );

  perform private.refresh_ur_play_report_task(target_session);
  return v_report;
end;
$function$;

revoke all on function private.reopen_ur_play_session_report(uuid,text)
  from public, anon;
grant execute on function private.reopen_ur_play_session_report(uuid,text)
  to authenticated, service_role;

create or replace function public.reopen_ur_play_session_report(target_session uuid,target_reason text)
returns public.ur_play_session_reports
language sql
security invoker
set search_path to ''
as $function$
  select private.reopen_ur_play_session_report(target_session,target_reason);
$function$;

revoke all on function public.reopen_ur_play_session_report(uuid,text)
  from public, anon;
grant execute on function public.reopen_ur_play_session_report(uuid,text)
  to authenticated, service_role;

create or replace function private.update_ur_play_report_action_status(
  target_action uuid,
  target_status text,
  target_reason text default null
)
returns public.ur_play_report_actions
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_action public.ur_play_report_actions%rowtype;
  v_before jsonb;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_status not in ('completed','waived') then
    raise exception 'INVALID_REPORT_ACTION_STATUS' using errcode='23514';
  end if;

  select * into v_action
  from public.ur_play_report_actions
  where id=target_action
  for update;
  if not found then raise exception 'REPORT_ACTION_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_action.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if v_action.status in ('completed','waived') then return v_action; end if;
  if target_status='waived' and (v_reason is null or char_length(v_reason)<10) then
    raise exception 'REPORT_ACTION_WAIVER_REASON_REQUIRED' using errcode='23514';
  end if;

  v_before := to_jsonb(v_action);
  update public.ur_play_report_actions
  set
    status=target_status,
    completed_at=case when target_status='completed' then now() else null end,
    completed_by=case when target_status='completed' then v_actor else null end,
    waived_at=case when target_status='waived' then now() else null end,
    waived_by=case when target_status='waived' then v_actor else null end,
    waiver_reason=case when target_status='waived' then v_reason else null end,
    updated_at=now()
  where id=target_action
  returning * into v_action;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.report.action_resolved','ur_play_report_action',v_action.id,
    v_before,to_jsonb(v_action),jsonb_build_object('session_id',v_action.session_id,'status',target_status)
  );

  return v_action;
end;
$function$;

revoke all on function private.update_ur_play_report_action_status(uuid,text,text)
  from public, anon;
grant execute on function private.update_ur_play_report_action_status(uuid,text,text)
  to authenticated, service_role;

create or replace function public.update_ur_play_report_action_status(
  target_action uuid,
  target_status text,
  target_reason text default null
)
returns public.ur_play_report_actions
language sql
security invoker
set search_path to ''
as $function$
  select private.update_ur_play_report_action_status(target_action,target_status,target_reason);
$function$;

revoke all on function public.update_ur_play_report_action_status(uuid,text,text)
  from public, anon;
grant execute on function public.update_ur_play_report_action_status(uuid,text,text)
  to authenticated, service_role;

create or replace function private.sync_ur_play_report_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.ensure_ur_play_session_report(new.id);
    perform private.refresh_ur_play_report_task(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_ur_play_report_on_completion()
  from public, anon, authenticated;

drop trigger if exists ur_play_session_seed_report on public.ur_play_sessions;
create trigger ur_play_session_seed_report
after update of status on public.ur_play_sessions
for each row
execute function private.sync_ur_play_report_on_completion();

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
  perform private.refresh_ur_play_feedback_evidence(target_session);
  perform private.refresh_ur_play_report_task(target_session);
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
    perform private.ensure_ur_play_session_report(v_session.id);
    perform private.refresh_ur_play_report_task(v_session.id);
  end loop;
end;
$migration$;
