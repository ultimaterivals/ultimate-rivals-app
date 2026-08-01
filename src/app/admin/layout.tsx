import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole([
    "admin",
    "operator",
    "pole_manager",
    "team_manager",
  ]);
  return (
    <PortalShell
      portal="Administração"
      userLabel={user.email ?? "Usuário autenticado"}
    >
      {children}
    </PortalShell>
  );
}
