import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

describe("UR Coins wallet, media and reports", () => {
  it("keeps Q1 UR Coin rules separate from ranking points", async () => {
    const athlete = await clientFor("athlete");

    const { data: rules, error } = await athlete
      .from("ur_coin_rules")
      .select("code,amount,source_type,status")
      .eq("status", "active")
      .order("code");

    expect(error).toBeNull();
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "match_loss", amount: 0 }),
        expect.objectContaining({ code: "match_win", amount: 6 }),
        expect.objectContaining({ code: "ur_play_participation", amount: 4 }),
      ]),
    );
  });

  it("enforces wallet IDOR and append-only transactions", async () => {
    const admin = await clientFor("admin");
    const athlete = await clientFor("athlete");
    const athlete2 = await clientFor("athlete2");

    const { data: rule, error: ruleError } = await admin
      .from("ur_coin_rules")
      .select("id")
      .eq("code", "match_win")
      .single();
    expect(ruleError).toBeNull();

    const idempotencyKey = `integration_wallet_${crypto.randomUUID()}`;
    const { data: transaction, error: insertError } = await admin
      .from("ur_coin_transactions")
      .insert({
        athlete_id: ids.athleteA,
        rule_id: rule?.id,
        transaction_type: "earn",
        direction: "credit",
        amount: 6,
        source_type: "integration_test",
        source_id: crypto.randomUUID(),
        season_id: ids.season,
        idempotency_key: idempotencyKey,
        reason: "Integration wallet earning",
        created_by: ids.admin,
      })
      .select("id,athlete_id,amount")
      .single();
    expect(insertError).toBeNull();
    expect(transaction?.athlete_id).toBe(ids.athleteA);

    const { error: duplicateError } = await admin
      .from("ur_coin_transactions")
      .insert({
        athlete_id: ids.athleteA,
        rule_id: rule?.id,
        transaction_type: "earn",
        direction: "credit",
        amount: 6,
        source_type: "integration_test",
        source_id: crypto.randomUUID(),
        season_id: ids.season,
        idempotency_key: idempotencyKey,
        reason: "Integration duplicate earning",
        created_by: ids.admin,
      });
    expect(duplicateError).not.toBeNull();

    const { data: ownTransactions, error: ownError } = await athlete
      .from("ur_coin_transactions")
      .select("id,athlete_id")
      .eq("id", transaction?.id);
    expect(ownError).toBeNull();
    expect(ownTransactions).toHaveLength(1);

    const { data: otherTransactions, error: otherError } = await athlete2
      .from("ur_coin_transactions")
      .select("id,athlete_id")
      .eq("id", transaction?.id);
    expect(otherError).toBeNull();
    expect(otherTransactions).toEqual([]);

    const { error: updateError } = await admin
      .from("ur_coin_transactions")
      .update({ amount: 99 })
      .eq("id", transaction?.id);
    expect(updateError).not.toBeNull();
  }, 60000);

  it("keeps private media hidden from anon and unrelated athletes", async () => {
    const admin = await clientFor("admin");
    const athlete = await clientFor("athlete");
    const athlete2 = await clientFor("athlete2");
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: asset, error: insertError } = await admin
      .from("media_assets")
      .insert({
        asset_type: "master_video",
        status: "private_source",
        season_id: ids.season,
        athlete_id: ids.athleteA,
        title: "Video DEV privado",
        external_url: "https://example.invalid/dev-private-video",
        metadata: { integration: true },
        created_by: ids.admin,
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: ownAssets, error: ownError } = await athlete
      .from("media_assets")
      .select("id,status")
      .eq("id", asset?.id);
    expect(ownError).toBeNull();
    expect(ownAssets).toHaveLength(1);

    const { data: otherAssets, error: otherError } = await athlete2
      .from("media_assets")
      .select("id,status")
      .eq("id", asset?.id);
    expect(otherError).toBeNull();
    expect(otherAssets).toEqual([]);

    const { error: anonError } = await anon
      .from("media_assets")
      .select("id,status")
      .eq("id", asset?.id);
    expect(anonError).not.toBeNull();
  }, 60000);

  it("exposes report read models to authorized operations", async () => {
    const admin = await clientFor("admin");

    const { data: seasonReports, error: seasonError } = await admin
      .from("season_executive_report_summary")
      .select("season_id,name,active_athletes,matches")
      .limit(5);
    expect(seasonError).toBeNull();
    expect(seasonReports?.length ?? 0).toBeGreaterThan(0);

    const { data: venueReports, error: venueError } = await admin
      .from("venue_report_summary")
      .select("venue_id,name,ur_play_sessions,partner_events")
      .limit(5);
    expect(venueError).toBeNull();
    expect(venueReports?.length ?? 0).toBeGreaterThan(0);
  });
});
