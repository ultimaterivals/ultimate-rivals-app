import type {
  AdminAttendanceSnapshot,
  AttendanceRegistration,
  AttendanceSession,
} from "@/features/admin-attendance/types";
import { fetchAdminAttendanceRepositoryData } from "@/server/repositories/admin-attendance-repository";

export async function getAdminAttendanceSnapshot(
  now = new Date(),
): Promise<AdminAttendanceSnapshot> {
  const raw = await fetchAdminAttendanceRepositoryData(now);

  if (raw.sessions === null) {
    return { sessions: null, sourceErrors: raw.errors };
  }

  const athletes = new Map(
    (raw.athletes ?? []).map((athlete) => [athlete.id, athlete]),
  );
  const venues = new Map((raw.venues ?? []).map((venue) => [venue.id, venue]));
  const activities = new Map(
    (raw.activities ?? []).map((activity) => [
      activity.ur_play_registration_id,
      activity,
    ]),
  );
  const registrationsBySession = new Map<string, AttendanceRegistration[]>();

  for (const registration of raw.registrations ?? []) {
    const athlete = athletes.get(registration.athlete_id);
    const activity = activities.get(registration.id);
    const item: AttendanceRegistration = {
      id: registration.id,
      athleteId: registration.athlete_id,
      athleteName: athlete?.public_name ?? "Atleta",
      athleteCode: athlete?.athlete_code ?? "—",
      registrationStatus: registration.registration_status,
      attendanceStatus: registration.attendance_status,
      paymentStatus: registration.payment_status,
      activityReservationId: activity?.id ?? null,
      activityStatus: activity?.status ?? null,
    };
    const existing = registrationsBySession.get(registration.session_id) ?? [];
    existing.push(item);
    registrationsBySession.set(registration.session_id, existing);
  }

  const sessions: AttendanceSession[] = raw.sessions.map((session) => {
    const registrations = registrationsBySession.get(session.id) ?? [];
    const confirmed = registrations.filter(
      (item) => item.registrationStatus === "confirmed",
    );
    const checkedInCount = confirmed.filter(
      (item) => item.attendanceStatus === "checked_in",
    ).length;
    const noShowCount = confirmed.filter(
      (item) => item.attendanceStatus === "no_show",
    ).length;
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      venueName: venues.get(session.venue_id)?.name ?? null,
      capacity: session.capacity,
      registrations,
      confirmedCount: confirmed.length,
      checkedInCount,
      noShowCount,
      pendingAttendanceCount: Math.max(
        0,
        confirmed.length - checkedInCount - noShowCount,
      ),
    };
  });

  return { sessions, sourceErrors: raw.errors };
}
