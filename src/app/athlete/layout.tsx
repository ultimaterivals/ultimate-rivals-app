import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AthleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(["athlete"]);
  return (
    <PortalShell portal="Atleta" userLabel={user.email ?? "Atleta"}>
      {children}
    </PortalShell>
  );
}
