import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813072000_competition_formations_and_official_doubles_ranking.sql",
  ),
  "utf8",
);

describe("official doubles ranking model", () => {
  it("keeps doubles independent from fake teams and sourced from the canonical ledger", () => {
    expect(migration).toContain("create table public.competition_formations");
    expect(migration).toContain(
      "create table public.competition_formation_members",
    );
    expect(migration).toContain("add column formation_id uuid");
    expect(migration).toContain("transaction_scope = 'side'");
    expect(migration).toContain(
      "new.rule_code not in ('WIN', 'LOSS', 'ACE', 'ATTACK')",
    );
    expect(migration).toContain("fmt.code = 'doubles'");
    expect(migration).toContain("p.total_points, 0, p.result_points");
    expect(migration).not.toContain("PARTICIPATION', 'WIN");
  });

  it("orders doubles by wins, win rate, points, aces and attacks", () => {
    const order = [
      "ar.wins desc",
      "ar.wins::numeric / (ar.wins + ar.losses)",
      "ar.total_points desc",
      "ar.aces desc",
      "ar.attacks desc",
    ];

    let cursor = -1;
    for (const token of order) {
      const next = migration.indexOf(token, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });
});
