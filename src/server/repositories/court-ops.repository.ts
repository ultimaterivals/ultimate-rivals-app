import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCourtOpsDashboard(
  client: SupabaseClient,
  sessionId: string,
) {
  const [
    { data: session, error: sessionError },
    { data: queue, error: queueError },
    { data: matches, error: matchError },
  ] = await Promise.all([
    client
      .from("ur_play_sessions")
      .select(
        "id,season_id,name,starts_at,ends_at,min_rest_minutes,ur_play_session_courts(court_id,status,courts(name))",
      )
      .eq("id", sessionId)
      .single(),
    client
      .from("match_queue_entries")
      .select(
        "*,athletes(athlete_code,public_name,gender),ur_play_registrations(snapshot_level,snapshot_team_id,teams:snapshot_team_id(name))",
      )
      .eq("session_id", sessionId)
      .order("queued_at"),
    client
      .from("matches")
      .select(
        "*,courts(name),competitive_formats(code,name),competitive_categories(code,name),match_sides(id,side,match_participants(id,athlete_id,position_order,athletes(athlete_code,public_name)),match_squad_members(id,athlete_id,squad_role,status,reserve_presence_status,position_order,athletes(athlete_code,public_name)))",
      )
      .eq("session_id", sessionId)
      .order("scheduled_order"),
  ]);
  if (sessionError) throw sessionError;
  if (queueError) throw queueError;
  if (matchError) throw matchError;
  const observedAt = Date.now();
  return {
    session,
    queue: (queue ?? []).map((row) => ({
      ...row,
      wait_minutes: Math.max(
        0,
        Math.floor((observedAt - new Date(row.queued_at).getTime()) / 60_000),
      ),
    })),
    matches: matches ?? [],
  };
}

export async function getMatchPanel(client: SupabaseClient, matchId: string) {
  const { data, error } = await client
    .from("matches")
    .select(
      "*,courts(name),competitive_formats(code,name),competitive_categories(code,name),ur_play_sessions(name,ur_play_session_courts(court_id,status,courts(name))),match_sides(id,side,label,team_id,roster_id,teams(name),team_rosters(name),match_participants(id,athlete_id,registration_id,position_order,athletes(athlete_code,public_name,gender)),match_squad_members(id,athlete_id,registration_id,roster_id,initial_squad_role,squad_role,status,reserve_presence_status,position_order,called_at,confirmed_at,athletes(athlete_code,public_name,gender)))",
    )
    .eq("id", matchId)
    .single();
  if (error) throw error;
  const [
    { data: availableQueue, error: queueError },
    { data: sessionMatches, error: sessionMatchesError },
  ] = await Promise.all([
    client
      .from("match_queue_entries")
      .select(
        "athlete_id,status,last_match_ended_at,athletes(athlete_code,public_name,gender),ur_play_registrations(snapshot_level)",
      )
      .eq("session_id", data.session_id)
      .in("status", ["waiting", "resting"])
      .is("current_match_id", null),
    client
      .from("matches")
      .select("id,court_id,status")
      .eq("session_id", data.session_id)
      .in("status", ["queued", "called", "ready", "in_progress"]),
  ]);
  if (queueError) throw queueError;
  if (sessionMatchesError) throw sessionMatchesError;
  return {
    ...data,
    available_queue: availableQueue ?? [],
    session_matches: sessionMatches ?? [],
  };
}

export async function getOfficialRostersForSession(
  client: SupabaseClient,
  seasonId: string,
) {
  const { data, error } = await client
    .from("team_rosters")
    .select(
      "id,name,team_id,format_id,category_id,level,teams(name),competitive_formats(code),competitive_categories(code),team_roster_members(athlete_id,role,status)",
    )
    .eq("season_id", seasonId)
    .eq("status", "active");
  if (error) throw error;
  return data ?? [];
}
