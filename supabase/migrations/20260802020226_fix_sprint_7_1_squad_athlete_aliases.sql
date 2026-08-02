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
  select match.* into result from public.matches match where match.client_operation_id = operation_id;
  if found then return result; end if;

  select format.code into format_code
  from public.competitive_formats format
  where format.id = target_format and format.status = 'active';
  select category.code into category_code
  from public.competitive_categories category
  where category.id = target_category and category.status = 'active';

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
  if (
    select count(distinct selected.athlete_id)
    from unnest(all_squad) as selected(athlete_id)
  ) <> cardinality(all_squad) then
    raise exception 'duplicate squad athlete' using errcode = '23505';
  end if;

  select count(*) into invalid_count
  from unnest(reserve_ids) as selected(athlete_id)
  left join public.match_queue_entries queue
    on queue.session_id = target_session and queue.athlete_id = selected.athlete_id
  left join public.ur_play_registrations registration on registration.id = queue.registration_id
  left join public.athletes athlete on athlete.id = selected.athlete_id
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
    select 1
    from public.team_rosters roster
    where roster.id = side_a_roster
      and roster.status = 'active'
      and roster.format_id = target_format
      and roster.category_id = target_category
      and roster.level = target_level
      and not exists (
        select 1
        from unnest(side_a || coalesce(side_a_reserves, array[]::uuid[])) as selected(athlete_id)
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id
            and member.athlete_id = selected.athlete_id
            and member.status = 'active'
        )
      )
  ) then
    raise exception 'side A does not match active official roster' using errcode = '23514';
  end if;

  if side_b_roster is not null and not exists (
    select 1
    from public.team_rosters roster
    where roster.id = side_b_roster
      and roster.status = 'active'
      and roster.format_id = target_format
      and roster.category_id = target_category
      and roster.level = target_level
      and not exists (
        select 1
        from unnest(side_b || coalesce(side_b_reserves, array[]::uuid[])) as selected(athlete_id)
        where not exists (
          select 1 from public.team_roster_members member
          where member.roster_id = roster.id
            and member.athlete_id = selected.athlete_id
            and member.status = 'active'
        )
      )
  ) then
    raise exception 'side B does not match active official roster' using errcode = '23514';
  end if;

  perform 1
  from public.match_queue_entries queue
  where queue.session_id = target_session and queue.athlete_id = any(all_squad)
  order by queue.athlete_id
  for update;

  result := private.create_court_ops_match(
    target_session, target_court, target_format, target_category, target_level,
    side_a, side_b, operation_id, actor
  );

  select side.id into side_a_id
  from public.match_sides side where side.match_id = result.id and side.side = 'A';
  select side.id into side_b_id
  from public.match_sides side where side.match_id = result.id and side.side = 'B';

  update public.match_sides side
  set roster_id = case when side.side = 'A' then side_a_roster else side_b_roster end,
      team_id = case
        when side.side = 'A' then (select roster.team_id from public.team_rosters roster where roster.id = side_a_roster)
        else (select roster.team_id from public.team_rosters roster where roster.id = side_b_roster)
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
    'reserve', 'reserve', 'called', 'expected', (reserve.ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_a_reserves, array[]::uuid[])) with ordinality as reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id
  union all
  select result.id, side_b_id, registration.athlete_id, registration.id, side_b_roster,
    'reserve', 'reserve', 'called', 'expected', (reserve.ordinality + 4)::smallint,
    now(), operation_id, actor
  from unnest(coalesce(side_b_reserves, array[]::uuid[])) with ordinality as reserve(athlete_id, ordinality)
  join public.ur_play_registrations registration
    on registration.session_id = target_session and registration.athlete_id = reserve.athlete_id;

  update public.match_queue_entries queue
  set status = 'assigned', current_match_id = result.id, updated_at = now()
  where queue.session_id = target_session and queue.athlete_id = any(reserve_ids);
  return result;
end;
$$;
