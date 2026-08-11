"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const channel = z.enum([
  "instagram_post",
  "instagram_story",
  "reel",
  "youtube",
  "whatsapp",
  "app",
  "other",
]);

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("MEDIA_DELIVERABLE_NOT_FOUND")) return "not_found";
  if (value.includes("INVALID_MEDIA_CHANNEL")) return "invalid_channel";
  if (value.includes("MEDIA_PUBLICATION_EVIDENCE_REQUIRED"))
    return "evidence_required";
  if (value.includes("MEDIA_ASSET_SESSION_MISMATCH")) return "asset_mismatch";
  if (value.includes("MEDIA_DELIVERABLE_ALREADY_RESOLVED"))
    return "already_resolved";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("ADMIN_MEDIA_WAIVER_REQUIRED")) return "admin_required";
  if (value.includes("MEDIA_WAIVER_REASON_REQUIRED")) return "waiver_reason";
  return "operation_failed";
}

function finish(success: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/ur-play/midia");
  revalidatePath("/admin/ur-play/pos-sessao");
  redirect(`/admin/ur-play/midia?success=${encodeURIComponent(success)}`);
}

function fail(message: string): never {
  redirect(`/admin/ur-play/midia?error=${encodeURIComponent(errorCode(message))}`);
}

export async function startMediaDeliverableAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      deliverableId: uuid,
      notes: z.string().trim().max(1000),
    })
    .safeParse({
      deliverableId: formData.get("deliverableId"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "set_ur_play_media_deliverable_in_progress",
    {
      target_deliverable: parsed.data.deliverableId,
      target_notes: parsed.data.notes || null,
    },
  );
  if (error) fail(error.message);
  finish("started");
}

export async function publishMediaDeliverableAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      deliverableId: uuid,
      channel,
      publicationUrl: z.string().trim().url().max(2000),
      notes: z.string().trim().max(1000),
    })
    .safeParse({
      deliverableId: formData.get("deliverableId"),
      channel: formData.get("channel"),
      publicationUrl: String(formData.get("publicationUrl") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail("MEDIA_PUBLICATION_EVIDENCE_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_ur_play_media_deliverable", {
    target_deliverable: parsed.data.deliverableId,
    target_channel: parsed.data.channel,
    target_publication_url: parsed.data.publicationUrl,
    target_media_asset: null,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(error.message);
  finish("published");
}

export async function waiveMediaDeliverableAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ deliverableId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      deliverableId: formData.get("deliverableId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail("MEDIA_WAIVER_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("waive_ur_play_media_deliverable", {
    target_deliverable: parsed.data.deliverableId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(error.message);
  finish("waived");
}