-- A team membership begins only after the invited athlete accepts it.
-- Existing memberships remain historical facts; this migration does not infer consent for them.
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  responded_at timestamptz,
  constraint team_invitation_response_consistency check (
    (status in ('accepted', 'declined') and responded_at is not null)
    or (status not in ('accepted', 'declined') and responded_at is null)
  ),
  constraint team_invitation_expiration_after_creation check (expires_at > created_at)
);

create unique index team_invitations_one_pending_team_idx
on public.team_invitations (athlete_id, team_id, season_id)
where status = 'pending';

create index team_invitations_athlete_status_idx
on public.team_invitations (athlete_id, status, created_at desc);

alter table public.team_invitations enable row level security;
alter table public.team_invitations force row level security;

revoke all on public.team_invitations from public, anon, authenticated;
grant select on public.team_invitations to authenticated;

create policy team_invitations_read on public.team_invitations
for select to authenticated
using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin']::public.app_role[]))
  or (select private.manages_team(team_id))
);

create policy teams_invited_athlete_read on public.teams
for select to authenticated
using (
  exists (
    select 1 from public.team_invitations invitation
    where invitation.team_id = teams.id
      and invitation.athlete_id = (select private.current_athlete_id())
      and invitation.status = 'pending'
      and invitation.expires_at > now()
  )
);

-- The Data API must not create memberships directly, even for an admin or team manager.
-- Privileged maintenance can still use a reviewed SQL operation; the app uses the RPC below.
revoke insert, update, delete on public.team_memberships from authenticated;
drop policy if exists memberships_admin_all on public.team_memberships;
drop policy if exists memberships_team_manager_insert on public.team_memberships;
drop policy if exists memberships_team_manager_update on public.team_memberships;

create or replace function public.admin_invite_athlete_to_team(
  p_athlete_id uuid,
  p_team_id uuid,
  p_season_id uuid
)
returns public.team_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.team_invitations;
  v_season public.seasons;
begin
  if auth.uid() is null
    or not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team invitation required' using errcode = '42501';
  end if;

  select * into v_season from public.seasons
  where id = p_season_id and status = 'active'
  for share;
  if not found or now() < v_season.starts_at or now() >= v_season.ends_at then
    raise exception 'active season required' using errcode = '23514';
  end if;

  perform 1 from public.teams
  where id = p_team_id and status = 'active'
  for share;
  if not found then
    raise exception 'active team required' using errcode = '23514';
  end if;

  perform 1 from public.athletes
  where id = p_athlete_id and status = 'active' and profile_id is not null
  for share;
  if not found then
    raise exception 'linked active athlete required' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.team_memberships m
    where m.athlete_id = p_athlete_id
      and m.season_id = p_season_id
      and m.status = 'active'
      and m.starts_at <= now()
      and (m.ends_at is null or m.ends_at > now())
  ) then
    raise exception 'athlete already belongs to a team this season'
      using errcode = '23514';
  end if;

  update public.team_invitations
  set status = 'expired'
  where athlete_id = p_athlete_id
    and team_id = p_team_id
    and season_id = p_season_id
    and status = 'pending'
    and expires_at <= now();

  select * into v_invitation from public.team_invitations
  where athlete_id = p_athlete_id
    and team_id = p_team_id
    and season_id = p_season_id
    and status = 'pending'
  for update;
  if found then return v_invitation; end if;

  insert into public.team_invitations (
    athlete_id, team_id, season_id, expires_at, created_by
  ) values (
    p_athlete_id, p_team_id, p_season_id,
    least(now() + interval '14 days', v_season.ends_at), auth.uid()
  ) returning * into v_invitation;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, after_data
  ) values (
    auth.uid(), 'team_invitation_created', 'team_invitation',
    v_invitation.id, to_jsonb(v_invitation)
  );

  return v_invitation;
end;
$$;

revoke all on function public.admin_invite_athlete_to_team(uuid, uuid, uuid)
from public, anon;
grant execute on function public.admin_invite_athlete_to_team(uuid, uuid, uuid)
to authenticated;

create or replace function public.athlete_respond_to_team_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns public.team_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.team_invitations;
  v_before jsonb;
begin
  if auth.uid() is null or private.current_athlete_id() is null then
    raise exception 'athlete authentication required' using errcode = '42501';
  end if;

  select * into v_invitation from public.team_invitations
  where id = p_invitation_id
    and athlete_id = private.current_athlete_id()
  for update;
  if not found then
    raise exception 'invitation not found' using errcode = '42501';
  end if;
  if v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then
    raise exception 'invitation is no longer available' using errcode = '23514';
  end if;

  v_before := to_jsonb(v_invitation);

  if p_accept then
    perform 1 from public.seasons
    where id = v_invitation.season_id
      and status = 'active'
      and starts_at <= now() and ends_at > now()
    for share;
    if not found then
      raise exception 'invitation season is no longer active' using errcode = '23514';
    end if;

    perform 1 from public.teams
    where id = v_invitation.team_id and status = 'active'
    for share;
    if not found then
      raise exception 'invitation team is no longer active' using errcode = '23514';
    end if;

    insert into public.team_memberships (
      athlete_id, team_id, season_id, membership_type,
      starts_at, status, created_by
    ) values (
      v_invitation.athlete_id, v_invitation.team_id,
      v_invitation.season_id, 'athlete', now(), 'active', auth.uid()
    );
  end if;

  update public.team_invitations
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = v_invitation.id
  returning * into v_invitation;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    auth.uid(), 'team_invitation_responded', 'team_invitation',
    v_invitation.id, v_before, to_jsonb(v_invitation)
  );

  return v_invitation;
end;
$$;

revoke all on function public.athlete_respond_to_team_invitation(uuid, boolean)
from public, anon;
grant execute on function public.athlete_respond_to_team_invitation(uuid, boolean)
to authenticated;
