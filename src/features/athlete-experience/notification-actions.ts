"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function markNotificationRead(formData: FormData) {
  await requireRole("athlete");
  const id = idSchema.parse(formData.get("notificationId"));
  const client = await createClient();
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error)
    throw new Error("Não foi possível marcar a notificação como lida.");
  revalidatePath("/athlete", "layout");
}

export async function markAllNotificationsRead() {
  await requireRole("athlete");
  const client = await createClient();
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error)
    throw new Error("Não foi possível atualizar suas notificações.");
  revalidatePath("/athlete", "layout");
}
