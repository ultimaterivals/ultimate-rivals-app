"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const level = z.enum(["leveling", "n3", "n2", "n1"]);
const transition = z.enum([
  "called",
  "ready",
  "in_progress",
  "cancelled",
  "abandoned",
]);
const technicalAction = z.enum(["ace", "attack", "block", "defense", "assist"]);

function codeFromMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("incomplete match side")) return "incomplete_side";
  if (normalized.includes("duplicate athlete")) return "duplicate_athlete";
  if (normalized.includes("ineligible match participant")) return "ineligible_athlete";
  if (normalized.includes("invalid category gender")) return "category_gender";
  if (normalized.includes("invalid mixed composition")) return "mixed_composition";
  if (normalized.includes("session is not ready")) return "session_not_ready";
  if (normalized.includes("court does not belong")) return "invalid_court";
  if (normalized.includes("invalid match transition")) return "invalid_transition";
  if (normalized.includes("stale rally sequence")) return "stale_rally";
  if (normalized.includes("game is already over")) return "game_over";
  if (normalized.includes("result under review required")) return "review_required";
  if (normalized.includes("result is inconsistent")) return "result_inconsistent";
  if (normalized.includes("denied")) return "operation_denied";
  return "operation_failed";
}

function refresh(matchId?: string) {
  revalidatePath("/admin/ur-play");
  revalidatePath("/admin/ur-play/quadra");
  if (matchId) revalidatePath(`/admin/ur-play/quadra/${matchId}`);
}

function fail(message: string, matchId?: string): never {
  const base = matchId
    ? `/admin/ur-play/quadra/${encodeURIComponent(matchId)}`
    : "/admin/ur-play/quadra";
  redirect(`${base}?error=${encodeURIComponent(codeFromMessage(message))}`);
}

function finish(success: string, matchId?: string): never {
  refresh(matchId);
  const base = matchId
    ? `/admin/ur-play/quadra/${encodeURIComponent(matchId)}`
    : "/admin/ur-play/quadra";
  redirect(`${base}?success=${encodeURIComponent(success)}`);
}

export async function createMatchAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      courtId: uuid,
      formatId: uuid,
      categoryId: uuid,
      level,
      sideA: z.array(uuid).min(1),
      sideB: z.array(uuid).min(1),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      courtId: formData.get("courtId"),
      formatId: formData.get("formatId"),
      categoryId: formData.get("categoryId"),
      level: formData.get("level"),
      sideA: formData.getAll("sideA"),
      sideB: formData.getAll("sideB"),
    });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_court_ops_match", {
    target_session: parsed.data.sessionId,
    target_court: parsed.data.courtId,
    target_format: parsed.data.formatId,
    target_category: parsed.data.categoryId,
    target_level: parsed.data.level,
    side_a: parsed.data.sideA,
    side_b: parsed.data.sideB,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message);
  const matchId = (data as { id?: string } | null)?.id;
  if (!matchId) fail("match_not_created");
  finish("match_created", matchId);
}

export async function transitionMatchAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({ matchId: uuid, status: transition, reason: z.string().max(500) })
    .safeParse({
      matchId: formData.get("matchId"),
      status: formData.get("status"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_court_ops_match", {
    target_match: parsed.data.matchId,
    target_status: parsed.data.status,
    reason: parsed.data.reason || null,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data.matchId);
  finish(`match_${parsed.data.status}`, parsed.data.matchId);
}

export async function recordRallyAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      matchId: uuid,
      winningSideId: uuid,
      nextRally: z.coerce.number().int().positive(),
    })
    .safeParse({
      matchId: formData.get("matchId"),
      winningSideId: formData.get("winningSideId"),
      nextRally: formData.get("nextRally"),
    });
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_match_rally", {
    target_match: parsed.data.matchId,
    target_winning_side: parsed.data.winningSideId,
    expected_rally_number: parsed.data.nextRally,
    client_sequence: parsed.data.nextRally,
    client_recorded_at: new Date().toISOString(),
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data.matchId);
  finish("rally_recorded", parsed.data.matchId);
}

export async function recordTechnicalActionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      matchId: uuid,
      rallyId: uuid,
      athleteId: uuid,
      actionType: technicalAction,
      reason: z.string().max(500),
    })
    .safeParse({
      matchId: formData.get("matchId"),
      rallyId: formData.get("rallyId"),
      athleteId: formData.get("athleteId"),
      actionType: formData.get("actionType"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_match_technical_action", {
    target_rally: parsed.data.rallyId,
    target_athlete: parsed.data.athleteId,
    target_action: parsed.data.actionType,
    correction_reason: parsed.data.reason || null,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data.matchId);
  finish("technical_recorded", parsed.data.matchId);
}

export async function reverseLastRallyAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({ matchId: uuid, rallyId: uuid, reason: z.string().trim().min(5).max(500) })
    .safeParse({
      matchId: formData.get("matchId"),
      rallyId: formData.get("rallyId"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("correct_match_rally", {
    target_rally: parsed.data.rallyId,
    target_correction: "reverse",
    replacement_winning_side: null,
    reason: parsed.data.reason,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data.matchId);
  finish("rally_reversed", parsed.data.matchId);
}

export async function submitMatchReviewAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = uuid.safeParse(formData.get("matchId"));
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_match_for_review", {
    target_match: parsed.data,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data);
  finish("submitted_review", parsed.data);
}

export async function homologateMatchAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = uuid.safeParse(formData.get("matchId"));
  if (!parsed.success) fail("invalid_request");
  const supabase = await createClient();
  const { error } = await supabase.rpc("homologate_match_result", {
    target_match: parsed.data,
    operation_id: randomUUID(),
  });
  if (error) fail(error.message, parsed.data);
  finish("homologated", parsed.data);
}
