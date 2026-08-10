import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminUrPlayPreflightRepositoryData } from "@/server/repositories/admin-ur-play-preflight-repository";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminUrPlayPreflightSnapshot } from "./admin-ur-play-preflight-service";

vi.mock("@/server/services/admin-court-ops-service", () => ({
  getAdminCourtOpsSnapshot: vi.fn(),
}));
vi.mock("@/server/repositories/admin-ur-play-preflight-repository", () => ({
  fetchAdminUrPlayPreflightRepositoryData: vi.fn(),
}));

const courtOpsMock = vi.mocked(getAdminCourtOpsSnapshot);
const repositoryMock = vi.mocked(fetchAdminUrPlayPreflightRepositoryData);

const session = {
  id: "session-1",
  name: "UR Play Piloto",
  status: "registration_open",
  startsAt: "2026-08-15T22:00:00.000Z",
  endsAt: "2026-08-16T00:00:00.000Z",
  readyForMatchmaking: false,
  poleId: "pole-1",
  poleName: "Betim",
  venueId: "venue-1",
  venueName: "Quadra Parceira",
  courts: [{ id: "court-1", name: "Quadra 1", position: 1 }],
  queue: [],
  matches: [],
};

const criticalKeys = [
  "court_access_confirmed",
  "balls_score_ready",
  "first_aid_ready",
  "device_offline_ready",
  "operation_owner_ready",
  "athlete_briefing_ready",
] as const;

describe("admin UR Play preflight service", () => {
  beforeEach(() => {
    courtOpsMock.mockReset();
    repositoryMock.mockReset();
    courtOpsMock.mockResolvedValue({
      generatedAt: "2026-08-10T21:00:00.000Z",
      sessions: [session],
      formats: [{ id: "format-doubles", code: "doubles", name: "Duplas" }],
      categories: [],
      metrics: {
        sessionsInProgress: 0,
        waiting: 0,
        called: 0,
        playing: 0,
        pendingReview: 0,
        completed: 0,
      },
      infrastructureReady: true,
      sourceErrors: [],
    });
  });

  it("reaches operational GO only with automatic gates and all critical checks", async () => {
    repositoryMock.mockResolvedValue({
      checks: criticalKeys.map((key) => ({
        session_id: "session-1",
        check_key: key,
        is_checked: true,
        note: null,
        updated_at: "2026-08-10T21:00:00.000Z",
      })),
      registrations: Array.from({ length: 4 }, () => ({
        session_id: "session-1",
        registration_status: "confirmed",
      })),
      checkins: [],
      staff: [],
      scopes: [{ session_id: "session-1", format_id: "format-doubles" }],
      errors: [],
    });

    const snapshot = await getAdminUrPlayPreflightSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );

    expect(snapshot.currentSession?.minimumAthletes).toBe(4);
    expect(snapshot.currentSession?.criticalReady).toBe(6);
    expect(
      snapshot.currentSession?.automaticGates.every((gate) => gate.ready),
    ).toBe(true);
    expect(snapshot.currentSession?.ready).toBe(true);
  });

  it("stays blocked when the participant minimum or one critical check is missing", async () => {
    repositoryMock.mockResolvedValue({
      checks: criticalKeys.slice(0, 5).map((key) => ({
        session_id: "session-1",
        check_key: key,
        is_checked: true,
        note: null,
        updated_at: "2026-08-10T21:00:00.000Z",
      })),
      registrations: Array.from({ length: 3 }, () => ({
        session_id: "session-1",
        registration_status: "confirmed",
      })),
      checkins: [],
      staff: [],
      scopes: [{ session_id: "session-1", format_id: "format-doubles" }],
      errors: [],
    });

    const snapshot = await getAdminUrPlayPreflightSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );

    expect(
      snapshot.currentSession?.automaticGates.find(
        (gate) => gate.key === "participants",
      )?.ready,
    ).toBe(false);
    expect(snapshot.currentSession?.criticalReady).toBe(5);
    expect(snapshot.currentSession?.ready).toBe(false);
  });
});
