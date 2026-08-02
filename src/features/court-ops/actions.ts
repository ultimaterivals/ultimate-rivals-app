"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as matches from "@/server/services/matches.service";
import * as queue from "@/server/services/match-queue.service";
const value = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function createMatchAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    sessionId = value(form, "sessionId");
  let row;
  try {
    row = await matches.createMatch(await createClient(), actor, {
      sessionId,
      courtId: form.get("courtId"),
      formatId: form.get("formatId"),
      categoryId: form.get("categoryId"),
      level: form.get("level"),
      sideA: form.getAll("sideA"),
      sideB: form.getAll("sideB"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao criar jogo";
    redirect(
      `/ops/ur-play/${sessionId}/court-ops/new?error=${encodeURIComponent(message)}`,
    );
  }
  redirect(`/ops/matches/${row.id}`);
}
export async function transitionMatchAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId"),
    sessionId = value(form, "sessionId"),
    status = value(form, "status") as
      | "called"
      | "ready"
      | "in_progress"
      | "cancelled"
      | "abandoned";
  await matches.transitionMatch(
    await createClient(),
    actor,
    matchId,
    status,
    value(form, "reason") || null,
    crypto.randomUUID(),
  );
  revalidatePath(`/ops/matches/${matchId}`);
  revalidatePath(`/ops/ur-play/${sessionId}/court-ops`);
}
export async function setQueueStatusAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    sessionId = value(form, "sessionId");
  await queue.setQueueStatus(await createClient(), actor, {
    entryId: form.get("entryId"),
    status: form.get("status"),
  });
  revalidatePath(`/ops/ur-play/${sessionId}/court-ops`);
}
export async function requestSuggestionAction(form: FormData) {
  const sessionId = value(form, "sessionId"),
    params = new URLSearchParams({
      suggest: "1",
      format: value(form, "format"),
      category: value(form, "category"),
      level: value(form, "level"),
    });
  redirect(`/ops/ur-play/${sessionId}/court-ops?${params}`);
}
