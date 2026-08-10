import { createClient } from "@/lib/supabase/server";

export async function fetchAdminUrPlayStartReadiness(sessionIds: string[]) {
  if (sessionIds.length === 0) return { rows: [], errors: [] as string[] };

  const supabase = await createClient();
  const results = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const result = await supabase.rpc("get_ur_play_session_start_readiness", {
        target_session: sessionId,
      });
      return { sessionId, ...result };
    }),
  );

  const errors: string[] = [];
  const rows: Array<{
    sessionId: string;
    session_status: string;
    critical_ready: number;
    critical_total: number;
    court_ready: boolean;
    minimum_athletes: number;
    checked_in: number;
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
      critical_ready: Number(row.critical_ready),
      critical_total: Number(row.critical_total),
      court_ready: Boolean(row.court_ready),
      minimum_athletes: Number(row.minimum_athletes),
      checked_in: Number(row.checked_in),
      ready: Boolean(row.ready),
    });
  }

  return { rows, errors };
}
