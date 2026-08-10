create table if not exists public.ur_play_session_preflight_checks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  check_key text not null check (
    check_key in (
      'court_access_confirmed',
      'balls_score_ready',
      'first_aid_ready',
      'device_offline_ready',
      'operation_owner_ready',
      'athlete_briefing_ready',
      'media_ready',
      'reception_ready',
      'water_support_ready'
    )
  ),
  is_checked boolean not null default false,
  note text,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint ur_play_session_preflight_note_length check (
    note is null or char_length(note) <= 500
  ),
  constraint ur_play_session_preflight_unique unique (session_id, check_key)
);

create index if not exists ur_play_session_preflight_session_idx
  on public.ur_play_session_preflight_checks(session_id, check_key);

alter table public.ur_play_session_preflight_checks enable row level security;

drop policy if exists ur_play_preflight_read on public.ur_play_session_preflight_checks;
create policy ur_play_preflight_read
  on public.ur_play_session_preflight_checks
  for select
  to authenticated
  using (private.operates_ur_play_session(session_id));

create or replace function private.set_ur_play_session_preflight_check(
  target_session uuid,
  target_key text,
  target_checked boolean,
  target_note text default null
)
returns public.ur_play_session_preflight_checks
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_note text := nullif(trim(coalesce(target_note,'')),'');
  v_result public.ur_play_session_preflight_checks;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  if not exists(select 1 from public.ur_play_sessions where id=target_session) then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if target_key not in (
    'court_access_confirmed',
    'balls_score_ready',
    'first_aid_ready',
    'device_offline_ready',
    'operation_owner_ready',
    'athlete_briefing_ready',
    'media_ready',
    'reception_ready',
    'water_support_ready'
  ) then
    raise exception 'INVALID_PREFLIGHT_KEY';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'PREFLIGHT_NOTE_TOO_LONG';
  end if;

  insert into public.ur_play_session_preflight_checks(
    session_id,
    check_key,
    is_checked,
    note,
    updated_by,
    updated_at
  ) values (
    target_session,
    target_key,
    coalesce(target_checked,false),
    v_note,
    v_actor,
    now()
  )
  on conflict (session_id,check_key)
  do update set
    is_checked=excluded.is_checked,
    note=excluded.note,
    updated_by=excluded.updated_by,
    updated_at=now()
  returning * into v_result;

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    v_actor,
    'ur_play.preflight_check_updated',
    'ur_play_session',
    target_session,
    jsonb_build_object(
      'check_key',target_key,
      'is_checked',coalesce(target_checked,false),
      'note',v_note
    ),
    jsonb_build_object('source','admin_ur_play_preflight')
  );

  return v_result;
end;
$function$;

revoke all on function private.set_ur_play_session_preflight_check(uuid,text,boolean,text)
  from public, anon;
grant execute on function private.set_ur_play_session_preflight_check(uuid,text,boolean,text)
  to authenticated, service_role;

create or replace function public.set_ur_play_session_preflight_check(
  target_session uuid,
  target_key text,
  target_checked boolean,
  target_note text default null
)
returns public.ur_play_session_preflight_checks
language sql
security invoker
set search_path to ''
as $function$
  select private.set_ur_play_session_preflight_check(
    target_session,
    target_key,
    target_checked,
    target_note
  );
$function$;

revoke all on function public.set_ur_play_session_preflight_check(uuid,text,boolean,text)
  from public, anon;
grant execute on function public.set_ur_play_session_preflight_check(uuid,text,boolean,text)
  to authenticated, service_role;
