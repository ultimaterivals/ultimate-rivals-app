-- Ultimate Rivals Season 1 v1 production baseline.
-- Generated from the archived Season 1 development migration chain.
-- This file is schema-first: top-level DML was extracted to explicit bootstrap
-- scripts so production replay does not create non-production records.
-- Regenerate with: node scripts/generate-production-baseline.cjs

create extension if not exists btree_gist;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin', 'operator', 'pole_manager', 'team_manager', 'athlete', 'public');

create type public.profile_status as enum ('active', 'suspended', 'archived');

create type public.athlete_status as enum ('draft', 'active', 'inactive', 'archived');

create type public.entity_status as enum ('draft', 'active', 'inactive', 'archived');

create type public.season_status as enum ('draft', 'registration', 'active', 'closing', 'closed', 'archived');

create type public.gender_type as enum ('female', 'male', 'non_binary', 'undisclosed');

create type public.dominant_hand_type as enum ('left', 'right', 'ambidextrous');

create type public.sport_type as enum ('beach_volleyball');

create type public.membership_type as enum ('athlete', 'captain');

create type public.temporal_status as enum ('active', 'inactive', 'cancelled');

create type public.athlete_level as enum ('leveling', 'n3', 'n2', 'n1');

create type public.roster_status as enum ('draft', 'active', 'inactive', 'archived');

create type public.roster_member_role as enum ('starter', 'reserve', 'captain');

create type public.access_scope_type as enum ('pole', 'team');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

do $$
declare table_name text;
begin
  foreach table_name in array array['seasons','poles','venues','courts','competitive_categories','competitive_formats']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end $$;

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

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  request_id text
);

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current jsonb;
  record_id uuid;
  headers jsonb;
begin
  previous := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  current := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_id := coalesce((current ->> 'id')::uuid, (previous ->> 'id')::uuid);
  headers := nullif(current_setting('request.headers', true), '')::jsonb;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_data, after_data, metadata, request_id
  ) values (
    (select auth.uid()), lower(tg_op), tg_table_name, record_id,
    previous, current,
    jsonb_build_object('schema', tg_table_schema, 'transaction_id', txid_current()),
    headers ->> 'x-request-id'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.capture_audit_log() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'athletes', 'seasons', 'poles', 'teams',
    'access_assignments', 'team_memberships', 'athlete_levels',
    'team_rosters', 'team_roster_members'
  ]
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'
$$;

create or replace function private.has_any_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.current_app_role() = any(allowed)
$$;

create or replace function private.current_athlete_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.athletes a where a.profile_id = (select auth.uid())
$$;

create or replace function private.manages_pole(target_pole_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.access_assignments aa
    where aa.profile_id = (select auth.uid())
      and aa.role = 'pole_manager' and aa.scope_type = 'pole'
      and aa.pole_id = target_pole_id and aa.status = 'active'
      and aa.starts_at <= now() and (aa.ends_at is null or aa.ends_at > now())
  )
$$;

create or replace function private.manages_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.access_assignments aa
    where aa.profile_id = (select auth.uid())
      and aa.role = 'team_manager' and aa.scope_type = 'team'
      and aa.team_id = target_team_id and aa.status = 'active'
      and aa.starts_at <= now() and (aa.ends_at is null or aa.ends_at > now())
  )
$$;

revoke all on function private.current_app_role() from public, anon;

revoke all on function private.has_any_role(public.app_role[]) from public, anon;

revoke all on function private.current_athlete_id() from public, anon;

revoke all on function private.manages_pole(uuid) from public, anon;

revoke all on function private.manages_team(uuid) from public, anon;

grant usage on schema private to authenticated;

grant execute on function private.current_app_role() to authenticated;

grant execute on function private.has_any_role(public.app_role[]) to authenticated;

grant execute on function private.current_athlete_id() to authenticated;

grant execute on function private.manages_pole(uuid) to authenticated;

grant execute on function private.manages_team(uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','athletes','seasons','poles','venues','courts','teams',
    'access_assignments','team_memberships','athlete_levels',
    'competitive_categories','competitive_formats','team_rosters',
    'team_roster_members','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.has_any_role(array['admin']::public.app_role[])));

create policy profiles_admin_insert on public.profiles for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy profiles_admin_update on public.profiles for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy athletes_select on public.athletes for select to authenticated using (
  profile_id = (select auth.uid())
  or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or exists (
    select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id
    where tm.athlete_id = athletes.id and tm.status = 'active'
      and ((select private.manages_team(tm.team_id)) or (select private.manages_pole(t.primary_pole_id)))
  )
);

create policy athletes_admin_insert on public.athletes for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy athletes_admin_update on public.athletes for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy athletes_admin_delete on public.athletes for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy seasons_select on public.seasons for select to authenticated
using ((select private.has_any_role(array['admin','operator','pole_manager','team_manager','athlete']::public.app_role[])));

create policy seasons_admin_all on public.seasons for all to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy categories_select on public.competitive_categories for select to authenticated using (status = 'active' or (select private.has_any_role(array['admin','operator']::public.app_role[])));

create policy categories_admin_all on public.competitive_categories for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy formats_select on public.competitive_formats for select to authenticated using (status = 'active' or (select private.has_any_role(array['admin','operator']::public.app_role[])));

create policy formats_admin_all on public.competitive_formats for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy poles_select on public.poles for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_pole(id))
  or exists (select 1 from public.teams t where t.primary_pole_id = poles.id and ((select private.manages_team(t.id)) or exists (select 1 from public.team_memberships tm where tm.team_id = t.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active')))
);

create policy poles_admin_all on public.poles for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy venues_select on public.venues for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_pole(pole_id)) or exists (select 1 from public.teams t where t.primary_pole_id = venues.pole_id and ((select private.manages_team(t.id)) or exists (select 1 from public.team_memberships tm where tm.team_id = t.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active'))));

create policy venues_admin_all on public.venues for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy courts_select on public.courts for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or exists (select 1 from public.venues v where v.id = courts.venue_id and ((select private.manages_pole(v.pole_id)) or exists (select 1 from public.teams t where t.primary_pole_id = v.pole_id and (select private.manages_team(t.id))))));

create policy courts_admin_all on public.courts for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy teams_select on public.teams for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_pole(primary_pole_id)) or (select private.manages_team(id))
  or exists (select 1 from public.team_memberships tm where tm.team_id = teams.id and tm.athlete_id = (select private.current_athlete_id()) and tm.status = 'active')
);

create policy teams_admin_all on public.teams for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy assignments_select on public.access_assignments for select to authenticated using (profile_id = (select auth.uid()) or (select private.has_any_role(array['admin']::public.app_role[])));

create policy assignments_admin_all on public.access_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy memberships_select on public.team_memberships for select to authenticated using (
  athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_team(team_id)) or exists (select 1 from public.teams t where t.id = team_memberships.team_id and (select private.manages_pole(t.primary_pole_id)))
);

create policy memberships_admin_all on public.team_memberships for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy levels_select on public.athlete_levels for select to authenticated using (
  athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.athlete_id = athlete_levels.athlete_id and tm.status = 'active' and ((select private.manages_team(tm.team_id)) or (select private.manages_pole(t.primary_pole_id))))
);

create policy levels_admin_all on public.athlete_levels for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy rosters_select on public.team_rosters for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(team_id)) or exists (select 1 from public.teams t where t.id = team_rosters.team_id and (select private.manages_pole(t.primary_pole_id))) or exists (select 1 from public.team_roster_members trm where trm.roster_id = team_rosters.id and trm.athlete_id = (select private.current_athlete_id()) and trm.status = 'active'));

create policy rosters_admin_all on public.team_rosters for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy roster_members_select on public.team_roster_members for select to authenticated using (athlete_id = (select private.current_athlete_id()) or (select private.has_any_role(array['admin','operator']::public.app_role[])) or exists (select 1 from public.team_rosters tr join public.teams t on t.id = tr.team_id where tr.id = team_roster_members.roster_id and ((select private.manages_team(tr.team_id)) or (select private.manages_pole(t.primary_pole_id)))));

create policy roster_members_admin_all on public.team_roster_members for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy audit_admin_select on public.audit_logs for select to authenticated
using ((select private.has_any_role(array['admin','operator']::public.app_role[])));

create index athletes_profile_id_idx on public.athletes(profile_id) where profile_id is not null;

create index venues_pole_id_idx on public.venues(pole_id);

create index courts_venue_id_idx on public.courts(venue_id);

create index teams_primary_pole_id_idx on public.teams(primary_pole_id);

create index access_assignments_profile_status_idx on public.access_assignments(profile_id, status, starts_at, ends_at);

create index access_assignments_pole_idx on public.access_assignments(pole_id) where pole_id is not null;

create index access_assignments_team_idx on public.access_assignments(team_id) where team_id is not null;

create index team_memberships_athlete_season_status_idx on public.team_memberships(athlete_id, season_id, status);

create index team_memberships_team_season_status_idx on public.team_memberships(team_id, season_id, status);

create index athlete_levels_athlete_season_idx on public.athlete_levels(athlete_id, season_id, starts_at desc);

create index team_rosters_team_season_idx on public.team_rosters(team_id, season_id, status);

create index team_roster_members_roster_idx on public.team_roster_members(roster_id, status);

create index team_roster_members_athlete_idx on public.team_roster_members(athlete_id, status);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);

revoke all on all tables in schema public from anon;

revoke all on all tables in schema public from authenticated;

grant select, insert, update, delete on public.profiles, public.athletes, public.seasons,
  public.poles, public.venues, public.courts, public.teams, public.access_assignments,
  public.team_memberships, public.athlete_levels, public.competitive_categories,
  public.competitive_formats, public.team_rosters, public.team_roster_members
to authenticated;

grant select on public.audit_logs to authenticated;

grant all on all tables in schema public to service_role;

alter default privileges in schema public revoke all on tables from anon;

alter default privileges in schema public revoke all on tables from authenticated;

-- Keep cross-entity authorization outside RLS expressions so policies never
-- recurse through one another. These helpers execute as their migration owner,
-- expose only booleans, and cannot be called by anon.
create or replace function private.is_active_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_memberships tm
    where tm.team_id = target_team_id
      and tm.athlete_id = private.current_athlete_id()
      and tm.status = 'active'
  )
$$;

create or replace function private.team_is_in_managed_pole(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team_id and private.manages_pole(t.primary_pole_id)
  )
$$;

create or replace function private.can_access_athlete(target_athlete_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or target_athlete_id = private.current_athlete_id()
    or exists (
      select 1 from public.team_memberships tm
      join public.teams t on t.id = tm.team_id
      where tm.athlete_id = target_athlete_id and tm.status = 'active'
        and (private.manages_team(tm.team_id) or private.manages_pole(t.primary_pole_id))
    )
$$;

create or replace function private.can_access_pole(target_pole_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(target_pole_id)
    or exists (
      select 1 from public.teams t
      where t.primary_pole_id = target_pole_id
        and (private.manages_team(t.id) or private.is_active_team_member(t.id))
    )
$$;

create or replace function private.can_access_roster(target_roster_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1 from public.team_rosters tr
      where tr.id = target_roster_id
        and (private.manages_team(tr.team_id)
          or private.team_is_in_managed_pole(tr.team_id)
          or private.is_active_team_member(tr.team_id))
    )
$$;

revoke all on function private.is_active_team_member(uuid) from public, anon;

revoke all on function private.team_is_in_managed_pole(uuid) from public, anon;

revoke all on function private.can_access_athlete(uuid) from public, anon;

revoke all on function private.can_access_pole(uuid) from public, anon;

revoke all on function private.can_access_roster(uuid) from public, anon;

grant execute on function private.is_active_team_member(uuid) to authenticated;

grant execute on function private.team_is_in_managed_pole(uuid) to authenticated;

grant execute on function private.can_access_athlete(uuid) to authenticated;

grant execute on function private.can_access_pole(uuid) to authenticated;

grant execute on function private.can_access_roster(uuid) to authenticated;

drop policy athletes_select on public.athletes;

create policy athletes_select on public.athletes for select to authenticated
using ((select private.can_access_athlete(id)));

drop policy poles_select on public.poles;

create policy poles_select on public.poles for select to authenticated
using ((select private.can_access_pole(id)));

drop policy venues_select on public.venues;

create policy venues_select on public.venues for select to authenticated
using ((select private.can_access_pole(pole_id)));

drop policy courts_select on public.courts;

create policy courts_select on public.courts for select to authenticated using (
  exists (select 1 from public.venues v where v.id = courts.venue_id
    and (select private.can_access_pole(v.pole_id)))
);

drop policy teams_select on public.teams;

create policy teams_select on public.teams for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_pole(primary_pole_id))
  or (select private.manages_team(id))
  or (select private.is_active_team_member(id))
);

drop policy memberships_select on public.team_memberships;

create policy memberships_select on public.team_memberships for select to authenticated using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (select private.manages_team(team_id))
  or (select private.team_is_in_managed_pole(team_id))
);

drop policy levels_select on public.athlete_levels;

create policy levels_select on public.athlete_levels for select to authenticated
using ((select private.can_access_athlete(athlete_id)));

drop policy rosters_select on public.team_rosters;

create policy rosters_select on public.team_rosters for select to authenticated
using ((select private.can_access_roster(id)));

drop policy roster_members_select on public.team_roster_members;

create policy roster_members_select on public.team_roster_members for select to authenticated
using ((select private.can_access_roster(roster_id)));

alter type public.athlete_status add value if not exists 'suspended';

create sequence if not exists public.athlete_code_seq;

alter table public.athletes
  add column athlete_code text,
  add column phone text check (phone is null or char_length(phone) between 8 and 24),
  add column email_contact text check (email_contact is null or char_length(email_contact) <= 254),
  add column instagram_handle text check (instagram_handle is null or instagram_handle ~ '^@?[A-Za-z0-9._]{1,30}$'),
  add column city text check (city is null or char_length(city) <= 100),
  add column state text check (state is null or state ~ '^[A-Z]{2}$'),
  add column avatar_url text,
  add column emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) <= 120),
  add column emergency_contact_phone text check (emergency_contact_phone is null or char_length(emergency_contact_phone) between 8 and 24),
  add column normalized_full_name text,
  add column duplicate_override_reason text check (duplicate_override_reason is null or char_length(duplicate_override_reason) between 10 and 500);

alter sequence public.athlete_code_seq owned by public.athletes.athlete_code;

create or replace function private.normalize_athlete_name(value text)
returns text language sql immutable security invoker set search_path = '' as $$
  select lower(regexp_replace(trim(value), '[^[:alnum:]]+', ' ', 'g'))
$$;

create or replace function private.prepare_athlete_identity()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.athlete_code is distinct from old.athlete_code then
    raise exception 'athlete_code is immutable' using errcode = '23514';
  end if;
  if new.athlete_code is null then
    new.athlete_code := 'UR-' || lpad(nextval('public.athlete_code_seq')::text, 6, '0');
  end if;
  new.normalized_full_name := private.normalize_athlete_name(new.full_name);
  new.email_contact := nullif(lower(trim(new.email_contact)), '');
  return new;
end $$;

create trigger athletes_prepare_identity before insert or update on public.athletes
for each row execute function private.prepare_athlete_identity();

alter table public.athletes alter column athlete_code set not null;

alter table public.athletes add constraint athletes_code_format check (athlete_code ~ '^UR-[0-9]{6}$');

alter table public.athletes add constraint athletes_code_unique unique (athlete_code);

create type public.athlete_note_type as enum ('general','operational','technical');

create type public.athlete_note_visibility as enum ('internal','athlete_visible');

create table public.athlete_notes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  note_type public.athlete_note_type not null,
  content text not null check (char_length(trim(content)) between 2 and 2000),
  visibility public.athlete_note_visibility not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);

create index athlete_notes_athlete_created_idx on public.athlete_notes(athlete_id, created_at desc);

create trigger athlete_notes_audit after insert or update or delete on public.athlete_notes
for each row execute function private.capture_audit_log();

alter table public.athlete_notes enable row level security;

alter table public.athlete_notes force row level security;

create policy athlete_notes_admin_all on public.athlete_notes for all to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])) and author_user_id = (select auth.uid()));

create policy athlete_notes_operator_select on public.athlete_notes for select to authenticated
using ((select private.has_any_role(array['operator']::public.app_role[])));

create policy athlete_notes_own_visible_select on public.athlete_notes for select to authenticated
using (visibility = 'athlete_visible' and athlete_id = (select private.current_athlete_id()));

revoke all on public.athlete_notes from anon, authenticated;

grant select, insert, update, delete on public.athlete_notes to authenticated;

grant all on public.athlete_notes to service_role;

create or replace function private.protect_athlete_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.current_app_role() = 'athlete' and (
    new.profile_id is distinct from old.profile_id or new.full_name is distinct from old.full_name or
    new.birth_date is distinct from old.birth_date or new.gender is distinct from old.gender or
    new.status is distinct from old.status or new.archived_at is distinct from old.archived_at or
    new.emergency_contact_name is distinct from old.emergency_contact_name or
    new.emergency_contact_phone is distinct from old.emergency_contact_phone or
    new.duplicate_override_reason is distinct from old.duplicate_override_reason
  ) then raise exception 'restricted athlete field' using errcode = '42501'; end if;
  return new;
end $$;

revoke all on function private.protect_athlete_self_update() from public, anon, authenticated;

create trigger athletes_protect_self_update before update on public.athletes
for each row execute function private.protect_athlete_self_update();

create policy athletes_self_update on public.athletes for update to authenticated
using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create or replace function public.assign_athlete_level(
  target_athlete_id uuid, target_season_id uuid, target_level public.athlete_level,
  effective_at timestamptz, assignment_reason text default null
) returns public.athlete_levels language plpgsql security invoker set search_path = '' as $$
declare result public.athlete_levels;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.athlete_levels set ends_at = effective_at, status = 'inactive'
    where athlete_id = target_athlete_id and season_id = target_season_id
      and status = 'active' and starts_at < effective_at;
  insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by)
    values(target_athlete_id,target_season_id,target_level,effective_at,assignment_reason,auth.uid()) returning * into result;
  return result;
end $$;

revoke all on function public.assign_athlete_level(uuid,uuid,public.athlete_level,timestamptz,text) from public, anon;

grant execute on function public.assign_athlete_level(uuid,uuid,public.athlete_level,timestamptz,text) to authenticated;

create index athletes_search_idx on public.athletes(normalized_full_name, athlete_code);

create index athletes_email_idx on public.athletes(lower(email_contact)) where email_contact is not null;

create index athletes_phone_idx on public.athletes(phone) where phone is not null;

create index athletes_birth_name_idx on public.athletes(normalized_full_name,birth_date) where birth_date is not null;

create policy athlete_avatar_select on storage.objects for select to authenticated using (
  bucket_id='athlete-avatars' and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
);

create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id='athlete-avatars' and (storage.foldername(name))[1] = (select private.current_athlete_id())::text
  and owner_id = (select auth.uid())::text
);

create policy athlete_avatar_update on storage.objects for update to authenticated using (
  bucket_id='athlete-avatars' and ((storage.foldername(name))[1] = (select private.current_athlete_id())::text or (select private.has_any_role(array['admin']::public.app_role[])))
) with check (bucket_id='athlete-avatars');

create policy athlete_avatar_delete on storage.objects for delete to authenticated using (
  bucket_id='athlete-avatars' and ((storage.foldername(name))[1] = (select private.current_athlete_id())::text or (select private.has_any_role(array['admin']::public.app_role[])))
);

create or replace function private.can_access_athlete(target_athlete_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or target_athlete_id = private.current_athlete_id()
$$;

revoke all on function private.can_access_athlete(uuid) from public, anon;

grant execute on function private.can_access_athlete(uuid) to authenticated;

create or replace function public.import_athletes_csv(rows jsonb)
returns setof public.athletes language plpgsql security invoker set search_path = '' as $$
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) < 1 or jsonb_array_length(rows) > 500 then
    raise exception 'invalid import batch' using errcode='22023';
  end if;
  return query
  insert into public.athletes(public_name,full_name,birth_date,gender,email_contact,phone,city,state)
  select trim(x.public_name),trim(x.full_name),nullif(x.birth_date,'')::date,
    x.gender::public.gender_type,nullif(lower(trim(x.email_contact)),''),nullif(trim(x.phone),''),
    nullif(trim(x.city),''),nullif(upper(trim(x.state)),'')
  from jsonb_to_recordset(rows) as x(public_name text,full_name text,birth_date text,gender text,email_contact text,phone text,city text,state text)
  returning *;
end $$;

revoke all on function public.import_athletes_csv(jsonb) from public, anon;

grant execute on function public.import_athletes_csv(jsonb) to authenticated;

drop policy athlete_avatar_insert on storage.objects;

create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'athlete-avatars' and (
    (select private.has_any_role(array['admin']::public.app_role[]))
    or (
      (storage.foldername(name))[1] = (select private.current_athlete_id())::text
      and owner_id = (select auth.uid())::text
    )
  )
);

alter table public.teams
  add column description text check (description is null or char_length(description) <= 1200),
  add column founded_at date,
  add column instagram_handle text check (instagram_handle is null or instagram_handle ~ '^@?[A-Za-z0-9._]{1,30}$');

create type public.team_management_role as enum ('owner','manager','assistant');

create table public.team_manager_assignments (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict, management_role public.team_management_role not null,
  starts_at timestamptz not null default now(), ends_at timestamptz, status public.temporal_status not null default 'active',
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint team_manager_period check (ends_at is null or ends_at > starts_at)
);

create index team_manager_profile_idx on public.team_manager_assignments(profile_id,status,starts_at,ends_at);

create index team_manager_team_idx on public.team_manager_assignments(team_id,status);

create table public.team_pole_assignments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete restrict,
  pole_id uuid not null references public.poles(id) on delete restrict, season_id uuid not null references public.seasons(id) on delete restrict,
  starts_at timestamptz not null, ends_at timestamptz, status public.temporal_status not null default 'active',
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint team_pole_period check (ends_at is null or ends_at > starts_at),
  exclude using gist (team_id with =, season_id with =, tstzrange(starts_at,coalesce(ends_at,'infinity'::timestamptz),'[)') with &&) where (status='active')
);

create index team_pole_team_season_idx on public.team_pole_assignments(team_id,season_id,starts_at desc);

create table public.athlete_public_profiles (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  athlete_code text not null unique, public_name text not null, avatar_url text, updated_at timestamptz not null default now()
);

create or replace function private.sync_athlete_public_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then delete from public.athlete_public_profiles where athlete_id=old.id; return old; end if;
  insert into public.athlete_public_profiles(athlete_id,athlete_code,public_name,avatar_url,updated_at)
  values(new.id,new.athlete_code,new.public_name,new.avatar_url,now())
  on conflict(athlete_id) do update set athlete_code=excluded.athlete_code,public_name=excluded.public_name,avatar_url=excluded.avatar_url,updated_at=now();
  return new;
end $$;

revoke all on function private.sync_athlete_public_profile() from public,anon,authenticated;

create trigger athletes_sync_public_profile after insert or update or delete on public.athletes
for each row execute function private.sync_athlete_public_profile();

alter table public.team_roster_members add column is_captain boolean not null default false;

alter table public.team_rosters add constraint roster_competitive_level check (level <> 'leveling');

create or replace function private.level_strength(value public.athlete_level)
returns smallint language sql immutable security invoker set search_path='' as $$
 select case value when 'n3' then 1 when 'n2' then 2 when 'n1' then 3 else 0 end::smallint
$$;

create or replace function private.validate_roster_member()
returns trigger language plpgsql security definer set search_path='' as $$
declare r public.team_rosters; format_code text; category_code text; athlete_gender public.gender_type; strongest smallint;
begin
 select * into r from public.team_rosters where id=new.roster_id;
 if not found then raise exception 'roster not found' using errcode='23503'; end if;
 select code into format_code from public.competitive_formats where id=r.format_id;
 select code into category_code from public.competitive_categories where id=r.category_id;
 if not exists(select 1 from public.team_memberships m where m.athlete_id=new.athlete_id and m.team_id=r.team_id and m.season_id=r.season_id and m.status='active' and m.starts_at<=new.joined_at and (m.ends_at is null or m.ends_at>new.joined_at)) then
   raise exception 'athlete has no active membership for roster team and season' using errcode='23514';
 end if;
 select gender into athlete_gender from public.athletes where id=new.athlete_id;
 if category_code='female' and athlete_gender<>'female' then raise exception 'female roster requires female athlete' using errcode='23514'; end if;
 if category_code='male' and athlete_gender<>'male' then raise exception 'male roster requires male athlete' using errcode='23514'; end if;
 if category_code='mixed' and athlete_gender not in ('female','male') then raise exception 'mixed roster requires female or male athlete' using errcode='23514'; end if;
 select max(private.level_strength(l.level)) into strongest from public.athlete_levels l where l.athlete_id=new.athlete_id and l.season_id=r.season_id and l.status='active';
 if coalesce(strongest,0)=0 then raise exception 'athlete has no competitive level' using errcode='23514'; end if;
 if private.level_strength(r.level)<strongest then raise exception 'roster level is below athlete level' using errcode='23514'; end if;
 if format_code='doubles' and new.role<>'starter' then raise exception 'doubles allow starters only' using errcode='23514'; end if;
 return new;
end $$;

revoke all on function private.validate_roster_member() from public,anon,authenticated;

create trigger roster_member_validate before insert or update on public.team_roster_members for each row execute function private.validate_roster_member();

create or replace function private.enforce_roster_member_limits()
returns trigger language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(new.roster_id,old.roster_id); format_code text; active_count int; starters int; reserves int;
begin
 select f.code into format_code from public.team_rosters r join public.competitive_formats f on f.id=r.format_id where r.id=rid;
 select count(*),count(*) filter(where role='starter'),count(*) filter(where role='reserve') into active_count,starters,reserves from public.team_roster_members where roster_id=rid and status='active';
 if format_code='doubles' and (active_count>2 or starters>2 or reserves>0) then raise exception 'invalid doubles composition' using errcode='23514'; end if;
 if format_code='fours' and (active_count>7 or starters>4 or reserves>3) then raise exception 'invalid fours composition' using errcode='23514'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;

revoke all on function private.enforce_roster_member_limits() from public,anon,authenticated;

create constraint trigger roster_member_limits after insert or update or delete on public.team_roster_members deferrable initially immediate for each row execute function private.enforce_roster_member_limits();

create or replace function private.validate_roster_activation()
returns trigger language plpgsql security definer set search_path='' as $$
declare format_code text; active_count int; starters int; reserves int; same_count int;
begin
 if new.status='active' and old.status is distinct from 'active' then
  select code into format_code from public.competitive_formats where id=new.format_id;
  select count(*),count(*) filter(where role='starter'),count(*) filter(where role='reserve') into active_count,starters,reserves from public.team_roster_members where roster_id=new.id and status='active';
  if format_code='doubles' and (active_count<>2 or starters<>2 or reserves<>0) then raise exception 'doubles require exactly two starters' using errcode='23514'; end if;
  if format_code='fours' and (active_count<4 or active_count>7 or starters<>4 or reserves>3) then raise exception 'fours require four starters and at most three reserves' using errcode='23514'; end if;
 end if;
 return new;
end $$;

revoke all on function private.validate_roster_activation() from public,anon,authenticated;

create trigger roster_activation_validate before update of status on public.team_rosters for each row execute function private.validate_roster_activation();

create or replace function private.enforce_doubles_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare code text; total int;
begin select f.code into code from public.competitive_formats f where f.id=new.format_id;
 if new.level='leveling' then raise exception 'leveling cannot form competitive roster' using errcode='23514'; end if;
 if code='doubles' then select count(*) into total from public.team_rosters r where r.team_id=new.team_id and r.season_id=new.season_id and r.category_id=new.category_id and r.format_id=new.format_id and r.status<>'archived' and r.id<>new.id; if total>=5 then raise exception 'maximum five doubles per category and season' using errcode='23514'; end if; end if;
 return new; end $$;

revoke all on function private.enforce_doubles_limit() from public,anon,authenticated;

create trigger roster_doubles_limit before insert or update on public.team_rosters for each row execute function private.enforce_doubles_limit();

create or replace function private.manages_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_manager_assignments a where a.profile_id=(select auth.uid()) and a.team_id=target_team_id and a.status='active' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
 or exists(select 1 from public.access_assignments a where a.profile_id=(select auth.uid()) and a.team_id=target_team_id and a.role='team_manager' and a.status='active' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
$$;

revoke all on function private.manages_team(uuid) from public,anon;

grant execute on function private.manages_team(uuid) to authenticated;

do $$ declare n text; begin foreach n in array array['team_manager_assignments','team_pole_assignments','athlete_public_profiles'] loop execute format('alter table public.%I enable row level security',n); execute format('alter table public.%I force row level security',n); end loop; end $$;

create policy team_managers_select on public.team_manager_assignments for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or profile_id=(select auth.uid()) or (select private.manages_team(team_id)));

create policy team_managers_admin_all on public.team_manager_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy team_poles_select on public.team_pole_assignments for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(team_id)) or (select private.team_is_in_managed_pole(team_id)) or (select private.is_active_team_member(team_id)));

create policy team_poles_admin_all on public.team_pole_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));

create policy athlete_directory_select on public.athlete_public_profiles for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or athlete_id=(select private.current_athlete_id()) or exists(select 1 from public.team_memberships m where m.athlete_id=athlete_public_profiles.athlete_id and m.status='active' and ((select private.manages_team(m.team_id)) or (select private.team_is_in_managed_pole(m.team_id)))));

create policy memberships_team_manager_insert on public.team_memberships for insert to authenticated with check ((select private.manages_team(team_id)) and created_by=(select auth.uid()));

create policy memberships_team_manager_update on public.team_memberships for update to authenticated using ((select private.manages_team(team_id))) with check ((select private.manages_team(team_id)));

create policy rosters_team_manager_insert on public.team_rosters for insert to authenticated with check ((select private.manages_team(team_id)));

create policy rosters_team_manager_update on public.team_rosters for update to authenticated using ((select private.manages_team(team_id))) with check ((select private.manages_team(team_id)));

create policy roster_members_team_manager_insert on public.team_roster_members for insert to authenticated with check (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id))));

create policy roster_members_team_manager_update on public.team_roster_members for update to authenticated using (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id)))) with check (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id))));

grant select,insert,update,delete on public.team_manager_assignments,public.team_pole_assignments to authenticated;

grant select on public.athlete_public_profiles to authenticated;

grant all on public.team_manager_assignments,public.team_pole_assignments,public.athlete_public_profiles to service_role;

create trigger team_managers_audit after insert or update or delete on public.team_manager_assignments for each row execute function private.capture_audit_log();

create trigger team_poles_audit after insert or update or delete on public.team_pole_assignments for each row execute function private.capture_audit_log();

create or replace function public.assign_team_pole(
  target_team_id uuid,
  target_pole_id uuid,
  target_season_id uuid,
  effective_at timestamptz
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare assignment_id uuid;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  update public.team_pole_assignments
     set ends_at = effective_at, status = 'inactive'
   where team_id = target_team_id and season_id = target_season_id and status = 'active';
  insert into public.team_pole_assignments(team_id,pole_id,season_id,starts_at,assigned_by)
  values(target_team_id,target_pole_id,target_season_id,effective_at,(select auth.uid()))
  returning id into assignment_id;
  update public.teams set primary_pole_id = target_pole_id where id = target_team_id;
  return assignment_id;
end $$;

revoke all on function public.assign_team_pole(uuid,uuid,uuid,timestamptz) from public,anon;

grant execute on function public.assign_team_pole(uuid,uuid,uuid,timestamptz) to authenticated;

create or replace function private.safe_team_folder(object_name text)
returns uuid language plpgsql immutable security invoker set search_path = '' as $$
declare folder text;
begin
  folder := (storage.foldername(object_name))[1];
  return folder::uuid;
exception when others then return null;
end $$;

revoke all on function private.safe_team_folder(text) from public,anon;

grant execute on function private.safe_team_folder(text) to authenticated;

create or replace function private.protect_team_manager_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.has_any_role(array['admin']::public.app_role[])) then return new; end if;
  if not (select private.manages_team(old.id)) then raise exception 'team access denied' using errcode='42501'; end if;
  if (to_jsonb(new) - array['logo_url','updated_at']) is distinct from (to_jsonb(old) - array['logo_url','updated_at']) then
    raise exception 'team manager may update logo only' using errcode='42501';
  end if;
  return new;
end $$;

revoke all on function private.protect_team_manager_update() from public,anon,authenticated;

create trigger teams_protect_manager_update before update on public.teams
for each row execute function private.protect_team_manager_update();

create policy teams_manager_logo_update on public.teams for update to authenticated
using ((select private.manages_team(id))) with check ((select private.manages_team(id)));

create policy team_logo_select on storage.objects for select to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name))) or (select private.team_is_in_managed_pole(private.safe_team_folder(name))) or (select private.is_active_team_member(private.safe_team_folder(name)))));

create policy team_logo_insert on storage.objects for insert to authenticated with check (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));

create policy team_logo_update on storage.objects for update to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name))))) with check (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));

create policy team_logo_delete on storage.objects for delete to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));

alter table public.seasons
  add column registration_starts_at timestamptz,
  add column registration_ends_at timestamptz,
  add column closed_at timestamptz,
  add constraint seasons_registration_period check (registration_starts_at is null or registration_ends_at > registration_starts_at);

create type public.cycle_status as enum ('planned','active','closing','closed');

create type public.leveling_process_status as enum ('pending','in_progress','ready_for_review','completed','cancelled');

create type public.assessment_type as enum ('leveling','periodic','promotion_review','relegation_review','development');

create type public.assessment_status as enum ('draft','submitted','validated','cancelled');

create type public.assessment_scope as enum ('overall','doubles','fours');

create type public.assessment_category as enum ('TECHNICAL','TACTICAL','COGNITIVE','BEHAVIORAL');

create type public.level_review_type as enum ('leveling','promotion','relegation','correction');

create type public.level_review_status as enum ('pending','approved','rejected','cancelled');

create table public.season_cycles (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_number smallint not null check(cycle_number between 1 and 3), name text not null check(char_length(trim(name)) between 2 and 80),
  starts_at timestamptz not null, ends_at timestamptz not null, status public.cycle_status not null default 'planned',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(season_id,cycle_number), constraint cycle_period check(ends_at>starts_at)
);

create table public.athlete_leveling_processes (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, status public.leveling_process_status not null default 'pending',
  started_at timestamptz not null default now(), completed_at timestamptz, required_observations smallint not null default 3 check(required_observations>=3),
  completed_observations smallint not null default 0 check(completed_observations>=0), final_level public.athlete_level,
  decision_reason text, decided_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(athlete_id,season_id)
);

create or replace function private.create_season_cycles() returns trigger language plpgsql security definer set search_path='' as $$
declare i int; cycle_start timestamptz; cycle_end timestamptz;
begin for i in 1..3 loop cycle_start:=new.starts_at+(new.ends_at-new.starts_at)*((i-1)::numeric/3); cycle_end:=new.starts_at+(new.ends_at-new.starts_at)*(i::numeric/3); insert into public.season_cycles(season_id,cycle_number,name,starts_at,ends_at) values(new.id,i,'Ciclo '||i,cycle_start,cycle_end) on conflict(season_id,cycle_number) do nothing; end loop; return new; end $$;

revoke all on function private.create_season_cycles() from public,anon,authenticated;

create trigger seasons_create_cycles after insert on public.seasons for each row execute function private.create_season_cycles();

create table public.assessment_criteria (
  id uuid primary key default gen_random_uuid(), code text not null unique check(code~'^[a-z][a-z0-9_]{1,63}$'),
  name text not null unique, category public.assessment_category not null, description text, sort_order smallint not null default 0,
  status public.entity_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.athlete_assessments (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, leveling_process_id uuid references public.athlete_leveling_processes(id) on delete restrict,
  assessment_type public.assessment_type not null, scope public.assessment_scope not null default 'overall', evaluator_user_id uuid not null references public.profiles(id) on delete restrict,
  context text not null check(char_length(trim(context)) between 2 and 500), notes text, athlete_feedback text,
  athlete_visible boolean not null default false, overall_score numeric(3,2) check(overall_score between 1 and 5),
  status public.assessment_status not null default 'draft', assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.athlete_assessment_scores (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.athlete_assessments(id) on delete cascade,
  criterion_id uuid not null references public.assessment_criteria(id) on delete restrict, score smallint not null check(score between 1 and 5),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(assessment_id,criterion_id)
);

create table public.assessment_weight_config (
  id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete restrict,
  technical_review_weight numeric(3,2) not null default .60, system_data_weight numeric(3,2) not null default .40,
  status text not null default 'partial' check(status in('partial','complete')), created_at timestamptz not null default now(),
  constraint weights_total check(technical_review_weight+system_data_weight=1)
);

create table public.level_change_reviews (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, current_level public.athlete_level not null,
  proposed_level public.athlete_level not null, review_type public.level_review_type not null, status public.level_review_status not null default 'pending',
  requested_by uuid not null references public.profiles(id) on delete restrict, reviewed_by uuid references public.profiles(id) on delete restrict,
  decision_reason text, evidence_summary text, created_at timestamptz not null default now(), reviewed_at timestamptz
);

create table public.athlete_level_protections (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, level public.athlete_level not null,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text not null check(char_length(trim(reason))>=10),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint protection_period check(ends_at>starts_at)
);

create or replace function public.transition_season(target_season_id uuid,target_status public.season_status)
returns public.seasons language plpgsql security invoker set search_path='' as $$
declare current_status public.season_status; result public.seasons;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 select status into current_status from public.seasons where id=target_season_id for update;
 if not ((current_status='draft' and target_status='registration') or (current_status='registration' and target_status='active') or
         (current_status='active' and target_status='closing') or (current_status='closing' and target_status='closed') or
         (current_status='closed' and target_status='archived')) then raise exception 'invalid season transition % -> %',current_status,target_status using errcode='23514'; end if;
 update public.seasons set status=target_status,closed_at=case when target_status='closed' then now() else closed_at end where id=target_season_id returning * into result; return result;
end $$;

revoke all on function public.transition_season(uuid,public.season_status) from public,anon;

grant execute on function public.transition_season(uuid,public.season_status) to authenticated;

create or replace function private.refresh_leveling_observations() returns trigger language plpgsql security definer set search_path='' as $$
declare process_id uuid; total int; required int;
begin process_id:=case when tg_op='DELETE' then old.leveling_process_id else new.leveling_process_id end; if process_id is null then if tg_op='DELETE' then return old; else return new; end if; end if;
 select count(*) into total from public.athlete_assessments where leveling_process_id=process_id and status in('submitted','validated');
 select required_observations into required from public.athlete_leveling_processes where id=process_id;
 update public.athlete_leveling_processes set completed_observations=total,status=case when total>=required then 'ready_for_review'::public.leveling_process_status when total>0 then 'in_progress'::public.leveling_process_status else 'pending'::public.leveling_process_status end where id=process_id and status not in('completed','cancelled'); if tg_op='DELETE' then return old; else return new; end if;
end $$;

revoke all on function private.refresh_leveling_observations() from public,anon,authenticated;

create trigger assessments_refresh_leveling after insert or update of status or delete on public.athlete_assessments for each row execute function private.refresh_leveling_observations();

create or replace function private.valid_level_change(current_level public.athlete_level,proposed_level public.athlete_level,kind public.level_review_type)
returns boolean language sql immutable security invoker set search_path='' as $$ select case when kind='correction' then true when kind='leveling' then current_level='leveling' and proposed_level in('n3','n2','n1') when kind='promotion' then (current_level='n3' and proposed_level='n2') or (current_level='n2' and proposed_level='n1') when kind='relegation' then (current_level='n1' and proposed_level='n2') or (current_level='n2' and proposed_level='n3') else false end $$;

create or replace function public.approve_level_change(target_review_id uuid,effective_at timestamptz,protection_ends_at timestamptz default null)
returns public.level_change_reviews language plpgsql security invoker set search_path='' as $$
declare review public.level_change_reviews; current_row public.athlete_levels; result public.level_change_reviews;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 select * into review from public.level_change_reviews where id=target_review_id and status='pending' for update;
 if not found then raise exception 'pending review not found' using errcode='23514'; end if;
 if review.review_type='correction' and coalesce(char_length(trim(review.decision_reason)),0)<10 then raise exception 'correction reason required' using errcode='23514'; end if;
 if not private.valid_level_change(review.current_level,review.proposed_level,review.review_type) then raise exception 'invalid level progression' using errcode='23514'; end if;
 select * into current_row from public.athlete_levels where athlete_id=review.athlete_id and season_id=review.season_id and status='active' for update;
 if current_row.level<>review.current_level then raise exception 'current level changed' using errcode='23514'; end if;
 if review.review_type='relegation' and exists(select 1 from public.athlete_level_protections where athlete_id=review.athlete_id and season_id=review.season_id and starts_at<=effective_at and ends_at>effective_at) then raise exception 'athlete level is protected' using errcode='23514'; end if;
 update public.athlete_levels set ends_at=effective_at,status='inactive' where id=current_row.id;
 insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by) values(review.athlete_id,review.season_id,review.proposed_level,effective_at,review.decision_reason,auth.uid());
 update public.level_change_reviews set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=review.id returning * into result;
 if protection_ends_at is not null and review.review_type='promotion' then insert into public.athlete_level_protections(athlete_id,season_id,level,starts_at,ends_at,reason,created_by) values(review.athlete_id,review.season_id,review.proposed_level,effective_at,protection_ends_at,'Proteção após promoção homologada',auth.uid()); end if;
 update public.athlete_leveling_processes set status='completed',completed_at=effective_at,final_level=review.proposed_level,decision_reason=review.decision_reason,decided_by=auth.uid() where athlete_id=review.athlete_id and season_id=review.season_id and review.review_type='leveling'; return result;
end $$;

revoke all on function public.approve_level_change(uuid,timestamptz,timestamptz) from public,anon;

grant execute on function public.approve_level_change(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.can_athlete_compete_at_level(target_athlete_id uuid,target_season_id uuid,target_level public.athlete_level)
returns boolean language sql stable security invoker set search_path='' as $$ select case l.level when 'leveling' then false when 'n3' then target_level in('n3','n2','n1') when 'n2' then target_level in('n2','n1') when 'n1' then target_level='n1' else false end from public.athlete_levels l where l.athlete_id=target_athlete_id and l.season_id=target_season_id and l.status='active' limit 1 $$;

grant execute on function public.can_athlete_compete_at_level(uuid,uuid,public.athlete_level) to authenticated;

create or replace function public.create_athlete_assessment(
 target_athlete_id uuid,target_season_id uuid,target_process_id uuid,target_type public.assessment_type,target_scope public.assessment_scope,
 assessment_context text,assessment_notes text,feedback text,is_athlete_visible boolean,scores jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare new_assessment_id uuid; item jsonb;
begin
 if not private.has_any_role(array['admin','operator']::public.app_role[]) then raise exception 'evaluator role required' using errcode='42501'; end if;
 insert into public.athlete_assessments(athlete_id,season_id,leveling_process_id,assessment_type,scope,evaluator_user_id,context,notes,athlete_feedback,athlete_visible,status)
 values(target_athlete_id,target_season_id,target_process_id,target_type,target_scope,auth.uid(),assessment_context,assessment_notes,feedback,is_athlete_visible,'submitted') returning id into new_assessment_id;
 for item in select value from jsonb_array_elements(scores) loop
  insert into public.athlete_assessment_scores(assessment_id,criterion_id,score,notes) values(new_assessment_id,(item->>'criterion_id')::uuid,(item->>'score')::smallint,item->>'notes');
 end loop;
 update public.athlete_assessments set overall_score=(select round(avg(score)::numeric,2) from public.athlete_assessment_scores where assessment_id=new_assessment_id) where id=new_assessment_id;
 return new_assessment_id;
end $$;

revoke all on function public.create_athlete_assessment(uuid,uuid,uuid,public.assessment_type,public.assessment_scope,text,text,text,boolean,jsonb) from public,anon;

grant execute on function public.create_athlete_assessment(uuid,uuid,uuid,public.assessment_type,public.assessment_scope,text,text,text,boolean,jsonb) to authenticated;

create or replace function public.assign_athlete_level(
  target_athlete_id uuid,target_season_id uuid,target_level public.athlete_level,effective_at timestamptz,assignment_reason text default null
) returns public.athlete_levels language plpgsql security invoker set search_path='' as $$
declare current_value public.athlete_level; review_id uuid; result public.athlete_levels;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 if coalesce(char_length(trim(assignment_reason)),0)<10 then raise exception 'auditable reason required' using errcode='23514'; end if;
 select level into current_value from public.athlete_levels where athlete_id=target_athlete_id and season_id=target_season_id and status='active' order by starts_at desc limit 1;
 if current_value is null then
  insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by) values(target_athlete_id,target_season_id,'leveling',effective_at-interval '1 millisecond','Entrada padrão em nivelamento',auth.uid()); current_value:='leveling';
 end if;
 insert into public.level_change_reviews(athlete_id,season_id,current_level,proposed_level,review_type,requested_by,decision_reason,evidence_summary)
 values(target_athlete_id,target_season_id,current_value,target_level,'correction',auth.uid(),assignment_reason,'Compatibilidade administrativa migrada') returning id into review_id;
 perform public.approve_level_change(review_id,effective_at,null);
 select * into result from public.athlete_levels where athlete_id=target_athlete_id and season_id=target_season_id and status='active'; return result;
end $$;

do $$ declare n text; begin foreach n in array array['season_cycles','athlete_leveling_processes','assessment_criteria','athlete_assessments','athlete_assessment_scores','assessment_weight_config','level_change_reviews','athlete_level_protections'] loop execute format('alter table public.%I enable row level security',n); execute format('alter table public.%I force row level security',n); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',n,n); end loop; end $$;

create policy sprint5_admin_cycles on public.season_cycles for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

create policy sprint5_admin_leveling on public.athlete_leveling_processes for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

create policy sprint5_leveling_read on public.athlete_leveling_processes for select to authenticated using(athlete_id=private.current_athlete_id() or private.has_any_role(array['operator']::public.app_role[]) or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_leveling_processes.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));

create policy sprint5_criteria_read on public.assessment_criteria for select to authenticated using(true);

create policy sprint5_criteria_admin on public.assessment_criteria for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

create policy sprint5_assessment_read on public.athlete_assessments for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or (athlete_visible and athlete_id=private.current_athlete_id()) or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_assessments.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));

create policy sprint5_assessment_write on public.athlete_assessments for all to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[])) with check(private.has_any_role(array['admin','operator']::public.app_role[]) and evaluator_user_id=auth.uid());

create policy sprint5_scores_read on public.athlete_assessment_scores for select to authenticated using(exists(select 1 from public.athlete_assessments a where a.id=assessment_id));

create policy sprint5_scores_write on public.athlete_assessment_scores for all to authenticated using(exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft')) with check(exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'));

create policy sprint5_weights_read on public.assessment_weight_config for select to authenticated using(true);

create policy sprint5_weights_admin on public.assessment_weight_config for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

create policy sprint5_reviews_read on public.level_change_reviews for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or athlete_id=private.current_athlete_id() or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=level_change_reviews.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));

create policy sprint5_reviews_admin on public.level_change_reviews for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

create policy sprint5_protections_read on public.athlete_level_protections for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or athlete_id=private.current_athlete_id() or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_level_protections.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));

create policy sprint5_protections_admin on public.athlete_level_protections for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));

grant select,insert,update,delete on public.season_cycles,public.athlete_leveling_processes,public.assessment_criteria,public.athlete_assessments,public.athlete_assessment_scores,public.assessment_weight_config,public.level_change_reviews,public.athlete_level_protections to authenticated;

grant all on public.season_cycles,public.athlete_leveling_processes,public.assessment_criteria,public.athlete_assessments,public.athlete_assessment_scores,public.assessment_weight_config,public.level_change_reviews,public.athlete_level_protections to service_role;

create or replace function public.create_athlete_assessment(
 target_athlete_id uuid,target_season_id uuid,target_process_id uuid,target_type public.assessment_type,target_scope public.assessment_scope,
 assessment_context text,assessment_notes text,feedback text,is_athlete_visible boolean,scores jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare new_assessment_id uuid; item jsonb;
begin
 if not private.has_any_role(array['admin','operator']::public.app_role[]) then raise exception 'evaluator role required' using errcode='42501'; end if;
 insert into public.athlete_assessments(athlete_id,season_id,leveling_process_id,assessment_type,scope,evaluator_user_id,context,notes,athlete_feedback,athlete_visible,status)
 values(target_athlete_id,target_season_id,target_process_id,target_type,target_scope,auth.uid(),assessment_context,assessment_notes,feedback,is_athlete_visible,'draft') returning id into new_assessment_id;
 for item in select value from jsonb_array_elements(scores) loop
  insert into public.athlete_assessment_scores(assessment_id,criterion_id,score,notes) values(new_assessment_id,(item->>'criterion_id')::uuid,(item->>'score')::smallint,item->>'notes');
 end loop;
 update public.athlete_assessments set overall_score=(select round(avg(score)::numeric,2) from public.athlete_assessment_scores where assessment_id=new_assessment_id),status='submitted' where id=new_assessment_id;
 return new_assessment_id;
end $$;

drop policy sprint5_scores_write on public.athlete_assessment_scores;

create policy sprint5_scores_write on public.athlete_assessment_scores for all to authenticated
using(private.has_any_role(array['admin']::public.app_role[]) or exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'))
with check(private.has_any_role(array['admin']::public.app_role[]) or exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'));

create type public.ur_play_session_status as enum ('draft','published','registration_open','registration_closed','checkin_open','in_progress','completed','cancelled');

create type public.ur_play_registration_status as enum ('pending','confirmed','waitlisted','cancelled','rejected');

create type public.ur_play_registration_source as enum ('athlete','admin','team_manager','operator','import');

create type public.ur_play_attendance_status as enum ('unknown','expected','checked_in','present','absent','no_show','excused');

create type public.ur_play_payment_status as enum ('not_required','pending','paid','waived','refunded');

create type public.ur_play_payment_method as enum ('pix','cash','external','complimentary');

create type public.ur_play_staff_role as enum ('coordinator','operator','evaluator','media');

create type public.ur_play_checkin_method as enum ('admin','operator','athlete_qr_future','manual');

create table public.ur_play_sessions(
 id uuid primary key default gen_random_uuid(),season_id uuid not null references public.seasons(id) on delete restrict,season_cycle_id uuid references public.season_cycles(id) on delete restrict,
 pole_id uuid not null references public.poles(id) on delete restrict,venue_id uuid not null references public.venues(id) on delete restrict,
 name text not null check(char_length(trim(name)) between 2 and 120),session_date date not null,starts_at timestamptz not null,ends_at timestamptz not null,
 registration_opens_at timestamptz,registration_closes_at timestamptz,checkin_opens_at timestamptz,checkin_closes_at timestamptz,
 capacity smallint not null check(capacity between 2 and 200),waitlist_capacity smallint check(waitlist_capacity is null or waitlist_capacity>=0),
 price_amount numeric(10,2) check(price_amount is null or price_amount>=0),status public.ur_play_session_status not null default 'draft',
 notes text,ready_for_matchmaking boolean not null default false,created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),cancelled_at timestamptz,cancellation_reason text,
 constraint ur_play_session_period check(ends_at>starts_at),constraint ur_play_registration_window check(registration_opens_at is null or registration_closes_at>registration_opens_at),
 constraint ur_play_checkin_window check(checkin_opens_at is null or checkin_closes_at>checkin_opens_at)
);

create table public.ur_play_session_courts(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,court_id uuid not null references public.courts(id) on delete restrict,position smallint not null default 1 check(position>0),status public.entity_status not null default 'active',created_at timestamptz not null default now(),unique(session_id,court_id),unique(session_id,position));

create table public.ur_play_session_scopes(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,format_id uuid references public.competitive_formats(id) on delete restrict,category_id uuid references public.competitive_categories(id) on delete restrict,level public.athlete_level,created_at timestamptz not null default now(),unique nulls not distinct(session_id,format_id,category_id,level));

create table public.ur_play_registrations(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,athlete_id uuid not null references public.athletes(id) on delete restrict,
 registration_status public.ur_play_registration_status not null,source public.ur_play_registration_source not null,registered_at timestamptz not null default now(),confirmed_at timestamptz,cancelled_at timestamptz,cancellation_reason text,waitlist_position integer,
 attendance_status public.ur_play_attendance_status not null default 'unknown',notes text,created_by uuid references public.profiles(id) on delete restrict,
 snapshot_team_id uuid references public.teams(id) on delete restrict,snapshot_team_pole_id uuid references public.poles(id) on delete restrict,snapshot_level public.athlete_level,
 payment_status public.ur_play_payment_status not null default 'not_required',payment_amount numeric(10,2) check(payment_amount is null or payment_amount>=0),payment_method public.ur_play_payment_method,payment_reference text,
 client_operation_id uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(client_operation_id)
);

create unique index ur_play_one_active_registration on public.ur_play_registrations(session_id,athlete_id) where registration_status in('pending','confirmed','waitlisted');

create unique index ur_play_waitlist_position on public.ur_play_registrations(session_id,waitlist_position) where registration_status='waitlisted';

create table public.ur_play_checkins(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,athlete_id uuid not null references public.athletes(id) on delete restrict,registration_id uuid not null unique references public.ur_play_registrations(id) on delete restrict,checked_in_at timestamptz not null default now(),method public.ur_play_checkin_method not null,checked_in_by uuid not null references public.profiles(id) on delete restrict,status public.temporal_status not null default 'active',metadata jsonb not null default '{}'::jsonb,client_operation_id uuid not null default gen_random_uuid() unique,created_at timestamptz not null default now());

create table public.ur_play_session_staff(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,profile_id uuid not null references public.profiles(id) on delete restrict,role public.ur_play_staff_role not null,starts_at timestamptz not null default now(),ends_at timestamptz,status public.temporal_status not null default 'active',created_at timestamptz not null default now(),unique(session_id,profile_id,role),constraint staff_period check(ends_at is null or ends_at>starts_at));

create table public.ur_play_notification_events(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,registration_id uuid references public.ur_play_registrations(id) on delete restrict,event_type text not null,payload jsonb not null default '{}'::jsonb,status text not null default 'pending',created_at timestamptz not null default now());

create or replace function private.operates_ur_play_session(target_session uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.has_any_role(array['admin']::public.app_role[]) or exists(select 1 from public.ur_play_session_staff s where s.session_id=target_session and s.profile_id=auth.uid() and s.role in('coordinator','operator') and s.status='active' and s.starts_at<=now() and(s.ends_at is null or s.ends_at>now())) $$;

revoke all on function private.operates_ur_play_session(uuid) from public,anon;

grant execute on function private.operates_ur_play_session(uuid) to authenticated;

create or replace function private.validate_ur_play_court() returns trigger language plpgsql security definer set search_path='' as $$ begin if not exists(select 1 from public.ur_play_sessions s join public.courts c on c.id=new.court_id join public.venues v on v.id=c.venue_id where s.id=new.session_id and v.id=s.venue_id) then raise exception 'court does not belong to session venue' using errcode='23514';end if;return new;end $$;

revoke all on function private.validate_ur_play_court() from public,anon,authenticated;

create trigger ur_play_court_validate before insert or update on public.ur_play_session_courts for each row execute function private.validate_ur_play_court();

create or replace function private.transition_ur_play_session(target_session_id uuid,target_status public.ur_play_session_status,cancel_reason text default null) returns public.ur_play_sessions language plpgsql security definer set search_path='' as $$ declare old_status public.ur_play_session_status;result public.ur_play_sessions;begin if not private.operates_ur_play_session(target_session_id) then raise exception 'session operation denied' using errcode='42501';end if;select status into old_status from public.ur_play_sessions where id=target_session_id for update;if target_status='cancelled' then if not private.has_any_role(array['admin']::public.app_role[]) or coalesce(char_length(trim(cancel_reason)),0)<10 then raise exception 'admin cancellation reason required' using errcode='23514';end if;elsif not((old_status='draft' and target_status='published')or(old_status='published' and target_status='registration_open')or(old_status='registration_open' and target_status='registration_closed')or(old_status='registration_closed' and target_status='checkin_open')or(old_status='checkin_open' and target_status='in_progress')or(old_status='in_progress' and target_status='completed'))then raise exception 'invalid session transition' using errcode='23514';end if;update public.ur_play_sessions set status=target_status,cancelled_at=case when target_status='cancelled' then now() else cancelled_at end,cancellation_reason=case when target_status='cancelled' then cancel_reason else cancellation_reason end,ready_for_matchmaking=target_status='in_progress' where id=target_session_id returning * into result;return result;end $$;

revoke all on function private.transition_ur_play_session(uuid,public.ur_play_session_status,text) from public,anon;

grant execute on function private.transition_ur_play_session(uuid,public.ur_play_session_status,text) to authenticated;

create or replace function public.transition_ur_play_session(target_session_id uuid,target_status public.ur_play_session_status,cancel_reason text default null) returns public.ur_play_sessions language sql security invoker set search_path='' as $$select private.transition_ur_play_session(target_session_id,target_status,cancel_reason)$$;

revoke all on function public.transition_ur_play_session(uuid,public.ur_play_session_status,text) from public,anon;

grant execute on function public.transition_ur_play_session(uuid,public.ur_play_session_status,text) to authenticated;

create or replace function private.register_ur_play(target_session uuid,target_athlete uuid,target_source public.ur_play_registration_source,operation_id uuid,actor uuid) returns public.ur_play_registrations language plpgsql security definer set search_path='' as $$
declare s public.ur_play_sessions;a public.athletes;l public.athlete_level;confirmed_count int;wait_count int;team_snapshot uuid;pole_snapshot uuid;result public.ur_play_registrations;
begin select * into result from public.ur_play_registrations where client_operation_id=operation_id;if found then return result;end if;select * into s from public.ur_play_sessions where id=target_session for update;if s.status<>'registration_open' or(s.registration_opens_at is not null and now()<s.registration_opens_at)or(s.registration_closes_at is not null and now()>=s.registration_closes_at)then raise exception 'registration window closed' using errcode='23514';end if;select * into a from public.athletes where id=target_athlete and status='active';if not found then raise exception 'athlete inactive' using errcode='23514';end if;if target_source='athlete' and target_athlete<>private.current_athlete_id() then raise exception 'athlete mismatch' using errcode='42501';end if;if target_source<>'athlete' and not private.operates_ur_play_session(target_session) then raise exception 'operation denied' using errcode='42501';end if;select level into l from public.athlete_levels where athlete_id=target_athlete and season_id=s.season_id and status='active' order by starts_at desc limit 1;if exists(select 1 from public.ur_play_session_scopes sc join public.competitive_categories cat on cat.id=sc.category_id where sc.session_id=s.id) and not exists(select 1 from public.ur_play_session_scopes sc left join public.competitive_categories cat on cat.id=sc.category_id where sc.session_id=s.id and(sc.level is null or sc.level=l)and(cat.id is null or cat.code='mixed' or cat.code=a.gender::text))then raise exception 'athlete outside session scope' using errcode='23514';end if;if exists(select 1 from public.ur_play_session_scopes where session_id=s.id and level is not null)and not exists(select 1 from public.ur_play_session_scopes where session_id=s.id and(level is null or level=l))then raise exception 'athlete level outside session scope' using errcode='23514';end if;select m.team_id into team_snapshot from public.team_memberships m where m.athlete_id=target_athlete and m.season_id=s.season_id and m.status='active' and m.starts_at<=s.starts_at and(m.ends_at is null or m.ends_at>s.starts_at)order by m.starts_at desc limit 1;if team_snapshot is not null then select coalesce((select p.pole_id from public.team_pole_assignments p where p.team_id=team_snapshot and p.season_id=s.season_id and p.status='active' and p.starts_at<=s.starts_at and(p.ends_at is null or p.ends_at>s.starts_at)order by p.starts_at desc limit 1),(select primary_pole_id from public.teams where id=team_snapshot))into pole_snapshot;end if;select count(*) into confirmed_count from public.ur_play_registrations where session_id=s.id and registration_status='confirmed';select count(*) into wait_count from public.ur_play_registrations where session_id=s.id and registration_status='waitlisted';if confirmed_count<s.capacity then insert into public.ur_play_registrations(session_id,athlete_id,registration_status,source,confirmed_at,attendance_status,created_by,snapshot_team_id,snapshot_team_pole_id,snapshot_level,payment_status,payment_amount,client_operation_id)values(s.id,target_athlete,'confirmed',target_source,now(),'expected',actor,team_snapshot,pole_snapshot,l,case when s.price_amount is null or s.price_amount=0 then 'not_required'::public.ur_play_payment_status else 'pending'::public.ur_play_payment_status end,s.price_amount,operation_id)returning * into result;else if s.waitlist_capacity is not null and wait_count>=s.waitlist_capacity then raise exception 'waitlist full' using errcode='23514';end if;insert into public.ur_play_registrations(session_id,athlete_id,registration_status,source,waitlist_position,created_by,snapshot_team_id,snapshot_team_pole_id,snapshot_level,payment_status,payment_amount,client_operation_id)values(s.id,target_athlete,'waitlisted',target_source,wait_count+1,actor,team_snapshot,pole_snapshot,l,case when s.price_amount is null or s.price_amount=0 then 'not_required'::public.ur_play_payment_status else 'pending'::public.ur_play_payment_status end,s.price_amount,operation_id)returning * into result;end if;return result;end $$;

revoke all on function private.register_ur_play(uuid,uuid,public.ur_play_registration_source,uuid,uuid) from public,anon;

grant execute on function private.register_ur_play(uuid,uuid,public.ur_play_registration_source,uuid,uuid) to authenticated;

create or replace function public.register_ur_play(target_session uuid,target_athlete uuid,target_source public.ur_play_registration_source,operation_id uuid) returns public.ur_play_registrations language sql security invoker set search_path='' as $$select private.register_ur_play(target_session,target_athlete,target_source,operation_id,auth.uid())$$;

revoke all on function public.register_ur_play(uuid,uuid,public.ur_play_registration_source,uuid) from public,anon;

grant execute on function public.register_ur_play(uuid,uuid,public.ur_play_registration_source,uuid) to authenticated;

create or replace function private.cancel_ur_play_registration(target_registration uuid,reason text,operation_id uuid) returns public.ur_play_registrations language plpgsql security definer set search_path='' as $$declare r public.ur_play_registrations;promoted public.ur_play_registrations;result public.ur_play_registrations;begin select * into r from public.ur_play_registrations where id=target_registration for update;if not(private.operates_ur_play_session(r.session_id)or r.athlete_id=private.current_athlete_id())then raise exception 'cancellation denied' using errcode='42501';end if;if r.registration_status='cancelled' then return r;end if;perform 1 from public.ur_play_sessions where id=r.session_id for update;update public.ur_play_registrations set registration_status='cancelled',cancelled_at=now(),cancellation_reason=reason,waitlist_position=null where id=r.id returning * into result;if r.registration_status='confirmed' then select * into promoted from public.ur_play_registrations where session_id=r.session_id and registration_status='waitlisted' order by waitlist_position,registered_at for update skip locked limit 1;if found then update public.ur_play_registrations set registration_status='confirmed',confirmed_at=now(),waitlist_position=null,attendance_status='expected' where id=promoted.id;insert into public.ur_play_notification_events(session_id,registration_id,event_type,payload)values(r.session_id,promoted.id,'waitlist_promoted',jsonb_build_object('operation_id',operation_id));end if;update public.ur_play_registrations set waitlist_position=x.position from(select id,row_number()over(order by waitlist_position,registered_at)::int position from public.ur_play_registrations where session_id=r.session_id and registration_status='waitlisted')x where ur_play_registrations.id=x.id;end if;return result;end $$;

revoke all on function private.cancel_ur_play_registration(uuid,text,uuid) from public,anon;

grant execute on function private.cancel_ur_play_registration(uuid,text,uuid) to authenticated;

create or replace function public.cancel_ur_play_registration(target_registration uuid,reason text,operation_id uuid)returns public.ur_play_registrations language sql security invoker set search_path='' as $$select private.cancel_ur_play_registration(target_registration,reason,operation_id)$$;

revoke all on function public.cancel_ur_play_registration(uuid,text,uuid) from public,anon;

grant execute on function public.cancel_ur_play_registration(uuid,text,uuid) to authenticated;

create or replace function private.checkin_ur_play(target_registration uuid,checkin_method public.ur_play_checkin_method,operation_id uuid)returns public.ur_play_checkins language plpgsql security definer set search_path='' as $$declare r public.ur_play_registrations;result public.ur_play_checkins;begin select * into r from public.ur_play_registrations where id=target_registration for update;if not private.operates_ur_play_session(r.session_id)then raise exception 'checkin denied' using errcode='42501';end if;if r.registration_status<>'confirmed' then raise exception 'confirmed registration required' using errcode='23514';end if;select * into result from public.ur_play_checkins where registration_id=r.id and status='active';if found then return result;end if;insert into public.ur_play_checkins(session_id,athlete_id,registration_id,method,checked_in_by,client_operation_id)values(r.session_id,r.athlete_id,r.id,checkin_method,auth.uid(),operation_id)on conflict(registration_id)do update set status='active',checked_in_at=now(),method=excluded.method,checked_in_by=excluded.checked_in_by returning * into result;update public.ur_play_registrations set attendance_status='checked_in' where id=r.id;return result;end $$;

revoke all on function private.checkin_ur_play(uuid,public.ur_play_checkin_method,uuid) from public,anon;

grant execute on function private.checkin_ur_play(uuid,public.ur_play_checkin_method,uuid) to authenticated;

create or replace function public.checkin_ur_play(target_registration uuid,checkin_method public.ur_play_checkin_method,operation_id uuid)returns public.ur_play_checkins language sql security invoker set search_path='' as $$select private.checkin_ur_play(target_registration,checkin_method,operation_id)$$;

revoke all on function public.checkin_ur_play(uuid,public.ur_play_checkin_method,uuid) from public,anon;

grant execute on function public.checkin_ur_play(uuid,public.ur_play_checkin_method,uuid) to authenticated;

create or replace function private.set_ur_play_attendance(target_registration uuid,target_status public.ur_play_attendance_status)returns void language plpgsql security definer set search_path='' as $$declare sid uuid;begin select session_id into sid from public.ur_play_registrations where id=target_registration;if not private.operates_ur_play_session(sid)then raise exception 'attendance denied' using errcode='42501';end if;update public.ur_play_registrations set attendance_status=target_status where id=target_registration;if target_status<>'checked_in' then update public.ur_play_checkins set status='inactive' where registration_id=target_registration and status='active';end if;end$$;

revoke all on function private.set_ur_play_attendance(uuid,public.ur_play_attendance_status) from public,anon;

grant execute on function private.set_ur_play_attendance(uuid,public.ur_play_attendance_status) to authenticated;

create or replace function public.set_ur_play_attendance(target_registration uuid,target_status public.ur_play_attendance_status)returns void language sql security invoker set search_path='' as $$select private.set_ur_play_attendance(target_registration,target_status)$$;

revoke all on function public.set_ur_play_attendance(uuid,public.ur_play_attendance_status) from public,anon;

grant execute on function public.set_ur_play_attendance(uuid,public.ur_play_attendance_status) to authenticated;

create or replace function private.set_ur_play_payment(target_registration uuid,target_status public.ur_play_payment_status,target_method public.ur_play_payment_method,target_reference text default null)returns void language plpgsql security definer set search_path='' as $$declare sid uuid;begin select session_id into sid from public.ur_play_registrations where id=target_registration;if not private.operates_ur_play_session(sid)then raise exception 'payment denied' using errcode='42501';end if;update public.ur_play_registrations set payment_status=target_status,payment_method=target_method,payment_reference=target_reference where id=target_registration;end$$;

revoke all on function private.set_ur_play_payment(uuid,public.ur_play_payment_status,public.ur_play_payment_method,text) from public,anon;

grant execute on function private.set_ur_play_payment(uuid,public.ur_play_payment_status,public.ur_play_payment_method,text) to authenticated;

create or replace function public.set_ur_play_payment(target_registration uuid,target_status public.ur_play_payment_status,target_method public.ur_play_payment_method,target_reference text default null)returns void language sql security invoker set search_path='' as $$select private.set_ur_play_payment(target_registration,target_status,target_method,target_reference)$$;

revoke all on function public.set_ur_play_payment(uuid,public.ur_play_payment_status,public.ur_play_payment_method,text) from public,anon;

grant execute on function public.set_ur_play_payment(uuid,public.ur_play_payment_status,public.ur_play_payment_method,text) to authenticated;

create or replace function public.walkin_ur_play(target_session uuid,target_athlete uuid,operation_id uuid) returns public.ur_play_registrations language plpgsql security invoker set search_path='' as $$declare r public.ur_play_registrations;begin r:=private.register_ur_play(target_session,target_athlete,'operator',operation_id,auth.uid());if r.registration_status<>'confirmed' then raise exception 'walk-in requires available capacity' using errcode='23514';end if;perform private.checkin_ur_play(r.id,'operator',operation_id);return r;end$$;

revoke all on function public.walkin_ur_play(uuid,uuid,uuid) from public,anon;

grant execute on function public.walkin_ur_play(uuid,uuid,uuid) to authenticated;

do $$declare n text;begin foreach n in array array['ur_play_sessions','ur_play_session_courts','ur_play_session_scopes','ur_play_registrations','ur_play_checkins','ur_play_session_staff','ur_play_notification_events']loop execute format('alter table public.%I enable row level security',n);execute format('alter table public.%I force row level security',n);execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',n,n);end loop;end$$;

create policy ur_sessions_read on public.ur_play_sessions for select to authenticated using(private.has_any_role(array['admin']::public.app_role[])or private.operates_ur_play_session(id)or private.manages_pole(pole_id)or(private.has_any_role(array['athlete','team_manager']::public.app_role[])and status<>'draft'));

create policy ur_sessions_admin on public.ur_play_sessions for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_courts_read on public.ur_play_session_courts for select to authenticated using(exists(select 1 from public.ur_play_sessions s where s.id=session_id));

create policy ur_courts_admin on public.ur_play_session_courts for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_scopes_read on public.ur_play_session_scopes for select to authenticated using(exists(select 1 from public.ur_play_sessions s where s.id=session_id));

create policy ur_scopes_admin on public.ur_play_session_scopes for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_registrations_read on public.ur_play_registrations for select to authenticated using(private.operates_ur_play_session(session_id)or athlete_id=private.current_athlete_id()or exists(select 1 from public.team_memberships m where m.athlete_id=ur_play_registrations.athlete_id and m.status='active' and private.manages_team(m.team_id)));

create policy ur_registrations_admin on public.ur_play_registrations for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_checkins_read on public.ur_play_checkins for select to authenticated using(private.operates_ur_play_session(session_id)or athlete_id=private.current_athlete_id());

create policy ur_checkins_admin on public.ur_play_checkins for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_staff_read on public.ur_play_session_staff for select to authenticated using(private.has_any_role(array['admin']::public.app_role[])or profile_id=auth.uid());

create policy ur_staff_admin on public.ur_play_session_staff for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

create policy ur_events_admin on public.ur_play_notification_events for all to authenticated using(private.has_any_role(array['admin']::public.app_role[]))with check(private.has_any_role(array['admin']::public.app_role[]));

grant select,insert,update,delete on public.ur_play_sessions,public.ur_play_session_courts,public.ur_play_session_scopes,public.ur_play_registrations,public.ur_play_checkins,public.ur_play_session_staff,public.ur_play_notification_events to authenticated;

grant all on public.ur_play_sessions,public.ur_play_session_courts,public.ur_play_session_scopes,public.ur_play_registrations,public.ur_play_checkins,public.ur_play_session_staff,public.ur_play_notification_events to service_role;

create type public.match_status as enum ('draft','queued','called','ready','in_progress','completed','cancelled','abandoned');

create type public.match_side_code as enum ('A','B');

create type public.match_participation_role as enum ('starter','substitute');

create type public.match_participant_status as enum ('active','removed');

create type public.match_queue_status as enum ('waiting','assigned','playing','resting','unavailable','finished');

alter table public.ur_play_sessions add column min_rest_minutes smallint check(min_rest_minutes is null or min_rest_minutes between 0 and 240);

create table public.matches(
 id uuid primary key default gen_random_uuid(),match_code text not null unique,session_id uuid not null references public.ur_play_sessions(id) on delete restrict,court_id uuid not null references public.courts(id) on delete restrict,format_id uuid not null references public.competitive_formats(id) on delete restrict,category_id uuid references public.competitive_categories(id) on delete restrict,level public.athlete_level not null,status public.match_status not null default 'draft',scheduled_order integer check(scheduled_order is null or scheduled_order>0),queue_entered_at timestamptz,called_at timestamptz,ready_at timestamptz,started_at timestamptz,ended_at timestamptz,ready_for_scoring boolean not null default false,created_by uuid not null references public.profiles(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),cancelled_at timestamptz,cancellation_reason text,client_operation_id uuid unique
);

create unique index matches_active_court on public.matches(session_id,court_id) where status in('queued','called','ready','in_progress');

create index matches_session_status on public.matches(session_id,status,queue_entered_at);

create table public.match_sides(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete restrict,side public.match_side_code not null,label text,team_id uuid references public.teams(id) on delete restrict,roster_id uuid references public.team_rosters(id) on delete restrict,created_at timestamptz not null default now(),unique(match_id,side));

create table public.match_participants(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete restrict,side_id uuid not null references public.match_sides(id) on delete restrict,athlete_id uuid not null references public.athletes(id) on delete restrict,registration_id uuid not null references public.ur_play_registrations(id) on delete restrict,team_snapshot_id uuid references public.teams(id) on delete restrict,pole_snapshot_id uuid references public.poles(id) on delete restrict,level_snapshot public.athlete_level,participation_role public.match_participation_role not null default 'starter',position_order smallint not null check(position_order>0),status public.match_participant_status not null default 'active',created_at timestamptz not null default now(),unique(match_id,athlete_id),unique(side_id,position_order));

create index match_participants_athlete on public.match_participants(athlete_id,match_id) where status='active';

create index match_participants_registration on public.match_participants(registration_id);

create table public.match_queue_entries(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ur_play_sessions(id) on delete restrict,athlete_id uuid not null references public.athletes(id) on delete restrict,registration_id uuid not null unique references public.ur_play_registrations(id) on delete restrict,status public.match_queue_status not null default 'waiting',queued_at timestamptz not null default now(),priority_score numeric(12,4),last_match_ended_at timestamptz,current_match_id uuid references public.matches(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(session_id,athlete_id));

create index match_queue_order on public.match_queue_entries(session_id,status,queued_at);

create index match_queue_current on public.match_queue_entries(current_match_id) where current_match_id is not null;

create or replace function private.sync_match_queue_from_attendance()returns trigger language plpgsql security definer set search_path='' as $$begin if new.registration_status='confirmed' and new.attendance_status in('checked_in','present')then insert into public.match_queue_entries(session_id,athlete_id,registration_id,status,queued_at)values(new.session_id,new.athlete_id,new.id,'waiting',now())on conflict(registration_id)do update set status=case when match_queue_entries.current_match_id is null then 'waiting'::public.match_queue_status else match_queue_entries.status end,updated_at=now();elsif old.attendance_status in('checked_in','present')and new.attendance_status not in('checked_in','present')then update public.match_queue_entries set status=case when current_match_id is null then 'unavailable'::public.match_queue_status else status end,updated_at=now()where registration_id=new.id;end if;return new;end$$;

revoke all on function private.sync_match_queue_from_attendance()from public,anon,authenticated;

create trigger ur_play_registration_match_queue after insert or update of attendance_status,registration_status on public.ur_play_registrations for each row execute function private.sync_match_queue_from_attendance();

create or replace function private.can_read_match(target_match uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from public.matches m where m.id=target_match and(private.operates_ur_play_session(m.session_id)or exists(select 1 from public.match_participants p where p.match_id=m.id and p.athlete_id=private.current_athlete_id())or exists(select 1 from public.match_participants p join public.team_memberships tm on tm.athlete_id=p.athlete_id and tm.status='active'where p.match_id=m.id and private.manages_team(tm.team_id))))$$;

revoke all on function private.can_read_match(uuid)from public,anon;

grant execute on function private.can_read_match(uuid)to authenticated;

create or replace function private.freeze_match_participants()returns trigger language plpgsql security definer set search_path=''as $$declare s public.match_status;begin select status into s from public.matches where id=coalesce(new.match_id,old.match_id);if s in('in_progress','completed','abandoned')then raise exception 'match participants are frozen'using errcode='23514';end if;if tg_op='DELETE'then return old;end if;return new;end$$;

revoke all on function private.freeze_match_participants()from public,anon,authenticated;

create trigger match_participants_freeze before update or delete on public.match_participants for each row execute function private.freeze_match_participants();

create or replace function private.create_court_ops_match(target_session uuid,target_court uuid,target_format uuid,target_category uuid,target_level public.athlete_level,side_a uuid[],side_b uuid[],operation_id uuid,actor uuid)returns public.matches language plpgsql security definer set search_path=''as $$
declare s public.ur_play_sessions;fcode text;ccode text;required_count int;all_athletes uuid[];m public.matches;side_a_id uuid;side_b_id uuid;match_number int;invalid_count int;
begin select *into m from public.matches where client_operation_id=operation_id;if found then return m;end if;if not private.operates_ur_play_session(target_session)then raise exception 'match operation denied'using errcode='42501';end if;select *into s from public.ur_play_sessions where id=target_session for update;if s.status<>'in_progress'or not s.ready_for_matchmaking then raise exception 'session is not ready for matchmaking'using errcode='23514';end if;if not exists(select 1 from public.ur_play_session_courts where session_id=s.id and court_id=target_court and status='active')then raise exception 'court does not belong to active session courts'using errcode='23514';end if;select code into fcode from public.competitive_formats where id=target_format and status='active';required_count:=case fcode when'doubles'then 2 when'fours'then 4 else 0 end;if cardinality(side_a)<>required_count or cardinality(side_b)<>required_count then raise exception 'incomplete match side'using errcode='23514';end if;all_athletes:=side_a||side_b;if(select count(distinct x)from unnest(all_athletes)x)<>cardinality(all_athletes)then raise exception 'duplicate athlete'using errcode='23505';end if;select count(*)into invalid_count from unnest(all_athletes)x left join public.match_queue_entries q on q.session_id=s.id and q.athlete_id=x left join public.ur_play_registrations r on r.id=q.registration_id where q.id is null or q.status not in('waiting','resting')or q.current_match_id is not null or r.registration_status<>'confirmed'or r.attendance_status not in('checked_in','present')or(r.snapshot_level<>target_level and r.snapshot_level<>'leveling');if invalid_count>0 then raise exception 'ineligible match participant'using errcode='23514';end if;perform 1 from public.match_queue_entries where session_id=s.id and athlete_id=any(all_athletes)order by athlete_id for update;select code into ccode from public.competitive_categories where id=target_category;if ccode in('female','male')and exists(select 1 from unnest(all_athletes)x join public.athletes a on a.id=x where a.gender::text<>ccode)then raise exception 'invalid category gender'using errcode='23514';elsif ccode='mixed'then if exists(select 1 from(values(side_a),(side_b))v(side_ids)where(select count(*)from unnest(v.side_ids)x join public.athletes a on a.id=x where a.gender='female')<>required_count/2 or(select count(*)from unnest(v.side_ids)x join public.athletes a on a.id=x where a.gender='male')<>required_count/2)then raise exception 'invalid mixed composition'using errcode='23514';end if;end if;select count(*)+1 into match_number from public.matches where session_id=s.id;insert into public.matches(match_code,session_id,court_id,format_id,category_id,level,status,scheduled_order,queue_entered_at,created_by,client_operation_id)values('URP-'||to_char(s.session_date,'YYYYMMDD')||'-'||substr(replace(s.id::text,'-',''),1,4)||'-M'||lpad(match_number::text,2,'0'),s.id,target_court,target_format,target_category,target_level,'queued',match_number,now(),actor,operation_id)returning*into m;insert into public.match_sides(match_id,side)values(m.id,'A')returning id into side_a_id;insert into public.match_sides(match_id,side)values(m.id,'B')returning id into side_b_id;insert into public.match_participants(match_id,side_id,athlete_id,registration_id,team_snapshot_id,pole_snapshot_id,level_snapshot,position_order)select m.id,case when x.side='A'then side_a_id else side_b_id end,r.athlete_id,r.id,r.snapshot_team_id,r.snapshot_team_pole_id,r.snapshot_level,x.position from(select'A'::text side,a athlete_id,ord::smallint position from unnest(side_a)with ordinality u(a,ord)union all select'B',a,ord::smallint from unnest(side_b)with ordinality u(a,ord))x join public.ur_play_registrations r on r.session_id=s.id and r.athlete_id=x.athlete_id and r.registration_status='confirmed';update public.match_queue_entries set status='assigned',current_match_id=m.id,updated_at=now()where session_id=s.id and athlete_id=any(all_athletes);return m;end$$;

revoke all on function private.create_court_ops_match(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid,uuid)from public,anon;

grant execute on function private.create_court_ops_match(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid,uuid)to authenticated;

create or replace function public.create_court_ops_match(target_session uuid,target_court uuid,target_format uuid,target_category uuid,target_level public.athlete_level,side_a uuid[],side_b uuid[],operation_id uuid)returns public.matches language sql security invoker set search_path=''as $$select private.create_court_ops_match(target_session,target_court,target_format,target_category,target_level,side_a,side_b,operation_id,auth.uid())$$;

revoke all on function public.create_court_ops_match(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid)from public,anon;

grant execute on function public.create_court_ops_match(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid)to authenticated;

create or replace function private.transition_court_ops_match(target_match uuid,target_status public.match_status,reason text,operation_id uuid)returns public.matches language plpgsql security definer set search_path=''as $$declare m public.matches;expected int;actual int;begin select*into m from public.matches where id=target_match for update;if not private.operates_ur_play_session(m.session_id)then raise exception 'match operation denied'using errcode='42501';end if;if target_status='cancelled'and m.status in('draft','queued','called','ready')then null;elsif target_status='abandoned'and m.status='in_progress'then null;elsif not((m.status='queued'and target_status='called')or(m.status='called'and target_status='ready')or(m.status='ready'and target_status='in_progress'))then raise exception 'invalid match transition'using errcode='23514';end if;if target_status='in_progress'then select case f.code when'doubles'then 4 when'fours'then 8 else 0 end into expected from public.competitive_formats f where f.id=m.format_id;select count(*)into actual from public.match_participants where match_id=m.id and status='active';if actual<>expected then raise exception 'incomplete match roster'using errcode='23514';end if;if exists(select 1 from public.match_queue_entries q join public.match_participants p on p.athlete_id=q.athlete_id and p.match_id=m.id where q.current_match_id<>m.id or q.status<>'assigned')then raise exception 'participant unavailable at start'using errcode='23514';end if;update public.match_queue_entries q set status='playing',updated_at=now()from public.match_participants p where p.match_id=m.id and p.athlete_id=q.athlete_id;end if;update public.matches set status=target_status,called_at=case when target_status='called'then now()else called_at end,ready_at=case when target_status='ready'then now()else ready_at end,started_at=case when target_status='in_progress'then now()else started_at end,ready_for_scoring=target_status='in_progress',cancelled_at=case when target_status='cancelled'then now()else cancelled_at end,cancellation_reason=case when target_status in('cancelled','abandoned')then reason else cancellation_reason end,ended_at=case when target_status='abandoned'then now()else ended_at end where id=m.id returning*into m;if target_status in('cancelled','abandoned')then update public.match_queue_entries q set status=case when target_status='abandoned'then'resting'::public.match_queue_status else'waiting'::public.match_queue_status end,current_match_id=null,last_match_ended_at=case when target_status='abandoned'then now()else last_match_ended_at end,queued_at=now(),updated_at=now()from public.match_participants p where p.match_id=m.id and p.athlete_id=q.athlete_id;end if;return m;end$$;

revoke all on function private.transition_court_ops_match(uuid,public.match_status,text,uuid)from public,anon;

grant execute on function private.transition_court_ops_match(uuid,public.match_status,text,uuid)to authenticated;

create or replace function public.transition_court_ops_match(target_match uuid,target_status public.match_status,reason text default null,operation_id uuid default gen_random_uuid())returns public.matches language sql security invoker set search_path=''as $$select private.transition_court_ops_match(target_match,target_status,reason,operation_id)$$;

revoke all on function public.transition_court_ops_match(uuid,public.match_status,text,uuid)from public,anon;

grant execute on function public.transition_court_ops_match(uuid,public.match_status,text,uuid)to authenticated;

create or replace function public.set_match_queue_status(target_entry uuid,target_status public.match_queue_status)returns public.match_queue_entries language plpgsql security invoker set search_path=''as $$declare q public.match_queue_entries;begin select*into q from public.match_queue_entries where id=target_entry;if not private.operates_ur_play_session(q.session_id)then raise exception 'queue operation denied'using errcode='42501';end if;if q.current_match_id is not null and target_status in('waiting','unavailable','finished')then raise exception 'assigned participant cannot leave queue'using errcode='23514';end if;update public.match_queue_entries set status=target_status,queued_at=case when target_status='waiting'then now()else queued_at end,updated_at=now()where id=q.id returning*into q;return q;end$$;

revoke all on function public.set_match_queue_status(uuid,public.match_queue_status)from public,anon;

grant execute on function public.set_match_queue_status(uuid,public.match_queue_status)to authenticated;

create or replace function private.set_match_queue_status(target_entry uuid,target_status public.match_queue_status)returns public.match_queue_entries language plpgsql security definer set search_path=''as $$declare q public.match_queue_entries;begin select*into q from public.match_queue_entries where id=target_entry for update;if not private.operates_ur_play_session(q.session_id)then raise exception 'queue operation denied'using errcode='42501';end if;if q.current_match_id is not null and target_status in('waiting','unavailable','finished')then raise exception 'assigned participant cannot leave queue'using errcode='23514';end if;update public.match_queue_entries set status=target_status,queued_at=case when target_status='waiting'then now()else queued_at end,updated_at=now()where id=q.id returning*into q;return q;end$$;

revoke all on function private.set_match_queue_status(uuid,public.match_queue_status)from public,anon;

grant execute on function private.set_match_queue_status(uuid,public.match_queue_status)to authenticated;

create or replace function public.set_match_queue_status(target_entry uuid,target_status public.match_queue_status)returns public.match_queue_entries language sql security invoker set search_path=''as $$select private.set_match_queue_status(target_entry,target_status)$$;

create or replace function private.replace_match_participant(target_participant uuid,replacement_athlete uuid,operation_id uuid)returns public.match_participants language plpgsql security definer set search_path=''as $$declare p public.match_participants;m public.matches;old_gender public.gender_type;new_gender public.gender_type;r public.ur_play_registrations;result public.match_participants;begin select*into p from public.match_participants where id=target_participant for update;select*into m from public.matches where id=p.match_id for update;if not private.operates_ur_play_session(m.session_id)then raise exception 'match operation denied'using errcode='42501';end if;if m.status not in('draft','queued','called','ready')then raise exception 'match roster frozen'using errcode='23514';end if;select a.gender into old_gender from public.athletes a where a.id=p.athlete_id;select a.gender into new_gender from public.athletes a where a.id=replacement_athlete;if exists(select 1 from public.competitive_categories c where c.id=m.category_id and(c.code='mixed'and new_gender<>old_gender or c.code in('female','male')and c.code<>new_gender::text))then raise exception 'replacement violates category composition'using errcode='23514';end if;select r0.*into r from public.ur_play_registrations r0 join public.match_queue_entries q on q.registration_id=r0.id where r0.session_id=m.session_id and r0.athlete_id=replacement_athlete and r0.registration_status='confirmed'and r0.attendance_status in('checked_in','present')and q.status in('waiting','resting')and q.current_match_id is null for update of q;if not found or(r.snapshot_level<>m.level and r.snapshot_level<>'leveling')then raise exception 'replacement athlete ineligible'using errcode='23514';end if;update public.match_queue_entries set status='waiting',current_match_id=null,queued_at=now(),updated_at=now()where session_id=m.session_id and athlete_id=p.athlete_id;update public.match_queue_entries set status='assigned',current_match_id=m.id,updated_at=now()where registration_id=r.id;update public.match_participants set athlete_id=r.athlete_id,registration_id=r.id,team_snapshot_id=r.snapshot_team_id,pole_snapshot_id=r.snapshot_team_pole_id,level_snapshot=r.snapshot_level where id=p.id returning*into result;return result;end$$;

revoke all on function private.replace_match_participant(uuid,uuid,uuid)from public,anon;

grant execute on function private.replace_match_participant(uuid,uuid,uuid)to authenticated;

create or replace function public.replace_match_participant(target_participant uuid,replacement_athlete uuid,operation_id uuid)returns public.match_participants language sql security invoker set search_path=''as $$select private.replace_match_participant(target_participant,replacement_athlete,operation_id)$$;

revoke all on function public.replace_match_participant(uuid,uuid,uuid)from public,anon;

grant execute on function public.replace_match_participant(uuid,uuid,uuid)to authenticated;

do $$declare n text;begin foreach n in array array['matches','match_sides','match_participants','match_queue_entries']loop execute format('alter table public.%I enable row level security',n);execute format('alter table public.%I force row level security',n);execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',n,n);end loop;end$$;

create policy matches_read on public.matches for select to authenticated using(private.can_read_match(id));

create policy match_sides_read on public.match_sides for select to authenticated using(private.can_read_match(match_id));

create policy match_participants_read on public.match_participants for select to authenticated using(private.can_read_match(match_id));

create policy match_queue_read on public.match_queue_entries for select to authenticated using(private.operates_ur_play_session(session_id)or athlete_id=private.current_athlete_id()or exists(select 1 from public.team_memberships tm where tm.athlete_id=match_queue_entries.athlete_id and tm.status='active'and private.manages_team(tm.team_id)));

grant select on public.matches,public.match_sides,public.match_participants,public.match_queue_entries to authenticated;

grant all on public.matches,public.match_sides,public.match_participants,public.match_queue_entries to service_role;

create or replace function private.lock_match_participant_queue()returns trigger language plpgsql security definer set search_path=''as $$declare sid uuid;q public.match_queue_entries;begin select session_id into sid from public.matches where id=new.match_id;select*into q from public.match_queue_entries where session_id=sid and athlete_id=new.athlete_id for update;if not found or q.status not in('waiting','resting')or q.current_match_id is not null and q.current_match_id<>new.match_id then raise exception 'athlete already assigned to another match'using errcode='23514';end if;return new;end$$;

revoke all on function private.lock_match_participant_queue()from public,anon,authenticated;

create trigger match_participant_queue_lock before insert on public.match_participants for each row execute function private.lock_match_participant_queue();

create or replace function public.transition_court_ops_match(target_match uuid,target_status public.match_status,reason text default null,operation_id uuid default gen_random_uuid())returns public.matches language plpgsql security invoker set search_path=''as $$declare current_match public.matches;begin select*into current_match from public.matches where id=target_match;if current_match.status=target_status then return current_match;end if;return private.transition_court_ops_match(target_match,target_status,reason,operation_id);end$$;

revoke all on function public.transition_court_ops_match(uuid,public.match_status,text,uuid)from public,anon;

grant execute on function public.transition_court_ops_match(uuid,public.match_status,text,uuid)to authenticated;

create index match_participants_pole_snapshot on public.match_participants(pole_snapshot_id)where pole_snapshot_id is not null;

create index match_participants_team_snapshot on public.match_participants(team_snapshot_id)where team_snapshot_id is not null;

create index match_queue_athlete on public.match_queue_entries(athlete_id);

create index match_sides_roster on public.match_sides(roster_id)where roster_id is not null;

create index match_sides_team on public.match_sides(team_id)where team_id is not null;

create index matches_category on public.matches(category_id)where category_id is not null;

create index matches_court on public.matches(court_id);

create index matches_created_by on public.matches(created_by);

create index matches_format on public.matches(format_id);

create or replace function private.can_view_court_ops_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.operates_ur_play_session(target_session)
    or exists (
      select 1
      from public.ur_play_session_staff staff
      where staff.session_id = target_session
        and staff.profile_id = auth.uid()
        and staff.role in ('evaluator', 'media')
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

revoke all on function private.can_view_court_ops_session(uuid) from public, anon;

grant execute on function private.can_view_court_ops_session(uuid) to authenticated;

create or replace function private.can_read_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches match
    where match.id = target_match
      and (
        private.can_view_court_ops_session(match.session_id)
        or exists (
          select 1
          from public.match_participants participant
          where participant.match_id = match.id
            and participant.athlete_id = private.current_athlete_id()
        )
        or exists (
          select 1
          from public.match_participants participant
          join public.team_memberships membership
            on membership.athlete_id = participant.athlete_id
           and membership.status = 'active'
          where participant.match_id = match.id
            and private.manages_team(membership.team_id)
        )
      )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;

grant execute on function private.can_read_match(uuid) to authenticated;

drop policy ur_sessions_read on public.ur_play_sessions;

create policy ur_sessions_read
on public.ur_play_sessions
for select
to authenticated
using (
  private.can_view_court_ops_session(id)
  or private.manages_pole(pole_id)
  or (
    private.has_any_role(array['athlete', 'team_manager']::public.app_role[])
    and status <> 'draft'
  )
);

drop policy ur_registrations_read on public.ur_play_registrations;

create policy ur_registrations_read
on public.ur_play_registrations
for select
to authenticated
using (
  private.can_view_court_ops_session(session_id)
  or athlete_id = private.current_athlete_id()
  or exists (
    select 1
    from public.team_memberships membership
    where membership.athlete_id = ur_play_registrations.athlete_id
      and membership.status = 'active'
      and private.manages_team(membership.team_id)
  )
);

drop policy match_queue_read on public.match_queue_entries;

create policy match_queue_read
on public.match_queue_entries
for select
to authenticated
using (
  private.can_view_court_ops_session(session_id)
  or athlete_id = private.current_athlete_id()
  or exists (
    select 1
    from public.team_memberships membership
    where membership.athlete_id = match_queue_entries.athlete_id
      and membership.status = 'active'
      and private.manages_team(membership.team_id)
  )
);

create type public.match_squad_role as enum ('starter', 'reserve');

create type public.match_squad_status as enum ('called', 'confirmed', 'active', 'bench', 'withdrawn', 'unavailable');

create type public.reserve_presence_status as enum ('expected', 'present', 'absent', 'excused');

create type public.match_event_context as enum ('ur_play', 'pole_tournament', 'regional', 'legends');

alter table public.matches
  add column event_context public.match_event_context not null default 'ur_play';

create table public.match_squad_members (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  side_id uuid not null references public.match_sides(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  registration_id uuid not null references public.ur_play_registrations(id) on delete restrict,
  roster_id uuid references public.team_rosters(id) on delete restrict,
  initial_squad_role public.match_squad_role not null,
  squad_role public.match_squad_role not null,
  status public.match_squad_status not null,
  reserve_presence_status public.reserve_presence_status,
  position_order smallint not null,
  called_at timestamptz,
  confirmed_at timestamptz,
  activated_at timestamptz,
  benched_at timestamptz,
  withdrawn_at timestamptz,
  last_change_reason text check (last_change_reason is null or char_length(trim(last_change_reason)) between 5 and 500),
  last_operation_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_squad_role_position check (
    (squad_role = 'starter' and position_order between 1 and 4)
    or (squad_role = 'reserve' and position_order between 5 and 7)
  ),
  constraint match_squad_position_unique unique (side_id, position_order) deferrable initially immediate,
  unique (match_id, athlete_id)
);

create index match_squad_match_role on public.match_squad_members(match_id, squad_role, status);

create index match_squad_athlete on public.match_squad_members(athlete_id, match_id);

create index match_squad_registration on public.match_squad_members(registration_id);

create index match_squad_roster on public.match_squad_members(roster_id) where roster_id is not null;

create index match_squad_created_by on public.match_squad_members(created_by);

create table public.match_court_changes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  from_court_id uuid not null references public.courts(id) on delete restrict,
  to_court_id uuid not null references public.courts(id) on delete restrict,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  constraint match_court_changed check (from_court_id <> to_court_id)
);

create index match_court_changes_match on public.match_court_changes(match_id, created_at desc);

create index match_court_changes_from on public.match_court_changes(from_court_id);

create index match_court_changes_to on public.match_court_changes(to_court_id);

create index match_court_changes_actor on public.match_court_changes(changed_by);

create trigger match_squad_set_updated_at
before update on public.match_squad_members
for each row execute function private.set_updated_at();

create or replace function private.freeze_match_squad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.match_status;
begin
  select status into current_status
  from public.matches
  where id = coalesce(new.match_id, old.match_id);

  if current_status in ('in_progress', 'completed', 'cancelled', 'abandoned') then
    raise exception 'match squad is frozen' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.freeze_match_squad() from public, anon, authenticated;

create trigger match_squad_freeze
before update or delete on public.match_squad_members
for each row execute function private.freeze_match_squad();

create or replace function private.create_court_ops_match_with_squad(
  target_session uuid,
  target_court uuid,
  target_format uuid,
  target_category uuid,
  target_level public.athlete_level,
  side_a uuid[],
  side_b uuid[],
  side_a_reserves uuid[],
  side_b_reserves uuid[],
  side_a_roster uuid,
  side_b_roster uuid,
  operation_id uuid,
  actor uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  format_code text;
  category_code text;
  all_squad uuid[];
  reserve_ids uuid[] := coalesce(side_a_reserves, array[]::uuid[]) || coalesce(side_b_reserves, array[]::uuid[]);
  result public.matches;
  side_a_id uuid;
  side_b_id uuid;
  invalid_count integer;
begin
  select code into format_code from public.competitive_formats where id = target_format and status = 'active';
  select code into category_code from public.competitive_categories where id = target_category and status = 'active';

  if format_code not in ('doubles', 'fours') then
    raise exception 'unsupported match format' using errcode = '23514';
  end if;
  if format_code = 'doubles' and cardinality(reserve_ids) > 0 then
    raise exception 'doubles do not support reserves' using errcode = '23514';
  end if;
  if cardinality(coalesce(side_a_reserves, array[]::uuid[])) > 3
    or cardinality(coalesce(side_b_reserves, array[]::uuid[])) > 3 then
    raise exception 'maximum three reserves per side' using errcode = '23514';
  end if;

  all_squad := side_a || side_b || reserve_ids;
  if (select count(distinct athlete_id) from unnest(all_squad) athlete_id) <> cardinality(all_squad) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select count(*) into invalid_count
  from unnest(reserve_ids) athlete_id
  left join public.match_queue_entries queue
    on queue.session_id = target_session and queue.athlete_id = athlete_id
  left join public.ur_play_registrations registration on registration.id = queue.registration_id
  left join public.athletes athlete on athlete.id = athlete_id
  where queue.id is null
    or queue.status not in ('waiting', 'resting')
    or queue.current_match_id is not null
    or registration.registration_status <> 'confirmed'
    or registration.attendance_status not in ('checked_in', 'present')
    or (registration.snapshot_level <> target_level and registration.snapshot_level <> 'leveling')
    or (category_code = 'female' and athlete.gender <> 'female')
    or (category_code = 'male' and athlete.gender <> 'male');
  if invalid_count > 0 then
    raise exception 'ineligible reserve' using errcode = '23514';
  end if;

  if side_a_roster is not null and not exists (
    select 1 from public.team_rosters roster
    where roster.id = side_a_roster and roster.status = 'active'
      and roster.format_id = target_format and roster.category_id = target_category and roster.level = target_level
      and not exists (
        select 1 from unnest(side_a || coalesce(side_a_reserves, array[]::uuid[])) athlete_id
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id and member.athlete_id = athlete_id and member.status = 'active'
        )
      )
  ) then
    raise exception 'side A does not match active official roster' using errcode = '23514';
  end if;

  if side_b_roster is not null and not exists (
    select 1 from public.team_rosters roster
    where roster.id = side_b_roster and roster.status = 'active'
      and roster.format_id = target_format and roster.category_id = target_category and roster.level = target_level
      and not exists (
        select 1 from unnest(side_b || coalesce(side_b_reserves, array[]::uuid[])) athlete_id
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id and member.athlete_id = athlete_id and member.status = 'active'
        )
      )
  ) then
    raise exception 'side B does not match active official roster' using errcode = '23514';
  end if;

  perform 1
  from public.match_queue_entries
  where session_id = target_session and athlete_id = any(all_squad)
  order by athlete_id
  for update;

  result := private.create_court_ops_match(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, operation_id, actor
  );

  select id into side_a_id from public.match_sides where match_id = result.id and side = 'A';
  select id into side_b_id from public.match_sides where match_id = result.id and side = 'B';

  update public.match_sides side
  set roster_id = case when side.side = 'A' then side_a_roster else side_b_roster end,
      team_id = case
        when side.side = 'A' then (select team_id from public.team_rosters where id = side_a_roster)
        else (select team_id from public.team_rosters where id = side_b_roster)
      end
  where side.match_id = result.id;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, confirmed_at, activated_at, last_operation_id, created_by
  )
  select participant.match_id, participant.side_id, participant.athlete_id, participant.registration_id,
    case when participant.side_id = side_a_id then side_a_roster else side_b_roster end,
    'starter', 'starter', 'active', 'present', participant.position_order,
    now(), now(), operation_id, actor
  from public.match_participants participant
  where participant.match_id = result.id
  on conflict (match_id, athlete_id) do nothing;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, called_at, last_operation_id, created_by
  )
  select result.id, side_a_id, registration.athlete_id, registration.id, side_a_roster,
    'reserve', 'reserve', 'called', 'expected', (ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_a_reserves, array[]::uuid[])) with ordinality reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id
  union all
  select result.id, side_b_id, registration.athlete_id, registration.id, side_b_roster,
    'reserve', 'reserve', 'called', 'expected', (ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_b_reserves, array[]::uuid[])) with ordinality reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id;

  update public.match_queue_entries
  set status = 'assigned', current_match_id = result.id, updated_at = now()
  where session_id = target_session and athlete_id = any(reserve_ids);

  return result;
end;
$$;

revoke all on function private.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid,uuid) from public, anon;

grant execute on function private.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.create_court_ops_match_with_squad(
  target_session uuid,
  target_court uuid,
  target_format uuid,
  target_category uuid,
  target_level public.athlete_level,
  side_a uuid[],
  side_b uuid[],
  side_a_reserves uuid[] default array[]::uuid[],
  side_b_reserves uuid[] default array[]::uuid[],
  side_a_roster uuid default null,
  side_b_roster uuid default null,
  operation_id uuid default gen_random_uuid()
)
returns public.matches
language sql
security invoker
set search_path = ''
as $$
  select private.create_court_ops_match_with_squad(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, side_a_reserves, side_b_reserves,
    side_a_roster, side_b_roster, operation_id, auth.uid()
  );
$$;

revoke all on function public.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid) from public, anon;

grant execute on function public.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid) to authenticated;

create or replace function private.set_match_reserve_presence(
  target_member uuid,
  target_presence public.reserve_presence_status,
  reason text,
  operation_id uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.match_squad_members;
  match_row public.matches;
begin
  select * into member from public.match_squad_members where id = target_member for update;
  select * into match_row from public.matches where id = member.match_id for update;
  if not private.operates_ur_play_session(match_row.session_id) then
    raise exception 'squad operation denied' using errcode = '42501';
  end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') or member.squad_role <> 'reserve' then
    raise exception 'reserve presence is frozen' using errcode = '23514';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'presence reason required' using errcode = '23514';
  end if;

  update public.match_squad_members
  set reserve_presence_status = target_presence,
      status = case
        when target_presence = 'present' then 'bench'::public.match_squad_status
        when target_presence = 'expected' then 'called'::public.match_squad_status
        else 'unavailable'::public.match_squad_status
      end,
      confirmed_at = case when target_presence = 'present' then now() else confirmed_at end,
      last_change_reason = reason,
      last_operation_id = operation_id
  where id = member.id
  returning * into member;

  if target_presence in ('absent', 'excused') then
    update public.match_queue_entries
    set status = 'unavailable', current_match_id = null, updated_at = now()
    where registration_id = member.registration_id;
  elsif target_presence in ('present', 'expected') then
    update public.match_queue_entries
    set status = 'assigned', current_match_id = member.match_id, updated_at = now()
    where registration_id = member.registration_id;
  end if;
  return member;
end;
$$;

revoke all on function private.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) from public, anon;

grant execute on function private.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) to authenticated;

create or replace function public.set_match_reserve_presence(
  target_member uuid,
  target_presence public.reserve_presence_status,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.set_match_reserve_presence(target_member, target_presence, reason, operation_id) $$;

revoke all on function public.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) from public, anon;

grant execute on function public.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) to authenticated;

create or replace function private.add_match_reserve(
  target_match uuid,
  target_side uuid,
  target_athlete uuid,
  target_roster uuid,
  operation_id uuid,
  actor uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  registration public.ur_play_registrations;
  result public.match_squad_members;
  reserve_count integer;
  next_position smallint;
  format_code text;
  category_code text;
  athlete_gender public.gender_type;
begin
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then
    raise exception 'squad operation denied' using errcode = '42501';
  end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then
    raise exception 'match squad is frozen' using errcode = '23514';
  end if;
  if not exists (select 1 from public.match_sides where id = target_side and match_id = target_match) then
    raise exception 'side does not belong to match' using errcode = '23514';
  end if;
  select code into format_code from public.competitive_formats where id = match_row.format_id;
  if format_code <> 'fours' then
    raise exception 'reserves are supported only for fours' using errcode = '23514';
  end if;
  select count(*) into reserve_count from public.match_squad_members
  where side_id = target_side and squad_role = 'reserve' and status not in ('withdrawn', 'unavailable');
  if reserve_count >= 3 then raise exception 'maximum three reserves per side' using errcode = '23514'; end if;

  if exists (select 1 from public.match_squad_members where match_id = target_match and athlete_id = target_athlete) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select registration_row.* into registration
  from public.ur_play_registrations registration_row
  join public.match_queue_entries queue on queue.registration_id = registration_row.id
  where registration_row.session_id = match_row.session_id
    and registration_row.athlete_id = target_athlete
    and registration_row.registration_status = 'confirmed'
    and registration_row.attendance_status in ('checked_in', 'present')
    and queue.status in ('waiting', 'resting') and queue.current_match_id is null
  for update of queue;
  if not found or (registration.snapshot_level <> match_row.level and registration.snapshot_level <> 'leveling') then
    raise exception 'reserve is ineligible' using errcode = '23514';
  end if;

  select code into category_code from public.competitive_categories where id = match_row.category_id;
  select gender into athlete_gender from public.athletes where id = target_athlete;
  if (category_code = 'female' and athlete_gender <> 'female')
    or (category_code = 'male' and athlete_gender <> 'male') then
    raise exception 'reserve violates category' using errcode = '23514';
  end if;
  if target_roster is not null and not exists (
    select 1 from public.team_roster_members member
    where member.roster_id = target_roster and member.athlete_id = target_athlete and member.status = 'active'
  ) then
    raise exception 'reserve does not belong to official roster' using errcode = '23514';
  end if;

  select coalesce(min(position), 5)::smallint into next_position
  from generate_series(5, 7) position
  where not exists (
    select 1 from public.match_squad_members member
    where member.side_id = target_side and member.position_order = position
      and member.status not in ('withdrawn', 'unavailable')
  );

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, called_at, last_operation_id, created_by
  ) values (
    target_match, target_side, target_athlete, registration.id, target_roster,
    'reserve', 'reserve', 'called', 'expected', next_position, now(), operation_id, actor
  ) returning * into result;

  update public.match_queue_entries
  set status = 'assigned', current_match_id = target_match, updated_at = now()
  where registration_id = registration.id;
  return result;
end;
$$;

revoke all on function private.add_match_reserve(uuid,uuid,uuid,uuid,uuid,uuid) from public, anon;

grant execute on function private.add_match_reserve(uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.add_match_reserve(
  target_match uuid,
  target_side uuid,
  target_athlete uuid,
  target_roster uuid default null,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.add_match_reserve(target_match, target_side, target_athlete, target_roster, operation_id, auth.uid()) $$;

revoke all on function public.add_match_reserve(uuid,uuid,uuid,uuid,uuid) from public, anon;

grant execute on function public.add_match_reserve(uuid,uuid,uuid,uuid,uuid) to authenticated;

create or replace function private.remove_match_reserve(
  target_member uuid,
  disposition text,
  reason text,
  operation_id uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.match_squad_members;
  match_row public.matches;
begin
  select * into member from public.match_squad_members where id = target_member for update;
  select * into match_row from public.matches where id = member.match_id for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'squad operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') or member.squad_role <> 'reserve' then
    raise exception 'reserve cannot be removed' using errcode = '23514';
  end if;
  if disposition not in ('waiting', 'withdrawn') or coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'invalid reserve removal' using errcode = '23514';
  end if;
  update public.match_squad_members
  set status = 'withdrawn', withdrawn_at = now(), last_change_reason = reason, last_operation_id = operation_id
  where id = member.id returning * into member;
  update public.match_queue_entries
  set status = case when disposition = 'waiting' then 'waiting'::public.match_queue_status else 'unavailable'::public.match_queue_status end,
      current_match_id = null,
      queued_at = case when disposition = 'waiting' then now() else queued_at end,
      updated_at = now()
  where registration_id = member.registration_id;
  return member;
end;
$$;

revoke all on function private.remove_match_reserve(uuid,text,text,uuid) from public, anon;

grant execute on function private.remove_match_reserve(uuid,text,text,uuid) to authenticated;

create or replace function public.remove_match_reserve(
  target_member uuid,
  disposition text,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.remove_match_reserve(target_member, disposition, reason, operation_id) $$;

revoke all on function public.remove_match_reserve(uuid,text,text,uuid) from public, anon;

grant execute on function public.remove_match_reserve(uuid,text,text,uuid) to authenticated;

create or replace function private.promote_match_reserve(
  target_reserve uuid,
  target_participant uuid,
  outgoing_disposition text,
  reason text,
  operation_id uuid
)
returns public.match_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserve_member public.match_squad_members;
  outgoing_participant public.match_participants;
  outgoing_member public.match_squad_members;
  match_row public.matches;
  registration public.ur_play_registrations;
  category_code text;
  required_gender_count integer;
  result public.match_participants;
begin
  select * into reserve_member from public.match_squad_members where id = target_reserve for update;
  select * into outgoing_participant from public.match_participants where id = target_participant for update;
  select * into match_row from public.matches where id = reserve_member.match_id for update;
  select * into outgoing_member from public.match_squad_members
    where match_id = match_row.id and athlete_id = outgoing_participant.athlete_id for update;

  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'squad operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then raise exception 'match squad is frozen' using errcode = '23514'; end if;
  if reserve_member.match_id <> outgoing_participant.match_id or reserve_member.side_id <> outgoing_participant.side_id then
    raise exception 'reserve and starter must share a side' using errcode = '23514';
  end if;
  if reserve_member.squad_role <> 'reserve' or reserve_member.reserve_presence_status <> 'present'
    or reserve_member.status not in ('confirmed', 'bench') then
    raise exception 'present reserve required' using errcode = '23514';
  end if;
  if outgoing_disposition not in ('bench', 'waiting', 'withdrawn') or coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'invalid substitution disposition' using errcode = '23514';
  end if;

  select * into registration from public.ur_play_registrations where id = reserve_member.registration_id;
  set constraints match_squad_position_unique deferred;
  update public.match_squad_members
  set squad_role = case when id = reserve_member.id then 'starter'::public.match_squad_role else 'reserve'::public.match_squad_role end,
      status = case
        when id = reserve_member.id then 'active'::public.match_squad_status
        when outgoing_disposition = 'bench' then 'bench'::public.match_squad_status
        when outgoing_disposition = 'withdrawn' then 'withdrawn'::public.match_squad_status
        else 'withdrawn'::public.match_squad_status
      end,
      position_order = case when id = reserve_member.id then outgoing_member.position_order else reserve_member.position_order end,
      activated_at = case when id = reserve_member.id then now() else activated_at end,
      benched_at = case when id = outgoing_member.id and outgoing_disposition = 'bench' then now() else benched_at end,
      withdrawn_at = case when id = outgoing_member.id and outgoing_disposition <> 'bench' then now() else withdrawn_at end,
      reserve_presence_status = case
        when id = reserve_member.id then reserve_presence_status
        when id = outgoing_member.id and outgoing_disposition = 'bench' then 'present'::public.reserve_presence_status
        else reserve_presence_status
      end,
      last_change_reason = reason,
      last_operation_id = operation_id
  where id in (reserve_member.id, outgoing_member.id);

  update public.match_participants
  set athlete_id = reserve_member.athlete_id,
      registration_id = reserve_member.registration_id,
      team_snapshot_id = registration.snapshot_team_id,
      pole_snapshot_id = registration.snapshot_team_pole_id,
      level_snapshot = registration.snapshot_level
  where id = outgoing_participant.id
  returning * into result;

  select code into category_code from public.competitive_categories where id = match_row.category_id;
  if category_code = 'mixed' then
    select case format.code when 'doubles' then 1 when 'fours' then 2 else 0 end
    into required_gender_count
    from public.competitive_formats format where format.id = match_row.format_id;
    if exists (
      select 1 from public.match_sides side
      where side.match_id = match_row.id and (
        (select count(*) from public.match_participants participant join public.athletes athlete on athlete.id = participant.athlete_id
          where participant.side_id = side.id and participant.status = 'active' and athlete.gender = 'female') <> required_gender_count
        or
        (select count(*) from public.match_participants participant join public.athletes athlete on athlete.id = participant.athlete_id
          where participant.side_id = side.id and participant.status = 'active' and athlete.gender = 'male') <> required_gender_count
      )
    ) then
      raise exception 'substitution violates mixed composition' using errcode = '23514';
    end if;
  end if;

  update public.match_queue_entries
  set status = case
        when outgoing_disposition = 'bench' then 'assigned'::public.match_queue_status
        when outgoing_disposition = 'waiting' then 'waiting'::public.match_queue_status
        else 'unavailable'::public.match_queue_status
      end,
      current_match_id = case when outgoing_disposition = 'bench' then match_row.id else null end,
      queued_at = case when outgoing_disposition = 'waiting' then now() else queued_at end,
      updated_at = now()
  where registration_id = outgoing_member.registration_id;
  update public.match_queue_entries
  set status = 'assigned', current_match_id = match_row.id, updated_at = now()
  where registration_id = reserve_member.registration_id;
  return result;
end;
$$;

revoke all on function private.promote_match_reserve(uuid,uuid,text,text,uuid) from public, anon;

grant execute on function private.promote_match_reserve(uuid,uuid,text,text,uuid) to authenticated;

create or replace function public.promote_match_reserve(
  target_reserve uuid,
  target_participant uuid,
  outgoing_disposition text,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_participants
language sql
security invoker
set search_path = ''
as $$ select private.promote_match_reserve(target_reserve, target_participant, outgoing_disposition, reason, operation_id) $$;

revoke all on function public.promote_match_reserve(uuid,uuid,text,text,uuid) from public, anon;

grant execute on function public.promote_match_reserve(uuid,uuid,text,text,uuid) to authenticated;

create or replace function private.change_match_court(
  target_match uuid,
  target_court uuid,
  reason text,
  operation_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
begin
  if exists (select 1 from public.match_court_changes where client_operation_id = operation_id) then
    select match.* into match_row
    from public.match_court_changes change
    join public.matches match on match.id = change.match_id
    where change.client_operation_id = operation_id;
    return match_row;
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'court operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then raise exception 'court is frozen after match start' using errcode = '23514'; end if;
  if match_row.court_id = target_court then return match_row; end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then raise exception 'court change reason required' using errcode = '23514'; end if;
  if not exists (
    select 1 from public.ur_play_session_courts
    where session_id = match_row.session_id and court_id = target_court and status = 'active'
  ) then raise exception 'court does not belong to active session courts' using errcode = '23514'; end if;

  insert into public.match_court_changes(match_id, from_court_id, to_court_id, changed_by, reason, client_operation_id)
  values(match_row.id, match_row.court_id, target_court, auth.uid(), reason, operation_id);
  update public.matches set court_id = target_court, updated_at = now() where id = match_row.id returning * into match_row;
  return match_row;
end;
$$;

revoke all on function private.change_match_court(uuid,uuid,text,uuid) from public, anon;

grant execute on function private.change_match_court(uuid,uuid,text,uuid) to authenticated;

create or replace function public.change_match_court(
  target_match uuid,
  target_court uuid,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.matches
language sql
security invoker
set search_path = ''
as $$ select private.change_match_court(target_match, target_court, reason, operation_id) $$;

revoke all on function public.change_match_court(uuid,uuid,text,uuid) from public, anon;

grant execute on function public.change_match_court(uuid,uuid,text,uuid) to authenticated;

create or replace function private.transition_court_ops_match(
  target_match uuid,
  target_status public.match_status,
  reason text,
  operation_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  expected integer;
  actual integer;
  has_squad boolean;
begin
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'match operation denied' using errcode = '42501'; end if;
  if target_status = match_row.status then return match_row; end if;
  if target_status = 'cancelled' and match_row.status in ('draft', 'queued', 'called', 'ready') then null;
  elsif target_status = 'abandoned' and match_row.status = 'in_progress' then null;
  elsif not (
    (match_row.status = 'queued' and target_status = 'called')
    or (match_row.status = 'called' and target_status = 'ready')
    or (match_row.status = 'ready' and target_status = 'in_progress')
  ) then raise exception 'invalid match transition' using errcode = '23514';
  end if;

  select case format.code when 'doubles' then 4 when 'fours' then 8 else 0 end into expected
  from public.competitive_formats format where format.id = match_row.format_id;
  select count(*) into actual from public.match_participants where match_id = match_row.id and status = 'active';
  select exists(select 1 from public.match_squad_members where match_id = match_row.id) into has_squad;

  if target_status = 'in_progress' then
    if actual <> expected then raise exception 'incomplete match roster' using errcode = '23514'; end if;
    if has_squad and (
      select count(*) from public.match_squad_members
      where match_id = match_row.id and squad_role = 'starter' and status in ('called', 'confirmed', 'active')
    ) <> expected then raise exception 'exact active squad required' using errcode = '23514'; end if;
    if exists (
      select 1 from public.match_queue_entries queue
      join public.match_participants participant on participant.athlete_id = queue.athlete_id and participant.match_id = match_row.id
      where queue.current_match_id <> match_row.id or queue.status <> 'assigned'
    ) then raise exception 'participant unavailable at start' using errcode = '23514'; end if;
    update public.match_queue_entries queue set status = 'playing', updated_at = now()
    from public.match_participants participant
    where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id;
  end if;

  if has_squad and target_status in ('called', 'ready', 'in_progress') then
    update public.match_squad_members
    set status = case
          when squad_role = 'reserve' then
            case when reserve_presence_status = 'present' then 'bench'::public.match_squad_status else status end
          when target_status = 'called' then 'called'::public.match_squad_status
          when target_status = 'ready' then 'confirmed'::public.match_squad_status
          else 'active'::public.match_squad_status
        end,
        called_at = case when target_status = 'called' then now() else called_at end,
        confirmed_at = case when target_status = 'ready' and squad_role = 'starter' then now() else confirmed_at end,
        activated_at = case when target_status = 'in_progress' and squad_role = 'starter' then now() else activated_at end,
        last_operation_id = operation_id
    where match_id = match_row.id and status not in ('withdrawn', 'unavailable');
  end if;

  update public.matches
  set status = target_status,
      called_at = case when target_status = 'called' then now() else called_at end,
      ready_at = case when target_status = 'ready' then now() else ready_at end,
      started_at = case when target_status = 'in_progress' then now() else started_at end,
      ready_for_scoring = target_status = 'in_progress',
      cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
      cancellation_reason = case when target_status in ('cancelled', 'abandoned') then reason else cancellation_reason end,
      ended_at = case when target_status = 'abandoned' then now() else ended_at end,
      updated_at = now()
  where id = match_row.id returning * into match_row;

  if target_status in ('cancelled', 'abandoned') then
    update public.match_queue_entries queue
    set status = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then 'resting'::public.match_queue_status
          else 'waiting'::public.match_queue_status
        end,
        current_match_id = null,
        last_match_ended_at = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then now() else last_match_ended_at end,
        queued_at = now(), updated_at = now()
    where queue.current_match_id = match_row.id;
  end if;
  return match_row;
end;
$$;

create or replace function private.can_read_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches match
    where match.id = target_match and (
      private.can_view_court_ops_session(match.session_id)
      or exists (
        select 1 from public.match_participants participant
        where participant.match_id = match.id and participant.athlete_id = private.current_athlete_id()
      )
      or exists (
        select 1 from public.match_squad_members squad
        where squad.match_id = match.id and squad.athlete_id = private.current_athlete_id()
      )
      or exists (
        select 1
        from public.match_squad_members squad
        join public.team_memberships membership on membership.athlete_id = squad.athlete_id and membership.status = 'active'
        where squad.match_id = match.id and private.manages_team(membership.team_id)
      )
    )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;

grant execute on function private.can_read_match(uuid) to authenticated;

alter table public.match_squad_members enable row level security;

alter table public.match_squad_members force row level security;

alter table public.match_court_changes enable row level security;

alter table public.match_court_changes force row level security;

create policy match_squad_read
on public.match_squad_members
for select
to authenticated
using (private.can_read_match(match_id));

create policy match_court_changes_read
on public.match_court_changes
for select
to authenticated
using (private.can_read_match(match_id));

create trigger match_squad_audit
after insert or update or delete on public.match_squad_members
for each row execute function private.capture_audit_log();

create trigger match_court_changes_audit
after insert or update or delete on public.match_court_changes
for each row execute function private.capture_audit_log();

grant select on public.match_squad_members, public.match_court_changes to authenticated;

grant all on public.match_squad_members, public.match_court_changes to service_role;

create or replace function private.create_court_ops_match_with_squad(
  target_session uuid,
  target_court uuid,
  target_format uuid,
  target_category uuid,
  target_level public.athlete_level,
  side_a uuid[],
  side_b uuid[],
  side_a_reserves uuid[],
  side_b_reserves uuid[],
  side_a_roster uuid,
  side_b_roster uuid,
  operation_id uuid,
  actor uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  format_code text;
  category_code text;
  all_squad uuid[];
  reserve_ids uuid[] := coalesce(side_a_reserves, array[]::uuid[]) || coalesce(side_b_reserves, array[]::uuid[]);
  result public.matches;
  side_a_id uuid;
  side_b_id uuid;
  invalid_count integer;
begin
  select match.* into result from public.matches match where match.client_operation_id = operation_id;
  if found then return result; end if;

  select format.code into format_code
  from public.competitive_formats format
  where format.id = target_format and format.status = 'active';
  select category.code into category_code
  from public.competitive_categories category
  where category.id = target_category and category.status = 'active';

  if format_code not in ('doubles', 'fours') then
    raise exception 'unsupported match format' using errcode = '23514';
  end if;
  if format_code = 'doubles' and cardinality(reserve_ids) > 0 then
    raise exception 'doubles do not support reserves' using errcode = '23514';
  end if;
  if cardinality(coalesce(side_a_reserves, array[]::uuid[])) > 3
    or cardinality(coalesce(side_b_reserves, array[]::uuid[])) > 3 then
    raise exception 'maximum three reserves per side' using errcode = '23514';
  end if;

  all_squad := side_a || side_b || reserve_ids;
  if (
    select count(distinct selected.athlete_id)
    from unnest(all_squad) as selected(athlete_id)
  ) <> cardinality(all_squad) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select count(*) into invalid_count
  from unnest(reserve_ids) as selected(athlete_id)
  left join public.match_queue_entries queue
    on queue.session_id = target_session and queue.athlete_id = selected.athlete_id
  left join public.ur_play_registrations registration on registration.id = queue.registration_id
  left join public.athletes athlete on athlete.id = selected.athlete_id
  where queue.id is null
    or queue.status not in ('waiting', 'resting')
    or queue.current_match_id is not null
    or registration.registration_status <> 'confirmed'
    or registration.attendance_status not in ('checked_in', 'present')
    or (registration.snapshot_level <> target_level and registration.snapshot_level <> 'leveling')
    or (category_code = 'female' and athlete.gender <> 'female')
    or (category_code = 'male' and athlete.gender <> 'male');
  if invalid_count > 0 then
    raise exception 'ineligible reserve' using errcode = '23514';
  end if;

  if side_a_roster is not null and not exists (
    select 1
    from public.team_rosters roster
    where roster.id = side_a_roster
      and roster.status = 'active'
      and roster.format_id = target_format
      and roster.category_id = target_category
      and roster.level = target_level
      and not exists (
        select 1
        from unnest(side_a || coalesce(side_a_reserves, array[]::uuid[])) as selected(athlete_id)
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id
            and member.athlete_id = selected.athlete_id
            and member.status = 'active'
        )
      )
  ) then
    raise exception 'side A does not match active official roster' using errcode = '23514';
  end if;

  if side_b_roster is not null and not exists (
    select 1
    from public.team_rosters roster
    where roster.id = side_b_roster
      and roster.status = 'active'
      and roster.format_id = target_format
      and roster.category_id = target_category
      and roster.level = target_level
      and not exists (
        select 1
        from unnest(side_b || coalesce(side_b_reserves, array[]::uuid[])) as selected(athlete_id)
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id
            and member.athlete_id = selected.athlete_id
            and member.status = 'active'
        )
      )
  ) then
    raise exception 'side B does not match active official roster' using errcode = '23514';
  end if;

  perform 1
  from public.match_queue_entries queue
  where queue.session_id = target_session and queue.athlete_id = any(all_squad)
  order by queue.athlete_id
  for update;

  result := private.create_court_ops_match(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, operation_id, actor
  );

  select side.id into side_a_id
  from public.match_sides side where side.match_id = result.id and side.side = 'A';
  select side.id into side_b_id
  from public.match_sides side where side.match_id = result.id and side.side = 'B';

  update public.match_sides side
  set roster_id = case when side.side = 'A' then side_a_roster else side_b_roster end,
      team_id = case
        when side.side = 'A' then (select roster.team_id from public.team_rosters roster where roster.id = side_a_roster)
        else (select roster.team_id from public.team_rosters roster where roster.id = side_b_roster)
      end
  where side.match_id = result.id;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, confirmed_at, activated_at, last_operation_id, created_by
  )
  select participant.match_id, participant.side_id, participant.athlete_id, participant.registration_id,
    case when participant.side_id = side_a_id then side_a_roster else side_b_roster end,
    'starter', 'starter', 'active', 'present', participant.position_order,
    now(), now(), operation_id, actor
  from public.match_participants participant
  where participant.match_id = result.id
  on conflict (match_id, athlete_id) do nothing;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, called_at, last_operation_id, created_by
  )
  select result.id, side_a_id, registration.athlete_id, registration.id, side_a_roster,
    'reserve', 'reserve', 'called', 'expected', (reserve.ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_a_reserves, array[]::uuid[])) with ordinality as reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id
  union all
  select result.id, side_b_id, registration.athlete_id, registration.id, side_b_roster,
    'reserve', 'reserve', 'called', 'expected', (reserve.ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_b_reserves, array[]::uuid[])) with ordinality as reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id;

  update public.match_queue_entries queue
  set status = 'assigned', current_match_id = result.id, updated_at = now()
  where queue.session_id = target_session and queue.athlete_id = any(reserve_ids);
  return result;
end;
$$;

create cast (text as public.match_squad_role) with inout as assignment;

create cast (text as public.match_squad_status) with inout as assignment;

create cast (text as public.reserve_presence_status) with inout as assignment;

do $$
declare
  definition text;
  corrected text;
begin
  select pg_get_functiondef(procedure.oid)
  into definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'promote_match_reserve'
    and pg_get_function_identity_arguments(procedure.oid) = 'target_reserve uuid, target_participant uuid, outgoing_disposition text, reason text, operation_id uuid';

  if definition is null or position('set constraints match_squad_position_unique deferred' in lower(definition)) = 0 then
    raise exception 'expected promote_match_reserve definition was not found';
  end if;

  corrected := replace(
    definition,
    'set constraints match_squad_position_unique deferred',
    'set constraints public.match_squad_position_unique deferred'
  );
  execute corrected;
end;
$$;

create or replace function private.transition_court_ops_match(
  target_match uuid,
  target_status public.match_status,
  reason text,
  operation_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  expected integer;
  actual integer;
  has_squad boolean;
begin
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'match operation denied' using errcode = '42501'; end if;
  if target_status = match_row.status then return match_row; end if;
  if target_status = 'cancelled' and match_row.status in ('draft', 'queued', 'called', 'ready') then null;
  elsif target_status = 'abandoned' and match_row.status = 'in_progress' then null;
  elsif not (
    (match_row.status = 'queued' and target_status = 'called')
    or (match_row.status = 'called' and target_status = 'ready')
    or (match_row.status = 'ready' and target_status = 'in_progress')
  ) then raise exception 'invalid match transition' using errcode = '23514';
  end if;

  select case format.code when 'doubles' then 4 when 'fours' then 8 else 0 end into expected
  from public.competitive_formats format where format.id = match_row.format_id;
  select count(*) into actual from public.match_participants where match_id = match_row.id and status = 'active';
  select exists(select 1 from public.match_squad_members where match_id = match_row.id) into has_squad;

  if target_status = 'in_progress' then
    if actual <> expected then raise exception 'incomplete match roster' using errcode = '23514'; end if;
    if has_squad and (
      select count(*) from public.match_squad_members
      where match_id = match_row.id and squad_role = 'starter' and status in ('called', 'confirmed', 'active')
    ) <> expected then raise exception 'exact active squad required' using errcode = '23514'; end if;
    if exists (
      select 1 from public.match_queue_entries queue
      join public.match_participants participant
        on participant.athlete_id = queue.athlete_id
        and participant.match_id = match_row.id
      where queue.session_id = match_row.session_id
        and (queue.current_match_id <> match_row.id or queue.status <> 'assigned')
    ) then raise exception 'participant unavailable at start' using errcode = '23514'; end if;
    update public.match_queue_entries queue set status = 'playing', updated_at = now()
    from public.match_participants participant
    where participant.match_id = match_row.id
      and participant.athlete_id = queue.athlete_id
      and queue.session_id = match_row.session_id;
  end if;

  if has_squad and target_status in ('called', 'ready', 'in_progress') then
    update public.match_squad_members
    set status = case
          when squad_role = 'reserve' then
            case when reserve_presence_status = 'present' then 'bench'::public.match_squad_status else status end
          when target_status = 'called' then 'called'::public.match_squad_status
          when target_status = 'ready' then 'confirmed'::public.match_squad_status
          else 'active'::public.match_squad_status
        end,
        called_at = case when target_status = 'called' then now() else called_at end,
        confirmed_at = case when target_status = 'ready' and squad_role = 'starter' then now() else confirmed_at end,
        activated_at = case when target_status = 'in_progress' and squad_role = 'starter' then now() else activated_at end,
        last_operation_id = operation_id
    where match_id = match_row.id and status not in ('withdrawn', 'unavailable');
  end if;

  update public.matches
  set status = target_status,
      called_at = case when target_status = 'called' then now() else called_at end,
      ready_at = case when target_status = 'ready' then now() else ready_at end,
      started_at = case when target_status = 'in_progress' then now() else started_at end,
      ready_for_scoring = target_status = 'in_progress',
      cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
      cancellation_reason = case when target_status in ('cancelled', 'abandoned') then reason else cancellation_reason end,
      ended_at = case when target_status = 'abandoned' then now() else ended_at end,
      updated_at = now()
  where id = match_row.id returning * into match_row;

  if target_status in ('cancelled', 'abandoned') then
    update public.match_queue_entries queue
    set status = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then 'resting'::public.match_queue_status
          else 'waiting'::public.match_queue_status
        end,
        current_match_id = null,
        last_match_ended_at = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then now() else last_match_ended_at end,
        queued_at = now(), updated_at = now()
    where queue.current_match_id = match_row.id;
  end if;
  return match_row;
end;
$$;

create or replace function private.can_read_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches match
    where match.id = target_match
      and (
        private.can_view_court_ops_session(match.session_id)
        or exists (
          select 1
          from public.match_participants participant
          where participant.match_id = match.id
            and participant.athlete_id = private.current_athlete_id()
        )
        or exists (
          select 1
          from public.match_squad_members squad
          where squad.match_id = match.id
            and squad.athlete_id = private.current_athlete_id()
        )
        or exists (
          select 1
          from public.match_participants participant
          join public.team_memberships membership
            on membership.athlete_id = participant.athlete_id
           and membership.status = 'active'
          where participant.match_id = match.id
            and private.manages_team(membership.team_id)
        )
        or exists (
          select 1
          from public.match_squad_members squad
          join public.team_memberships membership
            on membership.athlete_id = squad.athlete_id
           and membership.status = 'active'
          where squad.match_id = match.id
            and private.manages_team(membership.team_id)
        )
      )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;

grant execute on function private.can_read_match(uuid) to authenticated;

alter type public.match_status
  add value if not exists 'pending_review' after 'in_progress';

create type public.match_scoring_type as enum ('rally_point');

create type public.match_rally_status as enum ('valid', 'reversed', 'corrected', 'void');

create type public.match_rally_correction_type as enum (
  'reverse',
  'replace_winner',
  'void',
  'technical_action_correction'
);

create type public.match_technical_action_type as enum ('ace', 'attack', 'block', 'defense', 'assist');

create type public.match_technical_action_status as enum ('valid', 'corrected', 'void');

create type public.match_result_status as enum ('provisional', 'under_review', 'homologated', 'corrected', 'void');

create type public.match_correction_request_status as enum ('requested', 'applied', 'rejected');

alter table public.matches
  add column winner_side_id uuid references public.match_sides(id) on delete restrict,
  add column final_score_a smallint check (final_score_a is null or final_score_a >= 0),
  add column final_score_b smallint check (final_score_b is null or final_score_b >= 0),
  add column voided_at timestamptz,
  add column void_reason text,
  add constraint matches_final_score_pair check (
    (final_score_a is null and final_score_b is null)
    or (final_score_a is not null and final_score_b is not null)
  ),
  add constraint matches_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and char_length(trim(void_reason)) >= 5)
  );

create table public.match_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  points_to_win smallint not null default 11 check (points_to_win between 1 and 100),
  win_by smallint not null default 1 check (win_by between 1 and 10),
  max_points smallint check (max_points is null or max_points >= points_to_win),
  sets_to_win smallint not null default 1 check (sets_to_win between 1 and 5),
  scoring_type public.match_scoring_type not null default 'rally_point',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create table public.match_rallies (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  rally_number integer not null check (rally_number > 0),
  client_sequence integer not null check (client_sequence > 0),
  winning_side_id uuid not null references public.match_sides(id) on delete restrict,
  status public.match_rally_status not null default 'valid',
  recorded_at timestamptz not null default now(),
  client_recorded_at timestamptz,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (match_id, rally_number),
  unique (match_id, client_sequence)
);

create table public.match_rally_corrections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  original_rally_id uuid not null references public.match_rallies(id) on delete restrict,
  correction_type public.match_rally_correction_type not null,
  replacement_winning_side_id uuid references public.match_sides(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) >= 5),
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid not null unique,
  constraint rally_correction_replacement check (
    (correction_type = 'replace_winner' and replacement_winning_side_id is not null)
    or (correction_type <> 'replace_winner' and replacement_winning_side_id is null)
  )
);

create table public.match_technical_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  rally_id uuid not null references public.match_rallies(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  athlete_id uuid references public.athletes(id) on delete restrict,
  side_id uuid references public.match_sides(id) on delete restrict,
  action_type public.match_technical_action_type,
  status public.match_technical_action_status not null default 'valid',
  supersedes_action_id uuid references public.match_technical_actions(id) on delete restrict,
  correction_reason text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid not null unique,
  unique (rally_id, version_number),
  constraint technical_action_shape check (
    (
      status in ('valid', 'corrected')
      and athlete_id is not null
      and side_id is not null
      and action_type is not null
    )
    or (
      status = 'void'
      and athlete_id is null
      and side_id is null
      and action_type is null
    )
  ),
  constraint technical_action_correction_reason check (
    (version_number = 1 and supersedes_action_id is null and correction_reason is null)
    or (
      version_number > 1
      and supersedes_action_id is not null
      and char_length(trim(correction_reason)) >= 5
    )
  )
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  winner_side_id uuid references public.match_sides(id) on delete restrict,
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  result_status public.match_result_status not null default 'provisional',
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_result_homologation check (
    (result_status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or (result_status <> 'homologated')
  ),
  constraint match_result_void check (
    (result_status = 'void' and winner_side_id is null)
    or result_status <> 'void'
  )
);

create table public.match_result_versions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.match_results(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  winner_side_id uuid references public.match_sides(id) on delete restrict,
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  result_status public.match_result_status not null,
  reason text not null check (char_length(trim(reason)) >= 3),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (result_id, version_number)
);

create table public.match_result_correction_requests (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.match_results(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) >= 5),
  status public.match_correction_request_status not null default 'requested',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  client_operation_id uuid not null unique,
  constraint correction_request_resolution check (
    (status = 'requested' and resolved_by is null and resolved_at is null)
    or (status <> 'requested' and resolved_by is not null and resolved_at is not null)
  )
);

create index match_rallies_match_recorded on public.match_rallies(match_id, rally_number);

create index match_rally_corrections_rally_created on public.match_rally_corrections(original_rally_id, created_at desc);

create index match_rally_corrections_match on public.match_rally_corrections(match_id);

create index match_technical_actions_match_rally on public.match_technical_actions(match_id, rally_id, version_number desc);

create index match_technical_actions_athlete on public.match_technical_actions(athlete_id) where athlete_id is not null;

create index match_results_status on public.match_results(result_status, match_id);

create index match_result_versions_match on public.match_result_versions(match_id, version_number);

create index match_result_correction_requests_match on public.match_result_correction_requests(match_id, status);

create view public.match_rally_effective
with (security_invoker = true)
as
select
  rally.id,
  rally.match_id,
  rally.rally_number,
  rally.client_sequence,
  rally.winning_side_id as original_winning_side_id,
  case
    when correction.correction_type in ('reverse', 'void') then null
    when correction.correction_type = 'replace_winner' then correction.replacement_winning_side_id
    else rally.winning_side_id
  end as effective_winning_side_id,
  case
    when correction.correction_type = 'reverse' then 'reversed'::public.match_rally_status
    when correction.correction_type = 'void' then 'void'::public.match_rally_status
    when correction.correction_type = 'replace_winner' then 'corrected'::public.match_rally_status
    else rally.status
  end as effective_status,
  rally.recorded_at,
  rally.client_recorded_at,
  rally.recorded_by,
  rally.client_operation_id,
  correction.id as latest_correction_id,
  correction.correction_type as latest_correction_type,
  correction.reason as latest_correction_reason
from public.match_rallies rally
left join lateral (
  select item.*
  from public.match_rally_corrections item
  where item.original_rally_id = rally.id
    and item.correction_type in ('reverse', 'replace_winner', 'void')
  order by item.created_at desc, item.id desc
  limit 1
) correction on true;

create view public.match_scoreboard
with (security_invoker = true)
as
with scores as (
  select
    match.id as match_id,
    side_a.id as side_a_id,
    side_b.id as side_b_id,
    rule.points_to_win,
    rule.win_by,
    rule.max_points,
    count(rally.id) filter (
      where rally.effective_winning_side_id = side_a.id
        and rally.effective_status in ('valid', 'corrected')
    )::integer as score_a,
    count(rally.id) filter (
      where rally.effective_winning_side_id = side_b.id
        and rally.effective_status in ('valid', 'corrected')
    )::integer as score_b,
    count(rally.id) filter (
      where rally.effective_status in ('valid', 'corrected')
    )::integer as valid_rallies,
    coalesce(max(rally.rally_number), 0) + 1 as next_rally_number
  from public.matches match
  join public.match_scoring_rules rule on rule.match_id = match.id
  join public.match_sides side_a on side_a.match_id = match.id and side_a.side = 'A'
  join public.match_sides side_b on side_b.match_id = match.id and side_b.side = 'B'
  left join public.match_rally_effective rally on rally.match_id = match.id
  group by match.id, side_a.id, side_b.id, rule.points_to_win, rule.win_by, rule.max_points
)
select
  scores.*,
  (
    (score_a >= points_to_win and score_a - score_b >= win_by)
    or (max_points is not null and score_a >= max_points and score_a > score_b)
    or (score_b >= points_to_win and score_b - score_a >= win_by)
    or (max_points is not null and score_b >= max_points and score_b > score_a)
  ) as is_game_over,
  case
    when (score_a >= points_to_win and score_a - score_b >= win_by)
      or (max_points is not null and score_a >= max_points and score_a > score_b)
      then side_a_id
    when (score_b >= points_to_win and score_b - score_a >= win_by)
      or (max_points is not null and score_b >= max_points and score_b > score_a)
      then side_b_id
    else null
  end as winner_side_id
from scores;

create view public.match_technical_action_effective
with (security_invoker = true)
as
select distinct on (action.rally_id)
  action.*
from public.match_technical_actions action
order by action.rally_id, action.version_number desc, action.created_at desc;

create view public.match_game_points
with (security_invoker = true)
as
with running as (
  select
    rally.match_id,
    rally.id as rally_id,
    rally.rally_number,
    side_a.id as side_a_id,
    side_b.id as side_b_id,
    rule.points_to_win,
    rule.win_by,
    rule.max_points,
    count(*) filter (where rally.effective_winning_side_id = side_a.id) over (
      partition by rally.match_id order by rally.rally_number rows unbounded preceding
    )::integer as score_a,
    count(*) filter (where rally.effective_winning_side_id = side_b.id) over (
      partition by rally.match_id order by rally.rally_number rows unbounded preceding
    )::integer as score_b
  from public.match_rally_effective rally
  join public.match_scoring_rules rule on rule.match_id = rally.match_id
  join public.match_sides side_a on side_a.match_id = rally.match_id and side_a.side = 'A'
  join public.match_sides side_b on side_b.match_id = rally.match_id and side_b.side = 'B'
  where rally.effective_status in ('valid', 'corrected')
)
select distinct on (match_id)
  match_id,
  rally_id as game_point_rally_id,
  rally_number as game_point_rally_number,
  case when score_a > score_b then side_a_id else side_b_id end as winner_side_id,
  score_a,
  score_b
from running
where
  (score_a >= points_to_win and score_a - score_b >= win_by)
  or (max_points is not null and score_a >= max_points and score_a > score_b)
  or (score_b >= points_to_win and score_b - score_a >= win_by)
  or (max_points is not null and score_b >= max_points and score_b > score_a)
order by match_id, rally_number;

create view public.match_scoring_streaks
with (security_invoker = true)
as
with ordered as (
  select
    rally.match_id,
    rally.rally_number,
    rally.effective_winning_side_id,
    case
      when lag(rally.effective_winning_side_id) over (
        partition by rally.match_id order by rally.rally_number
      ) is distinct from rally.effective_winning_side_id then 1
      else 0
    end as changed
  from public.match_rally_effective rally
  where rally.effective_status in ('valid', 'corrected')
), grouped as (
  select
    ordered.*,
    sum(changed) over (partition by match_id order by rally_number) as streak_group
  from ordered
), runs as (
  select match_id, effective_winning_side_id, streak_group, count(*)::integer as streak_length
  from grouped
  group by match_id, effective_winning_side_id, streak_group
)
select
  match_id,
  max(streak_length) as max_streak,
  bool_or(streak_length >= 3) as has_streak_3,
  bool_or(streak_length >= 5) as has_streak_5
from runs
group by match_id;

create view public.match_athlete_statistics
with (security_invoker = true)
as
select
  participant.athlete_id,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
  )::integer as games_participated,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
      and participant.side_id = result.winner_side_id
  )::integer as wins,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
      and participant.side_id <> result.winner_side_id
  )::integer as losses,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'ace'
  )::integer as aces,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'attack'
  )::integer as attacks,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'block'
  )::integer as blocks,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'defense'
  )::integer as defenses,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'assist'
  )::integer as assists
from public.match_participants participant
left join public.match_results result on result.match_id = participant.match_id
left join public.match_technical_action_effective action
  on action.match_id = participant.match_id and action.athlete_id = participant.athlete_id
left join public.match_rally_effective rally
  on rally.id = action.rally_id
  and rally.effective_winning_side_id = action.side_id
  and rally.effective_status in ('valid', 'corrected')
where participant.status = 'active'
group by participant.athlete_id;

create view public.match_technical_summary
with (security_invoker = true)
as
select
  participant.match_id,
  participant.athlete_id,
  participant.side_id,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'ace')::integer as aces,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'attack')::integer as attacks,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'block')::integer as blocks,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'defense')::integer as defenses,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'assist')::integer as assists
from public.match_participants participant
left join public.match_technical_action_effective action
  on action.match_id = participant.match_id and action.athlete_id = participant.athlete_id
left join public.match_rally_effective rally
  on rally.id = action.rally_id
  and rally.effective_winning_side_id = action.side_id
  and rally.effective_status in ('valid', 'corrected')
where participant.status = 'active'
group by participant.match_id, participant.athlete_id, participant.side_id;

create or replace function private.can_score_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['admin']::public.app_role[])
    or exists (
      select 1
      from public.matches match
      join public.ur_play_session_staff staff on staff.session_id = match.session_id
      where match.id = target_match
        and staff.profile_id = auth.uid()
        and staff.role = 'operator'
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

create or replace function private.can_homologate_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['admin']::public.app_role[])
    or exists (
      select 1
      from public.matches match
      join public.ur_play_session_staff staff on staff.session_id = match.session_id
      where match.id = target_match
        and staff.profile_id = auth.uid()
        and staff.role = 'coordinator'
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

revoke all on function private.can_score_match(uuid) from public, anon;

revoke all on function private.can_homologate_match(uuid) from public, anon;

grant execute on function private.can_score_match(uuid) to authenticated;

grant execute on function private.can_homologate_match(uuid) to authenticated;

create or replace function private.reject_scoring_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'scoring history is append-only' using errcode = '42501';
end;
$$;

revoke all on function private.reject_scoring_event_mutation() from public, anon, authenticated;

create trigger match_rallies_append_only
before update or delete on public.match_rallies
for each row execute function private.reject_scoring_event_mutation();

create trigger match_rally_corrections_append_only
before update or delete on public.match_rally_corrections
for each row execute function private.reject_scoring_event_mutation();

create trigger match_technical_actions_append_only
before update or delete on public.match_technical_actions
for each row execute function private.reject_scoring_event_mutation();

create trigger match_result_versions_append_only
before update or delete on public.match_result_versions
for each row execute function private.reject_scoring_event_mutation();

create or replace function private.ensure_match_scoring_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.match_scoring_rules(match_id, created_by)
  values (new.id, new.created_by)
  on conflict (match_id) do nothing;
  return new;
end;
$$;

revoke all on function private.ensure_match_scoring_rule() from public, anon, authenticated;

create trigger matches_default_scoring_rule
after insert on public.matches
for each row execute function private.ensure_match_scoring_rule();

create or replace function private.freeze_match_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.match_status;
begin
  select status into current_status
  from public.matches
  where id = coalesce(new.match_id, old.match_id);
  if current_status in ('in_progress', 'pending_review', 'completed', 'abandoned') then
    raise exception 'match participants are frozen' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.validate_rally_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'valid' then
    raise exception 'new rally must be valid' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.match_sides side
    where side.id = new.winning_side_id and side.match_id = new.match_id
  ) then
    raise exception 'winning side does not belong to match' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_rally_insert() from public, anon, authenticated;

create trigger match_rallies_validate
before insert on public.match_rallies
for each row execute function private.validate_rally_insert();

create or replace function private.validate_rally_correction_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.match_rallies rally
    where rally.id = new.original_rally_id and rally.match_id = new.match_id
  ) then
    raise exception 'rally correction match mismatch' using errcode = '23514';
  end if;
  if new.replacement_winning_side_id is not null and not exists (
    select 1 from public.match_sides side
    where side.id = new.replacement_winning_side_id and side.match_id = new.match_id
  ) then
    raise exception 'replacement side does not belong to match' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_rally_correction_insert() from public, anon, authenticated;

create trigger match_rally_corrections_validate
before insert on public.match_rally_corrections
for each row execute function private.validate_rally_correction_insert();

create or replace function private.validate_technical_action_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rally_row public.match_rallies;
  effective_side uuid;
  previous_action public.match_technical_actions;
begin
  select * into rally_row from public.match_rallies where id = new.rally_id;
  if rally_row.id is null or rally_row.match_id <> new.match_id then
    raise exception 'technical action rally mismatch' using errcode = '23514';
  end if;
  select effective_winning_side_id into effective_side
  from public.match_rally_effective
  where id = new.rally_id;
  if effective_side is null then
    raise exception 'technical action requires a scoring rally' using errcode = '23514';
  end if;
  if new.status <> 'void' then
    if new.side_id <> effective_side then
      raise exception 'technical action athlete is on wrong side' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.match_participants participant
      where participant.match_id = new.match_id
        and participant.side_id = new.side_id
        and participant.athlete_id = new.athlete_id
        and participant.status = 'active'
    ) then
      raise exception 'active match participant required' using errcode = '23514';
    end if;
  end if;
  if new.version_number = 1 then
    if exists (select 1 from public.match_technical_actions where rally_id = new.rally_id) then
      raise exception 'rally already has a primary technical action' using errcode = '23505';
    end if;
  else
    select * into previous_action
    from public.match_technical_actions
    where id = new.supersedes_action_id;
    if previous_action.id is null
      or previous_action.rally_id <> new.rally_id
      or previous_action.version_number <> new.version_number - 1 then
      raise exception 'technical action correction chain is invalid' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_technical_action_insert() from public, anon, authenticated;

create trigger match_technical_actions_validate
before insert on public.match_technical_actions
for each row execute function private.validate_technical_action_insert();

create or replace function private.append_match_result_version(
  target_result public.match_results,
  reason text,
  operation_id uuid
)
returns public.match_result_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_version public.match_result_versions;
  next_version integer;
begin
  select * into result_version
  from public.match_result_versions
  where client_operation_id = operation_id;
  if found then return result_version; end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.match_result_versions
  where result_id = target_result.id;

  insert into public.match_result_versions(
    result_id, match_id, version_number, winner_side_id,
    score_a, score_b, result_status, reason, changed_by, client_operation_id
  ) values (
    target_result.id, target_result.match_id, next_version, target_result.winner_side_id,
    target_result.score_a, target_result.score_b, target_result.result_status,
    reason, auth.uid(), operation_id
  ) returning * into result_version;
  return result_version;
end;
$$;

revoke all on function private.append_match_result_version(public.match_results,text,uuid) from public, anon, authenticated;

create or replace function private.validate_match_result_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  score public.match_scoreboard;
begin
  if new.result_status = 'void' then return new; end if;
  select * into score from public.match_scoreboard where match_id = new.match_id;
  if score.match_id is null
    or new.score_a <> score.score_a
    or new.score_b <> score.score_b then
    raise exception 'result score is inconsistent with rallies' using errcode = '23514';
  end if;
  if new.result_status in ('provisional', 'under_review', 'homologated') then
    if not score.is_game_over or new.winner_side_id is distinct from score.winner_side_id then
      raise exception 'result winner is inconsistent with rallies' using errcode = '23514';
    end if;
  elsif score.is_game_over and new.winner_side_id is distinct from score.winner_side_id then
    raise exception 'corrected result winner is inconsistent with rallies' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_match_result_projection() from public, anon, authenticated;

create trigger match_results_validate_projection
before insert or update on public.match_results
for each row execute function private.validate_match_result_projection();

create or replace function private.release_match_queue_after_game(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_queue_entries queue
  set status = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then 'resting'::public.match_queue_status
        else 'waiting'::public.match_queue_status
      end,
      current_match_id = null,
      last_match_ended_at = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then now()
        else last_match_ended_at
      end,
      queued_at = now(),
      updated_at = now()
  where queue.current_match_id = target_match;
end;
$$;

create or replace function private.restore_match_queue_for_scoring(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_queue_entries queue
  set status = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then 'playing'::public.match_queue_status
        else 'assigned'::public.match_queue_status
      end,
      current_match_id = target_match,
      updated_at = now()
  where exists (
    select 1 from public.match_squad_members squad
    where squad.match_id = target_match
      and squad.athlete_id = queue.athlete_id
      and squad.status not in ('withdrawn', 'unavailable')
  ) or exists (
    select 1 from public.match_participants participant
    where participant.match_id = target_match
      and participant.athlete_id = queue.athlete_id
      and participant.status = 'active'
  );
end;
$$;

revoke all on function private.release_match_queue_after_game(uuid) from public, anon, authenticated;

revoke all on function private.restore_match_queue_for_scoring(uuid) from public, anon, authenticated;

create or replace function private.record_match_rally(
  target_match uuid,
  target_winning_side uuid,
  expected_rally_number integer,
  client_sequence integer,
  client_recorded_at timestamptz,
  operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  score public.match_scoreboard;
  result_row public.match_results;
begin
  select * into rally_row
  from public.match_rallies
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = rally_row.match_id;
    return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
  end if;

  select * into match_row from public.matches where id = target_match for update;
  if match_row.id is null then raise exception 'match not found' using errcode = 'P0002'; end if;
  if not private.can_score_match(match_row.id) then
    raise exception 'scoring operation denied' using errcode = '42501';
  end if;

  select * into rally_row
  from public.match_rallies
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = rally_row.match_id;
    return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
  end if;

  if match_row.status <> 'in_progress' then
    raise exception 'match is not accepting rallies' using errcode = '23514';
  end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.match_id is null then raise exception 'scoring rule not found' using errcode = 'P0002'; end if;
  if score.is_game_over then raise exception 'game is already over' using errcode = '23514'; end if;
  if expected_rally_number <> score.next_rally_number then
    raise exception 'stale rally sequence' using errcode = 'P0001';
  end if;
  if client_sequence <> expected_rally_number then
    raise exception 'client sequence mismatch' using errcode = '23514';
  end if;

  insert into public.match_rallies(
    match_id, rally_number, client_sequence, winning_side_id,
    client_recorded_at, recorded_by, client_operation_id
  ) values (
    match_row.id, expected_rally_number, client_sequence, target_winning_side,
    client_recorded_at, auth.uid(), operation_id
  ) returning * into rally_row;

  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.is_game_over then
    insert into public.match_results(
      match_id, winner_side_id, score_a, score_b, result_status
    ) values (
      match_row.id, score.winner_side_id, score.score_a, score.score_b, 'provisional'
    )
    on conflict (match_id) do update
    set winner_side_id = excluded.winner_side_id,
        score_a = excluded.score_a,
        score_b = excluded.score_b,
        result_status = 'provisional',
        homologated_by = null,
        homologated_at = null,
        correction_reason = null,
        updated_at = now()
    returning * into result_row;

    update public.matches
    set status = 'pending_review',
        winner_side_id = score.winner_side_id,
        final_score_a = score.score_a,
        final_score_b = score.score_b,
        ready_for_scoring = false,
        ended_at = now(),
        updated_at = now()
    where id = match_row.id;

    perform private.release_match_queue_after_game(match_row.id);
    perform private.append_match_result_version(result_row, 'Game point recorded', operation_id);
  end if;

  return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
end;
$$;

revoke all on function private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) from public, anon;

grant execute on function private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) to authenticated;

create or replace function public.record_match_rally(
  target_match uuid,
  target_winning_side uuid,
  expected_rally_number integer,
  client_sequence integer,
  client_recorded_at timestamptz,
  operation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.record_match_rally(
    target_match, target_winning_side, expected_rally_number,
    client_sequence, client_recorded_at, operation_id
  )
$$;

revoke all on function public.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) from public, anon;

grant execute on function public.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) to authenticated;

create or replace function private.correct_match_rally(
  target_rally uuid,
  target_correction public.match_rally_correction_type,
  replacement_winning_side uuid,
  reason text,
  operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  correction_row public.match_rally_corrections;
  score public.match_scoreboard;
  result_row public.match_results;
  post_homologation_review boolean := false;
begin
  select * into correction_row
  from public.match_rally_corrections
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = correction_row.match_id;
    return jsonb_build_object('correction', to_jsonb(correction_row), 'scoreboard', to_jsonb(score));
  end if;

  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;
  select * into result_row from public.match_results where match_id = match_row.id for update;

  post_homologation_review := result_row.result_status = 'under_review' and exists (
    select 1 from public.match_result_correction_requests request
    where request.match_id = match_row.id and request.status = 'requested'
  );
  if post_homologation_review then
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'admin correction required' using errcode = '42501';
    end if;
  elsif not private.can_score_match(match_row.id) then
    raise exception 'rally correction denied' using errcode = '42501';
  end if;
  if result_row.result_status = 'homologated' then
    raise exception 'request correction before editing homologated result' using errcode = '23514';
  end if;
  if match_row.status not in ('in_progress', 'pending_review') then
    raise exception 'match is not open for correction' using errcode = '23514';
  end if;
  if target_correction = 'technical_action_correction' then
    raise exception 'use technical action correction flow' using errcode = '23514';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'correction reason required' using errcode = '23514';
  end if;

  insert into public.match_rally_corrections(
    match_id, original_rally_id, correction_type, replacement_winning_side_id,
    reason, corrected_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, target_correction, replacement_winning_side,
    reason, auth.uid(), operation_id
  ) returning * into correction_row;

  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.is_game_over then
    insert into public.match_results(
      match_id, winner_side_id, score_a, score_b, result_status, correction_reason
    ) values (
      match_row.id, score.winner_side_id, score.score_a, score.score_b,
      case when post_homologation_review
        then 'under_review'::public.match_result_status
        else 'corrected'::public.match_result_status end,
      reason
    )
    on conflict (match_id) do update
    set winner_side_id = excluded.winner_side_id,
        score_a = excluded.score_a,
        score_b = excluded.score_b,
        result_status = excluded.result_status,
        correction_reason = excluded.correction_reason,
        updated_at = now()
    returning * into result_row;
    update public.matches
    set status = 'pending_review', winner_side_id = score.winner_side_id,
        final_score_a = score.score_a, final_score_b = score.score_b,
        ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
    where id = match_row.id;
    perform private.release_match_queue_after_game(match_row.id);
  else
    if result_row.id is not null then
      update public.match_results
      set winner_side_id = null, score_a = score.score_a, score_b = score.score_b,
          result_status = 'corrected', correction_reason = reason, updated_at = now()
      where id = result_row.id
      returning * into result_row;
    end if;
    update public.matches
    set status = 'in_progress', winner_side_id = null,
        final_score_a = null, final_score_b = null,
        ready_for_scoring = true, ended_at = null, updated_at = now()
    where id = match_row.id;
    perform private.restore_match_queue_for_scoring(match_row.id);
  end if;

  if result_row.id is not null then
    perform private.append_match_result_version(result_row, reason, operation_id);
  end if;
  if post_homologation_review then
    update public.match_result_correction_requests
    set status = 'applied', resolved_by = auth.uid(), resolved_at = now()
    where match_id = match_row.id and status = 'requested';
  end if;

  return jsonb_build_object('correction', to_jsonb(correction_row), 'scoreboard', to_jsonb(score));
end;
$$;

revoke all on function private.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) from public, anon;

grant execute on function private.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) to authenticated;

create or replace function public.correct_match_rally(
  target_rally uuid,
  target_correction public.match_rally_correction_type,
  replacement_winning_side uuid,
  reason text,
  operation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.correct_match_rally(
    target_rally, target_correction, replacement_winning_side, reason, operation_id
  )
$$;

revoke all on function public.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) from public, anon;

grant execute on function public.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) to authenticated;

create or replace function private.record_match_technical_action(
  target_rally uuid,
  target_athlete uuid,
  target_action public.match_technical_action_type,
  correction_reason text,
  operation_id uuid
)
returns public.match_technical_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  action_row public.match_technical_actions;
  previous_action public.match_technical_actions;
  participant_side uuid;
  post_homologation_review boolean := false;
  latest_rally_number integer;
begin
  select * into action_row
  from public.match_technical_actions
  where client_operation_id = operation_id;
  if found then return action_row; end if;

  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;

  post_homologation_review := exists (
    select 1
    from public.match_results result
    join public.match_result_correction_requests request on request.result_id = result.id
    where result.match_id = match_row.id
      and result.result_status = 'under_review'
      and request.status = 'requested'
  );
  if post_homologation_review then
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'admin technical correction required' using errcode = '42501';
    end if;
  elsif not private.can_score_match(match_row.id) then
    raise exception 'technical action denied' using errcode = '42501';
  end if;
  if match_row.status not in ('in_progress', 'pending_review') then
    raise exception 'match is not accepting technical actions' using errcode = '23514';
  end if;

  select participant.side_id into participant_side
  from public.match_participants participant
  where participant.match_id = match_row.id
    and participant.athlete_id = target_athlete
    and participant.status = 'active';
  if participant_side is null then
    raise exception 'active match participant required' using errcode = '23514';
  end if;

  select * into previous_action
  from public.match_technical_actions
  where rally_id = rally_row.id
  order by version_number desc
  limit 1
  for update;

  select max(rally_number) into latest_rally_number
  from public.match_rallies
  where match_id = match_row.id;
  if (previous_action.id is not null or rally_row.rally_number < latest_rally_number)
    and coalesce(char_length(trim(correction_reason)), 0) < 5 then
    raise exception 'technical correction reason required' using errcode = '23514';
  end if;

  if previous_action.id is not null or rally_row.rally_number < latest_rally_number then
    insert into public.match_rally_corrections(
      match_id, original_rally_id, correction_type, reason,
      corrected_by, client_operation_id
    ) values (
      match_row.id, rally_row.id, 'technical_action_correction', correction_reason,
      auth.uid(), operation_id
    );
  end if;

  insert into public.match_technical_actions(
    match_id, rally_id, version_number, athlete_id, side_id, action_type,
    status, supersedes_action_id, correction_reason, recorded_by, client_operation_id
  ) values (
    match_row.id,
    rally_row.id,
    coalesce(previous_action.version_number, 0) + 1,
    target_athlete,
    participant_side,
    target_action,
    case when previous_action.id is null
      then 'valid'::public.match_technical_action_status
      else 'corrected'::public.match_technical_action_status end,
    previous_action.id,
    case when previous_action.id is null then null else correction_reason end,
    auth.uid(),
    operation_id
  ) returning * into action_row;

  if post_homologation_review then
    update public.match_result_correction_requests
    set status = 'applied', resolved_by = auth.uid(), resolved_at = now()
    where match_id = match_row.id and status = 'requested';
  end if;
  return action_row;
end;
$$;

revoke all on function private.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) from public, anon;

grant execute on function private.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) to authenticated;

create or replace function public.record_match_technical_action(
  target_rally uuid,
  target_athlete uuid,
  target_action public.match_technical_action_type,
  correction_reason text,
  operation_id uuid
)
returns public.match_technical_actions
language sql
security invoker
set search_path = ''
as $$
  select private.record_match_technical_action(
    target_rally, target_athlete, target_action, correction_reason, operation_id
  )
$$;

revoke all on function public.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) from public, anon;

grant execute on function public.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) to authenticated;

create or replace function private.void_match_technical_action(
  target_rally uuid,
  reason text,
  operation_id uuid
)
returns public.match_technical_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  action_row public.match_technical_actions;
  previous_action public.match_technical_actions;
begin
  select * into action_row from public.match_technical_actions where client_operation_id = operation_id;
  if found then return action_row; end if;
  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;
  if not private.can_score_match(match_row.id)
    and not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'technical action correction denied' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'technical correction reason required' using errcode = '23514';
  end if;
  select * into previous_action
  from public.match_technical_actions
  where rally_id = rally_row.id
  order by version_number desc
  limit 1
  for update;
  if previous_action.id is null or previous_action.status = 'void' then
    raise exception 'active technical action not found' using errcode = 'P0002';
  end if;
  insert into public.match_rally_corrections(
    match_id, original_rally_id, correction_type, reason,
    corrected_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, 'technical_action_correction', reason,
    auth.uid(), operation_id
  );
  insert into public.match_technical_actions(
    match_id, rally_id, version_number, status, supersedes_action_id,
    correction_reason, recorded_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, previous_action.version_number + 1,
    'void', previous_action.id, reason, auth.uid(), operation_id
  ) returning * into action_row;
  return action_row;
end;
$$;

revoke all on function private.void_match_technical_action(uuid,text,uuid) from public, anon;

grant execute on function private.void_match_technical_action(uuid,text,uuid) to authenticated;

create or replace function public.void_match_technical_action(
  target_rally uuid,
  reason text,
  operation_id uuid
)
returns public.match_technical_actions
language sql
security invoker
set search_path = ''
as $$ select private.void_match_technical_action(target_rally, reason, operation_id) $$;

revoke all on function public.void_match_technical_action(uuid,text,uuid) from public, anon;

grant execute on function public.void_match_technical_action(uuid,text,uuid) to authenticated;

create or replace function private.submit_match_for_review(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_score_match(match_row.id) then raise exception 'review submission denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  if match_row.status <> 'pending_review' or result_row.result_status not in ('provisional', 'corrected') then
    raise exception 'provisional result required' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'under_review', updated_at = now()
  where id = result_row.id
  returning * into result_row;
  perform private.append_match_result_version(result_row, 'Submitted for review', operation_id);
  return result_row;
end;
$$;

revoke all on function private.submit_match_for_review(uuid,uuid) from public, anon;

grant execute on function private.submit_match_for_review(uuid,uuid) to authenticated;

create or replace function public.submit_match_for_review(target_match uuid, operation_id uuid)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.submit_match_for_review(target_match, operation_id) $$;

revoke all on function public.submit_match_for_review(uuid,uuid) from public, anon;

grant execute on function public.submit_match_for_review(uuid,uuid) to authenticated;

create or replace function private.homologate_match_result(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_homologate_match(match_row.id) then raise exception 'homologation denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if match_row.status <> 'pending_review' or result_row.result_status <> 'under_review' then
    raise exception 'result under review required' using errcode = '23514';
  end if;
  if not score.is_game_over
    or result_row.score_a <> score.score_a
    or result_row.score_b <> score.score_b
    or result_row.winner_side_id is distinct from score.winner_side_id then
    raise exception 'result is inconsistent with rallies' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'homologated', homologated_by = auth.uid(),
      homologated_at = now(), updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = score.winner_side_id,
      final_score_a = score.score_a, final_score_b = score.score_b,
      ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, 'Result homologated', operation_id);
  return result_row;
end;
$$;

revoke all on function private.homologate_match_result(uuid,uuid) from public, anon;

grant execute on function private.homologate_match_result(uuid,uuid) to authenticated;

create or replace function public.homologate_match_result(target_match uuid, operation_id uuid)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.homologate_match_result(target_match, operation_id) $$;

revoke all on function public.homologate_match_result(uuid,uuid) from public, anon;

grant execute on function public.homologate_match_result(uuid,uuid) to authenticated;

create or replace function private.request_match_result_correction(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_result_correction_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  request_row public.match_result_correction_requests;
begin
  select * into request_row
  from public.match_result_correction_requests
  where client_operation_id = operation_id;
  if found then return request_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin correction request required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'correction request reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  if match_row.status <> 'completed' or result_row.result_status <> 'homologated' then
    raise exception 'homologated result required' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.match_result_correction_requests
    where match_id = match_row.id and status = 'requested'
  ) then
    raise exception 'correction request already open' using errcode = '23505';
  end if;
  insert into public.match_result_correction_requests(
    result_id, match_id, reason, requested_by, client_operation_id
  ) values (
    result_row.id, match_row.id, reason, auth.uid(), operation_id
  ) returning * into request_row;
  update public.match_results
  set result_status = 'under_review', correction_reason = reason,
      homologated_by = null, homologated_at = null, updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'pending_review', updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, reason, operation_id);
  return request_row;
end;
$$;

revoke all on function private.request_match_result_correction(uuid,text,uuid) from public, anon;

grant execute on function private.request_match_result_correction(uuid,text,uuid) to authenticated;

create or replace function public.request_match_result_correction(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_result_correction_requests
language sql
security invoker
set search_path = ''
as $$ select private.request_match_result_correction(target_match, reason, operation_id) $$;

revoke all on function public.request_match_result_correction(uuid,text,uuid) from public, anon;

grant execute on function public.request_match_result_correction(uuid,text,uuid) to authenticated;

create or replace function private.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin void required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'void reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if match_row.status = 'cancelled' then raise exception 'cancelled match cannot be voided' using errcode = '23514'; end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  insert into public.match_results(
    match_id, winner_side_id, score_a, score_b, result_status, correction_reason
  ) values (
    match_row.id, null, coalesce(score.score_a, 0), coalesce(score.score_b, 0), 'void', reason
  )
  on conflict (match_id) do update
  set winner_side_id = null,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      result_status = 'void',
      homologated_by = null,
      homologated_at = null,
      correction_reason = excluded.correction_reason,
      updated_at = now()
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = null,
      final_score_a = coalesce(score.score_a, 0),
      final_score_b = coalesce(score.score_b, 0),
      ready_for_scoring = false,
      voided_at = now(), void_reason = reason,
      ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.release_match_queue_after_game(match_row.id);
  perform private.append_match_result_version(result_row, reason, operation_id);
  return result_row;
end;
$$;

revoke all on function private.void_match_result(uuid,text,uuid) from public, anon;

grant execute on function private.void_match_result(uuid,text,uuid) to authenticated;

create or replace function public.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.void_match_result(target_match, reason, operation_id) $$;

revoke all on function public.void_match_result(uuid,text,uuid) from public, anon;

grant execute on function public.void_match_result(uuid,text,uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'match_scoring_rules',
    'match_rallies',
    'match_rally_corrections',
    'match_technical_actions',
    'match_results',
    'match_result_versions',
    'match_result_correction_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

create policy match_scoring_rules_read
on public.match_scoring_rules for select to authenticated
using (private.can_read_match(match_id));

create policy match_rallies_read
on public.match_rallies for select to authenticated
using (private.can_read_match(match_id));

create policy match_rally_corrections_read
on public.match_rally_corrections for select to authenticated
using (private.can_read_match(match_id));

create policy match_technical_actions_read
on public.match_technical_actions for select to authenticated
using (private.can_read_match(match_id));

create policy match_results_read
on public.match_results for select to authenticated
using (private.can_read_match(match_id));

create policy match_result_versions_read
on public.match_result_versions for select to authenticated
using (private.can_read_match(match_id));

create policy match_result_correction_requests_read
on public.match_result_correction_requests for select to authenticated
using (private.can_read_match(match_id));

grant select on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
to authenticated;

grant select on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
to authenticated;

grant all on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
to service_role;

grant select on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
to service_role;

revoke all on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
from anon;

revoke all on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
from anon;

do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid)'::regprocedure
  ) into definition;
  definition := replace(
    definition,
    'errcode = ''40001''',
    'errcode = ''P0001'''
  );
  if definition not like '%errcode = ''P0001''%' then
    raise exception 'record_match_rally stale sequence guard was not replaced';
  end if;
  execute definition;
end;
$$;

create index matches_winner_side on public.matches(winner_side_id)
where winner_side_id is not null;

create index match_scoring_rules_created_by on public.match_scoring_rules(created_by);

create index match_rallies_winning_side on public.match_rallies(winning_side_id);

create index match_rallies_recorded_by on public.match_rallies(recorded_by);

create index match_rally_corrections_replacement_side
on public.match_rally_corrections(replacement_winning_side_id)
where replacement_winning_side_id is not null;

create index match_rally_corrections_corrected_by
on public.match_rally_corrections(corrected_by);

create index match_technical_actions_side on public.match_technical_actions(side_id)
where side_id is not null;

create index match_technical_actions_supersedes
on public.match_technical_actions(supersedes_action_id)
where supersedes_action_id is not null;

create index match_technical_actions_recorded_by
on public.match_technical_actions(recorded_by);

create index match_results_winner_side on public.match_results(winner_side_id)
where winner_side_id is not null;

create index match_results_homologated_by on public.match_results(homologated_by)
where homologated_by is not null;

create index match_result_versions_winner_side
on public.match_result_versions(winner_side_id)
where winner_side_id is not null;

create index match_result_versions_changed_by
on public.match_result_versions(changed_by);

create index match_result_correction_requests_result
on public.match_result_correction_requests(result_id);

create index match_result_correction_requests_requested_by
on public.match_result_correction_requests(requested_by);

create index match_result_correction_requests_resolved_by
on public.match_result_correction_requests(resolved_by)
where resolved_by is not null;

create type public.ranking_transaction_type as enum ('earn', 'penalty', 'reversal', 'correction');

create type public.ranking_transaction_status as enum ('pending', 'homologated', 'reversed', 'void');

create type public.ranking_transaction_scope as enum ('athlete', 'side', 'team');

create type public.ranking_source_type as enum (
  'match_result',
  'match_participant',
  'technical_action',
  'rally',
  'recognition',
  'disciplinary_event',
  'ranking_transaction'
);

create type public.ranking_point_category as enum ('participation', 'result', 'technical', 'bonus', 'penalty');

create type public.ranking_processing_status as enum ('pending', 'processing', 'completed', 'failed', 'superseded');

create type public.match_recognition_type as enum ('mvp', 'fair_play', 'highlight', 'hunter');

create type public.merit_event_status as enum ('pending', 'homologated', 'void');

create type public.disciplinary_event_type as enum ('yellow_card', 'red_card');

create table public.ranking_rules (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  rule_code text not null check (rule_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null check (char_length(trim(description)) between 5 and 500),
  event_context public.match_event_context,
  transaction_scope public.ranking_transaction_scope not null default 'athlete',
  point_category public.ranking_point_category not null,
  points integer not null,
  active boolean not null default true,
  valid_from timestamptz not null,
  valid_until timestamptz,
  version integer not null check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint ranking_rules_period check (valid_until is null or valid_until > valid_from),
  unique nulls not distinct (season_id, rule_code, event_context, version)
);

create table public.ranking_processing_runs (
  id uuid primary key default gen_random_uuid(),
  source_type public.ranking_source_type not null,
  source_id uuid not null,
  status public.ranking_processing_status not null default 'pending',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  input_fingerprint text,
  client_operation_id uuid unique,
  created_by uuid references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  constraint ranking_processing_completion check (
    (status in ('completed', 'failed', 'superseded') and completed_at is not null)
    or (status in ('pending', 'processing') and completed_at is null)
  )
);

create table public.ranking_transactions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  season_cycle_id uuid references public.season_cycles(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  roster_id uuid references public.team_rosters(id) on delete restrict,
  match_side_id uuid references public.match_sides(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  session_id uuid references public.ur_play_sessions(id) on delete restrict,
  source_type public.ranking_source_type not null,
  source_id uuid not null,
  rule_id uuid not null references public.ranking_rules(id) on delete restrict,
  rule_code text not null,
  rule_version integer not null check (rule_version > 0),
  points integer not null,
  points_applied integer not null,
  transaction_type public.ranking_transaction_type not null,
  transaction_scope public.ranking_transaction_scope not null,
  status public.ranking_transaction_status not null,
  event_context public.match_event_context not null,
  event_context_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  related_transaction_id uuid references public.ranking_transactions(id) on delete restrict,
  processing_run_id uuid not null references public.ranking_processing_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  homologated_by uuid references public.profiles(id) on delete restrict,
  client_operation_id uuid,
  constraint ranking_transaction_target check (
    (transaction_scope = 'athlete' and athlete_id is not null)
    or (transaction_scope = 'side' and match_side_id is not null)
    or (transaction_scope = 'team' and team_id is not null)
  ),
  constraint ranking_transaction_points_frozen check (points = points_applied),
  constraint ranking_transaction_homologation check (
    (status = 'homologated' and homologated_at is not null and homologated_by is not null)
    or status <> 'homologated'
  ),
  constraint ranking_transaction_relation check (
    (transaction_type = 'reversal' and related_transaction_id is not null)
    or (transaction_type <> 'reversal' and related_transaction_id is null)
  ),
  unique nulls not distinct (
    processing_run_id, source_type, source_id, athlete_id, match_side_id, rule_code, transaction_type
  )
);

create unique index ranking_transactions_one_reversal
on public.ranking_transactions(related_transaction_id)
where transaction_type = 'reversal';

create table public.match_recognitions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  recognition_type public.match_recognition_type not null,
  status public.merit_event_status not null default 'pending',
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid unique,
  constraint match_recognition_homologation check (
    (status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or status <> 'homologated'
  ),
  unique (match_id, athlete_id, recognition_type)
);

create table public.disciplinary_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  session_id uuid references public.ur_play_sessions(id) on delete restrict,
  event_type public.disciplinary_event_type not null,
  status public.merit_event_status not null default 'pending',
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid unique,
  constraint disciplinary_event_source check (match_id is not null or session_id is not null),
  constraint disciplinary_event_homologation check (
    (status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or status <> 'homologated'
  )
);

create index ranking_rules_lookup
on public.ranking_rules(rule_code, event_context, season_id, active, valid_from desc, version desc);

create index ranking_processing_source
on public.ranking_processing_runs(source_type, source_id, started_at desc);

create index ranking_processing_status
on public.ranking_processing_runs(status, started_at desc);

create index ranking_transactions_athlete_season
on public.ranking_transactions(athlete_id, season_id, created_at desc)
where athlete_id is not null;

create index ranking_transactions_team_season
on public.ranking_transactions(team_id, season_id, created_at desc)
where team_id is not null;

create index ranking_transactions_pole_season
on public.ranking_transactions(pole_id, season_id, created_at desc)
where pole_id is not null;

create index ranking_transactions_source
on public.ranking_transactions(source_type, source_id);

create index ranking_transactions_match
on public.ranking_transactions(match_id, created_at desc)
where match_id is not null;

create index ranking_transactions_rule
on public.ranking_transactions(rule_id);

create index ranking_transactions_status_created
on public.ranking_transactions(status, created_at desc);

create index ranking_transactions_processing_run
on public.ranking_transactions(processing_run_id);

create index ranking_transactions_season_cycle
on public.ranking_transactions(season_cycle_id)
where season_cycle_id is not null;

create index ranking_transactions_roster
on public.ranking_transactions(roster_id)
where roster_id is not null;

create index ranking_transactions_match_side
on public.ranking_transactions(match_side_id)
where match_side_id is not null;

create index ranking_transactions_related
on public.ranking_transactions(related_transaction_id)
where related_transaction_id is not null;

create index match_recognitions_match on public.match_recognitions(match_id, status);

create index match_recognitions_athlete on public.match_recognitions(athlete_id, created_at desc);

create index disciplinary_events_athlete on public.disciplinary_events(athlete_id, created_at desc);

create index disciplinary_events_match on public.disciplinary_events(match_id) where match_id is not null;

create index disciplinary_events_session on public.disciplinary_events(session_id) where session_id is not null;

create or replace function private.reject_ranking_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'ranking ledger is append-only; use reversal or correction' using errcode = '55000';
end;
$$;

revoke all on function private.reject_ranking_transaction_mutation() from public, anon, authenticated;

create trigger ranking_transactions_append_only
before update or delete on public.ranking_transactions
for each row execute function private.reject_ranking_transaction_mutation();

create or replace function private.protect_ranking_rule_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ranking rules are versioned and cannot be deleted' using errcode = '55000';
  end if;
  if exists (select 1 from public.ranking_transactions where rule_id = old.id) and (
    new.rule_code is distinct from old.rule_code
    or new.season_id is distinct from old.season_id
    or new.event_context is distinct from old.event_context
    or new.transaction_scope is distinct from old.transaction_scope
    or new.point_category is distinct from old.point_category
    or new.points is distinct from old.points
    or new.valid_from is distinct from old.valid_from
    or new.version is distinct from old.version
  ) then
    raise exception 'referenced ranking rule is frozen; create a new version' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_ranking_rule_history() from public, anon, authenticated;

create trigger ranking_rules_protect_history
before update or delete on public.ranking_rules
for each row execute function private.protect_ranking_rule_history();

create or replace function private.resolve_ranking_rule(
  target_season uuid,
  target_rule_code text,
  target_context public.match_event_context,
  occurred_at timestamptz
)
returns public.ranking_rules
language sql
stable
security definer
set search_path = ''
as $$
  select rule.*
  from public.ranking_rules rule
  where rule.rule_code = target_rule_code
    and rule.active
    and (rule.season_id = target_season or rule.season_id is null)
    and (rule.event_context = target_context or rule.event_context is null)
    and rule.valid_from <= occurred_at
    and (rule.valid_until is null or rule.valid_until > occurred_at)
  order by
    (rule.season_id is not null) desc,
    (rule.event_context is not null) desc,
    rule.valid_from desc,
    rule.version desc
  limit 1;
$$;

revoke all on function private.resolve_ranking_rule(uuid,text,public.match_event_context,timestamptz)
from public, anon, authenticated;

create or replace function private.process_homologated_match(
  target_match uuid,
  operation_id uuid
)
returns public.ranking_processing_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  session_row public.ur_play_sessions;
  run_row public.ranking_processing_runs;
  previous_run public.ranking_processing_runs;
  rule_row public.ranking_rules;
  participant record;
  action_row record;
  game_point record;
  fingerprint text;
  inserted_count integer := 0;
  reversed_count integer := 0;
  event_time timestamptz;
  result_version integer;
begin
  if not private.can_homologate_match(target_match) then
    raise exception 'ranking processing denied' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranking:' || target_match::text, 0));
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = target_match for update;
  if result_row.result_status <> 'homologated' then
    raise exception 'homologated match result required' using errcode = '23514';
  end if;
  if match_row.event_context <> 'ur_play' then
    raise exception 'only UR Play ranking processing is operational' using errcode = '0A000';
  end if;
  select * into session_row from public.ur_play_sessions where id = match_row.session_id;
  event_time := coalesce(result_row.homologated_at, match_row.ended_at, now());
  select coalesce(max(version_number), 0) into result_version
  from public.match_result_versions where match_id = target_match;
  select md5(concat_ws('|',
    result_row.id::text, result_row.result_status::text,
    coalesce(result_row.winner_side_id::text, ''), result_row.score_a::text, result_row.score_b::text,
    result_version::text,
    coalesce((select string_agg(concat_ws(':', id, athlete_id, side_id, team_snapshot_id, pole_snapshot_id, status), ',' order by id)
      from public.match_participants where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, rally_id, athlete_id, side_id, action_type, status, version_number), ',' order by id)
      from public.match_technical_action_effective where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, effective_winning_side_id, effective_status), ',' order by rally_number)
      from public.match_rally_effective where match_id = target_match), '')
  )) into fingerprint;
  select * into run_row from public.ranking_processing_runs where client_operation_id = operation_id;
  if found then return run_row; end if;
  select * into previous_run
  from public.ranking_processing_runs
  where source_type = 'match_result' and source_id = target_match and status = 'completed'
  order by completed_at desc limit 1;
  if previous_run.input_fingerprint = fingerprint then
    insert into public.ranking_processing_runs(
      source_type, source_id, status, completed_at, input_fingerprint,
      client_operation_id, created_by, metadata
    ) values (
      'match_result', target_match, 'completed', now(), fingerprint,
      operation_id, auth.uid(), jsonb_build_object('no_op', true, 'reason', 'unchanged_input')
    ) returning * into run_row;
    return run_row;
  end if;
  insert into public.ranking_processing_runs(
    source_type, source_id, status, input_fingerprint, client_operation_id, created_by,
    metadata
  ) values (
    'match_result', target_match, 'processing', fingerprint, operation_id, auth.uid(),
    jsonb_build_object('result_version', result_version)
  ) returning * into run_row;

  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
    match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
    points, points_applied, transaction_type, transaction_scope, status, event_context,
    event_context_data, metadata, related_transaction_id, processing_run_id,
    created_by, homologated_at, homologated_by
  )
  select
    old.season_id, old.season_cycle_id, old.athlete_id, old.team_id, old.pole_id, old.roster_id,
    old.match_side_id, old.match_id, old.session_id, 'ranking_transaction', old.id,
    old.rule_id, old.rule_code, old.rule_version, -old.points, -old.points_applied,
    'reversal', old.transaction_scope, 'homologated', old.event_context,
    old.event_context_data,
    old.metadata || jsonb_build_object('reversal_reason', 'match_reprocessed', 'original_transaction_id', old.id),
    old.id, run_row.id, auth.uid(), event_time, result_row.homologated_by
  from public.ranking_transactions old
  where old.match_id = target_match
    and old.transaction_type <> 'reversal'
    and not exists (
      select 1 from public.ranking_transactions reversal
      where reversal.related_transaction_id = old.id and reversal.transaction_type = 'reversal'
    );
  get diagnostics reversed_count = row_count;

  for participant in
    select p.*, side.roster_id
    from public.match_participants p
    join public.match_sides side on side.id = p.side_id
    where p.match_id = target_match and p.status = 'active'
  loop
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'PARTICIPATION', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant.athlete_id,
        participant.team_snapshot_id, participant.pole_snapshot_id, participant.roster_id, participant.side_id,
        target_match, match_row.session_id, 'match_participant', participant.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code),
        jsonb_build_object('category', rule_row.point_category, 'participation_role', participant.participation_role),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case when participant.side_id = result_row.winner_side_id then 'WIN' else 'LOSS' end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant.athlete_id,
        participant.team_snapshot_id, participant.pole_snapshot_id, participant.roster_id, participant.side_id,
        target_match, match_row.session_id, 'match_result', result_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'winner_side_id', result_row.winner_side_id),
        jsonb_build_object('category', rule_row.point_category),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  for action_row in
    select action.*, participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
    from public.match_technical_action_effective action
    join public.match_rally_effective rally on rally.id = action.rally_id
      and rally.effective_status in ('valid', 'corrected')
      and rally.effective_winning_side_id = action.side_id
    join public.match_participants participant on participant.match_id = action.match_id
      and participant.athlete_id = action.athlete_id and participant.status = 'active'
    join public.match_sides side on side.id = participant.side_id
    where action.match_id = target_match and action.status <> 'void'
  loop
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case action_row.action_type
        when 'ace' then 'ACE'
        when 'attack' then 'ATTACK'
        when 'block' then 'BLOCK'
        when 'defense' then 'DEFENSE'
        when 'assist' then 'ASSIST'
      end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, action_row.athlete_id,
        action_row.team_snapshot_id, action_row.pole_snapshot_id, action_row.roster_id, action_row.side_id,
        target_match, match_row.session_id, 'technical_action', action_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_id', action_row.rally_id),
        jsonb_build_object('category', rule_row.point_category, 'action_type', action_row.action_type),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  select game.*, action.id as action_id, action.athlete_id, action.side_id,
    participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
  into game_point
  from public.match_game_points game
  join public.match_technical_action_effective action on action.rally_id = game.game_point_rally_id
    and action.status <> 'void' and action.side_id = game.winner_side_id
  join public.match_participants participant on participant.match_id = game.match_id
    and participant.athlete_id = action.athlete_id and participant.status = 'active'
  join public.match_sides side on side.id = participant.side_id
  where game.match_id = target_match;
  if found then
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'GAME_POINT', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, game_point.athlete_id,
        game_point.team_snapshot_id, game_point.pole_snapshot_id, game_point.roster_id, game_point.side_id,
        target_match, match_row.session_id, 'rally', game_point.game_point_rally_id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_number', game_point.game_point_rally_number),
        jsonb_build_object('category', rule_row.point_category, 'target_action_id', game_point.action_id),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end if;

  update public.ranking_processing_runs
  set status = 'completed', completed_at = now(),
      transaction_count = reversed_count + inserted_count,
      metadata = metadata || jsonb_build_object(
        'reversal_count', reversed_count,
        'generated_count', inserted_count,
        'streak_bonus_mode', 'highest_only',
        'collective_streak_distribution', 'disabled'
      )
  where id = run_row.id
  returning * into run_row;
  return run_row;
end;
$$;

revoke all on function private.process_homologated_match(uuid,uuid) from public, anon;

grant execute on function private.process_homologated_match(uuid,uuid) to authenticated;

create or replace function public.process_homologated_match(target_match uuid, operation_id uuid)
returns public.ranking_processing_runs
language sql
security invoker
set search_path = ''
as $$ select private.process_homologated_match(target_match, operation_id) $$;

revoke all on function public.process_homologated_match(uuid,uuid) from public, anon;

grant execute on function public.process_homologated_match(uuid,uuid) to authenticated;

create or replace function private.reverse_ranking_for_void(target_match uuid, operation_id uuid)
returns public.ranking_processing_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  run_row public.ranking_processing_runs;
  reversed_count integer;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin ranking reversal required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranking:' || target_match::text, 0));
  select * into run_row from public.ranking_processing_runs where client_operation_id = operation_id;
  if found then return run_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = target_match for update;
  if result_row.result_status <> 'void' then
    raise exception 'void match result required' using errcode = '23514';
  end if;
  insert into public.ranking_processing_runs(
    source_type, source_id, status, input_fingerprint, client_operation_id, created_by, metadata
  ) values (
    'match_result', target_match, 'processing', md5('void:' || target_match::text || ':' || result_row.updated_at::text),
    operation_id, auth.uid(), jsonb_build_object('reason', result_row.correction_reason)
  ) returning * into run_row;
  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
    match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
    points, points_applied, transaction_type, transaction_scope, status, event_context,
    event_context_data, metadata, related_transaction_id, processing_run_id,
    created_by, homologated_at, homologated_by
  )
  select
    old.season_id, old.season_cycle_id, old.athlete_id, old.team_id, old.pole_id, old.roster_id,
    old.match_side_id, old.match_id, old.session_id, 'ranking_transaction', old.id,
    old.rule_id, old.rule_code, old.rule_version, -old.points, -old.points_applied,
    'reversal', old.transaction_scope, 'homologated', old.event_context,
    old.event_context_data,
    old.metadata || jsonb_build_object('reversal_reason', 'match_void', 'original_transaction_id', old.id),
    old.id, run_row.id, auth.uid(), now(), auth.uid()
  from public.ranking_transactions old
  where old.match_id = target_match
    and old.transaction_type <> 'reversal'
    and not exists (
      select 1 from public.ranking_transactions reversal
      where reversal.related_transaction_id = old.id and reversal.transaction_type = 'reversal'
    );
  get diagnostics reversed_count = row_count;
  update public.ranking_processing_runs
  set status = 'completed', completed_at = now(), transaction_count = reversed_count,
      metadata = metadata || jsonb_build_object('reversal_count', reversed_count)
  where id = run_row.id returning * into run_row;
  return run_row;
end;
$$;

revoke all on function private.reverse_ranking_for_void(uuid,uuid) from public, anon;

grant execute on function private.reverse_ranking_for_void(uuid,uuid) to authenticated;

create view public.athlete_ranking_totals
with (security_invoker = true)
as
select
  transaction.athlete_id,
  transaction.season_id,
  sum(transaction.points)::integer as total_points,
  sum(transaction.points) filter (where rule.point_category = 'participation')::integer as participation_points,
  sum(transaction.points) filter (where rule.point_category = 'result')::integer as result_points,
  sum(transaction.points) filter (where rule.point_category = 'technical')::integer as technical_points,
  sum(transaction.points) filter (where rule.point_category = 'bonus')::integer as bonus_points,
  sum(transaction.points) filter (where rule.point_category = 'penalty')::integer as penalty_points
from public.ranking_transactions transaction
join public.ranking_rules rule on rule.id = transaction.rule_id
where transaction.status = 'homologated' and transaction.athlete_id is not null
group by transaction.athlete_id, transaction.season_id;

create view public.team_ranking_totals
with (security_invoker = true)
as
select team_id, season_id, sum(points)::integer as total_points,
  count(*) filter (where transaction_type <> 'reversal')::integer as contribution_count
from public.ranking_transactions
where status = 'homologated' and team_id is not null
group by team_id, season_id;

create view public.pole_ranking_totals
with (security_invoker = true)
as
select pole_id, season_id, sum(points)::integer as total_points,
  count(*) filter (where transaction_type <> 'reversal')::integer as contribution_count
from public.ranking_transactions
where status = 'homologated' and pole_id is not null
group by pole_id, season_id;

create view public.formation_ranking_totals
with (security_invoker = true)
as
select roster_id, match_side_id, season_id, sum(points)::integer as total_points
from public.ranking_transactions
where status = 'homologated' and (roster_id is not null or match_side_id is not null)
group by roster_id, match_side_id, season_id;

create view public.athlete_ranking_history
with (security_invoker = true)
as
select
  transaction.id,
  transaction.athlete_id,
  transaction.season_id,
  transaction.season_cycle_id,
  transaction.match_id,
  transaction.session_id,
  transaction.rule_code,
  rule.name as rule_name,
  rule.point_category,
  transaction.points,
  transaction.transaction_type,
  transaction.event_context,
  transaction.event_context_data,
  transaction.created_at,
  match.match_code,
  session.name as session_name
from public.ranking_transactions transaction
join public.ranking_rules rule on rule.id = transaction.rule_id
left join public.matches match on match.id = transaction.match_id
left join public.ur_play_sessions session on session.id = transaction.session_id
where transaction.status = 'homologated';

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ranking_rules', 'ranking_processing_runs', 'ranking_transactions',
    'match_recognitions', 'disciplinary_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

create policy ranking_rules_read on public.ranking_rules
for select to authenticated using (true);

create policy ranking_rules_admin on public.ranking_rules
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ranking_runs_read on public.ranking_processing_runs
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or (source_type = 'match_result' and exists (
    select 1 from public.matches match
    where match.id = source_id and private.operates_ur_play_session(match.session_id)
  ))
);

create policy ranking_transactions_read on public.ranking_transactions
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or athlete_id = private.current_athlete_id()
  or (team_id is not null and private.manages_team(team_id))
  or (pole_id is not null and private.manages_pole(pole_id))
  or (match_id is not null and exists (
    select 1 from public.matches match
    where match.id = match_id and private.operates_ur_play_session(match.session_id)
  ))
);

create policy match_recognitions_read on public.match_recognitions
for select to authenticated
using (private.can_read_match(match_id));

create policy match_recognitions_admin on public.match_recognitions
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy disciplinary_events_read on public.disciplinary_events
for select to authenticated
using (
  private.has_any_role(array['admin']::public.app_role[])
  or athlete_id = private.current_athlete_id()
  or (match_id is not null and private.can_read_match(match_id))
);

create policy disciplinary_events_admin on public.disciplinary_events
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

grant select on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events to authenticated;

grant insert, update on public.ranking_rules, public.match_recognitions, public.disciplinary_events to authenticated;

grant select on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history to authenticated;

grant all on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events to service_role;

grant select on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history to service_role;

revoke all on public.ranking_rules, public.ranking_processing_runs, public.ranking_transactions,
  public.match_recognitions, public.disciplinary_events from anon;

revoke all on public.athlete_ranking_totals, public.team_ranking_totals,
  public.pole_ranking_totals, public.formation_ranking_totals, public.athlete_ranking_history from anon;

create or replace function private.homologate_match_result(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_homologate_match(match_row.id) then raise exception 'homologation denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if match_row.status <> 'pending_review' or result_row.result_status <> 'under_review' then
    raise exception 'result under review required' using errcode = '23514';
  end if;
  if not score.is_game_over
    or result_row.score_a <> score.score_a
    or result_row.score_b <> score.score_b
    or result_row.winner_side_id is distinct from score.winner_side_id then
    raise exception 'result is inconsistent with rallies' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'homologated', homologated_by = auth.uid(),
      homologated_at = now(), updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = score.winner_side_id,
      final_score_a = score.score_a, final_score_b = score.score_b,
      ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, 'Result homologated', operation_id);
  perform private.process_homologated_match(target_match, operation_id);
  return result_row;
end;
$$;

create or replace function private.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin void required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'void reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if match_row.status = 'cancelled' then raise exception 'cancelled match cannot be voided' using errcode = '23514'; end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  insert into public.match_results(
    match_id, winner_side_id, score_a, score_b, result_status, correction_reason
  ) values (
    match_row.id, null, coalesce(score.score_a, 0), coalesce(score.score_b, 0), 'void', reason
  )
  on conflict (match_id) do update
  set winner_side_id = null,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      result_status = 'void',
      homologated_by = null,
      homologated_at = null,
      correction_reason = excluded.correction_reason,
      updated_at = now()
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = null,
      final_score_a = coalesce(score.score_a, 0),
      final_score_b = coalesce(score.score_b, 0),
      ready_for_scoring = false,
      voided_at = now(), void_reason = reason,
      ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.release_match_queue_after_game(match_row.id);
  perform private.append_match_result_version(result_row, reason, operation_id);
  perform private.reverse_ranking_for_void(target_match, operation_id);
  return result_row;
end;
$$;

create or replace function private.process_homologated_match(
  target_match uuid,
  operation_id uuid
)
returns public.ranking_processing_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  session_row public.ur_play_sessions;
  run_row public.ranking_processing_runs;
  previous_run public.ranking_processing_runs;
  rule_row public.ranking_rules;
  participant_row record;
  action_row record;
  game_point record;
  fingerprint text;
  inserted_count integer := 0;
  reversed_count integer := 0;
  event_time timestamptz;
  result_version integer;
begin
  if not private.can_homologate_match(target_match) then
    raise exception 'ranking processing denied' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranking:' || target_match::text, 0));
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = target_match for update;
  if result_row.result_status <> 'homologated' then
    raise exception 'homologated match result required' using errcode = '23514';
  end if;
  if match_row.event_context <> 'ur_play' then
    raise exception 'only UR Play ranking processing is operational' using errcode = '0A000';
  end if;
  select * into session_row from public.ur_play_sessions where id = match_row.session_id;
  event_time := coalesce(result_row.homologated_at, match_row.ended_at, now());
  select coalesce(max(version_number), 0) into result_version
  from public.match_result_versions where match_id = target_match;
  select md5(concat_ws('|',
    result_row.id::text, result_row.result_status::text,
    coalesce(result_row.winner_side_id::text, ''), result_row.score_a::text, result_row.score_b::text,
    result_version::text,
    coalesce((select string_agg(concat_ws(':', id, athlete_id, side_id, team_snapshot_id, pole_snapshot_id, status), ',' order by id)
      from public.match_participants where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, rally_id, athlete_id, side_id, action_type, status, version_number), ',' order by id)
      from public.match_technical_action_effective where match_id = target_match), ''),
    coalesce((select string_agg(concat_ws(':', id, effective_winning_side_id, effective_status), ',' order by rally_number)
      from public.match_rally_effective where match_id = target_match), '')
  )) into fingerprint;
  select * into run_row from public.ranking_processing_runs where client_operation_id = operation_id;
  if found then return run_row; end if;
  select * into previous_run
  from public.ranking_processing_runs
  where source_type = 'match_result' and source_id = target_match and status = 'completed'
  order by completed_at desc limit 1;
  if previous_run.input_fingerprint = fingerprint then
    insert into public.ranking_processing_runs(
      source_type, source_id, status, completed_at, input_fingerprint,
      client_operation_id, created_by, metadata
    ) values (
      'match_result', target_match, 'completed', now(), fingerprint,
      operation_id, auth.uid(), jsonb_build_object('no_op', true, 'reason', 'unchanged_input')
    ) returning * into run_row;
    return run_row;
  end if;
  insert into public.ranking_processing_runs(
    source_type, source_id, status, input_fingerprint, client_operation_id, created_by,
    metadata
  ) values (
    'match_result', target_match, 'processing', fingerprint, operation_id, auth.uid(),
    jsonb_build_object('result_version', result_version)
  ) returning * into run_row;

  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
    match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
    points, points_applied, transaction_type, transaction_scope, status, event_context,
    event_context_data, metadata, related_transaction_id, processing_run_id,
    created_by, homologated_at, homologated_by
  )
  select
    old.season_id, old.season_cycle_id, old.athlete_id, old.team_id, old.pole_id, old.roster_id,
    old.match_side_id, old.match_id, old.session_id, 'ranking_transaction', old.id,
    old.rule_id, old.rule_code, old.rule_version, -old.points, -old.points_applied,
    'reversal', old.transaction_scope, 'homologated', old.event_context,
    old.event_context_data,
    old.metadata || jsonb_build_object('reversal_reason', 'match_reprocessed', 'original_transaction_id', old.id),
    old.id, run_row.id, auth.uid(), event_time, result_row.homologated_by
  from public.ranking_transactions old
  where old.match_id = target_match
    and old.transaction_type <> 'reversal'
    and not exists (
      select 1 from public.ranking_transactions reversal
      where reversal.related_transaction_id = old.id and reversal.transaction_type = 'reversal'
    );
  get diagnostics reversed_count = row_count;

  for participant_row in
    select p.*, side.roster_id
    from public.match_participants p
    join public.match_sides side on side.id = p.side_id
    where p.match_id = target_match and p.status = 'active'
  loop
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'PARTICIPATION', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant_row.athlete_id,
        participant_row.team_snapshot_id, participant_row.pole_snapshot_id, participant_row.roster_id, participant_row.side_id,
        target_match, match_row.session_id, 'match_participant', participant_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code),
        jsonb_build_object('category', rule_row.point_category, 'participation_role', participant_row.participation_role),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case when participant_row.side_id = result_row.winner_side_id then 'WIN' else 'LOSS' end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, participant_row.athlete_id,
        participant_row.team_snapshot_id, participant_row.pole_snapshot_id, participant_row.roster_id, participant_row.side_id,
        target_match, match_row.session_id, 'match_result', result_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'winner_side_id', result_row.winner_side_id),
        jsonb_build_object('category', rule_row.point_category),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  for action_row in
    select action.*, participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
    from public.match_technical_action_effective action
    join public.match_rally_effective rally on rally.id = action.rally_id
      and rally.effective_status in ('valid', 'corrected')
      and rally.effective_winning_side_id = action.side_id
    join public.match_participants participant on participant.match_id = action.match_id
      and participant.athlete_id = action.athlete_id and participant.status = 'active'
    join public.match_sides side on side.id = participant.side_id
    where action.match_id = target_match and action.status <> 'void'
  loop
    rule_row := private.resolve_ranking_rule(
      session_row.season_id,
      case action_row.action_type
        when 'ace' then 'ACE'
        when 'attack' then 'ATTACK'
        when 'block' then 'BLOCK'
        when 'defense' then 'DEFENSE'
        when 'assist' then 'ASSIST'
      end,
      match_row.event_context,
      event_time
    );
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, action_row.athlete_id,
        action_row.team_snapshot_id, action_row.pole_snapshot_id, action_row.roster_id, action_row.side_id,
        target_match, match_row.session_id, 'technical_action', action_row.id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_id', action_row.rally_id),
        jsonb_build_object('category', rule_row.point_category, 'action_type', action_row.action_type),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  select game.*, action.id as action_id, action.athlete_id, action.side_id,
    participant.team_snapshot_id, participant.pole_snapshot_id, side.roster_id
  into game_point
  from public.match_game_points game
  join public.match_technical_action_effective action on action.rally_id = game.game_point_rally_id
    and action.status <> 'void' and action.side_id = game.winner_side_id
  join public.match_participants participant on participant.match_id = game.match_id
    and participant.athlete_id = action.athlete_id and participant.status = 'active'
  join public.match_sides side on side.id = participant.side_id
  where game.match_id = target_match;
  if found then
    rule_row := private.resolve_ranking_rule(session_row.season_id, 'GAME_POINT', match_row.event_context, event_time);
    if rule_row.id is not null then
      insert into public.ranking_transactions(
        season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id, match_side_id,
        match_id, session_id, source_type, source_id, rule_id, rule_code, rule_version,
        points, points_applied, transaction_type, transaction_scope, status, event_context,
        event_context_data, metadata, processing_run_id, created_by, homologated_at, homologated_by
      ) values (
        session_row.season_id, session_row.season_cycle_id, game_point.athlete_id,
        game_point.team_snapshot_id, game_point.pole_snapshot_id, game_point.roster_id, game_point.side_id,
        target_match, match_row.session_id, 'rally', game_point.game_point_rally_id,
        rule_row.id, rule_row.rule_code, rule_row.version, rule_row.points, rule_row.points,
        'earn', 'athlete', 'homologated', match_row.event_context,
        jsonb_build_object('match_code', match_row.match_code, 'rally_number', game_point.game_point_rally_number),
        jsonb_build_object('category', rule_row.point_category, 'target_action_id', game_point.action_id),
        run_row.id, auth.uid(), event_time, result_row.homologated_by
      );
      inserted_count := inserted_count + 1;
    end if;
  end if;

  update public.ranking_processing_runs
  set status = 'completed', completed_at = now(),
      transaction_count = reversed_count + inserted_count,
      metadata = metadata || jsonb_build_object(
        'reversal_count', reversed_count,
        'generated_count', inserted_count,
        'streak_bonus_mode', 'highest_only',
        'collective_streak_distribution', 'disabled'
      )
  where id = run_row.id
  returning * into run_row;
  return run_row;
end;
$$;

create index disciplinary_events_created_by on public.disciplinary_events(created_by);

create index disciplinary_events_homologated_by on public.disciplinary_events(homologated_by)
where homologated_by is not null;

create index match_recognitions_created_by on public.match_recognitions(created_by);

create index match_recognitions_homologated_by on public.match_recognitions(homologated_by)
where homologated_by is not null;

create index ranking_processing_runs_created_by on public.ranking_processing_runs(created_by)
where created_by is not null;

create index ranking_rules_created_by on public.ranking_rules(created_by)
where created_by is not null;

create index ranking_transactions_created_by on public.ranking_transactions(created_by)
where created_by is not null;

create index ranking_transactions_homologated_by on public.ranking_transactions(homologated_by)
where homologated_by is not null;

create index ranking_transactions_season on public.ranking_transactions(season_id);

create index ranking_transactions_session on public.ranking_transactions(session_id)
where session_id is not null;

drop policy ranking_rules_admin on public.ranking_rules;

create policy ranking_rules_admin_insert on public.ranking_rules
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ranking_rules_admin_update on public.ranking_rules
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

drop policy match_recognitions_admin on public.match_recognitions;

create policy match_recognitions_admin_insert on public.match_recognitions
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy match_recognitions_admin_update on public.match_recognitions
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

drop policy disciplinary_events_admin on public.disciplinary_events;

create policy disciplinary_events_admin_insert on public.disciplinary_events
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy disciplinary_events_admin_update on public.disciplinary_events
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create type public.ranking_classification_type as enum ('individual','team','pole','doubles','fours');

create type public.ranking_snapshot_reason as enum ('daily','weekly','cycle_close','season_close','manual','pre_event','post_event');

create type public.ranking_publication_status as enum ('provisional','official','closed');

create type public.ranking_operation_type as enum ('snapshot','cycle_close','season_close','publication','retroactive_correction');

create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  ranking_type public.ranking_classification_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  entity_code text,
  display_name text not null,
  level public.athlete_level,
  team_id uuid references public.teams(id) on delete restrict,
  team_name text,
  pole_id uuid references public.poles(id) on delete restrict,
  pole_name text,
  category_code text,
  format_code text,
  total_points integer not null default 0,
  participation_points integer not null default 0,
  result_points integer not null default 0,
  technical_points integer not null default 0,
  bonus_points integer not null default 0,
  penalty_points integer not null default 0,
  disciplinary_balance integer not null default 0,
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  win_rate numeric(7,4) not null default 0 check (win_rate between 0 and 100),
  aces integer not null default 0 check (aces >= 0),
  attacks integer not null default 0 check (attacks >= 0),
  blocks integer not null default 0 check (blocks >= 0),
  defenses integer not null default 0 check (defenses >= 0),
  assists integer not null default 0 check (assists >= 0),
  athletes_contributing integer not null default 0 check (athletes_contributing >= 0),
  teams_contributing integer not null default 0 check (teams_contributing >= 0),
  current_position integer check (current_position > 0),
  general_position integer check (general_position > 0),
  previous_position integer check (previous_position > 0),
  position_change integer,
  movement text not null default 'new' check (movement in ('up','down','stable','new')),
  reached_score_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  unique nulls not distinct (ranking_type, season_id, cycle_id, entity_id)
);

create table public.ranking_contributions (
  id uuid primary key default gen_random_uuid(),
  ranking_type public.ranking_classification_type not null check (ranking_type <> 'individual'),
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  athlete_code text not null,
  athlete_name text not null,
  points integer not null,
  refreshed_at timestamptz not null default now(),
  unique nulls not distinct (ranking_type, season_id, cycle_id, entity_id, athlete_id)
);

create table public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_batch_id uuid not null,
  ranking_type public.ranking_classification_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  level public.athlete_level,
  position integer not null check (position > 0),
  total_points integer not null,
  captured_at timestamptz not null default now(),
  snapshot_reason public.ranking_snapshot_reason not null,
  captured_by uuid not null references public.profiles(id) on delete restrict
);

create table public.ranking_periods (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  status public.ranking_publication_status not null default 'provisional',
  published_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  unique nulls not distinct (season_id, cycle_id),
  constraint ranking_period_dates check (
    (status = 'provisional')
    or (status = 'official' and published_at is not null)
    or (status = 'closed' and published_at is not null and closed_at is not null)
  )
);

create table public.ranking_operations (
  id uuid primary key default gen_random_uuid(),
  operation_type public.ranking_operation_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  snapshot_batch_id uuid,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create index ranking_entries_scope_position
on public.ranking_entries(ranking_type, season_id, cycle_id, level, current_position);

create index ranking_entries_search
on public.ranking_entries(ranking_type, season_id, (lower(display_name)) text_pattern_ops);

create index ranking_entries_season on public.ranking_entries(season_id);

create index ranking_entries_cycle on public.ranking_entries(cycle_id) where cycle_id is not null;

create index ranking_entries_team on public.ranking_entries(team_id) where team_id is not null;

create index ranking_entries_pole on public.ranking_entries(pole_id) where pole_id is not null;

create index ranking_contributions_entity
on public.ranking_contributions(ranking_type, season_id, cycle_id, entity_id, points desc);

create index ranking_contributions_season on public.ranking_contributions(season_id);

create index ranking_contributions_cycle on public.ranking_contributions(cycle_id) where cycle_id is not null;

create index ranking_contributions_athlete on public.ranking_contributions(athlete_id, season_id);

create index ranking_snapshots_entity
on public.ranking_snapshots(ranking_type, season_id, cycle_id, entity_id, captured_at desc);

create index ranking_snapshots_batch on public.ranking_snapshots(snapshot_batch_id);

create index ranking_snapshots_season on public.ranking_snapshots(season_id);

create index ranking_snapshots_cycle on public.ranking_snapshots(cycle_id) where cycle_id is not null;

create index ranking_snapshots_captured_by on public.ranking_snapshots(captured_by);

create index ranking_periods_cycle on public.ranking_periods(cycle_id) where cycle_id is not null;

create index ranking_periods_updated_by on public.ranking_periods(updated_by);

create index ranking_operations_scope on public.ranking_operations(season_id, cycle_id, created_at desc);

create index ranking_operations_cycle on public.ranking_operations(cycle_id) where cycle_id is not null;

create index ranking_operations_created_by on public.ranking_operations(created_by);

create index ranking_transactions_classification_scope
on public.ranking_transactions(season_id,season_cycle_id,status,athlete_id)
include(team_id,pole_id,roster_id,match_id,rule_id,rule_code,points,transaction_type,homologated_at,created_at);

create or replace function private.reject_ranking_projection_history_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'ranking history is append-only' using errcode = '23514';
end $$;

revoke all on function private.reject_ranking_projection_history_mutation() from public, anon, authenticated;

create trigger ranking_snapshots_append_only before update or delete on public.ranking_snapshots
for each row execute function private.reject_ranking_projection_history_mutation();

create trigger ranking_operations_append_only before update or delete on public.ranking_operations
for each row execute function private.reject_ranking_projection_history_mutation();

create or replace function private.refresh_ranking_scope(target_season_id uuid, target_cycle_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ranking_entries
  where season_id = target_season_id and cycle_id is not distinct from target_cycle_id;
  delete from public.ranking_contributions
  where season_id = target_season_id and cycle_id is not distinct from target_cycle_id;

  with tx as (
    select t.*, r.point_category,
      case when t.transaction_type = 'reversal' then -1 else 1 end as event_delta
    from public.ranking_transactions t
    join public.ranking_rules r on r.id = t.rule_id
    where t.season_id = target_season_id and t.status = 'homologated'
      and t.athlete_id is not null
      and (target_cycle_id is null or t.season_cycle_id = target_cycle_id)
  ), aggregate as (
    select athlete_id,
      sum(points)::integer total_points,
      coalesce(sum(points) filter (where point_category = 'participation'),0)::integer participation_points,
      coalesce(sum(points) filter (where point_category = 'result'),0)::integer result_points,
      coalesce(sum(points) filter (where point_category = 'technical'),0)::integer technical_points,
      coalesce(sum(points) filter (where point_category = 'bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter (where point_category = 'penalty'),0)::integer penalty_points,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'PARTICIPATION'),0),0)::integer games_played,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'WIN'),0),0)::integer wins,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'LOSS'),0),0)::integer losses,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ACE'),0),0)::integer aces,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ATTACK'),0),0)::integer attacks,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'BLOCK'),0),0)::integer blocks,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'DEFENSE'),0),0)::integer defenses,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ASSIST'),0),0)::integer assists,
      coalesce(max(coalesce(homologated_at,created_at)) filter (where points > 0), min(created_at)) reached_score_at
    from tx group by athlete_id having sum(points) <> 0 or sum(event_delta) filter (where rule_code='PARTICIPATION') > 0
  ), enriched as (
    select a.*, app.athlete_code, app.public_name, app.avatar_url,
      coalesce(l.level,'leveling'::public.athlete_level) level,
      membership.team_id, team.name team_name,
      coalesce(pole_assignment.pole_id,team.primary_pole_id) pole_id, pole.name pole_name,
      round(case when a.games_played > 0 then a.wins::numeric * 100 / a.games_played else 0 end,4) win_rate
    from aggregate a
    join public.athlete_public_profiles app on app.athlete_id = a.athlete_id
    left join lateral (
      select al.level from public.athlete_levels al
      where al.athlete_id=a.athlete_id and al.season_id=target_season_id and al.status='active'
      order by al.starts_at desc limit 1
    ) l on true
    left join lateral (
      select tm.team_id from public.team_memberships tm
      where tm.athlete_id=a.athlete_id and tm.season_id=target_season_id and tm.status='active'
      order by tm.starts_at desc limit 1
    ) membership on true
    left join public.teams team on team.id=membership.team_id
    left join lateral (
      select tpa.pole_id from public.team_pole_assignments tpa
      where tpa.team_id=membership.team_id and tpa.season_id=target_season_id and tpa.status='active'
      order by tpa.starts_at desc limit 1
    ) pole_assignment on true
    left join public.poles pole on pole.id=coalesce(pole_assignment.pole_id,team.primary_pole_id)
  ), ranked as (
    select e.*,
      row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,athlete_id)::integer general_position,
      case when level='leveling' then null else row_number() over(partition by level order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,athlete_id)::integer end current_position
    from enriched e
  )
  insert into public.ranking_entries(
    ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,level,team_id,team_name,pole_id,pole_name,
    total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,
    games_played,wins,losses,win_rate,aces,attacks,blocks,defenses,assists,current_position,general_position,
    previous_position,position_change,movement,reached_score_at
  )
  select 'individual',target_season_id,target_cycle_id,r.athlete_id,r.athlete_code,r.public_name,r.level,r.team_id,r.team_name,r.pole_id,r.pole_name,
    r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,
    r.games_played,r.wins,r.losses,r.win_rate,r.aces,r.attacks,r.blocks,r.defenses,r.assists,r.current_position,r.general_position,
    previous.position,
    case when previous.position is null or r.current_position is null then null else previous.position-r.current_position end,
    case when previous.position is null then 'new' when previous.position>r.current_position then 'up' when previous.position<r.current_position then 'down' else 'stable' end,
    r.reached_score_at
  from ranked r
  left join lateral (
    select s.position from public.ranking_snapshots s
    where s.ranking_type='individual' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.athlete_id
    order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.team_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select team_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      count(distinct athlete_id)::integer athletes_contributing,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by team_id having sum(points)<>0
  ), match_metrics as (
    select team_id,match_id,
      sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,
      sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by team_id,match_id
  ), metrics as (
    select team_id,count(*) filter(where participation>0)::integer games_played,
      count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by team_id
  ), enriched as (
    select a.*,t.name display_name,t.slug entity_code,t.primary_pole_id pole_id,p.name pole_name,
      coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.teams t on t.id=a.team_id left join public.poles p on p.id=t.primary_pole_id left join metrics m on m.team_id=a.team_id
  ), ranked as (
    select e.*,row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,team_id)::integer position
    from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,pole_id,pole_name,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,athletes_contributing,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select 'team',target_season_id,target_cycle_id,r.team_id,r.entity_code,r.display_name,r.pole_id,r.pole_name,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.athletes_contributing,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type='team' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.team_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.pole_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select pole_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      count(distinct athlete_id)::integer athletes_contributing,count(distinct team_id)::integer teams_contributing,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by pole_id having sum(points)<>0
  ), match_metrics as (
    select pole_id,match_id,sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by pole_id,match_id
  ), metrics as (
    select pole_id,count(*) filter(where participation>0)::integer games_played,count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by pole_id
  ), enriched as (
    select a.*,p.name display_name,p.slug entity_code,coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.poles p on p.id=a.pole_id left join metrics m on m.pole_id=a.pole_id
  ), ranked as (
    select e.*,row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,reached_score_at,pole_id)::integer position from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,pole_id,pole_name,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,athletes_contributing,teams_contributing,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select 'pole',target_season_id,target_cycle_id,r.pole_id,r.entity_code,r.display_name,r.pole_id,r.display_name,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.athletes_contributing,r.teams_contributing,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type='pole' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.pole_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.roster_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select roster_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by roster_id having sum(points)<>0
  ), match_metrics as (
    select roster_id,match_id,sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by roster_id,match_id
  ), metrics as (
    select roster_id,count(*) filter(where participation>0)::integer games_played,count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by roster_id
  ), enriched as (
    select a.*,r.team_id,r.level,r.name roster_name,t.name team_name,t.primary_pole_id pole_id,p.name pole_name,
      f.code format_code,c.code category_code,coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.team_rosters r on r.id=a.roster_id join public.teams t on t.id=r.team_id
    join public.competitive_formats f on f.id=r.format_id join public.competitive_categories c on c.id=r.category_id
    left join public.poles p on p.id=t.primary_pole_id left join metrics m on m.roster_id=a.roster_id
    where f.code in ('doubles','fours')
  ), ranked as (
    select e.*,row_number() over(partition by format_code,level,category_code order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,reached_score_at,roster_id)::integer position from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,display_name,level,team_id,team_name,pole_id,pole_name,category_code,format_code,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select case when r.format_code='doubles' then 'doubles'::public.ranking_classification_type else 'fours'::public.ranking_classification_type end,
    target_season_id,target_cycle_id,r.roster_id,coalesce(r.roster_name,r.team_name||' '||case when r.format_code='doubles' then 'Dupla' else 'Quarteto' end),r.level,r.team_id,r.team_name,r.pole_id,r.pole_name,r.category_code,r.format_code,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type=(case when r.format_code='doubles' then 'doubles'::public.ranking_classification_type else 'fours'::public.ranking_classification_type end) and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.roster_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  insert into public.ranking_contributions(ranking_type,season_id,cycle_id,entity_id,athlete_id,athlete_code,athlete_name,points)
  select kind,target_season_id,target_cycle_id,entity_id,t.athlete_id,app.athlete_code,app.public_name,sum(t.points)::integer
  from public.ranking_transactions t
  join public.athlete_public_profiles app on app.athlete_id=t.athlete_id
  left join public.team_rosters roster on roster.id=t.roster_id
  left join public.competitive_formats f on f.id=roster.format_id
  cross join lateral (
    values
      ('team'::public.ranking_classification_type,t.team_id),
      ('pole'::public.ranking_classification_type,t.pole_id),
      (case when f.code='doubles' then 'doubles'::public.ranking_classification_type when f.code='fours' then 'fours'::public.ranking_classification_type end,t.roster_id)
  ) target(kind,entity_id)
  where t.season_id=target_season_id and t.status='homologated' and t.athlete_id is not null and target.entity_id is not null and target.kind is not null
    and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  group by kind,entity_id,t.athlete_id,app.athlete_code,app.public_name
  having sum(t.points)<>0;
end $$;

revoke all on function private.refresh_ranking_scope(uuid,uuid) from public,anon,authenticated;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cycle record;
begin
  if (select auth.uid()) is not null and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:'||target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id,null);
  for cycle in select id from public.season_cycles where season_id=target_season_id loop
    perform private.refresh_ranking_scope(target_season_id,cycle.id);
  end loop;
end $$;

revoke all on function private.refresh_all_rankings(uuid) from public,anon,authenticated;

grant execute on function private.refresh_all_rankings(uuid) to authenticated;

create or replace function private.refresh_rankings_after_run()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_season uuid;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    select season_id into target_season from public.ranking_transactions where processing_run_id=new.id limit 1;
    if target_season is not null then perform private.refresh_all_rankings(target_season); end if;
  end if;
  return new;
end $$;

revoke all on function private.refresh_rankings_after_run() from public,anon,authenticated;

create trigger ranking_runs_refresh_classifications after update of status on public.ranking_processing_runs
for each row execute function private.refresh_rankings_after_run();

create view public.individual_ranking with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='individual';

create view public.team_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='team';

create view public.pole_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='pole';

create view public.formation_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type in ('doubles','fours');

create view public.doubles_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='doubles';

create view public.fours_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='fours';

create view public.leveling_ranking_history with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='individual' and level='leveling';

create view public.public_rankings with (security_invoker=true) as
select id,ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,level,team_id,team_name,pole_id,pole_name,
  category_code,format_code,total_points,games_played,wins,losses,win_rate,aces,attacks,blocks,defenses,assists,
  athletes_contributing,teams_contributing,current_position,general_position,previous_position,position_change,movement,refreshed_at
from public.ranking_entries;

create or replace function public.capture_ranking_snapshot(
  target_season_id uuid,target_cycle_id uuid default null,target_reason public.ranking_snapshot_reason default 'manual'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare batch_id uuid:=gen_random_uuid(); inserted_count integer;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  if target_cycle_id is not null and not exists(select 1 from public.season_cycles where id=target_cycle_id and season_id=target_season_id) then raise exception 'cycle does not belong to season' using errcode='23514'; end if;
  perform private.refresh_all_rankings(target_season_id);
  insert into public.ranking_snapshots(snapshot_batch_id,ranking_type,season_id,cycle_id,entity_id,level,position,total_points,snapshot_reason,captured_by)
  select batch_id,ranking_type,season_id,cycle_id,entity_id,level,current_position,total_points,target_reason,(select auth.uid())
  from public.ranking_entries where season_id=target_season_id and cycle_id is not distinct from target_cycle_id and current_position is not null;
  get diagnostics inserted_count=row_count;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,snapshot_batch_id,reason,after_state,created_by)
  values('snapshot',target_season_id,target_cycle_id,batch_id,'Captura de snapshot '||target_reason::text,jsonb_build_object('entries',inserted_count),(select auth.uid()));
  return batch_id;
end $$;

revoke all on function public.capture_ranking_snapshot(uuid,uuid,public.ranking_snapshot_reason) from public,anon;

grant execute on function public.capture_ranking_snapshot(uuid,uuid,public.ranking_snapshot_reason) to authenticated;

create or replace function public.publish_rankings(target_season_id uuid,target_cycle_id uuid default null)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare result public.ranking_periods; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  perform private.refresh_all_rankings(target_season_id);
  select to_jsonb(p) into prior from public.ranking_periods p where season_id=target_season_id and cycle_id is not distinct from target_cycle_id;
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,updated_by)
  values(target_season_id,target_cycle_id,'provisional',now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set published_at=now(),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,reason,before_state,after_state,created_by)
  values('publication',target_season_id,target_cycle_id,'Publicação controlada do ranking',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;

revoke all on function public.publish_rankings(uuid,uuid) from public,anon;

grant execute on function public.publish_rankings(uuid,uuid) to authenticated;

create or replace function public.close_ranking_cycle(target_cycle_id uuid)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare target_season uuid; result public.ranking_periods; batch uuid; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  select season_id into target_season from public.season_cycles where id=target_cycle_id for update;
  if target_season is null then raise exception 'ranking cycle not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtext('ranking-cycle-close:'||target_cycle_id::text));
  select to_jsonb(p) into prior from public.ranking_periods p where cycle_id=target_cycle_id;
  batch:=public.capture_ranking_snapshot(target_season,target_cycle_id,'cycle_close');
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,updated_by)
  values(target_season,target_cycle_id,'official',now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set status='official',published_at=coalesce(ranking_periods.published_at,now()),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  update public.season_cycles set status='closed' where id=target_cycle_id;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,snapshot_batch_id,reason,before_state,after_state,created_by)
  values('cycle_close',target_season,target_cycle_id,batch,'Fechamento oficial do ciclo',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;

revoke all on function public.close_ranking_cycle(uuid) from public,anon;

grant execute on function public.close_ranking_cycle(uuid) to authenticated;

create or replace function public.close_season_ranking(target_season_id uuid)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare result public.ranking_periods; batch uuid; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ranking-season-close:'||target_season_id::text));
  if exists(select 1 from public.ranking_processing_runs run join public.matches m on m.id=run.source_id join public.ur_play_sessions s on s.id=m.session_id where run.source_type='match_result' and run.status in('pending','processing','failed') and s.season_id=target_season_id) then
    raise exception 'season has pending or failed ranking sources' using errcode='23514';
  end if;
  select to_jsonb(p) into prior from public.ranking_periods p where season_id=target_season_id and cycle_id is null;
  batch:=public.capture_ranking_snapshot(target_season_id,null,'season_close');
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,closed_at,updated_by)
  values(target_season_id,null,'closed',now(),now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set status='closed',published_at=coalesce(ranking_periods.published_at,now()),closed_at=now(),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  insert into public.ranking_operations(operation_type,season_id,snapshot_batch_id,reason,before_state,after_state,created_by)
  values('season_close',target_season_id,batch,'Fechamento oficial da temporada',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;

revoke all on function public.close_season_ranking(uuid) from public,anon;

grant execute on function public.close_season_ranking(uuid) to authenticated;

create or replace function private.enforce_closed_ranking_period()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare correction_reason text:=nullif(current_setting('app.ranking_correction_reason',true),''); is_closed boolean;
begin
  select exists(
    select 1 from public.ranking_periods p where p.season_id=new.season_id
      and ((p.cycle_id is null and p.status='closed')
        or (p.cycle_id is not null and p.status in('official','closed') and p.cycle_id is not distinct from new.season_cycle_id))
  ) into is_closed;
  if is_closed then
    if not (select private.has_any_role(array['admin']::public.app_role[])) or char_length(coalesce(correction_reason,''))<10 then
      raise exception 'closed ranking requires audited admin correction reason' using errcode='42501';
    end if;
    new.metadata:=new.metadata||jsonb_build_object('retroactive_reason',correction_reason);
  end if;
  return new;
end $$;

revoke all on function private.enforce_closed_ranking_period() from public,anon,authenticated;

create trigger ranking_transactions_closed_period before insert on public.ranking_transactions
for each row execute function private.enforce_closed_ranking_period();

create or replace function public.reprocess_closed_ranking_match(target_match uuid,operation_id uuid,correction_reason text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare run_id uuid; target_season uuid;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  if char_length(trim(correction_reason))<10 then raise exception 'correction reason must have at least 10 characters' using errcode='23514'; end if;
  perform set_config('app.ranking_correction_reason',trim(correction_reason),true);
  run_id:=private.process_homologated_match(target_match,operation_id);
  select season_id into target_season from public.ranking_transactions where processing_run_id=run_id limit 1;
  insert into public.ranking_operations(operation_type,season_id,reason,after_state,created_by)
  values('retroactive_correction',target_season,trim(correction_reason),jsonb_build_object('match_id',target_match,'processing_run_id',run_id),(select auth.uid()));
  return run_id;
end $$;

revoke all on function public.reprocess_closed_ranking_match(uuid,uuid,text) from public,anon;

grant execute on function public.reprocess_closed_ranking_match(uuid,uuid,text) to authenticated;

alter table public.ranking_entries enable row level security;

alter table public.ranking_entries force row level security;

alter table public.ranking_contributions enable row level security;

alter table public.ranking_contributions force row level security;

alter table public.ranking_snapshots enable row level security;

alter table public.ranking_snapshots force row level security;

alter table public.ranking_periods enable row level security;

alter table public.ranking_periods force row level security;

alter table public.ranking_operations enable row level security;

alter table public.ranking_operations force row level security;

create policy ranking_entries_public_read on public.ranking_entries for select to anon,authenticated using (true);

create policy ranking_contributions_context_read on public.ranking_contributions for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or athlete_id=(select private.current_athlete_id())
  or (ranking_type='team' and (select private.manages_team(entity_id)))
  or (ranking_type='pole' and (select private.manages_pole(entity_id)))
  or (ranking_type in('doubles','fours') and exists(select 1 from public.team_rosters r where r.id=entity_id and (select private.manages_team(r.team_id))))
);

create policy ranking_snapshots_context_read on public.ranking_snapshots for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (ranking_type='individual' and entity_id=(select private.current_athlete_id()))
  or (ranking_type='team' and (select private.manages_team(entity_id)))
  or (ranking_type='pole' and (select private.manages_pole(entity_id)))
  or (ranking_type in('doubles','fours') and exists(select 1 from public.team_rosters r where r.id=entity_id and (select private.manages_team(r.team_id))))
);

create policy ranking_snapshots_admin_insert on public.ranking_snapshots for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and captured_by=(select auth.uid()));

create policy ranking_periods_public_read on public.ranking_periods for select to anon,authenticated using (true);

create policy ranking_periods_admin_insert on public.ranking_periods for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and updated_by=(select auth.uid()));

create policy ranking_periods_admin_update on public.ranking_periods for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])) and updated_by=(select auth.uid()));

create policy ranking_operations_admin_read on public.ranking_operations for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy ranking_operations_admin_insert on public.ranking_operations for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and created_by=(select auth.uid()));

create trigger ranking_periods_audit after insert or update or delete on public.ranking_periods
for each row execute function private.capture_audit_log();

create trigger ranking_operations_audit after insert or update or delete on public.ranking_operations
for each row execute function private.capture_audit_log();

grant select on public.ranking_entries,public.ranking_periods,public.individual_ranking,public.team_rankings,
  public.pole_rankings,public.formation_rankings,public.doubles_rankings,public.fours_rankings,
  public.leveling_ranking_history,public.public_rankings to anon,authenticated;

grant select on public.ranking_contributions,public.ranking_snapshots,public.ranking_operations to authenticated;

grant insert on public.ranking_snapshots,public.ranking_operations to authenticated;

grant insert,update on public.ranking_periods to authenticated;

grant all on public.ranking_entries,public.ranking_contributions,public.ranking_snapshots,public.ranking_periods,public.ranking_operations to service_role;

grant select on public.individual_ranking,public.team_rankings,public.pole_rankings,public.formation_rankings,
  public.doubles_rankings,public.fours_rankings,public.leveling_ranking_history,public.public_rankings to service_role;

revoke insert,update,delete on public.ranking_entries,public.ranking_contributions from anon,authenticated;

revoke all on public.ranking_contributions,public.ranking_snapshots,public.ranking_operations from anon;

select private.refresh_all_rankings(id) from public.seasons;

create or replace function private.enforce_closed_ranking_period()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare correction_reason text:=nullif(current_setting('app.ranking_correction_reason',true),''); is_closed boolean;
begin
  select exists(
    select 1 from public.ranking_periods p where p.season_id=new.season_id
      and ((p.cycle_id is null and p.status='closed')
        or (p.cycle_id is not null and p.status in('official','closed') and p.cycle_id is not distinct from new.season_cycle_id))
  ) into is_closed;
  if is_closed then
    if not (select private.has_any_role(array['admin']::public.app_role[])) or char_length(coalesce(correction_reason,''))<10 then
      raise exception 'closed ranking requires audited admin correction reason' using errcode='42501';
    end if;
    new.metadata:=new.metadata||jsonb_build_object('retroactive_reason',correction_reason);
  end if;
  return new;
end $$;

revoke all on function private.enforce_closed_ranking_period() from public,anon,authenticated;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cycle record;
begin
  if (select auth.uid()) is not null and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:'||target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id,null);
  for cycle in select id from public.season_cycles where season_id=target_season_id loop
    perform private.refresh_ranking_scope(target_season_id,cycle.id);
  end loop;
end $$;

revoke all on function private.refresh_all_rankings(uuid) from public,anon,authenticated;

grant execute on function private.refresh_all_rankings(uuid) to authenticated;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cycle record;
begin
  if (select auth.uid()) is not null and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:'||target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id,null);
  for cycle in select id from public.season_cycles where season_id=target_season_id loop
    perform private.refresh_ranking_scope(target_season_id,cycle.id);
  end loop;
end $$;

revoke all on function private.refresh_all_rankings(uuid) from public,anon,authenticated;

grant execute on function private.refresh_all_rankings(uuid) to authenticated;

create type public.athlete_notification_type as enum (
  'registration_confirmed',
  'waitlist_promoted',
  'match_called',
  'match_result_homologated',
  'ranking_movement',
  'assessment_available',
  'level_changed',
  'team_membership_changed'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  notification_type public.athlete_notification_type not null,
  title text not null check (char_length(trim(title)) between 2 and 120),
  body text not null check (char_length(trim(body)) between 2 and 500),
  action_href text not null check (action_href ~ '^/athlete(?:/|$)'),
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  source_id uuid,
  idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (read_at is null or read_at >= created_at)
);

create index notifications_athlete_timeline
on public.notifications(athlete_id, occurred_at desc, id desc);

create index notifications_athlete_unread
on public.notifications(athlete_id, occurred_at desc)
where read_at is null;

create index notifications_source
on public.notifications(source_type, source_id)
where source_id is not null;

create or replace function private.enqueue_athlete_notification(
  target_athlete uuid,
  target_type public.athlete_notification_type,
  target_title text,
  target_body text,
  target_href text,
  target_source_type text,
  target_source_id uuid,
  target_idempotency_key text,
  target_metadata jsonb default '{}'::jsonb,
  target_occurred_at timestamptz default now()
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications(
    athlete_id, notification_type, title, body, action_href,
    source_type, source_id, idempotency_key, metadata, occurred_at
  )
  values (
    target_athlete, target_type, target_title, target_body, target_href,
    target_source_type, target_source_id, target_idempotency_key,
    coalesce(target_metadata, '{}'::jsonb), coalesce(target_occurred_at, now())
  )
  on conflict (idempotency_key) do nothing
$$;

revoke all on function private.enqueue_athlete_notification(
  uuid, public.athlete_notification_type, text, text, text, text, uuid, text, jsonb, timestamptz
) from public, anon, authenticated;

create or replace function private.notify_ur_play_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind public.athlete_notification_type;
begin
  if new.registration_status <> 'confirmed'
    or (tg_op = 'UPDATE' and old.registration_status = new.registration_status) then
    return new;
  end if;

  kind := case
    when tg_op = 'UPDATE' and old.registration_status = 'waitlisted'
      then 'waitlist_promoted'::public.athlete_notification_type
    else 'registration_confirmed'::public.athlete_notification_type
  end;

  perform private.enqueue_athlete_notification(
    new.athlete_id,
    kind,
    case when kind = 'waitlist_promoted' then 'VocÃª saiu da lista de espera' else 'InscriÃ§Ã£o confirmada' end,
    case when kind = 'waitlist_promoted' then 'Sua vaga no prÃ³ximo UR Play foi confirmada.' else 'Sua presenÃ§a no UR Play estÃ¡ confirmada.' end,
    '/athlete/ur-play/' || new.session_id,
    'ur_play_registration',
    new.id,
    kind::text || ':' || new.id,
    jsonb_build_object('session_id', new.session_id),
    coalesce(new.confirmed_at, new.updated_at, now())
  );
  return new;
end
$$;

create trigger ur_play_registrations_athlete_notification
after insert or update of registration_status on public.ur_play_registrations
for each row execute function private.notify_ur_play_registration();

create or replace function private.notify_match_called()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid;
begin
  if new.status <> 'called' or old.status = 'called' then return new; end if;
  for athlete in
    select participant.athlete_id
    from public.match_participants participant
    where participant.match_id = new.id and participant.status = 'active'
    union
    select squad.athlete_id
    from public.match_squad_members squad
    where squad.match_id = new.id and squad.status = 'active'
  loop
    perform private.enqueue_athlete_notification(
      athlete, 'match_called', 'VocÃª foi chamado',
      'Sua partida estÃ¡ sendo preparada. Confira sua escalaÃ§Ã£o e a quadra.',
      '/athlete/matches/' || new.id, 'match', new.id,
      'match_called:' || new.id || ':' || athlete,
      jsonb_build_object('session_id', new.session_id, 'match_code', new.match_code),
      coalesce(new.called_at, now())
    );
  end loop;
  return new;
end
$$;

create trigger matches_athlete_notification
after update of status on public.matches
for each row execute function private.notify_match_called();

create or replace function private.notify_match_homologated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid;
begin
  if new.result_status <> 'homologated'
    or (tg_op = 'UPDATE' and old.result_status = new.result_status) then return new; end if;
  for athlete in
    select participant.athlete_id
    from public.match_participants participant
    where participant.match_id = new.match_id and participant.status = 'active'
  loop
    perform private.enqueue_athlete_notification(
      athlete, 'match_result_homologated', 'Resultado homologado',
      'O resultado e a pontuaÃ§Ã£o da sua partida jÃ¡ estÃ£o disponÃ­veis.',
      '/athlete/matches/' || new.match_id, 'match_result', new.id,
      'match_result_homologated:' || new.id || ':' || athlete,
      jsonb_build_object('match_id', new.match_id), coalesce(new.homologated_at, now())
    );
  end loop;
  return new;
end
$$;

create trigger match_results_athlete_notification
after insert or update of result_status on public.match_results
for each row execute function private.notify_match_homologated();

create or replace function private.notify_ranking_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ranking_type <> 'individual' or new.cycle_id is not null
    or new.position_change is null or new.position_change = 0 then return new; end if;
  perform private.enqueue_athlete_notification(
    new.entity_id, 'ranking_movement',
    case when new.position_change > 0 then 'VocÃª subiu no ranking' else 'Seu ranking foi atualizado' end,
    case when new.position_change > 0
      then 'VocÃª ganhou ' || new.position_change || ' posiÃ§Ã£o(Ãµes) na classificaÃ§Ã£o.'
      else 'Sua nova posiÃ§Ã£o oficial Ã© #' || new.current_position || '.' end,
    '/athlete/ranking', 'ranking_entry', new.id,
    'ranking_movement:' || new.season_id || ':' || new.entity_id || ':' || new.refreshed_at,
    jsonb_build_object('position', new.current_position, 'change', new.position_change),
    new.refreshed_at
  );
  return new;
end
$$;

create trigger ranking_entries_athlete_notification
after insert on public.ranking_entries
for each row execute function private.notify_ranking_movement();

create or replace function private.notify_assessment_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.athlete_visible
    or (tg_op = 'UPDATE' and old.athlete_visible = new.athlete_visible) then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'assessment_available', 'Nova avaliaÃ§Ã£o disponÃ­vel',
    'A comissÃ£o tÃ©cnica liberou um novo feedback para sua jornada.',
    '/athlete/development', 'athlete_assessment', new.id,
    'assessment_available:' || new.id, '{}'::jsonb, coalesce(new.assessed_at, now())
  );
  return new;
end
$$;

create trigger athlete_assessments_notification
after insert or update of athlete_visible on public.athlete_assessments
for each row execute function private.notify_assessment_available();

create or replace function private.notify_level_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active'
    or (tg_op = 'UPDATE' and old.status = new.status and old.level = new.level) then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'level_changed', 'Seu nÃ­vel foi atualizado',
    'Sua jornada esportiva agora registra o nÃ­vel ' || upper(new.level::text) || '.',
    '/athlete/journey', 'athlete_level', new.id,
    'level_changed:' || new.id || ':' || new.level, jsonb_build_object('level', new.level), new.starts_at
  );
  return new;
end
$$;

create trigger athlete_levels_notification
after insert or update of status, level on public.athlete_levels
for each row execute function private.notify_level_changed();

create or replace function private.notify_team_membership_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = new.status and old.team_id = new.team_id then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'team_membership_changed', 'Seu vÃ­nculo de equipe mudou',
    case when new.status = 'active' then 'Sua nova equipe jÃ¡ aparece no portal do atleta.' else 'Seu vÃ­nculo de equipe foi atualizado.' end,
    '/athlete/profile', 'team_membership', new.id,
    'team_membership_changed:' || new.id || ':' || new.status,
    jsonb_build_object('team_id', new.team_id, 'status', new.status), coalesce(new.starts_at, now())
  );
  return new;
end
$$;

create trigger team_memberships_notification
after insert or update of status, team_id on public.team_memberships
for each row execute function private.notify_team_membership_changed();

alter table public.notifications enable row level security;

alter table public.notifications force row level security;

create policy notifications_athlete_read
on public.notifications for select to authenticated
using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin']::public.app_role[]))
);

create policy notifications_athlete_mark_read
on public.notifications for update to authenticated
using (athlete_id = (select private.current_athlete_id()))
with check (athlete_id = (select private.current_athlete_id()));

create trigger notifications_insert_audit
after insert on public.notifications
for each row execute function private.capture_audit_log();

revoke all on public.notifications from public, anon, authenticated;

grant select on public.notifications to authenticated;

grant update(read_at) on public.notifications to authenticated;

grant all on public.notifications to service_role;

create type public.tournament_product as enum ('series', 'cup', 'legends');

create type public.tournament_status as enum (
  'draft',
  'registration_open',
  'registration_closed',
  'seeded',
  'scheduled',
  'in_progress',
  'completed',
  'official',
  'cancelled'
);

create type public.tournament_format as enum ('league', 'groups_championship', 'power_stage');

create type public.tournament_registration_status as enum ('pending', 'eligible', 'ineligible', 'confirmed', 'cancelled');

create type public.tournament_invite_status as enum ('invited', 'accepted', 'declined', 'replaced');

create type public.match_format_type as enum ('single_game', 'best_of_3');

alter table public.ur_play_sessions
  add column if not exists competition_mode text not null default 'rotation'
    check (competition_mode in ('rotation', 'scheduled_rounds')),
  add column if not exists planned_slot_minutes smallint check (planned_slot_minutes is null or planned_slot_minutes between 10 and 180);

alter table public.match_scoring_rules
  add column if not exists match_format public.match_format_type not null default 'single_game',
  add column if not exists set_rules jsonb not null default '[{"set_number":1,"points_to_win":11,"win_by":1}]'::jsonb,
  add constraint match_scoring_rules_set_rules_array check (jsonb_typeof(set_rules) = 'array');

create table public.tournament_calendar_templates (
  id uuid primary key default gen_random_uuid(),
  pole_id uuid references public.poles(id) on delete restrict,
  name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  default_competition_mode text not null default 'rotation' check (default_competition_mode in ('rotation','scheduled_rounds','tournament')),
  max_courts smallint not null default 1 check (max_courts between 1 and 8),
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint tournament_calendar_time_order check (ends_at > starts_at)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  product public.tournament_product not null,
  event_context public.match_event_context not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  season_cycle_id uuid references public.season_cycles(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  name text not null,
  public_slug text not null unique,
  status public.tournament_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  official_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  constraint tournaments_product_context check (
    (product = 'series' and event_context = 'pole_tournament')
    or (product = 'cup' and event_context = 'regional')
    or (product = 'legends' and event_context = 'legends')
  ),
  constraint tournaments_cancel_reason check (
    (status <> 'cancelled' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null and char_length(trim(cancellation_reason)) >= 10)
  )
);

create table public.tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete restrict,
  format_id uuid not null references public.competitive_formats(id) on delete restrict,
  category_id uuid not null references public.competitive_categories(id) on delete restrict,
  level public.athlete_level not null check (level in ('n1','n2')),
  format public.tournament_format,
  status public.tournament_status not null default 'draft',
  min_formations smallint not null default 3 check (min_formations >= 2),
  planned_slot_minutes smallint not null default 45 check (planned_slot_minutes between 15 and 180),
  max_courts smallint not null default 1 check (max_courts between 1 and 8),
  price_frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, format_id, category_id, level)
);

create table public.tournament_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete restrict,
  division_id uuid references public.tournament_divisions(id) on delete restrict,
  entry_number smallint not null check (entry_number > 0),
  price numeric(10,2) not null check (price >= 0),
  currency char(3) not null default 'BRL',
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  unique (tournament_id, division_id, entry_number)
);

create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  roster_id uuid references public.team_rosters(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  status public.tournament_registration_status not null default 'pending',
  payment_status public.ur_play_payment_status not null default 'pending',
  eligibility_status public.tournament_registration_status not null default 'pending',
  eligibility_reasons text[] not null default '{}',
  price_amount numeric(10,2) not null default 0,
  price_currency char(3) not null default 'BRL',
  registered_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, roster_id)
);

create table public.tournament_rosters (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.tournament_registrations(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  role text not null check (role in ('starter','reserve')),
  position_order smallint not null check (position_order between 1 and 7),
  eligibility_status public.tournament_registration_status not null default 'pending',
  eligibility_reasons text[] not null default '{}',
  team_snapshot jsonb not null default '{}'::jsonb,
  pole_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (registration_id, athlete_id),
  unique (registration_id, role, position_order)
);

create table public.tournament_seeds (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  registration_id uuid references public.tournament_registrations(id) on delete restrict,
  seed_position smallint not null check (seed_position > 0),
  source text not null default 'ranking' check (source in ('ranking','draw','manual','legends_auto')),
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  unique (division_id, registration_id),
  unique (division_id, seed_position),
  constraint tournament_seed_manual_reason check (source not in ('manual','draw') or char_length(trim(reason)) >= 5)
);

create table public.tournament_stages (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  stage_type text not null check (stage_type in ('league','group','semifinal','bronze','final','placement','power_round')),
  name text not null,
  stage_order smallint not null check (stage_order > 0),
  status public.tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (division_id, stage_order)
);

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tournament_stages(id) on delete restrict,
  name text not null,
  group_order smallint not null check (group_order > 0),
  created_at timestamptz not null default now(),
  unique (stage_id, group_order)
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  stage_id uuid references public.tournament_stages(id) on delete restrict,
  group_id uuid references public.tournament_groups(id) on delete restrict,
  match_id uuid not null unique references public.matches(id) on delete restrict,
  round_number smallint not null check (round_number > 0),
  match_order smallint not null check (match_order > 0),
  planned_court_id uuid references public.courts(id) on delete restrict,
  planned_starts_at timestamptz,
  planned_slot_minutes smallint not null default 45 check (planned_slot_minutes between 15 and 180),
  label text,
  created_at timestamptz not null default now(),
  unique (division_id, round_number, match_order)
);

create table public.tournament_qualifications (
  id uuid primary key default gen_random_uuid(),
  source_tournament_id uuid not null references public.tournaments(id) on delete restrict,
  source_division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  qualification_position smallint not null check (qualification_position in (1,2)),
  qualified_registration_id uuid not null references public.tournament_registrations(id) on delete restrict,
  qualified_roster_id uuid references public.team_rosters(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  level public.athlete_level not null,
  format_id uuid not null references public.competitive_formats(id) on delete restrict,
  category_id uuid not null references public.competitive_categories(id) on delete restrict,
  target_competition public.tournament_product not null default 'cup',
  status text not null default 'earned' check (status in ('earned','accepted','declined','reallocated')),
  created_at timestamptz not null default now(),
  unique (source_division_id, qualification_position)
);

create table public.tournament_invites (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  ranking_position smallint not null check (ranking_position > 0),
  status public.tournament_invite_status not null default 'invited',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  replaced_by_athlete_id uuid references public.athletes(id) on delete restrict,
  reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  unique (division_id, athlete_id)
);

create table public.tournament_prize_plans (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete restrict,
  division_id uuid references public.tournament_divisions(id) on delete restrict,
  description text not null,
  config jsonb not null default '{}'::jsonb,
  status public.entity_status not null default 'draft',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create table public.tournament_results (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.tournament_divisions(id) on delete restrict,
  champion_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  runner_up_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  third_place_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  final_standings jsonb not null,
  version_number integer not null default 1 check (version_number > 0),
  official_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  correction_reason text,
  unique (division_id, version_number)
);

create table public.tournament_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete restrict,
  division_id uuid references public.tournament_divisions(id) on delete restrict,
  tournament_match_id uuid references public.tournament_matches(id) on delete restrict,
  court_id uuid references public.courts(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('referee','assistant_referee','scorer','operator','coordinator')),
  starts_at timestamptz,
  ends_at timestamptz,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);

create index tournament_divisions_tournament on public.tournament_divisions(tournament_id);

create index tournament_registrations_division on public.tournament_registrations(division_id, status);

create index tournament_rosters_registration on public.tournament_rosters(registration_id, role);

create index tournament_matches_division_round on public.tournament_matches(division_id, round_number, match_order);

create index tournament_staff_profile on public.tournament_staff_assignments(profile_id, status);

create view public.public_tournaments
with (security_invoker = true)
as
select
  t.id,
  t.product,
  t.name,
  t.public_slug,
  t.status,
  t.starts_at,
  t.ends_at,
  p.name as pole_name
from public.tournaments t
left join public.poles p on p.id = t.pole_id
where t.status in ('registration_open','registration_closed','seeded','scheduled','in_progress','completed','official');

create view public.tournament_standings
with (security_invoker = true)
as
select
  tm.division_id,
  tr.id as registration_id,
  count(mr.id) filter (where mr.result_status = 'homologated' and ms.id = mr.winner_side_id)::integer as match_wins,
  count(mr.id) filter (where mr.result_status = 'homologated' and ms.id <> mr.winner_side_id)::integer as match_losses
from public.tournament_matches tm
join public.match_sides ms on ms.match_id = tm.match_id
left join public.tournament_registrations tr on tr.roster_id = ms.roster_id
left join public.match_results mr on mr.match_id = tm.match_id
group by tm.division_id, tr.id;

create or replace function private.can_read_tournament(target_tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1 from public.tournaments t
      where t.id = target_tournament
        and t.status <> 'draft'
        and (private.manages_pole(t.pole_id) or private.has_any_role(array['athlete','team_manager','pole_manager']::public.app_role[]))
    );
$$;

create or replace function private.reject_tournament_result_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$ begin
  raise exception 'tournament result history is append-only' using errcode = '42501';
end $$;

revoke all on function private.can_read_tournament(uuid) from public, anon;

revoke all on function private.reject_tournament_result_mutation() from public, anon, authenticated;

grant execute on function private.can_read_tournament(uuid) to authenticated;

create trigger tournament_results_append_only
before update or delete on public.tournament_results
for each row execute function private.reject_tournament_result_mutation();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tournament_calendar_templates','tournaments','tournament_divisions',
    'tournament_pricing_rules','tournament_registrations','tournament_rosters',
    'tournament_seeds','tournament_stages','tournament_groups',
    'tournament_matches','tournament_qualifications','tournament_invites',
    'tournament_prize_plans','tournament_results','tournament_staff_assignments'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy tournaments_admin_all on public.tournaments for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournaments_read on public.tournaments for select to authenticated
using (private.can_read_tournament(id));

create policy tournament_child_admin_all on public.tournament_divisions for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_child_read on public.tournament_divisions for select to authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_id and private.can_read_tournament(t.id)));

create policy tournament_registrations_admin_all on public.tournament_registrations for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_registrations_team_read on public.tournament_registrations for select to authenticated
using (
  private.has_any_role(array['admin','operator']::public.app_role[])
  or private.manages_team(team_id)
  or exists (
    select 1 from public.tournament_rosters r
    where r.registration_id = tournament_registrations.id
      and r.athlete_id = private.current_athlete_id()
  )
);

create policy tournament_rosters_admin_all on public.tournament_rosters for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_rosters_read on public.tournament_rosters for select to authenticated
using (
  athlete_id = private.current_athlete_id()
  or exists (
    select 1 from public.tournament_registrations r
    where r.id = registration_id
      and (private.manages_team(r.team_id) or private.has_any_role(array['admin','operator']::public.app_role[]))
  )
);

create policy tournament_operational_tables_admin on public.tournament_calendar_templates for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_pricing_admin on public.tournament_pricing_rules for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_pricing_read on public.tournament_pricing_rules for select to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and private.can_read_tournament(t.id)));

create policy tournament_seed_admin on public.tournament_seeds for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_seed_read on public.tournament_seeds for select to authenticated using (exists (select 1 from public.tournament_divisions d join public.tournaments t on t.id=d.tournament_id where d.id=division_id and private.can_read_tournament(t.id)));

create policy tournament_stages_admin on public.tournament_stages for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_stages_read on public.tournament_stages for select to authenticated using (exists (select 1 from public.tournament_divisions d join public.tournaments t on t.id=d.tournament_id where d.id=division_id and private.can_read_tournament(t.id)));

create policy tournament_groups_admin on public.tournament_groups for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_groups_read on public.tournament_groups for select to authenticated using (exists (select 1 from public.tournament_stages s join public.tournament_divisions d on d.id=s.division_id join public.tournaments t on t.id=d.tournament_id where s.id=stage_id and private.can_read_tournament(t.id)));

create policy tournament_matches_admin on public.tournament_matches for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_matches_read on public.tournament_matches for select to authenticated using (exists (select 1 from public.tournament_divisions d join public.tournaments t on t.id=d.tournament_id where d.id=division_id and private.can_read_tournament(t.id)));

create policy tournament_qualifications_admin on public.tournament_qualifications for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_qualifications_read on public.tournament_qualifications for select to authenticated using (exists (select 1 from public.tournaments t where t.id=source_tournament_id and private.can_read_tournament(t.id)));

create policy tournament_invites_admin on public.tournament_invites for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_invites_read on public.tournament_invites for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]) or private.manages_pole(pole_id));

create policy tournament_prizes_admin on public.tournament_prize_plans for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_prizes_read on public.tournament_prize_plans for select to authenticated using (exists (select 1 from public.tournaments t where t.id=tournament_id and private.can_read_tournament(t.id)));

create policy tournament_results_admin on public.tournament_results for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_results_read on public.tournament_results for select to authenticated using (exists (select 1 from public.tournament_divisions d join public.tournaments t on t.id=d.tournament_id where d.id=division_id and private.can_read_tournament(t.id)));

create policy tournament_staff_admin on public.tournament_staff_assignments for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_staff_read on public.tournament_staff_assignments for select to authenticated using (profile_id = auth.uid() or private.has_any_role(array['admin','operator']::public.app_role[]));

grant select on
  public.public_tournaments,
  public.tournament_standings
to anon, authenticated;

grant select, insert, update, delete on
  public.tournament_calendar_templates,
  public.tournaments,
  public.tournament_divisions,
  public.tournament_pricing_rules,
  public.tournament_registrations,
  public.tournament_rosters,
  public.tournament_seeds,
  public.tournament_stages,
  public.tournament_groups,
  public.tournament_matches,
  public.tournament_qualifications,
  public.tournament_invites,
  public.tournament_prize_plans,
  public.tournament_results,
  public.tournament_staff_assignments
to authenticated;

revoke all on
  public.tournament_calendar_templates,
  public.tournaments,
  public.tournament_divisions,
  public.tournament_pricing_rules,
  public.tournament_registrations,
  public.tournament_rosters,
  public.tournament_seeds,
  public.tournament_stages,
  public.tournament_groups,
  public.tournament_matches,
  public.tournament_qualifications,
  public.tournament_invites,
  public.tournament_prize_plans,
  public.tournament_results,
  public.tournament_staff_assignments
from anon;

grant all on
  public.tournament_calendar_templates,
  public.tournaments,
  public.tournament_divisions,
  public.tournament_pricing_rules,
  public.tournament_registrations,
  public.tournament_rosters,
  public.tournament_seeds,
  public.tournament_stages,
  public.tournament_groups,
  public.tournament_matches,
  public.tournament_qualifications,
  public.tournament_invites,
  public.tournament_prize_plans,
  public.tournament_results,
  public.tournament_staff_assignments
to service_role;

-- Sprint 12 closeout reconciliation: additive multi-set and schema hardening.

alter table public.match_rallies
  add column if not exists set_number smallint not null default 1;

alter table public.match_results
  add column if not exists sets_a smallint not null default 0,
  add column if not exists sets_b smallint not null default 0,
  add column if not exists current_set smallint not null default 1,
  add column if not exists set_scores jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_rallies_set_number_check'
      and conrelid = 'public.match_rallies'::regclass
  ) then
    alter table public.match_rallies
      add constraint match_rallies_set_number_check check (set_number between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_results_sets_check'
      and conrelid = 'public.match_results'::regclass
  ) then
    alter table public.match_results
      add constraint match_results_sets_check
      check (sets_a >= 0 and sets_b >= 0 and current_set between 1 and 5 and jsonb_typeof(set_scores) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_scoring_rules_set_rules_array'
      and conrelid = 'public.match_scoring_rules'::regclass
  ) then
    alter table public.match_scoring_rules
      add constraint match_scoring_rules_set_rules_array
      check (jsonb_typeof(set_rules) = 'array' and jsonb_array_length(set_rules) between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tournaments_cancel_reason'
      and conrelid = 'public.tournaments'::regclass
  ) then
    alter table public.tournaments
      add constraint tournaments_cancel_reason
      check (
        (status = 'cancelled' and cancelled_at is not null and nullif(trim(cancellation_reason), '') is not null)
        or status <> 'cancelled'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tournament_seed_manual_reason'
      and conrelid = 'public.tournament_seeds'::regclass
  ) then
    alter table public.tournament_seeds
      add constraint tournament_seed_manual_reason
      check (
        (source = 'manual' and nullif(trim(coalesce(reason, '')), '') is not null)
        or source <> 'manual'
      );
  end if;
end $$;

create index if not exists tournament_divisions_tournament
  on public.tournament_divisions (tournament_id, status, level);

create index if not exists tournament_registrations_division
  on public.tournament_registrations (division_id, status, payment_status);

create index if not exists tournament_rosters_registration
  on public.tournament_rosters (registration_id, athlete_id, role);

create index if not exists tournament_matches_division_round
  on public.tournament_matches (division_id, round_number, match_order);

create index if not exists tournament_staff_profile
  on public.tournament_staff_assignments (profile_id, tournament_id, division_id);

create index if not exists match_rallies_match_set_recorded
  on public.match_rallies (match_id, set_number, rally_number);

create or replace function private.reject_tournament_result_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'TOURNAMENT_RESULTS_APPEND_ONLY'
    using errcode = 'P0001',
      detail = 'Official tournament result rows are append-only. Create a new version instead.';
end;
$$;

revoke all on function private.reject_tournament_result_mutation() from public;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'tournament_results_append_only'
      and tgrelid = 'public.tournament_results'::regclass
  ) then
    create trigger tournament_results_append_only
      before update or delete on public.tournament_results
      for each row execute function private.reject_tournament_result_mutation();
  end if;
end $$;

create or replace view public.tournament_match_scoreboard
with (security_invoker = true)
as
select
  tm.id as tournament_match_id,
  tm.division_id,
  tm.match_id,
  coalesce(msr.match_format, 'single_game'::public.match_format_type) as match_format,
  mr.set_number,
  count(*) filter (where mside.side = 'A')::smallint as score_a,
  count(*) filter (where mside.side = 'B')::smallint as score_b,
  max(mr.rally_number) as last_rally_number
from public.tournament_matches tm
join public.match_rallies mr on mr.match_id = tm.match_id
join public.match_sides mside on mside.id = mr.winning_side_id
left join public.match_scoring_rules msr on msr.match_id = tm.match_id
where mr.status = 'valid'
group by tm.id, tm.division_id, tm.match_id, msr.match_format, mr.set_number;

grant select on public.tournament_match_scoreboard to authenticated;

create or replace function private.can_read_tournament(target_tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1
      from public.tournaments t
      where t.id = target_tournament
        and t.status <> 'draft'
        and (
          private.manages_pole(t.pole_id)
          or private.has_any_role(array['athlete','team_manager','pole_manager']::public.app_role[])
        )
    );
$$;

revoke all on function private.can_read_tournament(uuid) from public;

drop policy if exists tournaments_admin_all on public.tournaments;

drop policy if exists tournaments_read on public.tournaments;

create policy tournaments_admin_operator_select on public.tournaments
  for select to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournaments_public_select on public.tournaments
  for select to anon
  using (status in ('registration_open','registration_closed','seeded','scheduled','in_progress','completed','official'));

create policy tournaments_authenticated_scoped_select on public.tournaments
  for select to authenticated
  using (
    status <> 'draft'
    and (
      private.manages_pole(pole_id)
      or private.has_any_role(array['athlete','team_manager','pole_manager']::public.app_role[])
    )
  );

create policy tournaments_admin_operator_insert on public.tournaments
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournaments_admin_operator_update on public.tournaments
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournaments_admin_delete on public.tournaments
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

drop policy if exists tournament_divisions_admin_all on public.tournament_divisions;

drop policy if exists tournament_divisions_read on public.tournament_divisions;

create policy tournament_divisions_read_scoped on public.tournament_divisions
  for select to authenticated
  using (private.can_read_tournament(tournament_id));

create policy tournament_divisions_admin_operator_insert on public.tournament_divisions
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournament_divisions_admin_operator_update on public.tournament_divisions
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournament_divisions_admin_delete on public.tournament_divisions
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

drop policy if exists tournament_registrations_admin_all on public.tournament_registrations;

drop policy if exists tournament_registrations_read on public.tournament_registrations;

drop policy if exists tournament_rosters_admin_all on public.tournament_rosters;

drop policy if exists tournament_rosters_read on public.tournament_rosters;

create policy tournament_registrations_read_scoped on public.tournament_registrations
  for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_divisions td
      where td.id = division_id
        and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_registrations_insert_scoped on public.tournament_registrations
  for insert to authenticated
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );

create policy tournament_registrations_update_scoped on public.tournament_registrations
  for update to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );

create policy tournament_registrations_admin_delete on public.tournament_registrations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_rosters_read_scoped on public.tournament_rosters
  for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_registrations tr
      join public.tournament_divisions td on td.id = tr.division_id
      where tr.id = registration_id
        and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_rosters_insert_scoped on public.tournament_rosters
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.tournament_registrations tr
      where tr.id = registration_id
        and (
          private.has_any_role(array['admin','operator']::public.app_role[])
          or private.manages_pole(tr.pole_id)
        )
    )
  );

create policy tournament_rosters_update_scoped on public.tournament_rosters
  for update to authenticated
  using (
    exists (
      select 1
      from public.tournament_registrations tr
      where tr.id = registration_id
        and (
          private.has_any_role(array['admin','operator']::public.app_role[])
          or private.manages_pole(tr.pole_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.tournament_registrations tr
      where tr.id = registration_id
        and (
          private.has_any_role(array['admin','operator']::public.app_role[])
          or private.manages_pole(tr.pole_id)
        )
    )
  );

create policy tournament_rosters_admin_delete on public.tournament_rosters
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

drop policy if exists tournament_matches_admin on public.tournament_matches;

drop policy if exists tournament_matches_read on public.tournament_matches;

create policy tournament_matches_read_scoped on public.tournament_matches
  for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_divisions td
      where td.id = division_id
        and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_matches_admin_operator_insert on public.tournament_matches
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournament_matches_admin_operator_update on public.tournament_matches
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy tournament_matches_admin_delete on public.tournament_matches
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

drop policy if exists tournaments_admin_operator_select on public.tournaments;

drop policy if exists tournaments_authenticated_scoped_select on public.tournaments;

create policy tournaments_authenticated_select on public.tournaments
  for select to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or (
      status <> 'draft'
      and (
        private.manages_pole(pole_id)
        or private.has_any_role(array['athlete','team_manager','pole_manager']::public.app_role[])
      )
    )
  );

drop policy if exists tournament_calendar_templates_admin on public.tournament_calendar_templates;

drop policy if exists tournament_calendar_templates_read on public.tournament_calendar_templates;

drop policy if exists tournament_groups_admin on public.tournament_groups;

drop policy if exists tournament_groups_read on public.tournament_groups;

drop policy if exists tournament_invites_admin on public.tournament_invites;

drop policy if exists tournament_invites_read on public.tournament_invites;

drop policy if exists tournament_pricing_rules_admin on public.tournament_pricing_rules;

drop policy if exists tournament_pricing_rules_read on public.tournament_pricing_rules;

drop policy if exists tournament_prize_plans_admin on public.tournament_prize_plans;

drop policy if exists tournament_prize_plans_read on public.tournament_prize_plans;

drop policy if exists tournament_qualifications_admin on public.tournament_qualifications;

drop policy if exists tournament_qualifications_read on public.tournament_qualifications;

drop policy if exists tournament_results_admin on public.tournament_results;

drop policy if exists tournament_results_read on public.tournament_results;

drop policy if exists tournament_seeds_admin on public.tournament_seeds;

drop policy if exists tournament_seeds_read on public.tournament_seeds;

drop policy if exists tournament_staff_assignments_admin on public.tournament_staff_assignments;

drop policy if exists tournament_staff_assignments_read on public.tournament_staff_assignments;

drop policy if exists tournament_stages_admin on public.tournament_stages;

drop policy if exists tournament_stages_read on public.tournament_stages;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tournament_calendar_templates',
    'tournament_groups',
    'tournament_invites',
    'tournament_pricing_rules',
    'tournament_prize_plans',
    'tournament_qualifications',
    'tournament_results',
    'tournament_seeds',
    'tournament_staff_assignments',
    'tournament_stages'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_any_role(array[''admin'',''operator'']::public.app_role[]))',
      table_name || '_admin_operator_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_any_role(array[''admin'',''operator'']::public.app_role[])) with check (private.has_any_role(array[''admin'',''operator'']::public.app_role[]))',
      table_name || '_admin_operator_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_any_role(array[''admin'']::public.app_role[]))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end $$;

create policy tournament_calendar_templates_read_scoped on public.tournament_calendar_templates
  for select to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );

create policy tournament_pricing_rules_read_scoped on public.tournament_pricing_rules
  for select to authenticated
  using (private.can_read_tournament(tournament_id));

create policy tournament_prize_plans_read_scoped on public.tournament_prize_plans
  for select to authenticated
  using (
    private.can_read_tournament(tournament_id)
    or exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_stages_read_scoped on public.tournament_stages
  for select to authenticated
  using (
    exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_groups_read_scoped on public.tournament_groups
  for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_stages ts
      join public.tournament_divisions td on td.id = ts.division_id
      where ts.id = stage_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_seeds_read_scoped on public.tournament_seeds
  for select to authenticated
  using (
    exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_results_read_scoped on public.tournament_results
  for select to authenticated
  using (
    exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_qualifications_read_scoped on public.tournament_qualifications
  for select to authenticated
  using (
    private.can_read_tournament(source_tournament_id)
    or exists (
      select 1 from public.tournament_divisions td
      where td.id = source_division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_invites_read_scoped on public.tournament_invites
  for select to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
    or exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

create policy tournament_staff_assignments_read_scoped on public.tournament_staff_assignments
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or private.can_read_tournament(tournament_id)
    or exists (
      select 1 from public.tournament_divisions td
      where td.id = division_id and private.can_read_tournament(td.tournament_id)
    )
  );

-- Season 1 completion — master calendar and event operations.
-- Additive only. Do not edit previously applied migrations.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_event_type') then
    create type public.calendar_event_type as enum (
      'ur_play',
      'training',
      'hunter',
      'series',
      'cup',
      'legends',
      'clinic',
      'partner_event',
      'special_event'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_event_status') then
    create type public.calendar_event_status as enum (
      'draft',
      'planned',
      'published',
      'registration_open',
      'in_progress',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_phase') then
    create type public.calendar_checklist_phase as enum (
      'd_minus_14',
      'd_minus_7',
      'd_minus_3',
      'd_day',
      'd_plus_1',
      'd_plus_2'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_category') then
    create type public.calendar_checklist_category as enum (
      'venue',
      'courts',
      'registrations',
      'eligibility',
      'payments',
      'staff',
      'referee',
      'materials',
      'media',
      'sponsor',
      'match_ids',
      'results',
      'ranking',
      'post_event',
      'finance'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_status') then
    create type public.calendar_checklist_status as enum (
      'pending',
      'in_progress',
      'done',
      'waived',
      'blocked'
    );
  end if;
end $$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  season_cycle_id uuid references public.season_cycles(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  event_type public.calendar_event_type not null,
  name text not null check (char_length(trim(name)) between 3 and 140),
  status public.calendar_event_status not null default 'draft',
  competition_mode text check (competition_mode is null or competition_mode in ('rotation','scheduled_rounds','tournament')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  capacity integer check (capacity is null or capacity >= 0),
  court_count_target smallint check (court_count_target is null or court_count_target >= 1),
  notes text,
  source text not null default 'manual' check (source in ('manual','q1_template','tournament','ur_play','training','hunter','partner')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_starts_at timestamptz not null,
  occurrence_ends_at timestamptz not null,
  status public.calendar_event_status not null default 'planned',
  generated_from_template boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  check (occurrence_ends_at > occurrence_starts_at)
);

create table if not exists public.event_courts (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_id uuid references public.event_occurrences(id) on delete restrict,
  court_id uuid not null references public.courts(id) on delete restrict,
  status text not null default 'planned' check (status in ('planned','confirmed','unavailable','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (calendar_event_id, occurrence_id, court_id)
);

create table if not exists public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_id uuid references public.event_occurrences(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in (
    'technical_director',
    'pole_coordinator',
    'technical_evaluator',
    'referee',
    'assistant_referee',
    'score_operator',
    'performance_analyst',
    'media_operator',
    'coach'
  )),
  court_id uuid references public.courts(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','confirmed','declined','replaced','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (calendar_event_id, occurrence_id, profile_id, role, court_id)
);

create table if not exists public.event_checklists (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  phase public.calendar_checklist_phase not null,
  category public.calendar_checklist_category not null,
  title text not null check (char_length(trim(title)) between 3 and 160),
  status public.calendar_checklist_status not null default 'pending',
  owner_profile_id uuid references public.profiles(id) on delete restrict,
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done' and completed_at is not null) or status <> 'done')
);

create table if not exists public.calendar_q1_templates (
  id uuid primary key default gen_random_uuid(),
  pole_id uuid references public.poles(id) on delete restrict,
  name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  event_type public.calendar_event_type not null default 'ur_play',
  competition_mode text not null default 'scheduled_rounds' check (competition_mode in ('rotation','scheduled_rounds','tournament')),
  target_courts smallint not null default 1 check (target_courts >= 1),
  alternates_friday boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (pole_id, weekday, starts_at, ends_at, event_type)
);

alter table public.tournaments
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete restrict;

alter table public.ur_play_sessions
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete restrict;

create index if not exists calendar_events_time
  on public.calendar_events (starts_at, ends_at, status);

create index if not exists calendar_events_pole_type
  on public.calendar_events (pole_id, event_type, status, starts_at);

create index if not exists event_occurrences_event_time
  on public.event_occurrences (calendar_event_id, occurrence_starts_at, occurrence_ends_at);

create index if not exists event_courts_court_event
  on public.event_courts (court_id, calendar_event_id);

create index if not exists event_staff_profile_event
  on public.event_staff_assignments (profile_id, calendar_event_id, role);

create index if not exists event_checklists_event_status
  on public.event_checklists (calendar_event_id, phase, status);

create index if not exists tournaments_calendar_event
  on public.tournaments (calendar_event_id) where calendar_event_id is not null;

create index if not exists ur_play_sessions_calendar_event
  on public.ur_play_sessions (calendar_event_id) where calendar_event_id is not null;

create or replace view public.calendar_event_conflicts
with (security_invoker = true)
as
select
  'court_overlap'::text as conflict_type,
  left_event.id as calendar_event_id,
  right_event.id as conflicting_event_id,
  left_event.starts_at,
  left_event.ends_at,
  left_court.court_id,
  null::uuid as profile_id,
  'Court assigned to overlapping events'::text as detail
from public.calendar_events left_event
join public.event_courts left_court on left_court.calendar_event_id = left_event.id
join public.event_courts right_court on right_court.court_id = left_court.court_id
join public.calendar_events right_event on right_event.id = right_court.calendar_event_id
where left_event.id < right_event.id
  and left_event.status <> 'cancelled'
  and right_event.status <> 'cancelled'
  and tstzrange(left_event.starts_at, left_event.ends_at, '[)') && tstzrange(right_event.starts_at, right_event.ends_at, '[)')
union all
select
  'staff_overlap',
  left_event.id,
  right_event.id,
  left_event.starts_at,
  left_event.ends_at,
  null::uuid,
  left_staff.profile_id,
  'Staff assigned to overlapping events'
from public.calendar_events left_event
join public.event_staff_assignments left_staff on left_staff.calendar_event_id = left_event.id
join public.event_staff_assignments right_staff on right_staff.profile_id = left_staff.profile_id
join public.calendar_events right_event on right_event.id = right_staff.calendar_event_id
where left_event.id < right_event.id
  and left_event.status <> 'cancelled'
  and right_event.status <> 'cancelled'
  and left_staff.status not in ('declined','cancelled','replaced')
  and right_staff.status not in ('declined','cancelled','replaced')
  and tstzrange(left_event.starts_at, left_event.ends_at, '[)') && tstzrange(right_event.starts_at, right_event.ends_at, '[)');

create or replace view public.admin_calendar_operations
with (security_invoker = true)
as
select
  ce.id,
  ce.name,
  ce.event_type,
  ce.status,
  ce.starts_at,
  ce.ends_at,
  ce.competition_mode,
  ce.capacity,
  ce.court_count_target,
  ce.pole_id,
  p.name as pole_name,
  ce.venue_id,
  v.name as venue_name,
  count(distinct ec.court_id)::integer as assigned_courts,
  count(distinct esa.profile_id)::integer as assigned_staff,
  count(distinct chk.id) filter (where chk.status in ('pending','in_progress','blocked'))::integer as open_checklist_items,
  count(distinct cfc.conflicting_event_id)::integer as conflict_count
from public.calendar_events ce
left join public.poles p on p.id = ce.pole_id
left join public.venues v on v.id = ce.venue_id
left join public.event_courts ec on ec.calendar_event_id = ce.id and ec.status <> 'cancelled'
left join public.event_staff_assignments esa on esa.calendar_event_id = ce.id and esa.status not in ('declined','cancelled','replaced')
left join public.event_checklists chk on chk.calendar_event_id = ce.id
left join public.calendar_event_conflicts cfc on cfc.calendar_event_id = ce.id
group by ce.id, p.name, v.name;

grant select on public.admin_calendar_operations to authenticated;

grant select on public.calendar_event_conflicts to authenticated;

create or replace function private.can_read_calendar_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = target_event
        and private.manages_pole(ce.pole_id)
    )
    or exists (
      select 1
      from public.event_staff_assignments esa
      where esa.calendar_event_id = target_event
        and esa.profile_id = (select auth.uid())
        and esa.status not in ('declined','cancelled','replaced')
    );
$$;

revoke all on function private.can_read_calendar_event(uuid) from public;

grant execute on function private.can_read_calendar_event(uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'calendar_events',
    'event_occurrences',
    'event_courts',
    'event_staff_assignments',
    'event_checklists',
    'calendar_q1_templates'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy calendar_events_read on public.calendar_events
  for select to authenticated
  using (private.can_read_calendar_event(id));

create policy calendar_events_insert on public.calendar_events
  for insert to authenticated
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );

create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );

create policy calendar_events_delete on public.calendar_events
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy event_occurrences_read on public.event_occurrences
  for select to authenticated
  using (private.can_read_calendar_event(calendar_event_id));

create policy event_occurrences_write on public.event_occurrences
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_courts_read on public.event_courts
  for select to authenticated
  using (private.can_read_calendar_event(calendar_event_id));

create policy event_courts_write on public.event_courts
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_staff_read on public.event_staff_assignments
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or private.can_read_calendar_event(calendar_event_id)
  );

create policy event_staff_write on public.event_staff_assignments
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_checklists_read on public.event_checklists
  for select to authenticated
  using (
    owner_profile_id = (select auth.uid())
    or private.can_read_calendar_event(calendar_event_id)
  );

create policy event_checklists_write on public.event_checklists
  for all to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  );

create policy calendar_q1_templates_read on public.calendar_q1_templates
  for select to authenticated
  using (
    active
    and (
      private.has_any_role(array['admin','operator']::public.app_role[])
      or private.manages_pole(pole_id)
    )
  );

create policy calendar_q1_templates_write on public.calendar_q1_templates
  for all to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.calendar_events,
  public.event_occurrences,
  public.event_courts,
  public.event_staff_assignments,
  public.event_checklists,
  public.calendar_q1_templates
to authenticated;

grant all on
  public.calendar_events,
  public.event_occurrences,
  public.event_courts,
  public.event_staff_assignments,
  public.event_checklists,
  public.calendar_q1_templates
to service_role;

-- Season 1 completion — calendar advisor cleanup.
-- Non-destructive follow-up to add covering FK indexes and avoid duplicated permissive SELECT policies.

create index if not exists calendar_events_season_id
  on public.calendar_events (season_id) where season_id is not null;

create index if not exists calendar_events_season_cycle_id
  on public.calendar_events (season_cycle_id) where season_cycle_id is not null;

create index if not exists calendar_events_venue_id
  on public.calendar_events (venue_id) where venue_id is not null;

create index if not exists calendar_events_created_by
  on public.calendar_events (created_by) where created_by is not null;

create index if not exists calendar_events_updated_by
  on public.calendar_events (updated_by) where updated_by is not null;

create index if not exists event_courts_occurrence_id
  on public.event_courts (occurrence_id) where occurrence_id is not null;

create index if not exists event_courts_calendar_event_id
  on public.event_courts (calendar_event_id);

create index if not exists event_staff_assignments_occurrence_id
  on public.event_staff_assignments (occurrence_id) where occurrence_id is not null;

create index if not exists event_staff_assignments_court_id
  on public.event_staff_assignments (court_id) where court_id is not null;

create index if not exists event_staff_assignments_calendar_event_id
  on public.event_staff_assignments (calendar_event_id);

create index if not exists event_checklists_owner_profile_id
  on public.event_checklists (owner_profile_id) where owner_profile_id is not null;

drop policy if exists event_occurrences_write on public.event_occurrences;

create policy event_occurrences_insert on public.event_occurrences
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_occurrences_update on public.event_occurrences
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_occurrences_delete on public.event_occurrences
  for delete to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

drop policy if exists event_courts_write on public.event_courts;

create policy event_courts_insert on public.event_courts
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_courts_update on public.event_courts
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_courts_delete on public.event_courts
  for delete to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

drop policy if exists event_staff_write on public.event_staff_assignments;

create policy event_staff_insert on public.event_staff_assignments
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_staff_update on public.event_staff_assignments
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_staff_delete on public.event_staff_assignments
  for delete to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

drop policy if exists event_checklists_write on public.event_checklists;

create policy event_checklists_insert on public.event_checklists
  for insert to authenticated
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  );

create policy event_checklists_update on public.event_checklists
  for update to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  );

create policy event_checklists_delete on public.event_checklists
  for delete to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

drop policy if exists calendar_q1_templates_write on public.calendar_q1_templates;

create policy calendar_q1_templates_insert on public.calendar_q1_templates
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy calendar_q1_templates_update on public.calendar_q1_templates
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy calendar_q1_templates_delete on public.calendar_q1_templates
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

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

-- Season 1 completion — staff/refereeing read models.

create or replace view public.admin_staff_directory
with (security_invoker = true)
as
select
  spr.id,
  spr.profile_id,
  p.display_name,
  spr.role,
  src.label,
  src.category,
  src.formal_officiating,
  spr.pole_id,
  poles.name as pole_name,
  spr.status,
  spr.assigned_at
from public.staff_profile_roles spr
join public.staff_role_catalog src on src.role = spr.role
join public.profiles p on p.id = spr.profile_id
left join public.poles on poles.id = spr.pole_id;

create or replace view public.match_officiating_operations
with (security_invoker = true)
as
select
  m.id as match_id,
  m.match_code,
  m.status as match_status,
  m.session_id,
  m.court_id,
  c.name as court_name,
  moa.profile_id,
  p.display_name,
  moa.role,
  moa.status as assignment_status,
  moa.starts_at,
  moa.ends_at,
  case when tm.id is null then 'ur_play' else 'tournament' end as match_scope
from public.matches m
left join public.match_official_assignments moa on moa.match_id = m.id
left join public.profiles p on p.id = moa.profile_id
left join public.courts c on c.id = m.court_id
left join public.tournament_matches tm on tm.match_id = m.id;

-- Season 1 completion — protect homologated match results from non-admin direct edits.

create or replace function private.prevent_non_admin_homologated_result_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and old.result_status = 'homologated'
    and not private.has_any_role(array['admin']::public.app_role[])
  then
    raise exception 'homologated result changes require admin role' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_non_admin_homologated_result_change() from public, anon, authenticated;

drop trigger if exists protect_homologated_match_results on public.match_results;

create trigger protect_homologated_match_results
before update or delete on public.match_results
for each row execute function private.prevent_non_admin_homologated_result_change();

-- Season 1 completion — staff/refereeing RLS and grants.

do $$
declare
  table_name text;
begin
  foreach table_name in array array['staff_role_catalog','staff_profile_roles','match_official_assignments']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy staff_role_catalog_read on public.staff_role_catalog for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy staff_role_catalog_admin_insert on public.staff_role_catalog for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy staff_role_catalog_admin_update on public.staff_role_catalog for update to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy staff_role_catalog_admin_delete on public.staff_role_catalog for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy staff_profile_roles_read on public.staff_profile_roles for select to authenticated using (profile_id = (select auth.uid()) or private.has_any_role(array['admin','operator']::public.app_role[]) or private.manages_pole(pole_id));

create policy staff_profile_roles_insert on public.staff_profile_roles for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]) or private.manages_pole(pole_id));

create policy staff_profile_roles_update on public.staff_profile_roles for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[]) or private.manages_pole(pole_id)) with check (private.has_any_role(array['admin','operator']::public.app_role[]) or private.manages_pole(pole_id));

create policy staff_profile_roles_delete on public.staff_profile_roles for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy match_official_assignments_read on public.match_official_assignments for select to authenticated using (profile_id = (select auth.uid()) or private.can_read_match(match_id) or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy match_official_assignments_insert on public.match_official_assignments for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy match_official_assignments_update on public.match_official_assignments for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy match_official_assignments_delete on public.match_official_assignments for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

grant select on public.staff_role_catalog, public.staff_profile_roles, public.match_official_assignments, public.admin_staff_directory, public.match_officiating_operations to authenticated;

grant insert, update, delete on public.staff_profile_roles, public.match_official_assignments to authenticated;

grant all on public.staff_role_catalog, public.staff_profile_roles, public.match_official_assignments to service_role;

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

-- Season 1 completion — commercial indexes and configurable Q1 seed data.

create index products_type_active on public.products(product_type, active);

create index pricing_rules_product_active on public.pricing_rules(product_id, active, starts_at);

create index packages_product_active on public.packages(product_id, active);

create index athlete_commercial_packages_athlete on public.athlete_commercial_packages(athlete_id, status);

create index athlete_commercial_packages_package on public.athlete_commercial_packages(package_id);

create index athlete_commercial_packages_season on public.athlete_commercial_packages(season_id) where season_id is not null;

create index athlete_commercial_packages_created_by on public.athlete_commercial_packages(created_by) where created_by is not null;

create index charges_athlete_status on public.charges(athlete_id, status, due_at) where athlete_id is not null;

create index charges_team_status on public.charges(team_id, status, due_at) where team_id is not null;

create index charges_product on public.charges(product_id) where product_id is not null;

create index charges_package on public.charges(package_id) where package_id is not null;

create index charges_tournament_registration on public.charges(tournament_registration_id) where tournament_registration_id is not null;

create index charges_ur_play_registration on public.charges(ur_play_registration_id) where ur_play_registration_id is not null;

create index charges_created_by on public.charges(created_by) where created_by is not null;

create index charges_verified_by on public.charges(verified_by) where verified_by is not null;

create index payments_charge_status on public.payments(charge_id, status);

create index payments_submitted_by on public.payments(submitted_by) where submitted_by is not null;

create index payments_verified_by on public.payments(verified_by) where verified_by is not null;

-- Season 1 completion — commercial read models, RLS and grants.

create or replace view public.athlete_billing_items
with (security_invoker = true)
as
select c.id, c.athlete_id, c.description, c.amount, c.currency, c.status, c.due_at, c.created_at, p.name as product_name, pkg.name as package_name, coalesce(max(pay.verified_at), max(pay.submitted_at)) as last_payment_at
from public.charges c
left join public.products p on p.id = c.product_id
left join public.packages pkg on pkg.id = c.package_id
left join public.payments pay on pay.charge_id = c.id
group by c.id, p.name, pkg.name;

create or replace view public.admin_payment_operations
with (security_invoker = true)
as
select c.id, c.description, c.amount, c.currency, c.status, c.due_at, c.created_at, c.verified_at, a.public_name as athlete_name, a.athlete_code, t.name as team_name, p.name as product_name, pkg.name as package_name, count(pay.id)::integer as payment_attempts, coalesce(sum(pay.amount) filter (where pay.status = 'verified'), 0)::numeric(10,2) as paid_amount
from public.charges c
left join public.athletes a on a.id = c.athlete_id
left join public.teams t on t.id = c.team_id
left join public.products p on p.id = c.product_id
left join public.packages pkg on pkg.id = c.package_id
left join public.payments pay on pay.charge_id = c.id
group by c.id, a.public_name, a.athlete_code, t.name, p.name, pkg.name;

do $$
declare table_name text;
begin
  foreach table_name in array array['products','pricing_rules','packages','athlete_commercial_packages','charges','payments']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy products_read on public.products for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy pricing_rules_read on public.pricing_rules for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy packages_read on public.packages for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy products_admin_write on public.products for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy pricing_rules_admin_write on public.pricing_rules for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy packages_admin_write on public.packages for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy athlete_packages_read on public.athlete_commercial_packages for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy athlete_packages_write on public.athlete_commercial_packages for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy charges_read on public.charges for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]) or exists(select 1 from public.team_memberships tm where tm.team_id = charges.team_id and tm.status='active' and private.manages_team(tm.team_id)));

create policy charges_write on public.charges for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy payments_read on public.payments for select to authenticated using (exists(select 1 from public.charges c where c.id=payments.charge_id and (c.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))));

create policy payments_write on public.payments for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

grant select on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments, public.athlete_billing_items, public.admin_payment_operations to authenticated;

grant insert, update, delete on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments to authenticated;

grant all on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments to service_role;

-- Season 1 completion — athlete development plans, UR training and Hunter.
-- Remote DEV applied this domain in three chunks; this first local file is intentionally complete for clean replay.

create table public.athlete_development_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  version_number integer not null default 1 check (version_number > 0),
  level_snapshot public.athlete_level,
  strengths text,
  priority_1 text not null,
  priority_2 text,
  priority_3 text,
  goal_30_days text,
  hunter_goal text,
  status text not null default 'draft' check (status in ('draft','active','review_due','completed','archived')),
  review_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  supersedes_plan_id uuid references public.athlete_development_plans(id) on delete restrict,
  unique (athlete_id, season_id, cycle_id, version_number)
);

create table public.development_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.athlete_development_plans(id) on delete restrict,
  review_date date not null default current_date,
  evidence jsonb not null default '{}'::jsonb,
  progress text not null,
  new_priorities jsonb not null default '[]'::jsonb,
  reviewer_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level public.athlete_level,
  focus text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.training_programs(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  court_id uuid references public.courts(id) on delete restrict,
  coach_profile_id uuid references public.profiles(id) on delete restrict,
  level public.athlete_level,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  focus text,
  skills text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned','open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint training_session_window check (ends_at > starts_at)
);

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  block_type text not null check (block_type in ('prepare','develop','solve','compete')),
  title text not null,
  description text,
  order_index smallint not null check (order_index > 0),
  duration_minutes smallint check (duration_minutes is null or duration_minutes > 0),
  unique (session_id, order_index)
);

create table public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  status public.ur_play_attendance_status not null default 'expected',
  checked_in_at timestamptz,
  notes text,
  unique (session_id, athlete_id)
);

create table public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  coach_profile_id uuid references public.profiles(id) on delete restrict,
  feedback text not null,
  visible_to_athlete boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.hunter_cycles (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.entity_status not null default 'active'
);

create table public.hunter_themes (
  id uuid primary key default gen_random_uuid(),
  week_number smallint not null unique check (week_number between 1 and 12),
  code text not null unique,
  name text not null,
  description text
);

create table public.hunter_missions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.hunter_cycles(id) on delete restrict,
  theme_id uuid not null references public.hunter_themes(id) on delete restrict,
  title text not null,
  description text not null,
  status public.entity_status not null default 'active'
);

create table public.athlete_hunter_progress (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  mission_id uuid not null references public.hunter_missions(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','not_completed')),
  coach_observed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (athlete_id, mission_id)
);

create table public.hunter_observations (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid not null references public.athlete_hunter_progress(id) on delete restrict,
  observer_profile_id uuid references public.profiles(id) on delete restrict,
  observation text not null,
  observed_at timestamptz not null default now()
);

create index athlete_development_plans_athlete on public.athlete_development_plans(athlete_id, status, created_at);

create index development_reviews_plan on public.development_reviews(plan_id, review_date);

create index training_sessions_time on public.training_sessions(starts_at, ends_at, status);

create index training_attendance_athlete on public.training_attendance(athlete_id, status);

create index training_feedback_athlete on public.training_feedback(athlete_id, visible_to_athlete);

create index athlete_hunter_progress_athlete on public.athlete_hunter_progress(athlete_id, status);

create or replace view public.athlete_development_summary
with (security_invoker = true)
as
select
  a.id as athlete_id,
  p.id as plan_id,
  p.level_snapshot,
  p.priority_1,
  p.priority_2,
  p.priority_3,
  p.goal_30_days,
  p.hunter_goal,
  p.review_at,
  hp.status as hunter_status,
  hm.title as hunter_mission,
  ht.code as hunter_theme
from public.athletes a
left join lateral (
  select * from public.athlete_development_plans p0
  where p0.athlete_id = a.id and p0.status in ('active','review_due')
  order by p0.created_at desc limit 1
) p on true
left join lateral (
  select * from public.athlete_hunter_progress hp0
  where hp0.athlete_id = a.id
  order by hp0.updated_at desc limit 1
) hp on true
left join public.hunter_missions hm on hm.id = hp.mission_id
left join public.hunter_themes ht on ht.id = hm.theme_id;

do $$declare table_name text;begin foreach table_name in array array[
  'athlete_development_plans','development_reviews','training_programs','training_sessions','training_blocks','training_attendance','training_feedback','hunter_cycles','hunter_themes','hunter_missions','athlete_hunter_progress','hunter_observations'
] loop execute format('alter table public.%I enable row level security', table_name); execute format('alter table public.%I force row level security', table_name); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name); end loop; end$$;

create policy development_plans_read on public.athlete_development_plans for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy development_plans_write on public.athlete_development_plans for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy development_reviews_read on public.development_reviews for select to authenticated using (exists(select 1 from public.athlete_development_plans p where p.id=plan_id and (p.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))));

create policy development_reviews_write on public.development_reviews for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_read on public.training_sessions for select to authenticated using (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]) or exists(select 1 from public.training_attendance ta where ta.session_id=id and ta.athlete_id=private.current_athlete_id()));

create policy training_write on public.training_sessions for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_programs_read on public.training_programs for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_programs_write on public.training_programs for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_blocks_read on public.training_blocks for select to authenticated using (exists(select 1 from public.training_sessions ts where ts.id=session_id and (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]) or exists(select 1 from public.training_attendance ta where ta.session_id=ts.id and ta.athlete_id=private.current_athlete_id()))));

create policy training_blocks_write on public.training_blocks for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_attendance_read on public.training_attendance for select to authenticated using (athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy training_attendance_write on public.training_attendance for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_feedback_read on public.training_feedback for select to authenticated using ((athlete_id=private.current_athlete_id() and visible_to_athlete) or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy training_feedback_write on public.training_feedback for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_read on public.hunter_themes for select to authenticated using (true);

create policy hunter_cycles_read on public.hunter_cycles for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_missions_read on public.hunter_missions for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_admin_write_cycles on public.hunter_cycles for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_admin_write_themes on public.hunter_themes for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy hunter_admin_write_missions on public.hunter_missions for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_progress_read on public.athlete_hunter_progress for select to authenticated using (athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy hunter_progress_write on public.athlete_hunter_progress for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_observations_read on public.hunter_observations for select to authenticated using (exists(select 1 from public.athlete_hunter_progress hp where hp.id=progress_id and (hp.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))));

create policy hunter_observations_write on public.hunter_observations for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

grant select on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations, public.athlete_development_summary to authenticated;

grant insert, update, delete on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations to authenticated;

grant all on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations to service_role;

-- Applied to DEV as a separate chunk.
-- No-op locally because 20260805164229_season_development_training_hunter_tables.sql is complete for clean replay.
select 1;

-- Applied to DEV as a separate chunk.
-- No-op locally because 20260805164229_season_development_training_hunter_tables.sql is complete for clean replay.
select 1;

-- Season 1 completion — prizes, repasses and operational finance.

create type public.prize_allocation_status as enum ('draft', 'projected', 'approved', 'announced', 'paid', 'void');

create type public.repass_allocation_status as enum ('projected', 'eligible', 'approved', 'announced', 'paid', 'void');

create type public.financial_entry_status as enum ('projected', 'pending', 'verified', 'cancelled', 'reconciled');

create type public.financial_revenue_source as enum ('ur_play', 'tournament', 'training', 'sponsorship', 'market', 'venue_event', 'custom');

create type public.financial_expense_category as enum ('court_rental', 'staff', 'referee', 'media', 'materials', 'prize', 'repass', 'venue_share', 'market_cost', 'custom');

alter table public.tournament_prize_plans
  add column if not exists title text,
  add column if not exists published_at timestamptz,
  add column if not exists frozen_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete restrict,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add constraint tournament_prize_plans_publish_snapshot
    check (published_at is null or jsonb_typeof(frozen_snapshot) = 'object');

alter table public.tournament_prize_plans
  alter column title set not null;

create table public.tournament_prize_plan_templates (
  id uuid primary key default gen_random_uuid(),
  product public.tournament_product not null,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  currency char(3) not null default 'BRL',
  status public.entity_status not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_prize_template_allocations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tournament_prize_plan_templates(id) on delete cascade,
  award_code text not null check (award_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  award_label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  sort_order smallint not null check (sort_order > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, award_code),
  unique (template_id, sort_order)
);

create table public.tournament_prize_allocations (
  id uuid primary key default gen_random_uuid(),
  prize_plan_id uuid not null references public.tournament_prize_plans(id) on delete restrict,
  award_code text not null check (award_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  award_label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.prize_allocation_status not null default 'draft',
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  tournament_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  source_result_id uuid references public.tournament_results(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  announced_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  frozen_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prize_allocation_paid_requires_time check (status <> 'paid' or paid_at is not null),
  constraint prize_allocation_void_reason check (status <> 'void' or char_length(trim(coalesce(void_reason, ''))) >= 5)
);

create table public.season_repass_plans (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  currency char(3) not null default 'BRL',
  status public.entity_status not null default 'draft',
  ranking_snapshot_id uuid references public.ranking_snapshots(id) on delete restrict,
  legends_tournament_id uuid references public.tournaments(id) on delete restrict,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  frozen_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint season_repass_publish_snapshot check (published_at is null or jsonb_typeof(frozen_snapshot) = 'object')
);

create table public.season_repass_allocations (
  id uuid primary key default gen_random_uuid(),
  repass_plan_id uuid not null references public.season_repass_plans(id) on delete restrict,
  allocation_code text not null check (allocation_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  allocation_label text not null,
  beneficiary_type text not null check (beneficiary_type in ('team','athlete')),
  rank_position smallint not null check (rank_position between 1 and 3),
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.repass_allocation_status not null default 'projected',
  team_id uuid references public.teams(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  eligibility_evidence jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  announced_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repass_beneficiary_shape check (
    (beneficiary_type = 'team' and team_id is null and athlete_id is null)
    or (beneficiary_type = 'athlete' and team_id is null and athlete_id is null)
    or (beneficiary_type = 'team' and team_id is not null and athlete_id is null)
    or (beneficiary_type = 'athlete' and athlete_id is not null and team_id is null)
  ),
  constraint repass_paid_requires_time check (status <> 'paid' or paid_at is not null),
  constraint repass_void_reason check (status <> 'void' or char_length(trim(coalesce(void_reason, ''))) >= 5),
  unique (repass_plan_id, allocation_code)
);

create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  tournament_id uuid references public.tournaments(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  charge_id uuid references public.charges(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  source public.financial_revenue_source not null,
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.financial_entry_status not null default 'projected',
  occurred_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  tournament_id uuid references public.tournaments(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  prize_allocation_id uuid references public.tournament_prize_allocations(id) on delete restrict,
  repass_allocation_id uuid references public.season_repass_allocations(id) on delete restrict,
  category public.financial_expense_category not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.financial_entry_status not null default 'projected',
  occurred_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);

create index tournament_prize_templates_product_idx on public.tournament_prize_plan_templates(product, status);

create index tournament_prize_template_allocations_template_idx on public.tournament_prize_template_allocations(template_id);

create index tournament_prize_allocations_plan_idx on public.tournament_prize_allocations(prize_plan_id, status);

create index tournament_prize_allocations_athlete_idx on public.tournament_prize_allocations(athlete_id, status) where athlete_id is not null;

create index tournament_prize_allocations_team_idx on public.tournament_prize_allocations(team_id, status) where team_id is not null;

create index tournament_prize_plans_tournament_idx on public.tournament_prize_plans(tournament_id, status);

create index season_repass_plans_season_idx on public.season_repass_plans(season_id, status);

create index season_repass_allocations_plan_idx on public.season_repass_allocations(repass_plan_id, status);

create index season_repass_allocations_team_idx on public.season_repass_allocations(team_id, status) where team_id is not null;

create index season_repass_allocations_athlete_idx on public.season_repass_allocations(athlete_id, status) where athlete_id is not null;

create index revenue_entries_season_status_idx on public.revenue_entries(season_id, status);

create index revenue_entries_event_idx on public.revenue_entries(calendar_event_id, status) where calendar_event_id is not null;

create index revenue_entries_venue_idx on public.revenue_entries(venue_id, status) where venue_id is not null;

create index revenue_entries_tournament_idx on public.revenue_entries(tournament_id, status) where tournament_id is not null;

create index expense_entries_season_status_idx on public.expense_entries(season_id, status);

create index expense_entries_event_idx on public.expense_entries(calendar_event_id, status) where calendar_event_id is not null;

create index expense_entries_venue_idx on public.expense_entries(venue_id, status) where venue_id is not null;

create index expense_entries_tournament_idx on public.expense_entries(tournament_id, status) where tournament_id is not null;

create or replace view public.admin_prize_repass_operations
with (security_invoker = true)
as
select
  'prize'::text as obligation_type,
  tpp.id as plan_id,
  t.id as tournament_id,
  t.name as source_name,
  t.product::text as source_type,
  tpa.id as allocation_id,
  tpa.award_label as label,
  tpa.status::text as status,
  tpa.amount,
  tpa.currency,
  tpa.athlete_id,
  a.public_name as athlete_name,
  tpa.team_id,
  tm.name as team_name,
  tpa.created_at,
  tpa.updated_at
from public.tournament_prize_allocations tpa
join public.tournament_prize_plans tpp on tpp.id = tpa.prize_plan_id
join public.tournaments t on t.id = tpp.tournament_id
left join public.athletes a on a.id = tpa.athlete_id
left join public.teams tm on tm.id = tpa.team_id
union all
select
  'repass'::text as obligation_type,
  srp.id as plan_id,
  srp.legends_tournament_id as tournament_id,
  srp.name as source_name,
  'season_repass'::text as source_type,
  sra.id as allocation_id,
  sra.allocation_label as label,
  sra.status::text as status,
  sra.amount,
  sra.currency,
  sra.athlete_id,
  a.public_name as athlete_name,
  sra.team_id,
  tm.name as team_name,
  sra.created_at,
  sra.updated_at
from public.season_repass_allocations sra
join public.season_repass_plans srp on srp.id = sra.repass_plan_id
left join public.athletes a on a.id = sra.athlete_id
left join public.teams tm on tm.id = sra.team_id;

create or replace view public.event_financial_summaries
with (security_invoker = true)
as
with ledger as (
  select
    calendar_event_id,
    tournament_id,
    ur_play_session_id,
    season_id,
    pole_id,
    venue_id,
    amount,
    status,
    'revenue'::text as entry_kind
  from public.revenue_entries
  union all
  select
    calendar_event_id,
    tournament_id,
    ur_play_session_id,
    season_id,
    pole_id,
    venue_id,
    amount,
    status,
    'expense'::text as entry_kind
  from public.expense_entries
)
select
  calendar_event_id,
  tournament_id,
  ur_play_session_id,
  season_id,
  pole_id,
  venue_id,
  coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('projected','pending')), 0)::numeric(12,2) as projected_revenue,
  coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('verified','reconciled')), 0)::numeric(12,2) as verified_expense,
  coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('projected','pending')), 0)::numeric(12,2) as projected_expense,
  (
    coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('verified','reconciled')), 0)
    - coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('verified','reconciled')), 0)
  )::numeric(12,2) as verified_margin
from ledger
group by 1,2,3,4,5,6;

create or replace view public.venue_financial_summaries
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name as venue_name,
  v.pole_id,
  coalesce(sum(r.amount) filter (where r.status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(e.amount) filter (where e.status in ('verified','reconciled')), 0)::numeric(12,2) as verified_expense,
  (
    coalesce(sum(r.amount) filter (where r.status in ('verified','reconciled')), 0)
    - coalesce(sum(e.amount) filter (where e.status in ('verified','reconciled')), 0)
  )::numeric(12,2) as verified_margin
from public.venues v
left join public.revenue_entries r on r.venue_id = v.id
left join public.expense_entries e on e.venue_id = v.id
group by v.id, v.name, v.pole_id;

create or replace view public.sponsor_financial_summaries
with (security_invoker = true)
as
select
  metadata ->> 'sponsor_code' as sponsor_code,
  count(*)::integer as revenue_entries,
  coalesce(sum(amount) filter (where status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(amount) filter (where status in ('projected','pending')), 0)::numeric(12,2) as projected_revenue
from public.revenue_entries
where source = 'sponsorship'
group by metadata ->> 'sponsor_code';

create or replace view public.prize_obligations
with (security_invoker = true)
as
select
  tpa.id,
  tpa.prize_plan_id,
  t.product,
  t.name as tournament_name,
  tpa.award_label,
  tpa.status,
  tpa.amount,
  tpa.currency,
  tpa.athlete_id,
  a.public_name as athlete_name,
  tpa.team_id,
  tm.name as team_name,
  tpa.approved_at,
  tpa.announced_at,
  tpa.paid_at
from public.tournament_prize_allocations tpa
join public.tournament_prize_plans tpp on tpp.id = tpa.prize_plan_id
join public.tournaments t on t.id = tpp.tournament_id
left join public.athletes a on a.id = tpa.athlete_id
left join public.teams tm on tm.id = tpa.team_id;

create or replace view public.repass_obligations
with (security_invoker = true)
as
select
  sra.id,
  sra.repass_plan_id,
  srp.season_id,
  srp.name as repass_plan_name,
  sra.allocation_label,
  sra.beneficiary_type,
  sra.rank_position,
  sra.status,
  sra.amount,
  sra.currency,
  sra.athlete_id,
  a.public_name as athlete_name,
  sra.team_id,
  tm.name as team_name,
  sra.approved_at,
  sra.announced_at,
  sra.paid_at
from public.season_repass_allocations sra
join public.season_repass_plans srp on srp.id = sra.repass_plan_id
left join public.athletes a on a.id = sra.athlete_id
left join public.teams tm on tm.id = sra.team_id;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tournament_prize_plans',
    'tournament_prize_plan_templates',
    'tournament_prize_template_allocations',
    'tournament_prize_allocations',
    'season_repass_plans',
    'season_repass_allocations',
    'revenue_entries',
    'expense_entries'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

drop policy if exists tournament_prizes_admin on public.tournament_prize_plans;

drop policy if exists tournament_prizes_read on public.tournament_prize_plans;

create policy tournament_prize_plans_read on public.tournament_prize_plans
  for select to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and private.can_read_tournament(t.id)));

create policy tournament_prize_plans_insert on public.tournament_prize_plans
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_prize_plans_update on public.tournament_prize_plans
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy tournament_prize_plans_delete on public.tournament_prize_plans
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_templates_read on public.tournament_prize_plan_templates
  for select to authenticated
  using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy prize_templates_insert on public.tournament_prize_plan_templates
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_templates_update on public.tournament_prize_plan_templates
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_templates_delete on public.tournament_prize_plan_templates
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_template_allocations_read on public.tournament_prize_template_allocations
  for select to authenticated
  using (exists (
    select 1 from public.tournament_prize_plan_templates tpl
    where tpl.id = template_id
      and (tpl.status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]))
  ));

create policy prize_template_allocations_insert on public.tournament_prize_template_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_template_allocations_update on public.tournament_prize_template_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_template_allocations_delete on public.tournament_prize_template_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_allocations_read on public.tournament_prize_allocations
  for select to authenticated
  using (
    athlete_id = private.current_athlete_id()
    or private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (select 1 from public.teams t where t.id = team_id and private.manages_team(t.id))
    or exists (
      select 1
      from public.tournament_prize_plans tpp
      join public.tournaments t on t.id = tpp.tournament_id
      where tpp.id = prize_plan_id and private.can_read_tournament(t.id)
    )
  );

create policy prize_allocations_insert on public.tournament_prize_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_allocations_update on public.tournament_prize_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_allocations_delete on public.tournament_prize_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_plans_read on public.season_repass_plans
  for select to authenticated
  using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy repass_plans_insert on public.season_repass_plans
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_plans_update on public.season_repass_plans
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_plans_delete on public.season_repass_plans
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_allocations_read on public.season_repass_allocations
  for select to authenticated
  using (
    athlete_id = private.current_athlete_id()
    or private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (select 1 from public.teams t where t.id = team_id and private.manages_team(t.id))
    or (team_id is null and athlete_id is null and private.has_any_role(array['team_manager','athlete']::public.app_role[]))
  );

create policy repass_allocations_insert on public.season_repass_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_allocations_update on public.season_repass_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_allocations_delete on public.season_repass_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy revenue_entries_read on public.revenue_entries
  for select to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy revenue_entries_insert on public.revenue_entries
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy revenue_entries_update on public.revenue_entries
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy revenue_entries_delete on public.revenue_entries
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy expense_entries_read on public.expense_entries
  for select to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy expense_entries_insert on public.expense_entries
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy expense_entries_update on public.expense_entries
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy expense_entries_delete on public.expense_entries
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
to authenticated;

grant select on
  public.admin_prize_repass_operations,
  public.event_financial_summaries,
  public.venue_financial_summaries,
  public.sponsor_financial_summaries,
  public.prize_obligations,
  public.repass_obligations
to authenticated;

revoke all on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
from anon;

grant select on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations
to anon;

grant all on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
to service_role;

-- Keep Sprint 12 tournament_prize_plans policies authoritative and remove
-- duplicate permissive policies introduced during the Season 1 finance layer.

drop policy if exists tournament_prize_plans_read on public.tournament_prize_plans;

drop policy if exists tournament_prize_plans_insert on public.tournament_prize_plans;

drop policy if exists tournament_prize_plans_update on public.tournament_prize_plans;

drop policy if exists tournament_prize_plans_delete on public.tournament_prize_plans;

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

-- Season 1 final completion: partner/market views, Q1 seed templates and RLS.

create view public.admin_venue_partner_operations
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name as venue_name,
  p.id as pole_id,
  p.name as pole_name,
  vp.status as partnership_status,
  vp.billing_model,
  vp.hourly_rate,
  vp.revenue_share_percent,
  coalesce(vp.court_count, count(distinct c.id))::int as court_count,
  count(distinct va.id) filter (where va.status = 'active')::int as available_windows,
  count(distinct pe.id) filter (where pe.status in ('planned','published','in_progress'))::int as active_events,
  coalesce(vfs.verified_revenue, 0) as verified_revenue,
  coalesce(vfs.verified_expense, 0) as verified_expense,
  coalesce(vfs.verified_margin, 0) as verified_margin
from public.venues v
join public.poles p on p.id = v.pole_id
left join public.courts c on c.venue_id = v.id
left join public.venue_partnerships vp on vp.venue_id = v.id and vp.status in ('prospect','active','paused')
left join public.venue_availability va on va.venue_id = v.id
left join public.partner_events pe on pe.venue_id = v.id
left join public.venue_financial_summaries vfs on vfs.venue_id = v.id
group by v.id, v.name, p.id, p.name, vp.status, vp.billing_model, vp.hourly_rate, vp.revenue_share_percent, vp.court_count, vfs.verified_revenue, vfs.verified_expense, vfs.verified_margin;

create view public.admin_partner_event_operations
with (security_invoker = true)
as
select
  pe.id,
  pe.name,
  pe.event_type,
  pe.status,
  pe.starts_at,
  pe.ends_at,
  pe.official_ranking_event,
  v.name as venue_name,
  p.name as pole_name,
  count(distinct ecs.id)::int as staff_assignments,
  count(distinct ec.id)::int as checklist_items,
  coalesce(efs.verified_revenue, 0) as verified_revenue,
  coalesce(efs.verified_expense, 0) as verified_expense
from public.partner_events pe
join public.venues v on v.id = pe.venue_id
join public.poles p on p.id = pe.pole_id
left join public.event_staff_assignments ecs on ecs.calendar_event_id = pe.calendar_event_id
left join public.event_checklists ec on ec.calendar_event_id = pe.calendar_event_id
left join public.event_financial_summaries efs on efs.calendar_event_id = pe.calendar_event_id
group by pe.id, pe.name, pe.event_type, pe.status, pe.starts_at, pe.ends_at, pe.official_ranking_event, v.name, p.name, efs.verified_revenue, efs.verified_expense;

create view public.admin_sponsor_operations
with (security_invoker = true)
as
select
  s.id as sponsor_id,
  s.name,
  s.brand_name,
  s.category,
  s.status,
  count(distinct sa.id)::int as agreements,
  coalesce(sum(sa.cash_value) filter (where sa.status = 'active' and sa.value_type in ('cash','mixed')), 0)::numeric(12,2) as active_cash_value,
  count(distinct sd.id) filter (where sd.status = 'planned')::int as planned_deliveries,
  count(distinct sd.id) filter (where sd.status = 'delivered')::int as delivered_items
from public.sponsors s
left join public.sponsorship_agreements sa on sa.sponsor_id = s.id
left join public.sponsorship_deliveries sd on sd.agreement_id = sa.id
group by s.id, s.name, s.brand_name, s.category, s.status;

create view public.sponsor_venue_share_summary
with (security_invoker = true)
as
select
  sa.id as agreement_id,
  sa.name as agreement_name,
  s.name as sponsor_name,
  sa.cash_value,
  sa.currency,
  sa.venue_share_eligible,
  coalesce(sum(sra.share_percent), 0)::numeric(5,2) as allocated_percent,
  coalesce(sum(sra.amount), 0)::numeric(12,2) as allocated_amount,
  jsonb_agg(
    jsonb_build_object(
      'venue_id', sra.venue_id,
      'share_percent', sra.share_percent,
      'amount', sra.amount,
      'status', sra.status
    )
  ) filter (where sra.id is not null) as allocations
from public.sponsorship_agreements sa
join public.sponsors s on s.id = sa.sponsor_id
left join public.sponsorship_revenue_allocations sra on sra.agreement_id = sa.id
group by sa.id, sa.name, s.name, sa.cash_value, sa.currency, sa.venue_share_eligible;

create view public.public_market_offers
with (security_invoker = true)
as
select
  mo.id,
  mo.code,
  mo.name,
  mo.brl_amount,
  mo.urc_amount,
  mo.accepts_brl,
  mo.accepts_urc,
  mi.name as item_name,
  mi.category,
  mi.item_type,
  mp.name as partner_name
from public.market_offers mo
join public.market_items mi on mi.id = mo.item_id
left join public.market_partners mp on mp.id = mi.partner_id
where mo.status = 'active'
  and mi.status = 'active'
  and (mp.id is null or mp.status = 'active')
  and mo.starts_at <= now()
  and (mo.ends_at is null or mo.ends_at > now());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'venue_partnerships','venue_availability','venue_rates','venue_commercial_rules','partner_events',
    'sponsors','sponsorship_agreements','sponsorship_assets','sponsorship_activations','sponsorship_deliveries','sponsorship_revenue_allocations',
    'market_partners','market_items','market_offers','market_benefits','market_redemptions'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy venue_partnerships_read on public.venue_partnerships for select using (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy venue_partnerships_insert on public.venue_partnerships for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy venue_partnerships_update on public.venue_partnerships for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy venue_partnerships_delete on public.venue_partnerships for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_availability_read on public.venue_availability for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy venue_availability_insert on public.venue_availability for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy venue_availability_update on public.venue_availability for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy venue_availability_delete on public.venue_availability for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rates_read on public.venue_rates for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy venue_rates_insert on public.venue_rates for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rates_update on public.venue_rates for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rates_delete on public.venue_rates for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rules_read on public.venue_commercial_rules for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy venue_rules_insert on public.venue_commercial_rules for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rules_update on public.venue_commercial_rules for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rules_delete on public.venue_commercial_rules for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy partner_events_read on public.partner_events for select using (status in ('published','in_progress','completed') or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));

create policy partner_events_insert on public.partner_events for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy partner_events_update on public.partner_events for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy partner_events_delete on public.partner_events for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsors_read on public.sponsors for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsors_insert on public.sponsors for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsors_update on public.sponsors for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsors_delete on public.sponsors for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsor_child_read on public.sponsorship_agreements for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsor_child_insert on public.sponsorship_agreements for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsor_child_update on public.sponsorship_agreements for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsor_child_delete on public.sponsorship_agreements for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_assets_read on public.sponsorship_assets for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_assets_insert on public.sponsorship_assets for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_assets_update on public.sponsorship_assets for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_assets_delete on public.sponsorship_assets for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_activations_read on public.sponsorship_activations for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_activations_insert on public.sponsorship_activations for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_activations_update on public.sponsorship_activations for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_activations_delete on public.sponsorship_activations for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_deliveries_read on public.sponsorship_deliveries for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_deliveries_insert on public.sponsorship_deliveries for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_deliveries_update on public.sponsorship_deliveries for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_deliveries_delete on public.sponsorship_deliveries for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_revenue_allocations_read on public.sponsorship_revenue_allocations for select using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy sponsorship_revenue_allocations_insert on public.sponsorship_revenue_allocations for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_revenue_allocations_update on public.sponsorship_revenue_allocations for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_revenue_allocations_delete on public.sponsorship_revenue_allocations for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_partners_read on public.market_partners for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_partners_insert on public.market_partners for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_partners_update on public.market_partners for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_partners_delete on public.market_partners for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_items_read on public.market_items for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_items_insert on public.market_items for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_items_update on public.market_items for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_items_delete on public.market_items for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_offers_read on public.market_offers for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_offers_insert on public.market_offers for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_offers_update on public.market_offers for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_offers_delete on public.market_offers for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_benefits_read on public.market_benefits for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_benefits_insert on public.market_benefits for insert with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_benefits_update on public.market_benefits for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy market_benefits_delete on public.market_benefits for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_redemptions_read on public.market_redemptions for select using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_redemptions_insert on public.market_redemptions for insert with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_redemptions_update on public.market_redemptions for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_redemptions_delete on public.market_redemptions for delete using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_partners, public.market_items, public.market_offers, public.market_benefits, public.market_redemptions
to authenticated;

grant select on
  public.admin_venue_partner_operations,
  public.admin_partner_event_operations,
  public.admin_sponsor_operations,
  public.sponsor_venue_share_summary,
  public.public_market_offers
to authenticated;

grant select on public.public_market_offers to anon;

grant select on public.market_partners, public.market_items, public.market_offers, public.market_benefits to anon;

revoke all on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_redemptions
from anon;

grant all on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_partners, public.market_items, public.market_offers, public.market_benefits, public.market_redemptions
to service_role;

-- Public Market reads must not call private role helper functions as anon.

drop policy if exists market_partners_read on public.market_partners;

drop policy if exists market_items_read on public.market_items;

drop policy if exists market_offers_read on public.market_offers;

drop policy if exists market_benefits_read on public.market_benefits;

create policy market_partners_public_read
on public.market_partners
for select
to anon, authenticated
using (status = 'active');

create policy market_partners_admin_read
on public.market_partners
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_items_public_read
on public.market_items
for select
to anon, authenticated
using (status = 'active');

create policy market_items_admin_read
on public.market_items
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_offers_public_read
on public.market_offers
for select
to anon, authenticated
using (
  status = 'active'
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
);

create policy market_offers_admin_read
on public.market_offers
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_benefits_public_read
on public.market_benefits
for select
to anon, authenticated
using (status = 'active');

create policy market_benefits_admin_read
on public.market_benefits
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

-- Season 1 final completion: UR Coins wallet, media metadata and report read models.

create type public.ur_coin_transaction_type as enum ('earn', 'spend', 'grant', 'reversal', 'correction', 'expire');

create type public.ur_coin_direction as enum ('credit', 'debit');

create type public.ur_coin_rule_status as enum ('draft', 'active', 'disabled', 'archived');

create type public.media_asset_type as enum ('master_video', 'proxy_video', 'highlight', 'photo', 'interview', 'sponsor_asset');

create type public.media_asset_status as enum ('private_source', 'review', 'publishable', 'public', 'archived', 'rejected');

create type public.analysis_suggestion_status as enum ('manual', 'ai_suggested', 'reviewed', 'approved', 'rejected');

create type public.analysis_suggestion_type as enum ('rally_boundary', 'athlete_identity', 'technical_action', 'highlight', 'positioning', 'custom');

create table public.ur_coin_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  status public.ur_coin_rule_status not null default 'draft',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_coin_rule_sets_window check (ends_at is null or ends_at > starts_at)
);

create table public.ur_coin_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.ur_coin_rule_sets(id) on delete restrict,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  transaction_type public.ur_coin_transaction_type not null default 'earn',
  direction public.ur_coin_direction not null default 'credit',
  amount integer not null check (amount >= 0),
  source_type text not null,
  status public.ur_coin_rule_status not null default 'disabled',
  rule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_set_id, code)
);

create table public.ur_coin_transactions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  rule_id uuid references public.ur_coin_rules(id) on delete restrict,
  transaction_type public.ur_coin_transaction_type not null,
  direction public.ur_coin_direction not null,
  amount integer not null check (amount >= 0),
  source_type text not null,
  source_id uuid,
  season_id uuid references public.seasons(id) on delete restrict,
  idempotency_key text not null unique,
  reason text not null check (char_length(trim(reason)) >= 5),
  reversal_of uuid references public.ur_coin_transactions(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ur_coin_debit_has_positive_amount check (direction = 'credit' or amount > 0)
);

create view public.ur_coin_wallet_projection
with (security_invoker = true)
as
select
  athlete_id,
  coalesce(sum(case when direction = 'credit' then amount else -amount end), 0)::integer as balance,
  count(*)::integer as transaction_count,
  max(created_at) as last_transaction_at
from public.ur_coin_transactions
group by athlete_id;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type public.media_asset_type not null,
  status public.media_asset_status not null default 'private_source',
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  partner_event_id uuid references public.partner_events(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  storage_bucket text,
  storage_path text,
  external_url text,
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_asset_location check (storage_path is not null or external_url is not null or metadata <> '{}'::jsonb),
  constraint media_asset_no_raw_video_in_db check (metadata ? 'binary_payload' = false)
);

create table public.match_media_links (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  label text,
  visible_to_athletes boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, media_asset_id)
);

create table public.video_annotations (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  starts_at_ms integer check (starts_at_ms is null or starts_at_ms >= 0),
  ends_at_ms integer check (ends_at_ms is null or ends_at_ms >= 0),
  label text not null,
  notes text,
  status public.entity_status not null default 'active',
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_annotation_time check (ends_at_ms is null or starts_at_ms is null or ends_at_ms >= starts_at_ms)
);

create table public.highlight_clips (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  title text not null,
  status public.media_asset_status not null default 'review',
  starts_at_ms integer check (starts_at_ms is null or starts_at_ms >= 0),
  ends_at_ms integer check (ends_at_ms is null or ends_at_ms >= 0),
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_suggestions (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  suggestion_type public.analysis_suggestion_type not null,
  status public.analysis_suggestion_status not null default 'manual',
  payload jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_suggestion_review check (status not in ('approved','rejected','reviewed') or reviewed_at is not null)
);

create or replace function private.reject_ur_coin_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'UR Coin transactions are append-only' using errcode = '42501';
end;
$$;

create trigger ur_coin_transactions_append_only
before update or delete on public.ur_coin_transactions
for each row execute function private.reject_ur_coin_transaction_mutation();

revoke all on function private.reject_ur_coin_transaction_mutation() from public, anon, authenticated;

create view public.athlete_report_summary
with (security_invoker = true)
as
select
  a.id as athlete_id,
  a.athlete_code,
  a.public_name,
  al.level,
  coalesce(w.balance, 0) as ur_coin_balance,
  count(distinct mp.match_id)::integer as games,
  count(distinct tr.id)::integer as competitions,
  count(distinct ta.id) filter (where ta.status = 'present')::integer as training_attendance,
  count(distinct ahp.id) filter (where ahp.status = 'completed')::integer as hunter_completed
from public.athletes a
left join public.athlete_levels al on al.athlete_id = a.id and al.status = 'active'
left join public.ur_coin_wallet_projection w on w.athlete_id = a.id
left join public.match_participants mp on mp.athlete_id = a.id
left join public.tournament_rosters tr on tr.athlete_id = a.id
left join public.training_attendance ta on ta.athlete_id = a.id
left join public.athlete_hunter_progress ahp on ahp.athlete_id = a.id
group by a.id, a.athlete_code, a.public_name, al.level, w.balance;

create view public.team_report_summary
with (security_invoker = true)
as
select
  t.id as team_id,
  t.name,
  count(distinct tm.athlete_id) filter (where tm.status = 'active')::integer as active_athletes,
  count(distinct tr.id)::integer as rosters,
  count(distinct treg.id)::integer as tournament_registrations
from public.teams t
left join public.team_memberships tm on tm.team_id = t.id
left join public.team_rosters tr on tr.team_id = t.id
left join public.tournament_registrations treg on treg.team_id = t.id
group by t.id, t.name;

create view public.venue_report_summary
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name,
  count(distinct us.id)::integer as ur_play_sessions,
  count(distinct pe.id)::integer as partner_events,
  count(distinct c.id)::integer as courts,
  coalesce(vfs.verified_revenue, 0) as gross_revenue,
  coalesce(vfs.verified_expense, 0) as expenses,
  coalesce(vfs.verified_margin, 0) as margin
from public.venues v
left join public.courts c on c.venue_id = v.id
left join public.ur_play_sessions us on us.venue_id = v.id
left join public.partner_events pe on pe.venue_id = v.id
left join public.venue_financial_summaries vfs on vfs.venue_id = v.id
group by v.id, v.name, vfs.verified_revenue, vfs.verified_expense, vfs.verified_margin;

create view public.sponsor_report_summary
with (security_invoker = true)
as
select
  s.id as sponsor_id,
  s.name,
  count(distinct sa.id)::integer as agreements,
  count(distinct sd.id) filter (where sd.status = 'delivered')::integer as delivered,
  count(distinct mo.id)::integer as market_offers
from public.sponsors s
left join public.sponsorship_agreements sa on sa.sponsor_id = s.id
left join public.sponsorship_deliveries sd on sd.agreement_id = sa.id
left join public.sponsorship_assets asset on asset.agreement_id = sa.id
left join public.market_offers mo on mo.code = asset.metadata->>'market_offer_code'
group by s.id, s.name;

create view public.season_executive_report_summary
with (security_invoker = true)
as
select
  s.id as season_id,
  s.name,
  count(distinct a.id) filter (where a.status = 'active')::integer as active_athletes,
  count(distinct us.id)::integer as ur_play_sessions,
  count(distinct ts.id)::integer as training_sessions,
  count(distinct m.id)::integer as matches,
  count(distinct t.id)::integer as tournaments,
  coalesce(sum(re.amount) filter (where re.status in ('verified','reconciled')), 0)::numeric(12,2) as revenue,
  coalesce(sum(ex.amount) filter (where ex.status in ('verified','reconciled')), 0)::numeric(12,2) as expenses
from public.seasons s
left join public.athletes a on true
left join public.ur_play_sessions us on us.season_id = s.id
left join public.training_sessions ts on exists (
  select 1 from public.calendar_events ce
  where ce.id = ts.calendar_event_id and ce.season_id = s.id
)
left join public.ur_play_sessions mus on mus.season_id = s.id
left join public.matches m on m.session_id = mus.id
left join public.tournaments t on t.season_id = s.id
left join public.revenue_entries re on re.season_id = s.id
left join public.expense_entries ex on ex.season_id = s.id
group by s.id, s.name;

create index ur_coin_transactions_athlete_timeline on public.ur_coin_transactions(athlete_id, created_at desc);

create index ur_coin_transactions_idempotency on public.ur_coin_transactions(idempotency_key);

create index media_assets_match on public.media_assets(match_id, status) where match_id is not null;

create index media_assets_athlete on public.media_assets(athlete_id, status) where athlete_id is not null;

create index match_media_links_match on public.match_media_links(match_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ur_coin_rule_sets','ur_coin_rules',
    'media_assets','match_media_links','video_annotations','highlight_clips','analysis_suggestions'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

alter table public.ur_coin_transactions enable row level security;

alter table public.ur_coin_transactions force row level security;

create trigger ur_coin_transactions_audit
after insert or update or delete on public.ur_coin_transactions
for each row execute function private.capture_audit_log();

create policy ur_coin_rule_sets_read on public.ur_coin_rule_sets for select to authenticated using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy ur_coin_rule_sets_insert on public.ur_coin_rule_sets for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rule_sets_update on public.ur_coin_rule_sets for update to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rule_sets_delete on public.ur_coin_rule_sets for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rules_read on public.ur_coin_rules for select to authenticated using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy ur_coin_rules_insert on public.ur_coin_rules for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rules_update on public.ur_coin_rules for update to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rules_delete on public.ur_coin_rules for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_transactions_read on public.ur_coin_transactions for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy ur_coin_transactions_insert on public.ur_coin_transactions for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy media_assets_read on public.media_assets for select to authenticated using (
  status in ('publishable','public')
  or athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy media_assets_insert on public.media_assets for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy media_assets_update on public.media_assets for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy media_assets_delete on public.media_assets for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy match_media_links_read on public.match_media_links for select to authenticated using (
  visible_to_athletes
  or private.can_read_match(match_id)
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy match_media_links_insert on public.match_media_links for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy match_media_links_update on public.match_media_links for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy match_media_links_delete on public.match_media_links for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy video_annotations_read on public.video_annotations for select to authenticated using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy video_annotations_insert on public.video_annotations for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy video_annotations_update on public.video_annotations for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy video_annotations_delete on public.video_annotations for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy highlight_clips_read on public.highlight_clips for select to authenticated using (
  status in ('publishable','public')
  or athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy highlight_clips_insert on public.highlight_clips for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy highlight_clips_update on public.highlight_clips for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy highlight_clips_delete on public.highlight_clips for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy analysis_suggestions_read on public.analysis_suggestions for select to authenticated using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy analysis_suggestions_insert on public.analysis_suggestions for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy analysis_suggestions_update on public.analysis_suggestions for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy analysis_suggestions_delete on public.analysis_suggestions for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on public.ur_coin_rule_sets, public.ur_coin_rules to authenticated;

grant select, insert on public.ur_coin_transactions to authenticated;

grant select on public.ur_coin_wallet_projection to authenticated;

grant select, insert, update, delete on
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
to authenticated;

grant select on
  public.athlete_report_summary,
  public.team_report_summary,
  public.venue_report_summary,
  public.sponsor_report_summary,
  public.season_executive_report_summary
to authenticated;

revoke all on
  public.ur_coin_rule_sets,
  public.ur_coin_rules,
  public.ur_coin_transactions,
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
from anon;

grant all on
  public.ur_coin_rule_sets,
  public.ur_coin_rules,
  public.ur_coin_transactions,
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
to service_role;

-- Optimize Season 1 executive report read model to avoid join multiplication
-- and statement timeouts on DEV datasets.

create or replace view public.season_executive_report_summary
with (security_invoker = true)
as
select
  s.id as season_id,
  s.name,
  (
    select count(*)::integer
    from public.athletes a
    where a.status = 'active'
  ) as active_athletes,
  (
    select count(*)::integer
    from public.ur_play_sessions us
    where us.season_id = s.id
  ) as ur_play_sessions,
  (
    select count(*)::integer
    from public.training_sessions ts
    join public.calendar_events ce on ce.id = ts.calendar_event_id
    where ce.season_id = s.id
  ) as training_sessions,
  (
    select count(*)::integer
    from public.matches m
    join public.ur_play_sessions us on us.id = m.session_id
    where us.season_id = s.id
  ) as matches,
  (
    select count(*)::integer
    from public.tournaments t
    where t.season_id = s.id
  ) as tournaments,
  coalesce((
    select sum(re.amount)
    from public.revenue_entries re
    where re.season_id = s.id
      and re.status in ('verified','reconciled')
  ), 0)::numeric(12,2) as revenue,
  coalesce((
    select sum(ex.amount)
    from public.expense_entries ex
    where ex.season_id = s.id
      and ex.status in ('verified','reconciled')
  ), 0)::numeric(12,2) as expenses
from public.seasons s;

-- Season 1 public experience: calendar and teams read models.

create or replace view public.public_calendar_events
with (security_invoker = true)
as
select
  ce.id,
  ce.name,
  ce.event_type,
  ce.status,
  ce.starts_at,
  ce.ends_at,
  ce.competition_mode,
  ce.capacity,
  ce.court_count_target,
  p.name as pole_name,
  v.name as venue_name
from public.calendar_events ce
left join public.poles p on p.id = ce.pole_id
left join public.venues v on v.id = ce.venue_id
where ce.status in ('planned','published','registration_open','in_progress','completed')
  and ce.ends_at >= now() - interval '30 days';

create or replace view public.public_teams
with (security_invoker = true)
as
select
  t.id,
  t.name,
  t.slug,
  t.short_name,
  t.logo_url,
  t.description,
  t.status,
  p.name as pole_name,
  pr.current_position as pole_ranking_position,
  tr.current_position as team_ranking_position,
  tr.total_points as team_ranking_points
from public.teams t
left join public.poles p on p.id = t.primary_pole_id
left join public.public_rankings pr
  on pr.ranking_type = 'pole'
  and pr.entity_id = t.primary_pole_id
  and pr.cycle_id is null
left join public.public_rankings tr
  on tr.ranking_type = 'team'
  and tr.entity_id = t.id
  and tr.cycle_id is null
where t.status = 'active';

grant select on public.public_calendar_events, public.public_teams to anon, authenticated;

-- Minimal anon grants for public calendar/team read models.
-- Column-level grants avoid exposing operational/private fields through PostgREST.

create policy calendar_events_public_select
  on public.calendar_events
  for select
  to anon
  using (
    status in ('planned','published','registration_open','in_progress','completed')
    and ends_at >= now() - interval '30 days'
  );

create policy teams_public_select
  on public.teams
  for select
  to anon
  using (status = 'active');

create policy poles_public_select
  on public.poles
  for select
  to anon
  using (status = 'active');

create policy venues_public_select
  on public.venues
  for select
  to anon
  using (status = 'active');

grant select (
  id,
  name,
  event_type,
  status,
  starts_at,
  ends_at,
  competition_mode,
  capacity,
  court_count_target,
  pole_id,
  venue_id
) on public.calendar_events to anon;

grant select (id, name, status) on public.poles to anon;

grant select (id, name, status) on public.venues to anon;

grant select (
  id,
  name,
  slug,
  short_name,
  logo_url,
  description,
  status,
  primary_pole_id
) on public.teams to anon;

-- Season 1 final internal inbox notification types.

alter type public.athlete_notification_type add value if not exists 'tournament_registration';

alter type public.athlete_notification_type add value if not exists 'eligibility_reached';

alter type public.athlete_notification_type add value if not exists 'eligibility_missing';

alter type public.athlete_notification_type add value if not exists 'series_qualified';

alter type public.athlete_notification_type add value if not exists 'cup_qualified';

alter type public.athlete_notification_type add value if not exists 'legends_invited';

alter type public.athlete_notification_type add value if not exists 'legends_confirmed';

alter type public.athlete_notification_type add value if not exists 'training_scheduled';

alter type public.athlete_notification_type add value if not exists 'development_review_due';

alter type public.athlete_notification_type add value if not exists 'hunter_mission';

alter type public.athlete_notification_type add value if not exists 'payment_verified';

alter type public.athlete_notification_type add value if not exists 'market_offer';

alter type public.athlete_notification_type add value if not exists 'market_redemption';

alter type public.athlete_notification_type add value if not exists 'wallet_earn';

alter type public.athlete_notification_type add value if not exists 'wallet_spend';

alter type public.athlete_notification_type add value if not exists 'repass_announced';

-- RC1.2 migration recovery:
-- Remove legacy broad tournament policies that remained in a fresh replay from
-- the original Sprint 12 migration but are absent from the current DEV schema.
--
-- This migration is intentionally non-destructive:
-- - no tables, columns, functions, triggers, indexes, or data are dropped;
-- - only stale RLS policies are removed if they exist;
-- - on DEV `ultimate-rivals-dev` these statements are expected to be no-op for
--   schema because the target policies are already absent.
--
-- Purpose:
-- - make fresh local/CI replay match the hardened tournament RLS shape currently
--   present in DEV;
-- - avoid loosening DEV security by reintroducing older broad policies;
-- - preserve reproducibility for future Season 1 databases.

drop policy if exists tournament_operational_tables_admin on public.tournament_calendar_templates;

drop policy if exists tournament_child_admin_all on public.tournament_divisions;

drop policy if exists tournament_child_read on public.tournament_divisions;

drop policy if exists tournament_pricing_admin on public.tournament_pricing_rules;

drop policy if exists tournament_pricing_read on public.tournament_pricing_rules;

drop policy if exists tournament_registrations_team_read on public.tournament_registrations;

drop policy if exists tournament_seed_admin on public.tournament_seeds;

drop policy if exists tournament_seed_read on public.tournament_seeds;

drop policy if exists tournament_staff_admin on public.tournament_staff_assignments;

drop policy if exists tournament_staff_read on public.tournament_staff_assignments;

-- Final feature freeze: Agenda UR, demand, interest, booking and first-party acquisition.
-- Scope:
-- - additive Season 1 schema;
-- - no real data seed;
-- - no external pixels, fingerprinting, raw IP analytics or GPS;
-- - RLS enabled on every new public table;
-- - anon can only insert safe acquisition events/journeys and cannot SELECT analytics.

alter table public.athletes
  add column if not exists show_in_interest_lists boolean not null default true,
  add column if not exists primary_pole_id uuid references public.poles(id),
  add column if not exists public_profile_visibility text not null default 'sports_public'
    check (public_profile_visibility in ('sports_public','aggregate_only','private'));

create index if not exists athletes_primary_pole_idx on public.athletes(primary_pole_id)
where primary_pole_id is not null;

create table if not exists public.demand_opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opportunity_type text not null check (opportunity_type in ('ur_play','training','scheduled_round','competition','clinic','event')),
  status text not null default 'collecting_interest'
    check (status in ('collecting_interest','forming','almost_full','confirmed','full','waitlist','closed','cancelled')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  starts_at timestamptz,
  ends_at timestamptz,
  pole_id uuid references public.poles(id),
  venue_id uuid references public.venues(id),
  court_id uuid references public.courts(id),
  calendar_event_id uuid references public.calendar_events(id),
  ur_play_session_id uuid references public.ur_play_sessions(id),
  training_session_id uuid references public.training_sessions(id),
  level public.athlete_level,
  format_code text check (format_code is null or format_code in ('doubles','fours')),
  category_code text,
  modality text not null default 'beach_tennis',
  min_formations smallint not null default 1 check (min_formations > 0),
  target_formations smallint not null default 4 check (target_formations > 0),
  max_formations smallint not null default 4 check (max_formations >= target_formations),
  capacity_athletes smallint not null default 8 check (capacity_athletes > 0),
  court_count smallint not null default 1 check (court_count > 0),
  training_min_athletes smallint check (training_min_athletes is null or training_min_athletes > 0),
  created_by uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  constraint demand_opportunity_time_order check (ends_at is null or starts_at is null or starts_at < ends_at),
  constraint demand_opportunity_capacity_consistent check (
    capacity_athletes >= case when format_code = 'fours' then target_formations * 4 else target_formations * 2 end
  )
);

create table if not exists public.session_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opportunity_id uuid not null references public.demand_opportunities(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  interest_mode text not null check (interest_mode in ('have_formation','looking_for_partner','available_to_join','individual_interest')),
  status text not null default 'active' check (status in ('active','cancelled','converted')),
  show_identity boolean not null default true,
  preferred_role text,
  notes text check (notes is null or char_length(notes) <= 280),
  source text not null default 'athlete',
  unique (opportunity_id, athlete_id)
);

create table if not exists public.demand_formations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opportunity_id uuid not null references public.demand_opportunities(id) on delete cascade,
  proposed_by uuid references public.athletes(id),
  format_code text not null check (format_code in ('doubles','fours')),
  status text not null default 'proposed' check (status in ('proposed','awaiting_acceptance','ready','declined','cancelled')),
  accepted_count smallint not null default 0 check (accepted_count >= 0),
  active_count smallint not null default 0 check (active_count >= 0),
  ready_at timestamptz,
  constraint demand_formation_ready_consistent check (
    (status <> 'ready')
    or (format_code = 'doubles' and accepted_count = 2 and active_count = 2)
    or (format_code = 'fours' and accepted_count = 4 and active_count = 4)
  )
);

create table if not exists public.demand_formation_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  formation_id uuid not null references public.demand_formations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  member_role text not null default 'active' check (member_role in ('active','reserve')),
  acceptance_status text not null default 'awaiting_acceptance'
    check (acceptance_status in ('awaiting_acceptance','accepted','declined','removed')),
  accepted_at timestamptz,
  unique (formation_id, athlete_id)
);

create table if not exists public.activity_reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opportunity_id uuid not null references public.demand_opportunities(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  formation_id uuid references public.demand_formations(id),
  source_interest_id uuid references public.session_interests(id),
  ur_play_registration_id uuid references public.ur_play_registrations(id),
  status text not null default 'reserved'
    check (status in ('reserved','confirmed','waitlisted','cancelled','checked_in','no_show')),
  waitlist_position integer check (waitlist_position is null or waitlist_position > 0),
  eligibility text not null default 'eligible' check (eligibility in ('eligible','ineligible','pending_review')),
  admin_override_reason text check (admin_override_reason is null or char_length(trim(admin_override_reason)) >= 5),
  payment_id uuid references public.payments(id),
  package_id uuid references public.packages(id),
  unique (opportunity_id, athlete_id)
);

create table if not exists public.training_interest_windows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'collecting_interest'
    check (status in ('collecting_interest','quorum_reached','confirmed','closed','cancelled')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  pole_id uuid references public.poles(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  time_preference text not null check (time_preference in ('morning','afternoon','evening','specific')),
  starts_at time,
  ends_at time,
  level public.athlete_level,
  training_focus text,
  min_athletes smallint not null default 4 check (min_athletes > 0),
  target_capacity smallint not null default 8 check (target_capacity >= min_athletes),
  confirmed_training_session_id uuid references public.training_sessions(id),
  created_by uuid references public.profiles(id),
  constraint training_window_specific_time check (
    time_preference <> 'specific' or (starts_at is not null and ends_at is not null and starts_at < ends_at)
  )
);

create table if not exists public.training_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  window_id uuid references public.training_interest_windows(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  pole_id uuid references public.poles(id),
  day_of_week smallint check (day_of_week between 0 and 6),
  time_preference text not null check (time_preference in ('morning','afternoon','evening','specific')),
  starts_at time,
  ends_at time,
  level public.athlete_level,
  training_focus text,
  status text not null default 'active' check (status in ('active','cancelled','invited','converted')),
  unique (window_id, athlete_id)
);

create table if not exists public.acquisition_journeys (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_path text,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  invite_code text,
  athlete_referral_code text,
  team_referral_code text,
  venue_code text,
  sponsor_code text,
  event_code text,
  first_touch text not null default 'direct'
    check (first_touch in ('direct','instagram','whatsapp','google','ads','athlete_referral','team_referral','venue','sponsor','event','media','other')),
  last_touch text not null default 'direct'
    check (last_touch in ('direct','instagram','whatsapp','google','ads','athlete_referral','team_referral','venue','sponsor','event','media','other')),
  marketing_attribution_allowed boolean not null default false,
  linked_profile_id uuid references public.profiles(id),
  linked_athlete_id uuid references public.athletes(id),
  metadata jsonb not null default '{}'::jsonb,
  constraint acquisition_no_raw_ip check ((metadata ? 'raw_ip') = false and (metadata ? 'ip') = false)
);

create table if not exists public.acquisition_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  journey_id uuid references public.acquisition_journeys(id) on delete set null,
  anonymous_session_id uuid,
  profile_id uuid references public.profiles(id),
  athlete_id uuid references public.athletes(id),
  event_name text not null check (event_name in (
    'app_open','landing_view','signup_started','signup_completed','profile_completed','calendar_view','activity_view',
    'interest_created','interest_cancelled','formation_proposed','formation_ready','reservation_started','reservation_completed',
    'reservation_cancelled','waitlist_joined','payment_submitted','payment_verified','check_in','ur_play_participated',
    'training_interest_created','training_participated','competition_view','competition_registration','market_view',
    'market_redemption','first_participation','second_participation','return_participation'
  )),
  source text not null default 'operational' check (source in ('essential_operational','optional_marketing','operational')),
  occurred_at timestamptz not null default now(),
  object_type text,
  object_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  constraint acquisition_event_no_sensitive_payload check (
    (metadata ? 'password') = false
    and (metadata ? 'email') = false
    and (metadata ? 'phone') = false
    and (metadata ? 'raw_ip') = false
    and (metadata ? 'dob') = false
  )
);

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_type text not null check (owner_type in ('athlete','team','venue','sponsor','campaign','event')),
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{3,64}$'),
  athlete_id uuid references public.athletes(id),
  team_id uuid references public.teams(id),
  venue_id uuid references public.venues(id),
  sponsor_id uuid references public.sponsors(id),
  campaign_name text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'demand_opportunities','session_interests','demand_formations','demand_formation_members',
    'activity_reservations','training_interest_windows','training_interests',
    'acquisition_journeys','acquisition_events','referral_codes'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    if table_name not in ('demand_formation_members','acquisition_events','referral_codes') then
      execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    end if;
  end loop;
end $$;

create index if not exists demand_opportunities_starts_idx on public.demand_opportunities(starts_at, status);

create index if not exists demand_opportunities_pole_idx on public.demand_opportunities(pole_id, opportunity_type, status);

create index if not exists session_interests_opportunity_idx on public.session_interests(opportunity_id, status);

create index if not exists session_interests_athlete_idx on public.session_interests(athlete_id, status);

create index if not exists demand_formations_opportunity_idx on public.demand_formations(opportunity_id, status);

create index if not exists demand_formation_members_athlete_idx on public.demand_formation_members(athlete_id, acceptance_status);

create index if not exists activity_reservations_opportunity_idx on public.activity_reservations(opportunity_id, status, waitlist_position);

create index if not exists activity_reservations_athlete_idx on public.activity_reservations(athlete_id, status);

create index if not exists training_interests_athlete_idx on public.training_interests(athlete_id, status);

create index if not exists acquisition_events_journey_idx on public.acquisition_events(journey_id, event_name, occurred_at);

create index if not exists acquisition_events_athlete_idx on public.acquisition_events(athlete_id, event_name, occurred_at);

create or replace function private.demand_ready_formation_count(target_opportunity uuid)
returns integer
language sql
stable
set search_path = public, private
as $$
  select count(*)::integer
  from public.demand_formations
  where opportunity_id = target_opportunity
    and status = 'ready'
$$;

create or replace function private.demand_opportunity_status(target_opportunity uuid)
returns text
language sql
stable
set search_path = public, private
as $$
  select case
    when o.status in ('closed','cancelled') then o.status
    when coalesce(r.confirmed_reservations, 0) >= o.capacity_athletes then 'full'
    when private.demand_ready_formation_count(o.id) >= o.target_formations then 'confirmed'
    when private.demand_ready_formation_count(o.id) = o.target_formations - 1 then 'almost_full'
    when coalesce(i.active_interests, 0) > 0 then 'forming'
    else 'collecting_interest'
  end
  from public.demand_opportunities o
  left join lateral (
    select count(*)::integer active_interests
    from public.session_interests si
    where si.opportunity_id = o.id and si.status = 'active'
  ) i on true
  left join lateral (
    select count(*)::integer confirmed_reservations
    from public.activity_reservations ar
    where ar.opportunity_id = o.id and ar.status in ('reserved','confirmed','checked_in')
  ) r on true
  where o.id = target_opportunity
$$;

create or replace view public.athlete_agenda_opportunities
with (security_invoker = true)
as
select
  o.id,
  o.opportunity_type,
  private.demand_opportunity_status(o.id) as computed_status,
  o.status as configured_status,
  o.title,
  o.starts_at,
  o.ends_at,
  o.pole_id,
  p.name as pole_name,
  o.venue_id,
  v.name as venue_name,
  o.level,
  o.format_code,
  o.category_code,
  o.min_formations,
  o.target_formations,
  o.max_formations,
  o.capacity_athletes,
  o.court_count,
  coalesce(i.interested_count, 0) as interested_count,
  coalesce(f.ready_formations, 0) as ready_formations,
  coalesce(r.reserved_count, 0) as reserved_count,
  coalesce(w.waitlist_count, 0) as waitlist_count,
  greatest(o.capacity_athletes - coalesce(r.reserved_count, 0), 0) as remaining_capacity,
  greatest(coalesce(i.interested_count, 0) - coalesce(r.reserved_count, 0), 0) as interested_not_served,
  coalesce(w.waitlist_count, 0) as waitlisted_not_served,
  greatest(coalesce(f.ready_formations, 0) - o.max_formations, 0) as ready_formations_above_capacity,
  (
    coalesce(r.reserved_count, 0) >= o.capacity_athletes
    and coalesce(i.interested_count, 0) > coalesce(r.reserved_count, 0)
  ) as second_court_opportunity
from public.demand_opportunities o
left join public.poles p on p.id = o.pole_id
left join public.venues v on v.id = o.venue_id
left join lateral (
  select count(*)::integer interested_count
  from public.session_interests si
  where si.opportunity_id = o.id and si.status = 'active'
) i on true
left join lateral (
  select count(*)::integer ready_formations
  from public.demand_formations df
  where df.opportunity_id = o.id and df.status = 'ready'
) f on true
left join lateral (
  select count(*)::integer reserved_count
  from public.activity_reservations ar
  where ar.opportunity_id = o.id and ar.status in ('reserved','confirmed','checked_in')
) r on true
left join lateral (
  select count(*)::integer waitlist_count
  from public.activity_reservations ar
  where ar.opportunity_id = o.id and ar.status = 'waitlisted'
) w on true;

create or replace view public.interest_list_sanitized
as
select
  si.opportunity_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.id
    else null
  end as athlete_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.public_name
    else null
  end as display_name,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.athlete_code
    else null
  end as athlete_code,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.avatar_url
    else null
  end as avatar_public,
  al.level,
  p.name as primary_pole,
  t.name as team_name,
  si.interest_mode,
  si.status,
  not (si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public') as aggregate_only
from public.session_interests si
join public.athletes a on a.id = si.athlete_id
left join public.athlete_levels al on al.athlete_id = a.id and al.status = 'active'
left join public.poles p on p.id = a.primary_pole_id
left join public.team_memberships tm on tm.athlete_id = a.id and tm.status = 'active'
left join public.teams t on t.id = tm.team_id
where si.status = 'active';

create or replace view public.admin_demand_dashboard
with (security_invoker = true)
as
select
  o.*,
  ag.computed_status,
  ag.interested_count,
  ag.ready_formations,
  ag.reserved_count,
  ag.waitlist_count,
  ag.remaining_capacity,
  ag.interested_not_served,
  ag.waitlisted_not_served,
  ag.ready_formations_above_capacity,
  case
    when ag.second_court_opportunity then 'SECOND_COURT_OPPORTUNITY'
    when ag.computed_status = 'almost_full' then 'ALMOST_FULL'
    when ag.computed_status = 'confirmed' then 'SESSION_CONFIRMED'
    when ag.interested_count >= o.min_formations then 'READY_TO_OPEN'
    when ag.interested_count = 0 then 'LOW_DEMAND'
    else 'FORMING'
  end as demand_signal,
  p.name as pole_name,
  v.name as venue_name
from public.demand_opportunities o
join public.athlete_agenda_opportunities ag on ag.id = o.id
left join public.poles p on p.id = o.pole_id
left join public.venues v on v.id = o.venue_id;

create or replace view public.admin_acquisition_dashboard
with (security_invoker = true)
as
select
  coalesce(j.first_touch, 'direct') as source,
  count(distinct j.id)::integer as visitors,
  count(*) filter (where e.event_name = 'signup_completed')::integer as signups,
  count(*) filter (where e.event_name = 'interest_created')::integer as interests,
  count(*) filter (where e.event_name = 'reservation_completed')::integer as reservations,
  count(*) filter (where e.event_name = 'first_participation')::integer as first_participation,
  count(*) filter (where e.event_name = 'second_participation')::integer as second_participation,
  count(*) filter (where e.event_name = 'return_participation')::integer as returning,
  max(e.occurred_at) as last_event_at
from public.acquisition_journeys j
left join public.acquisition_events e on e.journey_id = j.id
group by coalesce(j.first_touch, 'direct');

create or replace view public.admin_athlete_engagement
with (security_invoker = true)
as
select
  a.id as athlete_id,
  a.public_name,
  a.athlete_code,
  min(j.first_touch) as source,
  min(e.occurred_at) filter (where e.event_name = 'signup_completed') as signup_at,
  max(e.occurred_at) as last_activity_at,
  min(e.occurred_at) filter (where e.event_name = 'interest_created') as first_interest_at,
  min(e.occurred_at) filter (where e.event_name = 'reservation_completed') as first_booking_at,
  min(e.occurred_at) filter (where e.event_name = 'first_participation') as first_participation_at,
  min(e.occurred_at) filter (where e.event_name = 'second_participation') as second_participation_at,
  max(e.occurred_at) filter (where e.event_name in ('ur_play_participated','training_participated','return_participation')) as last_participation_at,
  count(*) filter (where e.event_name in ('ur_play_participated','training_participated') and e.occurred_at >= now() - interval '30 days')::integer as participations_30d,
  (max(e.occurred_at) >= now() - interval '7 days') as active_7d,
  (max(e.occurred_at) >= now() - interval '30 days') as active_30d,
  (count(*) filter (where e.event_name in ('second_participation','return_participation')) > 0) as returning_athlete,
  extract(day from now() - max(e.occurred_at) filter (where e.event_name in ('ur_play_participated','training_participated','return_participation')))::integer as days_since_last_participation
from public.athletes a
left join public.acquisition_events e on e.athlete_id = a.id
left join public.acquisition_journeys j on j.id = e.journey_id
group by a.id, a.public_name, a.athlete_code;

-- RLS policies
create policy demand_opportunities_read on public.demand_opportunities
for select to authenticated
using (status <> 'cancelled' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy demand_opportunities_admin_write on public.demand_opportunities
for all to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]))
with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy session_interests_read on public.session_interests
for select to authenticated
using (
  athlete_id = private.current_athlete_id()
  or (show_identity and exists (
    select 1 from public.athletes a
    where a.id = session_interests.athlete_id
      and a.show_in_interest_lists
      and a.public_profile_visibility = 'sports_public'
  ))
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy session_interests_own_insert on public.session_interests
for insert to authenticated
with check (athlete_id = private.current_athlete_id());

create policy session_interests_own_update on public.session_interests
for update to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))
with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy demand_formations_read on public.demand_formations
for select to authenticated
using (
  private.has_any_role(array['admin','operator']::public.app_role[])
  or exists (
    select 1 from public.demand_formation_members m
    where m.formation_id = demand_formations.id
      and m.athlete_id = private.current_athlete_id()
  )
  or status = 'ready'
);

create policy demand_formations_write on public.demand_formations
for all to authenticated
using (
  private.has_any_role(array['admin','operator']::public.app_role[])
  or proposed_by = private.current_athlete_id()
)
with check (
  private.has_any_role(array['admin','operator']::public.app_role[])
  or proposed_by = private.current_athlete_id()
);

create policy demand_formation_members_read on public.demand_formation_members
for select to authenticated
using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
  or exists (
    select 1 from public.demand_formations f
    where f.id = formation_id and f.status = 'ready'
  )
);

create policy demand_formation_members_write on public.demand_formation_members
for all to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))
with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy activity_reservations_read on public.activity_reservations
for select to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy activity_reservations_own_insert on public.activity_reservations
for insert to authenticated
with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy activity_reservations_update on public.activity_reservations
for update to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))
with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interest_windows_read on public.training_interest_windows
for select to authenticated
using (status <> 'cancelled' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interest_windows_admin_write on public.training_interest_windows
for all to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]))
with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interests_read on public.training_interests
for select to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interests_own_write on public.training_interests
for all to authenticated
using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))
with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy acquisition_journeys_insert_anon on public.acquisition_journeys
for insert to anon, authenticated
with check (
  linked_profile_id is null
  and linked_athlete_id is null
);

create policy acquisition_journeys_admin_read on public.acquisition_journeys
for select to authenticated
using (private.has_any_role(array['admin']::public.app_role[]));

create policy acquisition_journeys_admin_update on public.acquisition_journeys
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]) or linked_profile_id = auth.uid())
with check (private.has_any_role(array['admin']::public.app_role[]) or linked_profile_id = auth.uid());

create policy acquisition_events_insert_anon on public.acquisition_events
for insert to anon, authenticated
with check (
  (profile_id is null or profile_id = (select auth.uid()))
  and (athlete_id is null or athlete_id = private.current_athlete_id())
);

create policy acquisition_events_admin_read on public.acquisition_events
for select to authenticated
using (private.has_any_role(array['admin']::public.app_role[]));

create policy referral_codes_read on public.referral_codes
for select to authenticated
using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));

create policy referral_codes_admin_write on public.referral_codes
for all to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

grant select on public.athlete_agenda_opportunities to authenticated;

grant select on public.interest_list_sanitized to authenticated;

grant select on public.admin_demand_dashboard to authenticated;

grant select on public.admin_acquisition_dashboard to authenticated;

grant select on public.admin_athlete_engagement to authenticated;

grant select, insert, update on
  public.demand_opportunities,
  public.session_interests,
  public.demand_formations,
  public.demand_formation_members,
  public.activity_reservations,
  public.training_interest_windows,
  public.training_interests,
  public.referral_codes
to authenticated;

grant insert on public.acquisition_journeys, public.acquisition_events to anon, authenticated;

grant select, update on public.acquisition_journeys to authenticated;

grant select on public.acquisition_events to authenticated;

-- Fix RLS recursion between demand_formations and demand_formation_members.
-- Ready formations remain visible through demand_formations_read; member rows
-- stay limited to the own athlete and admins/operators.

drop policy if exists demand_formation_members_read on public.demand_formation_members;

create policy demand_formation_members_read on public.demand_formation_members
for select to authenticated
using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

-- Hardening after Supabase advisors for the final demand/acquisition layer.
-- - remove security-definer warning from the sanitized interest view;
-- - add covering indexes for new FK hot paths;
-- - split two FOR ALL policies to avoid duplicate SELECT policies.

create or replace view public.interest_list_sanitized
with (security_invoker = true)
as
select
  si.opportunity_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.id
    else null
  end as athlete_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.public_name
    else null
  end as display_name,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.athlete_code
    else null
  end as athlete_code,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.avatar_url
    else null
  end as avatar_public,
  al.level,
  p.name as primary_pole,
  t.name as team_name,
  si.interest_mode,
  si.status,
  not (si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public') as aggregate_only
from public.session_interests si
join public.athletes a on a.id = si.athlete_id
left join public.athlete_levels al on al.athlete_id = a.id and al.status = 'active'
left join public.poles p on p.id = a.primary_pole_id
left join public.team_memberships tm on tm.athlete_id = a.id and tm.status = 'active'
left join public.teams t on t.id = tm.team_id
where si.status = 'active';

create index if not exists acquisition_events_profile_idx
  on public.acquisition_events(profile_id)
  where profile_id is not null;

create index if not exists acquisition_journeys_linked_profile_idx
  on public.acquisition_journeys(linked_profile_id)
  where linked_profile_id is not null;

create index if not exists acquisition_journeys_linked_athlete_idx
  on public.acquisition_journeys(linked_athlete_id)
  where linked_athlete_id is not null;

create index if not exists activity_reservations_formation_idx
  on public.activity_reservations(formation_id)
  where formation_id is not null;

create index if not exists activity_reservations_source_interest_idx
  on public.activity_reservations(source_interest_id)
  where source_interest_id is not null;

create index if not exists activity_reservations_ur_play_registration_idx
  on public.activity_reservations(ur_play_registration_id)
  where ur_play_registration_id is not null;

create index if not exists activity_reservations_payment_idx
  on public.activity_reservations(payment_id)
  where payment_id is not null;

create index if not exists activity_reservations_package_idx
  on public.activity_reservations(package_id)
  where package_id is not null;

drop policy if exists training_interest_windows_admin_write on public.training_interest_windows;

create policy training_interest_windows_admin_insert on public.training_interest_windows
for insert to authenticated
with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interest_windows_admin_update on public.training_interest_windows
for update to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]))
with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_interest_windows_admin_delete on public.training_interest_windows
for delete to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

drop policy if exists training_interests_own_write on public.training_interests;

create policy training_interests_own_insert on public.training_interests
for insert to authenticated
with check (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy training_interests_own_update on public.training_interests
for update to authenticated
using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
)
with check (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

create policy training_interests_own_delete on public.training_interests
for delete to authenticated
using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);

-- Cover remaining foreign-key lookup paths introduced by the final
-- demand/acquisition feature layer.

create index if not exists demand_formations_proposed_by_idx
  on public.demand_formations(proposed_by)
  where proposed_by is not null;

create index if not exists demand_opportunities_calendar_event_idx
  on public.demand_opportunities(calendar_event_id)
  where calendar_event_id is not null;

create index if not exists demand_opportunities_court_idx
  on public.demand_opportunities(court_id)
  where court_id is not null;

create index if not exists demand_opportunities_created_by_idx
  on public.demand_opportunities(created_by)
  where created_by is not null;

create index if not exists demand_opportunities_training_session_idx
  on public.demand_opportunities(training_session_id)
  where training_session_id is not null;

create index if not exists demand_opportunities_ur_play_session_idx
  on public.demand_opportunities(ur_play_session_id)
  where ur_play_session_id is not null;

create index if not exists demand_opportunities_venue_idx
  on public.demand_opportunities(venue_id)
  where venue_id is not null;

create index if not exists referral_codes_athlete_idx
  on public.referral_codes(athlete_id)
  where athlete_id is not null;

create index if not exists referral_codes_sponsor_idx
  on public.referral_codes(sponsor_id)
  where sponsor_id is not null;

create index if not exists referral_codes_team_idx
  on public.referral_codes(team_id)
  where team_id is not null;

create index if not exists referral_codes_venue_idx
  on public.referral_codes(venue_id)
  where venue_id is not null;

create index if not exists training_interest_windows_confirmed_session_idx
  on public.training_interest_windows(confirmed_training_session_id)
  where confirmed_training_session_id is not null;

create index if not exists training_interest_windows_created_by_idx
  on public.training_interest_windows(created_by)
  where created_by is not null;

create index if not exists training_interest_windows_pole_idx
  on public.training_interest_windows(pole_id)
  where pole_id is not null;

create index if not exists training_interests_pole_idx
  on public.training_interests(pole_id)
  where pole_id is not null;
