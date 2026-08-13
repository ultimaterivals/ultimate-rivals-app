"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const linkSchema = z.object({
  formationId: z.string().uuid(),
  teamId: z.string().uuid(),
  effectiveAt: z.string().min(1),
  reason: z.string().trim().min(4).max(500),
});

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().max(40).optional(),
  primaryPoleId: z.string().uuid(),
});

const activateTeamSchema = z.object({
  teamId: z.string().uuid(),
});

function resultUrl(result: string) {
  return `/admin/equipes?result=${encodeURIComponent(result)}`;
}

export async function createTeamAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName") || undefined,
    primaryPoleId: formData.get("primaryPoleId"),
  });
  if (!parsed.success) redirect(resultUrl("invalid-team"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_team", {
    p_name: parsed.data.name,
    p_primary_pole_id: parsed.data.primaryPoleId,
    p_short_name: parsed.data.shortName ?? null,
  });
  if (error) redirect(resultUrl(error.message));

  revalidatePath("/admin/equipes");
  redirect(resultUrl("team-created"));
}

export async function activateTeamAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = activateTeamSchema.safeParse({
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) redirect(resultUrl("invalid-team"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_team", {
    p_team_id: parsed.data.teamId,
  });
  if (error) redirect(resultUrl(error.message));

  revalidatePath("/admin/equipes");
  revalidatePath("/athlete/team");
  redirect(resultUrl("team-activated"));
}

export async function linkFormationToTeamAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = linkSchema.safeParse({
    formationId: formData.get("formationId"),
    teamId: formData.get("teamId"),
    effectiveAt: formData.get("effectiveAt"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(resultUrl("invalid"));

  const effectiveAt = new Date(parsed.data.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime())) redirect(resultUrl("invalid-date"));

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "admin_link_competition_formation_team",
    {
      target_formation: parsed.data.formationId,
      target_team: parsed.data.teamId,
      effective_at: effectiveAt.toISOString(),
      reason: parsed.data.reason,
    },
  );
  if (error) redirect(resultUrl(error.message));

  revalidatePath("/admin/equipes");
  revalidatePath("/athlete/team");
  revalidatePath("/athlete/ranking");
  redirect(resultUrl("linked"));
}
