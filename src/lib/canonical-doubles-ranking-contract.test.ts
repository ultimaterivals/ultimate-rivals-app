import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260827103000_harden_canonical_doubles_ranking.sql",
  ),
  "utf8",
);

const page = readFileSync(
  resolve(process.cwd(), "src/app/athlete/ranking/page.tsx"),
  "utf8",
);

const finalPairs = [
  "Driely e Juliana",
  "Kim e Poly",
  "Silvana e Thay",
  "Lara e Priscila",
  "Lilian e Jaque",
  "Carolina e Thaís",
  "Naty e Thalita",
  "Nina e Val",
  "Fany e Kesia",
  "Eliene e Thalita",
  "Luana e Manu",
  "Day e Stephani",
  "Eliene e Val",
  "Carol e Eliene",
  "Esther e Lilian",
  "Michele e Viviane",
];

describe("canonical doubles ranking", () => {
  it("uses athlete ids as formation identity", () => {
    expect(sql).toContain("p_athlete_one_id uuid");
    expect(sql).toContain("p_athlete_two_id uuid");
    expect(sql).toContain("p_team_id uuid default null");
    expect(sql).toContain("v_signature := md5(v_first::text");
    expect(sql).not.toMatch(/insert into public\.teams/i);
  });

  it("keeps side results and technical retries idempotent", () => {
    expect(sql).toContain("new.rule_code in ('WIN', 'LOSS')");
    expect(sql).toContain("tx.match_side_id = new.match_side_id");
    expect(sql).toContain("tx.source_id = new.source_id");
    expect(sql).toContain("v_existing_side_transaction");
    expect(sql).toContain("on conflict do nothing");
  });

  it("reconciles the FINAL doubles ranking", () => {
    expect(finalPairs).toHaveLength(16);
    for (const pair of finalPairs) {
      expect(sql).toContain(pair);
    }
    expect(sql).toContain("fs.wins * 6 + fs.losses * 2");
    expect(sql).toContain("fs.aces * 4 + fs.attacks * 2");
    expect(sql).toContain("FINAL_DOUBLES_RANKING_RECONCILIATION_FAILED");
  });

  it("exposes formations as doubles in the Athlete App", () => {
    expect(page).toContain('["doubles", "Duplas"]');
    expect(page).toContain('"Ranking de duplas"');
    expect(page).toContain('"Formações oficiais · Duplas"');
    expect(page).not.toContain("Equipe da dupla");
  });
});
