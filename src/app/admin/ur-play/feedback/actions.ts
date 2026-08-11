"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const channel = z.enum(["whatsapp", "email", "instagram", "phone", "other"]);

function mapError(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("FEEDBACK_REQUEST_NOT_FOUND")) return "not_found";
  if (value.includes("INVALID_FEEDBACK_CHANNEL")) return "invalid_channel";
  if (value.includes("FEEDBACK_DISPATCH_EVIDENCE_REQUIRED"))
    return "dispatch_evidence";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("FEEDBACK_NOT_DISPATCHED")) return "not_dispatched";
  if (value.includes("INVALID_FEEDBACK_SCORE")) return "invalid_score";
  if (value.includes("ADMIN_FEEDBACK_WAIVER_REQUIRED")) return "admin_required";
  if (value.includes("FEEDBACK_WAIVER_REASON_REQUIRED")) return "waiver_reason";
  if (value.includes("FEEDBACK_ALREADY_RESPONDED")) return "already_responded";
  return "operation_failed";
}

function finish(code: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/ur-play/feedback");
  revalidatePath("/admin/ur-play/pos-sessao");
  redirect(`/admin/ur-play/feedback?success=${encodeURIComponent(code)}`);
}

function fail(message: string): never {
  redirect(`/admin/ur-play/feedback?error=${encodeURIComponent(mapError(message))}`);
}

export async function confirmFeedbackDispatchAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      requestId: uuid,
      channel,
      evidence: z.string().trim().min(3).max(1000),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      channel: formData.get("channel"),
      evidence: String(formData.get("evidence") ?? ""),
    });
  if (!parsed.success) fail("FEEDBACK_DISPATCH_EVIDENCE_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_ur_play_feedback_dispatch", {
    target_request: parsed.data.requestId,
    target_channel: parsed.data.channel,
    target_evidence: parsed.data.evidence,
  });
  if (error) fail(error.message);
  finish("dispatched");
}

export async function recordFeedbackResponseAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      requestId: uuid,
      score: z.coerce.number().int().min(0).max(10),
      comment: z.string().trim().max(2000),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      score: formData.get("score"),
      comment: String(formData.get("comment") ?? ""),
    });
  if (!parsed.success) fail("INVALID_FEEDBACK_SCORE");

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_ur_play_feedback_response", {
    target_request: parsed.data.requestId,
    target_score: parsed.data.score,
    target_comment: parsed.data.comment || null,
  });
  if (error) fail(error.message);
  finish("response_recorded");
}

export async function waiveFeedbackRequestAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ requestId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      requestId: formData.get("requestId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("FEEDBACK_WAIVER_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("waive_ur_play_feedback_request", {
    target_request: parsed.data.requestId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(error.message);
  finish("waived");
}
