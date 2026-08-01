import { describe, expect, it } from "vitest";
import {
  createAthleteSchema,
  createMembershipSchema,
  createPoleSchema,
  createSeasonSchema,
} from "./domain";

describe("domain validations", () => {
  it("normalizes a pole state", () => {
    expect(
      createPoleSchema.parse({
        name: "Polo Teste",
        slug: "polo-teste",
        city: "Betim",
        state: "mg",
      }).state,
    ).toBe("MG");
  });
  it("rejects an invalid athlete height", () => {
    expect(() =>
      createAthleteSchema.parse({
        publicName: "Atleta",
        fullName: "Atleta Teste",
        gender: "female",
        heightCm: 300,
      }),
    ).toThrow();
  });
  it("rejects a reversed season", () => {
    expect(() =>
      createSeasonSchema.parse({
        name: "Temporada",
        code: "season-01",
        startsAt: "2026-12-01T00:00:00.000Z",
        endsAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });
  it("accepts a temporal membership", () => {
    expect(
      createMembershipSchema.parse({
        athleteId: "10000000-0000-4000-8000-000000000001",
        teamId: "20000000-0000-4000-8000-000000000001",
        seasonId: "30000000-0000-4000-8000-000000000001",
        membershipType: "athlete",
        startsAt: "2026-01-01T00:00:00.000Z",
      }).membershipType,
    ).toBe("athlete");
  });
});
