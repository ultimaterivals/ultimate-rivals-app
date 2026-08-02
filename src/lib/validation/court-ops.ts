import { z } from "zod";

const uuid = z.uuid();
export const matchStatuses = [
  "draft",
  "queued",
  "called",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
  "abandoned",
] as const;
const nextStatus: Record<string, string> = {
  queued: "called",
  called: "ready",
  ready: "in_progress",
};
export const canTransitionMatch = (from: string, to: string) =>
  nextStatus[from] === to ||
  (to === "cancelled" &&
    ["draft", "queued", "called", "ready"].includes(from)) ||
  (from === "in_progress" && to === "abandoned");
export const requiredSideSize = (format: string) =>
  format === "doubles" ? 2 : format === "fours" ? 4 : 0;
export const validSideSizes = (format: string, a: unknown[], b: unknown[]) =>
  a.length === requiredSideSize(format) &&
  b.length === requiredSideSize(format);
export const hasUniqueAthletes = (a: string[], b: string[]) =>
  new Set([...a, ...b]).size === a.length + b.length;
export const hasUniqueSquadAthletes = (
  sideA: string[],
  sideB: string[],
  sideAReserves: string[],
  sideBReserves: string[],
) => {
  const athletes = [...sideA, ...sideB, ...sideAReserves, ...sideBReserves];
  return new Set(athletes).size === athletes.length;
};
export const validFoursSquad = (starters: unknown[], reserves: unknown[]) =>
  starters.length === 4 && reserves.length <= 3;
export const canAddReserve = (reserveCount: number) => reserveCount < 3;
export const canEditMatchSquad = (status: string) =>
  ["draft", "queued", "called", "ready"].includes(status);
export const canChangeMatchCourt = canEditMatchSquad;
export function applyPreMatchSubstitution(
  starters: string[],
  reserves: string[],
  outgoingStarter: string,
  incomingReserve: string,
) {
  if (
    !starters.includes(outgoingStarter) ||
    !reserves.includes(incomingReserve)
  )
    throw new Error("starter and reserve are required");
  return {
    starters: starters.map((athlete) =>
      athlete === outgoingStarter ? incomingReserve : athlete,
    ),
    reserves: reserves.map((athlete) =>
      athlete === incomingReserve ? outgoingStarter : athlete,
    ),
  };
}
export const validMixedComposition = (format: string, genders: string[]) => {
  const required = requiredSideSize(format) / 2;
  return (
    genders.filter((g) => g === "female").length === required &&
    genders.filter((g) => g === "male").length === required
  );
};
export const compatibleLevel = (
  matchLevel: string,
  athleteLevel: string | null,
) => athleteLevel === matchLevel || athleteLevel === "leveling";
export const restWarning = (
  lastEndedAt: string | null,
  minRestMinutes: number | null,
  now = Date.now(),
) =>
  Boolean(
    lastEndedAt &&
    minRestMinutes &&
    now - new Date(lastEndedAt).getTime() < minRestMinutes * 60_000,
  );

const createMatchBaseSchema = z.object({
  sessionId: uuid,
  courtId: uuid,
  formatId: uuid,
  categoryId: uuid,
  level: z.enum(["leveling", "n3", "n2", "n1"]),
  sideA: z.array(uuid).min(2).max(4),
  sideB: z.array(uuid).min(2).max(4),
  sideAReserves: z.array(uuid).max(3).default([]),
  sideBReserves: z.array(uuid).max(3).default([]),
  sideARosterId: uuid.nullable().default(null),
  sideBRosterId: uuid.nullable().default(null),
  operationId: uuid,
});
export const createMatchSchema = createMatchBaseSchema.superRefine(
  (value, context) => {
    if (
      !hasUniqueSquadAthletes(
        value.sideA,
        value.sideB,
        value.sideAReserves,
        value.sideBReserves,
      )
    )
      context.addIssue({
        code: "custom",
        message: "O mesmo atleta não pode ocupar dois slots do squad.",
      });
  },
);
export const updateDraftMatchSchema = createMatchBaseSchema
  .partial()
  .extend({ matchId: uuid });
export const assignMatchParticipantSchema = z.object({
  matchId: uuid,
  sideId: uuid,
  athleteId: uuid,
  registrationId: uuid,
  positionOrder: z.coerce.number().int().min(1).max(4),
  operationId: uuid,
});
export const removeMatchParticipantSchema = z.object({
  participantId: uuid,
  operationId: uuid,
});
export const replaceMatchParticipantSchema = z.object({
  participantId: uuid,
  athleteId: uuid,
  operationId: uuid,
});
const transitionSchema = z.object({ matchId: uuid, operationId: uuid });
export const queueMatchSchema = transitionSchema;
export const callMatchSchema = transitionSchema;
export const markMatchReadySchema = transitionSchema;
export const startMatchSchema = transitionSchema;
export const cancelMatchSchema = transitionSchema.extend({
  reason: z.string().trim().min(5),
});
export const abandonMatchSchema = cancelMatchSchema;
export const setQueueStatusSchema = z.object({
  entryId: uuid,
  status: z.enum([
    "waiting",
    "assigned",
    "playing",
    "resting",
    "unavailable",
    "finished",
  ]),
});
export const requestMatchSuggestionSchema = z.object({
  sessionId: uuid,
  format: z.enum(["doubles", "fours"]),
  category: z.enum(["female", "male", "mixed"]),
  level: z.enum(["leveling", "n3", "n2", "n1"]),
});
export const acceptMatchSuggestionSchema = createMatchSchema;

export const createMatchSquadSchema = z.object({
  matchId: uuid,
  sideId: uuid,
  starters: z.array(uuid).min(2).max(4),
  reserves: z.array(uuid).max(3),
  rosterId: uuid.nullable().default(null),
  operationId: uuid,
});
export const addReserveSchema = z.object({
  matchId: uuid,
  sideId: uuid,
  athleteId: uuid,
  rosterId: uuid.nullable().default(null),
  operationId: uuid,
});
export const removeReserveSchema = z.object({
  memberId: uuid,
  disposition: z.enum(["waiting", "withdrawn"]),
  reason: z.string().trim().min(5).max(500),
  operationId: uuid,
});
export const confirmReservePresenceSchema = z.object({
  memberId: uuid,
  presence: z.enum(["expected", "present", "absent", "excused"]),
  reason: z.string().trim().min(5).max(500),
  operationId: uuid,
});
export const promoteReserveToStarterSchema = z.object({
  reserveMemberId: uuid,
  participantId: uuid,
  outgoingDisposition: z.enum(["bench", "waiting", "withdrawn"]),
  reason: z.string().trim().min(5).max(500),
  operationId: uuid,
});
export const moveStarterToBenchSchema = z.object({
  participantId: uuid,
  reserveMemberId: uuid,
  reason: z.string().trim().min(5).max(500),
  operationId: uuid,
});
export const replaceStarterSchema = promoteReserveToStarterSchema;
export const changeMatchCourtSchema = z.object({
  matchId: uuid,
  courtId: uuid,
  reason: z.string().trim().min(5).max(500),
  operationId: uuid,
});

export type MatchmakingCandidate = {
  athleteId: string;
  gamesPlayed: number;
  queuedAt: string;
  lastMatchEndedAt: string | null;
  recentPartners: string[];
  recentOpponents: string[];
};
export function scoreCandidates(candidates: MatchmakingCandidate[]) {
  return [...candidates].sort(
    (a, b) =>
      a.gamesPlayed - b.gamesPlayed ||
      new Date(a.lastMatchEndedAt ?? 0).getTime() -
        new Date(b.lastMatchEndedAt ?? 0).getTime() ||
      new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime() ||
      a.athleteId.localeCompare(b.athleteId),
  );
}
export function suggestSides(
  candidates: MatchmakingCandidate[],
  format: "doubles" | "fours",
) {
  const selected = scoreCandidates(candidates).slice(
    0,
    requiredSideSize(format) * 2,
  );
  const sideA: MatchmakingCandidate[] = [],
    sideB: MatchmakingCandidate[] = [];
  const remaining = [...selected];
  while (remaining.length) {
    const target = sideA.length <= sideB.length ? sideA : sideB;
    const opposite = target === sideA ? sideB : sideA;
    const ranked = remaining
      .map((candidate, index) => ({
        candidate,
        index,
        penalty:
          target.filter(
            (member) =>
              member.recentPartners.includes(candidate.athleteId) ||
              candidate.recentPartners.includes(member.athleteId),
          ).length *
            100 +
          opposite.filter(
            (member) =>
              member.recentOpponents.includes(candidate.athleteId) ||
              candidate.recentOpponents.includes(member.athleteId),
          ).length *
            10,
      }))
      .sort((a, b) => a.penalty - b.penalty || a.index - b.index);
    const choice = ranked[0]!;
    target.push(choice.candidate);
    remaining.splice(choice.index, 1);
  }
  return {
    sideA,
    sideB,
    explanation: [
      "menor número de jogos",
      "maior tempo de espera",
      "alternância de lados",
    ],
    warnings:
      selected.length < requiredSideSize(format) * 2
        ? ["participantes insuficientes"]
        : [],
  };
}
