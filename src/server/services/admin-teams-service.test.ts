import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminTeamsRepositoryData } from "@/server/repositories/admin-teams-repository";
import { getAdminTeamsSnapshot } from "./admin-teams-service";

vi.mock("@/server/repositories/admin-teams-repository", () => ({
  fetchAdminTeamsRepositoryData: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminTeamsRepositoryData);

describe("admin teams service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("reports canonical doubles occupancy from parameterized formation limits", async () => {
    repositoryMock.mockResolvedValue({
      teams: [
        {
          id: "t1",
          name: "Equipe",
          short_name: null,
          status: "active",
          primary_pole_id: null,
        },
      ],
      summaries: [],
      rosters: [],
      categories: [
        { id: "female", code: "female", name: "Feminino", status: "active" },
      ],
      formats: [
        { id: "doubles", code: "doubles", name: "Duplas", status: "active" },
      ],
      parameters: [
        {
          format_code: "doubles",
          max_formations_per_team_category: 4,
          required_starters: 2,
          max_reserves: 0,
        },
      ],
      poles: [],
      athletes: [],
      athleteIdentities: [],
      memberships: [],
      activeSeason: {
        id: "s1",
        name: "Temporada",
        starts_at: "2026-01-01T00:00:00Z",
        ends_at: "2027-01-01T00:00:00Z",
      },
      formations: Array.from({ length: 3 }, (_, index) => ({
        id: `f${index}`,
        season_id: "s1",
        format_id: "doubles",
        category_id: "female",
        level: "n3",
        team_id: "t1",
        pole_id: null,
        display_name: `Dupla ${index}`,
        status: "active",
      })),
      formationMembers: [],
      errors: [],
    });

    const snapshot = await getAdminTeamsSnapshot();
    expect(snapshot.teams[0]?.doubles[0]?.registeredDoubles).toBe(3);
    expect(snapshot.teams[0]?.doubles[0]?.limit).toBe(4);
    expect(snapshot.teams[0]?.doubles[0]?.maxReserves).toBe(0);
    expect(snapshot.metrics.openDoubleSlots).toBe(1);
  });
});
