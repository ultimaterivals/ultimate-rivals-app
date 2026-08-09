import { describe, expect, it } from "vitest";
import { canUseAthleteMirror, isAthleteMirrorId } from "./athlete-mirror-policy";

describe("athlete mirror policy", () => {
  it("allows only admin role", () => {
    expect(canUseAthleteMirror("admin")).toBe(true);
    expect(canUseAthleteMirror("athlete")).toBe(false);
    expect(canUseAthleteMirror("operator")).toBe(false);
  });

  it("accepts UUID athlete ids only", () => {
    expect(isAthleteMirrorId("10000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isAthleteMirrorId("../athlete")).toBe(false);
    expect(isAthleteMirrorId("")).toBe(false);
  });
});
