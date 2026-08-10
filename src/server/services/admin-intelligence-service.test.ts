import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminIntelligenceRepositoryData } from "@/server/repositories/admin-intelligence-repository";
import { getAdminIntelligenceSnapshot } from "./admin-intelligence-service";
vi.mock("@/server/repositories/admin-intelligence-repository", () => ({
  fetchAdminIntelligenceRepositoryData: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminIntelligenceRepositoryData);
describe("admin intelligence", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("derives activation rates and actionable segments", async () => {
    repositoryMock.mockResolvedValue({
      acquisition: [
        {
          source: "instagram",
          visitors: 100,
          signups: 20,
          interests: 15,
          reservations: 10,
          first_participation: 8,
          second_participation: 4,
          returning: 3,
        },
      ],
      engagement: [
        {
          athlete_id: "a1",
          first_participation_at: "2026-08-01",
          second_participation_at: null,
          active_30d: true,
          days_since_last_participation: 15,
        },
      ],
      demand: [],
      errors: [],
    });
    const snapshot = await getAdminIntelligenceSnapshot();
    expect(snapshot.sources?.[0]?.firstToSecondRate).toBe(50);
    expect(snapshot.metrics.firstOnlyAthletes).toBe(1);
    expect(snapshot.insights.some((item) => item.id === "activation")).toBe(
      true,
    );
  });
});
