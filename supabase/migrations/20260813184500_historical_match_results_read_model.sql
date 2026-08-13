create table if not exists public.historical_match_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  source_ref text not null,
  legacy_game_id integer not null,
  occurred_at timestamptz,
  time_label text,
  side_a_label text not null,
  side_b_label text not null,
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  winner_side text not null check (winner_side in ('A','B')),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_ref, legacy_game_id)
);

create table if not exists public.historical_match_participants (
  id uuid primary key default gen_random_uuid(),
  historical_match_id uuid not null references public.historical_match_results(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  side text not null check (side in ('A','B')),
  created_at timestamptz not null default now(),
  unique (historical_match_id, athlete_id)
);

create index if not exists historical_match_results_season_idx
  on public.historical_match_results(season_id, legacy_game_id desc);

create index if not exists historical_match_participants_athlete_idx
  on public.historical_match_participants(athlete_id, historical_match_id);

alter table public.historical_match_results enable row level security;
alter table public.historical_match_participants enable row level security;

create policy "athlete can read own historical match participants"
on public.historical_match_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.athletes a
    where a.id = historical_match_participants.athlete_id
      and a.profile_id = (select auth.uid())
  )
  or (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))
);

create policy "athlete can read own historical match results"
on public.historical_match_results
for select
to authenticated
using (
  exists (
    select 1
    from public.historical_match_participants hmp
    join public.athletes a on a.id = hmp.athlete_id
    where hmp.historical_match_id = historical_match_results.id
      and a.profile_id = (select auth.uid())
  )
  or (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))
);

revoke insert, update, delete on public.historical_match_results from anon, authenticated;
revoke insert, update, delete on public.historical_match_participants from anon, authenticated;
grant select on public.historical_match_results to authenticated;
grant select on public.historical_match_participants to authenticated;

comment on table public.historical_match_results is
  'Read-only historical result projection. It does not create Court Ops matches, ranking transactions or UR Coins.';
comment on column public.historical_match_results.occurred_at is
  'Nullable by design. Historical sources with unresolved dates must remain null rather than receive an inferred date.';
