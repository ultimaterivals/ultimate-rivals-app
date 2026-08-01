import { describe, expect, it } from "vitest";
import {
  createAthlete360Schema,
  detectDuplicateCandidates,
  normalizeAthleteName,
  updateOwnAthleteProfileSchema,
} from "./athlete";
describe("athlete 360 validation", () => {
  it("normalizes names", () =>
    expect(normalizeAthleteName("  Júlia D'Ávila ")).toBe("julia d avila"));
  it("accepts an accountless athlete", () =>
    expect(
      createAthlete360Schema.parse({
        publicName: "Test 9",
        fullName: "Fictitious Athlete",
        gender: "undisclosed",
      }).profileId,
    ).toBeUndefined());
  it("detects duplicate signals without merging", () =>
    expect(
      detectDuplicateCandidates([
        { fullName: "Test Athlete", birthDate: "2000-01-01" },
        { fullName: "Tést Athlete", birthDate: "2000-01-01" },
      ]),
    ).toEqual([1]));
  it("own schema strips no privileged field because it rejects it", () =>
    expect(
      updateOwnAthleteProfileSchema.safeParse({
        athleteId: crypto.randomUUID(),
        publicName: "Test",
        status: "active",
      }).success,
    ).toBe(true));
});
