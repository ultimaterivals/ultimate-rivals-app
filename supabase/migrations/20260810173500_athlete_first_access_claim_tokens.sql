create table if not exists public.athlete_access_invites (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  claimed_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint athlete_access_invites_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint athlete_access_invites_expiry_after_creation check (expires_at > created_at),
  constraint athlete_access_invites_claim_consistency check ((used_at is null and claimed_profile_id is null) or (used_at is not null and claimed_profile_id is not null))
);

create index if not exists athlete_access_invites_athlete_idx on public.athlete_access_invites(athlete_id,created_at desc);
create index if not exists athlete_access_invites_active_idx on public.athlete_access_invites(athlete_id,expires_at) where used_at is null and revoked_at is null;

alter table public.athlete_access_invites enable row level security;

drop policy if exists athlete_access_invites_admin_read on public.athlete_access_invites;
create policy athlete_access_invites_admin_read
on public.athlete_access_invites
for select
to authenticated
using (private.has_any_role(array['admin'::app_role]));

revoke all on public.athlete_access_invites from anon,authenticated;
grant select on public.athlete_access_invites to authenticated;

create or replace function private.admin_issue_athlete_access_invite(
  p_athlete_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_athlete public.athletes%rowtype;
  v_invite_id uuid;
  v_hash text := lower(trim(p_token_hash));
begin
  v_actor:=private.require_admin_actor();
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INVITE_TOKEN_HASH'; end if;
  if p_expires_at is null or p_expires_at<=now()+interval '5 minutes' or p_expires_at>now()+interval '30 days' then raise exception 'INVALID_INVITE_EXPIRY'; end if;

  select * into v_athlete from public.athletes where id=p_athlete_id for update;
  if not found then raise exception 'ATHLETE_NOT_FOUND'; end if;
  if v_athlete.status<>'active' then raise exception 'ATHLETE_NOT_ACTIVE'; end if;
  if v_athlete.profile_id is not null then raise exception 'ATHLETE_ALREADY_LINKED'; end if;

  update public.athlete_access_invites set revoked_at=now()
  where athlete_id=p_athlete_id and used_at is null and revoked_at is null;

  insert into public.athlete_access_invites(athlete_id,token_hash,expires_at,issued_by)
  values(p_athlete_id,v_hash,p_expires_at,v_actor)
  returning id into v_invite_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'athlete_access_invite.issued','athlete_access_invite',v_invite_id,
    jsonb_build_object('athlete_id',p_athlete_id,'expires_at',p_expires_at),
    jsonb_build_object('source','admin_athlete_access'));
  return v_invite_id;
end;
$$;

create or replace function private.claim_athlete_access(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_profile_id uuid := auth.uid();
  v_hash text := lower(trim(p_token_hash));
  v_invite public.athlete_access_invites%rowtype;
  v_athlete public.athletes%rowtype;
  v_existing_athlete uuid;
begin
  if v_profile_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INVITE_TOKEN'; end if;
  if not exists(select 1 from public.profiles where id=v_profile_id) then raise exception 'PROFILE_REQUIRED'; end if;

  select * into v_invite from public.athlete_access_invites where token_hash=v_hash for update;
  if not found then raise exception 'INVITE_NOT_FOUND'; end if;
  if v_invite.used_at is not null then
    if v_invite.claimed_profile_id=v_profile_id then return v_invite.athlete_id; end if;
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
  update public.athlete_access_invites set used_at=now(),claimed_profile_id=v_profile_id where id=v_invite.id;
  update public.athlete_access_invites set revoked_at=coalesce(revoked_at,now())
  where athlete_id=v_athlete.id and id<>v_invite.id and used_at is null;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_profile_id,'athlete_access_invite.claimed','athlete',v_athlete.id,
    jsonb_build_object('profile_id',v_profile_id,'invite_id',v_invite.id),
    jsonb_build_object('source','athlete_first_access'));
  return v_athlete.id;
end;
$$;

create or replace function public.admin_issue_athlete_access_invite(p_athlete_id uuid,p_token_hash text,p_expires_at timestamptz)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_issue_athlete_access_invite(p_athlete_id,p_token_hash,p_expires_at); $$;

create or replace function public.claim_athlete_access(p_token_hash text)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.claim_athlete_access(p_token_hash); $$;

revoke all on function public.admin_issue_athlete_access_invite(uuid,text,timestamptz) from public,anon;
revoke all on function public.claim_athlete_access(text) from public,anon;
grant execute on function public.admin_issue_athlete_access_invite(uuid,text,timestamptz) to authenticated;
grant execute on function public.claim_athlete_access(text) to authenticated;
