import { createClient } from "@/lib/supabase/server";

export async function fetchAdminQuarterSeasonRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const [seasonsResult, weeksResult, cyclesResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id,name,code,starts_at,ends_at,status")
      .order("starts_at", { ascending: false }),
    supabase
      .from("season_weeks")
      .select(
        "id,season_id,week_number,name,phase,objective,primary_product,starts_at,ends_at,status",
      )
      .order("week_number", { ascending: true }),
    supabase
      .from("season_cycles")
      .select("id,season_id,cycle_number,name,starts_at,ends_at,status")
      .order("cycle_number", { ascending: true }),
  ]);

  const sources = [
    ["seasons", seasonsResult.error],
    ["season_weeks", weeksResult.error],
    ["season_cycles", cyclesResult.error],
  ] as const;
  for (const [source, error] of sources) {
    if (error) errors.push(`${source}: ${error.message}`);
  }

  return {
    seasons: seasonsResult.error ? [] : (seasonsResult.data ?? []),
    weeks: weeksResult.error ? [] : (weeksResult.data ?? []),
    cycles: cyclesResult.error ? [] : (cyclesResult.data ?? []),
    errors,
  };
}
