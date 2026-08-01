import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import * as s from "@/lib/validation/team";
const admin = (a: SessionIdentity) => assertAnyRole(a.role, ["admin"]);
const manager = (a: SessionIdentity) =>
  assertAnyRole(a.role, ["admin", "team_manager"]);
export async function createTeam(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  admin(a);
  const v = s.createTeam360Schema.parse(input);
  const { data, error } = await client
    .from("teams")
    .insert({
      name: v.name,
      slug: v.slug,
      short_name: v.shortName ?? null,
      primary_pole_id: v.primaryPoleId,
      description: v.description ?? null,
      founded_at: v.foundedAt ?? null,
      instagram_handle: v.instagramHandle ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { data: season, error: seasonError } = await client
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1)
    .single();
  if (seasonError) throw seasonError;
  const { error: poleError } = await client.rpc("assign_team_pole", {
    target_team_id: data.id,
    target_pole_id: v.primaryPoleId,
    target_season_id: season.id,
    effective_at: new Date().toISOString(),
  });
  if (poleError) throw poleError;
  return data;
}
export async function updateTeam(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  admin(a);
  const v = s.updateTeamSchema.parse(input);
  const { teamId, ...f } = v;
  const { error } = await client
    .from("teams")
    .update({
      name: f.name,
      slug: f.slug,
      short_name: f.shortName,
      description: f.description,
      founded_at: f.foundedAt,
      instagram_handle: f.instagramHandle,
    })
    .eq("id", teamId);
  if (error) throw error;
}
export async function assignPole(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  admin(a);
  const v = s.assignTeamPoleSchema.parse(input);
  const { error } = await client.rpc("assign_team_pole", {
    target_team_id: v.teamId,
    target_pole_id: v.poleId,
    target_season_id: v.seasonId,
    effective_at: v.startsAt,
  });
  if (error) throw error;
}
export async function assignManager(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  admin(a);
  const v = s.assignTeamManagerSchema.parse(input);
  const { error } = await client.from("team_manager_assignments").insert({
    team_id: v.teamId,
    profile_id: v.profileId,
    management_role: v.managementRole,
    starts_at: v.startsAt,
    assigned_by: a.userId,
  });
  if (error) throw error;
}
export async function addAthlete(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  manager(a);
  const v = s.addAthleteToTeamSchema.parse(input);
  const { error } = await client.from("team_memberships").insert({
    team_id: v.teamId,
    athlete_id: v.athleteId,
    season_id: v.seasonId,
    membership_type: v.membershipType,
    starts_at: v.startsAt,
    created_by: a.userId,
  });
  if (error) throw error;
}
export async function endMembership(
  client: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  manager(a);
  const v = s.endMembershipSchema.parse(input);
  const { error } = await client
    .from("team_memberships")
    .update({ ends_at: v.endsAt, status: "inactive" })
    .eq("id", v.membershipId);
  if (error) throw error;
}
export async function updateLogo(
  client: SupabaseClient,
  a: SessionIdentity,
  teamId: string,
  logoUrl: string,
) {
  manager(a);
  const { error } = await client
    .from("teams")
    .update({ logo_url: logoUrl })
    .eq("id", teamId);
  if (error) throw error;
}

export async function archiveTeam(
  client: SupabaseClient,
  a: SessionIdentity,
  teamId: string,
) {
  admin(a);
  const { error } = await client
    .from("teams")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}
