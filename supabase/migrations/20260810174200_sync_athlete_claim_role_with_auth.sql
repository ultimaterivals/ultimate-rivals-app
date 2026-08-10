create or replace function private.claim_athlete_access(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private','auth'
as $$
declare
  v_profile_id uuid := auth.uid();
  v_hash text := lower(trim(p_token_hash));
  v_invite public.athlete_access_invites%rowtype;
  v_athlete public.athletes%rowtype;
  v_existing_athlete uuid;
  v_profile public.profiles%rowtype;
begin
  if v_profile_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INVITE_TOKEN'; end if;

  select * into v_profile from public.profiles where id=v_profile_id for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if v_profile.status <> 'active' then raise exception 'PROFILE_NOT_ACTIVE'; end if;
  if v_profile.role not in ('public'::app_role,'athlete'::app_role) then
    raise exception 'PROFILE_ROLE_NOT_CLAIMABLE';
  end if;

  select * into v_invite from public.athlete_access_invites where token_hash=v_hash for update;
  if not found then raise exception 'INVITE_NOT_FOUND'; end if;
  if v_invite.used_at is not null then
    if v_invite.claimed_profile_id=v_profile_id then
      update public.profiles set role='athlete'::app_role,updated_at=now() where id=v_profile_id and role<>'athlete'::app_role;
      update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role','athlete') where id=v_profile_id;
      return v_invite.athlete_id;
    end if;
    raise exception 'INVITE_ALREADY_USED';
  end if;
  if v_invite.revoked_at is not null then raise exception 'INVITE_REVOKED'; end if;
  if v_invite.expires_at<=now() then raise exception 'INVITE_EXPIRED'; end if;

  select * into v_athlete from public.athletes where id=v_invite.athlete_id for update;
  if not found then raise exception 'ATHLETE_NOT_FOUND'; end if;
  if v_athlete.status<>'active' then raise exception 'ATHLETE_NOT_ACTIVE'; end if;

  select id into v_existing_athlete from public.athletes
  where profile_id=v_profile_id and id<>v_athlete.id limit 1;
  if v_existing_athlete is not null then raise exception 'PROFILE_ALREADY_LINKED_TO_ATHLETE'; end if;
  if v_athlete.profile_id is not null and v_athlete.profile_id<>v_profile_id then raise exception 'ATHLETE_ALREADY_LINKED'; end if;

  update public.athletes set profile_id=v_profile_id where id=v_athlete.id;
  update public.profiles set role='athlete'::app_role,updated_at=now() where id=v_profile_id;
  update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role','athlete') where id=v_profile_id;
  update public.athlete_access_invites set used_at=now(),claimed_profile_id=v_profile_id where id=v_invite.id;
  update public.athlete_access_invites set revoked_at=coalesce(revoked_at,now())
  where athlete_id=v_athlete.id and id<>v_invite.id and used_at is null;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_profile_id,'athlete_access_invite.claimed','athlete',v_athlete.id,
    jsonb_build_object('profile_id',v_profile_id,'invite_id',v_invite.id,'role','athlete'),
    jsonb_build_object('source','athlete_first_access'));
  return v_athlete.id;
end;
$$;