import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, testKey, testUrl } from "./helpers";

describe("Venue partners, sponsors and Market MVP", () => {
  it("exposes Q1 Market offers publicly without exposing private redemptions", async () => {
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: offers, error: offersError } = await anon
      .from("public_market_offers")
      .select("code,accepts_brl,accepts_urc")
      .order("code");
    expect(offersError).toBeNull();
    expect(offers?.map((offer) => offer.code)).toEqual(
      expect.arrayContaining([
        "q1_recovery_brl",
        "q1_snack_brl",
        "q1_ur_shirt_brl",
        "q1_water_brl",
      ]),
    );
    expect(offers?.every((offer) => offer.accepts_brl)).toBe(true);

    const { error: privateRedemptionsError } = await anon
      .from("market_redemptions")
      .select("id")
      .limit(1);
    expect(privateRedemptionsError).not.toBeNull();
  });

  it("keeps sponsor venue share allocations capped at 20 percent", async () => {
    const admin = await clientFor("admin");

    const { data: venues, error: venueError } = await admin
      .from("venues")
      .select("id,pole_id")
      .limit(2);
    expect(venueError).toBeNull();
    expect(venues?.[0]?.id).toBeTruthy();
    const firstVenue = venues?.[0];
    const secondVenue = venues?.[1] ?? venues?.[0];

    const sponsorCode = `integration_share_${crypto.randomUUID().slice(0, 8)}`;
    const { data: sponsor, error: sponsorError } = await admin
      .from("sponsors")
      .insert({
        code: sponsorCode,
        name: "Sponsor DEV Integração",
        brand_name: "Sponsor DEV",
        category: "integration",
        status: "active",
      })
      .select("id")
      .single();
    expect(sponsorError).toBeNull();

    const { data: agreement, error: agreementError } = await admin
      .from("sponsorship_agreements")
      .insert({
        sponsor_id: sponsor?.id,
        scope: "venue",
        venue_id: firstVenue?.id,
        pole_id: firstVenue?.pole_id,
        name: "Agreement DEV 20%",
        status: "active",
        value_type: "cash",
        cash_value: 1000,
        venue_share_eligible: true,
      })
      .select("id")
      .single();
    expect(agreementError).toBeNull();

    const { error: firstShareError } = await admin
      .from("sponsorship_revenue_allocations")
      .insert({
        agreement_id: agreement?.id,
        venue_id: firstVenue?.id,
        share_percent: 10,
        amount: 100,
        status: "projected",
      });
    expect(firstShareError).toBeNull();

    const { error: overflowError } = await admin
      .from("sponsorship_revenue_allocations")
      .insert({
        agreement_id: agreement?.id,
        venue_id: secondVenue?.id,
        share_percent: venues?.[1] ? 11 : 21,
        amount: 110,
        status: "projected",
      });
    expect(overflowError).not.toBeNull();
  }, 60000);

  it("keeps sponsor contracts hidden from athletes", async () => {
    const athlete = await clientFor("athlete");

    const { data, error } = await athlete
      .from("sponsorship_agreements")
      .select("id,cash_value,notes")
      .limit(5);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
