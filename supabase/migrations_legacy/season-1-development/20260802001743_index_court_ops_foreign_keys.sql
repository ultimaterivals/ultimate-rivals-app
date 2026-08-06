create index match_participants_pole_snapshot on public.match_participants(pole_snapshot_id)where pole_snapshot_id is not null;
create index match_participants_team_snapshot on public.match_participants(team_snapshot_id)where team_snapshot_id is not null;
create index match_queue_athlete on public.match_queue_entries(athlete_id);
create index match_sides_roster on public.match_sides(roster_id)where roster_id is not null;
create index match_sides_team on public.match_sides(team_id)where team_id is not null;
create index matches_category on public.matches(category_id)where category_id is not null;
create index matches_court on public.matches(court_id);
create index matches_created_by on public.matches(created_by);
create index matches_format on public.matches(format_id);
