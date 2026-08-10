import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminUrPlayCloseReadiness } from "@/server/repositories/admin-ur-play-close-repository";
import { getAdminUrPlayCloseSnapshot } from "./admin-ur-play-close-service";

vi.mock("@/server/repositories/admin-ur-play-close-repository", () => ({
  fetchAdminUrPlayCloseReadiness: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminUrPlayCloseReadiness);

describe("admin UR Play close service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("preserves the database close GO decision", async () => {
    repositoryMock.mockResolvedValue({
      rows: [
        {
          sessionId: "session-1",
          session_status: "in_progress",
          total_matches: 3,
          open_matches: 0,
          completed_matches: 3,
          homologated_results: 3,
          pending_results: 0,
          pending_attendance: 0,
          ready: true,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminUrPlayCloseSnapshot(["session-1"]);

    expect(snapshot.sessions[0]).toMatchObject({
      sessionId: "session-1",
      totalMatches: 3,
      openMatches: 0,
      homologatedResults: 3,
      pendingAttendance: 0,
      ready: true,
    });
  });

  it("does not invent readiness after a repository failure", async () => {
    repositoryMock.mockResolvedValue({
      rows: [],
      errors: ["session-1: SESSION_OPERATION_DENIED"],
    });

    const snapshot = await getAdminUrPlayCloseSnapshot(["session-1"]);
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.sourceErrors).toHaveLength(1);
  });
});
