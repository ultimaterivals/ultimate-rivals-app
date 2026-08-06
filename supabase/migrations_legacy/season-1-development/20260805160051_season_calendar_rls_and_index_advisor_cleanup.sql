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
