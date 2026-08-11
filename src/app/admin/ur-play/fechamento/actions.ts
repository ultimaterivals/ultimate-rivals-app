"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  sessionId: z.string().uuid(),
  confirmation: z.literal("ENCERRAR"),
  overrideReason: z.string().trim().max(500),
});

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("UR_PLAY_SESSION_NOT_FOUND")) return "session_not_found";
  if (value.includes("UR_PLAY_CLOSE_REQUIRES_IN_PROGRESS")) {
    return "requires_in_progress";
  }
  if (value.includes("UR_PLAY_CLOSE_NOT_READY")) return "close_not_ready";
  if (value.includes("ADMIN_CLOSE_OVERRIDE_REASON_REQUIRED")) {
    return "override_reason_required";
  }
  return "operation_failed";
}

export async function completeUrPlaySessionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = schema.safeParse({
    sessionId: formData.get("sessionId"),
    confirmation: formData.get("confirmation"),
    overrideReason: formData.get("overrideReason") ?? "",
  });
  if (!parsed.success) {
    redirect("/admin/ur-play/fechamento?error=invalid_request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_ur_play_session", {
    target_session_id: parsed.data.sessionId,
    override_reason: parsed.data.overrideReason || null,
  });
  if (error) {
    redirect(
      `/admin/ur-play/fechamento?session=${parsed.data.sessionId}&error=${encodeURIComponent(errorCode(error.message))}`,
    );
  }

  const overridden = Boolean(
    data && typeof data === "object" && "overridden" in data && data.overridden,
  );

  for (const path of [
    "/admin",
    "/admin/ur-play",
    "/admin/ur-play/quadra",
    "/admin/ur-play/presenca",
    "/admin/ur-play/fechamento",
  ]) {
    revalidatePath(path);
  }

  redirect(
    `/admin/ur-play/fechamento?success=${overridden ? "completed_override" : "completed"}`,
  );
}
