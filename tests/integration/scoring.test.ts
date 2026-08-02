import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

describe("Sprint 8 scoring on remote DEV", () => {
  it("validates rallies, corrections, actions, review, RLS and statistics", async () => {
    const admin = await clientFor("admin"),
      operator = await clientFor("operator"),
      coordinator = await clientFor("polemanager"),
      athleteClient = await clientFor("athlete"),
      teamManager = await clientFor("teammanager"),
      anon = createClient(testUrl, testKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      sessionId = crypto.randomUUID(),
      venueId = crypto.randomUUID(),
      courtId = crypto.randomUUID(),
      generated = Array.from({ length: 4 }, () => crypto.randomUUID()),
      startsAt = new Date(Date.now() + 86_400_000),
      endsAt = new Date(startsAt.getTime() + 7_200_000);

    const [{ data: operatorProfile }, { data: coordinatorProfile }] =
      await Promise.all([
        admin.from("profiles").select("id").eq("role", "operator").single(),
        admin.from("profiles").select("id").eq("role", "pole_manager").single(),
      ]);
    const { data: existingAthletes } = await admin
      .from("athletes")
      .select("id,gender")
      .eq("id", ids.athleteA);
    const { data: athleteLevel } = await admin
      .from("athlete_levels")
      .select("level")
      .eq("athlete_id", ids.athleteA)
      .eq("status", "active")
      .limit(1)
      .single();
    const { data: format } = await admin
      .from("competitive_formats")
      .select("id")
      .eq("code", "doubles")
      .single();
    const { data: mixed } = await admin
      .from("competitive_categories")
      .select("id")
      .eq("code", "mixed")
      .single();
    expect(operatorProfile?.id, "operator profile").toBeTruthy();
    expect(coordinatorProfile?.id, "coordinator profile").toBeTruthy();
    expect(existingAthletes?.length, "linked athlete").toBe(1);
    expect(athleteLevel?.level, "linked athlete level").toBeTruthy();
    expect(format?.id, "doubles format").toBeTruthy();
    expect(mixed?.id, "mixed category").toBeTruthy();

    const genderA = existingAthletes![0]!.gender,
      athletes = [ids.athleteA, generated[0], generated[1], generated[2]],
      reserve = generated[3];

    for (const response of [
      await admin.from("venues").insert({
        id: venueId,
        name: `[TEST] Scoring ${sessionId.slice(0, 6)}`,
        pole_id: ids.poleA,
        city: "Test City",
        state: "SP",
        status: "active",
      }),
      await admin.from("courts").insert({
        id: courtId,
        venue_id: venueId,
        name: "[TEST] Scoring Court",
        status: "active",
      }),
      await admin.from("athletes").insert([
        {
          id: generated[0],
          public_name: "[TEST] Scoring A2",
          full_name: "Fictitious Scoring A2",
          gender: genderA === "female" ? "male" : "female",
          status: "active",
        },
        {
          id: generated[1],
          public_name: "[TEST] Scoring B2",
          full_name: "Fictitious Scoring B2",
          gender: "female",
          status: "active",
        },
        {
          id: generated[2],
          public_name: "[TEST] Scoring B3",
          full_name: "Fictitious Scoring B3",
          gender: "male",
          status: "active",
        },
        {
          id: generated[3],
          public_name: "[TEST] Scoring Reserve",
          full_name: "Fictitious Scoring Reserve",
          gender: "female",
          status: "active",
        },
      ]),
    ])
      expect(response.error).toBeNull();

    expect(
      (
        await admin.from("athlete_levels").insert(
          generated.map((athlete_id) => ({
            athlete_id,
            season_id: ids.season,
            level: athleteLevel!.level,
            starts_at: new Date(Date.now() - 86_400_000).toISOString(),
            reason: "[TEST] Sprint 8 scoring",
            assigned_by: ids.admin,
          })),
        )
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("ur_play_sessions").insert({
          id: sessionId,
          season_id: ids.season,
          pole_id: ids.poleA,
          venue_id: venueId,
          name: `[TEST] Sprint 8 ${sessionId.slice(0, 6)}`,
          session_date: startsAt.toISOString().slice(0, 10),
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          registration_opens_at: new Date(Date.now() - 3_600_000).toISOString(),
          registration_closes_at: new Date(
            Date.now() + 3_600_000,
          ).toISOString(),
          capacity: 5,
          waitlist_capacity: 1,
          status: "registration_open",
          created_by: ids.admin,
          min_rest_minutes: 5,
        })
      ).error,
    ).toBeNull();
    for (const response of [
      await admin.from("ur_play_session_courts").insert({
        session_id: sessionId,
        court_id: courtId,
        position: 1,
      }),
      await admin.from("ur_play_session_staff").insert([
        {
          session_id: sessionId,
          profile_id: operatorProfile!.id,
          role: "operator",
        },
        {
          session_id: sessionId,
          profile_id: coordinatorProfile!.id,
          role: "coordinator",
        },
      ]),
    ])
      expect(response.error).toBeNull();

    const registrations = [];
    for (const athleteId of [...athletes, reserve]) {
      const response = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: athleteId,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      expect(response.error).toBeNull();
      registrations.push(response.data);
    }
    for (const status of ["registration_closed", "checkin_open"])
      expect(
        (
          await admin.rpc("transition_ur_play_session", {
            target_session_id: sessionId,
            target_status: status,
            cancel_reason: null,
          })
        ).error,
      ).toBeNull();
    for (const registration of registrations)
      expect(
        (
          await operator.rpc("checkin_ur_play", {
            target_registration: registration.id,
            checkin_method: "operator",
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    expect(
      (
        await admin.rpc("transition_ur_play_session", {
          target_session_id: sessionId,
          target_status: "in_progress",
          cancel_reason: null,
        })
      ).error,
    ).toBeNull();

    const created = await operator.rpc("create_court_ops_match", {
      target_session: sessionId,
      target_court: courtId,
      target_format: format!.id,
      target_category: mixed!.id,
      target_level: athleteLevel!.level,
      side_a: athletes.slice(0, 2),
      side_b: athletes.slice(2, 4),
      operation_id: crypto.randomUUID(),
    });
    expect(created.error).toBeNull();
    const matchId = created.data.id as string;
    for (const status of ["called", "ready", "in_progress"])
      expect(
        (
          await operator.rpc("transition_court_ops_match", {
            target_match: matchId,
            target_status: status,
            reason: null,
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();

    const { data: sides } = await operator
      .from("match_sides")
      .select("id,side")
      .eq("match_id", matchId);
    const sideA = sides!.find((side) => side.side === "A")!.id,
      sideB = sides!.find((side) => side.side === "B")!.id;
    let nextSequence = 1;
    const scoreboard = async () =>
      (
        await operator
          .from("match_scoreboard")
          .select("*")
          .eq("match_id", matchId)
          .single()
      ).data!;
    const point = async (sideId: string, operation = crypto.randomUUID()) => {
      const expected = nextSequence,
        response = await operator.rpc("record_match_rally", {
          target_match: matchId,
          target_winning_side: sideId,
          expected_rally_number: expected,
          client_sequence: expected,
          client_recorded_at: new Date().toISOString(),
          operation_id: operation,
        });
      if (!response.error)
        nextSequence = response.data.scoreboard.next_rally_number;
      return response;
    };

    expect(await scoreboard()).toMatchObject({ score_a: 0, score_b: 0 });
    expect(
      (
        await operator.from("match_rallies").insert({
          match_id: matchId,
          rally_number: 1,
          client_sequence: 1,
          winning_side_id: sideA,
          recorded_by: operatorProfile!.id,
          client_operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();

    const firstOperation = crypto.randomUUID(),
      firstPoint = await point(sideA, firstOperation);
    expect(firstPoint.error).toBeNull();
    expect(await scoreboard()).toMatchObject({ score_a: 1, score_b: 0 });
    const retry = await operator.rpc("record_match_rally", {
      target_match: matchId,
      target_winning_side: sideA,
      expected_rally_number: 1,
      client_sequence: 1,
      client_recorded_at: null,
      operation_id: firstOperation,
    });
    expect(retry.error).toBeNull();
    expect(retry.data.rally.id).toBe(firstPoint.data.rally.id);

    const secondPoint = await point(sideB);
    expect(secondPoint.error).toBeNull();
    expect(await scoreboard()).toMatchObject({ score_a: 1, score_b: 1 });
    const actionCases = [
      [firstPoint.data.rally.id, ids.athleteA, "ace", "[TEST] late ace"],
      [secondPoint.data.rally.id, generated[1], "attack", null],
    ] as const;
    for (const [
      rallyId,
      athleteId,
      actionType,
      correctionReason,
    ] of actionCases)
      expect(
        (
          await operator.rpc("record_match_technical_action", {
            target_rally: rallyId,
            target_athlete: athleteId,
            target_action: actionType,
            correction_reason: correctionReason,
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();

    const extraActions = [
      [sideA, ids.athleteA, "block"],
      [sideB, generated[1], "defense"],
      [sideA, generated[0], "assist"],
    ] as const;
    for (const [sideId, athleteId, actionType] of extraActions) {
      const rally = await point(sideId);
      expect(rally.error).toBeNull();
      expect(
        (
          await operator.rpc("record_match_technical_action", {
            target_rally: rally.data.rally.id,
            target_athlete: athleteId,
            target_action: actionType,
            correction_reason: null,
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    }
    const wrongSideRally = await point(sideA);
    expect(
      (
        await operator.rpc("record_match_technical_action", {
          target_rally: wrongSideRally.data.rally.id,
          target_athlete: generated[1],
          target_action: "ace",
          correction_reason: null,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await operator.rpc("record_match_technical_action", {
          target_rally: wrongSideRally.data.rally.id,
          target_athlete: reserve,
          target_action: "ace",
          correction_reason: null,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();

    const concurrentSequence = nextSequence,
      firstClient = await operator.rpc("record_match_rally", {
        target_match: matchId,
        target_winning_side: sideA,
        expected_rally_number: concurrentSequence,
        client_sequence: concurrentSequence,
        client_recorded_at: null,
        operation_id: crypto.randomUUID(),
      }),
      staleClient = await admin.rpc("record_match_rally", {
        target_match: matchId,
        target_winning_side: sideB,
        expected_rally_number: concurrentSequence,
        client_sequence: concurrentSequence,
        client_recorded_at: null,
        operation_id: crypto.randomUUID(),
      });
    expect(firstClient.error).toBeNull();
    expect(staleClient.error?.code).toBe("P0001");
    nextSequence = firstClient.data.scoreboard.next_rally_number;

    const correctionTarget = (
      await operator
        .from("match_rallies")
        .select("id")
        .eq("match_id", matchId)
        .order("rally_number", { ascending: false })
        .limit(1)
        .single()
    ).data!;
    expect(
      (
        await operator.rpc("correct_match_rally", {
          target_rally: correctionTarget.id,
          target_correction: "replace_winner",
          replacement_winning_side: sideB,
          reason: "[TEST] wrong side corrected",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("correct_match_rally", {
          target_rally: correctionTarget.id,
          target_correction: "reverse",
          replacement_winning_side: null,
          reason: "[TEST] rally reversed",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    let finalPoint = firstClient;
    for (
      let attempt = 0;
      attempt < 11 && !finalPoint.data.scoreboard.is_game_over;
      attempt += 1
    ) {
      finalPoint = await point(sideA);
      expect(finalPoint.error).toBeNull();
    }
    expect(finalPoint.data.scoreboard.is_game_over).toBe(true);
    expect(await scoreboard()).toMatchObject({
      score_a: 11,
      is_game_over: true,
      winner_side_id: sideA,
    });
    expect((await point(sideA)).error).not.toBeNull();
    expect(
      (
        await operator.rpc("submit_match_for_review", {
          target_match: matchId,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("homologate_match_result", {
          target_match: matchId,
          operation_id: crypto.randomUUID(),
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await admin
          .from("ranking_transactions")
          .select("id")
          .eq("match_id", matchId)
      ).data,
    ).toHaveLength(0);
    const invalidRun = await admin.rpc("process_homologated_match", {
      target_match: matchId,
      operation_id: crypto.randomUUID(),
    });
    expect(invalidRun.error).not.toBeNull();
    expect(
      (
        await admin
          .from("ranking_processing_runs")
          .select("id")
          .eq("source_id", matchId)
      ).data,
    ).toHaveLength(0);
    expect(
      (
        await coordinator.rpc("homologate_match_result", {
          target_match: matchId,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    const firstLedger = await admin
      .from("ranking_transactions")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at");
    expect(firstLedger.error).toBeNull();
    expect(firstLedger.data).toHaveLength(13);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "PARTICIPATION",
      ),
    ).toHaveLength(4);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "WIN",
      ),
    ).toHaveLength(2);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "LOSS",
      ),
    ).toHaveLength(2);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "ACE",
      ),
    ).toHaveLength(1);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "ATTACK",
      ),
    ).toHaveLength(1);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "BLOCK",
      ),
    ).toHaveLength(1);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "DEFENSE",
      ),
    ).toHaveLength(1);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.rule_code === "ASSIST",
      ),
    ).toHaveLength(1);
    expect(
      firstLedger.data!.filter(
        (transaction) => transaction.athlete_id === reserve,
      ),
    ).toHaveLength(0);
    expect(
      new Set(firstLedger.data!.map((transaction) => transaction.season_id)),
    ).toEqual(new Set([ids.season]));
    expect(
      firstLedger.data!.every(
        (transaction) =>
          transaction.rule_version === 1 &&
          transaction.points === transaction.points_applied,
      ),
    ).toBe(true);

    const participantSnapshot = (
      await admin
        .from("match_participants")
        .select("team_snapshot_id,pole_snapshot_id")
        .eq("match_id", matchId)
        .eq("athlete_id", ids.athleteA)
        .single()
    ).data!;
    const athleteLedger = firstLedger.data!.filter(
      (transaction) => transaction.athlete_id === ids.athleteA,
    );
    expect(
      athleteLedger.every(
        (transaction) =>
          transaction.team_id === participantSnapshot.team_snapshot_id,
      ),
    ).toBe(true);
    expect(
      athleteLedger.every(
        (transaction) =>
          transaction.pole_id === participantSnapshot.pole_snapshot_id,
      ),
    ).toBe(true);

    const beforeReprocessCount = firstLedger.data!.length;
    const noOpRun = await coordinator.rpc("process_homologated_match", {
      target_match: matchId,
      operation_id: crypto.randomUUID(),
    });
    expect(noOpRun.error).toBeNull();
    expect(noOpRun.data.transaction_count).toBe(0);
    expect(noOpRun.data.metadata.no_op).toBe(true);
    expect(
      (
        await admin
          .from("ranking_transactions")
          .select("id")
          .eq("match_id", matchId)
      ).data,
    ).toHaveLength(beforeReprocessCount);
    expect(
      (
        await operator.rpc("process_homologated_match", {
          target_match: matchId,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();

    const athleteVisible = await athleteClient
      .from("ranking_transactions")
      .select("athlete_id")
      .eq("match_id", matchId);
    expect(athleteVisible.error).toBeNull();
    expect(athleteVisible.data!.length).toBeGreaterThan(0);
    expect(
      athleteVisible.data!.every(
        (transaction) => transaction.athlete_id === ids.athleteA,
      ),
    ).toBe(true);
    expect(
      (
        await athleteClient.from("ranking_transactions").insert({
          season_id: ids.season,
          athlete_id: ids.athleteA,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin
          .from("ranking_transactions")
          .update({ points: 999, points_applied: 999 })
          .eq("id", firstLedger.data![0]!.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin
          .from("ranking_transactions")
          .delete()
          .eq("id", firstLedger.data![0]!.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await anon
          .from("ranking_transactions")
          .select("id")
          .eq("match_id", matchId)
      ).error,
    ).not.toBeNull();

    const result = await operator
      .from("match_results")
      .select("*")
      .eq("match_id", matchId)
      .single();
    expect(result.data).toMatchObject({
      score_a: 11,
      winner_side_id: sideA,
      result_status: "homologated",
    });
    const stats = await athleteClient
      .from("match_athlete_statistics")
      .select("*")
      .eq("athlete_id", ids.athleteA)
      .single();
    expect(stats.data.games_participated).toBeGreaterThan(0);
    expect(stats.data.wins).toBeGreaterThan(0);
    expect(stats.data.aces).toBeGreaterThan(0);

    expect(
      (
        await athleteClient
          .from("match_results")
          .select("id")
          .eq("match_id", matchId)
      ).data,
    ).toHaveLength(1);
    expect(
      (
        await teamManager
          .from("match_results")
          .select("id")
          .eq("match_id", matchId)
      ).data,
    ).toHaveLength(1);
    const anonymousRead = await anon
      .from("match_results")
      .select("id")
      .eq("match_id", matchId);
    expect(anonymousRead.error).not.toBeNull();
    expect(anonymousRead.data).toBeNull();
    expect(
      (
        await athleteClient.rpc("record_match_rally", {
          target_match: matchId,
          target_winning_side: sideA,
          expected_rally_number: 99,
          client_sequence: 99,
          client_recorded_at: null,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();

    expect(
      (
        await admin.rpc("request_match_result_correction", {
          target_match: matchId,
          reason: "[TEST] administrative review",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await coordinator.rpc("homologate_match_result", {
          target_match: matchId,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    const afterCorrection = (
      await admin
        .from("ranking_transactions")
        .select("id,points,transaction_type,related_transaction_id")
        .eq("match_id", matchId)
    ).data!;
    expect(
      afterCorrection.filter(
        (transaction) => transaction.transaction_type === "reversal",
      ),
    ).toHaveLength(firstLedger.data!.length);
    expect(
      afterCorrection.reduce((sum, transaction) => sum + transaction.points, 0),
    ).toBe(
      firstLedger.data!.reduce(
        (sum, transaction) => sum + transaction.points,
        0,
      ),
    );
    const versions = await admin
      .from("match_result_versions")
      .select("version_number")
      .eq("match_id", matchId);
    expect(versions.data!.length).toBeGreaterThanOrEqual(4);
    expect(
      (
        await admin
          .from("match_result_versions")
          .update({ reason: "tamper" })
          .eq("match_id", matchId)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await admin.rpc("void_match_result", {
          target_match: matchId,
          reason: "[TEST] void security scenario",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin
          .from("match_results")
          .select("result_status")
          .eq("match_id", matchId)
          .single()
      ).data?.result_status,
    ).toBe("void");
    const voidLedger = (
      await admin
        .from("ranking_transactions")
        .select("points,transaction_type")
        .eq("match_id", matchId)
    ).data!;
    expect(
      voidLedger.reduce((sum, transaction) => sum + transaction.points, 0),
    ).toBe(0);
    expect(
      voidLedger.filter(
        (transaction) => transaction.transaction_type === "reversal",
      ).length,
    ).toBe(firstLedger.data!.length * 2);
    const audit = await admin
      .from("audit_logs")
      .select("id,entity_type")
      .in("entity_type", [
        "match_rallies",
        "match_rally_corrections",
        "match_technical_actions",
        "match_results",
        "match_result_versions",
        "ranking_processing_runs",
        "ranking_transactions",
      ]);
    expect(audit.data!.length).toBeGreaterThan(10);
  }, 120_000);
});
