import { describe, expect, it } from "vitest";
import {
  compareIndividualRanking,
  nextPositionTarget,
  positionRanking,
  rankingMovement,
  type RankingSortable,
} from "./ranking-classification.service";

const base = (id: string, values: Partial<RankingSortable> = {}) => ({
  id,
  totalPoints: 100,
  wins: 3,
  gamesPlayed: 5,
  technicalPoints: 10,
  disciplinaryBalance: 0,
  reachedScoreAt: "2026-08-01T10:00:00.000Z",
  ...values,
});

describe("official ranking classification", () => {
  it.each([
    ["points", base("a", { totalPoints: 120 }), base("b")],
    ["wins", base("a", { wins: 4 }), base("b")],
    ["games", base("a", { gamesPlayed: 6 }), base("b")],
    ["win rate", base("a", { wins: 4, gamesPlayed: 5 }), base("b")],
    ["technical", base("a", { technicalPoints: 11 }), base("b")],
  ])("uses %s as a deterministic tiebreak", (_name, first, second) => {
    expect(compareIndividualRanking(first, second)).toBeLessThan(0);
  });

  it("uses reached score timestamp and id as final deterministic keys", () => {
    const ranked = positionRanking([
      base("b"),
      base("a", { reachedScoreAt: "2026-07-31T10:00:00.000Z" }),
      base("c"),
    ]);
    expect(ranked.map(({ id, position }) => [id, position])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it.each([
    [8, 11, "up", 3],
    [11, 8, "down", -3],
    [8, 8, "stable", 0],
    [8, null, "new", null],
  ] as const)("derives movement", (current, previous, state, change) => {
    expect(rankingMovement(current, previous)).toEqual({ state, change });
  });

  it("derives the next target without estimating matches", () => {
    expect(
      nextPositionTarget({ current_position: 8, total_points: 1284 }, [
        { current_position: 7, display_name: "Atleta X", total_points: 1316 },
      ]),
    ).toMatchObject({ display_name: "Atleta X", pointsBehind: 32 });
  });
});
