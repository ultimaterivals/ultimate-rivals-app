create or replace function private.can_access_athlete(target_athlete_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_any_role(array['admin','operator']::public.app_role[])
    or target_athlete_id = private.current_athlete_id()
$$;
revoke all on function private.can_access_athlete(uuid) from public, anon;
grant execute on function private.can_access_athlete(uuid) to authenticated;
