import { describe, expect, it } from "vitest";
import {
  canTransitionMatch,
  compatibleLevel,
  hasUniqueAthletes,
  requiredSideSize,
  restWarning,
  scoreCandidates,
  suggestSides,
  validMixedComposition,
  validSideSizes,
} from "./court-ops";

describe("Court Ops rules", () => {
  it("enforces state machine", () => {
    expect(canTransitionMatch("queued", "called")).toBe(true);
    expect(canTransitionMatch("queued", "in_progress")).toBe(false);
    expect(canTransitionMatch("in_progress", "abandoned")).toBe(true);
  });
  it("validates doubles and fours", () => {
    expect(requiredSideSize("doubles")).toBe(2);
    expect(validSideSizes("fours", [1, 2, 3, 4], [5, 6, 7, 8])).toBe(true);
    expect(validSideSizes("doubles", [1], [2, 3])).toBe(false);
  });
  it("rejects duplicate athlete", () =>
    expect(hasUniqueAthletes(["a", "b"], ["c", "a"])).toBe(false));
  it("validates mixed compositions", () => {
    expect(validMixedComposition("doubles", ["female", "male"])).toBe(true);
    expect(
      validMixedComposition("fours", ["female", "female", "male", "male"]),
    ).toBe(true);
    expect(validMixedComposition("doubles", ["female", "female"])).toBe(false);
  });
  it("allows leveling compatibility", () => {
    expect(compatibleLevel("n2", "leveling")).toBe(true);
    expect(compatibleLevel("n2", "n3")).toBe(false);
  });
  it("warns about short rest", () =>
    expect(restWarning(new Date(Date.now() - 60_000).toISOString(), 10)).toBe(
      true,
    ));
  it("prioritizes fewer games then longer wait", () => {
    const rows = [
      {
        athleteId: "a",
        gamesPlayed: 2,
        queuedAt: "2026-01-01T01:00:00Z",
        lastMatchEndedAt: null,
        recentPartners: [],
        recentOpponents: [],
      },
      {
        athleteId: "b",
        gamesPlayed: 1,
        queuedAt: "2026-01-01T02:00:00Z",
        lastMatchEndedAt: null,
        recentPartners: [],
        recentOpponents: [],
      },
    ];
    expect(scoreCandidates(rows)[0]?.athleteId).toBe("b");
  });
  it("creates deterministic balanced suggestion", () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      athleteId: String(i),
      gamesPlayed: 0,
      queuedAt: `2026-01-01T0${i}:00:00Z`,
      lastMatchEndedAt: null,
      recentPartners: [],
      recentOpponents: [],
    }));
    const result = suggestSides(rows, "doubles");
    expect(result.sideA).toHaveLength(2);
    expect(result.sideB).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });
  it("avoids an immediate repeated partner when possible", () => {
    const rows = ["a", "b", "c", "d"].map((athleteId, index) => ({
      athleteId,
      gamesPlayed: 0,
      queuedAt: `2026-01-01T0${index}:00:00Z`,
      lastMatchEndedAt: null,
      recentPartners:
        athleteId === "a" ? ["c"] : athleteId === "c" ? ["a"] : [],
      recentOpponents: [],
    }));
    const result = suggestSides(rows, "doubles");
    const partners = [...result.sideA, ...result.sideB];
    expect(
      result.sideA.some((row) => row.athleteId === "a") &&
        result.sideA.some((row) => row.athleteId === "c"),
    ).toBe(false);
    expect(partners).toHaveLength(4);
  });
});
