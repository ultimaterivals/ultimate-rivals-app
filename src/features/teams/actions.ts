"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as teams from "@/server/services/teams.service";
import * as rosters from "@/server/services/rosters.service";
const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export async function createTeam360Action(f: FormData) {
  const a = await requireRole("admin");
  const row = await teams.createTeam(await createClient(), a, {
    name: f.get("name"),
    slug: f.get("slug"),
    shortName: val(f, "shortName") || null,
    primaryPoleId: f.get("primaryPoleId"),
    description: val(f, "description") || null,
    foundedAt: val(f, "foundedAt") || null,
    instagramHandle: val(f, "instagramHandle") || null,
  });
  redirect(`/admin/teams/${row.id}`);
}
export async function addTeamAthleteAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  const id = val(f, "teamId");
  await teams.addAthlete(await createClient(), a, {
    teamId: id,
    athleteId: f.get("athleteId"),
    seasonId: f.get("seasonId"),
    membershipType: f.get("membershipType"),
    startsAt: new Date(val(f, "startsAt")).toISOString(),
  });
  revalidatePath(`/admin/teams/${id}`);
  revalidatePath("/team/athletes");
}
export async function endMembershipAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  await teams.endMembership(await createClient(), a, {
    membershipId: f.get("membershipId"),
    endsAt: new Date().toISOString(),
  });
  revalidatePath("/admin/teams");
  revalidatePath("/team/athletes");
}
export async function assignTeamPoleAction(f: FormData) {
  const a = await requireRole("admin");
  const id = val(f, "teamId");
  await teams.assignPole(await createClient(), a, {
    teamId: id,
    poleId: f.get("poleId"),
    seasonId: f.get("seasonId"),
    startsAt: new Date(val(f, "startsAt")).toISOString(),
  });
  revalidatePath(`/admin/teams/${id}`);
}
export async function assignTeamManagerAction(f: FormData) {
  const a = await requireRole("admin");
  const id = val(f, "teamId");
  await teams.assignManager(await createClient(), a, {
    teamId: id,
    profileId: f.get("profileId"),
    managementRole: f.get("managementRole"),
    startsAt: new Date(val(f, "startsAt")).toISOString(),
  });
  revalidatePath(`/admin/teams/${id}`);
}
export async function createRosterAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  const id = val(f, "teamId");
  await rosters.createRoster(await createClient(), a, {
    teamId: id,
    seasonId: f.get("seasonId"),
    categoryId: f.get("categoryId"),
    formatId: f.get("formatId"),
    level: f.get("level"),
    name: val(f, "name") || null,
  });
  revalidatePath(`/admin/teams/${id}`);
  revalidatePath("/team/formations");
}
export async function addRosterMemberAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  await rosters.addMember(await createClient(), a, {
    rosterId: f.get("rosterId"),
    athleteId: f.get("athleteId"),
    role: f.get("role"),
    isCaptain: f.get("isCaptain") === "on",
    joinedAt: new Date().toISOString(),
  });
  revalidatePath("/admin/teams");
  revalidatePath("/team/formations");
}
export async function rosterStatusAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  await rosters.setRosterStatus(
    await createClient(),
    a,
    val(f, "rosterId"),
    val(f, "status") as "active" | "archived",
  );
  revalidatePath("/admin/teams");
  revalidatePath("/team/formations");
}
export async function updateTeamAction(f: FormData) {
  const a = await requireRole("admin"),
    id = val(f, "teamId");
  await teams.updateTeam(await createClient(), a, {
    teamId: id,
    name: f.get("name"),
    slug: f.get("slug"),
    shortName: val(f, "shortName") || null,
    description: val(f, "description") || null,
    foundedAt: val(f, "foundedAt") || null,
    instagramHandle: val(f, "instagramHandle") || null,
  });
  revalidatePath(`/admin/teams/${id}`);
  redirect(`/admin/teams/${id}`);
}
export async function updateTeamLogoAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]),
    id = val(f, "teamId");
  await teams.updateLogo(await createClient(), a, id, val(f, "logoUrl"));
  revalidatePath(`/admin/teams/${id}`);
  revalidatePath("/team");
}
export async function removeRosterMemberAction(f: FormData) {
  const a = await requireAnyRole(["admin", "team_manager"]);
  await rosters.removeMember(await createClient(), a, {
    memberId: f.get("memberId"),
    leftAt: new Date().toISOString(),
  });
  revalidatePath("/admin/teams");
  revalidatePath("/team/formations");
}
export async function archiveTeamAction(f: FormData) {
  const a = await requireRole("admin"),
    id = val(f, "teamId");
  await teams.archiveTeam(await createClient(), a, id);
  revalidatePath(`/admin/teams/${id}`);
  revalidatePath("/admin/teams");
}
