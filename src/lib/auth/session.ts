import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appRoleSchema, roleHome, type AppRole } from "@/types/auth";

export interface SessionIdentity {
  userId: string;
  email: string | null;
  role: AppRole;
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims.sub) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", claimsData.claims.sub)
    .single();

  if (profileError || profile?.status !== "active") return null;
  const role = appRoleSchema.parse(profile.role);
  return {
    userId: claimsData.claims.sub,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : null,
    role,
  };
}

export async function requireUser(): Promise<SessionIdentity> {
  const identity = await getSessionIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function requireRole(role: AppRole): Promise<SessionIdentity> {
  return requireAnyRole([role]);
}

export async function requireAnyRole(
  allowed: readonly AppRole[],
): Promise<SessionIdentity> {
  const identity = await requireUser();
  if (!allowed.includes(identity.role)) redirect(roleHome[identity.role]);
  return identity;
}
