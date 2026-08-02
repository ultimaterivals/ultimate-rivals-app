import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { compareIndividualRanking } from "@/server/services/ranking-classification.service";
import { clientFor, ids, testKey, testUrl } from "./helpers";

const closureSeason = "10000000-0000-4000-8000-000000000010";

describe("Sprint 10 official rankings on Supabase DEV", () => {
  it("orders individual rankings deterministically with points first and isolates levels", async () => {
    const admin = await clientFor("admin");
    const { data, error } = await admin
      .from("individual_ranking")
      .select("*")
      .eq("season_id", ids.season)
      .is("cycle_id", null)
      .order("level")
      .order("current_position");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(1);
    for (const level of ["n1", "n2", "n3"]) {
      const rows = (data ?? []).filter((row) => row.level === level);
      rows.forEach((row, index) =>
        expect(row.current_position).toBe(index + 1),
      );
      for (let index = 1; index < rows.length; index++) {
        const previous = rows[index - 1];
        const current = rows[index];
        expect(
          compareIndividualRanking(
            {
              id: previous.entity_id,
              totalPoints: previous.total_points,
              wins: previous.wins,
              gamesPlayed: previous.games_played,
              technicalPoints: previous.technical_points,
              disciplinaryBalance: previous.disciplinary_balance,
              reachedScoreAt: previous.reached_score_at,
            },
            {
              id: current.entity_id,
              totalPoints: current.total_points,
              wins: current.wins,
              gamesPlayed: current.games_played,
              technicalPoints: current.technical_points,
              disciplinaryBalance: current.disciplinary_balance,
              reachedScoreAt: current.reached_score_at,
            },
          ),
        ).toBeLessThanOrEqual(0);
      }
    }
    expect(
      (data ?? [])
        .filter((row) => row.level === "leveling")
        .every((row) => row.current_position === null),
    ).toBe(true);
  });

  it("keeps season total and cycle projections separate", async () => {
    const admin = await clientFor("admin");
    const [{ data: trimester }, { data: cycles }] = await Promise.all([
      admin
        .from("individual_ranking")
        .select("entity_id,total_points")
        .eq("season_id", ids.season)
        .is("cycle_id", null),
      admin
        .from("individual_ranking")
        .select("entity_id,total_points,cycle_id")
        .eq("season_id", ids.season)
        .not("cycle_id", "is", null),
    ]);
    expect(trimester?.length).toBeGreaterThan(0);
    expect((cycles ?? []).every((row) => row.cycle_id !== null)).toBe(true);
    expect(new Set((trimester ?? []).map((row) => row.entity_id)).size).toBe(
      trimester?.length,
    );
  });

  it("uses historical team and pole snapshots and only official rosters for formations", async () => {
    const admin = await clientFor("admin");
    const { data: teams } = await admin
      .from("team_rankings")
      .select("entity_id,total_points")
      .eq("season_id", ids.season)
      .is("cycle_id", null);
    const { data: poles } = await admin
      .from("pole_rankings")
      .select("entity_id,total_points")
      .eq("season_id", ids.season)
      .is("cycle_id", null);
    expect(teams?.length).toBeGreaterThan(0);
    expect(poles?.length).toBeGreaterThan(0);
    const team = teams![0]!;
    const pole = poles![0]!;
    const [
      { data: teamLedger },
      { data: poleLedger },
      { data: formations },
      { data: rosters },
    ] = await Promise.all([
      admin
        .from("ranking_transactions")
        .select("points")
        .eq("season_id", ids.season)
        .eq("team_id", team.entity_id)
        .eq("status", "homologated"),
      admin
        .from("ranking_transactions")
        .select("points")
        .eq("season_id", ids.season)
        .eq("pole_id", pole.entity_id)
        .eq("status", "homologated"),
      admin
        .from("formation_rankings")
        .select("entity_id,format_code")
        .eq("season_id", ids.season)
        .is("cycle_id", null),
      admin.from("team_rosters").select("id"),
    ]);
    expect(team.total_points).toBe(
      teamLedger?.reduce((sum, row) => sum + row.points, 0),
    );
    expect(pole.total_points).toBe(
      poleLedger?.reduce((sum, row) => sum + row.points, 0),
    );
    const rosterIds = new Set((rosters ?? []).map((row) => row.id));
    expect(
      (formations ?? []).every(
        (row) =>
          rosterIds.has(row.entity_id) &&
          ["doubles", "fours"].includes(row.format_code),
      ),
    ).toBe(true);
  });

  it("captures movement snapshots and audits publication", async () => {
    const admin = await clientFor("admin");
    const { data: batch, error: snapshotError } = await admin.rpc(
      "capture_ranking_snapshot",
      {
        target_season_id: ids.season,
        target_cycle_id: null,
        target_reason: "manual",
      },
    );
    expect(snapshotError).toBeNull();
    expect(batch).toMatch(/^[0-9a-f-]{36}$/);
    const { error: publishError } = await admin.rpc("publish_rankings", {
      target_season_id: ids.season,
      target_cycle_id: null,
    });
    expect(publishError).toBeNull();
    const [{ count }, { data: rows }, { data: operations }] = await Promise.all(
      [
        admin
          .from("ranking_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("snapshot_batch_id", batch),
        admin
          .from("individual_ranking")
          .select("movement,position_change")
          .eq("season_id", ids.season)
          .is("cycle_id", null),
        admin
          .from("ranking_operations")
          .select("operation_type")
          .eq("season_id", ids.season)
          .in("operation_type", ["snapshot", "publication"]),
      ],
    );
    expect(count).toBeGreaterThan(0);
    expect(
      (rows ?? [])
        .filter((row) => row.movement !== "new")
        .every((row) => row.movement === "stable" && row.position_change === 0),
    ).toBe(true);
    expect(
      new Set((operations ?? []).map((row) => row.operation_type)),
    ).toEqual(new Set(["snapshot", "publication"]));
  });

  it("closes an isolated DEV cycle without resetting its trimester", async () => {
    const admin = await clientFor("admin");
    const { error: upsertError } = await admin.from("seasons").upsert({
      id: closureSeason,
      name: "[DEV] Ranking closure",
      code: "dev-ranking-closure",
      starts_at: "2031-01-01T00:00:00Z",
      ends_at: "2031-04-01T00:00:00Z",
      status: "draft",
    });
    expect(upsertError).toBeNull();
    const { data: cycle } = await admin
      .from("season_cycles")
      .select("id")
      .eq("season_id", closureSeason)
      .order("cycle_number")
      .limit(1)
      .single();
    const { error: closeError } = await admin.rpc("close_ranking_cycle", {
      target_cycle_id: cycle!.id,
    });
    expect(closeError).toBeNull();
    const [{ data: period }, { count: trimesterCount }] = await Promise.all([
      admin
        .from("ranking_periods")
        .select("status,published_at")
        .eq("cycle_id", cycle!.id)
        .single(),
      admin
        .from("ranking_entries")
        .select("id", { count: "exact", head: true })
        .eq("season_id", closureSeason)
        .is("cycle_id", null),
    ]);
    expect(period?.status).toBe("official");
    expect(period?.published_at).toBeTruthy();
    expect(trimesterCount).toBe(0);
  });

  it("enforces public sanitization, ledger privacy and role-scoped details", async () => {
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false },
    });
    const athlete = await clientFor("athlete");
    const manager = await clientFor("teammanager");
    const [
      { data: publicRows, error: publicError },
      { error: ledgerError },
      { data: ownLedger },
      { data: contributions },
    ] = await Promise.all([
      anon.from("public_rankings").select("*").limit(5),
      anon.from("ranking_transactions").select("id").limit(1),
      athlete.from("ranking_transactions").select("athlete_id"),
      manager.from("ranking_contributions").select("ranking_type,entity_id"),
    ]);
    expect(publicError).toBeNull();
    expect(publicRows?.length).toBeGreaterThan(0);
    for (const key of ["email", "phone", "birth_date", "full_name", "notes"])
      expect(publicRows?.[0]).not.toHaveProperty(key);
    expect(ledgerError).not.toBeNull();
    expect(
      (ownLedger ?? []).every((row) => row.athlete_id === ids.athleteA),
    ).toBe(true);
    expect(
      (contributions ?? []).every(
        (row) => row.ranking_type !== "team" || row.entity_id === ids.teamA,
      ),
    ).toBe(true);
    const { error: escalation } = await athlete.rpc(
      "capture_ranking_snapshot",
      {
        target_season_id: ids.season,
        target_cycle_id: null,
        target_reason: "manual",
      },
    );
    expect(escalation).not.toBeNull();
  });
});
