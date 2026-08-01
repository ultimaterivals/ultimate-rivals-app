import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";

describe("privilege escalation and IDOR", () => {
  it("athlete cannot promote role or mass assign", async () => {
    const client = await clientFor("athlete");
    expect(
      (
        await client
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", "a0000000-0000-4000-8000-000000000005")
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await client.from("athletes").insert({
          public_name: "Attack",
          full_name: "Attack",
          gender: "female",
          status: "active",
          role: "admin",
        })
      ).error,
    ).not.toBeNull();
  });

  it("athlete cannot read another athlete by known UUID", async () => {
    const client = await clientFor("athlete");
    expect(
      (
        await client
          .from("athletes")
          .select("id,full_name")
          .eq("id", ids.athleteB)
      ).data ?? [],
    ).toHaveLength(0);
  });

  it("manager UUID attacks are blocked", async () => {
    const teamManager = await clientFor("teammanager");
    const poleManager = await clientFor("polemanager");
    expect(
      (
        await teamManager
          .from("team_rosters")
          .update({ name: "attack" })
          .eq("id", ids.rosterB)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await poleManager
          .from("poles")
          .update({ name: "attack" })
          .eq("id", ids.poleB)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
  });
});
