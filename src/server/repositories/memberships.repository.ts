import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateMembershipInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export async function insertMembership(
  client: SupabaseClient,
  input: CreateMembershipInput,
  actorId: string,
) {
  const { data, error } = await client
    .from("team_memberships")
    .insert({
      athlete_id: input.athleteId,
      team_id: input.teamId,
      season_id: input.seasonId,
      membership_type: input.membershipType,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      created_by: actorId,
    })
    .select("id")
    .single();
  return ensureData(data, error);
}
