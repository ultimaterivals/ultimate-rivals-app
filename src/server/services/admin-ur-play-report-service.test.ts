import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminReportRepositoryData } from "@/server/repositories/admin-ur-play-report-repository";
import { getAdminReportSnapshot } from "./admin-ur-play-report-service";

vi.mock("@/server/repositories/admin-ur-play-report-repository", () => ({
  fetchAdminReportRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminReportRepositoryData);

describe("admin UR Play report service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("consolidates attendance, upstream readiness and action backlog", async () => {
    repositoryMock.mockResolvedValue({
      reports: [
        {
          id: "report-1",
          session_id: "session-1",
          status: "draft",
          report_version: 0,
          system_snapshot: {},
          snapshot_at: "2026-08-11T20:00:00.000Z",
          what_worked: "Boa organização de quadra.",
          risks_and_failures: "Atraso na abertura da recepção.",
          key_learning: "Antecipar o briefing operacional.",
          decision_summary: "Abrir recepção com maior antecedência.",
          finalized_at: null,
          reopen_reason: null,
        },
      ],
      actions: [
        {
          id: "action-1",
          report_id: "report-1",
          session_id: "session-1",
          title: "Antecipar recepção",
          description: null,
          category: "operation",
          priority: "high",
          owner_id: "user-1",
          due_at: "2099-08-12T18:00:00.000Z",
          status: "open",
          waiver_reason: null,
        },
      ],
      sessions: [
        {
          id: "session-1",
          name: "UR Play 01",
          ends_at: "2026-08-11T18:00:00.000Z",
        },
      ],
      closures: [],
      registrations: [
        {
          session_id: "session-1",
          registration_status: "confirmed",
          attendance_status: "present",
        },
        {
          session_id: "session-1",
          registration_status: "confirmed",
          attendance_status: "no_show",
        },
      ],
      tasks: [
        {
          session_id: "session-1",
          task_key: "finance",
          status: "completed",
          blocking: true,
          evidence: { recorded_net_amount: 100 },
        },
        {
          session_id: "session-1",
          task_key: "media",
          status: "in_progress",
          blocking: true,
          evidence: {},
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminReportSnapshot();
    expect(snapshot.reports[0]).toMatchObject({
      confirmedAthletes: 2,
      presentAthletes: 1,
      attendanceRatePct: 50,
      upstreamTotal: 2,
      upstreamPending: 1,
    });
    expect(snapshot.metrics).toMatchObject({
      reports: 1,
      drafts: 1,
      finalized: 0,
      openActions: 1,
      overdueActions: 0,
    });
  });

  it("returns an empty operational state without inventing reports", async () => {
    repositoryMock.mockResolvedValue({
      reports: [],
      actions: [],
      sessions: [],
      closures: [],
      registrations: [],
      tasks: [],
      errors: [],
    });

    const snapshot = await getAdminReportSnapshot();
    expect(snapshot.reports).toEqual([]);
    expect(snapshot.metrics.reports).toBe(0);
  });
});
