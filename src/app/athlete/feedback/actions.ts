"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

const feedbackCategory = z.enum([
  "app",
  "game",
  "refereeing",
  "arena",
  "team",
  "suggestion",
  "financial",
  "other",
]);

async function requireWritableAthleteViewer() {
  const viewer = await requireAthleteViewer();
  if (viewer.isPreview || !viewer.userId) redirect("/admin/preview");
  return viewer;
}

export async function submitAthleteSupportAction(formData: FormData) {
  await requireWritableAthleteViewer();
  const parsed = z
    .object({
      category: feedbackCategory,
      message: z.string().trim().min(10).max(2000),
    })
    .safeParse({
      category: formData.get("category"),
      message: String(formData.get("message") ?? ""),
    });

  if (!parsed.success) redirect("/athlete/feedback?supportError=invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "submit_my_athlete_feedback_case",
    {
      target_category: parsed.data.category,
      target_message: parsed.data.message,
    },
  );
  const protocol = (data as { protocol?: string }[] | null)?.[0]?.protocol;

  if (error || !protocol) redirect("/athlete/feedback?supportError=save");
  revalidatePath("/athlete/feedback");
  revalidatePath("/admin/feedback");
  redirect(`/athlete/feedback?protocol=${encodeURIComponent(protocol)}`);
}

export async function submitAthleteFeedbackAction(formData: FormData) {
  await requireWritableAthleteViewer();
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
