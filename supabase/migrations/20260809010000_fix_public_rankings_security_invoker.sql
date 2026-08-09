-- Release hotfix: ensure public_rankings evaluates permissions/RLS as the querying role.
-- Forward-only, additive release-engineering fix after Supabase Security Advisor flagged
-- the view as SECURITY DEFINER.

alter view public.public_rankings set (security_invoker = true);
