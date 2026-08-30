create or replace function public.admin_assign_command_function(
  target_function_id uuid,
  target_profile_id uuid,
  target_status public.command_assignment_status default 'active',
  target_allocation_percent smallint default 100,
  target_review_due_at date default null,
  target_mandate text default null
) returns public.command_function_assignments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.command_function_assignments;
  assignment_time timestamptz := clock_timestamp();
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_status not in ('planned', 'active', 'paused') then
    raise exception 'invalid assignment status' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_profile_id and status = 'active'
  ) then
    raise exception 'target profile is not active' using errcode = '23503';
  end if;
  if exists (
    select 1 from public.profiles
    where id = target_profile_id
      and status = 'active'
      and role = 'athlete'::public.app_role
  ) then
    raise exception 'target profile is not eligible for executive assignment'
      using errcode = '23514';
  end if;

  update public.command_function_assignments
  set status = 'ended',
      ends_at = greatest(assignment_time, starts_at + interval '1 microsecond')
  where function_id = target_function_id
    and status in ('planned', 'active', 'paused')
    and ends_at is null;

  insert into public.command_function_assignments(
    function_id, profile_id, status, starts_at, review_due_at,
    allocation_percent, mandate, assigned_by
  ) values (
    target_function_id, target_profile_id, target_status, assignment_time,
    target_review_due_at, target_allocation_percent,
    nullif(trim(target_mandate), ''), auth.uid()
  ) returning * into result;

  return result;
end;
$$;

revoke all on function public.admin_assign_command_function(
  uuid, uuid, public.command_assignment_status, smallint, date, text
) from public, anon;
grant execute on function public.admin_assign_command_function(
  uuid, uuid, public.command_assignment_status, smallint, date, text
) to authenticated;
