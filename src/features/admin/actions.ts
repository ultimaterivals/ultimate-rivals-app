"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as services from "@/server/services/domain-services";

export interface AdminActionState {
  status: "idle" | "success" | "error";
  message?: string;
}
function failure(error: unknown): AdminActionState {
  return {
    status: "error",
    message:
      error instanceof ZodError
        ? error.issues[0]?.message
        : "Não foi possível salvar o registro.",
  };
}

export async function createAthleteAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    const actor = await requireRole("admin");
    const client = await createClient();
    await services.createAthlete(client, actor, {
      publicName: form.get("publicName"),
      fullName: form.get("fullName"),
      gender: form.get("gender"),
    });
    revalidatePath("/admin/athletes");
    return { status: "success", message: "Atleta criado." };
  } catch (error) {
    return failure(error);
  }
}
export async function createPoleAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    const actor = await requireRole("admin");
    const client = await createClient();
    await services.createPole(client, actor, {
      name: form.get("name"),
      slug: form.get("slug"),
      city: form.get("city"),
      state: form.get("state"),
    });
    revalidatePath("/admin/poles");
    return { status: "success", message: "Polo criado." };
  } catch (error) {
    return failure(error);
  }
}
export async function createTeamAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    const actor = await requireRole("admin");
    const client = await createClient();
    await services.createTeam(client, actor, {
      name: form.get("name"),
      slug: form.get("slug"),
      shortName: form.get("shortName") || null,
      primaryPoleId: form.get("primaryPoleId"),
    });
    revalidatePath("/admin/teams");
    return { status: "success", message: "Equipe criada." };
  } catch (error) {
    return failure(error);
  }
}
export async function createSeasonAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    const actor = await requireRole("admin");
    const client = await createClient();
    await services.createSeason(client, actor, {
      name: form.get("name"),
      code: form.get("code"),
      startsAt: new Date(String(form.get("startsAt"))).toISOString(),
      endsAt: new Date(String(form.get("endsAt"))).toISOString(),
    });
    revalidatePath("/admin/seasons");
    return { status: "success", message: "Temporada criada." };
  } catch (error) {
    return failure(error);
  }
}
