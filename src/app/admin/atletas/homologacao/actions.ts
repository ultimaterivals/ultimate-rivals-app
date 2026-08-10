"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ athleteId: z.string().uuid() });

function resultUrl(result: string) {
  return `/admin/atletas/homologacao?result=${encodeURIComponent(result)}`;
}

export async function activateAthleteAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = schema.safeParse({ athleteId: formData.get("athleteId") });
  if (!parsed.success) redirect(resultUrl("invalid"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_athlete", {
    p_athlete_id: parsed.data.athleteId,
  });
  if (error) {
    if (error.message.includes("ATHLETE_ACTIVATION_BLOCKED")) {
      redirect(resultUrl("blocked"));
    }
    redirect(resultUrl("error"));
  }

  revalidatePath("/admin/atletas");
  revalidatePath("/admin/atletas/homologacao");
  revalidatePath("/admin/atletas/acessos");
  redirect(resultUrl("activated"));
}
