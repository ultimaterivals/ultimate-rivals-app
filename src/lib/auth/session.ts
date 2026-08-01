import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appRoleSchema, roleHome, type AppRole } from "@/types/auth";

export async function getSessionIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const role = appRoleSchema
    .catch("public")
    .parse(data.claims.app_metadata?.role);
  return {
    userId: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    role,
  };
}

export async function requireRole(allowed: readonly AppRole[]) {
  const identity = await getSessionIdentity();
  if (!identity) redirect("/login");
  if (!allowed.includes(identity.role)) redirect(roleHome[identity.role]);
  return identity;
}
