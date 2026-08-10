-- Forward-only UR Coins redemption for the current production lineage.
-- Ranking points and UR Coins remain separate ledgers.

create or replace function public.redeem_market_offer_urc(
  target_offer uuid,
  operation_id text
)
returns table (
  redemption_id uuid,
  redemption_code text,
  redemption_status public.market_redemption_status,
  new_balance integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_athlete_id uuid;
  v_offer public.market_offers%rowtype;
  v_redemption_id uuid;
  v_redemption_code text;
  v_balance integer;
  v_active_inventory integer;
  v_athlete_redemptions integer;
  v_idempotency_key text;
  v_existing_source uuid;
begin
  if private.current_app_role() <> 'athlete'::public.app_role then
    raise exception 'Only athletes can redeem Market offers' using errcode = '42501';
  end if;

  if operation_id is null
     or char_length(trim(operation_id)) < 8
     or char_length(operation_id) > 120 then
    raise exception 'Invalid redemption operation id' using errcode = '22023';
  end if;

  v_athlete_id := private.current_athlete_id();
  if v_athlete_id is null then
    raise exception 'Athlete profile not found' using errcode = '42501';
  end if;

  v_idempotency_key := 'market_redemption:' || trim(operation_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_idempotency_key, 0)
  );

  select t.source_id
    into v_existing_source
  from public.ur_coin_transactions t
  where t.idempotency_key = v_idempotency_key
    and t.source_type = 'market_redemption'
  limit 1;

  if v_existing_source is not null then
    return query
    select
      mr.id,
      mr.redemption_code,
      mr.status,
      coalesce((
        select sum(
          case when tx.direction = 'credit'::public.ur_coin_direction
            then tx.amount
            else -tx.amount
          end
        )::integer
        from public.ur_coin_transactions tx
        where tx.athlete_id = v_athlete_id
      ), 0)
    from public.market_redemptions mr
    where mr.id = v_existing_source
      and mr.athlete_id = v_athlete_id;
    return;
  end if;

  -- Serialize wallet mutations for this athlete before calculating balance.
  perform 1
  from public.athletes a
  where a.id = v_athlete_id
  for update;

  select *
    into v_offer
  from public.market_offers mo
  where mo.id = target_offer
  for update;

  if not found then
    raise exception 'Market offer not found' using errcode = 'P0002';
  end if;

  if v_offer.status <> 'active'::public.entity_status
     or v_offer.starts_at > now()
     or (v_offer.ends_at is not null and v_offer.ends_at <= now()) then
    raise exception 'Market offer is not active' using errcode = 'P0001';
  end if;

  if not v_offer.accepts_urc
     or v_offer.urc_amount is null
     or v_offer.urc_amount <= 0 then
    raise exception 'Market offer is not redeemable with UR Coins' using errcode = 'P0001';
  end if;

  select count(*)::integer
    into v_active_inventory
  from public.market_redemptions mr
  where mr.offer_id = v_offer.id
    and mr.status in (
      'available'::public.market_redemption_status,
      'reserved'::public.market_redemption_status,
      'redeemed'::public.market_redemption_status
    );

  if v_offer.inventory_limit is not null
     and v_active_inventory >= v_offer.inventory_limit then
    raise exception 'Market offer inventory exhausted' using errcode = 'P0001';
  end if;

  select count(*)::integer
    into v_athlete_redemptions
  from public.market_redemptions mr
  where mr.offer_id = v_offer.id
    and mr.athlete_id = v_athlete_id
    and mr.status in (
      'available'::public.market_redemption_status,
      'reserved'::public.market_redemption_status,
      'redeemed'::public.market_redemption_status
    );

  if v_offer.per_athlete_limit is not null
     and v_athlete_redemptions >= v_offer.per_athlete_limit then
    raise exception 'Athlete redemption limit reached for this offer' using errcode = 'P0001';
  end if;

  select coalesce(sum(
    case when tx.direction = 'credit'::public.ur_coin_direction
      then tx.amount
      else -tx.amount
    end
  ), 0)::integer
    into v_balance
  from public.ur_coin_transactions tx
  where tx.athlete_id = v_athlete_id;

  if v_balance < v_offer.urc_amount then
    raise exception 'Insufficient UR Coins balance' using errcode = 'P0001';
  end if;

  v_redemption_id := pg_catalog.gen_random_uuid();
  v_redemption_code := upper(substr(
    replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    1,
    12
  ));

  insert into public.market_redemptions (
    id,
    offer_id,
    athlete_id,
    status,
    reserved_at,
    payment_snapshot,
    redemption_code
  ) values (
    v_redemption_id,
    v_offer.id,
    v_athlete_id,
    'reserved'::public.market_redemption_status,
    now(),
    pg_catalog.jsonb_build_object(
      'method', 'urc',
      'urc_amount', v_offer.urc_amount,
      'offer_code', v_offer.code,
      'offer_name', v_offer.name
    ),
    v_redemption_code
  );

  insert into public.ur_coin_transactions (
    athlete_id,
    rule_id,
    transaction_type,
    direction,
    amount,
    source_type,
    source_id,
    season_id,
    idempotency_key,
    reason,
    created_by,
    metadata
  ) values (
    v_athlete_id,
    null,
    'spend'::public.ur_coin_transaction_type,
    'debit'::public.ur_coin_direction,
    v_offer.urc_amount,
    'market_redemption',
    v_redemption_id,
    null,
    v_idempotency_key,
    'Resgate UR Market: ' || v_offer.name,
    auth.uid(),
    pg_catalog.jsonb_build_object(
      'offer_id', v_offer.id,
      'redemption_code', v_redemption_code
    )
  );

  return query
  select
    v_redemption_id,
    v_redemption_code,
    'reserved'::public.market_redemption_status,
    v_balance - v_offer.urc_amount;
end;
$$;

revoke all on function public.redeem_market_offer_urc(uuid, text) from public, anon;
grant execute on function public.redeem_market_offer_urc(uuid, text) to authenticated;
