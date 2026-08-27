import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("historical match results contract", () => {
  const baseMigration = source(
    "supabase/migrations/20260813184500_historical_match_results_read_model.sql",
  );
  const hardeningMigration = source(
    "supabase/migrations/20260827003000_homologate_historical_match_results.sql",
  );
  const stagingMigration = source(
    "supabase/migrations/20260827003100_historical_import_nullable_dates.sql",
  );
  const historicalResults = source(
    "src/components/athlete/athlete-historical-results.tsx",
  );

  it("keeps unknown historical dates nullable and rejects the 28/08 placeholder", () => {
    expect(baseMigration).toContain("occurred_at timestamptz,");
    expect(hardeningMigration).toContain("PLACEHOLDER_DATE_FORBIDDEN");
    expect(hardeningMigration).toContain("date '2026-08-28'");
    expect(hardeningMigration).not.toContain("OCCURRED_AT_REQUIRED");
    expect(stagingMigration).toContain("v_occurred_at := null");
    expect(stagingMigration).toContain("PLACEHOLDER_DATE_FORBIDDEN");
    expect(historicalResults).toContain(
      "Data não registrada na fonte histórica",
    );
  });

  it("uses provenance plus legacy game identity for idempotent final import", () => {
    expect(hardeningMigration).toContain("provenance text");
    expect(hardeningMigration).toContain(
      "historical_match_results_provenance_legacy_idx",
    );
    expect(hardeningMigration).toContain("legacy_game_id");
    expect(hardeningMigration).toContain(
      "admin_upsert_historical_match_result",
    );
    expect(hardeningMigration).toContain(
      "on conflict (provenance, legacy_game_id) do update",
    );
    expect(hardeningMigration).toContain(
      "on conflict (historical_match_id, athlete_id) do update",
    );
  });

  it("exposes only the athlete safe read model and only participated matches", () => {
    expect(hardeningMigration).toContain(
      "revoke select on public.historical_match_results from anon, authenticated",
    );
    expect(hardeningMigration).toContain(
      "revoke select on public.historical_match_participants from anon, authenticated",
    );
    expect(hardeningMigration).toContain(
      "get_athlete_historical_match_results",
    );
    expect(hardeningMigration).toContain("hmp.athlete_id = p_athlete_id");
    expect(hardeningMigration).not.toMatch(
      /returns table \([^)]*source_metadata/is,
    );
    expect(hardeningMigration).not.toMatch(
      /returns table \([^)]*created_at/is,
    );

    expect(historicalResults).toContain("requireAthleteViewer");
    expect(historicalResults).toContain("viewer.athleteId");
    expect(historicalResults).toContain(
      '"get_athlete_historical_match_results"',
    );
    expect(historicalResults).not.toContain(
      '.from("historical_match_results")',
    );
    expect(historicalResults).not.toContain("source_metadata");
    expect(historicalResults).not.toContain("source_ref");
  });

  it("keeps the historical projection inert until an explicit downstream flow", () => {
    expect(hardeningMigration).not.toMatch(/insert into public\.matches\b/i);
    expect(hardeningMigration).not.toMatch(
      /insert into public\.ranking_transactions\b/i,
    );
    expect(hardeningMigration).not.toMatch(
      /insert into public\.ranking_entries\b/i,
    );
    expect(hardeningMigration).not.toMatch(
      /insert into public\.ur_coin_transactions\b/i,
    );
    expect(historicalResults).toContain("automaticamente ranking ou UR Coins");
    expect(historicalResults).not.toContain(
      "Jogos que construíram seu ranking",
    );
  });
});
