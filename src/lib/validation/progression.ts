import { z } from "zod";

export const levels = ["leveling", "n3", "n2", "n1"] as const;
export const seasonStatuses = [
  "draft",
  "registration",
  "active",
  "closing",
  "closed",
  "archived",
] as const;
const transitions: Record<string, string> = {
  draft: "registration",
  registration: "active",
  active: "closing",
  closing: "closed",
  closed: "archived",
};
export function canTransitionSeason(from: string, to: string) {
  return transitions[from] === to;
}
export const assessmentScoreSchema = z.coerce.number().int().min(1).max(5);
export const createAssessmentSchema = z.object({
  athleteId: z.uuid(),
  seasonId: z.uuid(),
  levelingProcessId: z.uuid().nullable().optional(),
  assessmentType: z.enum([
    "leveling",
    "periodic",
    "promotion_review",
    "relegation_review",
    "development",
  ]),
  scope: z.enum(["overall", "doubles", "fours"]),
  context: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(3000).nullable().optional(),
  athleteFeedback: z.string().trim().max(3000).nullable().optional(),
  athleteVisible: z.coerce.boolean().default(false),
});
export const levelReviewSchema = z.object({
  athleteId: z.uuid(),
  seasonId: z.uuid(),
  currentLevel: z.enum(levels),
  proposedLevel: z.enum(levels),
  reviewType: z.enum(["leveling", "promotion", "relegation", "correction"]),
  decisionReason: z.string().trim().min(10).max(2000),
  evidenceSummary: z.string().trim().min(2).max(3000),
});
export function isValidLevelChange(
  current: string,
  proposed: string,
  type: string,
) {
  if (type === "correction") return true;
  if (type === "leveling")
    return current === "leveling" && ["n3", "n2", "n1"].includes(proposed);
  if (type === "promotion")
    return (
      (current === "n3" && proposed === "n2") ||
      (current === "n2" && proposed === "n1")
    );
  if (type === "relegation")
    return (
      (current === "n1" && proposed === "n2") ||
      (current === "n2" && proposed === "n3")
    );
  return false;
}
export function canCompeteAtLevel(current: string, target: string) {
  if (current === "leveling") return false;
  if (current === "n3") return ["n3", "n2", "n1"].includes(target);
  if (current === "n2") return ["n2", "n1"].includes(target);
  return current === "n1" && target === "n1";
}
export function partialAssessmentWeight(hasSystemData: boolean) {
  return {
    technicalReviewWeight: 0.6,
    systemDataWeight: 0.4,
    status: hasSystemData ? "complete" : "partial",
    finalScore: null,
  };
}
