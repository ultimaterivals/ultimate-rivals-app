import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminUrPlayStartReadiness } from "@/server/repositories/admin-ur-play-start-repository";
import { getAdminUrPlayStartSnapshot } from "./admin-ur-play-start-service";

vi.mock("@/server/repositories/admin-ur-play-start-repository", () => ({
  fetchAdminUrPlayStartReadiness: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminUrPlayStartReadiness);

describe("admin UR Play start service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("preserves the database GO decision as the source of truth", async () => {
    repositoryMock.mockResolvedValue({
      rows: [
        {
          sessionId: "session-1",
          session_status: "checkin_open",
          critical_ready: 6,
          critical_total: 6,
          court_ready: true,
          minimum_athletes: 4,
          checked_in: 4,
          ready: true,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminUrPlayStartSnapshot(["session-1"]);

    expect(snapshot.sessions[0]).toMatchObject({
      sessionId: "session-1",
      sessionStatus: "checkin_open",
      criticalReady: 6,
      criticalTotal: 6,
      minimumAthletes: 4,
      checkedIn: 4,
      ready: true,
    });
  });

  it("does not manufacture readiness when the repository cannot evaluate a session", async () => {
    repositoryMock.mockResolvedValue({
      rows: [],
      errors: ["session-1: SESSION_OPERATION_DENIED"],
    });

    const snapshot = await getAdminUrPlayStartSnapshot(["session-1"]);

    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.sourceErrors).toHaveLength(1);
  });
});
