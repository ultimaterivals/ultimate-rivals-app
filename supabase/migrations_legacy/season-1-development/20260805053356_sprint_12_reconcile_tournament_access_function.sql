create or replace function private.can_read_tournament(target_tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1
      from public.tournaments t
      where t.id = target_tournament
        and t.status <> 'draft'
        and (
          private.manages_pole(t.pole_id)
          or private.has_any_role(array['athlete','team_manager','pole_manager']::public.app_role[])
        )
    );
$$;

revoke all on function private.can_read_tournament(uuid) from public;
