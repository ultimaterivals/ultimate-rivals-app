import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminCommandRepositoryData } from "@/server/repositories/admin-command-repository";
import { getAdminCommandSnapshot } from "./admin-command-service";

vi.mock("@/server/repositories/admin-command-repository", () => ({
  fetchAdminCommandRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminCommandRepositoryData);

describe("getAdminCommandSnapshot", () => {
  beforeEach(() => {
    repositoryMock.mockReset();
  });

  it("keeps a completely empty connected base honest", async () => {
    repositoryMock.mockResolvedValue({
      season: null,
      summary: null,
      calendar: [],
      demand: [],
      activeAthletes30d: 0,
      firstParticipationOnly: 0,
      acquisition: [],
      overduePayments: [],
      obligations: [],
      errors: [],
    });

    const snapshot = await getAdminCommandSnapshot(
      new Date("2026-08-10T14:00:00.000Z"),
    );

    expect(snapshot.status).toBe("empty");
    expect(snapshot.metrics.todayEvents).toBe(0);
    expect(snapshot.metrics.revenue).toBeNull();
    expect(snapshot.actions[0]?.id).toBe("configure-season");
  });

  it("derives attention and actions from real operational signals", async () => {
    repositoryMock.mockResolvedValue({
      season: {
        id: "season-1",
        name: "Temporada 1",
        code: "T1",
        status: "active",
        starts_at: "2026-08-01T03:00:00.000Z",
        ends_at: "2026-10-31T03:00:00.000Z",
      },
      summary: {
        season_id: "season-1",
        name: "Temporada 1",
        active_athletes: 20,
        ur_play_sessions: 2,
        training_sessions: 0,
        matches: 5,
        tournaments: 0,
        revenue: 1000,
        expenses: 400,
      },
      calendar: [
        {
          id: "event-1",
          name: "UR Play Contagem",
          event_type: "ur_play",
          status: "planned",
          starts_at: "2026-08-10T20:00:00.000Z",
          ends_at: "2026-08-10T22:00:00.000Z",
          pole_name: "Contagem",
          venue_name: "Arena",
          open_checklist_items: 2,
          conflict_count: 1,
        },
      ],
      demand: [
        {
          id: "demand-1",
          title: "UR Play N2",
          status: "forming",
          demand_signal: "READY_TO_OPEN",
          starts_at: "2026-08-11T20:00:00.000Z",
          ends_at: "2026-08-11T22:00:00.000Z",
          pole_name: "Contagem",
          venue_name: "Arena",
          interested_count: 8,
          ready_formations: 4,
          target_formations: 4,
          reserved_count: 0,
          waitlist_count: 0,
          remaining_capacity: 4,
        },
      ],
      activeAthletes30d: 18,
      firstParticipationOnly: 3,
      acquisition: [],
      overduePayments: [],
      obligations: [],
      errors: [],
    });

    const snapshot = await getAdminCommandSnapshot(
      new Date("2026-08-10T14:00:00.000Z"),
    );

    expect(snapshot.status).toBe("ready");
    expect(snapshot.alerts.some((item) => item.severity === "critical")).toBe(
      true,
    );
    expect(
      snapshot.actions.some(
        (item) => item.id === "action-second-participation",
      ),
    ).toBe(true);
    expect(snapshot.metrics.revenue).toBe(1000);
  });
});
