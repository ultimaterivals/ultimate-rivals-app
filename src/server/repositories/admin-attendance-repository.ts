import { createClient } from "@/lib/supabase/server";

export type RawAttendanceSession = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  venue_id: string;
  capacity: number;
};

export type RawAttendanceRegistration = {
  id: string;
  session_id: string;
  athlete_id: string;
  registration_status: string;
  attendance_status: string;
  payment_status: string;
};

export type RawAttendanceAthlete = {
  id: string;
  public_name: string;
  athlete_code: string;
};

export type RawAttendanceVenue = {
  id: string;
  name: string;
};

export type RawAttendanceActivity = {
  id: string;
  ur_play_registration_id: string;
  status: string;
};

export async function fetchAdminAttendanceRepositoryData(now = new Date()) {
  const supabase = await createClient();
  const errors: string[] = [];
  const rangeStart = new Date(
    now.getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const rangeEnd = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sessionsResult = await supabase
    .from("ur_play_sessions")
    .select("id,name,status,starts_at,ends_at,venue_id,capacity")
    .in("status", [
      "registration_open",
      "registration_closed",
      "checkin_open",
      "in_progress",
      "completed",
    ])
    .gte("ends_at", rangeStart)
    .lte("starts_at", rangeEnd)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (sessionsResult.error) {
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
    return {
      sessions: null,
      registrations: null,
      athletes: null,
      venues: null,
      activities: null,
      errors,
    };
  }

  const sessions = (sessionsResult.data as RawAttendanceSession[] | null) ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const venueIds = [...new Set(sessions.map((session) => session.venue_id))];

  if (sessionIds.length === 0) {
    return {
      sessions,
      registrations: [] as RawAttendanceRegistration[],
      athletes: [] as RawAttendanceAthlete[],
      venues: [] as RawAttendanceVenue[],
      activities: [] as RawAttendanceActivity[],
      errors,
    };
  }

  const [registrationsResult, venuesResult] = await Promise.all([
    supabase
      .from("ur_play_registrations")
      .select(
        "id,session_id,athlete_id,registration_status,attendance_status,payment_status",
      )
      .in("session_id", sessionIds)
      .in("registration_status", ["confirmed", "waitlisted"])
      .order("registered_at", { ascending: true }),
    venueIds.length > 0
      ? supabase.from("venues").select("id,name").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (registrationsResult.error) {
    errors.push(`ur_play_registrations: ${registrationsResult.error.message}`);
  }
  if (venuesResult.error) {
    errors.push(`venues: ${venuesResult.error.message}`);
  }

  const registrations = registrationsResult.error
    ? null
    : ((registrationsResult.data as RawAttendanceRegistration[] | null) ?? []);
  const athleteIds = registrations
    ? [...new Set(registrations.map((registration) => registration.athlete_id))]
    : [];
  const registrationIds = registrations
    ? registrations.map((registration) => registration.id)
    : [];

  const [athletesResult, activitiesResult] = await Promise.all([
    athleteIds.length > 0
      ? supabase
          .from("athletes")
          .select("id,public_name,athlete_code")
          .in("id", athleteIds)
      : Promise.resolve({ data: [], error: null }),
    registrationIds.length > 0
      ? supabase
          .from("activity_reservations")
          .select("id,ur_play_registration_id,status")
          .in("ur_play_registration_id", registrationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (athletesResult.error) {
    errors.push(`athletes: ${athletesResult.error.message}`);
  }
  if (activitiesResult.error) {
    errors.push(`activity_reservations: ${activitiesResult.error.message}`);
  }

  return {
    sessions,
    registrations,
    athletes: athletesResult.error
      ? null
      : ((athletesResult.data as RawAttendanceAthlete[] | null) ?? []),
    venues: venuesResult.error
      ? null
      : ((venuesResult.data as RawAttendanceVenue[] | null) ?? []),
    activities: activitiesResult.error
      ? null
      : ((activitiesResult.data as RawAttendanceActivity[] | null) ?? []),
    errors,
  };
}
