import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

describe("RLS roles", () => {
  it("admin reads the whole central domain and can create", async () => {
    const client = await clientFor("admin");
    const { data: teams } = await client.from("teams").select("id");
    expect(teams?.length).toBeGreaterThanOrEqual(2);
    const slug = `integration-${crypto.randomUUID()}`;
    const { data, error } = await client
      .from("poles")
      .insert({
        name: "[TEST] Integration Pole",
        slug,
        city: "Betim",
        state: "MG",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (data) await client.from("poles").delete().eq("id", data.id);
  });

  it("operator is read-only", async () => {
    const client = await clientFor("operator");
    expect(
      (await client.from("athletes").select("id")).data?.length,
    ).toBeGreaterThan(0);
    const result = await client
      .from("athlete_levels")
      .update({ level: "n1" })
      .eq("athlete_id", ids.athleteA)
      .select("id");
    expect(result.data ?? []).toHaveLength(0);
  });

  it("pole manager sees only assigned pole scope", async () => {
    const client = await clientFor("polemanager");
    const { data } = await client.from("poles").select("id");
    expect(data?.map((row) => row.id)).toContain(ids.poleA);
    expect(data?.map((row) => row.id)).not.toContain(ids.poleB);
    expect(
      (
        await client
          .from("poles")
          .update({ name: "attack" })
          .eq("id", ids.poleB)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
  });

  it("team manager sees only assigned team and roster", async () => {
    const client = await clientFor("teammanager");
    const teams = (await client.from("teams").select("id")).data ?? [];
    expect(teams.map((row) => row.id)).toEqual([ids.teamA]);
    const rosters = (await client.from("team_rosters").select("id")).data ?? [];
    expect(rosters.map((row) => row.id)).toContain(ids.rosterA);
    expect(rosters.map((row) => row.id)).not.toContain(ids.rosterB);
    expect(
      (
        await client
          .from("teams")
          .update({ name: "attack" })
          .eq("id", ids.teamB)
          .select("id")
      ).data ?? [],
    ).toHaveLength(0);
  });

  it("athlete sees only own private records", async () => {
    const client = await clientFor("athlete");
    expect(
      (await client.from("athletes").select("id")).data?.map((row) => row.id),
    ).toEqual([ids.athleteA]);
    expect(
      (await client.from("athlete_levels").select("athlete_id")).data?.map(
        (row) => row.athlete_id,
      ),
    ).toEqual([ids.athleteA]);
    expect(
      (await client.from("team_memberships").select("athlete_id")).data?.map(
        (row) => row.athlete_id,
      ),
    ).toEqual([ids.athleteA]);
  });

  it("anon has no table access", async () => {
    const client = createClient(testUrl, testKey, {
      auth: { persistSession: false },
    });
    const { error } = await client.from("profiles").select("id");
    expect(error).not.toBeNull();
  });
});
