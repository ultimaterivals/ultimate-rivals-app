import type { AthletePortalSnapshot } from "@/features/athlete-portal/types";
import type { AthleteViewerContext } from "@/lib/auth/athlete-viewer";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

export async function getAthleteSnapshotForViewer(
  viewer: AthleteViewerContext,
): Promise<AthletePortalSnapshot> {
  if (viewer.isPreview) {
    return getAthletePortalSnapshot({ athleteId: viewer.athleteId });
  }

  if (viewer.userId) {
    return getAthletePortalSnapshot({ userId: viewer.userId });
  }

  return {
    generatedAt: new Date().toISOString(),
    state: "partial",
    identity: {
      id: viewer.athlete.id,
      publicName: viewer.athlete.publicName,
      athleteCode: viewer.athlete.athleteCode,
      avatarUrl: null,
      city: null,
      state: null,
      bio: null,
      instagramHandle: null,
      status: "unlinked",
      primaryPoleId: null,
    },
    teams: null,
    packages: null,
    creditBalance: null,
    creditReserved: null,
    creditConsumed: null,
    summary: null,
    rankings: null,
    primaryRanking: null,
    opportunities: null,
    nextReservation: null,
    billing: null,
    sourceErrors: ["viewer: athlete identity has no valid access link"],
  };
}
