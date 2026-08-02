import { describe, expect, it } from "vitest";
import {
  baseMatchMerits,
  explainRankingRule,
  rankingPoints,
  technicalMerit,
} from "./ranking-engine.service";

describe("ranking engine merits", () => {
  it("awards participation and win without mutating a stored total", () => {
    expect(baseMatchMerits(true)).toEqual([
      { ruleCode: "PARTICIPATION", points: 8 },
      { ruleCode: "WIN", points: 6 },
    ]);
  });

  it("awards participation and loss", () => {
    expect(baseMatchMerits(false)).toEqual([
      { ruleCode: "PARTICIPATION", points: 8 },
      { ruleCode: "LOSS", points: 2 },
    ]);
  });

  it.each([
    ["ACE", 4],
    ["ATTACK", 2],
    ["BLOCK", 3],
    ["DEFENSE", 1],
    ["ASSIST", 1],
  ] as const)("maps %s to its frozen initial value", (code, points) => {
    expect(technicalMerit(code)).toEqual({ ruleCode: code, points });
  });

  it("keeps game point explicit and translates rule codes", () => {
    expect(rankingPoints.GAME_POINT).toBe(6);
    expect(explainRankingRule("GAME_POINT")).toBe("Game point");
    expect(explainRankingRule("UNKNOWN_V2")).toBe("Ajuste de pontuação");
  });
});
