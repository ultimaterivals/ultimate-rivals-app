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

  it("redeems UR Coins atomically and idempotently", async () => {
    const admin = await clientFor("admin");
    const athlete = await clientFor("athlete");

    const { data: athleteRow, error: athleteError } = await athlete
      .from("athletes")
      .select("id")
      .single();
    expect(athleteError).toBeNull();
    expect(athleteRow?.id).toBeTruthy();

    const { data: item, error: itemError } = await admin
      .from("market_items")
      .select("id")
      .limit(1)
      .single();
    expect(itemError).toBeNull();

    const suffix = crypto.randomUUID().slice(0, 8);
    const { data: offer, error: offerError } = await admin
      .from("market_offers")
      .insert({
        item_id: item?.id,
        code: `integration_urc_${suffix}`,
        name: "Oferta URC Integração",
        status: "active",
        accepts_brl: false,
        accepts_urc: true,
        urc_amount: 40,
        inventory_limit: 2,
        per_athlete_limit: 1,
      })
      .select("id")
      .single();
    expect(offerError).toBeNull();

    const grantKey = `integration-urc-grant-${suffix}`;
    const { error: grantError } = await admin.from("ur_coin_transactions").insert({
      athlete_id: athleteRow?.id,
      transaction_type: "grant",
      direction: "credit",
      amount: 100,
      source_type: "integration_test",
      idempotency_key: grantKey,
      reason: "Crédito para teste de resgate",
    });
    expect(grantError).toBeNull();

    const operationId = `integration-redemption-${suffix}`;
    const first = await athlete.rpc("redeem_market_offer_urc", {
      target_offer: offer?.id,
      operation_id: operationId,
    });
    expect(first.error).toBeNull();
    expect(first.data?.[0]?.new_balance).toBe(60);
    expect(first.data?.[0]?.redemption_status).toBe("reserved");

    const second = await athlete.rpc("redeem_market_offer_urc", {
      target_offer: offer?.id,
      operation_id: operationId,
    });
    expect(second.error).toBeNull();
    expect(second.data?.[0]?.redemption_id).toBe(first.data?.[0]?.redemption_id);
    expect(second.data?.[0]?.new_balance).toBe(60);

    const { data: debits, error: debitError } = await athlete
      .from("ur_coin_transactions")
      .select("id,amount,direction,source_type")
      .eq("source_type", "market_redemption");
    expect(debitError).toBeNull();
    expect(debits).toHaveLength(1);
    expect(debits?.[0]).toMatchObject({ amount: 40, direction: "debit" });

    const { data: redemptions, error: redemptionError } = await athlete
      .from("market_redemptions")
      .select("id,status,redemption_code")
      .eq("offer_id", offer?.id);
    expect(redemptionError).toBeNull();
    expect(redemptions).toHaveLength(1);
    expect(redemptions?.[0]?.status).toBe("reserved");

    const secondOperation = await athlete.rpc("redeem_market_offer_urc", {
      target_offer: offer?.id,
      operation_id: `${operationId}-second`,
    });
    expect(secondOperation.error).not.toBeNull();
    expect(secondOperation.error?.message.toLowerCase()).toContain("redemption limit");
  }, 60000);

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
