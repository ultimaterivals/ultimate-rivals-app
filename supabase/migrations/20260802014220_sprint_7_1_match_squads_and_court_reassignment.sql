create type public.match_squad_role as enum ('starter', 'reserve');
create type public.match_squad_status as enum ('called', 'confirmed', 'active', 'bench', 'withdrawn', 'unavailable');
create type public.reserve_presence_status as enum ('expected', 'present', 'absent', 'excused');
create type public.match_event_context as enum ('ur_play', 'pole_tournament', 'regional', 'legends');

alter table public.matches
  add column event_context public.match_event_context not null default 'ur_play';

create table public.match_squad_members (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  side_id uuid not null references public.match_sides(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  registration_id uuid not null references public.ur_play_registrations(id) on delete restrict,
  roster_id uuid references public.team_rosters(id) on delete restrict,
  initial_squad_role public.match_squad_role not null,
  squad_role public.match_squad_role not null,
  status public.match_squad_status not null,
  reserve_presence_status public.reserve_presence_status,
  position_order smallint not null,
  called_at timestamptz,
  confirmed_at timestamptz,
  activated_at timestamptz,
  benched_at timestamptz,
  withdrawn_at timestamptz,
  last_change_reason text check (last_change_reason is null or char_length(trim(last_change_reason)) between 5 and 500),
  last_operation_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_squad_role_position check (
    (squad_role = 'starter' and position_order between 1 and 4)
    or (squad_role = 'reserve' and position_order between 5 and 7)
  ),
  constraint match_squad_position_unique unique (side_id, position_order) deferrable initially immediate,
  unique (match_id, athlete_id)
);

create index match_squad_match_role on public.match_squad_members(match_id, squad_role, status);
create index match_squad_athlete on public.match_squad_members(athlete_id, match_id);
create index match_squad_registration on public.match_squad_members(registration_id);
create index match_squad_roster on public.match_squad_members(roster_id) where roster_id is not null;
create index match_squad_created_by on public.match_squad_members(created_by);

create table public.match_court_changes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  from_court_id uuid not null references public.courts(id) on delete restrict,
  to_court_id uuid not null references public.courts(id) on delete restrict,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  client_operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  constraint match_court_changed check (from_court_id <> to_court_id)
);

create index match_court_changes_match on public.match_court_changes(match_id, created_at desc);
create index match_court_changes_from on public.match_court_changes(from_court_id);
create index match_court_changes_to on public.match_court_changes(to_court_id);
create index match_court_changes_actor on public.match_court_changes(changed_by);

create trigger match_squad_set_updated_at
before update on public.match_squad_members
for each row execute function private.set_updated_at();

create or replace function private.freeze_match_squad()
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

  if current_status in ('in_progress', 'completed', 'cancelled', 'abandoned') then
    raise exception 'match squad is frozen' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.freeze_match_squad() from public, anon, authenticated;

create trigger match_squad_freeze
before update or delete on public.match_squad_members
for each row execute function private.freeze_match_squad();

create or replace function private.create_court_ops_match_with_squad(
  target_session uuid,
  target_court uuid,
  target_format uuid,
  target_category uuid,
  target_level public.athlete_level,
  side_a uuid[],
  side_b uuid[],
  side_a_reserves uuid[],
  side_b_reserves uuid[],
  side_a_roster uuid,
  side_b_roster uuid,
  operation_id uuid,
  actor uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  format_code text;
  category_code text;
  all_squad uuid[];
  reserve_ids uuid[] := coalesce(side_a_reserves, array[]::uuid[]) || coalesce(side_b_reserves, array[]::uuid[]);
  result public.matches;
  side_a_id uuid;
  side_b_id uuid;
  invalid_count integer;
begin
  select code into format_code from public.competitive_formats where id = target_format and status = 'active';
  select code into category_code from public.competitive_categories where id = target_category and status = 'active';

  if format_code not in ('doubles', 'fours') then
    raise exception 'unsupported match format' using errcode = '23514';
  end if;
  if format_code = 'doubles' and cardinality(reserve_ids) > 0 then
    raise exception 'doubles do not support reserves' using errcode = '23514';
  end if;
  if cardinality(coalesce(side_a_reserves, array[]::uuid[])) > 3
    or cardinality(coalesce(side_b_reserves, array[]::uuid[])) > 3 then
    raise exception 'maximum three reserves per side' using errcode = '23514';
  end if;

  all_squad := side_a || side_b || reserve_ids;
  if (select count(distinct athlete_id) from unnest(all_squad) athlete_id) <> cardinality(all_squad) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select count(*) into invalid_count
  from unnest(reserve_ids) athlete_id
  left join public.match_queue_entries queue
    on queue.session_id = target_session and queue.athlete_id = athlete_id
  left join public.ur_play_registrations registration on registration.id = queue.registration_id
  left join public.athletes athlete on athlete.id = athlete_id
  where queue.id is null
    or queue.status not in ('waiting', 'resting')
    or queue.current_match_id is not null
    or registration.registration_status <> 'confirmed'
    or registration.attendance_status not in ('checked_in', 'present')
    or (registration.snapshot_level <> target_level and registration.snapshot_level <> 'leveling')
    or (category_code = 'female' and athlete.gender <> 'female')
    or (category_code = 'male' and athlete.gender <> 'male');
  if invalid_count > 0 then
    raise exception 'ineligible reserve' using errcode = '23514';
  end if;

  if side_a_roster is not null and not exists (
    select 1 from public.team_rosters roster
    where roster.id = side_a_roster and roster.status = 'active'
      and roster.format_id = target_format and roster.category_id = target_category and roster.level = target_level
      and not exists (
        select 1 from unnest(side_a || coalesce(side_a_reserves, array[]::uuid[])) athlete_id
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id and member.athlete_id = athlete_id and member.status = 'active'
        )
      )
  ) then
    raise exception 'side A does not match active official roster' using errcode = '23514';
  end if;

  if side_b_roster is not null and not exists (
    select 1 from public.team_rosters roster
    where roster.id = side_b_roster and roster.status = 'active'
      and roster.format_id = target_format and roster.category_id = target_category and roster.level = target_level
      and not exists (
        select 1 from unnest(side_b || coalesce(side_b_reserves, array[]::uuid[])) athlete_id
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id and member.athlete_id = athlete_id and member.status = 'active'
        )
      )
  ) then
    raise exception 'side B does not match active official roster' using errcode = '23514';
  end if;

  perform 1
  from public.match_queue_entries
  where session_id = target_session and athlete_id = any(all_squad)
  order by athlete_id
  for update;

  result := private.create_court_ops_match(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, operation_id, actor
  );

  select id into side_a_id from public.match_sides where match_id = result.id and side = 'A';
  select id into side_b_id from public.match_sides where match_id = result.id and side = 'B';

  update public.match_sides side
  set roster_id = case when side.side = 'A' then side_a_roster else side_b_roster end,
      team_id = case
        when side.side = 'A' then (select team_id from public.team_rosters where id = side_a_roster)
        else (select team_id from public.team_rosters where id = side_b_roster)
      end
  where side.match_id = result.id;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, confirmed_at, activated_at, last_operation_id, created_by
  )
  select participant.match_id, participant.side_id, participant.athlete_id, participant.registration_id,
    case when participant.side_id = side_a_id then side_a_roster else side_b_roster end,
    'starter', 'starter', 'active', 'present', participant.position_order,
    now(), now(), operation_id, actor
  from public.match_participants participant
  where participant.match_id = result.id
  on conflict (match_id, athlete_id) do nothing;

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, called_at, last_operation_id, created_by
  )
  select result.id, side_a_id, registration.athlete_id, registration.id, side_a_roster,
    'reserve', 'reserve', 'called', 'expected', (ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_a_reserves, array[]::uuid[])) with ordinality reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id
  union all
  select result.id, side_b_id, registration.athlete_id, registration.id, side_b_roster,
    'reserve', 'reserve', 'called', 'expected', (ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_b_reserves, array[]::uuid[])) with ordinality reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id;

  update public.match_queue_entries
  set status = 'assigned', current_match_id = result.id, updated_at = now()
  where session_id = target_session and athlete_id = any(reserve_ids);

  return result;
end;
$$;

revoke all on function private.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid,uuid) from public, anon;
grant execute on function private.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.create_court_ops_match_with_squad(
  target_session uuid,
  target_court uuid,
  target_format uuid,
  target_category uuid,
  target_level public.athlete_level,
  side_a uuid[],
  side_b uuid[],
  side_a_reserves uuid[] default array[]::uuid[],
  side_b_reserves uuid[] default array[]::uuid[],
  side_a_roster uuid default null,
  side_b_roster uuid default null,
  operation_id uuid default gen_random_uuid()
)
returns public.matches
language sql
security invoker
set search_path = ''
as $$
  select private.create_court_ops_match_with_squad(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, side_a_reserves, side_b_reserves,
    side_a_roster, side_b_roster, operation_id, auth.uid()
  );
$$;

revoke all on function public.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid) from public, anon;
grant execute on function public.create_court_ops_match_with_squad(uuid,uuid,uuid,uuid,public.athlete_level,uuid[],uuid[],uuid[],uuid[],uuid,uuid,uuid) to authenticated;

create or replace function private.set_match_reserve_presence(
  target_member uuid,
  target_presence public.reserve_presence_status,
  reason text,
  operation_id uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.match_squad_members;
  match_row public.matches;
begin
  select * into member from public.match_squad_members where id = target_member for update;
  select * into match_row from public.matches where id = member.match_id for update;
  if not private.operates_ur_play_session(match_row.session_id) then
    raise exception 'squad operation denied' using errcode = '42501';
  end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') or member.squad_role <> 'reserve' then
    raise exception 'reserve presence is frozen' using errcode = '23514';
  end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'presence reason required' using errcode = '23514';
  end if;

  update public.match_squad_members
  set reserve_presence_status = target_presence,
      status = case
        when target_presence = 'present' then 'bench'::public.match_squad_status
        when target_presence = 'expected' then 'called'::public.match_squad_status
        else 'unavailable'::public.match_squad_status
      end,
      confirmed_at = case when target_presence = 'present' then now() else confirmed_at end,
      last_change_reason = reason,
      last_operation_id = operation_id
  where id = member.id
  returning * into member;

  if target_presence in ('absent', 'excused') then
    update public.match_queue_entries
    set status = 'unavailable', current_match_id = null, updated_at = now()
    where registration_id = member.registration_id;
  elsif target_presence in ('present', 'expected') then
    update public.match_queue_entries
    set status = 'assigned', current_match_id = member.match_id, updated_at = now()
    where registration_id = member.registration_id;
  end if;
  return member;
end;
$$;

revoke all on function private.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) from public, anon;
grant execute on function private.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) to authenticated;

create or replace function public.set_match_reserve_presence(
  target_member uuid,
  target_presence public.reserve_presence_status,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.set_match_reserve_presence(target_member, target_presence, reason, operation_id) $$;

revoke all on function public.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) from public, anon;
grant execute on function public.set_match_reserve_presence(uuid,public.reserve_presence_status,text,uuid) to authenticated;

create or replace function private.add_match_reserve(
  target_match uuid,
  target_side uuid,
  target_athlete uuid,
  target_roster uuid,
  operation_id uuid,
  actor uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  registration public.ur_play_registrations;
  result public.match_squad_members;
  reserve_count integer;
  next_position smallint;
  format_code text;
  category_code text;
  athlete_gender public.gender_type;
begin
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then
    raise exception 'squad operation denied' using errcode = '42501';
  end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then
    raise exception 'match squad is frozen' using errcode = '23514';
  end if;
  if not exists (select 1 from public.match_sides where id = target_side and match_id = target_match) then
    raise exception 'side does not belong to match' using errcode = '23514';
  end if;
  select code into format_code from public.competitive_formats where id = match_row.format_id;
  if format_code <> 'fours' then
    raise exception 'reserves are supported only for fours' using errcode = '23514';
  end if;
  select count(*) into reserve_count from public.match_squad_members
  where side_id = target_side and squad_role = 'reserve' and status not in ('withdrawn', 'unavailable');
  if reserve_count >= 3 then raise exception 'maximum three reserves per side' using errcode = '23514'; end if;

  if exists (select 1 from public.match_squad_members where match_id = target_match and athlete_id = target_athlete) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select registration_row.* into registration
  from public.ur_play_registrations registration_row
  join public.match_queue_entries queue on queue.registration_id = registration_row.id
  where registration_row.session_id = match_row.session_id
    and registration_row.athlete_id = target_athlete
    and registration_row.registration_status = 'confirmed'
    and registration_row.attendance_status in ('checked_in', 'present')
    and queue.status in ('waiting', 'resting') and queue.current_match_id is null
  for update of queue;
  if not found or (registration.snapshot_level <> match_row.level and registration.snapshot_level <> 'leveling') then
    raise exception 'reserve is ineligible' using errcode = '23514';
  end if;

  select code into category_code from public.competitive_categories where id = match_row.category_id;
  select gender into athlete_gender from public.athletes where id = target_athlete;
  if (category_code = 'female' and athlete_gender <> 'female')
    or (category_code = 'male' and athlete_gender <> 'male') then
    raise exception 'reserve violates category' using errcode = '23514';
  end if;
  if target_roster is not null and not exists (
    select 1 from public.team_roster_members member
    where member.roster_id = target_roster and member.athlete_id = target_athlete and member.status = 'active'
  ) then
    raise exception 'reserve does not belong to official roster' using errcode = '23514';
  end if;

  select coalesce(min(position), 5)::smallint into next_position
  from generate_series(5, 7) position
  where not exists (
    select 1 from public.match_squad_members member
    where member.side_id = target_side and member.position_order = position
      and member.status not in ('withdrawn', 'unavailable')
  );

  insert into public.match_squad_members(
    match_id, side_id, athlete_id, registration_id, roster_id,
    initial_squad_role, squad_role, status, reserve_presence_status,
    position_order, called_at, last_operation_id, created_by
  ) values (
    target_match, target_side, target_athlete, registration.id, target_roster,
    'reserve', 'reserve', 'called', 'expected', next_position, now(), operation_id, actor
  ) returning * into result;

  update public.match_queue_entries
  set status = 'assigned', current_match_id = target_match, updated_at = now()
  where registration_id = registration.id;
  return result;
end;
$$;

revoke all on function private.add_match_reserve(uuid,uuid,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function private.add_match_reserve(uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.add_match_reserve(
  target_match uuid,
  target_side uuid,
  target_athlete uuid,
  target_roster uuid default null,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.add_match_reserve(target_match, target_side, target_athlete, target_roster, operation_id, auth.uid()) $$;

revoke all on function public.add_match_reserve(uuid,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.add_match_reserve(uuid,uuid,uuid,uuid,uuid) to authenticated;

create or replace function private.remove_match_reserve(
  target_member uuid,
  disposition text,
  reason text,
  operation_id uuid
)
returns public.match_squad_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.match_squad_members;
  match_row public.matches;
begin
  select * into member from public.match_squad_members where id = target_member for update;
  select * into match_row from public.matches where id = member.match_id for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'squad operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') or member.squad_role <> 'reserve' then
    raise exception 'reserve cannot be removed' using errcode = '23514';
  end if;
  if disposition not in ('waiting', 'withdrawn') or coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'invalid reserve removal' using errcode = '23514';
  end if;
  update public.match_squad_members
  set status = 'withdrawn', withdrawn_at = now(), last_change_reason = reason, last_operation_id = operation_id
  where id = member.id returning * into member;
  update public.match_queue_entries
  set status = case when disposition = 'waiting' then 'waiting'::public.match_queue_status else 'unavailable'::public.match_queue_status end,
      current_match_id = null,
      queued_at = case when disposition = 'waiting' then now() else queued_at end,
      updated_at = now()
  where registration_id = member.registration_id;
  return member;
end;
$$;

revoke all on function private.remove_match_reserve(uuid,text,text,uuid) from public, anon;
grant execute on function private.remove_match_reserve(uuid,text,text,uuid) to authenticated;

create or replace function public.remove_match_reserve(
  target_member uuid,
  disposition text,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_squad_members
language sql
security invoker
set search_path = ''
as $$ select private.remove_match_reserve(target_member, disposition, reason, operation_id) $$;

revoke all on function public.remove_match_reserve(uuid,text,text,uuid) from public, anon;
grant execute on function public.remove_match_reserve(uuid,text,text,uuid) to authenticated;

create or replace function private.promote_match_reserve(
  target_reserve uuid,
  target_participant uuid,
  outgoing_disposition text,
  reason text,
  operation_id uuid
)
returns public.match_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserve_member public.match_squad_members;
  outgoing_participant public.match_participants;
  outgoing_member public.match_squad_members;
  match_row public.matches;
  registration public.ur_play_registrations;
  category_code text;
  required_gender_count integer;
  result public.match_participants;
begin
  select * into reserve_member from public.match_squad_members where id = target_reserve for update;
  select * into outgoing_participant from public.match_participants where id = target_participant for update;
  select * into match_row from public.matches where id = reserve_member.match_id for update;
  select * into outgoing_member from public.match_squad_members
    where match_id = match_row.id and athlete_id = outgoing_participant.athlete_id for update;

  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'squad operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then raise exception 'match squad is frozen' using errcode = '23514'; end if;
  if reserve_member.match_id <> outgoing_participant.match_id or reserve_member.side_id <> outgoing_participant.side_id then
    raise exception 'reserve and starter must share a side' using errcode = '23514';
  end if;
  if reserve_member.squad_role <> 'reserve' or reserve_member.reserve_presence_status <> 'present'
    or reserve_member.status not in ('confirmed', 'bench') then
    raise exception 'present reserve required' using errcode = '23514';
  end if;
  if outgoing_disposition not in ('bench', 'waiting', 'withdrawn') or coalesce(char_length(trim(reason)), 0) < 5 then
    raise exception 'invalid substitution disposition' using errcode = '23514';
  end if;

  select * into registration from public.ur_play_registrations where id = reserve_member.registration_id;
  set constraints match_squad_position_unique deferred;
  update public.match_squad_members
  set squad_role = case when id = reserve_member.id then 'starter'::public.match_squad_role else 'reserve'::public.match_squad_role end,
      status = case
        when id = reserve_member.id then 'active'::public.match_squad_status
        when outgoing_disposition = 'bench' then 'bench'::public.match_squad_status
        when outgoing_disposition = 'withdrawn' then 'withdrawn'::public.match_squad_status
        else 'withdrawn'::public.match_squad_status
      end,
      position_order = case when id = reserve_member.id then outgoing_member.position_order else reserve_member.position_order end,
      activated_at = case when id = reserve_member.id then now() else activated_at end,
      benched_at = case when id = outgoing_member.id and outgoing_disposition = 'bench' then now() else benched_at end,
      withdrawn_at = case when id = outgoing_member.id and outgoing_disposition <> 'bench' then now() else withdrawn_at end,
      reserve_presence_status = case
        when id = reserve_member.id then reserve_presence_status
        when id = outgoing_member.id and outgoing_disposition = 'bench' then 'present'::public.reserve_presence_status
        else reserve_presence_status
      end,
      last_change_reason = reason,
      last_operation_id = operation_id
  where id in (reserve_member.id, outgoing_member.id);

  update public.match_participants
  set athlete_id = reserve_member.athlete_id,
      registration_id = reserve_member.registration_id,
      team_snapshot_id = registration.snapshot_team_id,
      pole_snapshot_id = registration.snapshot_team_pole_id,
      level_snapshot = registration.snapshot_level
  where id = outgoing_participant.id
  returning * into result;

  select code into category_code from public.competitive_categories where id = match_row.category_id;
  if category_code = 'mixed' then
    select case format.code when 'doubles' then 1 when 'fours' then 2 else 0 end
    into required_gender_count
    from public.competitive_formats format where format.id = match_row.format_id;
    if exists (
      select 1 from public.match_sides side
      where side.match_id = match_row.id and (
        (select count(*) from public.match_participants participant join public.athletes athlete on athlete.id = participant.athlete_id
          where participant.side_id = side.id and participant.status = 'active' and athlete.gender = 'female') <> required_gender_count
        or
        (select count(*) from public.match_participants participant join public.athletes athlete on athlete.id = participant.athlete_id
          where participant.side_id = side.id and participant.status = 'active' and athlete.gender = 'male') <> required_gender_count
      )
    ) then
      raise exception 'substitution violates mixed composition' using errcode = '23514';
    end if;
  end if;

  update public.match_queue_entries
  set status = case
        when outgoing_disposition = 'bench' then 'assigned'::public.match_queue_status
        when outgoing_disposition = 'waiting' then 'waiting'::public.match_queue_status
        else 'unavailable'::public.match_queue_status
      end,
      current_match_id = case when outgoing_disposition = 'bench' then match_row.id else null end,
      queued_at = case when outgoing_disposition = 'waiting' then now() else queued_at end,
      updated_at = now()
  where registration_id = outgoing_member.registration_id;
  update public.match_queue_entries
  set status = 'assigned', current_match_id = match_row.id, updated_at = now()
  where registration_id = reserve_member.registration_id;
  return result;
end;
$$;

revoke all on function private.promote_match_reserve(uuid,uuid,text,text,uuid) from public, anon;
grant execute on function private.promote_match_reserve(uuid,uuid,text,text,uuid) to authenticated;

create or replace function public.promote_match_reserve(
  target_reserve uuid,
  target_participant uuid,
  outgoing_disposition text,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.match_participants
language sql
security invoker
set search_path = ''
as $$ select private.promote_match_reserve(target_reserve, target_participant, outgoing_disposition, reason, operation_id) $$;

revoke all on function public.promote_match_reserve(uuid,uuid,text,text,uuid) from public, anon;
grant execute on function public.promote_match_reserve(uuid,uuid,text,text,uuid) to authenticated;

create or replace function private.change_match_court(
  target_match uuid,
  target_court uuid,
  reason text,
  operation_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
begin
  if exists (select 1 from public.match_court_changes where client_operation_id = operation_id) then
    select match.* into match_row
    from public.match_court_changes change
    join public.matches match on match.id = change.match_id
    where change.client_operation_id = operation_id;
    return match_row;
  end if;
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'court operation denied' using errcode = '42501'; end if;
  if match_row.status not in ('draft', 'queued', 'called', 'ready') then raise exception 'court is frozen after match start' using errcode = '23514'; end if;
  if match_row.court_id = target_court then return match_row; end if;
  if coalesce(char_length(trim(reason)), 0) < 5 then raise exception 'court change reason required' using errcode = '23514'; end if;
  if not exists (
    select 1 from public.ur_play_session_courts
    where session_id = match_row.session_id and court_id = target_court and status = 'active'
  ) then raise exception 'court does not belong to active session courts' using errcode = '23514'; end if;

  insert into public.match_court_changes(match_id, from_court_id, to_court_id, changed_by, reason, client_operation_id)
  values(match_row.id, match_row.court_id, target_court, auth.uid(), reason, operation_id);
  update public.matches set court_id = target_court, updated_at = now() where id = match_row.id returning * into match_row;
  return match_row;
end;
$$;

revoke all on function private.change_match_court(uuid,uuid,text,uuid) from public, anon;
grant execute on function private.change_match_court(uuid,uuid,text,uuid) to authenticated;

create or replace function public.change_match_court(
  target_match uuid,
  target_court uuid,
  reason text,
  operation_id uuid default gen_random_uuid()
)
returns public.matches
language sql
security invoker
set search_path = ''
as $$ select private.change_match_court(target_match, target_court, reason, operation_id) $$;

revoke all on function public.change_match_court(uuid,uuid,text,uuid) from public, anon;
grant execute on function public.change_match_court(uuid,uuid,text,uuid) to authenticated;

create or replace function private.transition_court_ops_match(
  target_match uuid,
  target_status public.match_status,
  reason text,
  operation_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches;
  expected integer;
  actual integer;
  has_squad boolean;
begin
  select * into match_row from public.matches where id = target_match for update;
  if not private.operates_ur_play_session(match_row.session_id) then raise exception 'match operation denied' using errcode = '42501'; end if;
  if target_status = match_row.status then return match_row; end if;
  if target_status = 'cancelled' and match_row.status in ('draft', 'queued', 'called', 'ready') then null;
  elsif target_status = 'abandoned' and match_row.status = 'in_progress' then null;
  elsif not (
    (match_row.status = 'queued' and target_status = 'called')
    or (match_row.status = 'called' and target_status = 'ready')
    or (match_row.status = 'ready' and target_status = 'in_progress')
  ) then raise exception 'invalid match transition' using errcode = '23514';
  end if;

  select case format.code when 'doubles' then 4 when 'fours' then 8 else 0 end into expected
  from public.competitive_formats format where format.id = match_row.format_id;
  select count(*) into actual from public.match_participants where match_id = match_row.id and status = 'active';
  select exists(select 1 from public.match_squad_members where match_id = match_row.id) into has_squad;

  if target_status = 'in_progress' then
    if actual <> expected then raise exception 'incomplete match roster' using errcode = '23514'; end if;
    if has_squad and (
      select count(*) from public.match_squad_members
      where match_id = match_row.id and squad_role = 'starter' and status in ('called', 'confirmed', 'active')
    ) <> expected then raise exception 'exact active squad required' using errcode = '23514'; end if;
    if exists (
      select 1 from public.match_queue_entries queue
      join public.match_participants participant on participant.athlete_id = queue.athlete_id and participant.match_id = match_row.id
      where queue.current_match_id <> match_row.id or queue.status <> 'assigned'
    ) then raise exception 'participant unavailable at start' using errcode = '23514'; end if;
    update public.match_queue_entries queue set status = 'playing', updated_at = now()
    from public.match_participants participant
    where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id;
  end if;

  if has_squad and target_status in ('called', 'ready', 'in_progress') then
    update public.match_squad_members
    set status = case
          when squad_role = 'reserve' then
            case when reserve_presence_status = 'present' then 'bench'::public.match_squad_status else status end
          when target_status = 'called' then 'called'::public.match_squad_status
          when target_status = 'ready' then 'confirmed'::public.match_squad_status
          else 'active'::public.match_squad_status
        end,
        called_at = case when target_status = 'called' then now() else called_at end,
        confirmed_at = case when target_status = 'ready' and squad_role = 'starter' then now() else confirmed_at end,
        activated_at = case when target_status = 'in_progress' and squad_role = 'starter' then now() else activated_at end,
        last_operation_id = operation_id
    where match_id = match_row.id and status not in ('withdrawn', 'unavailable');
  end if;

  update public.matches
  set status = target_status,
      called_at = case when target_status = 'called' then now() else called_at end,
      ready_at = case when target_status = 'ready' then now() else ready_at end,
      started_at = case when target_status = 'in_progress' then now() else started_at end,
      ready_for_scoring = target_status = 'in_progress',
      cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
      cancellation_reason = case when target_status in ('cancelled', 'abandoned') then reason else cancellation_reason end,
      ended_at = case when target_status = 'abandoned' then now() else ended_at end,
      updated_at = now()
  where id = match_row.id returning * into match_row;

  if target_status in ('cancelled', 'abandoned') then
    update public.match_queue_entries queue
    set status = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then 'resting'::public.match_queue_status
          else 'waiting'::public.match_queue_status
        end,
        current_match_id = null,
        last_match_ended_at = case
          when target_status = 'abandoned' and exists (
            select 1 from public.match_participants participant
            where participant.match_id = match_row.id and participant.athlete_id = queue.athlete_id
          ) then now() else last_match_ended_at end,
        queued_at = now(), updated_at = now()
    where queue.current_match_id = match_row.id;
  end if;
  return match_row;
end;
$$;

create or replace function private.can_read_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches match
    where match.id = target_match and (
      private.can_view_court_ops_session(match.session_id)
      or exists (
        select 1 from public.match_participants participant
        where participant.match_id = match.id and participant.athlete_id = private.current_athlete_id()
      )
      or exists (
        select 1 from public.match_squad_members squad
        where squad.match_id = match.id and squad.athlete_id = private.current_athlete_id()
      )
      or exists (
        select 1
        from public.match_squad_members squad
        join public.team_memberships membership on membership.athlete_id = squad.athlete_id and membership.status = 'active'
        where squad.match_id = match.id and private.manages_team(membership.team_id)
      )
    )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;
grant execute on function private.can_read_match(uuid) to authenticated;

alter table public.match_squad_members enable row level security;
alter table public.match_squad_members force row level security;
alter table public.match_court_changes enable row level security;
alter table public.match_court_changes force row level security;

create policy match_squad_read
on public.match_squad_members
for select
to authenticated
using (private.can_read_match(match_id));

create policy match_court_changes_read
on public.match_court_changes
for select
to authenticated
using (private.can_read_match(match_id));

create trigger match_squad_audit
after insert or update or delete on public.match_squad_members
for each row execute function private.capture_audit_log();

create trigger match_court_changes_audit
after insert or update or delete on public.match_court_changes
for each row execute function private.capture_audit_log();

grant select on public.match_squad_members, public.match_court_changes to authenticated;
grant all on public.match_squad_members, public.match_court_changes to service_role;
