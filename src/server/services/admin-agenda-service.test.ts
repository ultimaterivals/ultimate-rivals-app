import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminAgendaRepositoryData } from "@/server/repositories/admin-agenda-repository";
import {
  getAdminAgendaSnapshot,
  getAgendaRange,
  getWeekStart,
} from "./admin-agenda-service";

vi.mock("@/server/repositories/admin-agenda-repository", () => ({
  fetchAdminAgendaRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminAgendaRepositoryData);

describe("admin agenda service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("normalizes any date to the Monday of its week", () => {
    expect(getWeekStart("2026-08-10")).toBe("2026-08-10");
    expect(getWeekStart("2026-08-16")).toBe("2026-08-10");
  });

  it("keeps 06:00–00:00 as the default operational window", () => {
    const range = getAgendaRange({}, new Date("2026-08-10T14:00:00.000Z"));
    expect(range.weekStart).toBe("2026-08-10");
    expect(range.startHour).toBe(6);
    expect(range.endHour).toBe(24);
  });

  it("links demand reservations to the matching calendar event", async () => {
    repositoryMock.mockResolvedValue({
      poles: [],
      events: [
        {
          id: "event-1",
          name: "UR Play",
          event_type: "ur_play",
          status: "registration_open",
          starts_at: "2026-08-13T23:00:00.000Z",
          ends_at: "2026-08-14T01:00:00.000Z",
          pole_id: "pole-1",
          pole_name: "Contagem",
          venue_name: "Arena",
          open_checklist_items: 1,
          conflict_count: 0,
        },
      ],
      demand: [
        {
          id: "demand-1",
          calendar_event_id: "event-1",
          title: "UR Play",
          status: "forming",
          demand_signal: "ALMOST_FULL",
          starts_at: "2026-08-13T23:00:00.000Z",
          ends_at: "2026-08-14T01:00:00.000Z",
          pole_id: "pole-1",
          pole_name: "Contagem",
          venue_name: "Arena",
          level: null,
          format_code: "doubles",
          category_code: "female",
          interested_count: 7,
          ready_formations: 3,
          target_formations: 4,
          reserved_count: 6,
          waitlist_count: 0,
          remaining_capacity: 2,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminAgendaSnapshot(
      { week: "2026-08-10" },
      new Date("2026-08-10T14:00:00.000Z"),
    );

    expect(snapshot.events?.[0]?.reservedCount).toBe(6);
    expect(snapshot.events?.[0]?.readyFormations).toBe(3);
    expect(snapshot.metrics.reservations).toBe(6);
  });

  it("filters the snapshot by selected pole without escalating access", async () => {
    repositoryMock.mockResolvedValue({
      poles: [],
      events: [
        {
          id: "event-1",
          name: "BH",
          event_type: "ur_play",
          status: "planned",
          starts_at: "2026-08-11T23:00:00.000Z",
          ends_at: "2026-08-12T01:00:00.000Z",
          pole_id: "bh",
          pole_name: "BH",
          venue_name: null,
          open_checklist_items: 0,
          conflict_count: 0,
        },
        {
          id: "event-2",
          name: "Contagem",
          event_type: "ur_play",
          status: "planned",
          starts_at: "2026-08-12T23:00:00.000Z",
          ends_at: "2026-08-13T01:00:00.000Z",
          pole_id: "contagem",
          pole_name: "Contagem",
          venue_name: null,
          open_checklist_items: 0,
          conflict_count: 0,
        },
      ],
      demand: [],
      errors: [],
    });

    const snapshot = await getAdminAgendaSnapshot(
      { week: "2026-08-10", pole: "contagem" },
      new Date("2026-08-10T14:00:00.000Z"),
    );

    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.events?.[0]?.name).toBe("Contagem");
  });
});
