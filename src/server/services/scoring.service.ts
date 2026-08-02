import type { SupabaseClient } from "@supabase/supabase-js";
import { getScoringPanel } from "@/server/repositories/scoring.repository";

export async function getCurrentScoringState(
  client: SupabaseClient,
  matchId: string,
) {
  return getScoringPanel(client, matchId);
}
