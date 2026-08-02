import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { clientFor, ids, testKey, testUrl } from "./helpers";

describe("Sprint 11 athlete experience on Supabase DEV", () => {
  it("generates a level notification idempotently", async () => {
    const admin = await clientFor("admin");
    const { data: level, error: findError } = await admin
      .from("athlete_levels")
      .select("id,level,status")
      .eq("athlete_id", ids.athleteA)
      .eq("status", "active")
      .limit(1)
      .single();
    expect(findError).toBeNull();
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error: deactivateError } = await admin
        .from("athlete_levels")
        .update({ status: "inactive" })
        .eq("id", level!.id);
      expect(deactivateError).toBeNull();
      const { error: activateError } = await admin
        .from("athlete_levels")
        .update({ status: "active" })
        .eq("id", level!.id);
      expect(activateError).toBeNull();
    }
    const { data: events, error } = await admin
      .from("notifications")
      .select("id,athlete_id,notification_type,idempotency_key")
      .eq("idempotency_key", `level_changed:${level!.id}:${level!.level}`);
    expect(error).toBeNull();
    expect(events).toHaveLength(1);
    expect(events![0]).toMatchObject({
      athlete_id: ids.athleteA,
      notification_type: "level_changed",
    });
  });

  it("lets an athlete read and mark only their own notification", async () => {
    const athlete = await clientFor("athlete");
    const { data: own, error } = await athlete
      .from("notifications")
      .select("id,athlete_id,title,body,action_href,read_at")
      .order("occurred_at", { ascending: false });
    expect(error).toBeNull();
    expect(own?.length).toBeGreaterThan(0);
    expect(own?.every((row) => row.athlete_id === ids.athleteA)).toBe(true);
    expect(JSON.stringify(own)).not.toMatch(
      /email|phone|birth_date|full_name|service_role/i,
    );
    const target = own![0]!;
    const { data: updated, error: updateError } = await athlete
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", target.id)
      .select("id,read_at");
    expect(updateError).toBeNull();
    expect(updated).toHaveLength(1);
    expect(updated![0]!.read_at).not.toBeNull();
  });

  it("blocks athlete IDOR and manager access to the private inbox", async () => {
    const [athleteB, teamManager, poleManager] = await Promise.all([
      clientFor("athlete2"),
      clientFor("teammanager"),
      clientFor("polemanager"),
    ]);
    const admin = await clientFor("admin");
    const { data: target } = await admin
      .from("notifications")
      .select("id")
      .eq("athlete_id", ids.athleteA)
      .limit(1)
      .single();
    const [{ data: otherRows }, { data: teamRows }, { data: poleRows }] =
      await Promise.all([
        athleteB.from("notifications").select("id,athlete_id"),
        teamManager.from("notifications").select("id"),
        poleManager.from("notifications").select("id"),
      ]);
    expect(otherRows?.some((row) => row.athlete_id === ids.athleteA)).toBe(
      false,
    );
    expect(teamRows).toEqual([]);
    expect(poleRows).toEqual([]);
    const { data: idorUpdate, error } = await athleteB
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", target!.id)
      .select("id");
    expect(error).toBeNull();
    expect(idorUpdate).toEqual([]);
  });

  it("denies anonymous reads and athlete inserts", async () => {
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false },
    });
    const athlete = await clientFor("athlete");
    const { error: anonError } = await anon.from("notifications").select("id");
    expect(anonError).not.toBeNull();
    const { error: insertError } = await athlete.from("notifications").insert({
      athlete_id: ids.athleteA,
      notification_type: "ranking_movement",
      title: "Tentativa",
      body: "Tentativa do cliente",
      action_href: "/athlete/ranking",
      source_type: "test",
      idempotency_key: `forbidden:${Date.now()}`,
    });
    expect(insertError).not.toBeNull();
  });
});
