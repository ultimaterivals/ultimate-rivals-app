import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminAthletesRepositoryData } from "@/server/repositories/admin-athletes-repository";
import { getAdminAthletesSnapshot } from "./admin-athletes-service";

vi.mock("@/server/repositories/admin-athletes-repository", () => ({
  fetchAdminAthletesRepositoryData: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminAthletesRepositoryData);

describe("admin athletes service", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("keeps athletes without engagement history in the official base", async () => {
    repositoryMock.mockResolvedValue({
      athletes: [
        {
          id: "a1",
          public_name: "Nova",
          athlete_code: "UR1",
          status: "active",
          primary_pole_id: null,
        },
      ],
      engagement: [],
      reports: [],
      memberships: [],
      teams: [],
      poles: [],
      errors: [],
    });
    const snapshot = await getAdminAthletesSnapshot();
    expect(snapshot.metrics.total).toBe(1);
    expect(snapshot.filteredRows[0]?.publicName).toBe("Nova");
  });
  it("segments first-only and free-agent athletes", async () => {
    repositoryMock.mockResolvedValue({
      athletes: [
        {
          id: "a1",
          public_name: "Atleta",
          athlete_code: "UR1",
          status: "active",
          primary_pole_id: null,
        },
      ],
      engagement: [
        {
          athlete_id: "a1",
          source: "instagram",
          first_participation_at: "2026-08-01T00:00:00Z",
          second_participation_at: null,
          last_participation_at: "2026-08-01T00:00:00Z",
          participations_30d: 1,
          active_30d: true,
          returning_athlete: false,
          days_since_last_participation: 9,
        },
      ],
      reports: [],
      memberships: [],
      teams: [],
      poles: [],
      errors: [],
    });
    const snapshot = await getAdminAthletesSnapshot({ segment: "first-only" });
    expect(snapshot.metrics.firstOnly).toBe(1);
    expect(snapshot.metrics.freeAgents).toBe(1);
    expect(snapshot.filteredRows).toHaveLength(1);
  });
});
