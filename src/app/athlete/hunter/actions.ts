"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export async function registerHunterInterestAction() {
  const viewer = await requireAthleteViewer();
  if (viewer.isPreview || !viewer.userId) redirect("/admin/preview");

  const client = await createClient();
  const { error } = await client
    .from("athlete_hunter_interests")
    .insert({ athlete_id: viewer.athleteId });

  if (error && error.code !== "23505") {
    redirect("/athlete/hunter?error=save");
  }

  revalidatePath("/athlete/hunter");
  redirect("/athlete/hunter?saved=1");
}
