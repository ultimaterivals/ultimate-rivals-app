create table public.commercial_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  athlete_package_id uuid references public.athlete_commercial_packages(id) on delete restrict,
  reservation_id uuid references public.activity_reservations(id) on delete restrict,
  opportunity_id uuid references public.demand_opportunities(id) on delete restrict,
  event_type text not null check (event_type in ('grant','hold','release','consume','expire','refund','adjustment')),
  available_delta integer not null default 0,
  reserved_delta integer not null default 0,
  consumed_delta integer not null default 0,
  idempotency_key text not null unique,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint commercial_credit_ledger_nonzero check (
    available_delta <> 0 or reserved_delta <> 0 or consumed_delta <> 0
  ),
  constraint commercial_credit_ledger_event_shape check (
    (event_type = 'grant' and available_delta > 0 and reserved_delta = 0 and consumed_delta = 0)
    or (event_type = 'hold' and available_delta < 0 and reserved_delta > 0 and consumed_delta = 0 and -available_delta = reserved_delta)
    or (event_type = 'release' and available_delta > 0 and reserved_delta < 0 and consumed_delta = 0 and available_delta = -reserved_delta)
    or (event_type = 'consume' and available_delta = 0 and reserved_delta < 0 and consumed_delta > 0 and -reserved_delta = consumed_delta)
    or (event_type = 'expire' and available_delta < 0 and reserved_delta = 0 and consumed_delta = 0)
    or (event_type = 'refund' and available_delta > 0 and reserved_delta = 0 and consumed_delta < 0 and available_delta = -consumed_delta)
    or event_type = 'adjustment'
  )
);

create index commercial_credit_ledger_athlete_idx
  on public.commercial_credit_ledger (athlete_id, occurred_at desc);
create index commercial_credit_ledger_package_idx
  on public.commercial_credit_ledger (athlete_package_id, occurred_at desc)
  where athlete_package_id is not null;
create index commercial_credit_ledger_reservation_idx
  on public.commercial_credit_ledger (reservation_id)
  where reservation_id is not null;

create or replace function private.prevent_commercial_credit_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  raise exception 'commercial_credit_ledger is append-only; create a compensating entry instead';
end;
$$;

revoke all on function private.prevent_commercial_credit_ledger_mutation() from public, anon, authenticated;

create trigger prevent_commercial_credit_ledger_update
before update on public.commercial_credit_ledger
for each row execute function private.prevent_commercial_credit_ledger_mutation();

create trigger prevent_commercial_credit_ledger_delete
before delete on public.commercial_credit_ledger
for each row execute function private.prevent_commercial_credit_ledger_mutation();

alter table public.commercial_credit_ledger enable row level security;
revoke all on public.commercial_credit_ledger from anon, authenticated;
grant select on public.commercial_credit_ledger to authenticated;

create policy commercial_credit_ledger_select
  on public.commercial_credit_ledger
  for select
  to authenticated
  using (private.can_access_athlete(athlete_id));

create or replace view public.athlete_credit_balances
with (security_invoker = true)
as
select
  athlete_id,
  athlete_package_id,
  sum(available_delta)::integer as available_units,
  sum(reserved_delta)::integer as reserved_units,
  sum(consumed_delta)::integer as consumed_units,
  max(occurred_at) as updated_at
from public.commercial_credit_ledger
group by athlete_id, athlete_package_id;

grant select on public.athlete_credit_balances to authenticated;
revoke all on public.athlete_credit_balances from anon;
