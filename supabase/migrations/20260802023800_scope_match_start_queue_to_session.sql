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
      join public.match_participants participant
        on participant.athlete_id = queue.athlete_id
        and participant.match_id = match_row.id
      where queue.session_id = match_row.session_id
        and (queue.current_match_id <> match_row.id or queue.status <> 'assigned')
    ) then raise exception 'participant unavailable at start' using errcode = '23514'; end if;
    update public.match_queue_entries queue set status = 'playing', updated_at = now()
    from public.match_participants participant
    where participant.match_id = match_row.id
      and participant.athlete_id = queue.athlete_id
      and queue.session_id = match_row.session_id;
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
