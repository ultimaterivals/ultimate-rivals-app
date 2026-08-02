import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id,public_name,athlete_code")
    .eq("profile_id", user.userId)
    .maybeSingle();
  const { count } = athlete
    ? await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", athlete.id)
        .is("read_at", null)
    : { count: 0 };
  return (
    <PortalShell
      portal="Atleta"
      userLabel={athlete?.public_name ?? "Atleta"}
      notificationCount={count ?? 0}
      athleteIdentity={
        athlete
          ? {
              publicName: athlete.public_name,
              athleteCode: athlete.athlete_code,
            }
          : null
      }
    >
      {children}
    </PortalShell>
  );
}
