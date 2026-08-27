import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const historicalHelper = source(
  "supabase/migrations/20260813090000_add_historical_ranking_event_helper.sql",
);
const hardening = source(
  "supabase/migrations/20260827082000_harden_individual_ranking_bootstrap.sql",
);

const FINAL_SOURCE = "UR_Rankings_Oficiais_Apos_UR_Play_28-08_FINAL.xlsx";

type FinalRankingRow = [
  position: number,
  athlete: string,
  games: number,
  wins: number,
  losses: number,
  aces: number,
  attacks: number,
  totalPoints: number,
];

const finalRanking: FinalRankingRow[] = [
  [1, "Driely", 22, 19, 3, 24, 49, 330],
  [2, "Juliana", 22, 19, 3, 23, 34, 296],
  [3, "Kim", 22, 11, 11, 22, 28, 248],
  [4, "Poly", 22, 11, 11, 16, 30, 228],
  [5, "Thalita", 13, 7, 6, 7, 15, 120],
  [6, "Thay", 10, 6, 4, 14, 15, 138],
  [7, "Silvana", 10, 6, 4, 6, 16, 108],
  [8, "Lilian", 13, 6, 7, 12, 26, 166],
  [9, "Priscila", 13, 6, 7, 9, 19, 140],
  [10, "Lara", 13, 6, 7, 10, 13, 132],
  [11, "Val", 16, 6, 10, 16, 25, 186],
  [12, "Eliene", 18, 6, 12, 8, 29, 166],
  [13, "Jaque", 8, 5, 3, 8, 19, 114],
  [14, "Thaís", 13, 5, 8, 11, 21, 140],
  [15, "Carolina", 13, 5, 8, 5, 22, 118],
  [16, "Naty", 6, 4, 2, 2, 4, 52],
  [17, "Kesia", 9, 4, 5, 7, 22, 114],
  [18, "Fany", 9, 4, 5, 5, 16, 94],
  [19, "Nina", 9, 4, 5, 5, 13, 88],
  [20, "Manu", 4, 2, 2, 4, 5, 50],
  [21, "Luana", 4, 2, 2, 2, 4, 40],
  [22, "Stephani", 6, 2, 4, 8, 5, 70],
  [23, "Day", 6, 2, 4, 3, 6, 52],
  [24, "Carol", 4, 1, 3, 2, 4, 36],
  [25, "Esther", 5, 1, 4, 2, 8, 46],
  [26, "Michele", 5, 0, 5, 5, 2, 42],
  [27, "Viviane", 5, 0, 5, 0, 3, 24],
];

function winRate(row: FinalRankingRow) {
  return row[2] > 0 ? row[3] / row[2] : 0;
}

function compareOfficial(a: FinalRankingRow, b: FinalRankingRow) {
  return (
    b[3] - a[3] ||
    winRate(b) - winRate(a) ||
    b[7] - a[7] ||
    b[5] - a[5] ||
    b[6] - a[6] ||
    a[1].localeCompare(b[1], "pt-BR")
  );
}

describe("official individual ranking contract", () => {
  it("keeps historical scoring in the canonical transaction ledger", () => {
    expect(historicalHelper).toContain("insert into public.ranking_transactions");
    expect(historicalHelper).not.toContain("insert into public.ranking_entries");
    expect(historicalHelper).toContain("on conflict do nothing");
    expect(historicalHelper).toContain("'historical_import'");

    expect(hardening).toContain("('PARTICIPATION'::text, 8)");
    expect(hardening).toContain("('WIN'::text, 6)");
    expect(hardening).toContain("('LOSS'::text, 2)");
    expect(hardening).toContain("('ACE'::text, 4)");
    expect(hardening).toContain("('ATTACK'::text, 2)");
  });

  it("locks the official deterministic ordering", () => {
    expect(hardening).toContain("re.wins desc");
    expect(hardening).toContain("re.total_points desc");
    expect(hardening).toContain("re.aces desc");
    expect(hardening).toContain("re.attacks desc");
    expect(hardening).toContain("re.reached_score_at asc nulls last");
    expect(hardening).toContain("re.entity_id asc");
  });

  it("suppresses athlete movement notifications during historical bootstrap", () => {
    expect(hardening).toContain("app.suppress_ranking_notifications");
    expect(hardening).toContain("current_setting");
    expect(hardening).toContain("new.metadata ->> 'origin'");
    expect(hardening).toContain("'historical_import'");
    expect(hardening).toContain("private.refresh_all_rankings(target_season)");
  });

  it(`reconciles all 27 athletes with ${FINAL_SOURCE}`, () => {
    expect(finalRanking).toHaveLength(27);
    expect(finalRanking.reduce((sum, row) => sum + row[5], 0)).toBe(236);
    expect(finalRanking.reduce((sum, row) => sum + row[6], 0)).toBe(453);

    let participationEvents = 0;
    for (const row of finalRanking) {
      const [, , games, wins, losses, aces, attacks, totalPoints] = row;
      expect(games).toBe(wins + losses);

      const nonParticipationPoints =
        wins * 6 + losses * 2 + aces * 4 + attacks * 2;
      const participationPoints = totalPoints - nonParticipationPoints;

      expect(participationPoints).toBeGreaterThan(0);
      expect(participationPoints % 8).toBe(0);
      participationEvents += participationPoints / 8;
    }

    expect(participationEvents).toBe(36);

    const sorted = [...finalRanking].sort(compareOfficial);
    expect(sorted.map((row) => row[1])).toEqual(
      finalRanking.map((row) => row[1]),
    );
    expect(sorted.map((row) => row[0])).toEqual(
      Array.from({ length: 27 }, (_, index) => index + 1),
    );
  });
});
