drop policy ranking_rules_admin on public.ranking_rules;
create policy ranking_rules_admin_insert on public.ranking_rules
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));
create policy ranking_rules_admin_update on public.ranking_rules
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

drop policy match_recognitions_admin on public.match_recognitions;
create policy match_recognitions_admin_insert on public.match_recognitions
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));
create policy match_recognitions_admin_update on public.match_recognitions
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));

drop policy disciplinary_events_admin on public.disciplinary_events;
create policy disciplinary_events_admin_insert on public.disciplinary_events
for insert to authenticated
with check (private.has_any_role(array['admin']::public.app_role[]));
create policy disciplinary_events_admin_update on public.disciplinary_events
for update to authenticated
using (private.has_any_role(array['admin']::public.app_role[]))
with check (private.has_any_role(array['admin']::public.app_role[]));
