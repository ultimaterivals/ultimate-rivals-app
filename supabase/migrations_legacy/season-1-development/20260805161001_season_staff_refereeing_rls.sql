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
