import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTeamCalendar(client: SupabaseClient) {
  const { data, error } = await client
    .from("calendar_events")
    .select(
      "id,name,event_type,status,starts_at,ends_at,poles(name),venues(name)",
    )
    .in("event_type", ["series", "cup", "legends", "training", "ur_play"])
    .order("starts_at", { ascending: true })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function getTeamCompetitions(
  client: SupabaseClient,
  teamId: string,
) {
  const { data, error } = await client
    .from("tournament_registrations")
    .select(
      "id,status,payment_status,eligibility_status,eligibility_reasons,tournament_divisions(level,format,tournaments(id,name,product,status,starts_at,public_slug))",
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
