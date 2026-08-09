import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const { count } = viewer.isMirror
    ? { count: 0 }
    : await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", viewer.athleteId)
        .is("read_at", null);

  return (
    <PortalShell
      portal="Atleta"
      userLabel={viewer.athlete.publicName}
      notificationCount={count ?? 0}
      athleteIdentity={{
        publicName: viewer.athlete.publicName,
        athleteCode: viewer.athlete.athleteCode,
      }}
      athleteMirror={viewer.isMirror ? {
        athleteId: viewer.athleteId,
        publicName: viewer.athlete.publicName,
        athleteCode: viewer.athlete.athleteCode,
      } : null}
    >
      {children}
    </PortalShell>
  );
}
