import { describe, expect, it } from "vitest";
import {
  deriveMultiSetScore,
  evaluateTournamentEligibility,
  isGamePointRally,
  qualifySeriesToCup,
  rankStandings,
} from "@/lib/validation/tournament";

describe("Sprint 12 tournament invariants", () => {
  it("keeps tournament scoring best-of-3 and GAME_POINT on final match rally only", () => {
    let rallyNumber = 1;
    const make = (setNumber: number, side: "A" | "B", total: number) =>
      Array.from({ length: total }, () => ({
        setNumber,
        winningSide: side,
        rallyNumber: rallyNumber++,
      }));
    const score = deriveMultiSetScore(
      [
        ...make(1, "A", 21),
        ...make(1, "B", 18),
        ...make(2, "B", 21),
        ...make(2, "A", 19),
        ...make(3, "A", 15),
        ...make(3, "B", 12),
      ],
      "best_of_3",
    );
    expect(score.winner).toBe("A");
    expect(isGamePointRally(score, score.sets[0]!.winningRallyNumber!)).toBe(
      false,
    );
    expect(isGamePointRally(score, score.matchPointRallyNumber!)).toBe(true);
  });

  it("blocks leveling and athletes with two UR Play matches", () => {
    const ineligible = evaluateTournamentEligibility({
      athleteId: "dev-athlete",
      seasonId: "season",
      level: "leveling",
      homologatedUrPlayMatches: 2,
      disciplineBlocked: false,
      registrationStatus: "confirmed",
    });
    expect(ineligible.status).toBe("ineligible");
    expect(ineligible.reasons).toEqual([
      "LEVEL_NOT_OFFICIAL",
      "MIN_UR_PLAY_MATCHES_NOT_MET",
    ]);
  });

  it("qualifies champion and runner-up and derives standings without season win rate", () => {
    const standings = rankStandings(
      [
        {
          id: "betim-2",
          seed: 2,
          matchesWon: 2,
          setsWon: 4,
          setsLost: 2,
          pointsWon: 110,
          pointsLost: 100,
          defeated: [],
        },
        {
          id: "betim-1",
          seed: 1,
          matchesWon: 3,
          setsWon: 6,
          setsLost: 0,
          pointsWon: 126,
          pointsLost: 80,
          defeated: ["betim-2"],
        },
        {
          id: "betim-3",
          seed: 3,
          matchesWon: 1,
          setsWon: 2,
          setsLost: 4,
          pointsWon: 88,
          pointsLost: 110,
          defeated: [],
        },
      ],
      "league",
    );
    expect(standings.map((row) => row.id)).toEqual([
      "betim-1",
      "betim-2",
      "betim-3",
    ]);
    expect(
      qualifySeriesToCup(
        standings.map((row) => ({ rosterId: row.id, position: row.position })),
      ),
    ).toHaveLength(2);
  });
});
