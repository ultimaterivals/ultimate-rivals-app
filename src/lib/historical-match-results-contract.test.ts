import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function returnedTable(sql: string) {
  const match = sql.match(/returns table\s*\(([\s\S]*?)\)\s*language/i);
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
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
const safeRead = source(
  "supabase/migrations/20260827065000_harden_historical_athlete_read_model.sql",
);
const athleteUi = source(
  "src/components/athlete/athlete-historical-results.tsx",
);

describe("historical match results contract", () => {
  it("keeps unknown historical dates nullable and rejects the 28/08 placeholder", () => {
    expect(base).toContain("occurred_at timestamptz,");
    expect(hardening).toContain("PLACEHOLDER_DATE_FORBIDDEN");
    expect(hardening).toContain("date '2026-08-28'");
    expect(hardening).not.toContain("OCCURRED_AT_REQUIRED");
    expect(staging).toContain("v_occurred_at := null");
    expect(staging).toContain("PLACEHOLDER_DATE_FORBIDDEN");
    expect(safeRead).toContain("occurred_at timestamptz");
    expect(athleteUi).toContain("Data não registrada na fonte histórica");
  });

  it("uses provenance plus legacy game identity for idempotent final import", () => {
    expect(hardening).toContain("provenance text");
    expect(hardening).toContain(
      "historical_match_results_provenance_legacy_idx",
    );
    expect(hardening).toContain("legacy_game_id");
    expect(hardening).toContain("admin_upsert_historical_match_result");
    expect(hardening).toContain(
      "on conflict (provenance, legacy_game_id) do update",
    );
    expect(hardening).toContain(
      "on conflict (historical_match_id, athlete_id) do update",
    );
  });

  it("exposes only the safe read model and only participated matches", () => {
    expect(safeRead).toContain(
      "revoke select on public.historical_match_results from anon, authenticated",
    );
    expect(safeRead).toContain(
      "revoke select on public.historical_match_participants from anon, authenticated",
    );
    expect(safeRead).toContain(
      "revoke insert, update, delete on public.historical_match_results from anon, authenticated",
    );
    expect(safeRead).toContain(
      "revoke insert, update, delete on public.historical_match_participants from anon, authenticated",
    );
    expect(safeRead).toContain("get_athlete_historical_match_results");
    expect(safeRead).toContain("a.profile_id = v_user_id");
    expect(safeRead).toContain("hmp.athlete_id = p_athlete_id");

    const safeShape = returnedTable(safeRead);
    expect(safeShape).toContain("legacy_game_id integer");
    expect(safeShape).toContain("occurred_at timestamptz");
    expect(safeShape).not.toMatch(
      /provenance|source_ref|source_metadata|created_at|season_id|time_label/i,
    );

    expect(athleteUi).toContain("requireAthleteViewer");
    expect(athleteUi).toContain("viewer.athleteId");
    expect(athleteUi).toContain('"get_athlete_historical_match_results"');
    expect(athleteUi).not.toContain('.from("historical_match_results")');
    expect(athleteUi).not.toMatch(
      /provenance|source_ref|source_metadata|created_at|season_id|time_label/i,
    );
  });

  it("keeps the historical projection inert until an explicit downstream flow", () => {
    const isolatedSql = `${hardening}\n${safeRead}`;

    expect(isolatedSql).not.toMatch(/insert into public\.matches\b/i);
    expect(isolatedSql).not.toMatch(
      /insert into public\.ranking_transactions\b/i,
    );
    expect(isolatedSql).not.toMatch(/insert into public\.ranking_entries\b/i);
    expect(isolatedSql).not.toMatch(
      /insert into public\.ur_coin_transactions\b/i,
    );
    expect(athleteUi).toContain("automaticamente ranking ou UR Coins");
    expect(athleteUi).not.toContain("Jogos que construíram seu ranking");
  });
});
