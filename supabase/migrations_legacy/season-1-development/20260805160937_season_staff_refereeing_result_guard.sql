-- Season 1 completion — protect homologated match results from non-admin direct edits.

create or replace function private.prevent_non_admin_homologated_result_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and old.result_status = 'homologated'
    and not private.has_any_role(array['admin']::public.app_role[])
  then
    raise exception 'homologated result changes require admin role' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_non_admin_homologated_result_change() from public, anon, authenticated;

drop trigger if exists protect_homologated_match_results on public.match_results;
create trigger protect_homologated_match_results
before update or delete on public.match_results
for each row execute function private.prevent_non_admin_homologated_result_change();
