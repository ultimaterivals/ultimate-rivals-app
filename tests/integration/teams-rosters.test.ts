import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";

describe("Sprint 4 teams and rosters on remote DEV", () => {
  it("enforces pole history, memberships, composition, gender, level and audit", async () => {
    const admin = await clientFor("admin");
    const teamId = crypto.randomUUID();
    const athleteIds = Array.from({ length: 8 }, () => crypto.randomUUID());
    const rosterIds: string[] = [];
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1000).toISOString();
    try {
      expect(
        (
          await admin.from("teams").insert({
            id: teamId,
            name: `[TEST] Club ${teamId.slice(0, 6)}`,
            slug: `test-club-${teamId}`,
            primary_pole_id: ids.poleA,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("assign_team_pole", {
            target_team_id: teamId,
            target_pole_id: ids.poleA,
            target_season_id: ids.season,
            effective_at: now,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("assign_team_pole", {
            target_team_id: teamId,
            target_pole_id: ids.poleB,
            target_season_id: ids.season,
            effective_at: later,
          })
        ).error,
      ).toBeNull();
      const poleHistory =
        (
          await admin
            .from("team_pole_assignments")
            .select("status,ends_at")
            .eq("team_id", teamId)
        ).data ?? [];
      expect(poleHistory).toHaveLength(2);
      expect(poleHistory.filter((x) => x.status === "active")).toHaveLength(1);
      expect(poleHistory.filter((x) => x.ends_at)).toHaveLength(1);
      for (const [index, athleteId] of athleteIds.entries()) {
        const gender = index < 4 ? "female" : "male";
        expect(
          (
            await admin.from("athletes").insert({
              id: athleteId,
              public_name: `[TEST] Player ${index}`,
              full_name: `Fictitious Player ${index}`,
              gender,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.rpc("assign_athlete_level", {
              target_athlete_id: athleteId,
              target_season_id: ids.season,
              target_level: index === 0 ? "n1" : "n2",
              effective_at: now,
              assignment_reason: "[TEST] roster validation",
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("team_memberships").insert({
              athlete_id: athleteId,
              team_id: teamId,
              season_id: ids.season,
              membership_type: index === 0 ? "captain" : "athlete",
              starts_at: now,
              created_by: ids.admin,
            })
          ).error,
        ).toBeNull();
      }
      expect(
        (
          await admin.from("team_memberships").insert({
            athlete_id: athleteIds[0],
            team_id: ids.teamB,
            season_id: ids.season,
            membership_type: "athlete",
            starts_at: now,
            created_by: ids.admin,
          })
        ).error?.code,
      ).toBe("23P01");
      const [{ data: formats }, { data: categories }] = await Promise.all([
        admin.from("competitive_formats").select("id,code"),
        admin.from("competitive_categories").select("id,code"),
      ]);
      const format = (code: string) =>
        formats?.find((x) => x.code === code)?.id as string;
      const category = (code: string) =>
        categories?.find((x) => x.code === code)?.id as string;
      const doubles = crypto.randomUUID();
      rosterIds.push(doubles);
      expect(
        (
          await admin.from("team_rosters").insert({
            id: doubles,
            team_id: teamId,
            season_id: ids.season,
            format_id: format("doubles"),
            category_id: category("female"),
            level: "n1",
            name: "[TEST] Double",
          })
        ).error,
      ).toBeNull();
      for (const athleteId of athleteIds.slice(0, 2))
        expect(
          (
            await admin.from("team_roster_members").insert({
              roster_id: doubles,
              athlete_id: athleteId,
              role: "starter",
              joined_at: later,
            })
          ).error,
        ).toBeNull();
      expect(
        (
          await admin.from("team_roster_members").insert({
            roster_id: doubles,
            athlete_id: athleteIds[2],
            role: "starter",
            joined_at: later,
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin.from("team_roster_members").insert({
            roster_id: doubles,
            athlete_id: athleteIds[4],
            role: "starter",
            joined_at: later,
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin
            .from("team_rosters")
            .update({ status: "active" })
            .eq("id", doubles)
        ).error,
      ).toBeNull();
      const fours = crypto.randomUUID();
      rosterIds.push(fours);
      expect(
        (
          await admin.from("team_rosters").insert({
            id: fours,
            team_id: teamId,
            season_id: ids.season,
            format_id: format("fours"),
            category_id: category("mixed"),
            level: "n1",
            name: "[TEST] Fours",
          })
        ).error,
      ).toBeNull();
      for (const [index, athleteId] of athleteIds.slice(0, 7).entries())
        expect(
          (
            await admin.from("team_roster_members").insert({
              roster_id: fours,
              athlete_id: athleteId,
              role: index < 4 ? "starter" : "reserve",
              is_captain: index === 0,
              joined_at: later,
            })
          ).error,
        ).toBeNull();
      expect(
        (
          await admin.from("team_roster_members").insert({
            roster_id: fours,
            athlete_id: athleteIds[7],
            role: "reserve",
            joined_at: later,
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin
            .from("team_rosters")
            .update({ status: "active" })
            .eq("id", fours)
        ).error,
      ).toBeNull();
      const low = crypto.randomUUID();
      rosterIds.push(low);
      expect(
        (
          await admin.from("team_rosters").insert({
            id: low,
            team_id: teamId,
            season_id: ids.season,
            format_id: format("doubles"),
            category_id: category("female"),
            level: "n2",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("team_roster_members").insert({
            roster_id: low,
            athlete_id: athleteIds[0],
            role: "starter",
            joined_at: later,
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          (await admin.from("audit_logs").select("id").eq("entity_id", teamId))
            .data ?? []
        ).length,
      ).toBeGreaterThan(0);
    } finally {
      await admin
        .from("team_roster_members")
        .delete()
        .in("roster_id", rosterIds);
      await admin.from("team_rosters").delete().in("id", rosterIds);
      await admin.from("team_memberships").delete().eq("team_id", teamId);
      await admin.from("team_pole_assignments").delete().eq("team_id", teamId);
      await admin.from("athlete_levels").delete().in("athlete_id", athleteIds);
      await admin.from("athletes").delete().in("id", athleteIds);
      await admin.from("teams").delete().eq("id", teamId);
    }
  });

  it("enforces role RLS and protects team logo storage", async () => {
    const manager = await clientFor("teammanager"),
      poleManager = await clientFor("polemanager"),
      athlete = await clientFor("athlete");
    expect(
      (
        await manager
          .from("teams")
          .update({ status: "archived" })
          .eq("id", ids.teamA)
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await manager
          .from("teams")
          .update({ logo_url: "test/logo.png" })
          .eq("id", ids.teamB)
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await manager
          .from("team_rosters")
          .update({ name: "[TEST] denied" })
          .eq("team_id", ids.teamB)
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await poleManager
          .from("team_rosters")
          .update({ name: "[TEST] denied" })
          .eq("team_id", ids.teamA)
      ).data ?? [],
    ).toHaveLength(0);
    expect(
      (
        await athlete
          .from("team_rosters")
          .update({ name: "[TEST] denied" })
          .eq("team_id", ids.teamA)
      ).data ?? [],
    ).toHaveLength(0);
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      own = `${ids.teamA}/${crypto.randomUUID()}.png`,
      other = `${ids.teamB}/${crypto.randomUUID()}.png`;
    expect(
      (
        await manager.storage
          .from("team-logos")
          .upload(own, bytes, { contentType: "image/png" })
      ).error,
    ).toBeNull();
    expect(
      (
        await manager.storage
          .from("team-logos")
          .upload(other, bytes, { contentType: "image/png" })
      ).error,
    ).not.toBeNull();
    await manager.storage.from("team-logos").remove([own]);
  });
});
