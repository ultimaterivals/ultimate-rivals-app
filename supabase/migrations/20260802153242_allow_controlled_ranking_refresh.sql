create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cycle record;
begin
  if (select auth.uid()) is not null and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:'||target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id,null);
  for cycle in select id from public.season_cycles where season_id=target_season_id loop
    perform private.refresh_ranking_scope(target_season_id,cycle.id);
  end loop;
end $$;
revoke all on function private.refresh_all_rankings(uuid) from public,anon,authenticated;
grant execute on function private.refresh_all_rankings(uuid) to authenticated;
