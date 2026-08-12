"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { createClient } from "@/lib/supabase/server";

export async function updateAthleteFeedbackCaseAction(formData: FormData) {
  await requireAdminModule("feedback");
  const parsed = z
    .object({
      caseId: z.string().uuid(),
      status: z.enum(["open", "in_review", "resolved"]),
      resolutionNote: z.string().trim().max(2000),
    })
    .safeParse({
      caseId: formData.get("caseId"),
      status: formData.get("status"),
      resolutionNote: String(formData.get("resolutionNote") ?? ""),
    });

  if (!parsed.success) redirect("/admin/feedback?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_athlete_feedback_case", {
    target_case: parsed.data.caseId,
    target_status: parsed.data.status,
    target_resolution_note: parsed.data.resolutionNote || null,
  });
  if (error) redirect("/admin/feedback?error=save");
  revalidatePath("/admin/feedback");
  redirect("/admin/feedback?success=1");
}
