"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("WAVE_TARGET_NOT_FILLED")) return "target_not_filled";
  if (value.includes("WAVE_MEMBER_NOT_ACTIVATABLE"))
    return "member_not_activatable";
  if (value.includes("ATHLETE_ACTIVATION_BLOCKED"))
    return "activation_blocked";
  if (value.includes("WAVE_IS_CLOSED")) return "wave_closed";
  if (value.includes("ADMIN_REQUIRED")) return "admin_required";
  return "operation_failed";
}

export async function activateWaveBatchExecutionAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      confirmation: z.literal("HOMOLOGAR"),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      confirmation: formData.get("confirmation"),
      reason: formData.get("reason"),
    });

  if (!parsed.success) {
    redirect("/admin/atletas/ondas/executar?error=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_athlete_activation_wave", {
    target_wave_id: parsed.data.waveId,
    target_reason: parsed.data.reason,
  });
  if (error) {
    redirect(
      `/admin/atletas/ondas/executar?wave=${parsed.data.waveId}&error=${errorCode(error.message)}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/atletas");
  revalidatePath("/admin/atletas/ondas");
  revalidatePath("/admin/atletas/ondas/executar");
  revalidatePath("/admin/atletas/homologacao");
  revalidatePath("/admin/atletas/acessos");
  redirect(
    `/admin/atletas/ondas/executar?wave=${parsed.data.waveId}&success=wave_activated`,
  );
}
