import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AddRosterMemberInput,
  CreateRosterInput,
} from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export async function insertRoster(
  client: SupabaseClient,
  input: CreateRosterInput,
) {
  const { data, error } = await client
    .from("team_rosters")
    .insert({
      team_id: input.teamId,
      season_id: input.seasonId,
      category_id: input.categoryId,
      format_id: input.formatId,
      level: input.level,
      name: input.name ?? null,
    })
    .select("id")
    .single();
  return ensureData(data, error);
}
export async function insertRosterMember(
  client: SupabaseClient,
  input: AddRosterMemberInput,
) {
  const { data, error } = await client
    .from("team_roster_members")
    .insert({
      roster_id: input.rosterId,
      athlete_id: input.athleteId,
      role: input.role,
      joined_at: input.joinedAt,
    })
    .select("id")
    .single();
  return ensureData(data, error);
}
