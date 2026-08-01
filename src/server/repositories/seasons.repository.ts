import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateSeasonInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export interface SeasonSummary {
  id: string;
  name: string;
  code: string;
  starts_at: string;
  ends_at: string;
  status: string;
}
export async function listSeasons(
  client: SupabaseClient,
): Promise<readonly SeasonSummary[]> {
  const { data, error } = await client
    .from("seasons")
    .select("id,name,code,starts_at,ends_at,status")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function insertSeason(
  client: SupabaseClient,
  input: CreateSeasonInput,
): Promise<SeasonSummary> {
  const { data, error } = await client
    .from("seasons")
    .insert({
      name: input.name,
      code: input.code,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      ranking_cutoff_at: input.rankingCutoffAt ?? null,
    })
    .select("id,name,code,starts_at,ends_at,status")
    .single();
  return ensureData(data, error);
}
