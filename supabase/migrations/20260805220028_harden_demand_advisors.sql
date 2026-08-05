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
