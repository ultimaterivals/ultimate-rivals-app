create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  ranking_cutoff_at timestamptz,
  status public.season_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_valid_period check (ends_at > starts_at),
  constraint seasons_valid_cutoff check (ranking_cutoff_at is null or ranking_cutoff_at between starts_at and ends_at)
);

create table public.poles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  city text not null,
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  status public.entity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pole_id uuid not null references public.poles(id) on delete restrict,
  address_line text,
  city text not null,
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  status public.entity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  name text not null,
  sport_type public.sport_type not null default 'beach_volleyball',
  status public.entity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, name)
);

create table public.competitive_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null unique,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitive_formats (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null unique,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.competitive_categories (code, name) values
  ('female', 'Feminino'),
  ('male', 'Masculino'),
  ('mixed', 'Misto');

insert into public.competitive_formats (code, name) values
  ('doubles', 'Duplas'),
  ('fours', 'Quartetos');

do $$
declare table_name text;
begin
  foreach table_name in array array['seasons','poles','venues','courts','competitive_categories','competitive_formats']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end $$;
