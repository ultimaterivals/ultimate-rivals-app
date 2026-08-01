import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";
describe("Sprint 5 progression on remote DEV", () => {
  it("runs season, leveling, assessment, progression and protection atomically", async () => {
    const admin = await clientFor("admin"),
      seasonId = crypto.randomUUID(),
      athleteId = crypto.randomUUID(),
      processId = crypto.randomUUID(),
      reviewIds: string[] = [];
    const now = new Date(),
      start = new Date(now.getTime() + 86_400_000),
      end = new Date(start.getTime() + 90 * 86_400_000);
    try {
      expect(
        (
          await admin.from("seasons").insert({
            id: seasonId,
            name: `[TEST] Quarter ${seasonId.slice(0, 6)}`,
            code: `test-q-${seasonId.slice(0, 8)}`,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("season_cycles")
            .select("id")
            .eq("season_id", seasonId)
        ).data,
      ).toHaveLength(3);
      expect(
        (
          await admin.rpc("transition_season", {
            target_season_id: seasonId,
            target_status: "registration",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("transition_season", {
            target_season_id: seasonId,
            target_status: "active",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("transition_season", {
            target_season_id: seasonId,
            target_status: "closed",
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin.from("athletes").insert({
            id: athleteId,
            public_name: "[TEST] Progression Athlete",
            full_name: "Fictitious Progression Athlete",
            gender: "female",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("athlete_levels").insert({
            athlete_id: athleteId,
            season_id: seasonId,
            level: "leveling",
            starts_at: now.toISOString(),
            reason: "[TEST] default leveling",
            assigned_by: ids.admin,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("athlete_leveling_processes").insert({
            id: processId,
            athlete_id: athleteId,
            season_id: seasonId,
            started_at: now.toISOString(),
          })
        ).error,
      ).toBeNull();
      const criterion = (
        await admin
          .from("assessment_criteria")
          .select("id")
          .eq("code", "serve")
          .single()
      ).data!;
      for (let i = 0; i < 3; i++)
        expect(
          (
            await admin.rpc("create_athlete_assessment", {
              target_athlete_id: athleteId,
              target_season_id: seasonId,
              target_process_id: processId,
              target_type: "leveling",
              target_scope: "overall",
              assessment_context: `[TEST] manual observation ${i + 1}`,
              assessment_notes: null,
              feedback: "Feedback DEV liberado",
              is_athlete_visible: true,
              scores: [{ criterion_id: criterion.id, score: 3 + (i % 2) }],
            })
          ).error,
        ).toBeNull();
      const process = (
        await admin
          .from("athlete_leveling_processes")
          .select("status,completed_observations")
          .eq("id", processId)
          .single()
      ).data;
      expect(process).toMatchObject({
        status: "ready_for_review",
        completed_observations: 3,
      });
      const createReview = async (
        current_level: string,
        proposed_level: string,
        review_type: string,
        reason: string,
      ) => {
        const { data, error } = await admin
          .from("level_change_reviews")
          .insert({
            athlete_id: athleteId,
            season_id: seasonId,
            current_level,
            proposed_level,
            review_type,
            requested_by: ids.admin,
            decision_reason: reason,
            evidence_summary: "[TEST] three structured observations",
          })
          .select("id")
          .single();
        expect(error).toBeNull();
        reviewIds.push(data!.id);
        return data!.id;
      };
      const leveling = await createReview(
        "leveling",
        "n3",
        "leveling",
        "[TEST] leveling homologated",
      );
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: leveling,
            effective_at: new Date(now.getTime() + 1000).toISOString(),
            protection_ends_at: null,
          })
        ).error,
      ).toBeNull();
      const invalid = await createReview(
        "n3",
        "n1",
        "promotion",
        "[TEST] invalid jump evidence",
      );
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: invalid,
            effective_at: new Date(now.getTime() + 2000).toISOString(),
            protection_ends_at: null,
          })
        ).error?.code,
      ).toBe("23514");
      const promotion = await createReview(
        "n3",
        "n2",
        "promotion",
        "[TEST] approved promotion",
      );
      const protectedUntil = new Date(now.getTime() + 7 * 86_400_000);
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: promotion,
            effective_at: new Date(now.getTime() + 3000).toISOString(),
            protection_ends_at: protectedUntil.toISOString(),
          })
        ).error,
      ).toBeNull();
      const relegation = await createReview(
        "n2",
        "n3",
        "relegation",
        "[TEST] attempted relegation",
      );
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: relegation,
            effective_at: new Date(now.getTime() + 4000).toISOString(),
            protection_ends_at: null,
          })
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin
            .from("athlete_level_protections")
            .update({ ends_at: new Date(now.getTime() + 3500).toISOString() })
            .eq("athlete_id", athleteId)
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: relegation,
            effective_at: new Date(now.getTime() + 5000).toISOString(),
            protection_ends_at: null,
          })
        ).error,
      ).toBeNull();
      const correction = await createReview(
        "n3",
        "n1",
        "correction",
        "[TEST] extraordinary correction",
      );
      expect(
        (
          await admin.rpc("approve_level_change", {
            target_review_id: correction,
            effective_at: new Date(now.getTime() + 6000).toISOString(),
            protection_ends_at: null,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("can_athlete_compete_at_level", {
            target_athlete_id: athleteId,
            target_season_id: seasonId,
            target_level: "n1",
          })
        ).data,
      ).toBe(true);
      expect(
        (
          (
            await admin
              .from("audit_logs")
              .select("id")
              .in("entity_id", reviewIds)
          ).data ?? []
        ).length,
      ).toBeGreaterThan(0);
    } finally {
      await admin
        .from("athlete_level_protections")
        .delete()
        .eq("athlete_id", athleteId);
      await admin
        .from("athlete_assessment_scores")
        .delete()
        .in(
          "assessment_id",
          (
            await admin
              .from("athlete_assessments")
              .select("id")
              .eq("athlete_id", athleteId)
          ).data?.map((x) => x.id) ?? [],
        );
      await admin
        .from("athlete_assessments")
        .delete()
        .eq("athlete_id", athleteId);
      await admin
        .from("level_change_reviews")
        .delete()
        .eq("athlete_id", athleteId);
      await admin
        .from("athlete_leveling_processes")
        .delete()
        .eq("athlete_id", athleteId);
      await admin.from("athlete_levels").delete().eq("athlete_id", athleteId);
      await admin.from("athletes").delete().eq("id", athleteId);
      await admin
        .from("assessment_weight_config")
        .delete()
        .eq("season_id", seasonId);
      await admin.from("season_cycles").delete().eq("season_id", seasonId);
      await admin.from("seasons").delete().eq("id", seasonId);
    }
  });
  it("denies level homologation to non-admin roles", async () => {
    for (const role of [
      "operator",
      "polemanager",
      "teammanager",
      "athlete",
    ] as const) {
      const c = await clientFor(role);
      expect(
        (
          await c.rpc("approve_level_change", {
            target_review_id: crypto.randomUUID(),
            effective_at: new Date().toISOString(),
            protection_ends_at: null,
          })
        ).error,
      ).not.toBeNull();
    }
    const athlete = await clientFor("athlete");
    expect(
      (
        await athlete.from("athlete_assessments").insert({
          athlete_id: ids.athleteA,
          season_id: ids.season,
          assessment_type: "development",
          scope: "overall",
          evaluator_user_id: ids.admin,
          context: "forbidden",
        })
      ).error,
    ).not.toBeNull();
  });
});
