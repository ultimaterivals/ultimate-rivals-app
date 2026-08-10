"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const checkKey = z.enum([
  "court_access_confirmed",
  "balls_score_ready",
  "first_aid_ready",
  "device_offline_ready",
  "operation_owner_ready",
  "athlete_briefing_ready",
  "media_ready",
  "reception_ready",
  "water_support_ready",
]);

const schema = z.object({
  sessionId: z.string().uuid(),
  checkKey,
  checked: z.enum(["true", "false"]),
  note: z.string().trim().max(500),
});

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("SESSION_NOT_FOUND")) return "session_not_found";
  if (value.includes("INVALID_PREFLIGHT_KEY")) return "invalid_key";
  if (value.includes("PREFLIGHT_NOTE_TOO_LONG")) return "note_too_long";
  return "operation_failed";
}

export async function updateUrPlayPreflightCheckAction(formData: FormData) {
  await requireRole(["admin", "operator", "pole_manager"]);
  const parsed = schema.safeParse({
    sessionId: formData.get("sessionId"),
    checkKey: formData.get("checkKey"),
    checked: formData.get("checked"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    redirect("/admin/ur-play/preflight?error=invalid_request");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ur_play_session_preflight_check", {
    target_session: parsed.data.sessionId,
    target_key: parsed.data.checkKey,
    target_checked: parsed.data.checked === "true",
    target_note: parsed.data.note || null,
  });
  if (error) {
    redirect(
      `/admin/ur-play/preflight?session=${parsed.data.sessionId}&error=${encodeURIComponent(errorCode(error.message))}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ur-play");
  revalidatePath("/admin/ur-play/preflight");
  revalidatePath("/admin/ur-play/quadra");
  redirect(
    `/admin/ur-play/preflight?session=${parsed.data.sessionId}&success=check_updated`,
  );
}
