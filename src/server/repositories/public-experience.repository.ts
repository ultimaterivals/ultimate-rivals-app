import type { SupabaseClient } from "@supabase/supabase-js";

export async function listPublicCalendarEvents(client: SupabaseClient) {
  const { data, error } = await client
    .from("public_calendar_events")
    .select("*")
    .order("starts_at", { ascending: true })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function listPublicTeams(client: SupabaseClient) {
  const { data, error } = await client
    .from("public_teams")
    .select("*")
    .order("team_ranking_position", {
      ascending: true,
      nullsFirst: false,
    })
    .order("name")
    .limit(80);
  if (error) throw error;
  return data ?? [];
}
