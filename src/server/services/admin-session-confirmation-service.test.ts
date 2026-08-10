import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminSessionConfirmationRepositoryData } from "@/server/repositories/admin-session-confirmation-repository";
import { getAdminSessionConfirmationSnapshot } from "./admin-session-confirmation-service";

vi.mock("@/server/repositories/admin-session-confirmation-repository", () => ({
  fetchAdminSessionConfirmationRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminSessionConfirmationRepositoryData);

describe("admin session confirmation service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("keeps pending opportunities separate and attaches real demand metrics", async () => {
    repositoryMock.mockResolvedValue({
      opportunities: [
        {
          id: "op-1",
          title: "UR Play Contagem",
          status: "forming",
          starts_at: "2026-08-13T22:00:00.000Z",
          ends_at: "2026-08-14T00:00:00.000Z",
          pole_id: "pole-1",
          venue_id: null,
          court_id: null,
          level: "n2",
          format_code: "doubles",
          category_code: "female",
          min_formations: 1,
          target_formations: 4,
          capacity_athletes: 8,
        },
      ],
      demand: [
        {
          id: "op-1",
          interested_count: 5,
          ready_formations: 2,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminSessionConfirmationSnapshot();

    expect(snapshot.opportunities).toHaveLength(1);
    expect(snapshot.opportunities?.[0]?.interestedCount).toBe(5);
    expect(snapshot.opportunities?.[0]?.readyFormations).toBe(2);
    expect(snapshot.opportunities?.[0]?.venueId).toBeNull();
    expect(snapshot.sourceErrors).toEqual([]);
  });

  it("does not fabricate metrics when a source is unavailable", async () => {
    repositoryMock.mockResolvedValue({
      opportunities: null,
      demand: null,
      errors: ["demand_opportunities: unavailable"],
    });

    const snapshot = await getAdminSessionConfirmationSnapshot();

    expect(snapshot.opportunities).toBeNull();
    expect(snapshot.sourceErrors).toEqual([
      "demand_opportunities: unavailable",
    ]);
  });
});
