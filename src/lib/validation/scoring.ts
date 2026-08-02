import { z } from "zod";

const uuid = z.string().uuid();
const operationId = uuid;

export const technicalActionTypes = [
  "ace",
  "attack",
  "block",
  "defense",
  "assist",
] as const;
export type TechnicalActionType = (typeof technicalActionTypes)[number];

export const rallyCorrectionTypes = [
  "reverse",
  "replace_winner",
  "void",
] as const;
export type RallyCorrectionType = (typeof rallyCorrectionTypes)[number];

export const scoringRuleSchema = z
  .object({
    pointsToWin: z.number().int().min(1).max(100),
    winBy: z.number().int().min(1).max(10),
    maxPoints: z.number().int().min(1).max(100).nullable(),
    setsToWin: z.number().int().min(1).max(5),
    scoringType: z.literal("rally_point"),
  })
  .refine(
    (rule) => rule.maxPoints === null || rule.maxPoints >= rule.pointsToWin,
    { message: "maxPoints must be greater than or equal to pointsToWin" },
  );

export type ScoringRule = z.infer<typeof scoringRuleSchema>;
export const urPlayScoringRule: ScoringRule = {
  pointsToWin: 11,
  winBy: 1,
  maxPoints: null,
  setsToWin: 1,
  scoringType: "rally_point",
};

export const recordRallySchema = z
  .object({
    matchId: uuid,
    winningSideId: uuid,
    expectedRallyNumber: z.coerce.number().int().positive(),
    clientSequence: z.coerce.number().int().positive(),
    clientRecordedAt: z.string().datetime().nullable(),
    operationId,
  })
  .refine((value) => value.clientSequence === value.expectedRallyNumber, {
    path: ["clientSequence"],
    message: "client sequence must match expected rally number",
  });

export const recordTechnicalActionSchema = z.object({
  rallyId: uuid,
  athleteId: uuid,
  actionType: z.enum(technicalActionTypes),
  correctionReason: z.string().trim().min(5).nullable(),
  operationId,
});

export const correctRallySchema = z
  .object({
    rallyId: uuid,
    correctionType: z.enum(rallyCorrectionTypes),
    replacementWinningSideId: uuid.nullable(),
    reason: z.string().trim().min(5).max(500),
    operationId,
  })
  .superRefine((value, context) => {
    const replacementRequired = value.correctionType === "replace_winner";
    if (replacementRequired !== (value.replacementWinningSideId !== null))
      context.addIssue({
        code: "custom",
        path: ["replacementWinningSideId"],
        message: "replacement side must be provided only for replace_winner",
      });
  });

export const reverseRallySchema = z.object({
  rallyId: uuid,
  reason: z.string().trim().min(5).max(500),
  operationId,
});

export const voidTechnicalActionSchema = reverseRallySchema;
export const submitMatchForReviewSchema = z.object({
  matchId: uuid,
  operationId,
});
export const homologateMatchSchema = submitMatchForReviewSchema;
export const requestMatchCorrectionSchema = z.object({
  matchId: uuid,
  reason: z.string().trim().min(5).max(500),
  operationId,
});
export const voidMatchSchema = requestMatchCorrectionSchema;

export type EffectiveRally = {
  rallyNumber: number;
  winningSide: "A" | "B" | null;
};

export type DerivedScore = {
  scoreA: number;
  scoreB: number;
  isGameOver: boolean;
  winner: "A" | "B" | null;
  gamePointRallyNumber: number | null;
};

export function hasWon(
  ownScore: number,
  opponentScore: number,
  rule: ScoringRule,
) {
  return (
    (ownScore >= rule.pointsToWin && ownScore - opponentScore >= rule.winBy) ||
    (rule.maxPoints !== null &&
      ownScore >= rule.maxPoints &&
      ownScore > opponentScore)
  );
}

export function deriveScore(
  rallies: readonly EffectiveRally[],
  rule: ScoringRule = urPlayScoringRule,
): DerivedScore {
  let scoreA = 0,
    scoreB = 0,
    winner: "A" | "B" | null = null,
    gamePointRallyNumber: number | null = null;
  for (const rally of [...rallies].sort(
    (left, right) => left.rallyNumber - right.rallyNumber,
  )) {
    if (rally.winningSide === "A") scoreA += 1;
    if (rally.winningSide === "B") scoreB += 1;
    if (winner === null && hasWon(scoreA, scoreB, rule)) {
      winner = "A";
      gamePointRallyNumber = rally.rallyNumber;
    } else if (winner === null && hasWon(scoreB, scoreA, rule)) {
      winner = "B";
      gamePointRallyNumber = rally.rallyNumber;
    }
    if (winner !== null) break;
  }
  return {
    scoreA,
    scoreB,
    isGameOver: winner !== null,
    winner,
    gamePointRallyNumber,
  };
}

export function applyRallyCorrection(
  rallies: readonly EffectiveRally[],
  rallyNumber: number,
  correctionType: RallyCorrectionType,
  replacementWinner: "A" | "B" | null,
) {
  return rallies.map((rally) =>
    rally.rallyNumber !== rallyNumber
      ? rally
      : {
          ...rally,
          winningSide:
            correctionType === "replace_winner" ? replacementWinner : null,
        },
  );
}

export function detectStreaks(rallies: readonly EffectiveRally[]) {
  let currentSide: "A" | "B" | null = null,
    current = 0,
    maximum = 0;
  for (const rally of [...rallies].sort(
    (left, right) => left.rallyNumber - right.rallyNumber,
  )) {
    if (rally.winningSide === null) continue;
    if (rally.winningSide === currentSide) current += 1;
    else {
      currentSide = rally.winningSide;
      current = 1;
    }
    maximum = Math.max(maximum, current);
  }
  return { maximum, hasThree: maximum >= 3, hasFive: maximum >= 5 };
}

export function canAttributeTechnicalAction(
  participantAthleteIds: readonly string[],
  athleteId: string,
) {
  return participantAthleteIds.includes(athleteId);
}
