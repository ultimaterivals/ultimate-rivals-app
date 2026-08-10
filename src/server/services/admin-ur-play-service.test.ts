import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminUrPlayRepositoryData } from "@/server/repositories/admin-ur-play-repository";
import { getAdminUrPlaySnapshot } from "./admin-ur-play-service";
vi.mock("@/server/repositories/admin-ur-play-repository", () => ({
  fetchAdminUrPlayRepositoryData: vi.fn(),
}));
const repositoryMock = vi.mocked(fetchAdminUrPlayRepositoryData);
describe("admin ur play", () => {
  beforeEach(() => repositoryMock.mockReset());
  it("calculates confirmed occupancy and waitlist separately", async () => {
    repositoryMock.mockResolvedValue({
      sessions: [
        {
          id: "s1",
          name: "UR Play",
          status: "registration_open",
          starts_at: "2026-08-12T23:00:00Z",
          ends_at: "2026-08-13T01:00:00Z",
          pole_id: "p1",
          venue_id: "v1",
          capacity: 8,
          waitlist_capacity: 4,
          price_amount: 35,
          ready_for_matchmaking: false,
        },
      ],
      registrations: [
        {
          session_id: "s1",
          registration_status: "confirmed",
          attendance_status: null,
        },
        {
          session_id: "s1",
          registration_status: "waitlisted",
          attendance_status: null,
        },
      ],
      checkins: [],
      courts: [],
      staff: [],
      scopes: [],
      poles: [{ id: "p1", name: "Contagem" }],
      venues: [{ id: "v1", name: "Arena" }],
      errors: [],
    });
    const snapshot = await getAdminUrPlaySnapshot(
      new Date("2026-08-10T00:00:00Z"),
    );
    expect(snapshot.sessions[0]?.confirmed).toBe(1);
    expect(snapshot.sessions[0]?.waitlisted).toBe(1);
    expect(snapshot.sessions[0]?.fillRate).toBe(13);
  });
});
