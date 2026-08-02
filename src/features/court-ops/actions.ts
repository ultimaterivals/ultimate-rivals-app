"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as matches from "@/server/services/matches.service";
import * as queue from "@/server/services/match-queue.service";
import * as squad from "@/server/services/match-squad.service";
import * as courts from "@/server/services/court-allocation.service";
const value = (form: FormData, key: string) => String(form.get(key) ?? "");
const values = (form: FormData, key: string) =>
  form.getAll(key).map(String).filter(Boolean);
const optional = (form: FormData, key: string) => value(form, key) || null;

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
      sideA: values(form, "sideA"),
      sideB: values(form, "sideB"),
      sideAReserves: values(form, "sideAReserves"),
      sideBReserves: values(form, "sideBReserves"),
      sideARosterId: optional(form, "sideARosterId"),
      sideBRosterId: optional(form, "sideBRosterId"),
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

function matchErrorPath(matchId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Falha no squad";
  return `/ops/matches/${matchId}?error=${encodeURIComponent(message)}`;
}

export async function addReserveAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId");
  try {
    await squad.addReserve(await createClient(), actor, {
      matchId,
      sideId: form.get("sideId"),
      athleteId: form.get("athleteId"),
      rosterId: optional(form, "rosterId"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    redirect(matchErrorPath(matchId, error));
  }
  revalidatePath(`/ops/matches/${matchId}`);
}

export async function reservePresenceAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId");
  try {
    await squad.confirmReservePresence(await createClient(), actor, {
      memberId: form.get("memberId"),
      presence: form.get("presence"),
      reason: form.get("reason"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    redirect(matchErrorPath(matchId, error));
  }
  revalidatePath(`/ops/matches/${matchId}`);
}

export async function removeReserveAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId");
  try {
    await squad.removeReserve(await createClient(), actor, {
      memberId: form.get("memberId"),
      disposition: form.get("disposition"),
      reason: form.get("reason"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    redirect(matchErrorPath(matchId, error));
  }
  revalidatePath(`/ops/matches/${matchId}`);
}

export async function promoteReserveAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId");
  try {
    await squad.promoteReserveToStarter(await createClient(), actor, {
      reserveMemberId: form.get("reserveMemberId"),
      participantId: form.get("participantId"),
      outgoingDisposition: form.get("outgoingDisposition"),
      reason: form.get("reason"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    redirect(matchErrorPath(matchId, error));
  }
  revalidatePath(`/ops/matches/${matchId}`);
}

export async function changeMatchCourtAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]),
    matchId = value(form, "matchId");
  try {
    await courts.changeMatchCourt(await createClient(), actor, {
      matchId,
      courtId: form.get("courtId"),
      reason: form.get("reason"),
      operationId: crypto.randomUUID(),
    });
  } catch (error) {
    redirect(matchErrorPath(matchId, error));
  }
  revalidatePath(`/ops/matches/${matchId}`);
}
