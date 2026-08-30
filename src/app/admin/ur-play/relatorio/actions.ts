"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const category = z.enum([
  "operation",
  "sports",
  "finance",
  "safety",
  "development",
  "media",
  "retention",
  "feedback",
  "product",
  "commercial",
  "other",
]);
const priority = z.enum(["low", "medium", "high", "critical"]);

function mapError(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("REPORT_ALREADY_FINALIZED")) return "already_finalized";
  if (value.includes("REPORT_DEPENDENCIES_PENDING")) return "dependencies_pending";
  if (value.includes("REPORT_REFLECTION_INCOMPLETE")) return "reflection_incomplete";
  if (value.includes("REPORT_ACTION_REQUIRED")) return "action_required";
  if (value.includes("REPORT_ACTION_TITLE_REQUIRED")) return "action_title";
  if (value.includes("REPORT_ACTION_OWNER_INVALID")) return "action_owner";
  if (value.includes("REPORT_ACTION_DUE_AT_REQUIRED")) return "action_due";
  if (value.includes("ADMIN_REPORT_REOPEN_REQUIRED")) return "admin_required";
  if (value.includes("REPORT_REOPEN_REASON_REQUIRED")) return "reopen_reason";
  if (value.includes("REPORT_ACTION_WAIVER_REASON_REQUIRED")) return "waiver_reason";
  return "operation_failed";
}

function finish(code: string, sessionId?: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/ur-play/relatorio");
  revalidatePath("/admin/ur-play/pos-sessao");
  const suffix = sessionId ? `&session=${encodeURIComponent(sessionId)}` : "";
  redirect(`/admin/ur-play/relatorio?success=${encodeURIComponent(code)}${suffix}`);
}

function fail(message: string): never {
  redirect(`/admin/ur-play/relatorio?error=${encodeURIComponent(mapError(message))}`);
}

export async function saveSessionReportDraftAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      whatWorked: z.string().trim().max(4000),
      risksAndFailures: z.string().trim().max(4000),
      keyLearning: z.string().trim().max(4000),
      decisionSummary: z.string().trim().max(4000),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      whatWorked: String(formData.get("whatWorked") ?? ""),
      risksAndFailures: String(formData.get("risksAndFailures") ?? ""),
      keyLearning: String(formData.get("keyLearning") ?? ""),
      decisionSummary: String(formData.get("decisionSummary") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ur_play_session_report_draft", {
    target_session: parsed.data.sessionId,
    target_what_worked: parsed.data.whatWorked,
    target_risks_and_failures: parsed.data.risksAndFailures,
    target_key_learning: parsed.data.keyLearning,
    target_decision_summary: parsed.data.decisionSummary,
  });
  if (error) fail(error.message);
  finish("draft_saved", parsed.data.sessionId);
}

export async function addSessionReportActionAction(formData: FormData) {
  const identity = await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      title: z.string().trim().min(5).max(180),
      description: z.string().trim().max(2000),
      category,
      priority,
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: formData.get("category"),
      priority: formData.get("priority"),
      dueDate: String(formData.get("dueDate") ?? ""),
    });
  if (!parsed.success) fail("REPORT_ACTION_TITLE_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_ur_play_report_action", {
    target_session: parsed.data.sessionId,
    target_title: parsed.data.title,
    target_description: parsed.data.description || null,
    target_category: parsed.data.category,
    target_priority: parsed.data.priority,
    target_owner: identity.userId,
    target_due_at: `${parsed.data.dueDate}T23:59:59-03:00`,
  });
  if (error) fail(error.message);
  finish("action_added", parsed.data.sessionId);
}

export async function finalizeSessionReportAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z.object({ sessionId: uuid }).safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_ur_play_session_report", {
    target_session: parsed.data.sessionId,
  });
  if (error) fail(error.message);
  finish("finalized", parsed.data.sessionId);
}

export async function reopenSessionReportAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ sessionId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("REPORT_REOPEN_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ur_play_session_report", {
    target_session: parsed.data.sessionId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(error.message);
  finish("reopened", parsed.data.sessionId);
}

export async function resolveSessionReportActionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      actionId: uuid,
      status: z.enum(["completed", "waived"]),
      reason: z.string().trim().max(500),
    })
    .safeParse({
      actionId: formData.get("actionId"),
      status: formData.get("status"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_ur_play_report_action_status", {
    target_action: parsed.data.actionId,
    target_status: parsed.data.status,
    target_reason: parsed.data.reason || null,
  });
  if (error) fail(error.message);
  finish("action_resolved");
}


