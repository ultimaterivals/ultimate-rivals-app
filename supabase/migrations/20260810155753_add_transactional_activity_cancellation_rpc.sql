create or replace function private.reposition_activity_waitlist(p_opportunity_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  with positions as (
    select
      id,
      row_number() over (order by waitlist_position asc nulls last, created_at asc, id asc)::integer as new_position
    from public.activity_reservations
    where opportunity_id = p_opportunity_id
      and status = 'waitlisted'
  )
  update public.activity_reservations r
  set waitlist_position = positions.new_position,
      updated_at = now()
  from positions
  where r.id = positions.id
    and r.waitlist_position is distinct from positions.new_position;
$$;

revoke all on function private.reposition_activity_waitlist(uuid) from public, anon, authenticated;

create or replace function private.promote_activity_waitlist(
  p_opportunity_id uuid,
  p_operation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_reservation_id uuid;
  v_athlete_id uuid;
  v_athlete_package_id uuid;
  v_package_definition_id uuid;
begin
  select r.id, r.athlete_id, ap.id, ap.package_id
    into v_reservation_id, v_athlete_id, v_athlete_package_id, v_package_definition_id
  from public.activity_reservations r
  join public.athlete_commercial_packages ap
    on ap.athlete_id = r.athlete_id
   and ap.status::text = 'active'
   and (ap.starts_at is null or ap.starts_at <= now())
   and (ap.ends_at is null or ap.ends_at > now())
  join public.athlete_credit_balances cb
    on cb.athlete_package_id = ap.id
   and cb.athlete_id = ap.athlete_id
   and cb.available_units > 0
  where r.opportunity_id = p_opportunity_id
    and r.status = 'waitlisted'
  order by r.waitlist_position asc nulls last,
           r.created_at asc,
           ap.ends_at asc nulls last,
           ap.created_at asc
  for update of r, ap
  limit 1;

  if v_reservation_id is null then
    perform private.reposition_activity_waitlist(p_opportunity_id);
    return null;
  end if;

  update public.activity_reservations
  set status = 'reserved',
      waitlist_position = null,
      package_id = v_package_definition_id,
      updated_at = now()
  where id = v_reservation_id;

  insert into public.commercial_credit_ledger (
    athlete_id,
    athlete_package_id,
    reservation_id,
    opportunity_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    reason,
    metadata
  ) values (
    v_athlete_id,
    v_athlete_package_id,
    v_reservation_id,
    p_opportunity_id,
    'hold',
    -1,
    1,
    'waitlist-promotion:' || v_reservation_id::text || ':' || p_operation_id::text,
    'Crédito reservado após promoção automática da lista de espera',
    jsonb_build_object('source', 'waitlist_promotion')
  ) on conflict (idempotency_key) do nothing;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    after_data,
    metadata,
    request_id
  ) values (
    'activity_reservation.promoted_from_waitlist',
    'activity_reservation',
    v_reservation_id,
    jsonb_build_object('opportunity_id', p_opportunity_id, 'athlete_id', v_athlete_id, 'status', 'reserved'),
    jsonb_build_object('source', 'automatic_waitlist_promotion'),
    p_operation_id::text
  );

  perform private.reposition_activity_waitlist(p_opportunity_id);
  return v_reservation_id;
end;
$$;

revoke all on function private.promote_activity_waitlist(uuid, uuid) from public, anon, authenticated;

create or replace function private.cancel_activity_reservation(
  p_reservation_id uuid,
  p_operation_id uuid,
  p_reason text default null
)
returns table (
  reservation_id uuid,
  reservation_status text,
  credit_result text,
  promoted_reservation_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_athlete_id uuid;
  v_reservation public.activity_reservations%rowtype;
  v_opportunity public.demand_opportunities%rowtype;
  v_athlete_package_id uuid;
  v_cancel_hours integer;
  v_late_consumes boolean;
  v_is_free_cancel boolean;
  v_credit_result text := 'none';
  v_promoted_id uuid;
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

  select * into v_reservation
  from public.activity_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if v_reservation.athlete_id <> v_athlete_id then
    raise exception 'RESERVATION_ACCESS_DENIED';
  end if;

  if v_reservation.status in ('cancelled','expired') then
    return query select v_reservation.id, v_reservation.status, 'none'::text, null::uuid;
    return;
  end if;

  if v_reservation.status in ('consumed','no_show') then
    raise exception 'RESERVATION_ALREADY_CONSUMED';
  end if;

  select * into v_opportunity
  from public.demand_opportunities
  where id = v_reservation.opportunity_id
  for update;

  if not found then
    raise exception 'OPPORTUNITY_NOT_FOUND';
  end if;

  if v_reservation.status = 'waitlisted' then
    update public.activity_reservations
    set status = 'cancelled',
        waitlist_position = null,
        updated_at = now()
    where id = v_reservation.id;

    perform private.reposition_activity_waitlist(v_reservation.opportunity_id);

    insert into public.audit_logs (
      actor_user_id, action, entity_type, entity_id, after_data, metadata, request_id
    ) values (
      auth.uid(),
      'activity_reservation.waitlist_cancelled',
      'activity_reservation',
      v_reservation.id,
      jsonb_build_object('status', 'cancelled'),
      jsonb_build_object('reason', p_reason, 'source', 'athlete_portal'),
      p_operation_id::text
    );

    return query select v_reservation.id, 'cancelled'::text, 'none'::text, null::uuid;
    return;
  end if;

  select l.athlete_package_id into v_athlete_package_id
  from public.commercial_credit_ledger l
  where l.reservation_id = v_reservation.id
  group by l.athlete_package_id
  having sum(l.reserved_delta) > 0
  order by max(l.occurred_at) desc
  limit 1;

  if v_athlete_package_id is null then
    raise exception 'RESERVATION_CREDIT_HOLD_NOT_FOUND';
  end if;

  perform 1
  from public.athlete_commercial_packages ap
  where ap.id = v_athlete_package_id
  for update;

  v_cancel_hours := case
    when coalesce(v_opportunity.metadata->>'cancel_without_charge_hours', '') ~ '^\d+$'
      then (v_opportunity.metadata->>'cancel_without_charge_hours')::integer
    else 12
  end;

  v_late_consumes := case lower(coalesce(v_opportunity.metadata->>'late_cancel_consumes_credit', 'true'))
    when 'false' then false
    when '0' then false
    when 'no' then false
    else true
  end;

  v_is_free_cancel := v_opportunity.starts_at is null
    or now() <= v_opportunity.starts_at - make_interval(hours => v_cancel_hours);

  if v_is_free_cancel or not v_late_consumes then
    insert into public.commercial_credit_ledger (
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
      v_reservation.id,
      v_reservation.opportunity_id,
      'release',
      1,
      -1,
      'reservation-cancel-release:' || v_reservation.id::text || ':' || p_operation_id::text,
      coalesce(p_reason, 'Cancelamento dentro da janela sem consumo'),
      auth.uid(),
      jsonb_build_object('cancel_without_charge_hours', v_cancel_hours, 'source', 'athlete_portal')
    );
    v_credit_result := 'released';
  else
    insert into public.commercial_credit_ledger (
      athlete_id,
      athlete_package_id,
      reservation_id,
      opportunity_id,
      event_type,
      reserved_delta,
      consumed_delta,
      idempotency_key,
      reason,
      actor_user_id,
      metadata
    ) values (
      v_athlete_id,
      v_athlete_package_id,
      v_reservation.id,
      v_reservation.opportunity_id,
      'consume',
      -1,
      1,
      'reservation-cancel-consume:' || v_reservation.id::text || ':' || p_operation_id::text,
      coalesce(p_reason, 'Cancelamento fora da janela com consumo'),
      auth.uid(),
      jsonb_build_object('cancel_without_charge_hours', v_cancel_hours, 'source', 'athlete_portal')
    );

    update public.athlete_commercial_packages
    set units_used = units_used + 1
    where id = v_athlete_package_id;

    v_credit_result := 'consumed';
  end if;

  update public.activity_reservations
  set status = 'cancelled',
      waitlist_position = null,
      updated_at = now()
  where id = v_reservation.id;

  v_promoted_id := private.promote_activity_waitlist(v_reservation.opportunity_id, p_operation_id);

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, after_data, metadata, request_id
  ) values (
    auth.uid(),
    'activity_reservation.cancelled',
    'activity_reservation',
    v_reservation.id,
    jsonb_build_object('status', 'cancelled', 'credit_result', v_credit_result, 'promoted_reservation_id', v_promoted_id),
    jsonb_build_object('reason', p_reason, 'source', 'athlete_portal'),
    p_operation_id::text
  );

  return query select v_reservation.id, 'cancelled'::text, v_credit_result, v_promoted_id;
end;
$$;

revoke all on function private.cancel_activity_reservation(uuid, uuid, text) from public, anon;
grant execute on function private.cancel_activity_reservation(uuid, uuid, text) to authenticated;

create or replace function public.cancel_activity_reservation(
  p_reservation_id uuid,
  p_operation_id uuid,
  p_reason text default null
)
returns table (
  reservation_id uuid,
  reservation_status text,
  credit_result text,
  promoted_reservation_id uuid
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select * from private.cancel_activity_reservation(p_reservation_id, p_operation_id, p_reason);
$$;

revoke all on function public.cancel_activity_reservation(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_activity_reservation(uuid, uuid, text) to authenticated;
