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
