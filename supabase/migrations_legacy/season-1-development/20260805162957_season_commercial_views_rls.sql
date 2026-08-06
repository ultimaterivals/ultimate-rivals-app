-- Season 1 completion — commercial read models, RLS and grants.

create or replace view public.athlete_billing_items
with (security_invoker = true)
as
select c.id, c.athlete_id, c.description, c.amount, c.currency, c.status, c.due_at, c.created_at, p.name as product_name, pkg.name as package_name, coalesce(max(pay.verified_at), max(pay.submitted_at)) as last_payment_at
from public.charges c
left join public.products p on p.id = c.product_id
left join public.packages pkg on pkg.id = c.package_id
left join public.payments pay on pay.charge_id = c.id
group by c.id, p.name, pkg.name;

create or replace view public.admin_payment_operations
with (security_invoker = true)
as
select c.id, c.description, c.amount, c.currency, c.status, c.due_at, c.created_at, c.verified_at, a.public_name as athlete_name, a.athlete_code, t.name as team_name, p.name as product_name, pkg.name as package_name, count(pay.id)::integer as payment_attempts, coalesce(sum(pay.amount) filter (where pay.status = 'verified'), 0)::numeric(10,2) as paid_amount
from public.charges c
left join public.athletes a on a.id = c.athlete_id
left join public.teams t on t.id = c.team_id
left join public.products p on p.id = c.product_id
left join public.packages pkg on pkg.id = c.package_id
left join public.payments pay on pay.charge_id = c.id
group by c.id, a.public_name, a.athlete_code, t.name, p.name, pkg.name;

do $$
declare table_name text;
begin
  foreach table_name in array array['products','pricing_rules','packages','athlete_commercial_packages','charges','payments']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy products_read on public.products for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy pricing_rules_read on public.pricing_rules for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy packages_read on public.packages for select to authenticated using (active or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy products_admin_write on public.products for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy pricing_rules_admin_write on public.pricing_rules for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy packages_admin_write on public.packages for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy athlete_packages_read on public.athlete_commercial_packages for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy athlete_packages_write on public.athlete_commercial_packages for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy charges_read on public.charges for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]) or exists(select 1 from public.team_memberships tm where tm.team_id = charges.team_id and tm.status='active' and private.manages_team(tm.team_id)));
create policy charges_write on public.charges for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy payments_read on public.payments for select to authenticated using (exists(select 1 from public.charges c where c.id=payments.charge_id and (c.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]))));
create policy payments_write on public.payments for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

grant select on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments, public.athlete_billing_items, public.admin_payment_operations to authenticated;
grant insert, update, delete on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments to authenticated;
grant all on public.products, public.pricing_rules, public.packages, public.athlete_commercial_packages, public.charges, public.payments to service_role;
