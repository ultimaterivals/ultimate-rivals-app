-- Optimize Season 1 executive report read model to avoid join multiplication
-- and statement timeouts on DEV datasets.

create or replace view public.season_executive_report_summary
with (security_invoker = true)
as
select
  s.id as season_id,
  s.name,
  (
    select count(*)::integer
    from public.athletes a
    where a.status = 'active'
  ) as active_athletes,
  (
    select count(*)::integer
    from public.ur_play_sessions us
    where us.season_id = s.id
  ) as ur_play_sessions,
  (
    select count(*)::integer
    from public.training_sessions ts
    join public.calendar_events ce on ce.id = ts.calendar_event_id
    where ce.season_id = s.id
  ) as training_sessions,
  (
    select count(*)::integer
    from public.matches m
    join public.ur_play_sessions us on us.id = m.session_id
    where us.season_id = s.id
  ) as matches,
  (
    select count(*)::integer
    from public.tournaments t
    where t.season_id = s.id
  ) as tournaments,
  coalesce((
    select sum(re.amount)
    from public.revenue_entries re
    where re.season_id = s.id
      and re.status in ('verified','reconciled')
  ), 0)::numeric(12,2) as revenue,
  coalesce((
    select sum(ex.amount)
    from public.expense_entries ex
    where ex.season_id = s.id
      and ex.status in ('verified','reconciled')
  ), 0)::numeric(12,2) as expenses
from public.seasons s;
