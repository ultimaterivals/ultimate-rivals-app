"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ATHLETE_PREVIEW_COOKIE,
  isAthletePreviewId,
} from "@/lib/auth/athlete-preview-policy";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function startAthletePreviewAction(formData: FormData) {
  await requireRole(["admin"]);

  const athleteId = String(formData.get("athleteId") ?? "");
  if (!isAthletePreviewId(athleteId)) {
    redirect("/admin/preview?invalid=1");
  }

  const client = await createClient();
  const { data: athlete, error } = await client
    .from("athletes")
    .select("id")
    .eq("id", athleteId)
    .maybeSingle();

  if (error || !athlete) redirect("/admin/preview?invalid=1");

  (await cookies()).set(ATHLETE_PREVIEW_COOKIE, athlete.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  redirect("/athlete");
}

export async function stopAthletePreviewAction() {
  await requireRole(["admin"]);
  (await cookies()).delete(ATHLETE_PREVIEW_COOKIE);
  redirect("/admin/preview");
}
