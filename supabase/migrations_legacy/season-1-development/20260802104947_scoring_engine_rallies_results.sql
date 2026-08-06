create type public.match_scoring_type as enum ('rally_point');
create type public.match_rally_status as enum ('valid', 'reversed', 'corrected', 'void');
create type public.match_rally_correction_type as enum (
  'reverse',
  'replace_winner',
  'void',
  'technical_action_correction'
);
create type public.match_technical_action_type as enum ('ace', 'attack', 'block', 'defense', 'assist');
create type public.match_technical_action_status as enum ('valid', 'corrected', 'void');
create type public.match_result_status as enum ('provisional', 'under_review', 'homologated', 'corrected', 'void');
create type public.match_correction_request_status as enum ('requested', 'applied', 'rejected');

alter table public.matches
  add column winner_side_id uuid references public.match_sides(id) on delete restrict,
  add column final_score_a smallint check (final_score_a is null or final_score_a >= 0),
  add column final_score_b smallint check (final_score_b is null or final_score_b >= 0),
  add column voided_at timestamptz,
  add column void_reason text,
  add constraint matches_final_score_pair check (
    (final_score_a is null and final_score_b is null)
    or (final_score_a is not null and final_score_b is not null)
  ),
  add constraint matches_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and char_length(trim(void_reason)) >= 5)
  );

create table public.match_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  points_to_win smallint not null default 11 check (points_to_win between 1 and 100),
  win_by smallint not null default 1 check (win_by between 1 and 10),
  max_points smallint check (max_points is null or max_points >= points_to_win),
  sets_to_win smallint not null default 1 check (sets_to_win between 1 and 5),
  scoring_type public.match_scoring_type not null default 'rally_point',
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create table public.match_rallies (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  rally_number integer not null check (rally_number > 0),
  client_sequence integer not null check (client_sequence > 0),
  winning_side_id uuid not null references public.match_sides(id) on delete restrict,
  status public.match_rally_status not null default 'valid',
  recorded_at timestamptz not null default now(),
  client_recorded_at timestamptz,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (match_id, rally_number),
  unique (match_id, client_sequence)
);

create table public.match_rally_corrections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  original_rally_id uuid not null references public.match_rallies(id) on delete restrict,
  correction_type public.match_rally_correction_type not null,
  replacement_winning_side_id uuid references public.match_sides(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) >= 5),
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid not null unique,
  constraint rally_correction_replacement check (
    (correction_type = 'replace_winner' and replacement_winning_side_id is not null)
    or (correction_type <> 'replace_winner' and replacement_winning_side_id is null)
  )
);

create table public.match_technical_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  rally_id uuid not null references public.match_rallies(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  athlete_id uuid references public.athletes(id) on delete restrict,
  side_id uuid references public.match_sides(id) on delete restrict,
  action_type public.match_technical_action_type,
  status public.match_technical_action_status not null default 'valid',
  supersedes_action_id uuid references public.match_technical_actions(id) on delete restrict,
  correction_reason text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  client_operation_id uuid not null unique,
  unique (rally_id, version_number),
  constraint technical_action_shape check (
    (
      status in ('valid', 'corrected')
      and athlete_id is not null
      and side_id is not null
      and action_type is not null
    )
    or (
      status = 'void'
      and athlete_id is null
      and side_id is null
      and action_type is null
    )
  ),
  constraint technical_action_correction_reason check (
    (version_number = 1 and supersedes_action_id is null and correction_reason is null)
    or (
      version_number > 1
      and supersedes_action_id is not null
      and char_length(trim(correction_reason)) >= 5
    )
  )
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  winner_side_id uuid references public.match_sides(id) on delete restrict,
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  result_status public.match_result_status not null default 'provisional',
  homologated_by uuid references public.profiles(id) on delete restrict,
  homologated_at timestamptz,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_result_homologation check (
    (result_status = 'homologated' and homologated_by is not null and homologated_at is not null)
    or (result_status <> 'homologated')
  ),
  constraint match_result_void check (
    (result_status = 'void' and winner_side_id is null)
    or result_status <> 'void'
  )
);

create table public.match_result_versions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.match_results(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  winner_side_id uuid references public.match_sides(id) on delete restrict,
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  result_status public.match_result_status not null,
  reason text not null check (char_length(trim(reason)) >= 3),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (result_id, version_number)
);

create table public.match_result_correction_requests (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.match_results(id) on delete restrict,
  match_id uuid not null references public.matches(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) >= 5),
  status public.match_correction_request_status not null default 'requested',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  client_operation_id uuid not null unique,
  constraint correction_request_resolution check (
    (status = 'requested' and resolved_by is null and resolved_at is null)
    or (status <> 'requested' and resolved_by is not null and resolved_at is not null)
  )
);

create index match_rallies_match_recorded on public.match_rallies(match_id, rally_number);
create index match_rally_corrections_rally_created on public.match_rally_corrections(original_rally_id, created_at desc);
create index match_rally_corrections_match on public.match_rally_corrections(match_id);
create index match_technical_actions_match_rally on public.match_technical_actions(match_id, rally_id, version_number desc);
create index match_technical_actions_athlete on public.match_technical_actions(athlete_id) where athlete_id is not null;
create index match_results_status on public.match_results(result_status, match_id);
create index match_result_versions_match on public.match_result_versions(match_id, version_number);
create index match_result_correction_requests_match on public.match_result_correction_requests(match_id, status);

create view public.match_rally_effective
with (security_invoker = true)
as
select
  rally.id,
  rally.match_id,
  rally.rally_number,
  rally.client_sequence,
  rally.winning_side_id as original_winning_side_id,
  case
    when correction.correction_type in ('reverse', 'void') then null
    when correction.correction_type = 'replace_winner' then correction.replacement_winning_side_id
    else rally.winning_side_id
  end as effective_winning_side_id,
  case
    when correction.correction_type = 'reverse' then 'reversed'::public.match_rally_status
    when correction.correction_type = 'void' then 'void'::public.match_rally_status
    when correction.correction_type = 'replace_winner' then 'corrected'::public.match_rally_status
    else rally.status
  end as effective_status,
  rally.recorded_at,
  rally.client_recorded_at,
  rally.recorded_by,
  rally.client_operation_id,
  correction.id as latest_correction_id,
  correction.correction_type as latest_correction_type,
  correction.reason as latest_correction_reason
from public.match_rallies rally
left join lateral (
  select item.*
  from public.match_rally_corrections item
  where item.original_rally_id = rally.id
    and item.correction_type in ('reverse', 'replace_winner', 'void')
  order by item.created_at desc, item.id desc
  limit 1
) correction on true;

create view public.match_scoreboard
with (security_invoker = true)
as
with scores as (
  select
    match.id as match_id,
    side_a.id as side_a_id,
    side_b.id as side_b_id,
    rule.points_to_win,
    rule.win_by,
    rule.max_points,
    count(rally.id) filter (
      where rally.effective_winning_side_id = side_a.id
        and rally.effective_status in ('valid', 'corrected')
    )::integer as score_a,
    count(rally.id) filter (
      where rally.effective_winning_side_id = side_b.id
        and rally.effective_status in ('valid', 'corrected')
    )::integer as score_b,
    count(rally.id) filter (
      where rally.effective_status in ('valid', 'corrected')
    )::integer as valid_rallies,
    coalesce(max(rally.rally_number), 0) + 1 as next_rally_number
  from public.matches match
  join public.match_scoring_rules rule on rule.match_id = match.id
  join public.match_sides side_a on side_a.match_id = match.id and side_a.side = 'A'
  join public.match_sides side_b on side_b.match_id = match.id and side_b.side = 'B'
  left join public.match_rally_effective rally on rally.match_id = match.id
  group by match.id, side_a.id, side_b.id, rule.points_to_win, rule.win_by, rule.max_points
)
select
  scores.*,
  (
    (score_a >= points_to_win and score_a - score_b >= win_by)
    or (max_points is not null and score_a >= max_points and score_a > score_b)
    or (score_b >= points_to_win and score_b - score_a >= win_by)
    or (max_points is not null and score_b >= max_points and score_b > score_a)
  ) as is_game_over,
  case
    when (score_a >= points_to_win and score_a - score_b >= win_by)
      or (max_points is not null and score_a >= max_points and score_a > score_b)
      then side_a_id
    when (score_b >= points_to_win and score_b - score_a >= win_by)
      or (max_points is not null and score_b >= max_points and score_b > score_a)
      then side_b_id
    else null
  end as winner_side_id
from scores;

create view public.match_technical_action_effective
with (security_invoker = true)
as
select distinct on (action.rally_id)
  action.*
from public.match_technical_actions action
order by action.rally_id, action.version_number desc, action.created_at desc;

create view public.match_game_points
with (security_invoker = true)
as
with running as (
  select
    rally.match_id,
    rally.id as rally_id,
    rally.rally_number,
    side_a.id as side_a_id,
    side_b.id as side_b_id,
    rule.points_to_win,
    rule.win_by,
    rule.max_points,
    count(*) filter (where rally.effective_winning_side_id = side_a.id) over (
      partition by rally.match_id order by rally.rally_number rows unbounded preceding
    )::integer as score_a,
    count(*) filter (where rally.effective_winning_side_id = side_b.id) over (
      partition by rally.match_id order by rally.rally_number rows unbounded preceding
    )::integer as score_b
  from public.match_rally_effective rally
  join public.match_scoring_rules rule on rule.match_id = rally.match_id
  join public.match_sides side_a on side_a.match_id = rally.match_id and side_a.side = 'A'
  join public.match_sides side_b on side_b.match_id = rally.match_id and side_b.side = 'B'
  where rally.effective_status in ('valid', 'corrected')
)
select distinct on (match_id)
  match_id,
  rally_id as game_point_rally_id,
  rally_number as game_point_rally_number,
  case when score_a > score_b then side_a_id else side_b_id end as winner_side_id,
  score_a,
  score_b
from running
where
  (score_a >= points_to_win and score_a - score_b >= win_by)
  or (max_points is not null and score_a >= max_points and score_a > score_b)
  or (score_b >= points_to_win and score_b - score_a >= win_by)
  or (max_points is not null and score_b >= max_points and score_b > score_a)
order by match_id, rally_number;

create view public.match_scoring_streaks
with (security_invoker = true)
as
with ordered as (
  select
    rally.match_id,
    rally.rally_number,
    rally.effective_winning_side_id,
    case
      when lag(rally.effective_winning_side_id) over (
        partition by rally.match_id order by rally.rally_number
      ) is distinct from rally.effective_winning_side_id then 1
      else 0
    end as changed
  from public.match_rally_effective rally
  where rally.effective_status in ('valid', 'corrected')
), grouped as (
  select
    ordered.*,
    sum(changed) over (partition by match_id order by rally_number) as streak_group
  from ordered
), runs as (
  select match_id, effective_winning_side_id, streak_group, count(*)::integer as streak_length
  from grouped
  group by match_id, effective_winning_side_id, streak_group
)
select
  match_id,
  max(streak_length) as max_streak,
  bool_or(streak_length >= 3) as has_streak_3,
  bool_or(streak_length >= 5) as has_streak_5
from runs
group by match_id;

create view public.match_athlete_statistics
with (security_invoker = true)
as
select
  participant.athlete_id,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
  )::integer as games_participated,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
      and participant.side_id = result.winner_side_id
  )::integer as wins,
  count(distinct participant.match_id) filter (
    where result.result_status = 'homologated'
      and participant.side_id <> result.winner_side_id
  )::integer as losses,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'ace'
  )::integer as aces,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'attack'
  )::integer as attacks,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'block'
  )::integer as blocks,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'defense'
  )::integer as defenses,
  count(action.id) filter (
    where result.result_status = 'homologated' and rally.id is not null and action.status <> 'void' and action.action_type = 'assist'
  )::integer as assists
from public.match_participants participant
left join public.match_results result on result.match_id = participant.match_id
left join public.match_technical_action_effective action
  on action.match_id = participant.match_id and action.athlete_id = participant.athlete_id
left join public.match_rally_effective rally
  on rally.id = action.rally_id
  and rally.effective_winning_side_id = action.side_id
  and rally.effective_status in ('valid', 'corrected')
where participant.status = 'active'
group by participant.athlete_id;

create view public.match_technical_summary
with (security_invoker = true)
as
select
  participant.match_id,
  participant.athlete_id,
  participant.side_id,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'ace')::integer as aces,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'attack')::integer as attacks,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'block')::integer as blocks,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'defense')::integer as defenses,
  count(action.id) filter (where rally.id is not null and action.status <> 'void' and action.action_type = 'assist')::integer as assists
from public.match_participants participant
left join public.match_technical_action_effective action
  on action.match_id = participant.match_id and action.athlete_id = participant.athlete_id
left join public.match_rally_effective rally
  on rally.id = action.rally_id
  and rally.effective_winning_side_id = action.side_id
  and rally.effective_status in ('valid', 'corrected')
where participant.status = 'active'
group by participant.match_id, participant.athlete_id, participant.side_id;

create or replace function private.can_score_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['admin']::public.app_role[])
    or exists (
      select 1
      from public.matches match
      join public.ur_play_session_staff staff on staff.session_id = match.session_id
      where match.id = target_match
        and staff.profile_id = auth.uid()
        and staff.role = 'operator'
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

create or replace function private.can_homologate_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_any_role(array['admin']::public.app_role[])
    or exists (
      select 1
      from public.matches match
      join public.ur_play_session_staff staff on staff.session_id = match.session_id
      where match.id = target_match
        and staff.profile_id = auth.uid()
        and staff.role = 'coordinator'
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

revoke all on function private.can_score_match(uuid) from public, anon;
revoke all on function private.can_homologate_match(uuid) from public, anon;
grant execute on function private.can_score_match(uuid) to authenticated;
grant execute on function private.can_homologate_match(uuid) to authenticated;

create or replace function private.reject_scoring_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'scoring history is append-only' using errcode = '42501';
end;
$$;

revoke all on function private.reject_scoring_event_mutation() from public, anon, authenticated;

create trigger match_rallies_append_only
before update or delete on public.match_rallies
for each row execute function private.reject_scoring_event_mutation();

create trigger match_rally_corrections_append_only
before update or delete on public.match_rally_corrections
for each row execute function private.reject_scoring_event_mutation();

create trigger match_technical_actions_append_only
before update or delete on public.match_technical_actions
for each row execute function private.reject_scoring_event_mutation();

create trigger match_result_versions_append_only
before update or delete on public.match_result_versions
for each row execute function private.reject_scoring_event_mutation();

create or replace function private.ensure_match_scoring_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.match_scoring_rules(match_id, created_by)
  values (new.id, new.created_by)
  on conflict (match_id) do nothing;
  return new;
end;
$$;

revoke all on function private.ensure_match_scoring_rule() from public, anon, authenticated;

create trigger matches_default_scoring_rule
after insert on public.matches
for each row execute function private.ensure_match_scoring_rule();

insert into public.match_scoring_rules(match_id, created_by)
select match.id, match.created_by
from public.matches match
on conflict (match_id) do nothing;

create or replace function private.freeze_match_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.match_status;
begin
  select status into current_status
  from public.matches
  where id = coalesce(new.match_id, old.match_id);
  if current_status in ('in_progress', 'pending_review', 'completed', 'abandoned') then
    raise exception 'match participants are frozen' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.validate_rally_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'valid' then
    raise exception 'new rally must be valid' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.match_sides side
    where side.id = new.winning_side_id and side.match_id = new.match_id
  ) then
    raise exception 'winning side does not belong to match' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_rally_insert() from public, anon, authenticated;
create trigger match_rallies_validate
before insert on public.match_rallies
for each row execute function private.validate_rally_insert();

create or replace function private.validate_rally_correction_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.match_rallies rally
    where rally.id = new.original_rally_id and rally.match_id = new.match_id
  ) then
    raise exception 'rally correction match mismatch' using errcode = '23514';
  end if;
  if new.replacement_winning_side_id is not null and not exists (
    select 1 from public.match_sides side
    where side.id = new.replacement_winning_side_id and side.match_id = new.match_id
  ) then
    raise exception 'replacement side does not belong to match' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_rally_correction_insert() from public, anon, authenticated;
create trigger match_rally_corrections_validate
before insert on public.match_rally_corrections
for each row execute function private.validate_rally_correction_insert();

create or replace function private.validate_technical_action_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rally_row public.match_rallies;
  effective_side uuid;
  previous_action public.match_technical_actions;
begin
  select * into rally_row from public.match_rallies where id = new.rally_id;
  if rally_row.id is null or rally_row.match_id <> new.match_id then
    raise exception 'technical action rally mismatch' using errcode = '23514';
  end if;
  select effective_winning_side_id into effective_side
  from public.match_rally_effective
  where id = new.rally_id;
  if effective_side is null then
    raise exception 'technical action requires a scoring rally' using errcode = '23514';
  end if;
  if new.status <> 'void' then
    if new.side_id <> effective_side then
      raise exception 'technical action athlete is on wrong side' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.match_participants participant
      where participant.match_id = new.match_id
        and participant.side_id = new.side_id
        and participant.athlete_id = new.athlete_id
        and participant.status = 'active'
    ) then
      raise exception 'active match participant required' using errcode = '23514';
    end if;
  end if;
  if new.version_number = 1 then
    if exists (select 1 from public.match_technical_actions where rally_id = new.rally_id) then
      raise exception 'rally already has a primary technical action' using errcode = '23505';
    end if;
  else
    select * into previous_action
    from public.match_technical_actions
    where id = new.supersedes_action_id;
    if previous_action.id is null
      or previous_action.rally_id <> new.rally_id
      or previous_action.version_number <> new.version_number - 1 then
      raise exception 'technical action correction chain is invalid' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_technical_action_insert() from public, anon, authenticated;
create trigger match_technical_actions_validate
before insert on public.match_technical_actions
for each row execute function private.validate_technical_action_insert();

create or replace function private.append_match_result_version(
  target_result public.match_results,
  reason text,
  operation_id uuid
)
returns public.match_result_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_version public.match_result_versions;
  next_version integer;
begin
  select * into result_version
  from public.match_result_versions
  where client_operation_id = operation_id;
  if found then return result_version; end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.match_result_versions
  where result_id = target_result.id;

  insert into public.match_result_versions(
    result_id, match_id, version_number, winner_side_id,
    score_a, score_b, result_status, reason, changed_by, client_operation_id
  ) values (
    target_result.id, target_result.match_id, next_version, target_result.winner_side_id,
    target_result.score_a, target_result.score_b, target_result.result_status,
    reason, auth.uid(), operation_id
  ) returning * into result_version;
  return result_version;
end;
$$;

revoke all on function private.append_match_result_version(public.match_results,text,uuid) from public, anon, authenticated;

create or replace function private.validate_match_result_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  score public.match_scoreboard;
begin
  if new.result_status = 'void' then return new; end if;
  select * into score from public.match_scoreboard where match_id = new.match_id;
  if score.match_id is null
    or new.score_a <> score.score_a
    or new.score_b <> score.score_b then
    raise exception 'result score is inconsistent with rallies' using errcode = '23514';
  end if;
  if new.result_status in ('provisional', 'under_review', 'homologated') then
    if not score.is_game_over or new.winner_side_id is distinct from score.winner_side_id then
      raise exception 'result winner is inconsistent with rallies' using errcode = '23514';
    end if;
  elsif score.is_game_over and new.winner_side_id is distinct from score.winner_side_id then
    raise exception 'corrected result winner is inconsistent with rallies' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_match_result_projection() from public, anon, authenticated;
create trigger match_results_validate_projection
before insert or update on public.match_results
for each row execute function private.validate_match_result_projection();

create or replace function private.release_match_queue_after_game(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_queue_entries queue
  set status = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then 'resting'::public.match_queue_status
        else 'waiting'::public.match_queue_status
      end,
      current_match_id = null,
      last_match_ended_at = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then now()
        else last_match_ended_at
      end,
      queued_at = now(),
      updated_at = now()
  where queue.current_match_id = target_match;
end;
$$;

create or replace function private.restore_match_queue_for_scoring(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_queue_entries queue
  set status = case
        when exists (
          select 1 from public.match_participants participant
          where participant.match_id = target_match
            and participant.athlete_id = queue.athlete_id
            and participant.status = 'active'
        ) then 'playing'::public.match_queue_status
        else 'assigned'::public.match_queue_status
      end,
      current_match_id = target_match,
      updated_at = now()
  where exists (
    select 1 from public.match_squad_members squad
    where squad.match_id = target_match
      and squad.athlete_id = queue.athlete_id
      and squad.status not in ('withdrawn', 'unavailable')
  ) or exists (
    select 1 from public.match_participants participant
    where participant.match_id = target_match
      and participant.athlete_id = queue.athlete_id
      and participant.status = 'active'
  );
end;
$$;

revoke all on function private.release_match_queue_after_game(uuid) from public, anon, authenticated;
revoke all on function private.restore_match_queue_for_scoring(uuid) from public, anon, authenticated;

create or replace function private.record_match_rally(
  target_match uuid,
  target_winning_side uuid,
  expected_rally_number integer,
  client_sequence integer,
  client_recorded_at timestamptz,
  operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  score public.match_scoreboard;
  result_row public.match_results;
begin
  select * into rally_row
  from public.match_rallies
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = rally_row.match_id;
    return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
  end if;

  select * into match_row from public.matches where id = target_match for update;
  if match_row.id is null then raise exception 'match not found' using errcode = 'P0002'; end if;
  if not private.can_score_match(match_row.id) then
    raise exception 'scoring operation denied' using errcode = '42501';
  end if;

  select * into rally_row
  from public.match_rallies
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = rally_row.match_id;
    return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
  end if;

  if match_row.status <> 'in_progress' then
    raise exception 'match is not accepting rallies' using errcode = '23514';
  end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.match_id is null then raise exception 'scoring rule not found' using errcode = 'P0002'; end if;
  if score.is_game_over then raise exception 'game is already over' using errcode = '23514'; end if;
  if expected_rally_number <> score.next_rally_number then
    raise exception 'stale rally sequence' using errcode = 'P0001';
  end if;
  if client_sequence <> expected_rally_number then
    raise exception 'client sequence mismatch' using errcode = '23514';
  end if;

  insert into public.match_rallies(
    match_id, rally_number, client_sequence, winning_side_id,
    client_recorded_at, recorded_by, client_operation_id
  ) values (
    match_row.id, expected_rally_number, client_sequence, target_winning_side,
    client_recorded_at, auth.uid(), operation_id
  ) returning * into rally_row;

  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.is_game_over then
    insert into public.match_results(
      match_id, winner_side_id, score_a, score_b, result_status
    ) values (
      match_row.id, score.winner_side_id, score.score_a, score.score_b, 'provisional'
    )
    on conflict (match_id) do update
    set winner_side_id = excluded.winner_side_id,
        score_a = excluded.score_a,
        score_b = excluded.score_b,
        result_status = 'provisional',
        homologated_by = null,
        homologated_at = null,
        correction_reason = null,
        updated_at = now()
    returning * into result_row;

    update public.matches
    set status = 'pending_review',
        winner_side_id = score.winner_side_id,
        final_score_a = score.score_a,
        final_score_b = score.score_b,
        ready_for_scoring = false,
        ended_at = now(),
        updated_at = now()
    where id = match_row.id;

    perform private.release_match_queue_after_game(match_row.id);
    perform private.append_match_result_version(result_row, 'Game point recorded', operation_id);
  end if;

  return jsonb_build_object('rally', to_jsonb(rally_row), 'scoreboard', to_jsonb(score));
end;
$$;

revoke all on function private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) from public, anon;
grant execute on function private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) to authenticated;

create or replace function public.record_match_rally(
  target_match uuid,
  target_winning_side uuid,
  expected_rally_number integer,
  client_sequence integer,
  client_recorded_at timestamptz,
  operation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.record_match_rally(
    target_match, target_winning_side, expected_rally_number,
    client_sequence, client_recorded_at, operation_id
  )
$$;

revoke all on function public.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) from public, anon;
grant execute on function public.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid) to authenticated;

create or replace function private.correct_match_rally(
  target_rally uuid,
  target_correction public.match_rally_correction_type,
  replacement_winning_side uuid,
  reason text,
  operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  correction_row public.match_rally_corrections;
  score public.match_scoreboard;
  result_row public.match_results;
  post_homologation_review boolean := false;
begin
  select * into correction_row
  from public.match_rally_corrections
  where client_operation_id = operation_id;
  if found then
    select * into score from public.match_scoreboard where match_id = correction_row.match_id;
    return jsonb_build_object('correction', to_jsonb(correction_row), 'scoreboard', to_jsonb(score));
  end if;

  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;
  select * into result_row from public.match_results where match_id = match_row.id for update;

  post_homologation_review := result_row.result_status = 'under_review' and exists (
    select 1 from public.match_result_correction_requests request
    where request.match_id = match_row.id and request.status = 'requested'
  );
  if post_homologation_review then
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'admin correction required' using errcode = '42501';
    end if;
  elsif not private.can_score_match(match_row.id) then
    raise exception 'rally correction denied' using errcode = '42501';
  end if;
  if result_row.result_status = 'homologated' then
    raise exception 'request correction before editing homologated result' using errcode = '23514';
  end if;
  if match_row.status not in ('in_progress', 'pending_review') then
    raise exception 'match is not open for correction' using errcode = '23514';
  end if;
  if target_correction = 'technical_action_correction' then
    raise exception 'use technical action correction flow' using errcode = '23514';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'correction reason required' using errcode = '23514';
  end if;

  insert into public.match_rally_corrections(
    match_id, original_rally_id, correction_type, replacement_winning_side_id,
    reason, corrected_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, target_correction, replacement_winning_side,
    reason, auth.uid(), operation_id
  ) returning * into correction_row;

  select * into score from public.match_scoreboard where match_id = match_row.id;
  if score.is_game_over then
    insert into public.match_results(
      match_id, winner_side_id, score_a, score_b, result_status, correction_reason
    ) values (
      match_row.id, score.winner_side_id, score.score_a, score.score_b,
      case when post_homologation_review
        then 'under_review'::public.match_result_status
        else 'corrected'::public.match_result_status end,
      reason
    )
    on conflict (match_id) do update
    set winner_side_id = excluded.winner_side_id,
        score_a = excluded.score_a,
        score_b = excluded.score_b,
        result_status = excluded.result_status,
        correction_reason = excluded.correction_reason,
        updated_at = now()
    returning * into result_row;
    update public.matches
    set status = 'pending_review', winner_side_id = score.winner_side_id,
        final_score_a = score.score_a, final_score_b = score.score_b,
        ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
    where id = match_row.id;
    perform private.release_match_queue_after_game(match_row.id);
  else
    if result_row.id is not null then
      update public.match_results
      set winner_side_id = null, score_a = score.score_a, score_b = score.score_b,
          result_status = 'corrected', correction_reason = reason, updated_at = now()
      where id = result_row.id
      returning * into result_row;
    end if;
    update public.matches
    set status = 'in_progress', winner_side_id = null,
        final_score_a = null, final_score_b = null,
        ready_for_scoring = true, ended_at = null, updated_at = now()
    where id = match_row.id;
    perform private.restore_match_queue_for_scoring(match_row.id);
  end if;

  if result_row.id is not null then
    perform private.append_match_result_version(result_row, reason, operation_id);
  end if;
  if post_homologation_review then
    update public.match_result_correction_requests
    set status = 'applied', resolved_by = auth.uid(), resolved_at = now()
    where match_id = match_row.id and status = 'requested';
  end if;

  return jsonb_build_object('correction', to_jsonb(correction_row), 'scoreboard', to_jsonb(score));
end;
$$;

revoke all on function private.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) from public, anon;
grant execute on function private.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) to authenticated;

create or replace function public.correct_match_rally(
  target_rally uuid,
  target_correction public.match_rally_correction_type,
  replacement_winning_side uuid,
  reason text,
  operation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.correct_match_rally(
    target_rally, target_correction, replacement_winning_side, reason, operation_id
  )
$$;

revoke all on function public.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) from public, anon;
grant execute on function public.correct_match_rally(uuid,public.match_rally_correction_type,uuid,text,uuid) to authenticated;

create or replace function private.record_match_technical_action(
  target_rally uuid,
  target_athlete uuid,
  target_action public.match_technical_action_type,
  correction_reason text,
  operation_id uuid
)
returns public.match_technical_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  action_row public.match_technical_actions;
  previous_action public.match_technical_actions;
  participant_side uuid;
  post_homologation_review boolean := false;
  latest_rally_number integer;
begin
  select * into action_row
  from public.match_technical_actions
  where client_operation_id = operation_id;
  if found then return action_row; end if;

  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;

  post_homologation_review := exists (
    select 1
    from public.match_results result
    join public.match_result_correction_requests request on request.result_id = result.id
    where result.match_id = match_row.id
      and result.result_status = 'under_review'
      and request.status = 'requested'
  );
  if post_homologation_review then
    if not private.has_any_role(array['admin']::public.app_role[]) then
      raise exception 'admin technical correction required' using errcode = '42501';
    end if;
  elsif not private.can_score_match(match_row.id) then
    raise exception 'technical action denied' using errcode = '42501';
  end if;
  if match_row.status not in ('in_progress', 'pending_review') then
    raise exception 'match is not accepting technical actions' using errcode = '23514';
  end if;

  select participant.side_id into participant_side
  from public.match_participants participant
  where participant.match_id = match_row.id
    and participant.athlete_id = target_athlete
    and participant.status = 'active';
  if participant_side is null then
    raise exception 'active match participant required' using errcode = '23514';
  end if;

  select * into previous_action
  from public.match_technical_actions
  where rally_id = rally_row.id
  order by version_number desc
  limit 1
  for update;

  select max(rally_number) into latest_rally_number
  from public.match_rallies
  where match_id = match_row.id;
  if (previous_action.id is not null or rally_row.rally_number < latest_rally_number)
    and coalesce(char_length(trim(correction_reason)), 0) < 5 then
    raise exception 'technical correction reason required' using errcode = '23514';
  end if;

  if previous_action.id is not null or rally_row.rally_number < latest_rally_number then
    insert into public.match_rally_corrections(
      match_id, original_rally_id, correction_type, reason,
      corrected_by, client_operation_id
    ) values (
      match_row.id, rally_row.id, 'technical_action_correction', correction_reason,
      auth.uid(), operation_id
    );
  end if;

  insert into public.match_technical_actions(
    match_id, rally_id, version_number, athlete_id, side_id, action_type,
    status, supersedes_action_id, correction_reason, recorded_by, client_operation_id
  ) values (
    match_row.id,
    rally_row.id,
    coalesce(previous_action.version_number, 0) + 1,
    target_athlete,
    participant_side,
    target_action,
    case when previous_action.id is null
      then 'valid'::public.match_technical_action_status
      else 'corrected'::public.match_technical_action_status end,
    previous_action.id,
    case when previous_action.id is null then null else correction_reason end,
    auth.uid(),
    operation_id
  ) returning * into action_row;

  if post_homologation_review then
    update public.match_result_correction_requests
    set status = 'applied', resolved_by = auth.uid(), resolved_at = now()
    where match_id = match_row.id and status = 'requested';
  end if;
  return action_row;
end;
$$;

revoke all on function private.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) from public, anon;
grant execute on function private.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) to authenticated;

create or replace function public.record_match_technical_action(
  target_rally uuid,
  target_athlete uuid,
  target_action public.match_technical_action_type,
  correction_reason text,
  operation_id uuid
)
returns public.match_technical_actions
language sql
security invoker
set search_path = ''
as $$
  select private.record_match_technical_action(
    target_rally, target_athlete, target_action, correction_reason, operation_id
  )
$$;

revoke all on function public.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) from public, anon;
grant execute on function public.record_match_technical_action(uuid,uuid,public.match_technical_action_type,text,uuid) to authenticated;

create or replace function private.void_match_technical_action(
  target_rally uuid,
  reason text,
  operation_id uuid
)
returns public.match_technical_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  rally_row public.match_rallies;
  action_row public.match_technical_actions;
  previous_action public.match_technical_actions;
begin
  select * into action_row from public.match_technical_actions where client_operation_id = operation_id;
  if found then return action_row; end if;
  select * into rally_row from public.match_rallies where id = target_rally;
  if rally_row.id is null then raise exception 'rally not found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = rally_row.match_id for update;
  if not private.can_score_match(match_row.id)
    and not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'technical action correction denied' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'technical correction reason required' using errcode = '23514';
  end if;
  select * into previous_action
  from public.match_technical_actions
  where rally_id = rally_row.id
  order by version_number desc
  limit 1
  for update;
  if previous_action.id is null or previous_action.status = 'void' then
    raise exception 'active technical action not found' using errcode = 'P0002';
  end if;
  insert into public.match_rally_corrections(
    match_id, original_rally_id, correction_type, reason,
    corrected_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, 'technical_action_correction', reason,
    auth.uid(), operation_id
  );
  insert into public.match_technical_actions(
    match_id, rally_id, version_number, status, supersedes_action_id,
    correction_reason, recorded_by, client_operation_id
  ) values (
    match_row.id, rally_row.id, previous_action.version_number + 1,
    'void', previous_action.id, reason, auth.uid(), operation_id
  ) returning * into action_row;
  return action_row;
end;
$$;

revoke all on function private.void_match_technical_action(uuid,text,uuid) from public, anon;
grant execute on function private.void_match_technical_action(uuid,text,uuid) to authenticated;

create or replace function public.void_match_technical_action(
  target_rally uuid,
  reason text,
  operation_id uuid
)
returns public.match_technical_actions
language sql
security invoker
set search_path = ''
as $$ select private.void_match_technical_action(target_rally, reason, operation_id) $$;

revoke all on function public.void_match_technical_action(uuid,text,uuid) from public, anon;
grant execute on function public.void_match_technical_action(uuid,text,uuid) to authenticated;

create or replace function private.submit_match_for_review(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_score_match(match_row.id) then raise exception 'review submission denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  if match_row.status <> 'pending_review' or result_row.result_status not in ('provisional', 'corrected') then
    raise exception 'provisional result required' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'under_review', updated_at = now()
  where id = result_row.id
  returning * into result_row;
  perform private.append_match_result_version(result_row, 'Submitted for review', operation_id);
  return result_row;
end;
$$;

revoke all on function private.submit_match_for_review(uuid,uuid) from public, anon;
grant execute on function private.submit_match_for_review(uuid,uuid) to authenticated;

create or replace function public.submit_match_for_review(target_match uuid, operation_id uuid)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.submit_match_for_review(target_match, operation_id) $$;

revoke all on function public.submit_match_for_review(uuid,uuid) from public, anon;
grant execute on function public.submit_match_for_review(uuid,uuid) to authenticated;

create or replace function private.homologate_match_result(
  target_match uuid,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.can_homologate_match(match_row.id) then raise exception 'homologation denied' using errcode = '42501'; end if;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  if match_row.status <> 'pending_review' or result_row.result_status <> 'under_review' then
    raise exception 'result under review required' using errcode = '23514';
  end if;
  if not score.is_game_over
    or result_row.score_a <> score.score_a
    or result_row.score_b <> score.score_b
    or result_row.winner_side_id is distinct from score.winner_side_id then
    raise exception 'result is inconsistent with rallies' using errcode = '23514';
  end if;
  update public.match_results
  set result_status = 'homologated', homologated_by = auth.uid(),
      homologated_at = now(), updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = score.winner_side_id,
      final_score_a = score.score_a, final_score_b = score.score_b,
      ready_for_scoring = false, ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, 'Result homologated', operation_id);
  return result_row;
end;
$$;

revoke all on function private.homologate_match_result(uuid,uuid) from public, anon;
grant execute on function private.homologate_match_result(uuid,uuid) to authenticated;

create or replace function public.homologate_match_result(target_match uuid, operation_id uuid)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.homologate_match_result(target_match, operation_id) $$;

revoke all on function public.homologate_match_result(uuid,uuid) from public, anon;
grant execute on function public.homologate_match_result(uuid,uuid) to authenticated;

create or replace function private.request_match_result_correction(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_result_correction_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  request_row public.match_result_correction_requests;
begin
  select * into request_row
  from public.match_result_correction_requests
  where client_operation_id = operation_id;
  if found then return request_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin correction request required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'correction request reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  select * into result_row from public.match_results where match_id = match_row.id for update;
  if match_row.status <> 'completed' or result_row.result_status <> 'homologated' then
    raise exception 'homologated result required' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.match_result_correction_requests
    where match_id = match_row.id and status = 'requested'
  ) then
    raise exception 'correction request already open' using errcode = '23505';
  end if;
  insert into public.match_result_correction_requests(
    result_id, match_id, reason, requested_by, client_operation_id
  ) values (
    result_row.id, match_row.id, reason, auth.uid(), operation_id
  ) returning * into request_row;
  update public.match_results
  set result_status = 'under_review', correction_reason = reason,
      homologated_by = null, homologated_at = null, updated_at = now()
  where id = result_row.id
  returning * into result_row;
  update public.matches
  set status = 'pending_review', updated_at = now()
  where id = match_row.id;
  perform private.append_match_result_version(result_row, reason, operation_id);
  return request_row;
end;
$$;

revoke all on function private.request_match_result_correction(uuid,text,uuid) from public, anon;
grant execute on function private.request_match_result_correction(uuid,text,uuid) to authenticated;

create or replace function public.request_match_result_correction(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_result_correction_requests
language sql
security invoker
set search_path = ''
as $$ select private.request_match_result_correction(target_match, reason, operation_id) $$;

revoke all on function public.request_match_result_correction(uuid,text,uuid) from public, anon;
grant execute on function public.request_match_result_correction(uuid,text,uuid) to authenticated;

create or replace function private.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  result_row public.match_results;
  score public.match_scoreboard;
  existing_version public.match_result_versions;
begin
  select * into existing_version from public.match_result_versions where client_operation_id = operation_id;
  if found then select * into result_row from public.match_results where id = existing_version.result_id; return result_row; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin void required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'void reason required' using errcode = '23514';
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if match_row.status = 'cancelled' then raise exception 'cancelled match cannot be voided' using errcode = '23514'; end if;
  select * into score from public.match_scoreboard where match_id = match_row.id;
  insert into public.match_results(
    match_id, winner_side_id, score_a, score_b, result_status, correction_reason
  ) values (
    match_row.id, null, coalesce(score.score_a, 0), coalesce(score.score_b, 0), 'void', reason
  )
  on conflict (match_id) do update
  set winner_side_id = null,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      result_status = 'void',
      homologated_by = null,
      homologated_at = null,
      correction_reason = excluded.correction_reason,
      updated_at = now()
  returning * into result_row;
  update public.matches
  set status = 'completed', winner_side_id = null,
      final_score_a = coalesce(score.score_a, 0),
      final_score_b = coalesce(score.score_b, 0),
      ready_for_scoring = false,
      voided_at = now(), void_reason = reason,
      ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = match_row.id;
  perform private.release_match_queue_after_game(match_row.id);
  perform private.append_match_result_version(result_row, reason, operation_id);
  return result_row;
end;
$$;

revoke all on function private.void_match_result(uuid,text,uuid) from public, anon;
grant execute on function private.void_match_result(uuid,text,uuid) to authenticated;

create or replace function public.void_match_result(
  target_match uuid,
  reason text,
  operation_id uuid
)
returns public.match_results
language sql
security invoker
set search_path = ''
as $$ select private.void_match_result(target_match, reason, operation_id) $$;

revoke all on function public.void_match_result(uuid,text,uuid) from public, anon;
grant execute on function public.void_match_result(uuid,text,uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'match_scoring_rules',
    'match_rallies',
    'match_rally_corrections',
    'match_technical_actions',
    'match_results',
    'match_result_versions',
    'match_result_correction_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

create policy match_scoring_rules_read
on public.match_scoring_rules for select to authenticated
using (private.can_read_match(match_id));

create policy match_rallies_read
on public.match_rallies for select to authenticated
using (private.can_read_match(match_id));

create policy match_rally_corrections_read
on public.match_rally_corrections for select to authenticated
using (private.can_read_match(match_id));

create policy match_technical_actions_read
on public.match_technical_actions for select to authenticated
using (private.can_read_match(match_id));

create policy match_results_read
on public.match_results for select to authenticated
using (private.can_read_match(match_id));

create policy match_result_versions_read
on public.match_result_versions for select to authenticated
using (private.can_read_match(match_id));

create policy match_result_correction_requests_read
on public.match_result_correction_requests for select to authenticated
using (private.can_read_match(match_id));

grant select on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
to authenticated;

grant select on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
to authenticated;

grant all on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
to service_role;

grant select on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
to service_role;

revoke all on
  public.match_scoring_rules,
  public.match_rallies,
  public.match_rally_corrections,
  public.match_technical_actions,
  public.match_results,
  public.match_result_versions,
  public.match_result_correction_requests
from anon;

revoke all on
  public.match_rally_effective,
  public.match_scoreboard,
  public.match_technical_action_effective,
  public.match_game_points,
  public.match_scoring_streaks,
  public.match_athlete_statistics,
  public.match_technical_summary
from anon;
