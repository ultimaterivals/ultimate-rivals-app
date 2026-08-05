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
