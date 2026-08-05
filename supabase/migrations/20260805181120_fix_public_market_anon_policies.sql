-- Public Market reads must not call private role helper functions as anon.

drop policy if exists market_partners_read on public.market_partners;
drop policy if exists market_items_read on public.market_items;
drop policy if exists market_offers_read on public.market_offers;
drop policy if exists market_benefits_read on public.market_benefits;

create policy market_partners_public_read
on public.market_partners
for select
to anon, authenticated
using (status = 'active');

create policy market_partners_admin_read
on public.market_partners
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_items_public_read
on public.market_items
for select
to anon, authenticated
using (status = 'active');

create policy market_items_admin_read
on public.market_items
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_offers_public_read
on public.market_offers
for select
to anon, authenticated
using (
  status = 'active'
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
);

create policy market_offers_admin_read
on public.market_offers
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy market_benefits_public_read
on public.market_benefits
for select
to anon, authenticated
using (status = 'active');

create policy market_benefits_admin_read
on public.market_benefits
for select
to authenticated
using (private.has_any_role(array['admin','operator']::public.app_role[]));
