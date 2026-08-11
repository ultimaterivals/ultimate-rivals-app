-- C39 mutations must write through audited RPCs without granting direct table writes.
-- All four functions already use fully-qualified references and a fixed empty search_path,
-- validate auth/role/session access, and block mutation after the 360 close.

alter function public.refresh_ur_play_development_cases(uuid) security definer;
alter function public.resolve_ur_play_development_case(uuid,text,text) security definer;
alter function public.waive_ur_play_development_case(uuid,text) security definer;
alter function public.reopen_ur_play_development_case(uuid,text) security definer;

revoke all on table public.ur_play_development_cases from public, anon;
grant select on table public.ur_play_development_cases to authenticated, service_role;

revoke all on function public.refresh_ur_play_development_cases(uuid) from public, anon;
revoke all on function public.resolve_ur_play_development_case(uuid,text,text) from public, anon;
revoke all on function public.waive_ur_play_development_case(uuid,text) from public, anon;
revoke all on function public.reopen_ur_play_development_case(uuid,text) from public, anon;

grant execute on function public.refresh_ur_play_development_cases(uuid) to authenticated, service_role;
grant execute on function public.resolve_ur_play_development_case(uuid,text,text) to authenticated, service_role;
grant execute on function public.waive_ur_play_development_case(uuid,text) to authenticated, service_role;
grant execute on function public.reopen_ur_play_development_case(uuid,text) to authenticated, service_role;