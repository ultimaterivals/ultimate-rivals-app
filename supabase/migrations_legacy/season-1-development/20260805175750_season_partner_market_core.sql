-- Season 1 final completion: venue partnerships, partner events, sponsors and Market core.

create type public.venue_billing_model as enum ('fixed_hour', 'revenue_share', 'hybrid');
create type public.venue_partnership_status as enum ('prospect', 'active', 'paused', 'ended', 'archived');
create type public.partner_event_type as enum ('internal_tournament', 'clinic', 'corporate', 'festival', 'challenge', 'special', 'custom');
create type public.partner_event_status as enum ('draft', 'planned', 'published', 'in_progress', 'completed', 'cancelled', 'archived');
create type public.sponsor_status as enum ('prospect', 'active', 'paused', 'fulfilled', 'cancelled', 'archived');
create type public.sponsorship_scope as enum ('ecosystem', 'pole', 'venue', 'ur_play', 'series', 'cup', 'legends', 'training', 'hunter', 'market', 'media', 'partner_event');
create type public.sponsorship_value_type as enum ('cash', 'barter', 'mixed');
create type public.sponsorship_asset_type as enum ('court_branding', 'scoreboard', 'broadcast', 'social_content', 'highlight', 'mvp', 'hunter', 'training', 'sampling', 'stand', 'coupon', 'market_offer', 'fan_challenge', 'jersey', 'backdrop', 'interview', 'custom');
create type public.sponsorship_delivery_status as enum ('planned', 'delivered', 'waived', 'cancelled');
create type public.market_category as enum ('hydration', 'sports_food', 'supplement_partner', 'ur_merch', 'sports_accessories', 'physio', 'nutrition', 'gym', 'recovery', 'food_partner');
create type public.market_item_type as enum ('product', 'service', 'benefit', 'experience');
create type public.market_redemption_status as enum ('available', 'reserved', 'redeemed', 'expired', 'cancelled');

create table public.venue_partnerships (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  pole_id uuid not null references public.poles(id) on delete restrict,
  status public.venue_partnership_status not null default 'prospect',
  agreement_start date,
  agreement_end date,
  hourly_rate numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
  billing_model public.venue_billing_model not null default 'fixed_hour',
  revenue_share_percent numeric(5,2) check (revenue_share_percent is null or revenue_share_percent between 0 and 100),
  court_count smallint check (court_count is null or court_count > 0),
  activation_permissions jsonb not null default '{}'::jsonb,
  media_permissions jsonb not null default '{}'::jsonb,
  storage_permissions jsonb not null default '{}'::jsonb,
  food_beverage_notes text,
  commercial_notes text,
  document_reference text,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_partnership_period check (agreement_end is null or agreement_start is null or agreement_end > agreement_start),
  unique (venue_id, status) deferrable initially immediate
);

create table public.venue_availability (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  pole_id uuid not null references public.poles(id) on delete restrict,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  available_courts smallint not null default 1 check (available_courts > 0),
  status public.entity_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_availability_time check (ends_at > starts_at)
);

create table public.venue_rates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  rate_code text not null check (rate_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  billing_model public.venue_billing_model not null default 'fixed_hour',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status public.entity_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_rates_window check (ends_at is null or ends_at > starts_at),
  unique (venue_id, rate_code)
);

create table public.venue_commercial_rules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  rule_code text not null check (rule_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  description text not null,
  rule_config jsonb not null default '{}'::jsonb,
  status public.entity_status not null default 'active',
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, rule_code)
);

create table public.partner_events (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  pole_id uuid not null references public.poles(id) on delete restrict,
  event_type public.partner_event_type not null,
  name text not null,
  status public.partner_event_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  price_snapshot jsonb not null default '{}'::jsonb,
  official_ranking_event boolean not null default false,
  competition_engine_reference jsonb not null default '{}'::jsonb,
  operations_snapshot jsonb not null default '{}'::jsonb,
  media_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_events_time check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint partner_events_official_requires_reference check (official_ranking_event = false or jsonb_typeof(competition_engine_reference) = 'object')
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  brand_name text,
  category text,
  contact_reference text,
  status public.sponsor_status not null default 'prospect',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsorship_agreements (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete restrict,
  season_id uuid references public.seasons(id) on delete restrict,
  scope public.sponsorship_scope not null,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  partner_event_id uuid references public.partner_events(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  tournament_id uuid references public.tournaments(id) on delete restrict,
  name text not null,
  status public.sponsor_status not null default 'prospect',
  value_type public.sponsorship_value_type not null default 'cash',
  cash_value numeric(12,2) check (cash_value is null or cash_value >= 0),
  barter_value numeric(12,2) check (barter_value is null or barter_value >= 0),
  currency char(3) not null default 'BRL',
  venue_share_eligible boolean not null default false,
  notes text,
  starts_at date,
  ends_at date,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_period check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint sponsorship_cash_shape check (value_type <> 'cash' or cash_value is not null),
  constraint sponsorship_venue_share_cash_only check (venue_share_eligible = false or value_type in ('cash','mixed'))
);

create table public.sponsorship_assets (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete restrict,
  asset_type public.sponsorship_asset_type not null,
  name text not null,
  asset_reference text,
  status public.entity_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsorship_activations (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete restrict,
  partner_event_id uuid references public.partner_events(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  name text not null,
  status public.sponsor_status not null default 'prospect',
  starts_at timestamptz,
  ends_at timestamptz,
  activation_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_activation_time check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.sponsorship_deliveries (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete restrict,
  asset_id uuid references public.sponsorship_assets(id) on delete restrict,
  activation_id uuid references public.sponsorship_activations(id) on delete restrict,
  partner_event_id uuid references public.partner_events(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  delivery_code text not null check (delivery_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  description text not null,
  due_at timestamptz,
  delivered_at timestamptz,
  status public.sponsorship_delivery_status not null default 'planned',
  evidence_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, delivery_code)
);

create table public.sponsorship_revenue_allocations (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  revenue_entry_id uuid references public.revenue_entries(id) on delete restrict,
  share_percent numeric(5,2) not null check (share_percent >= 0 and share_percent <= 20),
  amount numeric(12,2) check (amount is null or amount >= 0),
  currency char(3) not null default 'BRL',
  status public.financial_entry_status not null default 'projected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, venue_id)
);

create table public.market_partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  category public.market_category not null,
  status public.entity_status not null default 'draft',
  contact_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_items (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.market_partners(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  category public.market_category not null,
  item_type public.market_item_type not null default 'product',
  description text,
  status public.entity_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_offers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.market_items(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  status public.entity_status not null default 'draft',
  brl_amount numeric(10,2) check (brl_amount is null or brl_amount >= 0),
  urc_amount integer check (urc_amount is null or urc_amount >= 0),
  accepts_brl boolean not null default true,
  accepts_urc boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  inventory_limit integer check (inventory_limit is null or inventory_limit > 0),
  per_athlete_limit integer check (per_athlete_limit is null or per_athlete_limit > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_offer_payment_config check (accepts_brl or accepts_urc),
  constraint market_offer_urc_requires_amount check (not accepts_urc or urc_amount is not null),
  constraint market_offer_brl_requires_amount check (not accepts_brl or brl_amount is not null),
  constraint market_offer_window check (ends_at is null or ends_at > starts_at)
);

create table public.market_benefits (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.market_offers(id) on delete restrict,
  description text not null,
  benefit_config jsonb not null default '{}'::jsonb,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.market_offers(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  status public.market_redemption_status not null default 'reserved',
  reserved_at timestamptz not null default now(),
  redeemed_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  payment_snapshot jsonb not null default '{}'::jsonb,
  redemption_code text not null unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_redemption_redeemed_time check (status <> 'redeemed' or redeemed_at is not null)
);

create index venue_partnerships_venue on public.venue_partnerships(venue_id, status);
create index venue_availability_venue_weekday on public.venue_availability(venue_id, weekday, status);
create index partner_events_calendar on public.partner_events(calendar_event_id);
create index partner_events_venue_status on public.partner_events(venue_id, status);
create index sponsorship_agreements_sponsor on public.sponsorship_agreements(sponsor_id, status);
create index sponsorship_agreements_venue_share on public.sponsorship_agreements(venue_share_eligible, status);
create index sponsorship_deliveries_agreement_status on public.sponsorship_deliveries(agreement_id, status, due_at);
create index sponsorship_revenue_allocations_agreement on public.sponsorship_revenue_allocations(agreement_id);
create index market_offers_status_window on public.market_offers(status, starts_at, ends_at);
create index market_redemptions_athlete_status on public.market_redemptions(athlete_id, status, created_at desc);

create or replace function private.enforce_sponsorship_share_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare total_share numeric;
begin
  select coalesce(sum(share_percent), 0)
    into total_share
  from public.sponsorship_revenue_allocations
  where agreement_id = new.agreement_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if total_share + new.share_percent > 20 then
    raise exception 'sponsorship venue share cannot exceed 20 percent per agreement' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.sponsorship_agreements sa
    where sa.id = new.agreement_id
      and sa.venue_share_eligible
      and sa.value_type in ('cash','mixed')
  ) then
    raise exception 'venue share requires eligible cash sponsorship agreement' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger sponsorship_share_cap
before insert or update on public.sponsorship_revenue_allocations
for each row execute function private.enforce_sponsorship_share_cap();

revoke all on function private.enforce_sponsorship_share_cap() from public, anon, authenticated;
