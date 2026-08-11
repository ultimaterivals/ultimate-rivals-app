create table if not exists public.ur_play_feedback_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  registration_id uuid not null references public.ur_play_registrations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  status text not null default 'pending',
  channel text,
  dispatch_mode text,
  dispatch_evidence text,
  sent_at timestamptz,
  sent_by uuid references public.profiles(id),
  recommendation_score smallint,
  response_comment text,
  responded_at timestamptz,
  response_recorded_by uuid references public.profiles(id),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_feedback_requests_registration_unique unique(registration_id),
  constraint ur_play_feedback_requests_status_check check (
    status in ('pending','sent','responded','waived')
  ),
  constraint ur_play_feedback_requests_channel_check check (
    channel is null or channel in ('app','whatsapp','email','instagram','phone','other')
  ),
  constraint ur_play_feedback_requests_dispatch_mode_check check (
    dispatch_mode is null or dispatch_mode in ('system','human')
  ),
  constraint ur_play_feedback_requests_score_check check (
    recommendation_score is null or recommendation_score between 0 and 10
  ),
  constraint ur_play_feedback_requests_dispatch_check check (
    status not in ('sent','responded') or (
      channel is not null
      and dispatch_mode is not null
      and sent_at is not null
      and nullif(trim(coalesce(dispatch_evidence,'')),'') is not null
    )
  ),
  constraint ur_play_feedback_requests_response_check check (
    status <> 'responded' or (
      recommendation_score is not null
      and responded_at is not null
    )
  ),
  constraint ur_play_feedback_requests_waiver_check check (
    status <> 'waived' or (
      waived_at is not null
      and waived_by is not null
      and char_length(trim(coalesce(waiver_reason,''))) >= 10
    )
  )
);

create index if not exists ur_play_feedback_requests_session_idx
  on public.ur_play_feedback_requests(session_id,status,created_at);
create index if not exists ur_play_feedback_requests_athlete_idx
  on public.ur_play_feedback_requests(athlete_id,status,created_at desc);

alter table public.ur_play_feedback_requests enable row level security;
revoke all on table public.ur_play_feedback_requests from public, anon;
grant select on table public.ur_play_feedback_requests to authenticated, service_role;

create policy ur_play_feedback_requests_read
on public.ur_play_feedback_requests
for select
to authenticated
using (
  private.operates_ur_play_session(session_id)
  or exists (
    select 1
    from public.athletes a
    where a.id=athlete_id and a.profile_id=auth.uid()
  )
);

create or replace function private.assert_ur_play_feedback_dispatch_mutable(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
end;
$function$;

revoke all on function private.assert_ur_play_feedback_dispatch_mutable(uuid)
  from public, anon, authenticated;
grant execute on function private.assert_ur_play_feedback_dispatch_mutable(uuid)
  to service_role;

create or replace function private.ensure_ur_play_feedback_requests(target_session uuid)
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
  if v_session.status <> 'completed' then return; end if;

  perform private.ensure_ur_play_post_session_tasks(target_session);

  insert into public.ur_play_feedback_requests(
    session_id,registration_id,athlete_id,status,channel,dispatch_mode,
    dispatch_evidence,sent_at
  )
  select
    target_session,
    r.id,
    r.athlete_id,
    case when a.profile_id is not null then 'sent' else 'pending' end,
    case when a.profile_id is not null then 'app' else null end,
    case when a.profile_id is not null then 'system' else null end,
    case when a.profile_id is not null then 'athlete_portal:/athlete/feedback' else null end,
    case when a.profile_id is not null then now() else null end
  from public.ur_play_registrations r
  join public.athletes a on a.id=r.athlete_id
  where r.session_id=target_session
    and r.registration_status='confirmed'
    and r.attendance_status in ('checked_in','present')
  on conflict(registration_id) do nothing;

  update public.ur_play_feedback_requests f
  set
    status='sent',
    channel='app',
    dispatch_mode='system',
    dispatch_evidence='athlete_portal:/athlete/feedback',
    sent_at=coalesce(f.sent_at,now()),
    updated_at=now()
  from public.athletes a
  where f.session_id=target_session
    and f.athlete_id=a.id
    and a.profile_id is not null
    and f.status='pending';

  update public.ur_play_post_session_tasks
  set managed_by='system',blocking=true,due_at=v_session.ends_at+interval '48 hours',updated_at=now()
  where session_id=target_session and task_key='feedback';
end;
$function$;

revoke all on function private.ensure_ur_play_feedback_requests(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_ur_play_feedback_requests(uuid)
  to service_role;

create or replace function private.refresh_ur_play_feedback_evidence(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_eligible integer := 0;
  v_sent integer := 0;
  v_responded integer := 0;
  v_waived integer := 0;
  v_pending integer := 0;
  v_promoters integer := 0;
  v_passives integer := 0;
  v_detractors integer := 0;
  v_average numeric := null;
  v_standard_nps numeric := null;
  v_response_rate numeric := 0;
  v_ready boolean := false;
begin
  perform private.ensure_ur_play_feedback_requests(target_session);

  select
    count(*)::integer,
    count(*) filter(where status='sent')::integer,
    count(*) filter(where status='responded')::integer,
    count(*) filter(where status='waived')::integer,
    count(*) filter(where status='pending')::integer,
    count(*) filter(where recommendation_score between 9 and 10)::integer,
    count(*) filter(where recommendation_score between 7 and 8)::integer,
    count(*) filter(where recommendation_score between 0 and 6)::integer,
    round(avg(recommendation_score)::numeric,2)
  into
    v_eligible,v_sent,v_responded,v_waived,v_pending,
    v_promoters,v_passives,v_detractors,v_average
  from public.ur_play_feedback_requests
  where session_id=target_session;

  if v_eligible > 0 then
    v_response_rate := round((v_responded::numeric / v_eligible::numeric) * 100,2);
  end if;

  if v_responded > 0 then
    v_standard_nps := round(
      ((v_promoters::numeric-v_detractors::numeric) / v_responded::numeric) * 100,
      2
    );
  end if;

  v_ready := v_pending=0;

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    status=case when v_ready then 'completed' else 'in_progress' end,
    evidence=jsonb_build_object(
      'eligible_athletes',v_eligible,
      'requests_sent',v_sent,
      'responses_received',v_responded,
      'requests_waived',v_waived,
      'pending_dispatch',v_pending,
      'response_rate_pct',v_response_rate,
      'average_recommendation_score',v_average,
      'standard_nps_score',v_standard_nps,
      'promoters',v_promoters,
      'passives',v_passives,
      'detractors',v_detractors,
      'ur_target_average_above_8',case when v_average is null then null else v_average>8 end,
      'verified_at',now()
    ),
    completed_at=case when v_ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='feedback';
end;
$function$;

revoke all on function private.refresh_ur_play_feedback_evidence(uuid)
  from public, anon, authenticated;
grant execute on function private.refresh_ur_play_feedback_evidence(uuid)
  to service_role;

create or replace function private.confirm_ur_play_feedback_dispatch(
  target_request uuid,
  target_channel text,
  target_evidence text
)
returns public.ur_play_feedback_requests
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_feedback_requests%rowtype;
  v_before jsonb;
  v_evidence text := nullif(trim(coalesce(target_evidence,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_channel not in ('whatsapp','email','instagram','phone','other') then
    raise exception 'INVALID_FEEDBACK_CHANNEL' using errcode='23514';
  end if;
  if v_evidence is null or char_length(v_evidence)<3 then
    raise exception 'FEEDBACK_DISPATCH_EVIDENCE_REQUIRED' using errcode='23514';
  end if;

  select * into v_row
  from public.ur_play_feedback_requests
  where id=target_request
  for update;

  if not found then raise exception 'FEEDBACK_REQUEST_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_feedback_dispatch_mutable(v_row.session_id);

  if v_row.status in ('sent','responded') then return v_row; end if;
  if v_row.status='waived' then raise exception 'FEEDBACK_REQUEST_WAIVED' using errcode='23514'; end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_feedback_requests
  set
    status='sent',channel=target_channel,dispatch_mode='human',
    dispatch_evidence=v_evidence,sent_at=now(),sent_by=v_actor,updated_at=now()
  where id=target_request
  returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.feedback.dispatched','ur_play_feedback_request',v_row.id,
    v_before,to_jsonb(v_row),jsonb_build_object('session_id',v_row.session_id,'channel',target_channel)
  );

  perform private.refresh_ur_play_feedback_evidence(v_row.session_id);
  return v_row;
end;
$function$;

revoke all on function private.confirm_ur_play_feedback_dispatch(uuid,text,text)
  from public, anon;
grant execute on function private.confirm_ur_play_feedback_dispatch(uuid,text,text)
  to authenticated, service_role;

create or replace function public.confirm_ur_play_feedback_dispatch(
  target_request uuid,
  target_channel text,
  target_evidence text
)
returns public.ur_play_feedback_requests
language sql
security invoker
set search_path to ''
as $function$
  select private.confirm_ur_play_feedback_dispatch(target_request,target_channel,target_evidence);
$function$;

revoke all on function public.confirm_ur_play_feedback_dispatch(uuid,text,text)
  from public, anon;
grant execute on function public.confirm_ur_play_feedback_dispatch(uuid,text,text)
  to authenticated, service_role;

create or replace function private.record_ur_play_feedback_response(
  target_request uuid,
  target_score integer,
  target_comment text default null
)
returns public.ur_play_feedback_requests
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_feedback_requests%rowtype;
  v_before jsonb;
  v_comment text := nullif(trim(coalesce(target_comment,'')),'');
  v_closed boolean := false;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_score < 0 or target_score > 10 then raise exception 'INVALID_FEEDBACK_SCORE' using errcode='23514'; end if;

  select * into v_row from public.ur_play_feedback_requests where id=target_request for update;
  if not found then raise exception 'FEEDBACK_REQUEST_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if v_row.status='pending' then raise exception 'FEEDBACK_NOT_DISPATCHED' using errcode='23514'; end if;
  if v_row.status='waived' then raise exception 'FEEDBACK_REQUEST_WAIVED' using errcode='23514'; end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_feedback_requests
  set status='responded',recommendation_score=target_score,response_comment=v_comment,
      responded_at=now(),response_recorded_by=v_actor,updated_at=now()
  where id=target_request
  returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.feedback.response_recorded','ur_play_feedback_request',v_row.id,
    v_before,to_jsonb(v_row),jsonb_build_object('session_id',v_row.session_id,'score',target_score)
  );

  select exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=v_row.session_id and c.status='closed'
  ) into v_closed;
  if not v_closed then perform private.refresh_ur_play_feedback_evidence(v_row.session_id); end if;
  return v_row;
end;
$function$;

revoke all on function private.record_ur_play_feedback_response(uuid,integer,text)
  from public, anon;
grant execute on function private.record_ur_play_feedback_response(uuid,integer,text)
  to authenticated, service_role;

create or replace function public.record_ur_play_feedback_response(
  target_request uuid,
  target_score integer,
  target_comment text default null
)
returns public.ur_play_feedback_requests
language sql
security invoker
set search_path to ''
as $function$
  select private.record_ur_play_feedback_response(target_request,target_score,target_comment);
$function$;

revoke all on function public.record_ur_play_feedback_response(uuid,integer,text)
  from public, anon;
grant execute on function public.record_ur_play_feedback_response(uuid,integer,text)
  to authenticated, service_role;

create or replace function private.submit_my_ur_play_feedback(
  target_request uuid,
  target_score integer,
  target_comment text default null
)
returns public.ur_play_feedback_requests
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_feedback_requests%rowtype;
  v_before jsonb;
  v_comment text := nullif(trim(coalesce(target_comment,'')),'');
  v_closed boolean := false;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_score < 0 or target_score > 10 then raise exception 'INVALID_FEEDBACK_SCORE' using errcode='23514'; end if;

  select f.* into v_row
  from public.ur_play_feedback_requests f
  join public.athletes a on a.id=f.athlete_id
  where f.id=target_request and a.profile_id=v_actor
  for update of f;

  if not found then raise exception 'FEEDBACK_REQUEST_NOT_FOUND' using errcode='42501'; end if;
  if v_row.status='pending' then raise exception 'FEEDBACK_NOT_DISPATCHED' using errcode='23514'; end if;
  if v_row.status='waived' then raise exception 'FEEDBACK_REQUEST_WAIVED' using errcode='23514'; end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_feedback_requests
  set status='responded',recommendation_score=target_score,response_comment=v_comment,
      responded_at=now(),response_recorded_by=null,updated_at=now()
  where id=target_request
  returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.feedback.athlete_response','ur_play_feedback_request',v_row.id,
    v_before,to_jsonb(v_row),jsonb_build_object('session_id',v_row.session_id,'score',target_score)
  );

  select exists(
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=v_row.session_id and c.status='closed'
  ) into v_closed;
  if not v_closed then perform private.refresh_ur_play_feedback_evidence(v_row.session_id); end if;
  return v_row;
end;
$function$;

revoke all on function private.submit_my_ur_play_feedback(uuid,integer,text)
  from public, anon, authenticated;
grant execute on function private.submit_my_ur_play_feedback(uuid,integer,text)
  to service_role;

create or replace function public.submit_my_ur_play_feedback(
  target_request uuid,
  target_score integer,
  target_comment text default null
)
returns public.ur_play_feedback_requests
language sql
security invoker
set search_path to ''
as $function$
  select private.submit_my_ur_play_feedback(target_request,target_score,target_comment);
$function$;

revoke all on function public.submit_my_ur_play_feedback(uuid,integer,text)
  from public, anon;
grant execute on function public.submit_my_ur_play_feedback(uuid,integer,text)
  to authenticated, service_role;

create or replace function private.waive_ur_play_feedback_request(
  target_request uuid,
  target_reason text
)
returns public.ur_play_feedback_requests
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_feedback_requests%rowtype;
  v_before jsonb;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_FEEDBACK_WAIVER_REQUIRED' using errcode='42501';
  end if;
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'FEEDBACK_WAIVER_REASON_REQUIRED' using errcode='23514';
  end if;

  select * into v_row from public.ur_play_feedback_requests where id=target_request for update;
  if not found then raise exception 'FEEDBACK_REQUEST_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  perform private.assert_ur_play_feedback_dispatch_mutable(v_row.session_id);
  if v_row.status='responded' then raise exception 'FEEDBACK_ALREADY_RESPONDED' using errcode='23514'; end if;

  v_before := to_jsonb(v_row);

  update public.ur_play_feedback_requests
  set status='waived',waived_at=now(),waived_by=v_actor,waiver_reason=v_reason,updated_at=now()
  where id=target_request returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.feedback.waived','ur_play_feedback_request',v_row.id,
    v_before,to_jsonb(v_row),jsonb_build_object('session_id',v_row.session_id,'reason',v_reason)
  );

  perform private.refresh_ur_play_feedback_evidence(v_row.session_id);
  return v_row;
end;
$function$;

revoke all on function private.waive_ur_play_feedback_request(uuid,text)
  from public, anon;
grant execute on function private.waive_ur_play_feedback_request(uuid,text)
  to authenticated, service_role;

create or replace function public.waive_ur_play_feedback_request(
  target_request uuid,
  target_reason text
)
returns public.ur_play_feedback_requests
language sql
security invoker
set search_path to ''
as $function$
  select private.waive_ur_play_feedback_request(target_request,target_reason);
$function$;

revoke all on function public.waive_ur_play_feedback_request(uuid,text)
  from public, anon;
grant execute on function public.waive_ur_play_feedback_request(uuid,text)
  to authenticated, service_role;

create or replace function private.sync_ur_play_feedback_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.ensure_ur_play_feedback_requests(new.id);
    perform private.refresh_ur_play_feedback_evidence(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_ur_play_feedback_on_completion()
  from public, anon, authenticated;

drop trigger if exists ur_play_session_seed_feedback on public.ur_play_sessions;
create trigger ur_play_session_seed_feedback
after update of status on public.ur_play_sessions
for each row
execute function private.sync_ur_play_feedback_on_completion();

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
        select 1 from public.ur_play_post_session_closures c
        where c.session_id=s.id and c.status='closed'
      )
  loop
    perform private.ensure_ur_play_feedback_requests(v_session.id);
    perform private.refresh_ur_play_feedback_evidence(v_session.id);
  end loop;
end;
$migration$;