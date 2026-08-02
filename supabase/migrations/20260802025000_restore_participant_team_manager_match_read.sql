create or replace function private.can_read_match(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches match
    where match.id = target_match
      and (
        private.can_view_court_ops_session(match.session_id)
        or exists (
          select 1
          from public.match_participants participant
          where participant.match_id = match.id
            and participant.athlete_id = private.current_athlete_id()
        )
        or exists (
          select 1
          from public.match_squad_members squad
          where squad.match_id = match.id
            and squad.athlete_id = private.current_athlete_id()
        )
        or exists (
          select 1
          from public.match_participants participant
          join public.team_memberships membership
            on membership.athlete_id = participant.athlete_id
           and membership.status = 'active'
          where participant.match_id = match.id
            and private.manages_team(membership.team_id)
        )
        or exists (
          select 1
          from public.match_squad_members squad
          join public.team_memberships membership
            on membership.athlete_id = squad.athlete_id
           and membership.status = 'active'
          where squad.match_id = match.id
            and private.manages_team(membership.team_id)
        )
      )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;
grant execute on function private.can_read_match(uuid) to authenticated;
