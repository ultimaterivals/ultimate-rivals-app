"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const taskKey = z.enum([
  "ranking_data",
  "ur_coins",
  "finance",
  "incidents",
  "development",
  "media",
  "retention",
  "feedback",
  "report",
]);
const taskStatus = z.enum(["pending", "in_progress", "completed", "waived"]);

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("UR_PLAY_SESSION_NOT_FOUND")) return "session_not_found";
  if (value.includes("SYSTEM_POST_SESSION_TASK_READ_ONLY")) return "system_task";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("POST_SESSION_NOT_READY")) return "not_ready";
  if (value.includes("FINANCE_NOT_READY")) return "finance_not_ready";
  if (value.includes("UR_PLAY_FINANCE_NOT_RECONCILED")) return "finance_not_reconciled";
  if (value.includes("ADMIN_FINANCE_REOPEN_REQUIRED")) return "admin_required";
  if (value.includes("FINANCE_REOPEN_REASON_REQUIRED")) return "finance_reopen_reason";
  if (value.includes("FINANCE_SCOPE_NOT_CONFIRMED")) return "finance_not_confirmed";
  if (value.includes("POST_SESSION_WAIVER_REASON_REQUIRED")) return "waiver_reason";
  if (value.includes("ADMIN_POST_SESSION_WAIVER_REQUIRED")) return "admin_required";
  if (value.includes("POST_SESSION_REOPEN_REASON_REQUIRED")) return "reopen_reason";
  if (value.includes("ADMIN_POST_SESSION_REOPEN_REQUIRED")) return "admin_required";
  if (value.includes("POST_SESSION_NOT_CLOSED")) return "not_closed";
  return "operation_failed";
}

function finish(sessionId: string, success: string): never {
  for (const path of [
    "/admin",
    "/admin/ur-play",
    "/admin/ur-play/pos-sessao",
  ]) {
    revalidatePath(path);
  }
  redirect(
    `/admin/ur-play/pos-sessao?session=${encodeURIComponent(sessionId)}&success=${encodeURIComponent(success)}`,
  );
}

function fail(sessionId: string | null, message: string): never {
  const query = new URLSearchParams({ error: errorCode(message) });
  if (sessionId) query.set("session", sessionId);
  redirect(`/admin/ur-play/pos-sessao?${query.toString()}`);
}

export async function updatePostSessionTaskAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      taskKey,
      status: taskStatus,
      notes: z.string().trim().max(1000),
      waiverReason: z.string().trim().max(500),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      taskKey: formData.get("taskKey"),
      status: formData.get("status"),
      notes: String(formData.get("notes") ?? ""),
      waiverReason: String(formData.get("waiverReason") ?? ""),
    });
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ur_play_post_session_task", {
    target_session: parsed.data.sessionId,
    target_task_key: parsed.data.taskKey,
    target_status: parsed.data.status,
    target_notes: parsed.data.notes || null,
    target_waiver_reason: parsed.data.waiverReason || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, `task_${parsed.data.status}`);
}

export async function refreshPostSessionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = uuid.safeParse(formData.get("sessionId"));
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_refresh_ur_play_post_session", {
    target_session: parsed.data,
  });
  if (error) fail(parsed.data, error.message);
  finish(parsed.data, "refreshed");
}

export async function confirmFinanceScopeAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({ sessionId: uuid, notes: z.string().trim().max(1000) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_ur_play_financial_scope", {
    target_session: parsed.data.sessionId,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "finance_confirmed");
}

export async function reopenFinanceScopeAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ sessionId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail(null, "FINANCE_REOPEN_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ur_play_financial_scope", {
    target_session: parsed.data.sessionId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "finance_reopened");
}

export async function finalizePostSessionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      confirmation: z.literal("FECHAR 360"),
      notes: z.string().trim().max(1000),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      confirmation: formData.get("confirmation"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_ur_play_post_session", {
    target_session: parsed.data.sessionId,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "post_session_closed");
}

export async function reopenPostSessionAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ sessionId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail(null, "POST_SESSION_REOPEN_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ur_play_post_session", {
    target_session: parsed.data.sessionId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "post_session_reopened");
}
