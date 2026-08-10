import { createClient } from "@/lib/supabase/server";

export type EcosystemEvidenceKey =
  | "seasons"
  | "products"
  | "acquisition"
  | "audit"
  | "urPlay"
  | "leveling"
  | "ranking"
  | "teams"
  | "training"
  | "competitions"
  | "coins"
  | "market"
  | "sponsors"
  | "media"
  | "finance"
  | "venues"
  | "staff"
  | "checklists";

export type EcosystemEvidence = Record<EcosystemEvidenceKey, number | null>;

export async function fetchAdminEcosystemEvidence(): Promise<{
  evidence: EcosystemEvidence;
  errors: string[];
}> {
  const supabase = await createClient();
  const errors: string[] = [];

  const sources: readonly [EcosystemEvidenceKey, string][] = [
    ["seasons", "seasons"],
    ["products", "products"],
    ["acquisition", "acquisition_events"],
    ["audit", "audit_logs"],
    ["urPlay", "ur_play_sessions"],
    ["leveling", "athlete_leveling_processes"],
    ["ranking", "ranking_snapshots"],
    ["teams", "teams"],
    ["training", "training_sessions"],
    ["competitions", "tournaments"],
    ["coins", "ur_coin_transactions"],
    ["market", "market_offers"],
    ["sponsors", "sponsors"],
    ["media", "media_assets"],
    ["finance", "event_financial_summaries"],
    ["venues", "venues"],
    ["staff", "staff_profile_roles"],
    ["checklists", "event_checklists"],
  ];

  const results = await Promise.all(
    sources.map(async ([key, table]) => {
      const result = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      return { key, table, count: result.count, error: result.error };
    }),
  );

  const evidence = Object.fromEntries(
    sources.map(([key]) => [key, null]),
  ) as EcosystemEvidence;

  for (const result of results) {
    if (result.error) {
      errors.push(`${result.table}: ${result.error.message}`);
      evidence[result.key] = null;
    } else {
      evidence[result.key] = result.count ?? 0;
    }
  }

  return { evidence, errors };
}
