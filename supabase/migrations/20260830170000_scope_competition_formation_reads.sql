-- Restore the minimum Data API privilege required by the existing Command and
-- Athlete App readers. Existing RLS policies continue to limit every visible
-- row; the formation tables receive their scoped policies below.

grant select on table
  public.athlete_activation_wave_members,
  public.athlete_activation_waves,
  public.athlete_import_batches,
  public.athlete_import_rows,
  public.competition_formation_members,
  public.competition_formations,
  public.season_weeks,
  public.ur_play_session_preflight_checks
to authenticated;

drop policy if exists competition_formations_scoped_select
on public.competition_formations;

create policy competition_formations_scoped_select
on public.competition_formations
for select
to authenticated
using (
  (select private.has_any_role(array['admin']::public.app_role[]))
  or (
    team_id is not null
    and (select private.manages_team(team_id))
  )
  or (
    pole_id is not null
    and (select private.manages_pole(pole_id))
  )
  or exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = competition_formations.team_id
      and tm.athlete_id = (select private.current_athlete_id())
      and tm.season_id is not distinct from competition_formations.season_id
      and tm.status = 'active'
      and tm.starts_at <= now()
      and (tm.ends_at is null or tm.ends_at > now())
  )
);

drop policy if exists competition_formation_members_scoped_select
on public.competition_formation_members;

create policy competition_formation_members_scoped_select
on public.competition_formation_members
for select
to authenticated
using (
  (select private.has_any_role(array['admin']::public.app_role[]))
  or exists (
    select 1
    from public.competition_formations cf
    where cf.id = competition_formation_members.formation_id
      and (
        (
          cf.team_id is not null
          and (select private.manages_team(cf.team_id))
        )
        or (
          cf.pole_id is not null
          and (select private.manages_pole(cf.pole_id))
        )
        or exists (
          select 1
          from public.team_memberships tm
          where tm.team_id = cf.team_id
            and tm.athlete_id = (select private.current_athlete_id())
            and tm.season_id is not distinct from cf.season_id
            and tm.status = 'active'
            and tm.starts_at <= now()
            and (tm.ends_at is null or tm.ends_at > now())
        )
      )
  )
);

-- Preserve the canonical write boundary. Mutations continue through audited
-- backend functions rather than direct client writes.
revoke insert, update, delete on table
  public.athlete_activation_wave_members,
  public.athlete_activation_waves,
  public.athlete_import_batches,
  public.athlete_import_rows,
  public.competition_formation_members,
  public.competition_formations,
  public.season_weeks,
  public.ur_play_session_preflight_checks
from anon, authenticated;
