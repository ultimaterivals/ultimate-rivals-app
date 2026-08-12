"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { roleHome } from "@/types/auth";

export type LoginState = { error?: string };
export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "E-mail ou senha inválidos." };
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("profile_id", data.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (athlete) redirect("/athlete");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = resolveSessionRole(data.user.app_metadata.role, profile?.role);
  redirect(roleHome[role]);
}
