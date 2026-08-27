-- Final athlete-facing hardening for historical match results.
-- Provenance remains part of the internal historical identity but is not exposed
-- through the Athlete App read model.

revoke select on public.historical_match_results from anon, authenticated;
revoke select on public.historical_match_participants from anon, authenticated;
revoke insert, update, delete on public.historical_match_results from anon, authenticated;
revoke insert, update, delete on public.historical_match_participants from anon, authenticated;

drop function if exists public.get_athlete_historical_match_results(uuid);

create function public.get_athlete_historical_match_results(
  p_athlete_id uuid
)
returns table (
  id uuid,
  legacy_game_id integer,
  occurred_at timestamptz,
  side_a_label text,
  side_b_label text,
  score_a smallint,
  score_b smallint,
  winner_side text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and a.profile_id = v_user_id
  ) and not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'historical results access denied' using errcode = '42501';
  end if;

  return query
  select
    hmr.id,
    hmr.legacy_game_id,
    hmr.occurred_at,
    hmr.side_a_label,
    hmr.side_b_label,
    hmr.score_a,
    hmr.score_b,
    hmr.winner_side
  from public.historical_match_results hmr
  where exists (
    select 1
    from public.historical_match_participants hmp
    where hmp.historical_match_id = hmr.id
      and hmp.athlete_id = p_athlete_id
  )
  order by hmr.legacy_game_id desc
  limit 100;
end;
$$;

revoke all on function public.get_athlete_historical_match_results(uuid) from public, anon;
grant execute on function public.get_athlete_historical_match_results(uuid) to authenticated;

comment on function public.get_athlete_historical_match_results(uuid) is
  'Read-only athlete-safe historical result projection. Returns only matches in which the requested athlete participated and excludes provenance, source metadata and other internal fields.';
