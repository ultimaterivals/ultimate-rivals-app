import { describe, expect, it } from "vitest";
import {
  allocateCapacity,
  canTransitionUrPlaySession,
  checkInAthleteSchema,
  createUrPlaySessionSchema,
  isReadyForMatchmaking,
  setPaymentStatusSchema,
} from "./ur-play";
describe("UR Play rules", () => {
  it("enforces state machine", () => {
    expect(canTransitionUrPlaySession("draft", "published")).toBe(true);
    expect(canTransitionUrPlaySession("completed", "registration_open")).toBe(
      false,
    );
  });
  it("allocates waitlist after capacity", () => {
    expect(allocateCapacity(16, 15)).toBe("confirmed");
    expect(allocateCapacity(16, 16)).toBe("waitlisted");
  });
  it("validates session period", () =>
    expect(() =>
      createUrPlaySessionSchema.parse({
        seasonId: crypto.randomUUID(),
        poleId: crypto.randomUUID(),
        venueId: crypto.randomUUID(),
        name: "UR",
        sessionDate: "2026-08-02",
        startsAt: "2026-08-02T20:00:00Z",
        endsAt: "2026-08-02T19:00:00Z",
        capacity: 16,
      }),
    ).toThrow());
  it("requires idempotency key", () =>
    expect(() =>
      checkInAthleteSchema.parse({
        registrationId: crypto.randomUUID(),
        method: "manual",
      }),
    ).toThrow());
  it("restricts payment methods", () =>
    expect(() =>
      setPaymentStatusSchema.parse({
        registrationId: crypto.randomUUID(),
        status: "paid",
        method: "card",
      }),
    ).toThrow());
  it("derives matchmaking readiness", () =>
    expect(isReadyForMatchmaking("in_progress")).toBe(true));
});
