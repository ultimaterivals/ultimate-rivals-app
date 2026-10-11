-- Keep privileged membership mutations outside the exposed Data API schema.
-- Public RPCs are invoker wrappers; private functions retain their own role/identity checks.
alter function public.admin_invite_athlete_to_team(uuid, uuid, uuid)
set schema private;

alter function public.athlete_respond_to_team_invitation(uuid, boolean)
set schema private;

revoke all on function private.admin_invite_athlete_to_team(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function private.admin_invite_athlete_to_team(uuid, uuid, uuid)
to authenticated;

revoke all on function private.athlete_respond_to_team_invitation(uuid, boolean)
from public, anon, authenticated;
grant execute on function private.athlete_respond_to_team_invitation(uuid, boolean)
to authenticated;

create function public.admin_invite_athlete_to_team(
  p_athlete_id uuid,
  p_team_id uuid,
  p_season_id uuid
)
returns public.team_invitations
language sql
security invoker
set search_path = ''
as $$
  select private.admin_invite_athlete_to_team(
    p_athlete_id, p_team_id, p_season_id
  )
$$;

create function public.athlete_respond_to_team_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns public.team_invitations
language sql
security invoker
set search_path = ''
as $$
  select private.athlete_respond_to_team_invitation(
    p_invitation_id, p_accept
  )
$$;

revoke all on function public.admin_invite_athlete_to_team(uuid, uuid, uuid)
from public, anon;
grant execute on function public.admin_invite_athlete_to_team(uuid, uuid, uuid)
to authenticated;

revoke all on function public.athlete_respond_to_team_invitation(uuid, boolean)
from public, anon;
grant execute on function public.athlete_respond_to_team_invitation(uuid, boolean)
to authenticated;
