"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { appRoleSchema, roleHome, type AppRole } from "@/types/auth";

export type LoginState = { error?: string };

async function authenticate(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) return { error: "E-mail ou senha inválidos." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = appRoleSchema.catch("public").parse(profile?.role);
  redirect(roleHome[role]);
}

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

  return (await authenticate(parsed.data.email, parsed.data.password)) ?? {};
}

async function loginAsConfiguredTestUser(role: Extract<AppRole, "admin" | "athlete">) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_TEST_LOGIN !== "true"
  ) {
    redirect("/login");
  }

  const prefix = role === "admin" ? "TEST_ADMIN" : "TEST_ATHLETE";
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  if (!email || !password) {
    redirect("/login?testAccess=not-configured");
  }

  const result = await authenticate(email, password);
  if (result?.error) redirect("/login?testAccess=invalid");
}

export async function loginAsTestAdmin() {
  await loginAsConfiguredTestUser("admin");
}

export async function loginAsTestAthlete() {
  await loginAsConfiguredTestUser("athlete");
}
