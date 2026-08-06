-- Production-like fixture audit.
-- Run after baseline + production-reference-data.sql.

\set ON_ERROR_STOP on

with audited_counts as (
  select 'athletes' as entity, count(*)::bigint as records
  from public.athletes
  union all
  select 'teams', count(*)::bigint
  from public.teams
  union all
  select 'venues', count(*)::bigint
  from public.venues
  union all
  select 'court_ops_sessions', count(*)::bigint
  from public.ur_play_sessions
  union all
  select 'matches', count(*)::bigint
  from public.matches
  union all
  select 'payments', count(*)::bigint
  from public.payments
  union all
  select 'market_partners', count(*)::bigint
  from public.market_partners
  union all
  select 'market_items', count(*)::bigint
  from public.market_items
  union all
  select 'market_offers', count(*)::bigint
  from public.market_offers
  union all
  select 'calendar_events', count(*)::bigint
  from public.calendar_events
)
select *
from audited_counts
order by entity;

do $$
declare
  offending_records bigint;
begin
  select
    (select count(*) from public.athletes)
    + (select count(*) from public.teams)
    + (select count(*) from public.venues)
    + (select count(*) from public.ur_play_sessions)
    + (select count(*) from public.matches)
    + (select count(*) from public.payments)
    + (select count(*) from public.market_partners)
    + (select count(*) from public.market_items)
    + (select count(*) from public.market_offers)
    + (select count(*) from public.calendar_events)
  into offending_records;

  if offending_records <> 0 then
    raise exception 'PROD fixture audit failed: % operational records found', offending_records;
  end if;
end $$;

select 'PROD_FIXTURE_AUDIT_PASS' as result;
