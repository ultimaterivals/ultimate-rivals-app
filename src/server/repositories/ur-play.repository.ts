import type { SupabaseClient } from "@supabase/supabase-js";

export async function listUrPlaySessions(client: SupabaseClient) {
  const { data, error } = await client
    .from("ur_play_sessions")
    .select(
      "id,name,session_date,starts_at,ends_at,capacity,waitlist_capacity,status,ready_for_matchmaking,price_amount,poles(name),venues(name),ur_play_session_scopes(level,competitive_formats(code),competitive_categories(code)),ur_play_registrations(id,athlete_id,registration_status,waitlist_position)",
    )
    .order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function getUrPlaySession(client: SupabaseClient, id: string) {
  const { data: session, error } = await client
    .from("ur_play_sessions")
    .select(
      "*,poles(name),venues(name),seasons(name),ur_play_session_courts(id,position,courts(name)),ur_play_session_scopes(id,level,competitive_formats(code),competitive_categories(code))",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const [
    { data: registrations, error: registrationError },
    { data: staff, error: staffError },
  ] = await Promise.all([
    client
      .from("ur_play_registrations")
      .select(
        "*,athlete_public_profiles:athletes(athlete_code,public_name),teams!ur_play_registrations_snapshot_team_id_fkey(name),poles!ur_play_registrations_snapshot_team_pole_id_fkey(name)",
      )
      .eq("session_id", id)
      .order("registered_at"),
    client
      .from("ur_play_session_staff")
      .select(
        "id,role,status,profile_id,profiles!ur_play_session_staff_profile_id_fkey(display_name)",
      )
      .eq("session_id", id),
  ]);
  if (registrationError) throw registrationError;
  if (staffError) throw staffError;
  return { session, registrations: registrations ?? [], staff: staff ?? [] };
}
