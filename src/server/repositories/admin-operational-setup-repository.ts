import { createClient } from "@/lib/supabase/server";

export async function fetchAdminOperationalSetupRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const [seasonsResult, cyclesResult, polesResult, venuesResult, courtsResult] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id,name,code,starts_at,ends_at,status")
        .order("starts_at", { ascending: false }),
      supabase
        .from("season_cycles")
        .select("id,season_id,cycle_number,name,starts_at,ends_at,status")
        .order("starts_at", { ascending: true }),
      supabase
        .from("poles")
        .select("id,name,slug,city,state,status")
        .order("name", { ascending: true }),
      supabase
        .from("venues")
        .select("id,pole_id,name,city,state,status")
        .order("name", { ascending: true }),
      supabase
        .from("courts")
        .select("id,venue_id,name,sport_type,status")
        .order("name", { ascending: true }),
    ]);

  const sources = [
    ["seasons", seasonsResult.error],
    ["season_cycles", cyclesResult.error],
    ["poles", polesResult.error],
    ["venues", venuesResult.error],
    ["courts", courtsResult.error],
  ] as const;
  for (const [source, error] of sources) {
    if (error) errors.push(`${source}: ${error.message}`);
  }

  return {
    seasons: seasonsResult.error ? null : (seasonsResult.data ?? []),
    cycles: cyclesResult.error ? null : (cyclesResult.data ?? []),
    poles: polesResult.error ? null : (polesResult.data ?? []),
    venues: venuesResult.error ? null : (venuesResult.data ?? []),
    courts: courtsResult.error ? null : (courtsResult.data ?? []),
    errors,
  };
}
