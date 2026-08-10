import type {
  AdminUrPlayCloseSnapshot,
  UrPlaySessionCloseReadiness,
} from "@/features/admin-ur-play-close/types";
import { fetchAdminUrPlayCloseReadiness } from "@/server/repositories/admin-ur-play-close-repository";

export async function getAdminUrPlayCloseSnapshot(
  sessionIds: string[],
): Promise<AdminUrPlayCloseSnapshot> {
  const raw = await fetchAdminUrPlayCloseReadiness(sessionIds);
  const sessions: UrPlaySessionCloseReadiness[] = raw.rows.map((row) => ({
    sessionId: row.sessionId,
    sessionStatus: row.session_status,
    totalMatches: row.total_matches,
    openMatches: row.open_matches,
    completedMatches: row.completed_matches,
    homologatedResults: row.homologated_results,
    pendingResults: row.pending_results,
    pendingAttendance: row.pending_attendance,
    ready: row.ready,
  }));

  return { sessions, sourceErrors: raw.errors };
}
