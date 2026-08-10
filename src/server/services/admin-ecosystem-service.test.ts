import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminEcosystemEvidence } from "@/server/repositories/admin-ecosystem-repository";
import { getAdminEcosystemSnapshot } from "./admin-ecosystem-service";
vi.mock("@/server/repositories/admin-ecosystem-repository", () => ({
  fetchAdminEcosystemEvidence: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminEcosystemEvidence);
describe("ecosystem evidence service", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("does not fabricate a health percentage for non-instrumented areas", async () => {
    repositoryMock.mockResolvedValue({
      evidence: {
        seasons: 1,
        products: 0,
        acquisition: 0,
        audit: 1,
        urPlay: 0,
        leveling: 0,
        ranking: 0,
        teams: 2,
        training: 0,
        competitions: 0,
        coins: 0,
        market: 0,
        sponsors: 0,
        media: 0,
        finance: 0,
        venues: 1,
        staff: 0,
        checklists: 0,
      },
      errors: [],
    });
    const snapshot = await getAdminEcosystemSnapshot();
    expect(snapshot.metrics.totalAreas).toBe(18);
    expect(snapshot.metrics.notInstrumented).toBe(1);
    expect(
      snapshot.areas.find((area) => area.id === "compliance")?.evidenceCount,
    ).toBeNull();
    expect(snapshot.metrics.areasWithEvidence).toBe(4);
  });
});
