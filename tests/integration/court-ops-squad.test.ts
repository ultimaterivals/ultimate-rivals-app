import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

describe("Sprint 7.1 squads, reserves and court reassignment on remote DEV", () => {
  it("keeps squad, participation, mixed composition, RLS and courts consistent", async () => {
    const admin = await clientFor("admin"),
      operator = await clientFor("operator"),
      athleteClient = await clientFor("athlete"),
      teamManager = await clientFor("teammanager"),
      poleManager = await clientFor("polemanager"),
      anon = createClient(testUrl, testKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      sessionId = crypto.randomUUID(),
      venueId = crypto.randomUUID(),
      courts = Array.from({ length: 3 }, () => crypto.randomUUID()),
      athletes = Array.from({ length: 16 }, () => crypto.randomUUID()),
      now = Date.now(),
      startsAt = new Date(now + 86_400_000),
      endsAt = new Date(startsAt.getTime() + 10_800_000);

    const { data: operatorProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "operator")
      .single();
    const { data: athleteAuth } = await athleteClient.auth.getUser();
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
      operatorProfile?.id && athleteAuth.user?.id && fours?.id && mixed?.id,
    ).toBeTruthy();

    expect(
      (
        await admin.from("venues").insert({
          id: venueId,
          name: `[TEST] Squad ${sessionId.slice(0, 6)}`,
          pole_id: ids.poleA,
          city: "Test City",
          state: "SP",
          status: "active",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("courts").insert(
          courts.map((id, index) => ({
            id,
            venue_id: venueId,
            name: `[TEST] Squad Court ${index + 1}`,
            status: "active",
          })),
        )
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("athletes").insert(
          athletes.map((id, index) => ({
            id,
            public_name: `[TEST] Squad Player ${index + 1}`,
            full_name: `Fictitious Squad Player ${index + 1}`,
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
            reason: "[TEST] Sprint 7.1",
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
          name: `[TEST] Sprint 7.1 ${sessionId.slice(0, 6)}`,
          session_date: startsAt.toISOString().slice(0, 10),
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          registration_opens_at: new Date(now - 3_600_000).toISOString(),
          registration_closes_at: new Date(now + 3_600_000).toISOString(),
          capacity: 16,
          waitlist_capacity: 2,
          status: "registration_open",
          created_by: ids.admin,
          min_rest_minutes: 10,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("ur_play_session_courts").insert(
          courts.map((court_id, index) => ({
            session_id: sessionId,
            court_id,
            position: index + 1,
          })),
        )
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
      const registration = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: athleteId,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      expect(registration.error).toBeNull();
      registrations.push(registration.data);
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
    for (const registration of registrations) {
      expect(
        (
          await operator.rpc("checkin_ur_play", {
            target_registration: registration.id,
            checkin_method: "operator",
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    }
    expect(
      (
        await admin.rpc("transition_ur_play_session", {
          target_session_id: sessionId,
          target_status: "in_progress",
          cancel_reason: null,
        })
      ).error,
    ).toBeNull();

    const createFours = (
      client: typeof operator,
      courtId: string,
      sideA: string[],
      sideB: string[],
      sideAReserves: string[] = [],
      sideBReserves: string[] = [],
    ) =>
      client.rpc("create_court_ops_match_with_squad", {
        target_session: sessionId,
        target_court: courtId,
        target_format: fours!.id,
        target_category: mixed!.id,
        target_level: "n2",
        side_a: sideA,
        side_b: sideB,
        side_a_reserves: sideAReserves,
        side_b_reserves: sideBReserves,
        side_a_roster: null,
        side_b_roster: null,
        operation_id: crypto.randomUUID(),
      });

    const fourOnly = await createFours(
      operator,
      courts[0]!,
      athletes.slice(0, 4),
      athletes.slice(4, 8),
    );
    expect(fourOnly.error).toBeNull();
    expect(
      (
        await operator
          .from("match_squad_members")
          .select("id")
          .eq("match_id", fourOnly.data.id)
      ).data,
    ).toHaveLength(8);
    expect(
      (
        await operator
          .from("match_participants")
          .select("id")
          .eq("match_id", fourOnly.data.id)
      ).data,
    ).toHaveLength(8);
    expect(
      (
        await operator.rpc("transition_court_ops_match", {
          target_match: fourOnly.data.id,
          target_status: "cancelled",
          reason: "[TEST] 4+0 complete",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    const duplicate = await createFours(
      operator,
      courts[0]!,
      athletes.slice(0, 4),
      athletes.slice(4, 8),
      [athletes[0]!],
    );
    expect(duplicate.error).not.toBeNull();

    const squadMatch = await createFours(
      operator,
      courts[0]!,
      athletes.slice(0, 4),
      athletes.slice(4, 8),
      athletes.slice(8, 11),
      athletes.slice(11, 14),
    );
    expect(squadMatch.error).toBeNull();
    const squadRows = await operator
      .from("match_squad_members")
      .select("id,side_id,athlete_id,squad_role,status,reserve_presence_status")
      .eq("match_id", squadMatch.data.id);
    expect(squadRows.error).toBeNull();
    expect(squadRows.data).toHaveLength(14);
    expect(
      squadRows.data?.filter((member) => member.squad_role === "reserve"),
    ).toHaveLength(6);
    expect(
      (
        await operator
          .from("match_participants")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).data,
    ).toHaveLength(8);

    const sideAReserve = squadRows.data!.find(
        (member) => member.athlete_id === athletes[8],
      )!,
      sideAMaleReserve = squadRows.data!.find(
        (member) => member.athlete_id === athletes[9],
      )!,
      sideA = sideAReserve.side_id,
      participantRows = await operator
        .from("match_participants")
        .select("id,athlete_id")
        .eq("match_id", squadMatch.data.id)
        .eq("side_id", sideA),
      femaleParticipant = participantRows.data!.find(
        (participant) => participant.athlete_id === athletes[0],
      )!;

    expect(
      (
        await operator.rpc("add_match_reserve", {
          target_match: squadMatch.data.id,
          target_side: sideA,
          target_athlete: athletes[14],
          target_roster: null,
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();

    for (const member of [sideAReserve, sideAMaleReserve]) {
      expect(
        (
          await operator.rpc("set_match_reserve_presence", {
            target_member: member.id,
            target_presence: "present",
            reason: "[TEST] present reserve",
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    }
    expect(
      (
        await operator
          .from("match_participants")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).data,
    ).toHaveLength(8);

    const invalidMixedPromotion = await operator.rpc("promote_match_reserve", {
      target_reserve: sideAMaleReserve.id,
      target_participant: femaleParticipant.id,
      outgoing_disposition: "bench",
      reason: "[TEST] invalid mixed substitution",
      operation_id: crypto.randomUUID(),
    });
    expect(invalidMixedPromotion.error).not.toBeNull();

    const validPromotion = await operator.rpc("promote_match_reserve", {
      target_reserve: sideAReserve.id,
      target_participant: femaleParticipant.id,
      outgoing_disposition: "bench",
      reason: "[TEST] valid mixed substitution",
      operation_id: crypto.randomUUID(),
    });
    expect(validPromotion.error).toBeNull();
    expect(validPromotion.data.athlete_id).toBe(athletes[8]);
    expect(
      (
        await operator
          .from("match_squad_members")
          .select("squad_role,status")
          .eq("match_id", squadMatch.data.id)
          .eq("athlete_id", athletes[0])
          .single()
      ).data,
    ).toMatchObject({ squad_role: "reserve", status: "bench" });

    expect(
      (
        await operator.rpc("change_match_court", {
          target_match: squadMatch.data.id,
          target_court: courts[1],
          reason: "[TEST] move before start",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    expect(
      (
        await athleteClient
          .from("match_squad_members")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).data,
    ).toHaveLength(14);
    expect(
      (
        await teamManager
          .from("match_squad_members")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).data,
    ).toHaveLength(14);
    expect(
      (
        await teamManager
          .from("match_squad_members")
          .update({ status: "withdrawn" })
          .eq("id", sideAReserve.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await poleManager
          .from("match_squad_members")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).data,
    ).toHaveLength(0);
    expect(
      (
        await anon
          .from("match_squad_members")
          .select("id")
          .eq("match_id", squadMatch.data.id)
      ).error,
    ).not.toBeNull();

    for (const status of ["called", "ready", "in_progress"]) {
      expect(
        (
          await operator.rpc("transition_court_ops_match", {
            target_match: squadMatch.data.id,
            target_status: status,
            reason: null,
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
    }
    expect(
      (
        await operator.rpc("promote_match_reserve", {
          target_reserve: sideAMaleReserve.id,
          target_participant: validPromotion.data.id,
          outgoing_disposition: "bench",
          reason: "[TEST] forbidden after start",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await operator.rpc("change_match_court", {
          target_match: squadMatch.data.id,
          target_court: courts[2],
          reason: "[TEST] forbidden after start",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await operator.rpc("transition_court_ops_match", {
          target_match: squadMatch.data.id,
          target_status: "abandoned",
          reason: "[TEST] release squad",
          operation_id: crypto.randomUUID(),
        })
      ).error,
    ).toBeNull();

    const concurrentA = await createFours(
        operator,
        courts[0]!,
        athletes.slice(0, 4),
        athletes.slice(4, 8),
      ),
      concurrentB = await createFours(
        admin,
        courts[1]!,
        athletes.slice(8, 12),
        athletes.slice(12, 16),
      );
    expect(concurrentA.error).toBeNull();
    expect(concurrentB.error).toBeNull();
    const moves = await Promise.all([
      operator.rpc("change_match_court", {
        target_match: concurrentA.data.id,
        target_court: courts[2],
        reason: "[TEST] concurrent operator move",
        operation_id: crypto.randomUUID(),
      }),
      admin.rpc("change_match_court", {
        target_match: concurrentB.data.id,
        target_court: courts[2],
        reason: "[TEST] concurrent admin move",
        operation_id: crypto.randomUUID(),
      }),
    ]);
    expect(moves.filter((move) => move.error === null)).toHaveLength(1);
    expect(moves.filter((move) => move.error !== null)).toHaveLength(1);

    const audit = await admin
      .from("audit_logs")
      .select("entity_type")
      .in("entity_type", ["match_squad_members", "match_court_changes"])
      .in("entity_id", [sideAReserve.id, squadMatch.data.id]);
    expect(audit.error).toBeNull();
    expect(
      audit.data?.some((entry) => entry.entity_type === "match_squad_members"),
    ).toBe(true);
    const courtAudit = await admin
      .from("match_court_changes")
      .select("id")
      .eq("match_id", squadMatch.data.id);
    expect(courtAudit.data).toHaveLength(1);
  }, 120_000);
});
