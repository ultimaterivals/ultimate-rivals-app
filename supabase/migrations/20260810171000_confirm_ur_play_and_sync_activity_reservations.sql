create or replace function private.admin_homologate_season(p_season_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_season public.seasons%rowtype;
  v_cycle_count integer;
  v_invalid integer;
  v_overlap integer;
  v_target_status public.season_status;
begin
  v_actor := private.require_admin_actor();
  select * into v_season from public.seasons where id=p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if v_season.status not in ('draft','registration') then raise exception 'SEASON_NOT_HOMOLOGATABLE'; end if;

  select count(*)::integer into v_cycle_count from public.season_cycles where season_id=p_season_id;
  if v_cycle_count <> 3 then raise exception 'SEASON_REQUIRES_THREE_CYCLES'; end if;

  select count(*)::integer into v_invalid
  from public.season_cycles
  where season_id=p_season_id
    and (starts_at < v_season.starts_at or ends_at > v_season.ends_at or ends_at <= starts_at);
  if v_invalid > 0 then raise exception 'INVALID_SEASON_CYCLE_PERIOD'; end if;

  select count(*)::integer into v_overlap
  from public.season_cycles a
  join public.season_cycles b
    on b.season_id=a.season_id
   and b.cycle_number>a.cycle_number
   and a.starts_at < b.ends_at
   and b.starts_at < a.ends_at
  where a.season_id=p_season_id;
  if v_overlap > 0 then raise exception 'SEASON_CYCLES_OVERLAP'; end if;

  v_target_status := case
    when now() >= v_season.starts_at and now() < v_season.ends_at then 'active'::public.season_status
    else 'registration'::public.season_status
  end;
  update public.seasons set status=v_target_status where id=p_season_id;
  update public.season_cycles
  set status=case
    when now() >= starts_at and now() < ends_at then 'active'::public.cycle_status
    else 'planned'::public.cycle_status
  end
  where season_id=p_season_id and status in ('planned','active');

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'season.homologated','season',p_season_id,jsonb_build_object('status',v_target_status,'cycles',3),jsonb_build_object('source','admin_setup'));
  return p_season_id;
end;
$$;

create or replace function private.admin_confirm_ur_play_opportunity(
  p_opportunity_id uuid,
  p_season_id uuid,
  p_cycle_id uuid,
  p_court_id uuid,
  p_registration_closes_at timestamptz,
  p_price_amount numeric default 0,
  p_price_label text default null,
  p_cancel_without_charge_hours integer default 12,
  p_override_reason text default null
)
returns table(calendar_event_id uuid, session_id uuid, opportunity_status text)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_opportunity public.demand_opportunities%rowtype;
  v_season public.seasons%rowtype;
  v_cycle public.season_cycles%rowtype;
  v_venue public.venues%rowtype;
  v_court public.courts%rowtype;
  v_format_id uuid;
  v_category_id uuid;
  v_event_id uuid;
  v_session_id uuid;
  v_interested integer;
  v_ready_formations integer;
  v_formation_size integer;
  v_min_athletes integer;
  v_ready boolean;
  v_override text := nullif(trim(coalesce(p_override_reason,'')),'');
begin
  v_actor := private.require_admin_actor();
  select * into v_opportunity from public.demand_opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opportunity.opportunity_type <> 'ur_play' then raise exception 'OPPORTUNITY_NOT_UR_PLAY'; end if;
  if v_opportunity.status not in ('collecting_interest','forming','almost_full') then raise exception 'OPPORTUNITY_NOT_CONFIRMABLE'; end if;
  if v_opportunity.ur_play_session_id is not null or v_opportunity.calendar_event_id is not null then raise exception 'OPPORTUNITY_ALREADY_LINKED'; end if;
  if v_opportunity.starts_at is null or v_opportunity.ends_at is null or v_opportunity.ends_at <= v_opportunity.starts_at or v_opportunity.starts_at <= now() then raise exception 'INVALID_OPPORTUNITY_PERIOD'; end if;
  if v_opportunity.pole_id is null then raise exception 'UR_PLAY_REQUIRES_POLE'; end if;
  if v_opportunity.format_code not in ('doubles','fours') then raise exception 'UR_PLAY_REQUIRES_FORMAT'; end if;
  if p_registration_closes_at is null or p_registration_closes_at <= now() or p_registration_closes_at > v_opportunity.starts_at then raise exception 'INVALID_REGISTRATION_CLOSE'; end if;
  if coalesce(p_price_amount,0) < 0 then raise exception 'INVALID_PRICE_AMOUNT'; end if;
  if p_cancel_without_charge_hours < 0 or p_cancel_without_charge_hours > 168 then raise exception 'INVALID_CANCELLATION_WINDOW'; end if;

  select * into v_season from public.seasons where id=p_season_id for share;
  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if v_season.status not in ('registration','active') then raise exception 'SEASON_NOT_READY'; end if;
  if v_opportunity.starts_at < v_season.starts_at or v_opportunity.ends_at > v_season.ends_at then raise exception 'OPPORTUNITY_OUTSIDE_SEASON'; end if;

  select * into v_cycle from public.season_cycles where id=p_cycle_id and season_id=p_season_id for share;
  if not found then raise exception 'SEASON_CYCLE_NOT_FOUND'; end if;
  if v_cycle.status not in ('planned','active') then raise exception 'SEASON_CYCLE_NOT_READY'; end if;
  if v_opportunity.starts_at < v_cycle.starts_at or v_opportunity.ends_at > v_cycle.ends_at then raise exception 'OPPORTUNITY_OUTSIDE_CYCLE'; end if;

  select * into v_court from public.courts where id=p_court_id for share;
  if not found or v_court.status::text <> 'active' then raise exception 'COURT_NOT_READY'; end if;
  select * into v_venue from public.venues where id=v_court.venue_id for share;
  if not found or v_venue.status::text <> 'active' or v_venue.pole_id <> v_opportunity.pole_id then raise exception 'VENUE_NOT_READY'; end if;
  if v_opportunity.venue_id is not null and v_opportunity.venue_id <> v_venue.id then raise exception 'COURT_VENUE_MISMATCH'; end if;

  select id into v_format_id from public.competitive_formats where code=v_opportunity.format_code and active=true;
  if v_format_id is null then raise exception 'FORMAT_NOT_FOUND'; end if;
  if v_opportunity.category_code is not null then
    select id into v_category_id from public.competitive_categories where code=v_opportunity.category_code and active=true;
    if v_category_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  end if;

  select count(*)::integer into v_interested from public.session_interests where opportunity_id=p_opportunity_id and status='active';
  select count(*)::integer into v_ready_formations from public.session_formations where opportunity_id=p_opportunity_id and status='confirmed';
  v_formation_size := case v_opportunity.format_code when 'fours' then 4 else 2 end;
  v_min_athletes := greatest(1,v_opportunity.min_formations::integer) * v_formation_size;
  v_ready := v_ready_formations >= v_opportunity.min_formations or v_interested >= v_min_athletes;
  if not v_ready and (v_override is null or char_length(v_override) < 10) then raise exception 'DEMAND_NOT_READY'; end if;

  insert into public.calendar_events(name,event_type,starts_at,ends_at,pole_id,venue_id,status,notes,created_by,season_id)
  values(v_opportunity.title,'ur_play',v_opportunity.starts_at,v_opportunity.ends_at,v_opportunity.pole_id,v_venue.id,'registration_open',case when v_override is null then null else 'Confirmação com override administrativo: '||v_override end,v_actor,p_season_id)
  returning id into v_event_id;

  insert into public.ur_play_sessions(
    season_id,season_cycle_id,calendar_event_id,venue_id,name,status,starts_at,ends_at,
    registration_opens_at,registration_closes_at,price_amount,price_label,capacity,
    waitlist_capacity,cancellation_free_until,created_by
  ) values(
    p_season_id,p_cycle_id,v_event_id,v_venue.id,v_opportunity.title,'draft',v_opportunity.starts_at,v_opportunity.ends_at,
    now(),p_registration_closes_at,coalesce(p_price_amount,0),nullif(trim(coalesce(p_price_label,'')),''),v_opportunity.capacity_athletes,
    0,v_opportunity.starts_at-make_interval(hours=>p_cancel_without_charge_hours),v_actor
  ) returning id into v_session_id;

  insert into public.ur_play_session_scopes(session_id,format_id,category_id,level)
  values(v_session_id,v_format_id,v_category_id,v_opportunity.level);
  insert into public.ur_play_session_courts(session_id,court_id,position)
  values(v_session_id,p_court_id,1);

  perform private.transition_ur_play_session(v_session_id,'published');
  perform private.transition_ur_play_session(v_session_id,'registration_open');

  update public.demand_opportunities
  set status='confirmed',venue_id=v_venue.id,calendar_event_id=v_event_id,ur_play_session_id=v_session_id,court_id=p_court_id,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('cancel_without_charge_hours',p_cancel_without_charge_hours,'late_cancel_consumes_credit',true,'confirmed_by',v_actor,'demand_override_reason',v_override),updated_at=now()
  where id=p_opportunity_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'demand_opportunity.confirmed_as_ur_play','demand_opportunity',p_opportunity_id,
    jsonb_build_object('calendar_event_id',v_event_id,'session_id',v_session_id,'status','confirmed','venue_id',v_venue.id,'court_id',p_court_id,'interested_count',v_interested,'ready_formations',v_ready_formations,'demand_ready',v_ready),
    jsonb_build_object('source','admin_command','override_reason',v_override));

  return query select v_event_id,v_session_id,'confirmed'::text;
end;
$$;

create or replace function private.register_ur_play(target_session uuid,target_athlete uuid,target_source public.ur_play_registration_source,operation_id uuid,actor uuid)
returns public.ur_play_registrations
language plpgsql
security definer
set search_path to ''
as $$
declare
  s public.ur_play_sessions;
  a public.athletes;
  l public.athlete_level;
  confirmed_count int;
  wait_count int;
  team_snapshot uuid;
  pole_snapshot uuid;
  result public.ur_play_registrations;
begin
  select * into result from public.ur_play_registrations where client_operation_id=operation_id;
  if found then return result; end if;
  select * into s from public.ur_play_sessions where id=target_session for update;
  if s.status<>'registration_open' or (s.registration_opens_at is not null and now()<s.registration_opens_at) or (s.registration_closes_at is not null and now()>=s.registration_closes_at) then raise exception 'registration window closed' using errcode='23514'; end if;
  select * into a from public.athletes where id=target_athlete and status='active';
  if not found then raise exception 'athlete inactive' using errcode='23514'; end if;
  if target_source='athlete' and target_athlete<>private.current_athlete_id() then raise exception 'athlete mismatch' using errcode='42501'; end if;
  if target_source<>'athlete' and actor is not null and not private.operates_ur_play_session(target_session) then raise exception 'operation denied' using errcode='42501'; end if;
  select level into l from public.athlete_levels where athlete_id=target_athlete and season_id=s.season_id and status='active' order by starts_at desc limit 1;
  if exists(select 1 from public.ur_play_session_scopes sc join public.competitive_categories cat on cat.id=sc.category_id where sc.session_id=s.id)
     and not exists(select 1 from public.ur_play_session_scopes sc left join public.competitive_categories cat on cat.id=sc.category_id where sc.session_id=s.id and (sc.level is null or sc.level=l) and (cat.id is null or cat.code='mixed' or cat.code=a.gender::text))
  then raise exception 'athlete outside session scope' using errcode='23514'; end if;
  if exists(select 1 from public.ur_play_session_scopes where session_id=s.id and level is not null)
     and not exists(select 1 from public.ur_play_session_scopes where session_id=s.id and (level is null or level=l))
  then raise exception 'athlete level outside session scope' using errcode='23514'; end if;
  select m.team_id into team_snapshot from public.team_memberships m where m.athlete_id=target_athlete and m.season_id=s.season_id and m.status='active' and m.starts_at<=s.starts_at and (m.ends_at is null or m.ends_at>s.starts_at) order by m.starts_at desc limit 1;
  if team_snapshot is not null then
    select coalesce((select p.pole_id from public.team_pole_assignments p where p.team_id=team_snapshot and p.season_id=s.season_id and p.status='active' and p.starts_at<=s.starts_at and (p.ends_at is null or p.ends_at>s.starts_at) order by p.starts_at desc limit 1),(select primary_pole_id from public.teams where id=team_snapshot)) into pole_snapshot;
  end if;
  select count(*) into confirmed_count from public.ur_play_registrations where session_id=s.id and registration_status='confirmed';
  select count(*) into wait_count from public.ur_play_registrations where session_id=s.id and registration_status='waitlisted';
  if confirmed_count<s.capacity then
    insert into public.ur_play_registrations(session_id,athlete_id,registration_status,source,confirmed_at,attendance_status,created_by,snapshot_team_id,snapshot_team_pole_id,snapshot_level,payment_status,payment_amount,client_operation_id)
    values(s.id,target_athlete,'confirmed',target_source,now(),'expected',actor,team_snapshot,pole_snapshot,l,case when s.price_amount is null or s.price_amount=0 then 'not_required'::public.ur_play_payment_status else 'pending'::public.ur_play_payment_status end,s.price_amount,operation_id)
    returning * into result;
  else
    if s.waitlist_capacity is not null and wait_count>=s.waitlist_capacity then raise exception 'waitlist full' using errcode='23514'; end if;
    insert into public.ur_play_registrations(session_id,athlete_id,registration_status,source,waitlist_position,created_by,snapshot_team_id,snapshot_team_pole_id,snapshot_level,payment_status,payment_amount,client_operation_id)
    values(s.id,target_athlete,'waitlisted',target_source,wait_count+1,actor,team_snapshot,pole_snapshot,l,case when s.price_amount is null or s.price_amount=0 then 'not_required'::public.ur_play_payment_status else 'pending'::public.ur_play_payment_status end,s.price_amount,operation_id)
    returning * into result;
  end if;
  return result;
end;
$$;
revoke all on function private.register_ur_play(uuid,uuid,public.ur_play_registration_source,uuid,uuid) from public,anon,authenticated;

create or replace function private.reserve_activity_opportunity(p_opportunity_id uuid,p_operation_id uuid)
returns table(reservation_id uuid,reservation_status text,waitlist_position integer,eligibility_status text,credit_state text)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_athlete_id uuid;
  v_opportunity public.demand_opportunities%rowtype;
  v_existing public.activity_reservations%rowtype;
  v_session public.ur_play_sessions%rowtype;
  v_ur_registration public.ur_play_registrations%rowtype;
  v_active_count integer;
  v_waitlist_position integer;
  v_eligibility text;
  v_athlete_package_id uuid;
  v_package_definition_id uuid;
  v_interest_id uuid;
  v_reservation_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_operation_id is null then raise exception 'OPERATION_ID_REQUIRED'; end if;
  v_athlete_id:=private.current_athlete_id();
  if v_athlete_id is null then raise exception 'ATHLETE_PROFILE_REQUIRED'; end if;

  select * into v_opportunity from public.demand_opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opportunity.status not in ('forming','almost_full','confirmed','full') then raise exception 'OPPORTUNITY_NOT_RESERVABLE'; end if;
  if v_opportunity.starts_at is null or v_opportunity.starts_at<=now() then raise exception 'OPPORTUNITY_ALREADY_STARTED_OR_UNSCHEDULED'; end if;

  select * into v_existing from public.activity_reservations r where r.opportunity_id=p_opportunity_id and r.athlete_id=v_athlete_id for update;
  if found and v_existing.status in ('reserved','confirmed','waitlisted') then
    return query select v_existing.id,v_existing.status,v_existing.waitlist_position,v_existing.eligibility,case when v_existing.status='waitlisted' then 'not_held' else 'held' end;
    return;
  end if;

  v_eligibility:=case when v_opportunity.level is null and v_opportunity.category_code is null and v_opportunity.format_code is null then 'eligible' else 'pending' end;
  select si.id into v_interest_id from public.session_interests si where si.opportunity_id=p_opportunity_id and si.athlete_id=v_athlete_id and si.status='active' limit 1;

  if v_opportunity.ur_play_session_id is not null then
    select * into v_session from public.ur_play_sessions where id=v_opportunity.ur_play_session_id for update;
    if not found or v_session.status<>'registration_open' then raise exception 'UR_PLAY_SESSION_NOT_OPEN'; end if;
    select count(*)::integer into v_active_count from public.ur_play_registrations where session_id=v_session.id and registration_status='confirmed';
  else
    select count(*)::integer into v_active_count from public.activity_reservations r where r.opportunity_id=p_opportunity_id and r.status in ('reserved','confirmed');
  end if;

  if v_active_count>=v_opportunity.capacity_athletes then
    select coalesce(max(r.waitlist_position),0)+1 into v_waitlist_position from public.activity_reservations r where r.opportunity_id=p_opportunity_id and r.status='waitlisted';
    if v_existing.id is not null then
      update public.activity_reservations set status='waitlisted',waitlist_position=v_waitlist_position,eligibility=v_eligibility,source_interest_id=v_interest_id,package_id=null,payment_id=null,ur_play_registration_id=null,updated_at=now() where id=v_existing.id returning id into v_reservation_id;
    else
      insert into public.activity_reservations(opportunity_id,athlete_id,source_interest_id,status,waitlist_position,eligibility)
      values(p_opportunity_id,v_athlete_id,v_interest_id,'waitlisted',v_waitlist_position,v_eligibility) returning id into v_reservation_id;
    end if;
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata,request_id)
    values(auth.uid(),'activity_reservation.waitlisted','activity_reservation',v_reservation_id,jsonb_build_object('opportunity_id',p_opportunity_id,'athlete_id',v_athlete_id,'waitlist_position',v_waitlist_position),jsonb_build_object('source','athlete_portal'),p_operation_id::text);
    return query select v_reservation_id,'waitlisted'::text,v_waitlist_position,v_eligibility,'not_held'::text;
    return;
  end if;

  select ap.id,ap.package_id into v_athlete_package_id,v_package_definition_id
  from public.athlete_commercial_packages ap
  join public.athlete_credit_balances cb on cb.athlete_package_id=ap.id and cb.athlete_id=ap.athlete_id
  where ap.athlete_id=v_athlete_id and ap.status::text='active' and cb.available_units>0 and (ap.starts_at is null or ap.starts_at<=now()) and (ap.ends_at is null or ap.ends_at>now())
  order by ap.ends_at asc nulls last,ap.starts_at asc nulls first,ap.created_at asc for update of ap limit 1;
  if v_athlete_package_id is null then raise exception 'NO_AVAILABLE_CREDITS'; end if;

  if v_opportunity.ur_play_session_id is not null then
    v_ur_registration:=private.register_ur_play(v_opportunity.ur_play_session_id,v_athlete_id,'athlete',p_operation_id,auth.uid());
    if v_ur_registration.registration_status<>'confirmed' then raise exception 'UR_PLAY_REGISTRATION_NOT_CONFIRMED'; end if;
    v_eligibility:='eligible';
  end if;

  if v_existing.id is not null then
    update public.activity_reservations set status='reserved',waitlist_position=null,eligibility=v_eligibility,source_interest_id=v_interest_id,package_id=v_package_definition_id,payment_id=null,ur_play_registration_id=v_ur_registration.id,updated_at=now() where id=v_existing.id returning id into v_reservation_id;
  else
    insert into public.activity_reservations(opportunity_id,athlete_id,source_interest_id,status,eligibility,package_id,ur_play_registration_id)
    values(p_opportunity_id,v_athlete_id,v_interest_id,'reserved',v_eligibility,v_package_definition_id,v_ur_registration.id) returning id into v_reservation_id;
  end if;

  insert into public.commercial_credit_ledger(athlete_id,athlete_package_id,reservation_id,opportunity_id,event_type,available_delta,reserved_delta,idempotency_key,reason,actor_user_id,metadata)
  values(v_athlete_id,v_athlete_package_id,v_reservation_id,p_opportunity_id,'hold',-1,1,'reservation-hold:'||v_reservation_id::text||':'||p_operation_id::text,'Crédito reservado para participação confirmada',auth.uid(),jsonb_build_object('source','athlete_portal','eligibility',v_eligibility,'ur_play_registration_id',v_ur_registration.id));

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata,request_id)
  values(auth.uid(),'activity_reservation.created','activity_reservation',v_reservation_id,jsonb_build_object('opportunity_id',p_opportunity_id,'athlete_id',v_athlete_id,'status','reserved','eligibility',v_eligibility,'athlete_package_id',v_athlete_package_id,'ur_play_registration_id',v_ur_registration.id),jsonb_build_object('source','athlete_portal'),p_operation_id::text);

  return query select v_reservation_id,'reserved'::text,null::integer,v_eligibility,'held'::text;
end;
$$;

create or replace function private.promote_activity_waitlist(p_opportunity_id uuid,p_operation_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_opportunity public.demand_opportunities%rowtype;
  v_reservation_id uuid;
  v_athlete_id uuid;
  v_athlete_package_id uuid;
  v_package_definition_id uuid;
  v_ur_registration public.ur_play_registrations%rowtype;
begin
  select * into v_opportunity from public.demand_opportunities where id=p_opportunity_id for update;
  if not found then return null; end if;

  select r.id,r.athlete_id,ap.id,ap.package_id into v_reservation_id,v_athlete_id,v_athlete_package_id,v_package_definition_id
  from public.activity_reservations r
  join public.athlete_commercial_packages ap on ap.athlete_id=r.athlete_id and ap.status::text='active' and (ap.starts_at is null or ap.starts_at<=now()) and (ap.ends_at is null or ap.ends_at>now())
  join public.athlete_credit_balances cb on cb.athlete_package_id=ap.id and cb.athlete_id=ap.athlete_id and cb.available_units>0
  where r.opportunity_id=p_opportunity_id and r.status='waitlisted'
  order by r.waitlist_position asc nulls last,r.created_at asc,ap.ends_at asc nulls last,ap.created_at asc
  for update of r,ap limit 1;

  if v_reservation_id is null then perform private.reposition_activity_waitlist(p_opportunity_id); return null; end if;

  if v_opportunity.ur_play_session_id is not null then
    v_ur_registration:=private.register_ur_play(v_opportunity.ur_play_session_id,v_athlete_id,'operator',p_operation_id,null);
    if v_ur_registration.registration_status<>'confirmed' then raise exception 'UR_PLAY_PROMOTION_NOT_CONFIRMED'; end if;
  end if;

  update public.activity_reservations set status='reserved',waitlist_position=null,package_id=v_package_definition_id,ur_play_registration_id=v_ur_registration.id,eligibility=case when v_opportunity.ur_play_session_id is not null then 'eligible' else eligibility end,updated_at=now() where id=v_reservation_id;

  insert into public.commercial_credit_ledger(athlete_id,athlete_package_id,reservation_id,opportunity_id,event_type,available_delta,reserved_delta,idempotency_key,reason,metadata)
  values(v_athlete_id,v_athlete_package_id,v_reservation_id,p_opportunity_id,'hold',-1,1,'waitlist-promotion:'||v_reservation_id::text||':'||p_operation_id::text,'Crédito reservado após promoção automática da lista de espera',jsonb_build_object('source','waitlist_promotion','ur_play_registration_id',v_ur_registration.id)) on conflict(idempotency_key) do nothing;

  insert into public.audit_logs(action,entity_type,entity_id,after_data,metadata,request_id)
  values('activity_reservation.promoted_from_waitlist','activity_reservation',v_reservation_id,jsonb_build_object('opportunity_id',p_opportunity_id,'athlete_id',v_athlete_id,'status','reserved','ur_play_registration_id',v_ur_registration.id),jsonb_build_object('source','automatic_waitlist_promotion'),p_operation_id::text);

  perform private.reposition_activity_waitlist(p_opportunity_id);
  return v_reservation_id;
end;
$$;

create or replace function private.cancel_activity_reservation(p_reservation_id uuid,p_operation_id uuid,p_reason text default null)
returns table(reservation_id uuid,reservation_status text,credit_result text,promoted_reservation_id uuid)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_athlete_id uuid;
  v_reservation public.activity_reservations%rowtype;
  v_opportunity public.demand_opportunities%rowtype;
  v_athlete_package_id uuid;
  v_cancel_hours integer;
  v_late_consumes boolean;
  v_is_free_cancel boolean;
  v_credit_result text:='none';
  v_promoted_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_operation_id is null then raise exception 'OPERATION_ID_REQUIRED'; end if;
  v_athlete_id:=private.current_athlete_id();
  if v_athlete_id is null then raise exception 'ATHLETE_PROFILE_REQUIRED'; end if;

  select * into v_reservation from public.activity_reservations where id=p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.athlete_id<>v_athlete_id then raise exception 'RESERVATION_ACCESS_DENIED'; end if;
  if v_reservation.status in ('cancelled','expired') then return query select v_reservation.id,v_reservation.status,'none'::text,null::uuid; return; end if;
  if v_reservation.status in ('consumed','no_show') then raise exception 'RESERVATION_ALREADY_CONSUMED'; end if;

  select * into v_opportunity from public.demand_opportunities where id=v_reservation.opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;

  if v_reservation.status='waitlisted' then
    if v_reservation.ur_play_registration_id is not null then perform private.cancel_ur_play_registration(v_reservation.ur_play_registration_id,coalesce(p_reason,'Saída da lista de espera'),p_operation_id); end if;
    update public.activity_reservations set status='cancelled',waitlist_position=null,updated_at=now() where id=v_reservation.id;
    perform private.reposition_activity_waitlist(v_reservation.opportunity_id);
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata,request_id)
    values(auth.uid(),'activity_reservation.waitlist_cancelled','activity_reservation',v_reservation.id,jsonb_build_object('status','cancelled'),jsonb_build_object('reason',p_reason,'source','athlete_portal'),p_operation_id::text);
    return query select v_reservation.id,'cancelled'::text,'none'::text,null::uuid; return;
  end if;

  select l.athlete_package_id into v_athlete_package_id from public.commercial_credit_ledger l where l.reservation_id=v_reservation.id group by l.athlete_package_id having sum(l.reserved_delta)>0 order by max(l.occurred_at) desc limit 1;
  if v_athlete_package_id is null then raise exception 'RESERVATION_CREDIT_HOLD_NOT_FOUND'; end if;
  perform 1 from public.athlete_commercial_packages ap where ap.id=v_athlete_package_id for update;

  if v_reservation.ur_play_registration_id is not null then
    perform private.cancel_ur_play_registration(v_reservation.ur_play_registration_id,coalesce(p_reason,'Cancelamento solicitado pelo atleta'),p_operation_id);
  end if;

  v_cancel_hours:=case when coalesce(v_opportunity.metadata->>'cancel_without_charge_hours','')~'^\d+$' then (v_opportunity.metadata->>'cancel_without_charge_hours')::integer else 12 end;
  v_late_consumes:=case lower(coalesce(v_opportunity.metadata->>'late_cancel_consumes_credit','true')) when 'false' then false when '0' then false when 'no' then false else true end;
  v_is_free_cancel:=v_opportunity.starts_at is null or now()<=v_opportunity.starts_at-make_interval(hours=>v_cancel_hours);

  if v_is_free_cancel or not v_late_consumes then
    insert into public.commercial_credit_ledger(athlete_id,athlete_package_id,reservation_id,opportunity_id,event_type,available_delta,reserved_delta,idempotency_key,reason,actor_user_id,metadata)
    values(v_athlete_id,v_athlete_package_id,v_reservation.id,v_reservation.opportunity_id,'release',1,-1,'reservation-cancel-release:'||v_reservation.id::text||':'||p_operation_id::text,coalesce(p_reason,'Cancelamento dentro da janela sem consumo'),auth.uid(),jsonb_build_object('cancel_without_charge_hours',v_cancel_hours,'source','athlete_portal'));
    v_credit_result:='released';
  else
    insert into public.commercial_credit_ledger(athlete_id,athlete_package_id,reservation_id,opportunity_id,event_type,reserved_delta,consumed_delta,idempotency_key,reason,actor_user_id,metadata)
    values(v_athlete_id,v_athlete_package_id,v_reservation.id,v_reservation.opportunity_id,'consume',-1,1,'reservation-cancel-consume:'||v_reservation.id::text||':'||p_operation_id::text,coalesce(p_reason,'Cancelamento fora da janela com consumo'),auth.uid(),jsonb_build_object('cancel_without_charge_hours',v_cancel_hours,'source','athlete_portal'));
    update public.athlete_commercial_packages set units_used=units_used+1 where id=v_athlete_package_id;
    v_credit_result:='consumed';
  end if;

  update public.activity_reservations set status='cancelled',waitlist_position=null,updated_at=now() where id=v_reservation.id;
  v_promoted_id:=private.promote_activity_waitlist(v_reservation.opportunity_id,p_operation_id);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata,request_id)
  values(auth.uid(),'activity_reservation.cancelled','activity_reservation',v_reservation.id,jsonb_build_object('status','cancelled','credit_result',v_credit_result,'promoted_reservation_id',v_promoted_id),jsonb_build_object('reason',p_reason,'source','athlete_portal'),p_operation_id::text);

  return query select v_reservation.id,'cancelled'::text,v_credit_result,v_promoted_id;
end;
$$;

create or replace function public.admin_homologate_season(p_season_id uuid)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_homologate_season(p_season_id); $$;

create or replace function public.admin_confirm_ur_play_opportunity(
  p_opportunity_id uuid,p_season_id uuid,p_cycle_id uuid,p_court_id uuid,p_registration_closes_at timestamptz,
  p_price_amount numeric default 0,p_price_label text default null,p_cancel_without_charge_hours integer default 12,p_override_reason text default null
)
returns table(calendar_event_id uuid,session_id uuid,opportunity_status text)
language sql set search_path to 'pg_catalog','public','private'
as $$ select * from private.admin_confirm_ur_play_opportunity(p_opportunity_id,p_season_id,p_cycle_id,p_court_id,p_registration_closes_at,p_price_amount,p_price_label,p_cancel_without_charge_hours,p_override_reason); $$;

revoke all on function public.admin_homologate_season(uuid) from public,anon;
revoke all on function public.admin_confirm_ur_play_opportunity(uuid,uuid,uuid,uuid,timestamptz,numeric,text,integer,text) from public,anon;
grant execute on function public.admin_homologate_season(uuid) to authenticated;
grant execute on function public.admin_confirm_ur_play_opportunity(uuid,uuid,uuid,uuid,timestamptz,numeric,text,integer,text) to authenticated;
