create or replace function private.consume_activity_reservation_for_ur_play(
  p_registration_id uuid,
  p_operation_id uuid,
  p_activity_status text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_reservation public.activity_reservations%rowtype;
  v_athlete_package_id uuid;
  v_ledger_id uuid;
begin
  if p_operation_id is null then raise exception 'OPERATION_ID_REQUIRED'; end if;
  if p_activity_status not in ('consumed','no_show') then raise exception 'INVALID_ACTIVITY_ATTENDANCE_STATUS'; end if;

  select * into v_reservation
  from public.activity_reservations
  where ur_play_registration_id=p_registration_id
  for update;

  if not found then return null; end if;
  if v_reservation.status='cancelled' then raise exception 'ACTIVITY_RESERVATION_CANCELLED'; end if;
  if v_reservation.status in ('consumed','no_show') then return v_reservation.id; end if;

  select l.athlete_package_id into v_athlete_package_id
  from public.commercial_credit_ledger l
  where l.reservation_id=v_reservation.id
  group by l.athlete_package_id
  having sum(l.reserved_delta)>0
  order by max(l.occurred_at) desc
  limit 1;

  if v_athlete_package_id is null then raise exception 'RESERVATION_CREDIT_HOLD_NOT_FOUND'; end if;
  perform 1 from public.athlete_commercial_packages ap where ap.id=v_athlete_package_id for update;

  insert into public.commercial_credit_ledger(
    athlete_id,athlete_package_id,reservation_id,opportunity_id,event_type,
    reserved_delta,consumed_delta,idempotency_key,reason,actor_user_id,metadata
  ) values(
    v_reservation.athlete_id,v_athlete_package_id,v_reservation.id,v_reservation.opportunity_id,'consume',
    -1,1,'ur-play-attendance-consume:'||p_registration_id::text,
    coalesce(nullif(trim(p_reason),''),'Participação UR Play consumida'),auth.uid(),
    jsonb_build_object('source','ur_play_attendance','registration_id',p_registration_id,'activity_status',p_activity_status,'operation_id',p_operation_id)
  )
  on conflict(idempotency_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is not null then
    update public.athlete_commercial_packages set units_used=units_used+1 where id=v_athlete_package_id;
  end if;

  update public.activity_reservations
  set status=p_activity_status,waitlist_position=null,updated_at=now()
  where id=v_reservation.id;

  return v_reservation.id;
end;
$$;

create or replace function private.guard_ur_play_checkin_against_no_show()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_registration public.ur_play_registrations%rowtype;
begin
  select * into v_registration from public.ur_play_registrations where id=new.registration_id for update;
  if not found then raise exception 'UR_PLAY_REGISTRATION_NOT_FOUND'; end if;
  if v_registration.registration_status<>'confirmed' then raise exception 'UR_PLAY_REGISTRATION_NOT_CONFIRMED'; end if;
  if v_registration.attendance_status='no_show' then raise exception 'UR_PLAY_ALREADY_NO_SHOW'; end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_ur_play_checkin_against_no_show on public.ur_play_checkins;
create trigger trg_guard_ur_play_checkin_against_no_show
before insert on public.ur_play_checkins
for each row execute function private.guard_ur_play_checkin_against_no_show();

create or replace function private.sync_ur_play_checkin_to_credit()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_operation_id uuid;
begin
  update public.ur_play_registrations
  set attendance_status='checked_in',updated_at=now()
  where id=new.registration_id and attendance_status<>'no_show';

  v_operation_id:=coalesce(new.client_operation_id,gen_random_uuid());
  perform private.consume_activity_reservation_for_ur_play(
    new.registration_id,v_operation_id,'consumed','Crédito consumido no check-in oficial do UR Play'
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_ur_play_checkin_to_credit on public.ur_play_checkins;
create trigger trg_sync_ur_play_checkin_to_credit
after insert on public.ur_play_checkins
for each row execute function private.sync_ur_play_checkin_to_credit();

create or replace function private.admin_manual_checkin_ur_play(
  p_registration_id uuid,
  p_operation_id uuid
)
returns public.ur_play_checkins
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_registration public.ur_play_registrations%rowtype;
  v_method public.ur_play_checkin_method;
  v_method_text text;
  v_result public.ur_play_checkins;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_operation_id is null then raise exception 'OPERATION_ID_REQUIRED'; end if;

  select * into v_registration from public.ur_play_registrations where id=p_registration_id for update;
  if not found then raise exception 'UR_PLAY_REGISTRATION_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_registration.session_id) then raise exception 'OPERATION_DENIED'; end if;

  select e.enumlabel into v_method_text
  from pg_catalog.pg_enum e
  join pg_catalog.pg_type t on t.oid=e.enumtypid
  join pg_catalog.pg_namespace n on n.oid=t.typnamespace
  where n.nspname='public' and t.typname='ur_play_checkin_method'
  order by case e.enumlabel when 'manual' then 0 when 'operator' then 1 else 2 end,e.enumsortorder
  limit 1;
  if v_method_text is null then raise exception 'CHECKIN_METHOD_NOT_CONFIGURED'; end if;
  v_method:=v_method_text::public.ur_play_checkin_method;

  v_result:=private.checkin_ur_play(p_registration_id,v_method,p_operation_id);
  return v_result;
end;
$$;

create or replace function private.admin_mark_ur_play_no_show(
  p_registration_id uuid,
  p_operation_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_registration public.ur_play_registrations%rowtype;
  v_session public.ur_play_sessions%rowtype;
  v_activity_reservation_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_operation_id is null then raise exception 'OPERATION_ID_REQUIRED'; end if;

  select * into v_registration from public.ur_play_registrations where id=p_registration_id for update;
  if not found then raise exception 'UR_PLAY_REGISTRATION_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_registration.session_id) then raise exception 'OPERATION_DENIED'; end if;
  if v_registration.registration_status<>'confirmed' then raise exception 'UR_PLAY_REGISTRATION_NOT_CONFIRMED'; end if;
  if v_registration.attendance_status='checked_in' then raise exception 'UR_PLAY_ALREADY_CHECKED_IN'; end if;
  if v_registration.attendance_status='no_show' then return p_registration_id; end if;

  select * into v_session from public.ur_play_sessions where id=v_registration.session_id for share;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if now()<v_session.starts_at then raise exception 'NO_SHOW_BEFORE_SESSION_START'; end if;

  update public.ur_play_registrations
  set attendance_status='no_show',updated_at=now(),notes=concat_ws(E'\n',notes,coalesce(nullif(trim(p_reason),''),'No-show registrado pela operação'))
  where id=p_registration_id;

  v_activity_reservation_id:=private.consume_activity_reservation_for_ur_play(
    p_registration_id,p_operation_id,'no_show',coalesce(nullif(trim(p_reason),''),'Crédito consumido por no-show no UR Play')
  );

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata,request_id)
  values(auth.uid(),'ur_play_registration.no_show','ur_play_registration',p_registration_id,
    jsonb_build_object('attendance_status','no_show','activity_reservation_id',v_activity_reservation_id),
    jsonb_build_object('source','admin_ur_play','reason',p_reason),p_operation_id::text);

  return p_registration_id;
end;
$$;

create or replace function public.admin_manual_checkin_ur_play(p_registration_id uuid,p_operation_id uuid)
returns public.ur_play_checkins
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_manual_checkin_ur_play(p_registration_id,p_operation_id); $$;

create or replace function public.admin_mark_ur_play_no_show(p_registration_id uuid,p_operation_id uuid,p_reason text default null)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_mark_ur_play_no_show(p_registration_id,p_operation_id,p_reason); $$;

revoke all on function public.admin_manual_checkin_ur_play(uuid,uuid) from public,anon;
revoke all on function public.admin_mark_ur_play_no_show(uuid,uuid,text) from public,anon;
grant execute on function public.admin_manual_checkin_ur_play(uuid,uuid) to authenticated;
grant execute on function public.admin_mark_ur_play_no_show(uuid,uuid,text) to authenticated;
