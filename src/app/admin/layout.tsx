import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireAnyRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAnyRole(["admin", "operator"]);
  return (
    <PortalShell
      portal="Administração"
      userLabel={user.email ?? "Usuário autenticado"}
      canUseAthleteMirror={user.role === "admin"}
    >
      {children}
    </PortalShell>
  );
}
