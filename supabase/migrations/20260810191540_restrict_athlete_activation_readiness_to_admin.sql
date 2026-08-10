create or replace function public.admin_get_athlete_activation_readiness(p_athlete_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
begin
  perform private.require_admin_actor();
  return private.athlete_activation_blockers(p_athlete_id);
end;
$$;

revoke all on function public.admin_get_athlete_activation_readiness(uuid) from public,anon;
grant execute on function public.admin_get_athlete_activation_readiness(uuid) to authenticated;
