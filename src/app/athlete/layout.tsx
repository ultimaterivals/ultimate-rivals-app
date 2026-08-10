import type { ReactNode } from "react";
import { AthleteShell } from "@/components/athlete/athlete-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AthleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(["athlete"]);

  return (
    <AthleteShell userLabel={user.email ?? "Atleta"}>{children}</AthleteShell>
  );
}
