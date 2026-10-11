"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const responseSchema = z.object({
  invitationId: z.string().uuid(),
  response: z.enum(["accept", "decline"]),
});

export async function respondToTeamInvitationAction(formData: FormData) {
  await requireRole(["athlete"]);
  const parsed = responseSchema.safeParse({
    invitationId: formData.get("invitationId"),
    response: formData.get("response"),
  });
  if (!parsed.success) redirect("/athlete/team?invitation=invalid");

  const { error } = await (
    await createClient()
  ).rpc("athlete_respond_to_team_invitation", {
    p_invitation_id: parsed.data.invitationId,
    p_accept: parsed.data.response === "accept",
  });
  if (error) redirect("/athlete/team?invitation=error");

  revalidatePath("/athlete/team");
  revalidatePath("/athlete");
  revalidatePath("/admin/equipes");
  redirect(
    `/athlete/team?invitation=${parsed.data.response === "accept" ? "accepted" : "declined"}`,
  );
}
