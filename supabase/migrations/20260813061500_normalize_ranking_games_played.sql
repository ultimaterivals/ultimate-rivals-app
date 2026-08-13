-- Ranking participation is awarded once per UR Play session, while games played
-- must continue to represent homologated match outcomes. Normalize the projection
-- at insert time so individual, doubles, fours, team and pole rankings use
-- WIN + LOSS as the canonical game count.

create or replace function private.normalize_ranking_games_played()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.games_played := greatest(coalesce(new.wins, 0) + coalesce(new.losses, 0), 0);
  new.win_rate := case
    when new.games_played > 0 then round(new.wins::numeric * 100 / new.games_played, 4)
    else 0
  end;
  return new;
end;
$$;

drop trigger if exists ranking_entries_normalize_games_played on public.ranking_entries;
create trigger ranking_entries_normalize_games_played
before insert on public.ranking_entries
for each row execute function private.normalize_ranking_games_played();

revoke all on function private.normalize_ranking_games_played() from public, anon, authenticated;
