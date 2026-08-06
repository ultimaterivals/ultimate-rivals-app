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
