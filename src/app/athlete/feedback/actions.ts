"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function submitAthleteFeedbackAction(formData: FormData) {
  await requireRole(["athlete"]);
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      score: z.coerce.number().int().min(0).max(10),
      comment: z.string().trim().max(2000),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      score: formData.get("score"),
      comment: String(formData.get("comment") ?? ""),
    });

  if (!parsed.success) redirect("/athlete/feedback?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_my_ur_play_feedback", {
    target_request: parsed.data.requestId,
    target_score: parsed.data.score,
    target_comment: parsed.data.comment || null,
  });

  if (error) redirect("/athlete/feedback?error=save");
  revalidatePath("/athlete");
  revalidatePath("/athlete/feedback");
  revalidatePath("/admin/ur-play/feedback");
  redirect("/athlete/feedback?saved=1");
}
