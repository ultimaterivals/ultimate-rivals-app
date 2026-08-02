import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireAnyRole } from "@/lib/auth/session";
export default async function Layout({ children }: { children: ReactNode }) {
  const actor = await requireAnyRole(["admin", "operator"]);
  return (
    <PortalShell portal="Administração" userLabel={actor.email ?? "Court Ops"}>
      {children}
    </PortalShell>
  );
}
