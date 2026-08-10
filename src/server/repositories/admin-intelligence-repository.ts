import { createClient } from "@/lib/supabase/server";

export type RawAcquisitionSource = {
  source: string;
  visitors: number | null;
  signups: number | null;
  interests: number | null;
  reservations: number | null;
  first_participation: number | null;
  second_participation: number | null;
  returning: number | null;
};
export type RawEngagement = {
  athlete_id: string;
  first_participation_at: string | null;
  second_participation_at: string | null;
  active_30d: boolean | null;
  days_since_last_participation: number | null;
};
export type RawDemand = {
  id: string;
  title: string;
  pole_name: string | null;
  demand_signal: string | null;
  interested_count: number | null;
  ready_formations: number | null;
  target_formations: number;
  waitlist_count: number | null;
};

export async function fetchAdminIntelligenceRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [acquisitionResult, engagementResult, demandResult] = await Promise.all(
    [
      supabase
        .from("admin_acquisition_dashboard")
        .select(
          "source,visitors,signups,interests,reservations,first_participation,second_participation,returning",
        )
        .order("signups", { ascending: false }),
      supabase
        .from("admin_athlete_engagement")
        .select(
          "athlete_id,first_participation_at,second_participation_at,active_30d,days_since_last_participation",
        )
        .limit(5000),
      supabase
        .from("admin_demand_dashboard")
        .select(
          "id,title,pole_name,demand_signal,interested_count,ready_formations,target_formations,waitlist_count",
        )
        .limit(500),
    ],
  );
  const results = [
    ["admin_acquisition_dashboard", acquisitionResult.error],
    ["admin_athlete_engagement", engagementResult.error],
    ["admin_demand_dashboard", demandResult.error],
  ] as const;
  for (const [source, error] of results)
    if (error) errors.push(`${source}: ${error.message}`);
  return {
    acquisition: acquisitionResult.error
      ? null
      : ((acquisitionResult.data as RawAcquisitionSource[] | null) ?? []),
    engagement: engagementResult.error
      ? null
      : ((engagementResult.data as RawEngagement[] | null) ?? []),
    demand: demandResult.error
      ? null
      : ((demandResult.data as RawDemand[] | null) ?? []),
    errors,
  };
}
