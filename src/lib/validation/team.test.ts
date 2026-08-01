import { describe, expect, it } from "vitest";
import { createTeamRosterSchema, validateRosterShape } from "./team";
describe("team and roster rules", () => {
  it("rejects leveling rosters", () =>
    expect(
      createTeamRosterSchema.safeParse({
        teamId: crypto.randomUUID(),
        seasonId: crypto.randomUUID(),
        categoryId: crypto.randomUUID(),
        formatId: crypto.randomUUID(),
        level: "leveling",
      }).success,
    ).toBe(false));
  it("requires two starters in active doubles", () =>
    expect(() =>
      validateRosterShape("doubles", [{ role: "starter" }], true),
    ).toThrow());
  it("accepts four plus three in fours", () =>
    expect(
      validateRosterShape(
        "fours",
        [
          ...Array(4).fill({ role: "starter" }),
          ...Array(3).fill({ role: "reserve" }),
        ],
        true,
      ).total,
    ).toBe(7));
  it("rejects fourth reserve", () =>
    expect(() =>
      validateRosterShape("fours", [
        ...Array(4).fill({ role: "starter" }),
        ...Array(4).fill({ role: "reserve" }),
      ]),
    ).toThrow());
});
