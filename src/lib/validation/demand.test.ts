import { describe, expect, it } from "vitest";
import {
  almostFullLabel,
  computeFunnel,
  computeOpportunityStatus,
  computeRetention,
  computeUnservedDemand,
  hasSecondCourtOpportunity,
  isFormationReady,
  normalizeAttributionSource,
} from "./demand";

describe("demand validation", () => {
  it("requires two accepted active athletes for doubles and four for fours", () => {
    expect(
      isFormationReady({ format: "doubles", acceptedActiveAthletes: 2 }),
    ).toBe(true);
    expect(
      isFormationReady({ format: "doubles", acceptedActiveAthletes: 1 }),
    ).toBe(false);
    expect(
      isFormationReady({ format: "fours", acceptedActiveAthletes: 4 }),
    ).toBe(true);
    expect(
      isFormationReady({
        format: "fours",
        acceptedActiveAthletes: 3,
        reserveAthletes: 1,
      }),
    ).toBe(false);
  });

  it("separates almost full, confirmed and full", () => {
    expect(
      computeOpportunityStatus({
        readyFormations: 3,
        targetFormations: 4,
        maxFormations: 8,
        capacityAthletes: 16,
        reservedAthletes: 12,
        interestedAthletes: 16,
      }),
    ).toBe("almost_full");
    expect(
      computeOpportunityStatus({
        readyFormations: 4,
        targetFormations: 4,
        maxFormations: 8,
        capacityAthletes: 16,
        reservedAthletes: 16,
        interestedAthletes: 16,
      }),
    ).toBe("full");
    expect(
      computeOpportunityStatus({
        readyFormations: 4,
        targetFormations: 4,
        maxFormations: 8,
        capacityAthletes: 32,
        reservedAthletes: 16,
        interestedAthletes: 16,
      }),
    ).toBe("confirmed");
  });

  it("uses contextual almost-full labels", () => {
    expect(almostFullLabel("doubles")).toBe("ÚLTIMA DUPLA");
    expect(almostFullLabel("fours")).toBe("ÚLTIMO QUARTETO");
  });

  it("detects second court opportunity and unserved demand", () => {
    expect(
      hasSecondCourtOpportunity({
        reservedAthletes: 8,
        capacityAthletes: 8,
        interestedAthletes: 12,
        readyFormations: 4,
        maxFormations: 4,
      }),
    ).toBe(true);
    expect(
      computeUnservedDemand({
        interestedAthletes: 12,
        reservedAthletes: 8,
        waitlistedAthletes: 2,
        readyFormations: 6,
        maxFormations: 4,
      }),
    ).toEqual({
      interestedNotServed: 4,
      waitlistedNotServed: 2,
      readyFormationsAboveCapacity: 2,
    });
  });

  it("normalizes first-party attribution sources", () => {
    expect(normalizeAttributionSource({ utmSource: "instagram" })).toBe(
      "instagram",
    );
    expect(
      normalizeAttributionSource({ athleteReferralCode: "UR-000001" }),
    ).toBe("athlete_referral");
    expect(normalizeAttributionSource({ referrerDomain: "wa.me" })).toBe(
      "whatsapp",
    );
    expect(normalizeAttributionSource({})).toBe("direct");
  });

  it("computes funnel and retention metrics", () => {
    expect(
      computeFunnel({
        visitors: 100,
        signups: 50,
        profiles: 40,
        interests: 25,
        reservations: 10,
        checkins: 8,
        firstParticipations: 6,
        secondParticipations: 3,
      }),
    ).toMatchObject({
      visitToSignup: 0.5,
      interestToReservation: 0.4,
      firstToSecondParticipation: 0.5,
    });
    expect(
      computeRetention({
        participations30d: 2,
        lastParticipationAt: new Date("2026-08-01T00:00:00Z"),
        now: new Date("2026-08-05T00:00:00Z"),
      }),
    ).toEqual({
      active7d: true,
      active30d: true,
      returningAthlete: true,
      daysSinceLastParticipation: 4,
    });
  });
});
