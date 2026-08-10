import type { AdminUrPlaySnapshot } from "@/features/admin-ur-play/types";
import { fetchAdminUrPlayRepositoryData } from "@/server/repositories/admin-ur-play-repository";

function number(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getAdminUrPlaySnapshot(
  now = new Date(),
): Promise<AdminUrPlaySnapshot> {
  const raw = await fetchAdminUrPlayRepositoryData();
  const poles = new Map((raw.poles ?? []).map((item) => [item.id, item.name]));
  const venues = new Map(
    (raw.venues ?? []).map((item) => [item.id, item.name]),
  );
  const sessions = (raw.sessions ?? []).map((session) => {
    const registrations = (raw.registrations ?? []).filter(
      (item) =>
        item.session_id === session.id &&
        item.registration_status !== "cancelled",
    );
    const confirmed = registrations.filter((item) =>
      ["confirmed", "registered"].includes(item.registration_status),
    ).length;
    const waitlisted = registrations.filter(
      (item) => item.registration_status === "waitlisted",
    ).length;
    const checkins = (raw.checkins ?? []).filter(
      (item) => item.session_id === session.id && item.status !== "cancelled",
    ).length;
    const courts = (raw.courts ?? []).filter(
      (item) => item.session_id === session.id && item.status !== "cancelled",
    ).length;
    const staff = (raw.staff ?? []).filter(
      (item) => item.session_id === session.id && item.status !== "cancelled",
    ).length;
    const scopes = (raw.scopes ?? []).filter(
      (item) => item.session_id === session.id,
    ).length;
    const fillRate =
      session.capacity > 0
        ? Math.min(100, Math.round((confirmed / session.capacity) * 100))
        : 0;
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      poleName: poles.get(session.pole_id) ?? null,
      venueName: venues.get(session.venue_id) ?? null,
      capacity: session.capacity,
      waitlistCapacity: session.waitlist_capacity ?? 0,
      priceAmount: number(session.price_amount),
      readyForMatchmaking: session.ready_for_matchmaking,
      registrations: registrations.length,
      confirmed,
      waitlisted,
      checkins,
      courts,
      staff,
      scopes,
      fillRate,
    };
  });
  const upcoming = sessions.filter(
    (session) => new Date(session.startsAt).getTime() >= now.getTime(),
  );
  return {
    generatedAt: now.toISOString(),
    sessions,
    metrics: {
      sessions: sessions.length,
      upcoming: upcoming.length,
      capacity: upcoming.reduce((sum, item) => sum + item.capacity, 0),
      confirmed: upcoming.reduce((sum, item) => sum + item.confirmed, 0),
      waitlisted: upcoming.reduce((sum, item) => sum + item.waitlisted, 0),
      checkins: sessions.reduce((sum, item) => sum + item.checkins, 0),
      averageFillRate:
        upcoming.length > 0
          ? Math.round(
              upcoming.reduce((sum, item) => sum + item.fillRate, 0) /
                upcoming.length,
            )
          : null,
    },
    sourceErrors: raw.errors,
  };
}
