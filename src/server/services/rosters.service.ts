import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import * as s from "@/lib/validation/team";
const allowed = (a: SessionIdentity) =>
  assertAnyRole(a.role, ["admin", "team_manager"]);
export async function createRoster(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  allowed(a);
  const v = s.createTeamRosterSchema.parse(input);
  const { data, error } = await client
    .from("team_rosters")
    .insert({
      team_id: v.teamId,
      season_id: v.seasonId,
      category_id: v.categoryId,
      format_id: v.formatId,
      level: v.level,
      name: v.name ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
export async function addMember(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  allowed(a);
  const v = s.addTeamRosterMemberSchema.parse(input);
  const { error } = await client.from("team_roster_members").insert({
    roster_id: v.rosterId,
    athlete_id: v.athleteId,
    role: v.role,
    is_captain: v.isCaptain,
    joined_at: v.joinedAt,
  });
  if (error) throw error;
}
export async function removeMember(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  allowed(a);
  const v = s.removeRosterMemberSchema.parse(input);
  const { error } = await client
    .from("team_roster_members")
    .update({ left_at: v.leftAt, status: "inactive" })
    .eq("id", v.memberId);
  if (error) throw error;
}
export async function setRosterStatus(
  client: SupabaseClient,
  a: SessionIdentity,
  id: string,
  status: "active" | "archived",
) {
  allowed(a);
  const { error } = await client
    .from("team_rosters")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
