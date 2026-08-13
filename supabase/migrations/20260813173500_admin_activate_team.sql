create or replace function public.admin_activate_team(p_team_id uuid)
returns public.teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team activation required' using errcode = '42501';
  end if;

  select *
  into v_team
  from public.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception 'team not found' using errcode = 'P0002';
  end if;

  if v_team.status <> 'draft' then
    raise exception 'only draft teams can be activated' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.poles p
    where p.id = v_team.primary_pole_id
      and p.status <> 'archived'
  ) then
    raise exception 'team primary pole is not available' using errcode = '23503';
  end if;

  update public.teams
  set status = 'active'
  where id = p_team_id
  returning * into v_team;

  return v_team;
end;
$$;

revoke all on function public.admin_activate_team(uuid) from public;
revoke execute on function public.admin_activate_team(uuid) from anon;
grant execute on function public.admin_activate_team(uuid) to authenticated;
