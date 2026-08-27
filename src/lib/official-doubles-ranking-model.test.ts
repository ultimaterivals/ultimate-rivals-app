import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813072000_competition_formations_and_official_doubles_ranking.sql",
  ),
  "utf8",
);
const hardeningMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260827103000_harden_canonical_doubles_ranking.sql",
  ),
  "utf8",
);
const athleteRankingPage = readFileSync(
  resolve(process.cwd(), "src/app/athlete/ranking/page.tsx"),
  "utf8",
);

const finalRows = [
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

describe("official doubles ranking model", () => {
  it("keeps doubles as canonical formations independent from teams", () => {
    expect(baseMigration).toContain("create table public.competition_formations");
    expect(baseMigration).toContain(
      "create table public.competition_formation_members",
    );
    expect(baseMigration).toContain("team_id uuid references public.teams");
    expect(baseMigration).not.toContain("team_id uuid not null");
    expect(baseMigration).toContain("add column formation_id uuid");
    expect(baseMigration).toContain("transaction_scope = 'side'");
    expect(baseMigration).toContain("fmt.code = 'doubles'");
    expect(baseMigration).toContain("p.total_points, 0, p.result_points");
  });

  it("uses athlete ids rather than display names as pair identity", () => {
    expect(baseMigration).toContain(
      "md5(string_agg(mp.athlete_id::text, ',' order by mp.athlete_id::text))",
    );
    expect(hardeningMigration).toContain(
      "v_signature := md5(v_first::text || ',' || v_second::text)",
    );
    expect(hardeningMigration).toContain("p_team_id uuid default null");
    expect(hardeningMigration).not.toMatch(/md5\([^\n]*p_display_name/);
    expect(hardeningMigration).not.toMatch(/insert into public\.teams/i);
  });

  it("never converts individual participation into doubles points", () => {
    expect(hardeningMigration).toContain(
      "new.rule_code not in ('WIN', 'LOSS', 'ACE', 'ATTACK')",
    );
    expect(hardeningMigration).not.toContain("'PARTICIPATION'\n");
    expect(baseMigration).toContain("participation_points");
    expect(baseMigration).toContain("p.total_points, 0, p.result_points");
  });

  it("collapses result events to one WIN or LOSS per match side and keeps technical retries idempotent", () => {
    expect(hardeningMigration).toContain("new.rule_code in ('WIN', 'LOSS')");
    expect(hardeningMigration).toContain("tx.match_id = new.match_id");
    expect(hardeningMigration).toContain("tx.match_side_id = new.match_side_id");
    expect(hardeningMigration).toContain(
      "tx.transaction_type = new.transaction_type",
    );
    expect(hardeningMigration).toContain("tx.source_id = new.source_id");
    expect(hardeningMigration).toContain(
      "if v_existing_side_transaction is not null then",
    );
    expect(hardeningMigration).toContain("on conflict do nothing");
  });

  it("reproduces every doubles row from the FINAL source", () => {
    expect(finalRows).toHaveLength(16);
    for (const pair of finalRows) {
      expect(hardeningMigration).toContain(`'${pair}'`);
    }
    expect(hardeningMigration).toContain(
      "fs.wins * 6 + fs.losses * 2 + fs.aces * 4 + fs.attacks * 2",
    );
    expect(hardeningMigration).toContain(
      "FINAL_DOUBLES_RANKING_RECONCILIATION_FAILED",
    );
  });

  it("orders doubles by wins, win rate, points, aces, attacks and deterministic ties", () => {
    const order = [
      "ar.wins desc",
      "ar.wins::numeric / (ar.wins + ar.losses)",
      "ar.total_points desc",
      "ar.aces desc",
      "ar.attacks desc",
      "ar.reached_score_at",
      "ar.entity_id",
    ];

    let cursor = -1;
    for (const token of order) {
      const next = baseMigration.indexOf(token, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it("exposes doubles in the Athlete App without calling them teams", () => {
    expect(athleteRankingPage).toContain('["doubles", "Duplas"]');
    expect(athleteRankingPage).toContain('"Ranking de duplas"');
    expect(athleteRankingPage).toContain('"Formações oficiais · Duplas"');
    expect(athleteRankingPage).toContain('.eq("ranking_type", tab)');
    expect(athleteRankingPage).not.toContain("Equipe da dupla");
    expect(athleteRankingPage).not.toContain("Time da dupla");
  });
});
