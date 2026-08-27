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

type FinalRankingRow = {
  position: number;
  athlete: string;
  games: number;
  wins: number;
  losses: number;
  aces: number;
  attacks: number;
  totalPoints: number;
};

const finalRanking: FinalRankingRow[] = [
  { position: 1, athlete: "Driely", games: 22, wins: 19, losses: 3, aces: 24, attacks: 49, totalPoints: 330 },
  { position: 2, athlete: "Juliana", games: 22, wins: 19, losses: 3, aces: 23, attacks: 34, totalPoints: 296 },
  { position: 3, athlete: "Kim", games: 22, wins: 11, losses: 11, aces: 22, attacks: 28, totalPoints: 248 },
  { position: 4, athlete: "Poly", games: 22, wins: 11, losses: 11, aces: 16, attacks: 30, totalPoints: 228 },
  { position: 5, athlete: "Thalita", games: 13, wins: 7, losses: 6, aces: 7, attacks: 15, totalPoints: 120 },
  { position: 6, athlete: "Thay", games: 10, wins: 6, losses: 4, aces: 14, attacks: 15, totalPoints: 138 },
  { position: 7, athlete: "Silvana", games: 10, wins: 6, losses: 4, aces: 6, attacks: 16, totalPoints: 108 },
  { position: 8, athlete: "Lilian", games: 13, wins: 6, losses: 7, aces: 12, attacks: 26, totalPoints: 166 },
  { position: 9, athlete: "Priscila", games: 13, wins: 6, losses: 7, aces: 9, attacks: 19, totalPoints: 140 },
  { position: 10, athlete: "Lara", games: 13, wins: 6, losses: 7, aces: 10, attacks: 13, totalPoints: 132 },
  { position: 11, athlete: "Val", games: 16, wins: 6, losses: 10, aces: 16, attacks: 25, totalPoints: 186 },
  { position: 12, athlete: "Eliene", games: 18, wins: 6, losses: 12, aces: 8, attacks: 29, totalPoints: 166 },
  { position: 13, athlete: "Jaque", games: 8, wins: 5, losses: 3, aces: 8, attacks: 19, totalPoints: 114 },
  { position: 14, athlete: "Thaís", games: 13, wins: 5, losses: 8, aces: 11, attacks: 21, totalPoints: 140 },
  { position: 15, athlete: "Carolina", games: 13, wins: 5, losses: 8, aces: 5, attacks: 22, totalPoints: 118 },
  { position: 16, athlete: "Naty", games: 6, wins: 4, losses: 2, aces: 2, attacks: 4, totalPoints: 52 },
  { position: 17, athlete: "Kesia", games: 9, wins: 4, losses: 5, aces: 7, attacks: 22, totalPoints: 114 },
  { position: 18, athlete: "Fany", games: 9, wins: 4, losses: 5, aces: 5, attacks: 16, totalPoints: 94 },
  { position: 19, athlete: "Nina", games: 9, wins: 4, losses: 5, aces: 5, attacks: 13, totalPoints: 88 },
  { position: 20, athlete: "Manu", games: 4, wins: 2, losses: 2, aces: 4, attacks: 5, totalPoints: 50 },
  { position: 21, athlete: "Luana", games: 4, wins: 2, losses: 2, aces: 2, attacks: 4, totalPoints: 40 },
  { position: 22, athlete: "Stephani", games: 6, wins: 2, losses: 4, aces: 8, attacks: 5, totalPoints: 70 },
  { position: 23, athlete: "Day", games: 6, wins: 2, losses: 4, aces: 3, attacks: 6, totalPoints: 52 },
  { position: 24, athlete: "Carol", games: 4, wins: 1, losses: 3, aces: 2, attacks: 4, totalPoints: 36 },
  { position: 25, athlete: "Esther", games: 5, wins: 1, losses: 4, aces: 2, attacks: 8, totalPoints: 46 },
  { position: 26, athlete: "Michele", games: 5, wins: 0, losses: 5, aces: 5, attacks: 2, totalPoints: 42 },
  { position: 27, athlete: "Viviane", games: 5, wins: 0, losses: 5, aces: 0, attacks: 3, totalPoints: 24 },
];

function winRate(row: FinalRankingRow) {
  return row.games > 0 ? row.wins / row.games : 0;
}

function compareOfficial(a: FinalRankingRow, b: FinalRankingRow) {
  return (
    b.wins - a.wins ||
    winRate(b) - winRate(a) ||
    b.totalPoints - a.totalPoints ||
    b.aces - a.aces ||
    b.attacks - a.attacks ||
    a.athlete.localeCompare(b.athlete, "pt-BR")
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

  it("suppresses athlete movement notifications only during a historical bootstrap refresh", () => {
    expect(hardening).toContain("app.suppress_ranking_notifications");
    expect(hardening).toContain("current_setting");
    expect(hardening).toContain("new.metadata ->> 'origin'");
    expect(hardening).toContain("'historical_import'");
    expect(hardening).toContain("private.refresh_all_rankings(target_season)");
  });

  it(`reconciles all 27 athletes with ${FINAL_SOURCE}`, () => {
    expect(finalRanking).toHaveLength(27);
    expect(finalRanking.reduce((sum, row) => sum + row.aces, 0)).toBe(236);
    expect(finalRanking.reduce((sum, row) => sum + row.attacks, 0)).toBe(453);

    let participationEvents = 0;
    for (const row of finalRanking) {
      expect(row.games).toBe(row.wins + row.losses);

      const nonParticipationPoints =
        row.wins * 6 + row.losses * 2 + row.aces * 4 + row.attacks * 2;
      const participationPoints = row.totalPoints - nonParticipationPoints;

      expect(participationPoints).toBeGreaterThan(0);
      expect(participationPoints % 8).toBe(0);
      participationEvents += participationPoints / 8;
    }

    expect(participationEvents).toBe(36);

    const sorted = [...finalRanking].sort(compareOfficial);
    expect(sorted.map((row) => row.athlete)).toEqual(
      finalRanking.map((row) => row.athlete),
    );
    expect(sorted.map((row) => row.position)).toEqual(
      Array.from({ length: 27 }, (_, index) => index + 1),
    );
  });
});
