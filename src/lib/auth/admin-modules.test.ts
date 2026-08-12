import { describe, expect, it } from "vitest";
import { canAccessAdminModule, getAdminModulesForRole } from "./admin-modules";

describe("admin module access", () => {
  it("gives admin access to every current module including athlete preview and market", () => {
    const modules = getAdminModulesForRole("admin");
    expect(modules).toHaveLength(14);
    expect(modules.some((module) => module.key === "preview")).toBe(true);
    expect(modules.some((module) => module.key === "market")).toBe(true);
    expect(modules.some((module) => module.key === "feedback")).toBe(true);
    expect(modules.some((module) => module.key === "audit")).toBe(true);
    expect(canAccessAdminModule("admin", "preview")).toBe(true);
    expect(canAccessAdminModule("admin", "market")).toBe(true);
  });

  it("keeps athlete preview and market admin-only", () => {
    expect(canAccessAdminModule("operator", "preview")).toBe(false);
    expect(canAccessAdminModule("pole_manager", "preview")).toBe(false);
    expect(canAccessAdminModule("team_manager", "preview")).toBe(false);
    expect(canAccessAdminModule("operator", "market")).toBe(false);
    expect(canAccessAdminModule("pole_manager", "market")).toBe(false);
    expect(canAccessAdminModule("team_manager", "market")).toBe(false);
  });

  it("keeps finance unavailable to operator", () => {
    expect(canAccessAdminModule("operator", "finance")).toBe(false);
    expect(canAccessAdminModule("operator", "agenda")).toBe(true);
  });

  it("allows pole manager to manage teams", () => {
    expect(canAccessAdminModule("pole_manager", "teams")).toBe(true);
  });

  it("keeps global agenda unavailable to team manager", () => {
    expect(canAccessAdminModule("team_manager", "agenda")).toBe(false);
    expect(canAccessAdminModule("team_manager", "teams")).toBe(true);
  });

  it("does not expose admin modules to athlete or public roles", () => {
    expect(getAdminModulesForRole("athlete")).toHaveLength(0);
    expect(getAdminModulesForRole("public")).toHaveLength(0);
  });
});
