import { z } from "zod";

export const appRoles = [
  "admin",
  "operator",
  "pole_manager",
  "team_manager",
  "athlete",
  "public",
] as const;
export const appRoleSchema = z.enum(appRoles);
export type AppRole = z.infer<typeof appRoleSchema>;

export const roleHome: Record<AppRole, string> = {
  admin: "/admin",
  operator: "/admin",
  pole_manager: "/admin",
  team_manager: "/admin",
  athlete: "/athlete",
  public: "/",
};
