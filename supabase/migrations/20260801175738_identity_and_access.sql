create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  role public.app_role not null default 'public',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  public_name text not null check (char_length(trim(public_name)) between 2 and 80),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  birth_date date,
  gender public.gender_type not null,
  dominant_hand public.dominant_hand_type,
  height_cm smallint check (height_cm between 80 and 260),
  bio text check (char_length(bio) <= 1000),
  status public.athlete_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint athletes_archive_consistency check (
    (status = 'archived' and archived_at is not null) or
    (status <> 'archived' and archived_at is null)
  )
);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger athletes_set_updated_at before update on public.athletes
for each row execute function private.set_updated_at();
