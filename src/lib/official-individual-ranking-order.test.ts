import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813063500_official_individual_ranking_order.sql",
  ),
  "utf8",
);

describe("official individual ranking order", () => {
  it("publishes and snapshots wins before efficiency and points", () => {
    const wins = migration.indexOf("re.wins desc");
    const winRate = migration.indexOf("re.win_rate desc");
    const points = migration.indexOf("re.total_points desc");
    const aces = migration.indexOf("re.aces desc");
    const attacks = migration.indexOf("re.attacks desc");

    expect(wins).toBeGreaterThan(-1);
    expect(winRate).toBeGreaterThan(wins);
    expect(points).toBeGreaterThan(winRate);
    expect(aces).toBeGreaterThan(points);
    expect(attacks).toBeGreaterThan(aces);
    expect(migration).toContain("from public.public_rankings");
    expect(migration).toContain("security_invoker = true");
  });
});
