"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ poleId: z.string().uuid() });

function resultUrl(result: string) {
  return `/admin/agenda/polos?result=${encodeURIComponent(result)}`;
}

export async function activatePoleRegionAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = schema.safeParse({ poleId: formData.get("poleId") });
  if (!parsed.success) redirect(resultUrl("invalid"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_pole_region", {
    p_pole_id: parsed.data.poleId,
  });
  if (error) redirect(resultUrl("error"));

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/polos");
  revalidatePath("/admin/atletas/homologacao");
  redirect(resultUrl("activated"));
}
