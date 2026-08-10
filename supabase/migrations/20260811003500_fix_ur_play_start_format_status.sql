-- Production schema uses competitive_formats.status (entity_status), not an active boolean.
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
    and f.status::text='active';

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
