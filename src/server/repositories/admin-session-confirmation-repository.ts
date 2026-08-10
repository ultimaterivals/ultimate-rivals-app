import { createClient } from "@/lib/supabase/server";

export type RawPendingOpportunity = {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string;
  venue_id: string | null;
  court_id: string | null;
  level: string | null;
  format_code: string | null;
  category_code: string | null;
  min_formations: number;
  target_formations: number;
  capacity_athletes: number;
};

export type RawDemandMetrics = {
  id: string;
  interested_count: number | null;
  ready_formations: number | null;
};

export async function fetchAdminSessionConfirmationRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const [opportunitiesResult, demandResult] = await Promise.all([
    supabase
      .from("demand_opportunities")
      .select(
        "id,title,status,starts_at,ends_at,pole_id,venue_id,court_id,level,format_code,category_code,min_formations,target_formations,capacity_athletes",
      )
      .eq("opportunity_type", "ur_play")
      .in("status", ["collecting_interest", "forming", "almost_full"])
      .is("ur_play_session_id", null)
      .is("calendar_event_id", null)
      .not("starts_at", "is", null)
      .order("starts_at", { ascending: true })
      .limit(100),
    supabase
      .from("admin_demand_dashboard")
      .select("id,interested_count,ready_formations")
      .limit(500),
  ]);

  if (opportunitiesResult.error) {
    errors.push(`demand_opportunities: ${opportunitiesResult.error.message}`);
  }
  if (demandResult.error) {
    errors.push(`admin_demand_dashboard: ${demandResult.error.message}`);
  }

  return {
    opportunities: opportunitiesResult.error
      ? null
      : ((opportunitiesResult.data as RawPendingOpportunity[] | null) ?? []),
    demand: demandResult.error
      ? null
      : ((demandResult.data as RawDemandMetrics[] | null) ?? []),
    errors,
  };
}
