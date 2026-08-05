-- Season 1 completion — commercial types and tables.

create type public.commercial_product_type as enum ('ur_play','training','hunter','development','tournament','market','sponsorship','custom');
create type public.commercial_charge_status as enum ('pending','submitted','verified','waived','refunded','cancelled');
create type public.commercial_payment_status as enum ('submitted','verified','rejected','refunded','cancelled');
create type public.commercial_payment_method as enum ('pix','cash','bank_transfer','card_external','complimentary','other');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  product_type public.commercial_product_type not null,
  description text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  scope text not null default 'default',
  currency char(3) not null default 'BRL',
  unit_amount numeric(10,2) not null check (unit_amount >= 0),
  rule_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pricing_rules_window check (ends_at is null or ends_at > starts_at)
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  product_id uuid references public.products(id) on delete restrict,
  included_units integer check (included_units is null or included_units > 0),
  currency char(3) not null default 'BRL',
  list_amount numeric(10,2) check (list_amount is null or list_amount >= 0),
  active boolean not null default true,
  benefits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athlete_commercial_packages (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  season_id uuid references public.seasons(id) on delete restrict,
  status public.entity_status not null default 'active',
  units_total integer check (units_total is null or units_total >= 0),
  units_used integer not null default 0 check (units_used >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint athlete_packages_units check (units_total is null or units_used <= units_total)
);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  package_id uuid references public.packages(id) on delete restrict,
  tournament_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  ur_play_registration_id uuid references public.ur_play_registrations(id) on delete restrict,
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.commercial_charge_status not null default 'pending',
  due_at timestamptz,
  price_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  cancelled_at timestamptz,
  internal_notes text,
  constraint charge_subject check (athlete_id is not null or team_id is not null)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  method public.commercial_payment_method not null,
  status public.commercial_payment_status not null default 'submitted',
  reference text,
  submitted_at timestamptz not null default now(),
  submitted_by uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  notes text
);
