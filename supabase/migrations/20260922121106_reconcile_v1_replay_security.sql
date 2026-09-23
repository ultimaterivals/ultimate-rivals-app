-- Forward-only reconciliation of the two incident migrations recorded in Production
-- (20260811012657 and 20260811012712), absent from the repository baseline.
-- Existing hosted definitions are preserved. Partial drift fails closed.
-- The later report/feedback admin_refresh function is deliberately not replaced.
do $reconcile$
begin
  if to_regclass('public.ur_play_incidents') is null
     and to_regclass('public.ur_play_incident_reviews') is null then
    execute $incident_ddl$
create table if not exists public.ur_play_incidents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  athlete_id uuid references public.athletes(id) on delete set null,
  incident_type text not null,
  severity text not null default 'low',
  status text not null default 'open',
  occurred_at timestamptz not null default now(),
  description text not null,
  immediate_action text,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_incident_type_check check (
    incident_type in ('injury','medical','conflict','behavior','court_safety','equipment','operational','other')
  ),
  constraint ur_play_incident_severity_check check (
    severity in ('low','medium','high','critical')
  ),
  constraint ur_play_incident_status_check check (
    status in ('open','monitoring','resolved','closed_no_action')
  ),
  constraint ur_play_incident_description_check check (char_length(trim(description)) >= 5),
  constraint ur_play_incident_resolution_check check (
    status not in ('resolved','closed_no_action') or resolved_at is not null
  )
);

create index if not exists ur_play_incidents_session_idx
  on public.ur_play_incidents(session_id,status,severity,occurred_at desc);

create table if not exists public.ur_play_incident_reviews (
  session_id uuid primary key references public.ur_play_sessions(id) on delete cascade,
  status text not null default 'confirmed',
  reviewed_at timestamptz not null,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  no_incidents boolean not null default false,
  notes text,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete restrict,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_incident_review_status_check check (status in ('confirmed','reopened')),
  constraint ur_play_incident_review_reopen_check check (
    status <> 'reopened' or (
      reopened_at is not null and reopened_by is not null and
      char_length(trim(coalesce(reopen_reason,''))) >= 10
    )
  )
);

alter table public.ur_play_incidents enable row level security;
alter table public.ur_play_incident_reviews enable row level security;

revoke all on table public.ur_play_incidents from public, anon;
revoke all on table public.ur_play_incident_reviews from public, anon;
grant select on table public.ur_play_incidents to authenticated, service_role;
grant select on table public.ur_play_incident_reviews to authenticated, service_role;

create policy ur_play_incidents_read
on public.ur_play_incidents
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create policy ur_play_incident_reviews_read
on public.ur_play_incident_reviews
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.ur_play_incident_snapshot(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  total_incidents integer,
  open_incidents integer,
  monitoring_incidents integer,
  resolved_incidents integer,
  critical_incidents integer,
  critical_open_incidents integer,
  follow_up_open integer,
  review_confirmed boolean,
  no_incidents_declared boolean,
  ready boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status public.ur_play_session_status;
  v_total integer := 0;
  v_open integer := 0;
  v_monitoring integer := 0;
  v_resolved integer := 0;
  v_critical integer := 0;
  v_critical_open integer := 0;
  v_follow_up integer := 0;
  v_review boolean := false;
  v_no_incidents boolean := false;
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
    count(*) filter(where i.status='open')::integer,
    count(*) filter(where i.status='monitoring')::integer,
    count(*) filter(where i.status in ('resolved','closed_no_action'))::integer,
    count(*) filter(where i.severity='critical')::integer,
    count(*) filter(where i.severity='critical' and i.status in ('open','monitoring'))::integer,
    count(*) filter(where i.follow_up_required and i.status in ('open','monitoring'))::integer
  into v_total,v_open,v_monitoring,v_resolved,v_critical,v_critical_open,v_follow_up
  from public.ur_play_incidents i
  where i.session_id=target_session;

  select
    coalesce(r.status='confirmed',false),
    coalesce(r.no_incidents,false)
  into v_review,v_no_incidents
  from public.ur_play_incident_reviews r
  where r.session_id=target_session;

  return query select
    v_status,
    v_total,
    v_open,
    v_monitoring,
    v_resolved,
    v_critical,
    v_critical_open,
    v_follow_up,
    v_review,
    v_no_incidents,
    (
      v_status='completed'
      and v_open=0
      and v_monitoring=0
      and v_follow_up=0
      and v_review
      and (v_total>0 or v_no_incidents)
    );
end;
$function$;

revoke all on function private.ur_play_incident_snapshot(uuid) from public, anon;
grant execute on function private.ur_play_incident_snapshot(uuid) to authenticated, service_role;

create or replace function public.get_ur_play_incident_snapshot(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  total_incidents integer,
  open_incidents integer,
  monitoring_incidents integer,
  resolved_incidents integer,
  critical_incidents integer,
  critical_open_incidents integer,
  follow_up_open integer,
  review_confirmed boolean,
  no_incidents_declared boolean,
  ready boolean
)
language sql
security invoker
set search_path to ''
as $function$
  select * from private.ur_play_incident_snapshot(target_session);
$function$;

revoke all on function public.get_ur_play_incident_snapshot(uuid) from public, anon;
grant execute on function public.get_ur_play_incident_snapshot(uuid) to authenticated, service_role;

create or replace function private.refresh_ur_play_incident_task(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_incident record;
begin
  perform private.ensure_ur_play_post_session_tasks(target_session);
  select * into v_incident from private.ur_play_incident_snapshot(target_session);

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    status=case when v_incident.ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object(
      'total_incidents',v_incident.total_incidents,
      'open_incidents',v_incident.open_incidents,
      'monitoring_incidents',v_incident.monitoring_incidents,
      'resolved_incidents',v_incident.resolved_incidents,
      'critical_incidents',v_incident.critical_incidents,
      'critical_open_incidents',v_incident.critical_open_incidents,
      'follow_up_open',v_incident.follow_up_open,
      'review_confirmed',v_incident.review_confirmed,
      'no_incidents_declared',v_incident.no_incidents_declared,
      'ready',v_incident.ready,
      'verified_at',now()
    ),
    completed_at=case when v_incident.ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_incident.ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='incidents';
end;
$function$;

revoke all on function private.refresh_ur_play_incident_task(uuid) from public, anon, authenticated;
grant execute on function private.refresh_ur_play_incident_task(uuid) to service_role;

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
    (target_session,'ur_coins','pending','system',true,v_base+interval '24 hours'),
    (target_session,'finance','pending','system',true,v_base+interval '24 hours'),
    (target_session,'incidents','pending','system',true,v_base+interval '24 hours'),
    (target_session,'development','pending','human',true,v_base+interval '24 hours'),
    (target_session,'media','pending','human',true,v_base+interval '48 hours'),
    (target_session,'retention','pending','human',true,v_base+interval '48 hours'),
    (target_session,'feedback','pending','human',true,v_base+interval '48 hours'),
    (target_session,'report','pending','human',true,v_base+interval '48 hours')
  on conflict(session_id,task_key) do nothing;

  update public.ur_play_post_session_tasks
  set managed_by='system',updated_at=now()
  where session_id=target_session
    and task_key in ('ranking_data','ur_coins','finance','incidents')
    and managed_by<>'system';
end;
$function$;

revoke all on function private.ensure_ur_play_post_session_tasks(uuid) from public, anon, authenticated;
grant execute on function private.ensure_ur_play_post_session_tasks(uuid) to service_role;

create or replace function private.create_ur_play_incident(
  target_session uuid,
  target_match uuid,
  target_athlete uuid,
  target_type text,
  target_severity text,
  target_occurred_at timestamptz,
  target_description text,
  target_immediate_action text default null,
  target_follow_up_required boolean default false,
  target_follow_up_notes text default null
)
returns public.ur_play_incidents
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_incident public.ur_play_incidents%rowtype;
  v_description text := trim(coalesce(target_description,''));
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if target_type not in ('injury','medical','conflict','behavior','court_safety','equipment','operational','other') then
    raise exception 'INVALID_INCIDENT_TYPE' using errcode='23514';
  end if;
  if target_severity not in ('low','medium','high','critical') then
    raise exception 'INVALID_INCIDENT_SEVERITY' using errcode='23514';
  end if;
  if char_length(v_description)<5 then raise exception 'INCIDENT_DESCRIPTION_REQUIRED' using errcode='23514'; end if;
  if target_match is not null and not exists(
    select 1 from public.matches m where m.id=target_match and m.session_id=target_session
  ) then raise exception 'INCIDENT_MATCH_SESSION_MISMATCH' using errcode='23514'; end if;
  if target_athlete is not null and not exists(
    select 1 from public.ur_play_registrations r
    where r.session_id=target_session and r.athlete_id=target_athlete
  ) then raise exception 'INCIDENT_ATHLETE_SESSION_MISMATCH' using errcode='23514'; end if;

  insert into public.ur_play_incidents(
    session_id,match_id,athlete_id,incident_type,severity,status,occurred_at,
    description,immediate_action,follow_up_required,follow_up_notes,created_by
  ) values(
    target_session,target_match,target_athlete,target_type,target_severity,'open',
    coalesce(target_occurred_at,now()),v_description,
    nullif(trim(coalesce(target_immediate_action,'')),''),
    coalesce(target_follow_up_required,false),
    nullif(trim(coalesce(target_follow_up_notes,'')),''),v_actor
  ) returning * into v_incident;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.incident_created','ur_play_incident',v_incident.id,
    to_jsonb(v_incident),jsonb_build_object('session_id',target_session)
  );

  return v_incident;
end;
$function$;

revoke all on function private.create_ur_play_incident(uuid,uuid,uuid,text,text,timestamptz,text,text,boolean,text) from public, anon;
grant execute on function private.create_ur_play_incident(uuid,uuid,uuid,text,text,timestamptz,text,text,boolean,text) to authenticated, service_role;

create or replace function public.create_ur_play_incident(
  target_session uuid,
  target_match uuid,
  target_athlete uuid,
  target_type text,
  target_severity text,
  target_occurred_at timestamptz,
  target_description text,
  target_immediate_action text default null,
  target_follow_up_required boolean default false,
  target_follow_up_notes text default null
)
returns public.ur_play_incidents
language sql
security invoker
set search_path to ''
as $function$
  select private.create_ur_play_incident(
    target_session,target_match,target_athlete,target_type,target_severity,
    target_occurred_at,target_description,target_immediate_action,
    target_follow_up_required,target_follow_up_notes
  );
$function$;

revoke all on function public.create_ur_play_incident(uuid,uuid,uuid,text,text,timestamptz,text,text,boolean,text) from public, anon;
grant execute on function public.create_ur_play_incident(uuid,uuid,uuid,text,text,timestamptz,text,text,boolean,text) to authenticated, service_role;

create or replace function private.set_ur_play_incident_status(
  target_incident uuid,
  target_status text,
  target_resolution_notes text default null,
  target_follow_up_notes text default null
)
returns public.ur_play_incidents
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_incident public.ur_play_incidents%rowtype;
  v_resolution text := nullif(trim(coalesce(target_resolution_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select * into v_incident from public.ur_play_incidents where id=target_incident for update;
  if not found then raise exception 'INCIDENT_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_incident.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if target_status not in ('open','monitoring','resolved','closed_no_action') then
    raise exception 'INVALID_INCIDENT_STATUS' using errcode='23514';
  end if;
  if target_status in ('resolved','closed_no_action') and (v_resolution is null or char_length(v_resolution)<5) then
    raise exception 'INCIDENT_RESOLUTION_REQUIRED' using errcode='23514';
  end if;

  update public.ur_play_incidents
  set
    status=target_status,
    resolution_notes=case when target_status in ('resolved','closed_no_action') then v_resolution else resolution_notes end,
    follow_up_notes=coalesce(nullif(trim(coalesce(target_follow_up_notes,'')),''),follow_up_notes),
    resolved_at=case when target_status in ('resolved','closed_no_action') then now() else null end,
    resolved_by=case when target_status in ('resolved','closed_no_action') then v_actor else null end,
    updated_at=now()
  where id=target_incident
  returning * into v_incident;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.incident_status_changed','ur_play_incident',v_incident.id,
    to_jsonb(v_incident),jsonb_build_object('session_id',v_incident.session_id,'status',target_status)
  );

  return v_incident;
end;
$function$;

revoke all on function private.set_ur_play_incident_status(uuid,text,text,text) from public, anon;
grant execute on function private.set_ur_play_incident_status(uuid,text,text,text) to authenticated, service_role;

create or replace function public.set_ur_play_incident_status(
  target_incident uuid,
  target_status text,
  target_resolution_notes text default null,
  target_follow_up_notes text default null
)
returns public.ur_play_incidents
language sql
security invoker
set search_path to ''
as $function$
  select private.set_ur_play_incident_status(
    target_incident,target_status,target_resolution_notes,target_follow_up_notes
  );
$function$;

revoke all on function public.set_ur_play_incident_status(uuid,text,text,text) from public, anon;
grant execute on function public.set_ur_play_incident_status(uuid,text,text,text) to authenticated, service_role;

create or replace function private.confirm_ur_play_incident_review(
  target_session uuid,
  target_notes text default null
)
returns public.ur_play_incident_reviews
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_snapshot record;
  v_review public.ur_play_incident_reviews%rowtype;
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514'; end if;

  select * into v_snapshot from private.ur_play_incident_snapshot(target_session);
  if v_snapshot.session_status <> 'completed' then
    raise exception 'INCIDENT_REVIEW_SESSION_NOT_COMPLETED' using errcode='23514';
  end if;
  if v_snapshot.open_incidents>0 or v_snapshot.monitoring_incidents>0 or v_snapshot.follow_up_open>0 then
    raise exception 'INCIDENT_REVIEW_NOT_READY' using errcode='23514';
  end if;

  insert into public.ur_play_incident_reviews(
    session_id,status,reviewed_at,reviewed_by,no_incidents,notes,evidence_snapshot,
    reopened_at,reopened_by,reopen_reason,updated_at
  ) values(
    target_session,'confirmed',now(),v_actor,v_snapshot.total_incidents=0,
    v_notes,to_jsonb(v_snapshot),null,null,null,now()
  )
  on conflict(session_id) do update
  set
    status='confirmed',reviewed_at=excluded.reviewed_at,reviewed_by=excluded.reviewed_by,
    no_incidents=excluded.no_incidents,notes=excluded.notes,evidence_snapshot=excluded.evidence_snapshot,
    reopened_at=null,reopened_by=null,reopen_reason=null,updated_at=now()
  returning * into v_review;

  perform private.refresh_ur_play_incident_task(target_session);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.incident_review_confirmed','ur_play_session',target_session,
    jsonb_build_object('review',to_jsonb(v_review),'snapshot',to_jsonb(v_snapshot)),
    jsonb_build_object('notes',v_notes)
  );

  return v_review;
end;
$function$;

revoke all on function private.confirm_ur_play_incident_review(uuid,text) from public, anon;
grant execute on function private.confirm_ur_play_incident_review(uuid,text) to authenticated, service_role;

create or replace function public.confirm_ur_play_incident_review(target_session uuid,target_notes text default null)
returns public.ur_play_incident_reviews
language sql
security invoker
set search_path to ''
as $function$
  select private.confirm_ur_play_incident_review(target_session,target_notes);
$function$;

revoke all on function public.confirm_ur_play_incident_review(uuid,text) from public, anon;
grant execute on function public.confirm_ur_play_incident_review(uuid,text) to authenticated, service_role;

create or replace function private.reopen_ur_play_incident_review(target_session uuid,target_reason text)
returns public.ur_play_incident_reviews
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
  v_review public.ur_play_incident_reviews%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_INCIDENT_REVIEW_REOPEN_REQUIRED' using errcode='42501';
  end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514'; end if;
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'INCIDENT_REVIEW_REOPEN_REASON_REQUIRED' using errcode='23514';
  end if;

  update public.ur_play_incident_reviews
  set status='reopened',reopened_at=now(),reopened_by=v_actor,reopen_reason=v_reason,updated_at=now()
  where session_id=target_session and status='confirmed'
  returning * into v_review;
  if not found then raise exception 'INCIDENT_REVIEW_NOT_CONFIRMED' using errcode='23514'; end if;

  perform private.refresh_ur_play_incident_task(target_session);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.incident_review_reopened','ur_play_session',target_session,
    jsonb_build_object('status','reopened'),jsonb_build_object('reason',v_reason)
  );

  return v_review;
end;
$function$;

revoke all on function private.reopen_ur_play_incident_review(uuid,text) from public, anon;
grant execute on function private.reopen_ur_play_incident_review(uuid,text) to authenticated, service_role;

create or replace function public.reopen_ur_play_incident_review(target_session uuid,target_reason text)
returns public.ur_play_incident_reviews
language sql
security invoker
set search_path to ''
as $function$
  select private.reopen_ur_play_incident_review(target_session,target_reason);
$function$;

revoke all on function public.reopen_ur_play_incident_review(uuid,text) from public, anon;
grant execute on function public.reopen_ur_play_incident_review(uuid,text) to authenticated, service_role;

create or replace function private.invalidate_incident_review_on_change()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session uuid := new.session_id;
  v_actor uuid := coalesce(auth.uid(),new.created_by);
begin
  update public.ur_play_incident_reviews
  set
    status='reopened',
    reopened_at=now(),
    reopened_by=coalesce(v_actor,reviewed_by),
    reopen_reason='Ocorrência alterada após revisão confirmada',
    updated_at=now()
  where session_id=v_session and status='confirmed';

  perform private.refresh_ur_play_incident_task(v_session);
  return new;
end;
$function$;

revoke all on function private.invalidate_incident_review_on_change() from public, anon, authenticated;

drop trigger if exists ur_play_incident_change_reopens_review on public.ur_play_incidents;
create trigger ur_play_incident_change_reopens_review
after insert or update on public.ur_play_incidents
for each row
execute function private.invalidate_incident_review_on_change();

create or replace function private.seed_ur_play_incidents_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.refresh_ur_play_incident_task(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.seed_ur_play_incidents_on_completion() from public, anon, authenticated;

drop trigger if exists zzz_ur_play_session_seed_incidents on public.ur_play_sessions;
create trigger zzz_ur_play_session_seed_incidents
after update of status on public.ur_play_sessions
for each row
execute function private.seed_ur_play_incidents_on_completion();

create or replace function private.guard_post_session_incidents_before_close()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status text;
begin
  if new.status='closed' then
    perform private.refresh_ur_play_incident_task(new.session_id);
    select status into v_status
    from public.ur_play_post_session_tasks
    where session_id=new.session_id and task_key='incidents';
    if v_status is distinct from 'completed' then
      raise exception 'INCIDENTS_NOT_READY' using errcode='23514';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_post_session_incidents_before_close() from public, anon, authenticated;

drop trigger if exists ur_play_post_session_incident_guard on public.ur_play_post_session_closures;
create trigger ur_play_post_session_incident_guard
before insert or update of status on public.ur_play_post_session_closures
for each row
execute function private.guard_post_session_incidents_before_close();

update public.ur_play_post_session_tasks
set managed_by='system',updated_at=now()
where task_key='incidents' and managed_by<>'system';

create or replace function private.guard_ur_play_incident_mutation_after_360_close()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session uuid := coalesce(new.session_id,old.session_id);
begin
  if exists(
    select 1
    from public.ur_play_post_session_closures c
    where c.session_id=v_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_ur_play_incident_mutation_after_360_close()
  from public, anon, authenticated;

drop trigger if exists ur_play_incident_freeze_after_360_close
  on public.ur_play_incidents;

create trigger ur_play_incident_freeze_after_360_close
before insert or update on public.ur_play_incidents
for each row
execute function private.guard_ur_play_incident_mutation_after_360_close();

$incident_ddl$;
  elsif to_regclass('public.ur_play_incidents') is null
     or to_regclass('public.ur_play_incident_reviews') is null then
    raise exception 'PARTIAL_INCIDENT_SCHEMA_REQUIRES_REVIEW';
  end if;
end
$reconcile$;

-- Match Production's existing private-helper ACL in a clean replay.
revoke all on function private.insert_historical_ranking_events(
  uuid, uuid, uuid, text, public.ranking_transaction_scope,
  uuid, uuid, uuid, uuid, text, text, integer
) from public, anon, authenticated;

-- Record the already-homologated client-write restrictions forward-only.
drop policy if exists ur_coin_transactions_insert on public.ur_coin_transactions;
revoke insert on public.ur_coin_transactions from authenticated;
revoke all on function public.admin_create_team(text, uuid, text) from public, anon;
