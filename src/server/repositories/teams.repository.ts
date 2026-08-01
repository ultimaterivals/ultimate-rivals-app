import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTeamInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  status: string;
  primary_pole_id: string;
}
export async function listTeams(
  client: SupabaseClient,
): Promise<readonly TeamSummary[]> {
  const { data, error } = await client
    .from("teams")
    .select("id,name,slug,short_name,status,primary_pole_id")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
export async function insertTeam(
  client: SupabaseClient,
  input: CreateTeamInput,
): Promise<TeamSummary> {
  const { data, error } = await client
    .from("teams")
    .insert({
      name: input.name,
      slug: input.slug,
      short_name: input.shortName ?? null,
      primary_pole_id: input.primaryPoleId,
    })
    .select("id,name,slug,short_name,status,primary_pole_id")
    .single();
  return ensureData(data, error);
}
