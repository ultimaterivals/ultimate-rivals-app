import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813074500_admin_link_competition_formation_team.sql",
  ),
  "utf8",
);

describe("competition formation team linkage", () => {
  it("keeps formation independent while supporting audited season-scoped team affiliation", () => {
    expect(migration).toContain("admin_link_competition_formation_team");
    expect(migration).toContain("competition_formation_members");
    expect(migration).toContain("public.team_memberships");
    expect(migration).toContain("formation member already linked to another active team");
    expect(migration).toContain("competition_formation_team_linked");
    expect(migration).toContain("effective_at");
    expect(migration).not.toContain("update public.ranking_transactions");
    expect(migration).not.toContain("update public.match_participants");
  });
});
