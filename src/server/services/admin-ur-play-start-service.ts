import type {
  AdminUrPlayStartSnapshot,
  UrPlaySessionStartReadiness,
} from "@/features/admin-ur-play-start/types";
import { fetchAdminUrPlayStartReadiness } from "@/server/repositories/admin-ur-play-start-repository";

export async function getAdminUrPlayStartSnapshot(
  sessionIds: string[],
): Promise<AdminUrPlayStartSnapshot> {
  const raw = await fetchAdminUrPlayStartReadiness(sessionIds);
  const sessions: UrPlaySessionStartReadiness[] = raw.rows.map((row) => ({
    sessionId: row.sessionId,
    sessionStatus: row.session_status,
    criticalReady: row.critical_ready,
    criticalTotal: row.critical_total,
    courtReady: row.court_ready,
    minimumAthletes: row.minimum_athletes,
    checkedIn: row.checked_in,
    ready: row.ready,
    error: null,
  }));

  return { sessions, sourceErrors: raw.errors };
}
