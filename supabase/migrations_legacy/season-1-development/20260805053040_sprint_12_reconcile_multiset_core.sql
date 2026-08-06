-- Sprint 12 closeout reconciliation: additive multi-set and schema hardening.

alter table public.match_rallies
  add column if not exists set_number smallint not null default 1;

alter table public.match_results
  add column if not exists sets_a smallint not null default 0,
  add column if not exists sets_b smallint not null default 0,
  add column if not exists current_set smallint not null default 1,
  add column if not exists set_scores jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_rallies_set_number_check'
      and conrelid = 'public.match_rallies'::regclass
  ) then
    alter table public.match_rallies
      add constraint match_rallies_set_number_check check (set_number between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_results_sets_check'
      and conrelid = 'public.match_results'::regclass
  ) then
    alter table public.match_results
      add constraint match_results_sets_check
      check (sets_a >= 0 and sets_b >= 0 and current_set between 1 and 5 and jsonb_typeof(set_scores) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_scoring_rules_set_rules_array'
      and conrelid = 'public.match_scoring_rules'::regclass
  ) then
    alter table public.match_scoring_rules
      add constraint match_scoring_rules_set_rules_array
      check (jsonb_typeof(set_rules) = 'array' and jsonb_array_length(set_rules) between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tournaments_cancel_reason'
      and conrelid = 'public.tournaments'::regclass
  ) then
    alter table public.tournaments
      add constraint tournaments_cancel_reason
      check (
        (status = 'cancelled' and cancelled_at is not null and nullif(trim(cancellation_reason), '') is not null)
        or status <> 'cancelled'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tournament_seed_manual_reason'
      and conrelid = 'public.tournament_seeds'::regclass
  ) then
    alter table public.tournament_seeds
      add constraint tournament_seed_manual_reason
      check (
        (source = 'manual' and nullif(trim(coalesce(reason, '')), '') is not null)
        or source <> 'manual'
      );
  end if;
end $$;

create index if not exists tournament_divisions_tournament
  on public.tournament_divisions (tournament_id, status, level);
create index if not exists tournament_registrations_division
  on public.tournament_registrations (division_id, status, payment_status);
create index if not exists tournament_rosters_registration
  on public.tournament_rosters (registration_id, athlete_id, role);
create index if not exists tournament_matches_division_round
  on public.tournament_matches (division_id, round_number, match_order);
create index if not exists tournament_staff_profile
  on public.tournament_staff_assignments (profile_id, tournament_id, division_id);
create index if not exists match_rallies_match_set_recorded
  on public.match_rallies (match_id, set_number, rally_number);

create or replace function private.reject_tournament_result_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'TOURNAMENT_RESULTS_APPEND_ONLY'
    using errcode = 'P0001',
      detail = 'Official tournament result rows are append-only. Create a new version instead.';
end;
$$;

revoke all on function private.reject_tournament_result_mutation() from public;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'tournament_results_append_only'
      and tgrelid = 'public.tournament_results'::regclass
  ) then
    create trigger tournament_results_append_only
      before update or delete on public.tournament_results
      for each row execute function private.reject_tournament_result_mutation();
  end if;
end $$;

create or replace view public.tournament_match_scoreboard
with (security_invoker = true)
as
select
  tm.id as tournament_match_id,
  tm.division_id,
  tm.match_id,
  coalesce(msr.match_format, 'single_game'::public.match_format_type) as match_format,
  mr.set_number,
  count(*) filter (where mside.side = 'A')::smallint as score_a,
  count(*) filter (where mside.side = 'B')::smallint as score_b,
  max(mr.rally_number) as last_rally_number
from public.tournament_matches tm
join public.match_rallies mr on mr.match_id = tm.match_id
join public.match_sides mside on mside.id = mr.winning_side_id
left join public.match_scoring_rules msr on msr.match_id = tm.match_id
where mr.status = 'valid'
group by tm.id, tm.division_id, tm.match_id, msr.match_format, mr.set_number;

grant select on public.tournament_match_scoreboard to authenticated;
