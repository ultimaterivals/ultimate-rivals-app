create or replace function private.ur_play_session_start_readiness(
  target_session uuid
)
returns table(
  session_status public.ur_play_session_status,
  critical_ready integer,
  critical_total integer,
  court_ready boolean,
  minimum_athletes integer,
  checked_in integer,
  ready boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status public.ur_play_session_status;
  v_critical_ready integer := 0;
  v_critical_total integer := 6;
  v_court_ready boolean := false;
  v_minimum_athletes integer := 0;
  v_checked_in integer := 0;
begin
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select s.status
  into v_status
  from public.ur_play_sessions s
  where s.id=target_session;
  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  select count(*)::integer
  into v_critical_ready
  from public.ur_play_session_preflight_checks c
  where c.session_id=target_session
    and c.is_checked=true
    and c.check_key = any(array[
      'court_access_confirmed',
      'balls_score_ready',
      'first_aid_ready',
      'device_offline_ready',
      'operation_owner_ready',
      'athlete_briefing_ready'
    ]::text[]);

  select exists(
    select 1
    from public.ur_play_session_courts sc
    join public.courts c on c.id=sc.court_id
    where sc.session_id=target_session
      and sc.status::text='active'
      and c.status::text='active'
  ) into v_court_ready;

  select case
    when coalesce(bool_or(f.code='fours'),false) then 8
    when coalesce(bool_or(f.code='doubles'),false) then 4
    else 0
  end
  into v_minimum_athletes
  from public.ur_play_session_scopes ss
  join public.competitive_formats f on f.id=ss.format_id
  where ss.session_id=target_session
    and f.active=true;

  select count(*)::integer
  into v_checked_in
  from public.ur_play_checkins ci
  where ci.session_id=target_session
    and ci.status='active';

  return query
  select
    v_status,
    v_critical_ready,
    v_critical_total,
    v_court_ready,
    v_minimum_athletes,
    v_checked_in,
    (
      v_status='checkin_open'
      and v_critical_ready=v_critical_total
      and v_court_ready
      and v_minimum_athletes > 0
      and v_checked_in >= v_minimum_athletes
    );
end;
$function$;

revoke all on function private.ur_play_session_start_readiness(uuid)
  from public, anon;
grant execute on function private.ur_play_session_start_readiness(uuid)
  to authenticated, service_role;

create or replace function public.get_ur_play_session_start_readiness(
  target_session uuid
)
returns table(
  session_status public.ur_play_session_status,
  critical_ready integer,
  critical_total integer,
  court_ready boolean,
  minimum_athletes integer,
  checked_in integer,
  ready boolean
)
language sql
security invoker
set search_path to ''
as $function$
  select * from private.ur_play_session_start_readiness(target_session);
$function$;

revoke all on function public.get_ur_play_session_start_readiness(uuid)
  from public, anon;
grant execute on function public.get_ur_play_session_start_readiness(uuid)
  to authenticated, service_role;

create or replace function private.transition_ur_play_session(
  target_session_id uuid,
  target_status public.ur_play_session_status,
  cancel_reason text default null
)
returns public.ur_play_sessions
language plpgsql
security definer
set search_path to ''
as $function$
declare
  old_status public.ur_play_session_status;
  result public.ur_play_sessions;
  v_start_ready boolean;
begin
  if not private.operates_ur_play_session(target_session_id) then
    raise exception 'session operation denied' using errcode='42501';
  end if;

  select status
  into old_status
  from public.ur_play_sessions
  where id=target_session_id
  for update;

  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  if target_status='cancelled' then
    if not private.has_any_role(array['admin']::public.app_role[])
      or coalesce(char_length(trim(cancel_reason)),0)<10 then
      raise exception 'admin cancellation reason required' using errcode='23514';
    end if;
  elsif not (
    (old_status='draft' and target_status='published')
    or (old_status='published' and target_status='registration_open')
    or (old_status='registration_open' and target_status='registration_closed')
    or (old_status='registration_closed' and target_status='checkin_open')
    or (old_status='checkin_open' and target_status='in_progress')
    or (old_status='in_progress' and target_status='completed')
  ) then
    raise exception 'invalid session transition' using errcode='23514';
  end if;

  if old_status='checkin_open' and target_status='in_progress' then
    select r.ready
    into v_start_ready
    from private.ur_play_session_start_readiness(target_session_id) r;

    if not coalesce(v_start_ready,false) then
      raise exception 'UR_PLAY_START_NOT_READY' using errcode='23514';
    end if;
  end if;

  update public.ur_play_sessions
  set
    status=target_status,
    cancelled_at=case when target_status='cancelled' then now() else cancelled_at end,
    cancellation_reason=case when target_status='cancelled' then cancel_reason else cancellation_reason end,
    ready_for_matchmaking=target_status='in_progress'
  where id=target_session_id
  returning * into result;

  return result;
end;
$function$;

create or replace function private.start_ur_play_session(
  target_session_id uuid,
  override_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(override_reason,'')),'');
  v_status public.ur_play_session_status;
  v_readiness record;
  v_result public.ur_play_sessions;
  v_overridden boolean := false;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  if not private.operates_ur_play_session(target_session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select status
  into v_status
  from public.ur_play_sessions
  where id=target_session_id
  for update;
  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  if v_status <> 'checkin_open' then
    raise exception 'UR_PLAY_START_REQUIRES_CHECKIN_OPEN' using errcode='23514';
  end if;

  select *
  into v_readiness
  from private.ur_play_session_start_readiness(target_session_id);

  if v_readiness.ready then
    v_result := private.transition_ur_play_session(
      target_session_id,
      'in_progress',
      null
    );
  else
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'UR_PLAY_START_NOT_READY' using errcode='23514';
    end if;
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'ADMIN_START_OVERRIDE_REASON_REQUIRED' using errcode='23514';
    end if;

    update public.ur_play_sessions
    set status='in_progress', ready_for_matchmaking=true
    where id=target_session_id
    returning * into v_result;
    v_overridden := true;
  end if;

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    v_actor,
    case
      when v_overridden then 'ur_play.session_start_overridden'
      else 'ur_play.session_started'
    end,
    'ur_play_session',
    target_session_id,
    jsonb_build_object(
      'status','in_progress',
      'overridden',v_overridden,
      'critical_ready',v_readiness.critical_ready,
      'critical_total',v_readiness.critical_total,
      'court_ready',v_readiness.court_ready,
      'minimum_athletes',v_readiness.minimum_athletes,
      'checked_in',v_readiness.checked_in
    ),
    jsonb_build_object(
      'source','admin_ur_play_start',
      'override_reason',case when v_overridden then v_reason else null end
    )
  );

  return jsonb_build_object(
    'session_id',v_result.id,
    'status',v_result.status,
    'overridden',v_overridden,
    'critical_ready',v_readiness.critical_ready,
    'critical_total',v_readiness.critical_total,
    'court_ready',v_readiness.court_ready,
    'minimum_athletes',v_readiness.minimum_athletes,
    'checked_in',v_readiness.checked_in
  );
end;
$function$;

revoke all on function private.start_ur_play_session(uuid,text)
  from public, anon;
grant execute on function private.start_ur_play_session(uuid,text)
  to authenticated, service_role;

create or replace function public.start_ur_play_session(
  target_session_id uuid,
  override_reason text default null
)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
  select private.start_ur_play_session(target_session_id,override_reason);
$function$;

revoke all on function public.start_ur_play_session(uuid,text)
  from public, anon;
grant execute on function public.start_ur_play_session(uuid,text)
  to authenticated, service_role;
