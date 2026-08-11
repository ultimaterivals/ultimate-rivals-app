import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminPostSessionRepositoryData } from "@/server/repositories/admin-ur-play-post-session-repository";
import { getAdminPostSessionSnapshot } from "./admin-ur-play-post-session-service";

vi.mock("@/server/repositories/admin-ur-play-post-session-repository", () => ({
  fetchAdminPostSessionRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminPostSessionRepositoryData);
const session = {
  id: "session-1",
  name: "UR Play Teste",
  status: "completed",
  starts_at: "2026-08-10T20:00:00.000Z",
  ends_at: "2026-08-10T22:00:00.000Z",
  pole_id: "pole-1",
  venue_id: "venue-1",
};

function task(task_key: string, status = "completed") {
  return {
    id: `task-${task_key}`,
    session_id: "session-1",
    task_key,
    status,
    managed_by: ["ranking_data", "ur_coins"].includes(task_key)
      ? "system"
      : "human",
    blocking: true,
    due_at: "2026-08-12T22:00:00.000Z",
    notes: null,
    evidence:
      task_key === "ranking_data"
        ? { completed_matches: 2, ranked_matches: 2, ranking_transactions: 8 }
        : {},
    completed_at: status === "completed" ? "2026-08-10T23:00:00.000Z" : null,
    waived_at: null,
    waiver_reason: null,
  };
}

const allKeys = [
  "ranking_data",
  "ur_coins",
  "finance",
  "incidents",
  "development",
  "media",
  "retention",
  "feedback",
  "report",
];

describe("admin UR Play post-session 360 service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("preserves a database GO decision only after all nine fronts are resolved", async () => {
    repositoryMock.mockResolvedValue({
      sessions: [session],
      poles: [{ id: "pole-1", name: "Belo Horizonte" }],
      venues: [{ id: "venue-1", name: "Arena UR" }],
      tasks: allKeys.map((key) => task(key)),
      closures: [],
      registrations: [
        {
          session_id: "session-1",
          registration_status: "confirmed",
          attendance_status: "present",
          payment_status: "paid",
        },
      ],
      readiness: [
        {
          sessionId: "session-1",
          row: {
            total_tasks: 9,
            completed_tasks: 9,
            waived_tasks: 0,
            pending_tasks: 0,
            overdue_tasks: 0,
            ready: true,
            closed: false,
          },
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminPostSessionSnapshot();
    const selected = snapshot.sessions[0];
    expect(selected).toBeDefined();

    expect(selected).toMatchObject({
      name: "UR Play Teste",
      poleName: "Belo Horizonte",
      venueName: "Arena UR",
      confirmedAthletes: 1,
      presentAthletes: 1,
      readiness: { totalTasks: 9, pendingTasks: 0, ready: true, closed: false },
    });
    expect(snapshot.metrics.ready).toBe(1);
    expect(
      selected?.tasks.find((item) => item.key === "ranking_data")?.evidence,
    ).toMatchObject({
      completed_matches: 2,
      ranked_matches: 2,
    });
  });

  it("does not invent closure when a mandatory front remains pending", async () => {
    repositoryMock.mockResolvedValue({
      sessions: [session],
      poles: [],
      venues: [],
      tasks: allKeys.map((key) =>
        task(key, key === "media" ? "pending" : "completed"),
      ),
      closures: [],
      registrations: [],
      readiness: [
        {
          sessionId: "session-1",
          row: {
            total_tasks: 9,
            completed_tasks: 8,
            waived_tasks: 0,
            pending_tasks: 1,
            overdue_tasks: 0,
            ready: false,
            closed: false,
          },
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminPostSessionSnapshot();
    const selected = snapshot.sessions[0];
    expect(selected).toBeDefined();
    expect(snapshot.metrics.pending).toBe(1);
    expect(snapshot.metrics.closed).toBe(0);
    expect(selected?.readiness.ready).toBe(false);
  });
});
