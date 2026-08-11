-- Forward-only Command fulfillment for UR Market redemptions.
-- Athlete redemption remains separate from admin fulfillment.

create or replace function public.admin_fulfill_market_redemption(
  target_redemption uuid,
  operation_id text
)
returns table (
  redemption_id uuid,
  redemption_status public.market_redemption_status,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redemption public.market_redemptions%rowtype;
  v_before public.market_redemptions%rowtype;
  v_idempotency_key text;
begin
  if private.current_app_role() <> 'admin'::public.app_role then
    raise exception 'Only admins can fulfill Market redemptions' using errcode = '42501';
  end if;

  if target_redemption is null then
    raise exception 'Redemption id is required' using errcode = '22023';
  end if;

  if operation_id is null
     or char_length(trim(operation_id)) < 8
     or char_length(operation_id) > 120 then
    raise exception 'Invalid fulfillment operation id' using errcode = '22023';
  end if;

  v_idempotency_key := 'market_fulfillment:' || target_redemption::text || ':' || trim(operation_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_idempotency_key, 0)
  );

  select *
    into v_redemption
  from public.market_redemptions mr
  where mr.id = target_redemption
  for update;

  if not found then
    raise exception 'Market redemption not found' using errcode = 'P0002';
  end if;

  if v_redemption.status = 'redeemed'::public.market_redemption_status then
    return query
    select v_redemption.id, v_redemption.status, v_redemption.redeemed_at;
    return;
  end if;

  if v_redemption.status not in (
    'reserved'::public.market_redemption_status,
    'available'::public.market_redemption_status
  ) then
    raise exception 'Market redemption is not fulfillable from status %', v_redemption.status
      using errcode = 'P0001';
  end if;

  v_before := v_redemption;

  update public.market_redemptions mr
  set
    status = 'redeemed'::public.market_redemption_status,
    redeemed_at = coalesce(mr.redeemed_at, now())
  where mr.id = v_redemption.id
  returning mr.* into v_redemption;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata,
    request_id
  ) values (
    auth.uid(),
    'market_redemption.fulfilled',
    'market_redemption',
    v_redemption.id,
    pg_catalog.to_jsonb(v_before),
    pg_catalog.to_jsonb(v_redemption),
    pg_catalog.jsonb_build_object(
      'source', 'command_market',
      'idempotency_key', v_idempotency_key
    ),
    trim(operation_id)
  );

  return query
  select v_redemption.id, v_redemption.status, v_redemption.redeemed_at;
end;
$$;

revoke all on function public.admin_fulfill_market_redemption(uuid, text) from public, anon;
grant execute on function public.admin_fulfill_market_redemption(uuid, text) to authenticated;
