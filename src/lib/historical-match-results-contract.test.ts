import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const base = source(
  "supabase/migrations/20260813184500_historical_match_results_read_model.sql",
);
const hardening = source(
  "supabase/migrations/20260827003000_homologate_historical_match_results.sql",
);
const staging = source(
  "supabase/migrations/20260827003100_historical_import_nullable_dates.sql",
);
const athleteUi = source(
  "src/components/athlete/athlete-historical-results.tsx",
);

describe("historical match contract", () => {
  it("allows unknown dates", () => {
    expect(base).toContain("occurred_at timestamptz,");
    expect(hardening).toContain("PLACEHOLDER_DATE_FORBIDDEN");
    expect(hardening).toContain("date '2026-08-28'");
    expect(hardening).not.toContain("OCCURRED_AT_REQUIRED");
    expect(staging).toContain("v_occurred_at := null");
    expect(athleteUi).toContain("Data não registrada na fonte histórica");
  });

  it("imports idempotently", () => {
    expect(hardening).toContain("provenance text");
    expect(hardening).toContain("legacy_game_id");
    expect(hardening).toContain("admin_upsert_historical_match_result");
    expect(hardening).toContain(
      "on conflict (provenance, legacy_game_id) do update",
    );
    expect(hardening).toContain(
      "on conflict (historical_match_id, athlete_id) do update",
    );
  });

  it("limits athlete reads", () => {
    expect(hardening).toContain(
      "revoke select on public.historical_match_results from anon, authenticated",
    );
    expect(hardening).toContain(
      "revoke select on public.historical_match_participants from anon, authenticated",
    );
    expect(hardening).toContain("get_athlete_historical_match_results");
    expect(hardening).toContain("hmp.athlete_id = p_athlete_id");
    expect(athleteUi).toContain("requireAthleteViewer");
    expect(athleteUi).toContain("viewer.athleteId");
    expect(athleteUi).not.toContain("source_metadata");
    expect(athleteUi).not.toContain("source_ref");
  });

  it("keeps history isolated", () => {
    expect(hardening).not.toContain("insert into public.matches");
    expect(hardening).not.toContain("insert into public.ranking_transactions");
    expect(hardening).not.toContain("insert into public.ranking_entries");
    expect(hardening).not.toContain("insert into public.ur_coin_transactions");
    expect(athleteUi).toContain("automaticamente ranking ou UR Coins");
    expect(athleteUi).not.toContain("Jogos que construíram seu ranking");
  });
});
