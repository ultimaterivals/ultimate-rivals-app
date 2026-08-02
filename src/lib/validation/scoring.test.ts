import { describe, expect, it } from "vitest";
import {
  applyRallyCorrection,
  canAttributeTechnicalAction,
  deriveScore,
  detectStreaks,
  recordRallySchema,
  urPlayScoringRule,
} from "./scoring";

const rallies = (side: "A" | "B", count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({
    rallyNumber: offset + index + 1,
    winningSide: side,
  }));

describe("scoring engine", () => {
  it("starts at 0x0", () =>
    expect(deriveScore([])).toEqual({
      scoreA: 0,
      scoreB: 0,
      isGameOver: false,
      winner: null,
      gamePointRallyNumber: null,
    }));
  it("ends an 11x0 game at the eleventh rally", () =>
    expect(deriveScore(rallies("A", 11))).toMatchObject({
      scoreA: 11,
      scoreB: 0,
      isGameOver: true,
      winner: "A",
      gamePointRallyNumber: 11,
    }));
  it("accepts 11x10 without win-by-two", () => {
    const sequence = [
      ...Array.from({ length: 10 }, (_, index) => ({
        rallyNumber: index * 2 + 1,
        winningSide: "A" as const,
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        rallyNumber: index * 2 + 2,
        winningSide: "B" as const,
      })),
      { rallyNumber: 21, winningSide: "A" as const },
    ];
    expect(deriveScore(sequence)).toMatchObject({
      scoreA: 11,
      scoreB: 10,
      winner: "A",
      gamePointRallyNumber: 21,
    });
  });
  it("stops counting after the game point", () => {
    expect(
      deriveScore([...rallies("A", 11), { rallyNumber: 12, winningSide: "B" }]),
    ).toMatchObject({ scoreA: 11, scoreB: 0, gamePointRallyNumber: 11 });
  });
  it("reconstructs score after reversal", () => {
    const corrected = applyRallyCorrection(
      [...rallies("A", 2), { rallyNumber: 3, winningSide: "B" }],
      2,
      "reverse",
      null,
    );
    expect(deriveScore(corrected)).toMatchObject({ scoreA: 1, scoreB: 1 });
  });
  it("reconstructs score after winner replacement", () => {
    const corrected = applyRallyCorrection(
      rallies("A", 2),
      2,
      "replace_winner",
      "B",
    );
    expect(deriveScore(corrected)).toMatchObject({ scoreA: 1, scoreB: 1 });
  });
  it("detects streaks of three and five", () => {
    expect(detectStreaks(rallies("A", 3))).toEqual({
      maximum: 3,
      hasThree: true,
      hasFive: false,
    });
    expect(detectStreaks(rallies("B", 5))).toEqual({
      maximum: 5,
      hasThree: true,
      hasFive: true,
    });
  });
  it("requires matching client and logical sequences", () => {
    const value = recordRallySchema.parse({
      matchId: "10000000-0000-4000-8000-000000000001",
      winningSideId: "10000000-0000-4000-8000-000000000002",
      expectedRallyNumber: 1,
      clientSequence: 1,
      clientRecordedAt: null,
      operationId: "10000000-0000-4000-8000-000000000003",
    });
    expect(value.expectedRallyNumber).toBe(1);
    expect(() =>
      recordRallySchema.parse({
        ...value,
        clientSequence: 2,
      }),
    ).toThrow(/client sequence/i);
  });
  it("allows actions only for effective participants, not reserves", () => {
    expect(canAttributeTechnicalAction(["starter"], "starter")).toBe(true);
    expect(canAttributeTechnicalAction(["starter"], "reserve")).toBe(false);
  });
  it("keeps the official UR Play MVP rule", () =>
    expect(urPlayScoringRule).toEqual({
      pointsToWin: 11,
      winBy: 1,
      maxPoints: null,
      setsToWin: 1,
      scoringType: "rally_point",
    }));
});
