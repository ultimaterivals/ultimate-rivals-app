-- UR Coin transactions are generated only by controlled database processors.
-- Direct Data API writes from a browser session would bypass their evidence,
-- idempotency and reconciliation controls.
drop policy if exists ur_coin_transactions_insert on public.ur_coin_transactions;

revoke insert on table public.ur_coin_transactions from authenticated;
