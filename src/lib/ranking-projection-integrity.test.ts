import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813061500_normalize_ranking_games_played.sql",
  ),
  "utf8",
);

describe("ranking projection integrity", () => {
  it("counts homologated outcomes as games while participation stays session-scoped", () => {
    expect(migration).toContain("new.wins, 0) + coalesce(new.losses, 0)");
    expect(migration).toContain("before insert on public.ranking_entries");
    expect(migration).not.toContain("ur_coin_transactions");
  });
});
