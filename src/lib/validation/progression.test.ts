import { describe, expect, it } from "vitest";
import {
  assessmentScoreSchema,
  canCompeteAtLevel,
  canTransitionSeason,
  isValidLevelChange,
  partialAssessmentWeight,
} from "./progression";
describe("season and progression rules", () => {
  it("enforces season state machine", () => {
    expect(canTransitionSeason("draft", "registration")).toBe(true);
    expect(canTransitionSeason("closed", "active")).toBe(false);
  });
  it("limits assessment score", () => {
    expect(assessmentScoreSchema.parse(5)).toBe(5);
    expect(() => assessmentScoreSchema.parse(6)).toThrow();
  });
  it("accepts valid progression and rejects jumps", () => {
    expect(isValidLevelChange("n3", "n2", "promotion")).toBe(true);
    expect(isValidLevelChange("n3", "n1", "promotion")).toBe(false);
    expect(isValidLevelChange("n3", "n1", "correction")).toBe(true);
  });
  it("protects competitive eligibility", () => {
    expect(canCompeteAtLevel("leveling", "n3")).toBe(false);
    expect(canCompeteAtLevel("n2", "n3")).toBe(false);
    expect(canCompeteAtLevel("n2", "n1")).toBe(true);
  });
  it("never fabricates system score", () =>
    expect(partialAssessmentWeight(false)).toEqual({
      technicalReviewWeight: 0.6,
      systemDataWeight: 0.4,
      status: "partial",
      finalScore: null,
    }));
});
