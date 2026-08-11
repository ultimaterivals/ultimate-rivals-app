"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const channel = z.enum(["whatsapp", "instagram", "phone", "app", "email", "other"]);

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("RETENTION_FOLLOWUP_NOT_FOUND")) return "not_found";
  if (value.includes("INVALID_RETENTION_CHANNEL")) return "invalid_channel";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("ADMIN_RETENTION_WAIVER_REQUIRED")) return "admin_required";
  if (value.includes("RETENTION_WAIVER_REASON_REQUIRED")) return "waiver_reason";
  return "operation_failed";
}

function finish(success: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/ur-play/retencao");
  revalidatePath("/admin/ur-play/pos-sessao");
  redirect(`/admin/ur-play/retencao?success=${encodeURIComponent(success)}`);
}

function fail(message: string): never {
  redirect(`/admin/ur-play/retencao?error=${encodeURIComponent(errorCode(message))}`);
}

export async function confirmRetentionContactAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      followupId: uuid,
      channel,
      notes: z.string().trim().max(1000),
    })
    .safeParse({
      followupId: formData.get("followupId"),
      channel: formData.get("channel"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_ur_play_retention_contact", {
    target_followup: parsed.data.followupId,
    target_channel: parsed.data.channel,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(error.message);
  finish("contacted");
}

export async function waiveRetentionFollowupAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ followupId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      followupId: formData.get("followupId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("RETENTION_WAIVER_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("waive_ur_play_retention_followup", {
    target_followup: parsed.data.followupId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(error.message);
  finish("waived");
}
