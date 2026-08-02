import type { SupabaseClient } from "@supabase/supabase-js";
import { getAthleteStatistics } from "@/server/repositories/scoring.repository";

export async function getRawAthleteStatistics(
  client: SupabaseClient,
  athleteId: string,
) {
  return getAthleteStatistics(client, athleteId);
}
