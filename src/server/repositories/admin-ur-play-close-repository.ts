import { createClient } from "@/lib/supabase/server";

export async function fetchAdminUrPlayCloseReadiness(sessionIds: string[]) {
  if (sessionIds.length === 0) return { rows: [], errors: [] as string[] };

  const supabase = await createClient();
  const results = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const result = await supabase.rpc("get_ur_play_session_close_readiness", {
        target_session: sessionId,
      });
      return { sessionId, ...result };
    }),
  );

  const errors: string[] = [];
  const rows: Array<{
    sessionId: string;
    session_status: string;
    total_matches: number;
    open_matches: number;
    completed_matches: number;
    homologated_results: number;
    pending_results: number;
    pending_attendance: number;
    ready: boolean;
  }> = [];

  for (const result of results) {
    if (result.error) {
      errors.push(`${result.sessionId}: ${result.error.message}`);
      continue;
    }
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) continue;
    rows.push({
      sessionId: result.sessionId,
      session_status: String(row.session_status),
      total_matches: Number(row.total_matches),
      open_matches: Number(row.open_matches),
      completed_matches: Number(row.completed_matches),
      homologated_results: Number(row.homologated_results),
      pending_results: Number(row.pending_results),
      pending_attendance: Number(row.pending_attendance),
      ready: Boolean(row.ready),
    });
  }

  return { rows, errors };
}
