import { describe, expect, it } from "vitest";
import { appRoleSchema, roleHome } from "./auth";

describe("roles", () => {
  it("accepts every supported role", () => {
    expect(appRoleSchema.parse("pole_manager")).toBe("pole_manager");
  });
  it("maps athletes to their portal", () => {
    expect(roleHome.athlete).toBe("/athlete");
  });
});
