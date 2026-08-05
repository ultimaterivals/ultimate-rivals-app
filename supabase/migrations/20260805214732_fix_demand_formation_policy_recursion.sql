-- Fix RLS recursion between demand_formations and demand_formation_members.
-- Ready formations remain visible through demand_formations_read; member rows
-- stay limited to the own athlete and admins/operators.

drop policy if exists demand_formation_members_read on public.demand_formation_members;

create policy demand_formation_members_read on public.demand_formation_members
for select to authenticated
using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
