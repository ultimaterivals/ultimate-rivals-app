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
      availability: [],
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
      availability: [],
      errors: [],
    });

    const snapshot = await getAdminAgendaSnapshot(
      { week: "2026-08-10", pole: "contagem" },
      new Date("2026-08-10T14:00:00.000Z"),
    );

    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.events?.[0]?.name).toBe("Contagem");
  });

  it("aggregates unique athletes into recurring 30-minute availability cells", async () => {
    repositoryMock.mockResolvedValue({
      poles: [],
      events: [],
      demand: [],
      availability: [
        {
          id: "window-1",
          athlete_id: "athlete-1",
          day_of_week: 4,
          starts_at: "19:00:00",
          ends_at: "21:00:00",
          pole_id: "contagem",
          modality: "beach_volleyball",
          format_codes: ["doubles"],
          category_codes: ["female"],
          valid_from: null,
          valid_until: null,
          active: true,
        },
        {
          id: "window-2",
          athlete_id: "athlete-2",
          day_of_week: 4,
          starts_at: "19:30:00",
          ends_at: "20:30:00",
          pole_id: null,
          modality: "beach_volleyball",
          format_codes: ["doubles"],
          category_codes: ["female"],
          valid_from: "2026-08-01",
          valid_until: "2026-08-31",
          active: true,
        },
        {
          id: "window-3",
          athlete_id: "athlete-3",
          day_of_week: 4,
          starts_at: "19:30:00",
          ends_at: "20:30:00",
          pole_id: "bh",
          modality: "beach_volleyball",
          format_codes: ["doubles"],
          category_codes: ["female"],
          valid_from: null,
          valid_until: null,
          active: true,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminAgendaSnapshot(
      { week: "2026-08-10", pole: "contagem" },
      new Date("2026-08-10T14:00:00.000Z"),
    );

    const thursday1930 = snapshot.availability.cells?.find(
      (cell) => cell.date === "2026-08-13" && cell.startLabel === "19:30",
    );

    expect(snapshot.availability.athletes).toBe(2);
    expect(snapshot.availability.windows).toBe(2);
    expect(snapshot.availability.peakAthletes).toBe(2);
    expect(thursday1930?.athleteCount).toBe(2);
    expect(thursday1930?.flexibleAthletes).toBe(1);
  });
});
