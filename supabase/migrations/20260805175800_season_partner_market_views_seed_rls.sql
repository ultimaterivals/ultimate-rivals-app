-- Season 1 final completion: partner/market views, Q1 seed templates and RLS.

create view public.admin_venue_partner_operations
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name as venue_name,
  p.id as pole_id,
  p.name as pole_name,
  vp.status as partnership_status,
  vp.billing_model,
  vp.hourly_rate,
  vp.revenue_share_percent,
  coalesce(vp.court_count, count(distinct c.id))::int as court_count,
  count(distinct va.id) filter (where va.status = 'active')::int as available_windows,
  count(distinct pe.id) filter (where pe.status in ('planned','published','in_progress'))::int as active_events,
  coalesce(vfs.verified_revenue, 0) as verified_revenue,
  coalesce(vfs.verified_expense, 0) as verified_expense,
  coalesce(vfs.verified_margin, 0) as verified_margin
from public.venues v
join public.poles p on p.id = v.pole_id
left join public.courts c on c.venue_id = v.id
left join public.venue_partnerships vp on vp.venue_id = v.id and vp.status in ('prospect','active','paused')
left join public.venue_availability va on va.venue_id = v.id
left join public.partner_events pe on pe.venue_id = v.id
left join public.venue_financial_summaries vfs on vfs.venue_id = v.id
group by v.id, v.name, p.id, p.name, vp.status, vp.billing_model, vp.hourly_rate, vp.revenue_share_percent, vp.court_count, vfs.verified_revenue, vfs.verified_expense, vfs.verified_margin;

create view public.admin_partner_event_operations
with (security_invoker = true)
as
select
  pe.id,
  pe.name,
  pe.event_type,
  pe.status,
  pe.starts_at,
  pe.ends_at,
  pe.official_ranking_event,
  v.name as venue_name,
  p.name as pole_name,
  count(distinct ecs.id)::int as staff_assignments,
  count(distinct ec.id)::int as checklist_items,
  coalesce(efs.verified_revenue, 0) as verified_revenue,
  coalesce(efs.verified_expense, 0) as verified_expense
from public.partner_events pe
join public.venues v on v.id = pe.venue_id
join public.poles p on p.id = pe.pole_id
left join public.event_staff_assignments ecs on ecs.calendar_event_id = pe.calendar_event_id
left join public.event_checklists ec on ec.calendar_event_id = pe.calendar_event_id
left join public.event_financial_summaries efs on efs.calendar_event_id = pe.calendar_event_id
group by pe.id, pe.name, pe.event_type, pe.status, pe.starts_at, pe.ends_at, pe.official_ranking_event, v.name, p.name, efs.verified_revenue, efs.verified_expense;

create view public.admin_sponsor_operations
with (security_invoker = true)
as
select
  s.id as sponsor_id,
  s.name,
  s.brand_name,
  s.category,
  s.status,
  count(distinct sa.id)::int as agreements,
  coalesce(sum(sa.cash_value) filter (where sa.status = 'active' and sa.value_type in ('cash','mixed')), 0)::numeric(12,2) as active_cash_value,
  count(distinct sd.id) filter (where sd.status = 'planned')::int as planned_deliveries,
  count(distinct sd.id) filter (where sd.status = 'delivered')::int as delivered_items
from public.sponsors s
left join public.sponsorship_agreements sa on sa.sponsor_id = s.id
left join public.sponsorship_deliveries sd on sd.agreement_id = sa.id
group by s.id, s.name, s.brand_name, s.category, s.status;

create view public.sponsor_venue_share_summary
with (security_invoker = true)
as
select
  sa.id as agreement_id,
  sa.name as agreement_name,
  s.name as sponsor_name,
  sa.cash_value,
  sa.currency,
  sa.venue_share_eligible,
  coalesce(sum(sra.share_percent), 0)::numeric(5,2) as allocated_percent,
  coalesce(sum(sra.amount), 0)::numeric(12,2) as allocated_amount,
  jsonb_agg(
    jsonb_build_object(
      'venue_id', sra.venue_id,
      'share_percent', sra.share_percent,
      'amount', sra.amount,
      'status', sra.status
    )
  ) filter (where sra.id is not null) as allocations
from public.sponsorship_agreements sa
join public.sponsors s on s.id = sa.sponsor_id
left join public.sponsorship_revenue_allocations sra on sra.agreement_id = sa.id
group by sa.id, sa.name, s.name, sa.cash_value, sa.currency, sa.venue_share_eligible;

create view public.public_market_offers
with (security_invoker = true)
as
select
  mo.id,
  mo.code,
  mo.name,
  mo.brl_amount,
  mo.urc_amount,
  mo.accepts_brl,
  mo.accepts_urc,
  mi.name as item_name,
  mi.category,
  mi.item_type,
  mp.name as partner_name
from public.market_offers mo
join public.market_items mi on mi.id = mo.item_id
left join public.market_partners mp on mp.id = mi.partner_id
where mo.status = 'active'
  and mi.status = 'active'
  and (mp.id is null or mp.status = 'active')
  and mo.starts_at <= now()
  and (mo.ends_at is null or mo.ends_at > now());

insert into public.market_partners (code, name, category, status, metadata)
values
  ('q1_hydration_partner', 'Parceiro DEV Hidratação', 'hydration', 'active', '{"fake_dev_seed":true}'::jsonb),
  ('q1_recovery_partner', 'Parceiro DEV Recovery', 'recovery', 'active', '{"fake_dev_seed":true}'::jsonb),
  ('q1_ur_merch', 'UR Merch DEV', 'ur_merch', 'active', '{"fake_dev_seed":true}'::jsonb)
on conflict (code) do update set name = excluded.name, category = excluded.category, status = excluded.status, metadata = excluded.metadata, updated_at = now();

insert into public.market_items (partner_id, code, name, category, item_type, description, status, metadata)
select mp.id, item.code, item.name, item.category::public.market_category, item.item_type::public.market_item_type, item.description, 'active'::public.entity_status, '{"fake_dev_seed":true}'::jsonb
from public.market_partners mp
join (
  values
    ('q1_hydration_partner', 'q1_water', 'Água / isotônico DEV', 'hydration', 'product', 'Item MVP para hidratação sem prescrição clínica.'),
    ('q1_hydration_partner', 'q1_snack', 'Barra/snack DEV', 'sports_food', 'product', 'Item MVP de alimento esportivo genérico.'),
    ('q1_recovery_partner', 'q1_recovery_service', 'Recovery parceiro DEV', 'recovery', 'service', 'Benefício operacional, sem prescrição médica.'),
    ('q1_ur_merch', 'q1_ur_shirt', 'Camisa UR DEV', 'ur_merch', 'product', 'Produto de merchandising UR.')
) as item(partner_code, code, name, category, item_type, description) on item.partner_code = mp.code
on conflict (code) do update set name = excluded.name, category = excluded.category, item_type = excluded.item_type, description = excluded.description, status = excluded.status, metadata = excluded.metadata, updated_at = now();

insert into public.market_offers (item_id, code, name, status, brl_amount, urc_amount, accepts_brl, accepts_urc, inventory_limit, per_athlete_limit, metadata)
select mi.id, offer.code, offer.name, 'active'::public.entity_status, offer.brl_amount, offer.urc_amount, offer.accepts_brl, offer.accepts_urc, offer.inventory_limit, 1, '{"fake_dev_seed":true}'::jsonb
from public.market_items mi
join (
  values
    ('q1_water', 'q1_water_brl', 'Água/isotônico BRL DEV', 8.00::numeric, null::integer, true, false, 100::integer),
    ('q1_snack', 'q1_snack_brl', 'Snack BRL DEV', 12.00::numeric, null::integer, true, false, 80::integer),
    ('q1_recovery_service', 'q1_recovery_brl', 'Recovery BRL DEV', 50.00::numeric, null::integer, true, false, 20::integer),
    ('q1_ur_shirt', 'q1_ur_shirt_brl', 'Camisa UR BRL DEV', 79.90::numeric, null::integer, true, false, 30::integer)
) as offer(item_code, code, name, brl_amount, urc_amount, accepts_brl, accepts_urc, inventory_limit) on offer.item_code = mi.code
on conflict (code) do update set name = excluded.name, brl_amount = excluded.brl_amount, urc_amount = excluded.urc_amount, accepts_brl = excluded.accepts_brl, accepts_urc = excluded.accepts_urc, inventory_limit = excluded.inventory_limit, metadata = excluded.metadata, updated_at = now();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'venue_partnerships','venue_availability','venue_rates','venue_commercial_rules','partner_events',
    'sponsors','sponsorship_agreements','sponsorship_assets','sponsorship_activations','sponsorship_deliveries','sponsorship_revenue_allocations',
    'market_partners','market_items','market_offers','market_benefits','market_redemptions'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy venue_partnerships_read on public.venue_partnerships for select using (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy venue_partnerships_insert on public.venue_partnerships for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy venue_partnerships_update on public.venue_partnerships for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy venue_partnerships_delete on public.venue_partnerships for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_availability_read on public.venue_availability for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy venue_availability_insert on public.venue_availability for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy venue_availability_update on public.venue_availability for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy venue_availability_delete on public.venue_availability for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rates_read on public.venue_rates for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy venue_rates_insert on public.venue_rates for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy venue_rates_update on public.venue_rates for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy venue_rates_delete on public.venue_rates for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy venue_rules_read on public.venue_commercial_rules for select using (status = 'active' or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy venue_rules_insert on public.venue_commercial_rules for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy venue_rules_update on public.venue_commercial_rules for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy venue_rules_delete on public.venue_commercial_rules for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy partner_events_read on public.partner_events for select using (status in ('published','in_progress','completed') or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy partner_events_insert on public.partner_events for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy partner_events_update on public.partner_events for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy partner_events_delete on public.partner_events for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsors_read on public.sponsors for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsors_insert on public.sponsors for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsors_update on public.sponsors for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsors_delete on public.sponsors for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsor_child_read on public.sponsorship_agreements for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsor_child_insert on public.sponsorship_agreements for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsor_child_update on public.sponsorship_agreements for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsor_child_delete on public.sponsorship_agreements for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_assets_read on public.sponsorship_assets for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_assets_insert on public.sponsorship_assets for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsorship_assets_update on public.sponsorship_assets for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsorship_assets_delete on public.sponsorship_assets for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_activations_read on public.sponsorship_activations for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_activations_insert on public.sponsorship_activations for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_activations_update on public.sponsorship_activations for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_activations_delete on public.sponsorship_activations for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_deliveries_read on public.sponsorship_deliveries for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_deliveries_insert on public.sponsorship_deliveries for insert with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_deliveries_update on public.sponsorship_deliveries for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_deliveries_delete on public.sponsorship_deliveries for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy sponsorship_revenue_allocations_read on public.sponsorship_revenue_allocations for select using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy sponsorship_revenue_allocations_insert on public.sponsorship_revenue_allocations for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsorship_revenue_allocations_update on public.sponsorship_revenue_allocations for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy sponsorship_revenue_allocations_delete on public.sponsorship_revenue_allocations for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_partners_read on public.market_partners for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_partners_insert on public.market_partners for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_partners_update on public.market_partners for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_partners_delete on public.market_partners for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_items_read on public.market_items for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_items_insert on public.market_items for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_items_update on public.market_items for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_items_delete on public.market_items for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_offers_read on public.market_offers for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_offers_insert on public.market_offers for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_offers_update on public.market_offers for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_offers_delete on public.market_offers for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_benefits_read on public.market_benefits for select using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_benefits_insert on public.market_benefits for insert with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_benefits_update on public.market_benefits for update using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy market_benefits_delete on public.market_benefits for delete using (private.has_any_role(array['admin']::public.app_role[]));

create policy market_redemptions_read on public.market_redemptions for select using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_redemptions_insert on public.market_redemptions for insert with check (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_redemptions_update on public.market_redemptions for update using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy market_redemptions_delete on public.market_redemptions for delete using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_partners, public.market_items, public.market_offers, public.market_benefits, public.market_redemptions
to authenticated;

grant select on
  public.admin_venue_partner_operations,
  public.admin_partner_event_operations,
  public.admin_sponsor_operations,
  public.sponsor_venue_share_summary,
  public.public_market_offers
to authenticated;

grant select on public.public_market_offers to anon;
grant select on public.market_partners, public.market_items, public.market_offers, public.market_benefits to anon;

revoke all on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_redemptions
from anon;

grant all on
  public.venue_partnerships, public.venue_availability, public.venue_rates, public.venue_commercial_rules, public.partner_events,
  public.sponsors, public.sponsorship_agreements, public.sponsorship_assets, public.sponsorship_activations, public.sponsorship_deliveries, public.sponsorship_revenue_allocations,
  public.market_partners, public.market_items, public.market_offers, public.market_benefits, public.market_redemptions
to service_role;
