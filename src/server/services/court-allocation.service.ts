import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { changeMatchCourtSchema } from "@/lib/validation/court-ops";

export function deriveCourtState(
  matches: { court_id: string; status: string }[],
  courtId: string,
) {
  const match = matches.find(
    (row) =>
      row.court_id === courtId &&
      ["queued", "called", "ready", "in_progress"].includes(row.status),
  );
  if (!match) return "free";
  return match.status === "in_progress" ? "playing" : "reserved";
}

export async function changeMatchCourt(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = changeMatchCourtSchema.parse(input);
  const { data, error } = await client.rpc("change_match_court", {
    target_match: value.matchId,
    target_court: value.courtId,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
