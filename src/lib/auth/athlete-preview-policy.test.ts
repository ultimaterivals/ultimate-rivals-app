import { describe, expect, it } from "vitest";
import {
  canUseAthletePreview,
  isAthletePreviewId,
} from "./athlete-preview-policy";

describe("athlete preview policy", () => {
  it("allows only admin to use athlete preview", () => {
    expect(canUseAthletePreview("admin")).toBe(true);
    expect(canUseAthletePreview("operator")).toBe(false);
    expect(canUseAthletePreview("pole_manager")).toBe(false);
    expect(canUseAthletePreview("team_manager")).toBe(false);
    expect(canUseAthletePreview("athlete")).toBe(false);
  });

  it("accepts valid UUID athlete ids and rejects malformed values", () => {
    expect(
      isAthletePreviewId("123e4567-e89b-12d3-a456-426614174000"),
    ).toBe(true);
    expect(isAthletePreviewId("not-an-athlete-id")).toBe(false);
    expect(isAthletePreviewId("")).toBe(false);
  });
});
