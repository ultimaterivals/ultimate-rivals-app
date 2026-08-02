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
        "id,name,starts_at,ends_at,min_rest_minutes,ur_play_session_courts(court_id,courts(name))",
      )
      .eq("id", sessionId)
      .single(),
    client
      .from("match_queue_entries")
      .select(
        "*,athletes(athlete_code,public_name,gender),ur_play_registrations(snapshot_level)",
      )
      .eq("session_id", sessionId)
      .order("queued_at"),
    client
      .from("matches")
      .select(
        "*,courts(name),competitive_formats(code,name),competitive_categories(code,name),match_sides(id,side,match_participants(id,athlete_id,position_order,athletes(athlete_code,public_name)))",
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
      wait_minutes: Math.max(0, Math.floor((observedAt - new Date(row.queued_at).getTime()) / 60_000)),
    })),
    matches: matches ?? [],
  };
}

export async function getMatchPanel(client: SupabaseClient, matchId: string) {
  const { data, error } = await client
    .from("matches")
    .select(
      "*,courts(name),competitive_formats(code,name),competitive_categories(code,name),ur_play_sessions(name),match_sides(id,side,label,match_participants(id,athlete_id,registration_id,position_order,athletes(athlete_code,public_name)))",
    )
    .eq("id", matchId)
    .single();
  if (error) throw error;
  return data;
}
