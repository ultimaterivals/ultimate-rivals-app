"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as service from "@/server/services/athletes.service";
import { importAthletesSchema } from "@/lib/validation/athlete";
export type AthleteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  id?: string;
};
const fail = (e: unknown): AthleteActionState => ({
  status: "error",
  message: e instanceof Error ? e.message : "Não foi possível concluir.",
});
const value = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
export async function createAthlete360Action(
  _: AthleteActionState,
  f: FormData,
): Promise<AthleteActionState> {
  let athleteId: string;
  try {
    const actor = await requireRole("admin");
    const row = await service.createAthlete(await createClient(), actor, {
      publicName: value(f, "publicName"),
      fullName: value(f, "fullName"),
      birthDate: value(f, "birthDate"),
      gender: value(f, "gender"),
      dominantHand: value(f, "dominantHand"),
      heightCm: value(f, "heightCm"),
      phone: value(f, "phone"),
      emailContact: value(f, "emailContact"),
      instagramHandle: value(f, "instagramHandle"),
      city: value(f, "city"),
      state: value(f, "state"),
      bio: value(f, "bio"),
    });
    revalidatePath("/admin/athletes");
    athleteId = row.id;
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/athletes/${athleteId}`);
}
export async function athleteStatusAction(f: FormData) {
  const actor = await requireRole("admin");
  const id = String(f.get("athleteId"));
  await service.setStatus(
    await createClient(),
    actor,
    { athleteId: id, reason: value(f, "reason") ?? undefined },
    String(f.get("operation")) === "archive" ? "archived" : "active",
  );
  revalidatePath(`/admin/athletes/${id}`);
}
export async function assignAthleteProfileAction(f: FormData) {
  const actor = await requireRole("admin");
  const id = String(f.get("athleteId"));
  await service.assignProfile(await createClient(), actor, {
    athleteId: id,
    profileId: f.get("profileId"),
  });
  revalidatePath(`/admin/athletes/${id}`);
}
export async function updateAthleteAdminAction(f: FormData) {
  const actor = await requireRole("admin");
  const id = String(f.get("athleteId"));
  await service.updateByAdmin(await createClient(), actor, {
    athleteId: id,
    publicName: f.get("publicName"),
    fullName: f.get("fullName"),
    birthDate: value(f, "birthDate"),
    gender: f.get("gender"),
    phone: value(f, "phone"),
    emailContact: value(f, "emailContact"),
    city: value(f, "city"),
    state: value(f, "state"),
    bio: value(f, "bio"),
  });
  revalidatePath(`/admin/athletes/${id}`);
  redirect(`/admin/athletes/${id}`);
}
export async function assignAthleteLevelAction(f: FormData) {
  const actor = await requireRole("admin");
  const id = String(f.get("athleteId"));
  await service.assignLevel(await createClient(), actor, {
    athleteId: id,
    seasonId: f.get("seasonId"),
    level: f.get("level"),
    startsAt: new Date(String(f.get("startsAt"))).toISOString(),
    reason: value(f, "reason"),
  });
  revalidatePath(`/admin/athletes/${id}`);
}
export async function createAthleteNoteAction(f: FormData) {
  const actor = await requireRole("admin");
  const id = String(f.get("athleteId"));
  await service.createNote(await createClient(), actor, {
    athleteId: id,
    noteType: f.get("noteType"),
    content: f.get("content"),
    visibility: f.get("visibility"),
  });
  revalidatePath(`/admin/athletes/${id}`);
}
export async function updateOwnAthleteAction(
  _: AthleteActionState,
  f: FormData,
): Promise<AthleteActionState> {
  try {
    const actor = await requireRole("athlete");
    await service.updateOwnProfile(await createClient(), actor, {
      athleteId: f.get("athleteId"),
      publicName: f.get("publicName"),
      bio: value(f, "bio"),
      instagramHandle: value(f, "instagramHandle"),
      city: value(f, "city"),
      state: value(f, "state"),
      phone: value(f, "phone"),
      emailContact: value(f, "emailContact"),
      dominantHand: value(f, "dominantHand"),
      heightCm: value(f, "heightCm"),
    });
    revalidatePath("/athlete/profile");
  } catch (e) {
    return fail(e);
  }
  redirect("/athlete/profile?updated=1");
}
export async function importAthletesAction(
  _: AthleteActionState,
  f: FormData,
): Promise<AthleteActionState> {
  try {
    await requireRole("admin");
    const rows = importAthletesSchema.parse(
      JSON.parse(String(f.get("rows") ?? "[]")),
    );
    const payload = rows.map((r) => ({
      public_name: r.publicName,
      full_name: r.fullName,
      birth_date: r.birthDate ?? "",
      gender: r.gender,
      email_contact: r.emailContact ?? "",
      phone: r.phone ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
    }));
    const { data, error } = await (
      await createClient()
    ).rpc("import_athletes_csv", { rows: payload });
    if (error) throw error;
    revalidatePath("/admin/athletes");
    return {
      status: "success",
      message: `${data?.length ?? 0} atletas importados em uma transação.`,
    };
  } catch (e) {
    return fail(e);
  }
}
