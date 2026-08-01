import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";

describe("Sprint 6 UR Play on remote DEV", () => {
  it("enforces capacity, waitlist promotion, snapshots, RLS and idempotent check-in", async () => {
    const admin = await clientFor("admin");
    const operator = await clientFor("operator");
    const athlete = await clientFor("athlete");
    const outsider = await clientFor("athlete2");
    const sessionId = crypto.randomUUID();
    const fictionalAthleteId = crypto.randomUUID();
    const venueId = crypto.randomUUID();
    const courtId = crypto.randomUUID();
    const now = Date.now();
    const startsAt = new Date(now + 86_400_000);
    const endsAt = new Date(startsAt.getTime() + 7_200_000);

    const { data: operatorProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "operator")
      .limit(1)
      .single();
    expect(operatorProfile?.id).toBeTruthy();

    try {
      expect(
        (await admin.from("venues").insert({ id: venueId, name: "[TEST] UR Play Venue", pole_id: ids.poleA, city: "Test City", state: "SP", status: "active" })).error,
      ).toBeNull();
      expect(
        (await admin.from("courts").insert({ id: courtId, venue_id: venueId, name: "[TEST] Court", status: "active" })).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("athletes")
            .insert({
              id: fictionalAthleteId,
              public_name: "[TEST] UR Play",
              full_name: "Fictitious UR Play Athlete",
              gender: "female",
              status: "active",
            })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("ur_play_sessions")
            .insert({
              id: sessionId,
              season_id: ids.season,
              pole_id: ids.poleA,
              venue_id: venueId,
              name: `[TEST] UR Play ${sessionId.slice(0, 6)}`,
              session_date: startsAt.toISOString().slice(0, 10),
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              registration_opens_at: new Date(now - 3_600_000).toISOString(),
              registration_closes_at: new Date(now + 3_600_000).toISOString(),
              capacity: 2,
              waitlist_capacity: 5,
              status: "registration_open",
              created_by: ids.admin,
            })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("ur_play_session_courts")
            .insert({ session_id: sessionId, court_id: courtId })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("ur_play_session_staff")
            .insert({
              session_id: sessionId,
              profile_id: operatorProfile!.id,
              role: "operator",
            })
        ).error,
      ).toBeNull();

      const registrationA = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: ids.athleteA,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      const registrationB = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: ids.athleteB,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      const waitlisted = await admin.rpc("register_ur_play", {
        target_session: sessionId,
        target_athlete: fictionalAthleteId,
        target_source: "admin",
        operation_id: crypto.randomUUID(),
      });
      expect(registrationA.error).toBeNull();
      expect(registrationB.error).toBeNull();
      expect(waitlisted.data.registration_status).toBe("waitlisted");
      expect(registrationA.data.snapshot_team_id).toBe(ids.teamA);
      expect(registrationA.data.snapshot_team_pole_id).toBe(ids.poleA);

      const forbidden = await outsider.rpc("cancel_ur_play_registration", {
        target_registration: registrationA.data.id,
        reason: "IDOR attempt",
        operation_id: crypto.randomUUID(),
      });
      expect(forbidden.error?.code).toBe("42501");

      await athlete
        .from("ur_play_registrations")
        .update({ payment_status: "paid" })
        .eq("id", registrationA.data.id);
      const protectedPayment = await athlete
        .from("ur_play_registrations")
        .select("payment_status")
        .eq("id", registrationA.data.id)
        .single();
      expect(protectedPayment.data?.payment_status).not.toBe("paid");
      expect(
        (
          await admin.rpc("cancel_ur_play_registration", {
            target_registration: registrationA.data.id,
            reason: "[TEST] promotion",
            operation_id: crypto.randomUUID(),
          })
        ).error,
      ).toBeNull();
      const promoted = await admin
        .from("ur_play_registrations")
        .select("registration_status,waitlist_position")
        .eq("id", waitlisted.data.id)
        .single();
      expect(promoted.data).toEqual({
        registration_status: "confirmed",
        waitlist_position: null,
      });

      const operationId = crypto.randomUUID();
      const first = await operator.rpc("checkin_ur_play", {
        target_registration: registrationB.data.id,
        checkin_method: "operator",
        operation_id: operationId,
      });
      const second = await operator.rpc("checkin_ur_play", {
        target_registration: registrationB.data.id,
        checkin_method: "operator",
        operation_id: operationId,
      });
      expect(first.error).toBeNull();
      expect(second.data.id).toBe(first.data.id);
      expect(
        (
          await operator.rpc("set_ur_play_attendance", {
            target_registration: registrationB.data.id,
            target_status: "present",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await operator.rpc("set_ur_play_payment", {
            target_registration: registrationB.data.id,
            target_status: "paid",
            target_method: "pix",
            target_reference: "[TEST] external reference",
          })
        ).error,
      ).toBeNull();

      const audit = await admin
        .from("audit_logs")
        .select("id")
        .eq("entity_type", "ur_play_registrations")
        .limit(1);
      expect(audit.data?.length).toBe(1);
      expect(
        (
          await athlete
            .from("audit_logs")
            .update({ action: "DELETE" })
            .eq("id", audit.data?.[0]?.id ?? crypto.randomUUID())
        ).error,
      ).not.toBeNull();
    } finally {
      await admin
        .from("ur_play_notification_events")
        .delete()
        .eq("session_id", sessionId);
      await admin.from("ur_play_checkins").delete().eq("session_id", sessionId);
      await admin
        .from("ur_play_registrations")
        .delete()
        .eq("session_id", sessionId);
      await admin
        .from("ur_play_session_staff")
        .delete()
        .eq("session_id", sessionId);
      await admin
        .from("ur_play_session_courts")
        .delete()
        .eq("session_id", sessionId);
      await admin
        .from("ur_play_session_scopes")
        .delete()
        .eq("session_id", sessionId);
      await admin.from("ur_play_sessions").delete().eq("id", sessionId);
      await admin.from("courts").delete().eq("id", courtId);
      await admin.from("venues").delete().eq("id", venueId);
      await admin.from("athletes").delete().eq("id", fictionalAthleteId);
    }
  });
});
