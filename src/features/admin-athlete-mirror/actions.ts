"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATHLETE_MIRROR_COOKIE, isAthleteMirrorId } from "@/lib/auth/athlete-mirror-policy";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function startAthleteMirrorAction(formData: FormData) {
  await requireRole("admin");
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!isAthleteMirrorId(athleteId)) redirect("/admin/mirror?invalid=1");

  const client = await createClient();
  const { data: athlete, error } = await client
    .from("athletes")
    .select("id,status")
    .eq("id", athleteId)
    .maybeSingle();
  if (error || !athlete) redirect("/admin/mirror?invalid=1");

  (await cookies()).set(ATHLETE_MIRROR_COOKIE, athlete.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  redirect("/athlete");
}

export async function stopAthleteMirrorAction() {
  await requireRole("admin");
  (await cookies()).delete(ATHLETE_MIRROR_COOKIE);
  redirect("/admin");
}
