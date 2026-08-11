import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminDevelopmentRepositoryData } from "@/server/repositories/admin-ur-play-development-repository";
import { getAdminDevelopmentSnapshot } from "./admin-ur-play-development-service";

vi.mock("@/server/repositories/admin-ur-play-development-repository", () => ({
  fetchAdminDevelopmentRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminDevelopmentRepositoryData);

function caseRow(
  status: "pending" | "in_progress" | "resolved" | "waived",
  id: string,
) {
  return {
    id,
    session_id: "session-1",
    athlete_id: `athlete-${id}`,
    leveling_process_id: "process-1",
    current_level: "leveling",
    reasons: ["observations_incomplete"],
    evidence: {
      process_status: "in_progress",
      required_observations: 3,
      completed_observations: 1,
    },
    status,
    recommended_action: "continue_observation",
    resolution_action: status === "resolved" ? "continue_observation" : null,
    resolution_notes:
      status === "resolved" ? "Manter observação nas próximas sessões." : null,
    due_at: "2026-08-12T20:00:00.000Z",
    resolved_at: status === "resolved" ? "2026-08-11T12:00:00.000Z" : null,
    waiver_reason:
      status === "waived" ? "Exceção administrativa documentada" : null,
  };
}

describe("admin UR Play development service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("keeps unresolved development cases separate from completed reviews", async () => {
    repositoryMock.mockResolvedValue({
      cases: [caseRow("pending", "1"), caseRow("resolved", "2")],
      athletes: [
        { id: "athlete-1", public_name: "Ana", athlete_code: "ATL-001" },
        { id: "athlete-2", public_name: "Bia", athlete_code: "ATL-002" },
      ],
      sessions: [
        {
          id: "session-1",
          name: "UR Play 01",
          ends_at: "2026-08-11T20:00:00.000Z",
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminDevelopmentSnapshot();
    expect(snapshot.metrics).toMatchObject({
      total: 2,
      pending: 1,
      resolved: 1,
    });
    expect(snapshot.sessions[0]?.cases[0]).toMatchObject({
      athleteName: "Ana",
      currentLevel: "leveling",
      reasons: ["observations_incomplete"],
    });
  });

  it("returns completed sessions with zero artificial cases", async () => {
    repositoryMock.mockResolvedValue({
      cases: [],
      athletes: [],
      sessions: [
        {
          id: "session-1",
          name: "UR Play 01",
          ends_at: "2026-08-11T20:00:00.000Z",
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminDevelopmentSnapshot();
    expect(snapshot.metrics.total).toBe(0);
    expect(snapshot.sessions[0]?.cases).toEqual([]);
  });
});
