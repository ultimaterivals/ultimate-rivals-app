-- Converge Athlete App reservations with an already-confirmed official UR Play
-- registration for the same athlete/session.
--
-- Command may have created the official registration before the athlete later
-- reserves through the App. In that case the App must reuse the confirmed row,
-- not try to create a duplicate registration or incorrectly move the athlete to
-- the waitlist because their existing confirmed seat is already counted.

create or replace function private.reserve_activity_opportunity(
  p_opportunity_id uuid,
  p_operation_id uuid
)
returns table(
  reservation_id uuid,
  reservation_status text,
  waitlist_position integer,
  eligibility_status text,
  credit_state text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_athlete_id uuid;
  v_opportunity public.demand_opportunities%rowtype;
  v_existing public.activity_reservations%rowtype;
  v_session public.ur_play_sessions%rowtype;
  v_ur_registration public.ur_play_registrations%rowtype;
  v_reuse_confirmed_registration boolean := false;
  v_active_count integer;
  v_waitlist_position integer;
  v_eligibility text;
  v_athlete_package_id uuid;
  v_package_definition_id uuid;
  v_interest_id uuid;
  v_reservation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_operation_id is null then
    raise exception 'OPERATION_ID_REQUIRED';
  end if;

  v_athlete_id := private.current_athlete_id();
  if v_athlete_id is null then
    raise exception 'ATHLETE_PROFILE_REQUIRED';
  end if;

  select * into v_opportunity
  from public.demand_opportunities
  where id = p_opportunity_id
  for update;

  if not found then
    raise exception 'OPPORTUNITY_NOT_FOUND';
  end if;
  if v_opportunity.status not in ('forming','almost_full','confirmed','full') then
    raise exception 'OPPORTUNITY_NOT_RESERVABLE';
  end if;
  if v_opportunity.starts_at is null or v_opportunity.starts_at <= now() then
    raise exception 'OPPORTUNITY_ALREADY_STARTED_OR_UNSCHEDULED';
  end if;

  select * into v_existing
  from public.activity_reservations r
  where r.opportunity_id = p_opportunity_id
    and r.athlete_id = v_athlete_id
  for update;

  if found and v_existing.status in ('reserved','confirmed','waitlisted') then
    return query select
      v_existing.id,
      v_existing.status,
      v_existing.waitlist_position,
      v_existing.eligibility,
      case when v_existing.status = 'waitlisted' then 'not_held' else 'held' end;
    return;
  end if;

  v_eligibility := case
    when v_opportunity.level is null
      and v_opportunity.category_code is null
      and v_opportunity.format_code is null
    then 'eligible'
    else 'pending'
  end;

  select si.id into v_interest_id
  from public.session_interests si
  where si.opportunity_id = p_opportunity_id
    and si.athlete_id = v_athlete_id
    and si.status = 'active'
  limit 1;

  if v_opportunity.ur_play_session_id is not null then
    select * into v_session
    from public.ur_play_sessions
    where id = v_opportunity.ur_play_session_id
    for update;

    if not found or v_session.status <> 'registration_open' then
      raise exception 'UR_PLAY_SESSION_NOT_OPEN';
    end if;

    -- A confirmed seat created by Command is authoritative. Reuse it before
    -- capacity evaluation so the athlete is not counted as a new entrant.
    select * into v_ur_registration
    from public.ur_play_registrations
    where session_id = v_session.id
      and athlete_id = v_athlete_id
      and registration_status = 'confirmed'
    order by confirmed_at desc nulls last, created_at desc
    for update
    limit 1;

    v_reuse_confirmed_registration := found;

    select count(*)::integer into v_active_count
    from public.ur_play_registrations
    where session_id = v_session.id
      and registration_status = 'confirmed';
  else
    select count(*)::integer into v_active_count
    from public.activity_reservations r
    where r.opportunity_id = p_opportunity_id
      and r.status in ('reserved','confirmed');
  end if;

  if not v_reuse_confirmed_registration
     and v_active_count >= v_opportunity.capacity_athletes then
    select coalesce(max(r.waitlist_position), 0) + 1
      into v_waitlist_position
    from public.activity_reservations r
    where r.opportunity_id = p_opportunity_id
      and r.status = 'waitlisted';

    if v_existing.id is not null then
      update public.activity_reservations
      set status = 'waitlisted',
          waitlist_position = v_waitlist_position,
          eligibility = v_eligibility,
          source_interest_id = v_interest_id,
          package_id = null,
          payment_id = null,
          ur_play_registration_id = null,
          updated_at = now()
      where id = v_existing.id
      returning id into v_reservation_id;
    else
      insert into public.activity_reservations(
        opportunity_id,
        athlete_id,
        source_interest_id,
        status,
        waitlist_position,
        eligibility
      ) values (
        p_opportunity_id,
        v_athlete_id,
        v_interest_id,
        'waitlisted',
        v_waitlist_position,
        v_eligibility
      )
      returning id into v_reservation_id;
    end if;

    insert into public.audit_logs(
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after_data,
      metadata,
      request_id
    ) values (
      auth.uid(),
      'activity_reservation.waitlisted',
      'activity_reservation',
      v_reservation_id,
      jsonb_build_object(
        'opportunity_id', p_opportunity_id,
        'athlete_id', v_athlete_id,
        'waitlist_position', v_waitlist_position
      ),
      jsonb_build_object('source', 'athlete_portal'),
      p_operation_id::text
    );

    return query select
      v_reservation_id,
      'waitlisted'::text,
      v_waitlist_position,
      v_eligibility,
      'not_held'::text;
    return;
  end if;

  -- Lock only the entitlement row. Available balance comes from the immutable
  -- ledger, avoiding FOR UPDATE against the aggregate balance view.
  select ap.id, ap.package_id
    into v_athlete_package_id, v_package_definition_id
  from public.athlete_commercial_packages ap
  where ap.athlete_id = v_athlete_id
    and ap.status::text = 'active'
    and coalesce((
      select sum(l.available_delta)
      from public.commercial_credit_ledger l
      where l.athlete_package_id = ap.id
        and l.athlete_id = ap.athlete_id
    ), 0) > 0
    and (ap.starts_at is null or ap.starts_at <= now())
    and (ap.ends_at is null or ap.ends_at > now())
  order by ap.ends_at asc nulls last,
           ap.starts_at asc nulls first,
           ap.created_at asc
  for update of ap
  limit 1;

  if v_athlete_package_id is null then
    raise exception 'NO_AVAILABLE_CREDITS';
  end if;

  if v_opportunity.ur_play_session_id is not null then
    if not v_reuse_confirmed_registration then
      v_ur_registration := private.register_ur_play(
        v_opportunity.ur_play_session_id,
        v_athlete_id,
        'athlete',
        p_operation_id,
        auth.uid()
      );
    end if;

    if v_ur_registration.registration_status <> 'confirmed' then
      raise exception 'UR_PLAY_REGISTRATION_NOT_CONFIRMED';
    end if;

    v_eligibility := 'eligible';
  end if;

  if v_existing.id is not null then
    update public.activity_reservations
    set status = 'reserved',
        waitlist_position = null,
        eligibility = v_eligibility,
        source_interest_id = v_interest_id,
        package_id = v_package_definition_id,
        payment_id = null,
        ur_play_registration_id = v_ur_registration.id,
        updated_at = now()
    where id = v_existing.id
    returning id into v_reservation_id;
  else
    insert into public.activity_reservations(
      opportunity_id,
      athlete_id,
      source_interest_id,
      status,
      eligibility,
      package_id,
      ur_play_registration_id
    ) values (
      p_opportunity_id,
      v_athlete_id,
      v_interest_id,
      'reserved',
      v_eligibility,
      v_package_definition_id,
      v_ur_registration.id
    )
    returning id into v_reservation_id;
  end if;

  insert into public.commercial_credit_ledger(
    athlete_id,
    athlete_package_id,
    reservation_id,
    opportunity_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    reason,
    actor_user_id,
    metadata
  ) values (
    v_athlete_id,
    v_athlete_package_id,
    v_reservation_id,
    p_opportunity_id,
    'hold',
    -1,
    1,
    'reservation-hold:' || v_reservation_id::text || ':' || p_operation_id::text,
    'Crédito reservado para participação confirmada',
    auth.uid(),
    jsonb_build_object(
      'source', 'athlete_portal',
      'eligibility', v_eligibility,
      'ur_play_registration_id', v_ur_registration.id,
      'reused_confirmed_registration', v_reuse_confirmed_registration
    )
  );

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata,
    request_id
  ) values (
    auth.uid(),
    'activity_reservation.created',
    'activity_reservation',
    v_reservation_id,
    jsonb_build_object(
      'opportunity_id', p_opportunity_id,
      'athlete_id', v_athlete_id,
      'status', 'reserved',
      'eligibility', v_eligibility,
      'athlete_package_id', v_athlete_package_id,
      'ur_play_registration_id', v_ur_registration.id,
      'reused_confirmed_registration', v_reuse_confirmed_registration
    ),
    jsonb_build_object('source', 'athlete_portal'),
    p_operation_id::text
  );

  return query select
    v_reservation_id,
    'reserved'::text,
    null::integer,
    v_eligibility,
    'held'::text;
end;
$$;

revoke all on function private.reserve_activity_opportunity(uuid, uuid)
  from public, anon;
grant execute on function private.reserve_activity_opportunity(uuid, uuid)
  to authenticated;
