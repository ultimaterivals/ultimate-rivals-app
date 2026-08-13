import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260813074500_admin_link_competition_formation_team.sql";
const migration = readFileSync(
  resolve(process.cwd(), migrationPath),
  "utf8",
);

const linkFunction = "admin_link_competition_formation_team";
const conflictMessage =
  "formation member already linked to another active team";

describe("competition formation team linkage", () => {
  it("keeps team affiliation temporal and audited", () => {
    expect(migration).toContain(linkFunction);
    expect(migration).toContain("competition_formation_members");
    expect(migration).toContain("public.team_memberships");
    expect(migration).toContain(conflictMessage);
    expect(migration).toContain("competition_formation_team_linked");
    expect(migration).toContain("effective_at");
    expect(migration).not.toContain("update public.ranking_transactions");
    expect(migration).not.toContain("update public.match_participants");
  });
});
