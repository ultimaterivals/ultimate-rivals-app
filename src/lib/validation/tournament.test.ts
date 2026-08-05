import { describe, expect, it } from "vitest";
import {
  deriveMultiSetScore,
  evaluateTournamentEligibility,
  isGamePointRally,
  legendsDoublesPairs,
  legendsFoursSquads,
  nextRotationState,
  qualifySeriesToCup,
  rankStandings,
  recommendTournamentFormat,
  scheduledRoundPairs,
  tournamentEntryPrice,
} from "./tournament";

const rallies = (counts: [number, number][], start = 1) => {
  let rallyNumber = start;
  return counts.flatMap(([a, b], index) => {
    const set: {
      rallyNumber: number;
      setNumber: number;
      winningSide: "A" | "B";
    }[] = [];
    const shared = Math.min(a, b);
    for (let point = 0; point < shared; point += 1) {
      set.push({
        rallyNumber: rallyNumber++,
        setNumber: index + 1,
        winningSide: "A",
      });
      set.push({
        rallyNumber: rallyNumber++,
        setNumber: index + 1,
        winningSide: "B",
      });
    }
    const winner = a > b ? "A" : "B";
    for (let point = shared; point < Math.max(a, b); point += 1)
      set.push({
        rallyNumber: rallyNumber++,
        setNumber: index + 1,
        winningSide: winner,
      });
    return set;
  });
};

describe("Sprint 12 tournament rules", () => {
  it("preserves UR Play as a single 11-point game with win_by 1", () => {
    const score = deriveMultiSetScore(rallies([[11, 10]]), "single_game");
    expect(score.winner).toBe("A");
    expect(score.setsWonA).toBe(1);
    expect(score.matchPointRallyNumber).toBe(21);
  });

  it("derives best of 3 with 21/21/15 and 2-0 result", () => {
    const score = deriveMultiSetScore(
      rallies([
        [21, 19],
        [23, 21],
      ]),
      "best_of_3",
    );
    expect(score.winner).toBe("A");
    expect(score.setsWonA).toBe(2);
    expect(score.setsWonB).toBe(0);
    expect(score.sets.map((set) => [set.scoreA, set.scoreB])).toEqual([
      [21, 19],
      [23, 21],
    ]);
  });

  it("derives best of 3 with tie-break to 15 and 2-1 result", () => {
    const score = deriveMultiSetScore(
      rallies([
        [21, 18],
        [19, 21],
        [17, 15],
      ]),
      "best_of_3",
    );
    expect(score.winner).toBe("A");
    expect(score.setsWonA).toBe(2);
    expect(score.setsWonB).toBe(1);
    expect(score.sets.at(-1)).toMatchObject({ scoreA: 17, scoreB: 15 });
  });

  it("counts GAME_POINT only on the rally that closes the match", () => {
    const score = deriveMultiSetScore(
      rallies([
        [21, 10],
        [18, 21],
        [15, 9],
      ]),
      "best_of_3",
    );
    expect(isGamePointRally(score, score.sets[0]!.winningRallyNumber!)).toBe(
      false,
    );
    expect(isGamePointRally(score, score.matchPointRallyNumber!)).toBe(true);
  });

  it("selects official formats by field size", () => {
    expect(recommendTournamentFormat(4)).toBe("league");
    expect(recommendTournamentFormat(8)).toBe("groups_championship");
    expect(recommendTournamentFormat(12)).toBe("power_stage");
  });

  it("orders league standings by wins, sets, points, head-to-head and seed", () => {
    const ranked = rankStandings(
      [
        {
          id: "b",
          seed: 2,
          matchesWon: 2,
          setsWon: 4,
          setsLost: 2,
          pointsWon: 120,
          pointsLost: 100,
          defeated: ["a"],
        },
        {
          id: "a",
          seed: 1,
          matchesWon: 2,
          setsWon: 4,
          setsLost: 2,
          pointsWon: 120,
          pointsLost: 100,
          defeated: [],
        },
        {
          id: "c",
          seed: 3,
          matchesWon: 1,
          setsWon: 2,
          setsLost: 4,
          pointsWon: 90,
          pointsLost: 110,
          defeated: [],
        },
      ],
      "league",
    );
    expect(ranked.map((row) => row.id)).toEqual(["b", "a", "c"]);
  });

  it("orders power stage by strength of schedule before seed", () => {
    const ranked = rankStandings(
      [
        {
          id: "a",
          seed: 1,
          matchesWon: 2,
          setsWon: 4,
          setsLost: 2,
          pointsWon: 100,
          pointsLost: 90,
          defeated: [],
          strengthOfSchedule: 3,
        },
        {
          id: "b",
          seed: 2,
          matchesWon: 2,
          setsWon: 4,
          setsLost: 2,
          pointsWon: 100,
          pointsLost: 90,
          defeated: [],
          strengthOfSchedule: 5,
        },
      ],
      "power_stage",
    );
    expect(ranked[0]!.id).toBe("b");
  });

  it("requires three homologated UR Play matches and official levels", () => {
    expect(
      evaluateTournamentEligibility({
        athleteId: "a",
        seasonId: "s",
        level: "n2",
        homologatedUrPlayMatches: 3,
        disciplineBlocked: false,
        registrationStatus: "confirmed",
      }).status,
    ).toBe("eligible");
    expect(
      evaluateTournamentEligibility({
        athleteId: "a",
        seasonId: "s",
        level: "leveling",
        homologatedUrPlayMatches: 2,
        disciplineBlocked: false,
        registrationStatus: "confirmed",
      }).reasons,
    ).toEqual(["LEVEL_NOT_OFFICIAL", "MIN_UR_PLAY_MATCHES_NOT_MET"]);
  });

  it("applies configurable multi-entry pricing", () => {
    expect([1, 2, 3, 4].map((entry) => tournamentEntryPrice(entry))).toEqual([
      100, 90, 85, 85,
    ]);
  });

  it("qualifies champion and runner-up from Series to Cup", () => {
    expect(
      qualifySeriesToCup([
        { rosterId: "third", position: 3 },
        { rosterId: "champion", position: 1 },
        { rosterId: "runner", position: 2 },
      ]),
    ).toEqual([
      {
        qualifiedRosterId: "champion",
        qualificationPosition: 1,
        targetCompetition: "cup",
      },
      {
        qualifiedRosterId: "runner",
        qualificationPosition: 2,
        targetCompetition: "cup",
      },
    ]);
  });

  it("builds Legends doubles and fours from ranking seed", () => {
    expect(legendsDoublesPairs(["1", "2", "3", "4"])).toEqual([
      ["1", "4"],
      ["2", "3"],
    ]);
    expect(
      legendsFoursSquads(["1", "2", "3", "4", "5", "6", "7", "8"]),
    ).toEqual([
      ["1", "4", "5", "8"],
      ["2", "3", "6", "7"],
    ]);
  });

  it("rests a rotation winner after all eligible opponents were beaten", () => {
    expect(
      nextRotationState(
        {
          id: "winner",
          defeatedFormationIds: ["a", "b"],
          queuedAt: "2026-08-05T00:00:00Z",
        },
        [
          {
            id: "a",
            defeatedFormationIds: [],
            queuedAt: "2026-08-05T00:00:00Z",
          },
          {
            id: "b",
            defeatedFormationIds: [],
            queuedAt: "2026-08-05T00:00:00Z",
          },
        ],
      ),
    ).toMatchObject({
      winnerStatus: "rests",
      priorityReturn: true,
      restMatches: 1,
    });
  });

  it("generates scheduled rounds without rematches for small fields", () => {
    expect(scheduledRoundPairs(["d", "b", "a", "c"])).toHaveLength(6);
  });
});
