import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminTeamsRepositoryData } from "@/server/repositories/admin-teams-repository";
import { getAdminTeamsSnapshot } from "./admin-teams-service";

vi.mock("@/server/repositories/admin-teams-repository", () => ({ fetchAdminTeamsRepositoryData: vi.fn() }));
const repositoryMock = vi.mocked(fetchAdminTeamsRepositoryData);

describe("admin teams service", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("reports doubles occupancy against the official limit of five", async () => {
    repositoryMock.mockResolvedValue({ teams: [{ id: "t1", name: "Equipe", short_name: null, status: "active", primary_pole_id: null }], summaries: [], rosters: Array.from({ length: 3 }, (_, index) => ({ id: `r${index}`, team_id: "t1", category_id: "female", format_id: "doubles", status: "active" })), categories: [{ id: "female", code: "female", name: "Feminino", status: "active" }], formats: [{ id: "doubles", code: "doubles", name: "Duplas", status: "active" }], poles: [], athletes: [], memberships: [], errors: [] });
    const snapshot = await getAdminTeamsSnapshot();
    expect(snapshot.teams[0]?.doubles[0]?.registeredDoubles).toBe(3);
    expect(snapshot.teams[0]?.doubles[0]?.limit).toBe(5);
    expect(snapshot.metrics.openDoubleSlots).toBe(2);
  });
});
