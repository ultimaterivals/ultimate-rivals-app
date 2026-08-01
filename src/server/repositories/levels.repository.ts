import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssignLevelInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export async function insertLevel(
  client: SupabaseClient,
  input: AssignLevelInput,
  actorId: string,
) {
  const { data, error } = await client
    .from("athlete_levels")
    .insert({
      athlete_id: input.athleteId,
      season_id: input.seasonId,
      level: input.level,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      reason: input.reason ?? null,
      assigned_by: actorId,
    })
    .select("id")
    .single();
  return ensureData(data, error);
}
