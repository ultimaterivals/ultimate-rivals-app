import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";

describe("Sprint 7 Court Ops on remote DEV", () => {
  it("runs queue, composition, concurrency, lifecycle, RLS and audit", async () => {
    const admin = await clientFor("admin"),
      operator = await clientFor("operator"),
      athleteClient = await clientFor("athlete"),
      poleManager = await clientFor("polemanager"),
      teamManager = await clientFor("teammanager");
    const sessionId = crypto.randomUUID(),
      venueId = crypto.randomUUID(),
      courtA = crypto.randomUUID(),
      courtB = crypto.randomUUID(),
      athletes = Array.from({ length: 9 }, () => crypto.randomUUID()),
      now = Date.now(),
      startsAt = new Date(now + 86_400_000),
      endsAt = new Date(startsAt.getTime() + 7_200_000);
    const { data: operatorProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "operator")
      .single();
    const { data: athleteAuth } = await athleteClient.auth.getUser();
    const { data: format } = await admin
      .from("competitive_formats")
      .select("id")
      .eq("code", "doubles")
      .single();
    const { data: fours } = await admin
      .from("competitive_formats")
      .select("id")
      .eq("code", "fours")
      .single();
    const { data: mixed } = await admin
      .from("competitive_categories")
      .select("id")
      .eq("code", "mixed")
      .single();
    expect(
      operatorProfile?.id &&
        athleteAuth.user?.id &&
        format?.id &&
        fours?.id &&
        mixed?.id,
    ).toBeTruthy();

    expect(
      (
        await admin.from("venues").insert({
          id: venueId,
          name: `[TEST] Court Ops ${sessionId.slice(0, 6)}`,
          pole_id: ids.poleA,
          city: "Test City",
          state: "SP",
          status: "active",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("courts").insert([
          {
            id: courtA,
            venue_id: venueId,
            name: "[TEST] Court A",
            status: "active",
          },
          {
            id: courtB,
            venue_id: venueId,
            name: "[TEST] Court B",
            status: "active",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("athletes").insert(
          athletes.map((id, index) => ({
            id,
            public_name: `[TEST] Player ${index + 1}`,
            full_name: `Fictitious Court Ops Player ${index + 1}`,
            gender: index % 2 === 0 ? "female" : "male",
            status: "active",
          })),
        )
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("athlete_levels").insert(
          athletes.map((athlete_id) => ({
            athlete_id,
            season_id: ids.season,
            level: "n2",
            starts_at: new Date(now - 86_400_000).toISOString(),
            reason: "[TEST] Court Ops",
            assigned_by: ids.admin,
          })),
        )
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("team_memberships").insert({
          athlete_id: athletes[0],
          team_id: ids.teamA,
          season_id: ids.season,
          membership_type: "athlete",
          starts_at: new Date(now - 86_400_000).toISOString(),
          created_by: ids.admin,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("ur_play_sessions").insert({
          id: sessionId,
          season_id: ids.season,
          pole_id: ids.poleA,
          venue_id: venueId,
          name: `[TEST] Court Ops ${sessionId.slice(0, 6)}`,
          session_date: startsAt.toISOString().slice(0, 10),
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          registration_opens_at: new Date(now - 3_600_000).toISOString(),
          registration_closes_at: new Date(now + 3_600_000).toISOString(),
          capacity: 9,
          waitlist_capacity: 2,
          status: "registration_open",
          created_by: ids.admin,
          min_rest_minutes: 10,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("ur_play_session_courts").insert([
          { session_id: sessionId, court_id: courtA, position: 1 },
          { session_id: sessionId, court_id: courtB, position: 2 },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("ur_play_session_staff").insert([
          {
            session_id: sessionId,
            profile_id: operatorProfile!.id,
            role: "operator",
          },
          {
            session_id: sessionId,
            profile_id: athleteAuth.user!.id,
            role: "evaluator",
          },
        ])
      ).error,
    ).toBeNull();
    const registrations = [];
    for (const athleteId of athletes) {
      const result = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: athleteId,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      expect(result.error).toBeNull();
      registrations.push(result.data);
    }
    for (const status of ["registration_closed", "checkin_open"]) {
      expect(
        (
          await admin.rpc("transition_ur_play_session", {
            target_session_id: sessionId,
            target_status: status,
            cancel_reason: null,
          })
        ).error,
      ).toBeNull();
    }
    for (const registration of registrations.slice(0, 8))
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
    expect(
      (
        await admin
          .from("match_queue_entries")
          .select("id")
          .eq("session_id", sessionId)
          .eq("status", "waiting")
      ).data,
    ).toHaveLength(8);

    const operationId = crypto.randomUUID(),
      validArgs = {
        target_session: sessionId,
        target_court: courtA,
        target_format: format!.id,
        target_category: mixed!.id,
        target_level: "n2",
        side_a: [athletes[0], athletes[1]],
        side_b: [athletes[2], athletes[3]],
        operation_id: operationId,
      };
    const absent = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      side_a: [athletes[8], athletes[1]],
      operation_id: crypto.randomUUID(),
    });
    expect(absent.error).not.toBeNull();
    const incomplete = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      side_a: [athletes[0]],
      operation_id: crypto.randomUUID(),
    });
    expect(incomplete.error).not.toBeNull();
    const created = await operator.rpc("create_court_ops_match", validArgs);
    expect(created.error).toBeNull();
    expect(created.data.match_code).toMatch(/^URP-/);
    expect(
      (
        await athleteClient
          .from("match_queue_entries")
          .select("id")
          .eq("session_id", sessionId)
      ).data,
    ).toHaveLength(8);
    expect(
      (
        await athleteClient
          .from("matches")
          .select("id")
          .eq("session_id", sessionId)
      ).data,
    ).toHaveLength(1);
    expect(
      (await teamManager.from("matches").select("id").eq("id", created.data.id))
        .data,
    ).toHaveLength(1);
    expect(
      (
        await teamManager
          .from("matches")
          .update({ status: "cancelled" })
          .eq("id", created.data.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await athleteClient.rpc("transition_court_ops_match", {
          target_match: created.data.id,
          target_status: "called",
          reason: null,
          operation_id: crypto.randomUUID(),
        })
      ).error?.code,
    ).toBe("42501");
    const retry = await operator.rpc("create_court_ops_match", validArgs);
    expect(retry.data.id).toBe(created.data.id);
    const duplicate = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      target_court: courtB,
      operation_id: crypto.randomUUID(),
      side_b: [athletes[2], athletes[0]],
    });
    expect(duplicate.error).not.toBeNull();
    const occupied = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      operation_id: crypto.randomUUID(),
      side_a: [athletes[4], athletes[5]],
      side_b: [athletes[6], athletes[7]],
    });
    expect(occupied.error).not.toBeNull();
    const overlap = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      target_court: courtB,
      operation_id: crypto.randomUUID(),
      side_a: [athletes[0], athletes[5]],
      side_b: [athletes[6], athletes[7]],
    });
    expect(overlap.error).not.toBeNull();
    const invalidMixed = await operator.rpc("create_court_ops_match", {
      ...validArgs,
      target_court: courtB,
      operation_id: crypto.randomUUID(),
      side_a: [athletes[4], athletes[6]],
      side_b: [athletes[5], athletes[7]],
    });
    expect(invalidMixed.error).not.toBeNull();
    const unassigned = await poleManager.rpc("create_court_ops_match", {
      ...validArgs,
      target_court: courtB,
      operation_id: crypto.randomUUID(),
      side_a: [athletes[4], athletes[5]],
      side_b: [athletes[6], athletes[7]],
    });
    expect(unassigned.error?.code).toBe("42501");
    for (const status of ["called", "ready", "in_progress"]) {
      expect(
        (
          await operator.rpc("transition_court_ops_match", {
            target_match: created.data.id,
            target_status: status,
            reason: null,
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    }
    const participant = (
      await admin
        .from("match_participants")
        .select("id,team_snapshot_id,pole_snapshot_id,level_snapshot")
        .eq("match_id", created.data.id)
        .limit(1)
        .single()
    ).data!;
    expect(participant.level_snapshot).toBe("n2");
    expect(
      (
        await operator.rpc("replace_match_participant", {
          target_participant: participant.id,
          replacement_athlete: athletes[4],
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await athleteClient
          .from("matches")
          .update({ status: "cancelled" })
          .eq("id", created.data.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await operator.rpc("transition_court_ops_match", {
          target_match: created.data.id,
          target_status: "abandoned",
          reason: "[TEST] interrupted",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    const invalidMixedFours = await operator.rpc("create_court_ops_match", {
      target_session: sessionId,
      target_court: courtB,
      target_format: fours!.id,
      target_category: mixed!.id,
      target_level: "n2",
      side_a: [athletes[0], athletes[2], athletes[4], athletes[6]],
      side_b: [athletes[1], athletes[3], athletes[5], athletes[7]],
      operation_id: crypto.randomUUID(),
    });
    expect(invalidMixedFours.error).not.toBeNull();
    const foursMatch = await operator.rpc("create_court_ops_match", {
      target_session: sessionId,
      target_court: courtB,
      target_format: fours!.id,
      target_category: mixed!.id,
      target_level: "n2",
      side_a: [athletes[0], athletes[1], athletes[2], athletes[3]],
      side_b: [athletes[4], athletes[5], athletes[6], athletes[7]],
      operation_id: crypto.randomUUID(),
    });
    expect(foursMatch.error).toBeNull();
    expect(
      (
        await operator.rpc("transition_court_ops_match", {
          target_match: foursMatch.data.id,
          target_status: "cancelled",
          reason: "[TEST] cleanup",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("transition_court_ops_match", {
          target_match: foursMatch.data.id,
          target_status: "cancelled",
          reason: "[TEST] idempotent retry",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();
    const concurrentOperation = (client: typeof operator, court: string) =>
      client.rpc("create_court_ops_match", {
        target_session: sessionId,
        target_court: court,
        target_format: format!.id,
        target_category: mixed!.id,
        target_level: "n2",
        side_a: [athletes[0], athletes[1]],
        side_b: [athletes[2], athletes[3]],
        operation_id: crypto.randomUUID(),
      });
    const concurrent = await Promise.all([
      concurrentOperation(operator, courtA),
      concurrentOperation(admin, courtB),
    ]);
    expect(concurrent.filter((result) => result.error === null)).toHaveLength(
      1,
    );
    expect(concurrent.filter((result) => result.error !== null)).toHaveLength(
      1,
    );
    const audit = await admin
      .from("audit_logs")
      .select("id")
      .eq("entity_type", "matches")
      .eq("entity_id", created.data.id);
    expect(audit.data?.length).toBeGreaterThan(2);
  }, 60_000);
});
