import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

const opportunityId = crypto.randomUUID();

describe("agenda demand booking and first-party acquisition", () => {
  afterAll(async () => {
    const admin = await clientFor("admin");
    await admin.from("demand_opportunities").delete().eq("id", opportunityId);
  });

  it("keeps interest separate from reservation and exposes only sanitized list data", async () => {
    const admin = await clientFor("admin");
    const athlete = await clientFor("athlete");

    const created = await admin.from("demand_opportunities").insert({
      id: opportunityId,
      title: "DEV Demand Integration Fixture",
      opportunity_type: "ur_play",
      status: "collecting_interest",
      starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      level: "n2",
      format_code: "doubles",
      target_formations: 4,
      max_formations: 8,
      capacity_athletes: 8,
      court_count: 1,
    });
    expect(created.error).toBeNull();

    const interest = await athlete.from("session_interests").insert({
      opportunity_id: opportunityId,
      athlete_id: ids.athleteA,
      interest_mode: "looking_for_partner",
      show_identity: true,
      status: "active",
    });
    expect(interest.error).toBeNull();

    const beforeReservation = await athlete
      .from("activity_reservations")
      .select("id")
      .eq("opportunity_id", opportunityId);
    expect(beforeReservation.error).toBeNull();
    expect(beforeReservation.data ?? []).toHaveLength(0);

    const list = await athlete
      .from("interest_list_sanitized")
      .select("*")
      .eq("opportunity_id", opportunityId);
    expect(list.error).toBeNull();
    expect(list.data?.[0]).not.toHaveProperty("email");
    expect(list.data?.[0]).not.toHaveProperty("phone");
    expect(list.data?.[0]).not.toHaveProperty("wallet");

    const reservation = await athlete.from("activity_reservations").insert({
      opportunity_id: opportunityId,
      athlete_id: ids.athleteA,
      status: "reserved",
      eligibility: "eligible",
    });
    expect(reservation.error).toBeNull();

    const agenda = await athlete
      .from("athlete_agenda_opportunities")
      .select("interested_count,reserved_count,remaining_capacity")
      .eq("id", opportunityId)
      .single();
    expect(agenda.error).toBeNull();
    expect(agenda.data?.interested_count).toBe(1);
    expect(agenda.data?.reserved_count).toBe(1);
    expect(agenda.data?.remaining_capacity).toBe(7);
  });

  it("allows safe anonymous acquisition insert but blocks anonymous analytics select", async () => {
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const sessionId = crypto.randomUUID();

    const journey = await anon
      .from("acquisition_journeys")
      .insert({
        anonymous_session_id: sessionId,
        landing_path: "/?utm_source=instagram",
        first_touch: "instagram",
        last_touch: "instagram",
        marketing_attribution_allowed: true,
      })
      .select("id")
      .single();
    expect(journey.error).not.toBeNull();

    const safeInsert = await anon.from("acquisition_journeys").insert({
      anonymous_session_id: crypto.randomUUID(),
      landing_path: "/agenda",
      first_touch: "direct",
      last_touch: "direct",
      marketing_attribution_allowed: false,
    });
    expect(safeInsert.error).toBeNull();

    const anonRead = await anon
      .from("acquisition_events")
      .select("id")
      .limit(1);
    expect(anonRead.error).not.toBeNull();
  });
});
