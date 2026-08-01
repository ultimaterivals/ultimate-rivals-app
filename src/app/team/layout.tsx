import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireRole } from "@/lib/auth/session";
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await requireRole("team_manager");
  return (
    <PortalShell portal="Equipe" userLabel={user.email ?? "Gestor"}>
      {children}
    </PortalShell>
  );
}
