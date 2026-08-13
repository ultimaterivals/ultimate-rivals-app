import type { ReactNode } from "react";
import { AthleteShell } from "@/components/athlete/athlete-shell";
import { SeasonContextBanner } from "@/components/athlete/season-context-banner";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";

export default async function AthleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireAthleteViewer();

  return (
    <AthleteShell
      userLabel={viewer.athlete.publicName}
      preview={viewer.isPreview ? viewer.athlete : null}
    >
      <SeasonContextBanner />
      {children}
    </AthleteShell>
  );
}
