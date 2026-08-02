"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as results from "@/server/services/match-results.service";
import * as rallies from "@/server/services/rallies.service";
import * as technical from "@/server/services/technical-actions.service";

const refresh = (matchId: string) => {
  revalidatePath(`/ops/matches/${matchId}`);
  revalidatePath("/athlete/ur-play");
};

export async function recordRallyAction(input: {
  matchId: string;
  winningSideId: string;
  expectedRallyNumber: number;
  clientSequence: number;
  clientRecordedAt: string | null;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator"]);
  const data = await rallies.recordRally(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function correctRallyAction(input: {
  matchId: string;
  rallyId: string;
  correctionType: "reverse" | "replace_winner" | "void";
  replacementWinningSideId: string | null;
  reason: string;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator"]);
  const data = await rallies.correctRally(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function recordTechnicalActionAction(input: {
  matchId: string;
  rallyId: string;
  athleteId: string;
  actionType: "ace" | "attack" | "block" | "defense" | "assist";
  correctionReason: string | null;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator"]);
  const data = await technical.recordTechnicalAction(
    await createClient(),
    input,
  );
  refresh(input.matchId);
  return data;
}

export async function voidTechnicalActionAction(input: {
  matchId: string;
  rallyId: string;
  reason: string;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator"]);
  const data = await technical.voidTechnicalAction(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function submitMatchForReviewAction(input: {
  matchId: string;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator"]);
  const data = await results.submitForReview(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function homologateMatchAction(input: {
  matchId: string;
  operationId: string;
}) {
  await requireAnyRole(["admin", "operator", "pole_manager"]);
  const data = await results.homologateResult(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function requestMatchCorrectionAction(input: {
  matchId: string;
  reason: string;
  operationId: string;
}) {
  await requireAnyRole(["admin"]);
  const data = await results.requestCorrection(await createClient(), input);
  refresh(input.matchId);
  return data;
}

export async function voidMatchAction(input: {
  matchId: string;
  reason: string;
  operationId: string;
}) {
  await requireAnyRole(["admin"]);
  const data = await results.voidResult(await createClient(), input);
  refresh(input.matchId);
  return data;
}
