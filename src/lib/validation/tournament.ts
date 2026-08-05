import { z } from "zod";

export const tournamentProducts = ["series", "cup", "legends"] as const;
export const competitionContexts = [
  "ur_play",
  "pole_tournament",
  "regional",
  "legends",
] as const;
export const tournamentFormats = [
  "league",
  "groups_championship",
  "power_stage",
] as const;
export const competitiveLevels = ["n1", "n2"] as const;
export const allLevels = ["leveling", "n3", "n2", "n1"] as const;
export const formationFormats = ["doubles", "fours"] as const;
export const categories = ["female", "male", "mixed", "open"] as const;

export type TournamentProduct = (typeof tournamentProducts)[number];
export type CompetitionContext = (typeof competitionContexts)[number];
export type TournamentFormat = (typeof tournamentFormats)[number];
export type CompetitiveLevel = (typeof competitiveLevels)[number];
export type FormationFormat = (typeof formationFormats)[number];
export type TournamentCategory = (typeof categories)[number];

export const productContext: Record<TournamentProduct, CompetitionContext> = {
  series: "pole_tournament",
  cup: "regional",
  legends: "legends",
};

export function productLabel(product: TournamentProduct) {
  return product === "series"
    ? "UR Series"
    : product === "cup"
      ? "UR Cup"
      : "UR Legends";
}

export function isOfficialTournamentLevel(level: string) {
  return level === "n1" || level === "n2";
}

export function assertOfficialTournamentLevel(level: string) {
  if (!isOfficialTournamentLevel(level))
    throw new Error("level is not eligible for official tournaments");
}

export function recommendTournamentFormat(size: number): TournamentFormat {
  if (size >= 3 && size <= 5) return "league";
  if (size >= 6 && size <= 8) return "groups_championship";
  if (size >= 9 && size <= 12) return "power_stage";
  throw new Error("formation count outside supported official range");
}

export function validTournamentFormats(size: number): TournamentFormat[] {
  if (size >= 3 && size <= 5) return ["league"];
  if (size >= 6 && size <= 8) return ["groups_championship"];
  if (size >= 9 && size <= 12) return ["power_stage"];
  return [];
}

export type MatchFormat = "single_game" | "best_of_3";
export type MatchSetRule = {
  setNumber: 1 | 2 | 3;
  pointsToWin: number;
  winBy: number;
};
export const urPlaySingleGameRule: MatchSetRule[] = [
  { setNumber: 1, pointsToWin: 11, winBy: 1 },
];
export const tournamentBestOfThreeRules: MatchSetRule[] = [
  { setNumber: 1, pointsToWin: 21, winBy: 2 },
  { setNumber: 2, pointsToWin: 21, winBy: 2 },
  { setNumber: 3, pointsToWin: 15, winBy: 2 },
];

export type RallySide = "A" | "B";
export type TournamentRally = {
  rallyNumber: number;
  setNumber?: number;
  winningSide: RallySide;
};
export type DerivedSet = {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  winner: RallySide | null;
  winningRallyNumber: number | null;
};
export type DerivedMatchScore = {
  format: MatchFormat;
  currentSet: number;
  setsWonA: number;
  setsWonB: number;
  winner: RallySide | null;
  matchPointRallyNumber: number | null;
  sets: DerivedSet[];
};

function sideWon(score: number, opponent: number, rule: MatchSetRule) {
  return score >= rule.pointsToWin && score - opponent >= rule.winBy;
}

export function deriveMultiSetScore(
  rallies: readonly TournamentRally[],
  format: MatchFormat,
): DerivedMatchScore {
  const rules =
    format === "single_game"
      ? urPlaySingleGameRule
      : tournamentBestOfThreeRules;
  const sets: DerivedSet[] = [];
  let setsWonA = 0;
  let setsWonB = 0;
  let winner: RallySide | null = null;
  let matchPointRallyNumber: number | null = null;
  let currentSet = 1;

  for (const rule of rules) {
    let scoreA = 0;
    let scoreB = 0;
    let setWinner: RallySide | null = null;
    let setRally: number | null = null;
    const setRallies = rallies
      .filter((rally) => (rally.setNumber ?? rule.setNumber) === rule.setNumber)
      .sort((left, right) => left.rallyNumber - right.rallyNumber);
    for (const rally of setRallies) {
      if (setWinner) break;
      if (rally.winningSide === "A") scoreA += 1;
      else scoreB += 1;
      if (sideWon(scoreA, scoreB, rule)) setWinner = "A";
      if (sideWon(scoreB, scoreA, rule)) setWinner = "B";
      if (setWinner) setRally = rally.rallyNumber;
    }
    if (setWinner === "A") setsWonA += 1;
    if (setWinner === "B") setsWonB += 1;
    sets.push({
      setNumber: rule.setNumber,
      scoreA,
      scoreB,
      winner: setWinner,
      winningRallyNumber: setRally,
    });
    currentSet = rule.setNumber;
    if (
      setsWonA === 2 ||
      setsWonB === 2 ||
      (format === "single_game" && setWinner)
    ) {
      winner = setsWonA > setsWonB ? "A" : "B";
      matchPointRallyNumber = setRally;
      break;
    }
    if (!setWinner) break;
    currentSet = Math.min(rule.setNumber + 1, rules.length);
  }

  return {
    format,
    currentSet,
    setsWonA,
    setsWonB,
    winner,
    matchPointRallyNumber,
    sets,
  };
}

export function isGamePointRally(
  score: DerivedMatchScore,
  rallyNumber: number,
) {
  return score.matchPointRallyNumber === rallyNumber;
}

export type StandingInput = {
  id: string;
  seed: number;
  matchesWon: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  defeated: string[];
  strengthOfSchedule?: number;
};

export function compareLeagueStanding(a: StandingInput, b: StandingInput) {
  const setDiffA = a.setsWon - a.setsLost;
  const setDiffB = b.setsWon - b.setsLost;
  const pointDiffA = a.pointsWon - a.pointsLost;
  const pointDiffB = b.pointsWon - b.pointsLost;
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (setDiffB !== setDiffA) return setDiffB - setDiffA;
  if (pointDiffB !== pointDiffA) return pointDiffB - pointDiffA;
  if (a.defeated.includes(b.id) && !b.defeated.includes(a.id)) return -1;
  if (b.defeated.includes(a.id) && !a.defeated.includes(b.id)) return 1;
  return a.seed - b.seed;
}

export function comparePowerStageStanding(a: StandingInput, b: StandingInput) {
  const setDiffA = a.setsWon - a.setsLost;
  const setDiffB = b.setsWon - b.setsLost;
  const pointDiffA = a.pointsWon - a.pointsLost;
  const pointDiffB = b.pointsWon - b.pointsLost;
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (setDiffB !== setDiffA) return setDiffB - setDiffA;
  if (pointDiffB !== pointDiffA) return pointDiffB - pointDiffA;
  if ((b.strengthOfSchedule ?? 0) !== (a.strengthOfSchedule ?? 0))
    return (b.strengthOfSchedule ?? 0) - (a.strengthOfSchedule ?? 0);
  return a.seed - b.seed;
}

export function rankStandings(rows: StandingInput[], format: TournamentFormat) {
  const compare =
    format === "power_stage"
      ? comparePowerStageStanding
      : compareLeagueStanding;
  return [...rows]
    .sort(compare)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export type EligibilityInput = {
  athleteId: string;
  seasonId: string;
  level: string;
  homologatedUrPlayMatches: number;
  disciplineBlocked: boolean;
  registrationStatus: "confirmed" | "pending" | "waitlisted" | "cancelled";
};

export function evaluateTournamentEligibility(input: EligibilityInput) {
  const reasons: string[] = [];
  if (!isOfficialTournamentLevel(input.level))
    reasons.push("LEVEL_NOT_OFFICIAL");
  if (input.homologatedUrPlayMatches < 3)
    reasons.push("MIN_UR_PLAY_MATCHES_NOT_MET");
  if (input.disciplineBlocked) reasons.push("DISCIPLINE_BLOCKED");
  if (!["confirmed", "pending"].includes(input.registrationStatus))
    reasons.push("REGISTRATION_NOT_ACTIVE");
  return { status: reasons.length ? "ineligible" : "eligible", reasons };
}

export function tournamentEntryPrice(
  entryIndex: number,
  prices = [100, 90, 85],
) {
  if (entryIndex <= 0) throw new Error("entry index must be positive");
  return prices[Math.min(entryIndex - 1, prices.length - 1)]!;
}

export function qualifySeriesToCup(
  standings: { rosterId: string; position: number }[],
) {
  return standings
    .filter((row) => row.position <= 2)
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      qualifiedRosterId: row.rosterId,
      qualificationPosition: row.position,
      targetCompetition: "cup" as const,
    }));
}

export function legendsDoublesPairs(athletes: string[]) {
  if (athletes.length !== 4) throw new Error("four athletes required per pole");
  return [
    [athletes[0]!, athletes[3]!],
    [athletes[1]!, athletes[2]!],
  ];
}

export function legendsFoursSquads(athletes: string[]) {
  if (athletes.length !== 8)
    throw new Error("eight athletes required per pole");
  return [
    [athletes[0]!, athletes[3]!, athletes[4]!, athletes[7]!],
    [athletes[1]!, athletes[2]!, athletes[5]!, athletes[6]!],
  ];
}

export type RotationFormation = {
  id: string;
  defeatedFormationIds: string[];
  restMatchesRemaining?: number;
  queuedAt: string;
};

export function nextRotationState(
  winner: RotationFormation,
  availableOpponents: RotationFormation[],
) {
  const remaining = availableOpponents.filter(
    (opponent) =>
      opponent.id !== winner.id &&
      !winner.defeatedFormationIds.includes(opponent.id),
  );
  if (remaining.length > 0)
    return { winnerStatus: "stays", priorityReturn: false, restMatches: 0 };
  return { winnerStatus: "rests", priorityReturn: true, restMatches: 1 };
}

export function scheduledRoundPairs(formationIds: string[]) {
  const ids = [...formationIds].sort();
  const pairs: { sideA: string; sideB: string }[] = [];
  for (let left = 0; left < ids.length; left += 1)
    for (let right = left + 1; right < ids.length; right += 1)
      pairs.push({ sideA: ids[left]!, sideB: ids[right]! });
  return pairs;
}

export const createTournamentSchema = z.object({
  product: z.enum(tournamentProducts),
  seasonId: z.uuid(),
  poleId: z.uuid().nullable(),
  name: z.string().trim().min(3).max(120),
});
