import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";

describe("database invariants", () => {
  it("rejects overlapping memberships and levels", async () => {
    const client = await clientFor("admin");
    const membership = await client.from("team_memberships").insert({
      athlete_id: ids.athleteA,
      team_id: ids.teamB,
      season_id: ids.season,
      membership_type: "athlete",
      starts_at: "2026-06-01T00:00:00Z",
      status: "active",
      created_by: ids.admin,
    });
    expect(membership.error?.code).toBe("23P01");
    const level = await client.from("athlete_levels").insert({
      athlete_id: ids.athleteA,
      season_id: ids.season,
      level: "n1",
      starts_at: "2026-06-01T00:00:00Z",
      status: "active",
      assigned_by: ids.admin,
    });
    expect(level.error?.code).toBe("23P01");
  });

  it("rejects invalid intervals, duplicate roster member and slug", async () => {
    const client = await clientFor("admin");
    expect(
      (
        await client.from("team_memberships").insert({
          athlete_id: ids.athleteA,
          team_id: ids.teamA,
          season_id: ids.season,
          membership_type: "athlete",
          starts_at: "2026-03-01T00:00:00Z",
          ends_at: "2026-02-01T00:00:00Z",
          status: "inactive",
          created_by: ids.admin,
        })
      ).error?.code,
    ).toBe("23514");
    expect(
      (
        await client.from("team_roster_members").insert({
          roster_id: ids.rosterA,
          athlete_id: ids.athleteA,
          role: "reserve",
          status: "active",
          joined_at: "2026-02-01T00:00:00Z",
        })
      ).error?.code,
    ).toBe("23505");
    expect(
      (
        await client.from("poles").insert({
          name: "Duplicate",
          slug: "dev-polo-bh",
          city: "BH",
          state: "MG",
        })
      ).error?.code,
    ).toBe("23505");
  });

  it("preserves auth/profile integrity", async () => {
    const client = await clientFor("admin");
    expect(
      (
        await client.from("profiles").insert({
          id: crypto.randomUUID(),
          display_name: "Orphan",
          role: "public",
          status: "active",
        })
      ).error?.code,
    ).toBe("23503");
  });
});
