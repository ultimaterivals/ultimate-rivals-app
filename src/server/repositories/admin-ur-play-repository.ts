import { createClient } from "@/lib/supabase/server";

export type RawUrPlaySession = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string;
  venue_id: string;
  capacity: number;
  waitlist_capacity: number | null;
  price_amount: number | string | null;
  ready_for_matchmaking: boolean;
};
export type RawRegistration = {
  session_id: string;
  registration_status: string;
  attendance_status: string | null;
};
export type RawCheckin = { session_id: string; status: string };
export type RawCourt = { session_id: string; status: string };
export type RawStaff = { session_id: string; status: string };
export type RawScope = { session_id: string };
export type RawPole = { id: string; name: string };
export type RawVenue = { id: string; name: string };

export async function fetchAdminUrPlayRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    sessionsResult,
    registrationsResult,
    checkinsResult,
    courtsResult,
    staffResult,
    scopesResult,
    polesResult,
    venuesResult,
  ] = await Promise.all([
    supabase
      .from("ur_play_sessions")
      .select(
        "id,name,status,starts_at,ends_at,pole_id,venue_id,capacity,waitlist_capacity,price_amount,ready_for_matchmaking",
      )
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false })
      .limit(300),
    supabase
      .from("ur_play_registrations")
      .select("session_id,registration_status,attendance_status")
      .limit(10000),
    supabase.from("ur_play_checkins").select("session_id,status").limit(10000),
    supabase
      .from("ur_play_session_courts")
      .select("session_id,status")
      .limit(5000),
    supabase
      .from("ur_play_session_staff")
      .select("session_id,status")
      .limit(5000),
    supabase.from("ur_play_session_scopes").select("session_id").limit(5000),
    supabase.from("poles").select("id,name"),
    supabase.from("venues").select("id,name").limit(1000),
  ]);
  const results = [
    ["ur_play_sessions", sessionsResult.error],
    ["ur_play_registrations", registrationsResult.error],
    ["ur_play_checkins", checkinsResult.error],
    ["ur_play_session_courts", courtsResult.error],
    ["ur_play_session_staff", staffResult.error],
    ["ur_play_session_scopes", scopesResult.error],
    ["poles", polesResult.error],
    ["venues", venuesResult.error],
  ] as const;
  for (const [source, error] of results)
    if (error) errors.push(`${source}: ${error.message}`);
  return {
    sessions: sessionsResult.error
      ? null
      : ((sessionsResult.data as RawUrPlaySession[] | null) ?? []),
    registrations: registrationsResult.error
      ? null
      : ((registrationsResult.data as RawRegistration[] | null) ?? []),
    checkins: checkinsResult.error
      ? null
      : ((checkinsResult.data as RawCheckin[] | null) ?? []),
    courts: courtsResult.error
      ? null
      : ((courtsResult.data as RawCourt[] | null) ?? []),
    staff: staffResult.error
      ? null
      : ((staffResult.data as RawStaff[] | null) ?? []),
    scopes: scopesResult.error
      ? null
      : ((scopesResult.data as RawScope[] | null) ?? []),
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawPole[] | null) ?? []),
    venues: venuesResult.error
      ? null
      : ((venuesResult.data as RawVenue[] | null) ?? []),
    errors,
  };
}
