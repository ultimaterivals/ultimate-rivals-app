import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260830170000_scope_competition_formation_reads.sql",
  ),
  "utf8",
);

describe("competition formation read security", () => {
  it("restores only the authenticated SELECT privilege required by the Data API", () => {
    expect(migration).toContain(
      "grant select on table public.competition_formations to authenticated",
    );
    expect(migration).toContain(
      "grant select on table public.competition_formation_members to authenticated",
    );
    expect(migration).toContain(
      "revoke insert, update, delete on table public.competition_formations",
    );
    expect(migration).toContain(
      "revoke insert, update, delete on table public.competition_formation_members",
    );
    expect(migration).not.toContain("grant all");
  });

  it("keeps formation reads scoped to administration, management or current team membership", () => {
    expect(migration).toContain("competition_formations_scoped_select");
    expect(migration).toContain("competition_formation_members_scoped_select");
    expect(migration).toContain(
      "private.has_any_role(array['admin']::public.app_role[])",
    );
    expect(migration).toContain("private.manages_team(team_id)");
    expect(migration).toContain("private.manages_pole(pole_id)");
    expect(migration).toContain(
      "tm.athlete_id = (select private.current_athlete_id())",
    );
    expect(migration).toContain(
      "tm.season_id is not distinct from competition_formations.season_id",
    );
    expect(migration).toContain("tm.status = 'active'");
    expect(migration).toContain("tm.starts_at <= now()");
    expect(migration).toContain("tm.ends_at is null or tm.ends_at > now()");
  });

  it("does not weaken forced RLS or introduce a privileged read function", () => {
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("no force row level security");
    expect(migration).not.toContain("security definer");
    expect(migration).not.toContain("to anon");
  });
});
