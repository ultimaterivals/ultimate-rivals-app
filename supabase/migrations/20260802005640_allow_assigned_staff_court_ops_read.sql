create or replace function private.can_view_court_ops_session(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.operates_ur_play_session(target_session)
    or exists (
      select 1
      from public.ur_play_session_staff staff
      where staff.session_id = target_session
        and staff.profile_id = auth.uid()
        and staff.role in ('evaluator', 'media')
        and staff.status = 'active'
        and staff.starts_at <= now()
        and (staff.ends_at is null or staff.ends_at > now())
    );
$$;

revoke all on function private.can_view_court_ops_session(uuid) from public, anon;
grant execute on function private.can_view_court_ops_session(uuid) to authenticated;

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
          from public.match_participants participant
          join public.team_memberships membership
            on membership.athlete_id = participant.athlete_id
           and membership.status = 'active'
          where participant.match_id = match.id
            and private.manages_team(membership.team_id)
        )
      )
  );
$$;

revoke all on function private.can_read_match(uuid) from public, anon;
grant execute on function private.can_read_match(uuid) to authenticated;

drop policy ur_sessions_read on public.ur_play_sessions;
create policy ur_sessions_read
on public.ur_play_sessions
for select
to authenticated
using (
  private.can_view_court_ops_session(id)
  or private.manages_pole(pole_id)
  or (
    private.has_any_role(array['athlete', 'team_manager']::public.app_role[])
    and status <> 'draft'
  )
);

drop policy ur_registrations_read on public.ur_play_registrations;
create policy ur_registrations_read
on public.ur_play_registrations
for select
to authenticated
using (
  private.can_view_court_ops_session(session_id)
  or athlete_id = private.current_athlete_id()
  or exists (
    select 1
    from public.team_memberships membership
    where membership.athlete_id = ur_play_registrations.athlete_id
      and membership.status = 'active'
      and private.manages_team(membership.team_id)
  )
);

drop policy match_queue_read on public.match_queue_entries;
create policy match_queue_read
on public.match_queue_entries
for select
to authenticated
using (
  private.can_view_court_ops_session(session_id)
  or athlete_id = private.current_athlete_id()
  or exists (
    select 1
    from public.team_memberships membership
    where membership.athlete_id = match_queue_entries.athlete_id
      and membership.status = 'active'
      and private.manages_team(membership.team_id)
  )
);
