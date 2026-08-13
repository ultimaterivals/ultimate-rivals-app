"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  formationId: z.string().uuid(),
  teamId: z.string().uuid(),
  effectiveAt: z.string().min(1),
  reason: z.string().trim().min(4).max(500),
});

function resultUrl(result: string) {
  return `/admin/equipes?result=${encodeURIComponent(result)}`;
}

export async function linkFormationToTeamAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = schema.safeParse({
    formationId: formData.get("formationId"),
    teamId: formData.get("teamId"),
    effectiveAt: formData.get("effectiveAt"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(resultUrl("invalid"));

  const effectiveAt = new Date(parsed.data.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime())) redirect(resultUrl("invalid-date"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_link_competition_formation_team", {
    target_formation: parsed.data.formationId,
    target_team: parsed.data.teamId,
    effective_at: effectiveAt.toISOString(),
    reason: parsed.data.reason,
  });
  if (error) redirect(resultUrl(error.message));

  revalidatePath("/admin/equipes");
  revalidatePath("/athlete/team");
  revalidatePath("/athlete/ranking");
  redirect(resultUrl("linked"));
}
