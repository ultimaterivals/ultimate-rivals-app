import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appRoleSchema, roleHome, type AppRole } from "@/types/auth";

export function resolveSessionRole(
  appMetadataRole: unknown,
  profileRole: unknown,
): AppRole {
  const appMetadata = appRoleSchema.safeParse(appMetadataRole);
  if (appMetadata.success) return appMetadata.data;

  const profile = appRoleSchema.safeParse(profileRole);
  return profile.success ? profile.data : "public";
}

export async function getSessionIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();
  const role = resolveSessionRole(
    data.claims.app_metadata?.role,
    profile?.role,
  );
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
