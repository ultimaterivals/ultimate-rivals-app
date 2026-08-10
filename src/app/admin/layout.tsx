import type { ReactNode } from "react";
import { PortalShell, type PortalNavItem } from "@/components/layout/portal-shell";
import {
  adminPortalRoles,
  getAdminModulesForRole,
} from "@/lib/auth/admin-modules";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(adminPortalRoles);
  const navigation: PortalNavItem[] = getAdminModulesForRole(user.role).map(
    ({ key, label, href, group, icon }) => ({ key, label, href, group, icon }),
  );

  return (
    <PortalShell
      portal="Administração"
      userLabel={user.email ?? "Usuário autenticado"}
      navigation={navigation}
    >
      {children}
    </PortalShell>
  );
}
