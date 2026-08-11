"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const resolutionAction = z.enum([
  "continue_observation",
  "start_leveling_process",
  "queue_level_review",
  "development_followup_recorded",
  "no_change_required",
  "other",
]);

function codeFromMessage(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("UR_PLAY_SESSION_NOT_FOUND")) return "session_not_found";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("WAIVER_REASON")) return "waiver_reason";
  if (value.includes("REOPEN_REASON")) return "reopen_reason";
  if (value.includes("ADMIN_REQUIRED")) return "admin_required";
  if (value.includes("NOTES_REQUIRED")) return "notes_required";
  if (value.includes("DEVELOPMENT_CASE_NOT_FOUND")) return "case_not_found";
  if (value.includes("DEVELOPMENT")) return "invalid_request";
  return "operation_failed";
}

function fail(sessionId: string | null, message: string): never {
  const query = new URLSearchParams({ error: codeFromMessage(message) });
  if (sessionId) query.set("session", sessionId);
  redirect(`/admin/ur-play/desenvolvimento?${query.toString()}`);
}

function finish(sessionId: string, success: string): never {
  for (const path of [
    "/admin/ur-play/desenvolvimento",
    "/admin/ur-play/pos-sessao",
    "/admin/ur-play",
  ]) {
    revalidatePath(path);
  }
  redirect(
    `/admin/ur-play/desenvolvimento?session=${encodeURIComponent(sessionId)}&success=${encodeURIComponent(success)}`,
  );
}

export async function refreshDevelopmentAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z.object({ sessionId: uuid }).safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) fail(null, "DEVELOPMENT_INVALID");

  const supabase = await createClient();
  const { error } = await supabase.rpc("refresh_ur_play_development_cases", {
    target_session: parsed.data.sessionId,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "refreshed");
}

export async function resolveDevelopmentCaseAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      caseId: uuid,
      action: resolutionAction,
      notes: z.string().trim().max(1500),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      caseId: formData.get("caseId"),
      action: formData.get("action"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail(null, "DEVELOPMENT_INVALID");

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_ur_play_development_case", {
    target_case: parsed.data.caseId,
    target_action: parsed.data.action,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "case_resolved");
}

export async function waiveDevelopmentCaseAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      sessionId: uuid,
      caseId: uuid,
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      caseId: formData.get("caseId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail(null, "DEVELOPMENT_WAIVER_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("waive_ur_play_development_case", {
    target_case: parsed.data.caseId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "case_waived");
}

export async function reopenDevelopmentCaseAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      sessionId: uuid,
      caseId: uuid,
      reason: z.string().trim().min(10).max(500),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      caseId: formData.get("caseId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail(null, "DEVELOPMENT_REOPEN_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ur_play_development_case", {
    target_case: parsed.data.caseId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "case_reopened");
}
