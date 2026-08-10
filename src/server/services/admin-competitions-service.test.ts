import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminCompetitionsRepositoryData } from "@/server/repositories/admin-competitions-repository";
import { getAdminCompetitionsSnapshot } from "./admin-competitions-service";
vi.mock("@/server/repositories/admin-competitions-repository", () => ({
  fetchAdminCompetitionsRepositoryData: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminCompetitionsRepositoryData);
describe("admin competitions service", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("computes readiness from evidence instead of manual percent", async () => {
    repositoryMock.mockResolvedValue({
      tournaments: [
        {
          id: "t1",
          product: "series",
          name: "UR Series",
          status: "draft",
          starts_at: "2026-09-01T00:00:00Z",
          ends_at: "2026-09-02T00:00:00Z",
          pole_id: null,
          venue_id: "v1",
          calendar_event_id: "e1",
        },
      ],
      divisions: [{ id: "d1", tournament_id: "t1", status: "active" }],
      registrations: [
        {
          division_id: "d1",
          status: "confirmed",
          eligibility_status: "eligible",
        },
      ],
      matches: [],
      staff: [{ tournament_id: "t1", status: "active" }],
      prizes: [{ id: "p1", tournament_id: "t1", status: "draft" }],
      checklists: [],
      errors: [],
    });
    const snapshot = await getAdminCompetitionsSnapshot();
    expect(snapshot.competitions[0]?.readiness).toBe(100);
    expect(snapshot.competitions[0]?.eligibleRegistrations).toBe(1);
  });
});
