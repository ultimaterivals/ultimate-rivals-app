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
