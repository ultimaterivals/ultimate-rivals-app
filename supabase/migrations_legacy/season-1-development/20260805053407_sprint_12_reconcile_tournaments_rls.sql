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
