-- Keep Sprint 12 tournament_prize_plans policies authoritative and remove
-- duplicate permissive policies introduced during the Season 1 finance layer.

drop policy if exists tournament_prize_plans_read on public.tournament_prize_plans;
drop policy if exists tournament_prize_plans_insert on public.tournament_prize_plans;
drop policy if exists tournament_prize_plans_update on public.tournament_prize_plans;
drop policy if exists tournament_prize_plans_delete on public.tournament_prize_plans;
