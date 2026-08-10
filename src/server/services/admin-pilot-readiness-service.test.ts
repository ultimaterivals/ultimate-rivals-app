import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAthleteWavesSnapshot } from "@/server/services/admin-athlete-waves-service";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminPolesInfrastructureSnapshot } from "@/server/services/admin-poles-infrastructure-service";
import { getAdminPilotReadinessSnapshot } from "./admin-pilot-readiness-service";

vi.mock("@/server/services/admin-athlete-waves-service", () => ({
  getAdminAthleteWavesSnapshot: vi.fn(),
}));
vi.mock("@/server/services/admin-court-ops-service", () => ({
  getAdminCourtOpsSnapshot: vi.fn(),
}));
vi.mock("@/server/services/admin-poles-infrastructure-service", () => ({
  getAdminPolesInfrastructureSnapshot: vi.fn(),
}));

const wavesMock = vi.mocked(getAdminAthleteWavesSnapshot);
const courtOpsMock = vi.mocked(getAdminCourtOpsSnapshot);
const infrastructureMock = vi.mocked(getAdminPolesInfrastructureSnapshot);

const emptyMetrics = {
  sessionsInProgress: 0,
  waiting: 0,
  called: 0,
  playing: 0,
  pendingReview: 0,
  completed: 0,
};

describe("admin pilot readiness service", () => {
  beforeEach(() => {
    wavesMock.mockReset();
    courtOpsMock.mockReset();
    infrastructureMock.mockReset();
  });

  it("keeps NO-GO when there is no wave, infrastructure or session", async () => {
    wavesMock.mockResolvedValue({
      generatedAt: "2026-08-10T21:00:00.000Z",
      waves: [],
      candidates: [],
      metrics: {
        wavesOpen: 0,
        selected: 0,
        active: 0,
        linked: 0,
        categoryReady: 0,
        availabilityReady: 0,
        pilotReady: 0,
      },
      sourceErrors: [],
    });
    infrastructureMock.mockResolvedValue({
      poles: [],
      metrics: {
        regions: 3,
        activeRegions: 3,
        infrastructureReady: 0,
        venues: 0,
        courts: 0,
        activeVenues: 0,
        activeCourts: 0,
      },
      sourceErrors: [],
    });
    courtOpsMock.mockResolvedValue({
      generatedAt: "2026-08-10T21:00:00.000Z",
      sessions: [],
      formats: [
        { id: "format-doubles", code: "doubles", name: "Duplas" },
        { id: "format-fours", code: "fours", name: "Quartetos" },
      ],
      categories: [
        { id: "female", code: "female", name: "Feminino" },
        { id: "male", code: "male", name: "Masculino" },
        { id: "mixed", code: "mixed", name: "Misto" },
      ],
      metrics: emptyMetrics,
      infrastructureReady: false,
      sourceErrors: [],
    });

    const snapshot = await getAdminPilotReadinessSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );
    expect(snapshot.status).toBe("no_go");
    expect(snapshot.readyGates).toBe(2);
    expect(snapshot.nextAction?.key).toBe("wave");
    expect(snapshot.gates.find((item) => item.key === "engine")?.state).toBe(
      "ready",
    );
  });

  it("reaches GO only when every real gate is ready", async () => {
    wavesMock.mockResolvedValue({
      generatedAt: "2026-08-10T21:00:00.000Z",
      waves: [
        {
          id: "wave-1",
          name: "Piloto Betim",
          targetSize: 8,
          poleId: "pole-1",
          poleName: "Betim",
          status: "running",
          notes: null,
          createdAt: "2026-08-10T20:00:00.000Z",
          updatedAt: "2026-08-10T20:00:00.000Z",
          members: [],
          selectedCount: 8,
          readyCount: 8,
        },
      ],
      candidates: [],
      metrics: {
        wavesOpen: 1,
        selected: 8,
        active: 8,
        linked: 8,
        categoryReady: 8,
        availabilityReady: 8,
        pilotReady: 8,
      },
      sourceErrors: [],
    });
    infrastructureMock.mockResolvedValue({
      poles: [
        {
          id: "pole-1",
          name: "Betim",
          slug: "betim",
          city: "Betim",
          state: "MG",
          regionStatus: "active",
          regionActive: true,
          venues: [],
          courts: [],
          venueCount: 1,
          courtCount: 1,
          activeVenueCount: 1,
          activeCourtCount: 1,
          infrastructureReady: true,
        },
      ],
      metrics: {
        regions: 1,
        activeRegions: 1,
        infrastructureReady: 1,
        venues: 1,
        courts: 1,
        activeVenues: 1,
        activeCourts: 1,
      },
      sourceErrors: [],
    });
    courtOpsMock.mockResolvedValue({
      generatedAt: "2026-08-10T21:00:00.000Z",
      sessions: [
        {
          id: "session-1",
          name: "UR Play Betim",
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
        },
      ],
      formats: [
        { id: "format-doubles", code: "doubles", name: "Duplas" },
        { id: "format-fours", code: "fours", name: "Quartetos" },
      ],
      categories: [
        { id: "female", code: "female", name: "Feminino" },
        { id: "male", code: "male", name: "Masculino" },
        { id: "mixed", code: "mixed", name: "Misto" },
      ],
      metrics: emptyMetrics,
      infrastructureReady: true,
      sourceErrors: [],
    });

    const snapshot = await getAdminPilotReadinessSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );
    expect(snapshot.status).toBe("go");
    expect(snapshot.readyGates).toBe(snapshot.totalGates);
    expect(snapshot.nextAction).toBeNull();
    expect(snapshot.targetSession?.id).toBe("session-1");
  });
});
