create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  short_name text check (char_length(short_name) <= 24),
  status public.entity_status not null default 'draft',
  logo_url text,
  primary_pole_id uuid not null references public.poles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint teams_archive_consistency check (
    (status = 'archived' and archived_at is not null) or
    (status <> 'archived' and archived_at is null)
  )
);

create table public.access_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role public.app_role not null check (role in ('pole_manager', 'team_manager')),
  scope_type public.access_scope_type not null,
  pole_id uuid references public.poles(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status public.temporal_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  constraint access_assignment_scope check (
    (scope_type = 'pole' and role = 'pole_manager' and pole_id is not null and team_id is null) or
    (scope_type = 'team' and role = 'team_manager' and team_id is not null and pole_id is null)
  ),
  constraint access_assignment_period check (ends_at is null or ends_at > starts_at)
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  membership_type public.membership_type not null default 'athlete',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.temporal_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  constraint team_memberships_period check (ends_at is null or ends_at > starts_at),
  exclude using gist (
    athlete_id with =,
    season_id with =,
    tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
  ) where (status = 'active')
);

create table public.athlete_levels (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  level public.athlete_level not null,
  status public.temporal_status not null default 'active',
  starts_at timestamptz not null,
  ends_at timestamptz,
  reason text check (char_length(reason) <= 500),
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint athlete_levels_period check (ends_at is null or ends_at > starts_at),
  exclude using gist (
    athlete_id with =,
    season_id with =,
    tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
  ) where (status = 'active')
);

create table public.team_rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  category_id uuid not null references public.competitive_categories(id) on delete restrict,
  format_id uuid not null references public.competitive_formats(id) on delete restrict,
  level public.athlete_level not null,
  name text,
  status public.roster_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_roster_members (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.team_rosters(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  role public.roster_member_role not null default 'starter',
  status public.temporal_status not null default 'active',
  joined_at timestamptz not null,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint roster_members_period check (left_at is null or left_at > joined_at),
  unique (roster_id, athlete_id)
);

create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger team_rosters_set_updated_at before update on public.team_rosters
for each row execute function private.set_updated_at();
