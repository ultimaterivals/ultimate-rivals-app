create or replace function private.ur_play_session_close_readiness(
  target_session uuid
)
returns table(
  session_status public.ur_play_session_status,
  total_matches integer,
  open_matches integer,
  completed_matches integer,
  homologated_results integer,
  pending_results integer,
  pending_attendance integer,
  ready boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status public.ur_play_session_status;
  v_total_matches integer := 0;
  v_open_matches integer := 0;
  v_completed_matches integer := 0;
  v_homologated_results integer := 0;
  v_pending_results integer := 0;
  v_pending_attendance integer := 0;
begin
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select s.status into v_status
  from public.ur_play_sessions s
  where s.id=target_session;
  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  select
    count(*) filter (where m.status <> 'cancelled')::integer,
    count(*) filter (where m.status not in ('completed','cancelled'))::integer,
    count(*) filter (where m.status='completed')::integer
  into v_total_matches,v_open_matches,v_completed_matches
  from public.matches m
  where m.session_id=target_session;

  select count(distinct m.id)::integer
  into v_homologated_results
  from public.matches m
  join public.match_results r on r.match_id=m.id
  where m.session_id=target_session
    and m.status='completed'
    and r.result_status='homologated';

  v_pending_results := greatest(v_completed_matches-v_homologated_results,0);

  select count(*)::integer
  into v_pending_attendance
  from public.ur_play_registrations r
  where r.session_id=target_session
    and r.registration_status='confirmed'
    and r.attendance_status='unknown';

  return query
  select
    v_status,
    v_total_matches,
    v_open_matches,
    v_completed_matches,
    v_homologated_results,
    v_pending_results,
    v_pending_attendance,
    (
      v_status='in_progress'
      and v_total_matches > 0
      and v_open_matches=0
      and v_pending_results=0
      and v_pending_attendance=0
    );
end;
$function$;

revoke all on function private.ur_play_session_close_readiness(uuid)
  from public, anon;
grant execute on function private.ur_play_session_close_readiness(uuid)
  to authenticated, service_role;

create or replace function public.get_ur_play_session_close_readiness(
  target_session uuid
)
returns table(
  session_status public.ur_play_session_status,
  total_matches integer,
  open_matches integer,
  completed_matches integer,
  homologated_results integer,
  pending_results integer,
  pending_attendance integer,
  ready boolean
)
language sql
security invoker
set search_path to ''
as $function$
  select * from private.ur_play_session_close_readiness(target_session);
$function$;

revoke all on function public.get_ur_play_session_close_readiness(uuid)
  from public, anon;
grant execute on function public.get_ur_play_session_close_readiness(uuid)
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
  v_close_ready boolean;
begin
  if not private.operates_ur_play_session(target_session_id) then
    raise exception 'session operation denied' using errcode='42501';
  end if;

  select status into old_status
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
    select r.ready into v_start_ready
    from private.ur_play_session_start_readiness(target_session_id) r;
    if not coalesce(v_start_ready,false) then
      raise exception 'UR_PLAY_START_NOT_READY' using errcode='23514';
    end if;
  end if;

  if old_status='in_progress' and target_status='completed' then
    select r.ready into v_close_ready
    from private.ur_play_session_close_readiness(target_session_id) r;
    if not coalesce(v_close_ready,false) then
      raise exception 'UR_PLAY_CLOSE_NOT_READY' using errcode='23514';
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

create or replace function private.complete_ur_play_session(
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

  select status into v_status
  from public.ur_play_sessions
  where id=target_session_id
  for update;
  if not found then
    raise exception 'UR_PLAY_SESSION_NOT_FOUND';
  end if;

  if v_status <> 'in_progress' then
    raise exception 'UR_PLAY_CLOSE_REQUIRES_IN_PROGRESS' using errcode='23514';
  end if;

  select * into v_readiness
  from private.ur_play_session_close_readiness(target_session_id);

  if v_readiness.ready then
    v_result := private.transition_ur_play_session(
      target_session_id,
      'completed',
      null
    );
  else
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'UR_PLAY_CLOSE_NOT_READY' using errcode='23514';
    end if;
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'ADMIN_CLOSE_OVERRIDE_REASON_REQUIRED' using errcode='23514';
    end if;

    update public.ur_play_sessions
    set status='completed', ready_for_matchmaking=false
    where id=target_session_id
    returning * into v_result;
    v_overridden := true;
  end if;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values (
    v_actor,
    case
      when v_overridden then 'ur_play.session_close_overridden'
      else 'ur_play.session_completed'
    end,
    'ur_play_session',
    target_session_id,
    jsonb_build_object(
      'status','completed',
      'overridden',v_overridden,
      'total_matches',v_readiness.total_matches,
      'open_matches',v_readiness.open_matches,
      'completed_matches',v_readiness.completed_matches,
      'homologated_results',v_readiness.homologated_results,
      'pending_results',v_readiness.pending_results,
      'pending_attendance',v_readiness.pending_attendance
    ),
    jsonb_build_object(
      'source','admin_ur_play_close',
      'override_reason',case when v_overridden then v_reason else null end
    )
  );

  return jsonb_build_object(
    'session_id',v_result.id,
    'status',v_result.status,
    'overridden',v_overridden,
    'total_matches',v_readiness.total_matches,
    'open_matches',v_readiness.open_matches,
    'completed_matches',v_readiness.completed_matches,
    'homologated_results',v_readiness.homologated_results,
    'pending_results',v_readiness.pending_results,
    'pending_attendance',v_readiness.pending_attendance
  );
end;
$function$;

revoke all on function private.complete_ur_play_session(uuid,text)
  from public, anon;
grant execute on function private.complete_ur_play_session(uuid,text)
  to authenticated, service_role;

create or replace function public.complete_ur_play_session(
  target_session_id uuid,
  override_reason text default null
)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
  select private.complete_ur_play_session(target_session_id,override_reason);
$function$;

revoke all on function public.complete_ur_play_session(uuid,text)
  from public, anon;
grant execute on function public.complete_ur_play_session(uuid,text)
  to authenticated, service_role;
