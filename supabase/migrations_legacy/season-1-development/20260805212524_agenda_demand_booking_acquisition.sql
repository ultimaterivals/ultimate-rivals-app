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
