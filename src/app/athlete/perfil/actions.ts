"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const genderSchema = z.enum(["female", "male", "non_binary", "undisclosed"]);

export async function updateMatchmakingIdentityAction(formData: FormData) {
  await requireRole(["athlete"]);
  const parsed = genderSchema.safeParse(formData.get("gender"));
  if (!parsed.success) redirect("/athlete/perfil?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "update_own_athlete_matchmaking_identity",
    { target_gender: parsed.data },
  );

  if (error) redirect("/athlete/perfil?error=save");

  revalidatePath("/athlete");
  revalidatePath("/athlete/perfil");
  revalidatePath("/athlete/agenda");
  redirect("/athlete/perfil?saved=1");
}
