create or replace function private.admin_revoke_athlete_access_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_invite public.athlete_access_invites%rowtype;
begin
  v_actor := private.require_admin_actor();
  select * into v_invite from public.athlete_access_invites where id=p_invite_id for update;
  if not found then raise exception 'INVITE_NOT_FOUND'; end if;
  if v_invite.used_at is not null then raise exception 'INVITE_ALREADY_USED'; end if;
  if v_invite.revoked_at is null then
    update public.athlete_access_invites set revoked_at=now() where id=p_invite_id;
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
    values(v_actor,'athlete_access_invite.revoked','athlete_access_invite',p_invite_id,
      jsonb_build_object('athlete_id',v_invite.athlete_id,'revoked_at',now()),
      jsonb_build_object('source','admin_athlete_access'));
  end if;
end;
$$;

create or replace function public.admin_revoke_athlete_access_invite(p_invite_id uuid)
returns void
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_revoke_athlete_access_invite(p_invite_id); $$;

revoke all on function public.admin_revoke_athlete_access_invite(uuid) from public,anon;
grant execute on function public.admin_revoke_athlete_access_invite(uuid) to authenticated;