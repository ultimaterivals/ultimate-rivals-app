-- Season 1 completion — staff/refereeing core.

create table if not exists public.staff_role_catalog (
  role text primary key check (role in ('technical_director','pole_coordinator','technical_evaluator','referee','assistant_referee','score_operator','performance_analyst','media_operator','coach')),
  label text not null,
  category text not null check (category in ('technical','operations','officiating','media','coaching')),
  formal_officiating boolean not null default false,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null references public.staff_role_catalog(role) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  status public.entity_status not null default 'active',
  assigned_by uuid references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  notes text,
  unique (profile_id, role, pole_id)
);

create table if not exists public.match_official_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  tournament_match_id uuid references public.tournament_matches(id) on delete restrict,
  court_id uuid references public.courts(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('referee','assistant_referee','score_operator','pole_coordinator','performance_analyst')),
  status text not null default 'assigned' check (status in ('assigned','confirmed','declined','replaced','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  unique (match_id, profile_id, role)
);

create index if not exists staff_profile_roles_profile on public.staff_profile_roles (profile_id, status);
create index if not exists staff_profile_roles_pole on public.staff_profile_roles (pole_id, role, status) where pole_id is not null;
create index if not exists staff_profile_roles_assigned_by on public.staff_profile_roles (assigned_by) where assigned_by is not null;
create index if not exists match_official_assignments_match on public.match_official_assignments (match_id, role, status);
create index if not exists match_official_assignments_profile on public.match_official_assignments (profile_id, status);
create index if not exists match_official_assignments_tournament_match on public.match_official_assignments (tournament_match_id) where tournament_match_id is not null;
create index if not exists match_official_assignments_court on public.match_official_assignments (court_id) where court_id is not null;
create index if not exists match_official_assignments_created_by on public.match_official_assignments (created_by) where created_by is not null;

insert into public.staff_role_catalog (role, label, category, formal_officiating, description)
values
  ('technical_director', 'Technical director', 'technical', false, 'Owns technical standards and homologation policy.'),
  ('pole_coordinator', 'Pole coordinator', 'operations', false, 'Coordinates local sessions, staff and venue operations.'),
  ('technical_evaluator', 'Technical evaluator', 'technical', false, 'Performs athlete leveling and development evaluations.'),
  ('referee', 'Referee', 'officiating', true, 'Formal match referee when required.'),
  ('assistant_referee', 'Assistant referee', 'officiating', true, 'Supports formal refereeing.'),
  ('score_operator', 'Score operator', 'officiating', false, 'Operates scoring console under event rules.'),
  ('performance_analyst', 'Performance analyst', 'technical', false, 'Captures performance evidence and technical notes.'),
  ('media_operator', 'Media operator', 'media', false, 'Captures media assets and operational content.'),
  ('coach', 'Coach', 'coaching', false, 'Leads training sessions and athlete development activities.')
on conflict (role) do update set
  label = excluded.label,
  category = excluded.category,
  formal_officiating = excluded.formal_officiating,
  description = excluded.description,
  active = true;
