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
