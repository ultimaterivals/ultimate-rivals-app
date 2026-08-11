import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/layout/portal-navigation";
import { requireRole } from "@/lib/auth/session";

const athleteNavigation: readonly PortalNavItem[] = [
  {
    key: "athlete-home",
    label: "Meu jogo",
    href: "/athlete",
    group: "Portal",
    icon: "dashboard",
  },
  {
    key: "athlete-agenda",
    label: "Agenda",
    href: "/athlete/agenda",
    group: "Portal",
    icon: "calendar",
  },
  {
    key: "athlete-availability",
    label: "Disponibilidade",
    href: "/athlete/disponibilidade",
    group: "Portal",
    icon: "calendar",
  },
  {
    key: "athlete-ranking",
    label: "Ranking",
    href: "/athlete/ranking",
    group: "Portal",
    icon: "competitions",
  },
  {
    key: "athlete-feedback",
    label: "Feedback",
    href: "/athlete/feedback",
    group: "Portal",
    icon: "intelligence",
  },
  {
    key: "athlete-profile",
    label: "Perfil",
    href: "/athlete/perfil",
    group: "Portal",
    icon: "athletes",
  },
];

export default async function AthleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(["athlete"]);
  return (
    <PortalShell
      portal="Atleta"
      userLabel={user.email ?? "Atleta"}
      navigation={athleteNavigation}
    >
      {children}
    </PortalShell>
  );
}
