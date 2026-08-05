import { describe, expect, it } from "vitest";
import {
  checklistDueAt,
  eventWindowsOverlap,
  q1BaseCalendarSlots,
} from "./calendar";

describe("season calendar operations", () => {
  it("keeps Q1 templates recurring and not tied to fixed dates", () => {
    expect(q1BaseCalendarSlots).toHaveLength(12);
    expect(q1BaseCalendarSlots.every((slot) => "weekday" in slot)).toBe(true);
    expect(q1BaseCalendarSlots.some((slot) => slot.alternatesFriday)).toBe(
      true,
    );
  });

  it("detects court/staff overlap with half-open event windows", () => {
    const base = {
      startsAt: new Date("2026-01-01T18:00:00Z"),
      endsAt: new Date("2026-01-01T20:00:00Z"),
    };
    expect(
      eventWindowsOverlap(base, {
        startsAt: new Date("2026-01-01T19:59:00Z"),
        endsAt: new Date("2026-01-01T21:00:00Z"),
      }),
    ).toBe(true);
    expect(
      eventWindowsOverlap(base, {
        startsAt: new Date("2026-01-01T20:00:00Z"),
        endsAt: new Date("2026-01-01T22:00:00Z"),
      }),
    ).toBe(false);
  });

  it("derives checklist due dates from event date and operational phase", () => {
    const startsAt = new Date("2026-03-20T21:00:00Z");
    expect(checklistDueAt(startsAt, "d_minus_14").toISOString()).toBe(
      "2026-03-06T21:00:00.000Z",
    );
    expect(checklistDueAt(startsAt, "d_plus_2").toISOString()).toBe(
      "2026-03-22T21:00:00.000Z",
    );
  });
});
