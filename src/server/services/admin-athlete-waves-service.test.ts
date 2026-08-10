import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminAthleteWavesRepositoryData } from "@/server/repositories/admin-athlete-waves-repository";
import { getAdminAthleteHomologationSnapshot } from "@/server/services/admin-athlete-homologation-service";
import { getAdminAthleteWavesSnapshot } from "./admin-athlete-waves-service";

vi.mock("@/server/repositories/admin-athlete-waves-repository", () => ({
  fetchAdminAthleteWavesRepositoryData: vi.fn(),
}));
vi.mock("@/server/services/admin-athlete-homologation-service", () => ({
  getAdminAthleteHomologationSnapshot: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminAthleteWavesRepositoryData);
const homologationMock = vi.mocked(getAdminAthleteHomologationSnapshot);

const pole = {
  id: "pole-1",
  name: "Betim",
  slug: "betim",
  status: "active",
  city: "Betim",
  state: "MG",
};

describe("admin athlete activation waves service", () => {
  beforeEach(() => {
    repositoryMock.mockReset();
    homologationMock.mockReset();
  });

  it("does not fabricate readiness when history, account, category and availability are missing", async () => {
    repositoryMock.mockResolvedValue({
      waves: [
        {
          id: "wave-1",
          name: "Piloto",
          target_size: 8,
          pole_id: "pole-1",
          status: "preparing",
          notes: null,
          created_at: "2026-08-10T20:00:00.000Z",
          updated_at: "2026-08-10T20:00:00.000Z",
        },
      ],
      members: [
        {
          wave_id: "wave-1",
          athlete_id: "athlete-1",
          selection_reason: "Decisão administrativa para validar o fluxo.",
          priority: 0,
          selected_at: "2026-08-10T20:01:00.000Z",
          removed_at: null,
        },
      ],
      athletes: [{ id: "athlete-1", gender: "undisclosed" }],
      invites: [],
      availability: [],
      importRows: [
        {
          imported_athlete_id: "athlete-1",
          source_row: 19,
          validation_status: "imported",
        },
      ],
      errors: [],
    });
    homologationMock.mockResolvedValue({
      rows: [
        {
          id: "athlete-1",
          athleteCode: "UR-000071",
          publicName: "Lara",
          fullName: "Lara Elisa",
          birthDate: "2000-04-18",
          phone: "+5531975041282",
          email: "lara@example.com",
          status: "draft",
          poleId: "pole-1",
          poleName: "Betim",
          poleStatus: "active",
          linked: false,
          blockers: [],
          readyToActivate: true,
        },
      ],
      metrics: {
        total: 1,
        draft: 1,
        ready: 1,
        blockedDraft: 0,
        active: 0,
        linked: 0,
        activePoles: 1,
        draftPoles: 0,
      },
      poles: [pole],
      sourceErrors: [],
    });

    const snapshot = await getAdminAthleteWavesSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );
    const member = snapshot.waves[0]?.members[0];
    expect(member?.selectionEvidence).toBe("admin_decision_required");
    expect(member?.readyForPilot).toBe(false);
    expect(member?.gates.find((gate) => gate.key === "institutional")?.state).toBe(
      "pending",
    );
    expect(member?.gates.find((gate) => gate.key === "category")?.state).toBe(
      "review",
    );
    expect(member?.gates.find((gate) => gate.key === "availability")?.state).toBe(
      "pending",
    );
    expect(snapshot.metrics.pilotReady).toBe(0);
  });

  it("marks a selected athlete ready only after institutional, access, category and availability gates are real", async () => {
    repositoryMock.mockResolvedValue({
      waves: [
        {
          id: "wave-1",
          name: "Piloto",
          target_size: 8,
          pole_id: "pole-1",
          status: "running",
          notes: null,
          created_at: "2026-08-10T20:00:00.000Z",
          updated_at: "2026-08-10T20:00:00.000Z",
        },
      ],
      members: [
        {
          wave_id: "wave-1",
          athlete_id: "athlete-1",
          selection_reason: "Atleta escolhido pelo administrador para o piloto.",
          priority: 10,
          selected_at: "2026-08-10T20:01:00.000Z",
          removed_at: null,
        },
      ],
      athletes: [{ id: "athlete-1", gender: "female" }],
      invites: [],
      availability: [
        {
          athlete_id: "athlete-1",
          active: true,
          valid_from: "2026-08-01",
          valid_until: null,
        },
      ],
      importRows: [],
      errors: [],
    });
    homologationMock.mockResolvedValue({
      rows: [
        {
          id: "athlete-1",
          athleteCode: "UR-000071",
          publicName: "Lara",
          fullName: "Lara Elisa",
          birthDate: "2000-04-18",
          phone: "+5531975041282",
          email: "lara@example.com",
          status: "active",
          poleId: "pole-1",
          poleName: "Betim",
          poleStatus: "active",
          linked: true,
          blockers: [],
          readyToActivate: false,
        },
      ],
      metrics: {
        total: 1,
        draft: 0,
        ready: 0,
        blockedDraft: 0,
        active: 1,
        linked: 1,
        activePoles: 1,
        draftPoles: 0,
      },
      poles: [pole],
      sourceErrors: [],
    });

    const snapshot = await getAdminAthleteWavesSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );
    expect(snapshot.waves[0]?.members[0]?.readyForPilot).toBe(true);
    expect(snapshot.metrics.pilotReady).toBe(1);
    expect(snapshot.metrics.categoryReady).toBe(1);
    expect(snapshot.metrics.availabilityReady).toBe(1);
  });
});
