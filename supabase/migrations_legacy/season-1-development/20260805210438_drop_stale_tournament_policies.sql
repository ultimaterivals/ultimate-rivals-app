-- RC1.2 migration recovery:
-- Remove legacy broad tournament policies that remained in a fresh replay from
-- the original Sprint 12 migration but are absent from the current DEV schema.
--
-- This migration is intentionally non-destructive:
-- - no tables, columns, functions, triggers, indexes, or data are dropped;
-- - only stale RLS policies are removed if they exist;
-- - on DEV `ultimate-rivals-dev` these statements are expected to be no-op for
--   schema because the target policies are already absent.
--
-- Purpose:
-- - make fresh local/CI replay match the hardened tournament RLS shape currently
--   present in DEV;
-- - avoid loosening DEV security by reintroducing older broad policies;
-- - preserve reproducibility for future Season 1 databases.

drop policy if exists tournament_operational_tables_admin on public.tournament_calendar_templates;

drop policy if exists tournament_child_admin_all on public.tournament_divisions;
drop policy if exists tournament_child_read on public.tournament_divisions;

drop policy if exists tournament_pricing_admin on public.tournament_pricing_rules;
drop policy if exists tournament_pricing_read on public.tournament_pricing_rules;

drop policy if exists tournament_registrations_team_read on public.tournament_registrations;

drop policy if exists tournament_seed_admin on public.tournament_seeds;
drop policy if exists tournament_seed_read on public.tournament_seeds;

drop policy if exists tournament_staff_admin on public.tournament_staff_assignments;
drop policy if exists tournament_staff_read on public.tournament_staff_assignments;
