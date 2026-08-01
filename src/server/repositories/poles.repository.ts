import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePoleInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export interface PoleSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: string;
}
export async function listPoles(
  client: SupabaseClient,
): Promise<readonly PoleSummary[]> {
  const { data, error } = await client
    .from("poles")
    .select("id,name,slug,city,state,status")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
export async function insertPole(
  client: SupabaseClient,
  input: CreatePoleInput,
): Promise<PoleSummary> {
  const { data, error } = await client
    .from("poles")
    .insert({
      name: input.name,
      slug: input.slug,
      city: input.city,
      state: input.state,
    })
    .select("id,name,slug,city,state,status")
    .single();
  return ensureData(data, error);
}
