create index athletes_profile_id_idx on public.athletes(profile_id) where profile_id is not null;
create index venues_pole_id_idx on public.venues(pole_id);
create index courts_venue_id_idx on public.courts(venue_id);
create index teams_primary_pole_id_idx on public.teams(primary_pole_id);
create index access_assignments_profile_status_idx on public.access_assignments(profile_id, status, starts_at, ends_at);
create index access_assignments_pole_idx on public.access_assignments(pole_id) where pole_id is not null;
create index access_assignments_team_idx on public.access_assignments(team_id) where team_id is not null;
create index team_memberships_athlete_season_status_idx on public.team_memberships(athlete_id, season_id, status);
create index team_memberships_team_season_status_idx on public.team_memberships(team_id, season_id, status);
create index athlete_levels_athlete_season_idx on public.athlete_levels(athlete_id, season_id, starts_at desc);
create index team_rosters_team_season_idx on public.team_rosters(team_id, season_id, status);
create index team_roster_members_roster_idx on public.team_roster_members(roster_id, status);
create index team_roster_members_athlete_idx on public.team_roster_members(athlete_id, status);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select, insert, update, delete on public.profiles, public.athletes, public.seasons,
  public.poles, public.venues, public.courts, public.teams, public.access_assignments,
  public.team_memberships, public.athlete_levels, public.competitive_categories,
  public.competitive_formats, public.team_rosters, public.team_roster_members
to authenticated;
grant select on public.audit_logs to authenticated;

grant all on all tables in schema public to service_role;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
