import { createClient } from "@/lib/supabase/server";

export type RawSponsorOperation = {
  sponsor_id: string;
  name: string;
  brand_name: string | null;
  category: string | null;
  status: string;
  agreements: number | null;
  active_cash_value: number | string | null;
  planned_deliveries: number | null;
  delivered_items: number | null;
};

export type RawVenueOperation = {
  venue_id: string;
  venue_name: string;
  pole_name: string | null;
  partnership_status: string;
  billing_model: string | null;
  hourly_rate: number | string | null;
  revenue_share_percent: number | string | null;
  court_count: number | null;
  available_windows: number | null;
  active_events: number | null;
  verified_revenue: number | string | null;
  verified_expense: number | string | null;
  verified_margin: number | string | null;
};

export async function fetchAdminCommercialRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [sponsorsResult, venuesResult] = await Promise.all([
    supabase
      .from("admin_sponsor_operations")
      .select(
        "sponsor_id,name,brand_name,category,status,agreements,active_cash_value,planned_deliveries,delivered_items",
      )
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("admin_venue_partner_operations")
      .select(
        "venue_id,venue_name,pole_name,partnership_status,billing_model,hourly_rate,revenue_share_percent,court_count,available_windows,active_events,verified_revenue,verified_expense,verified_margin",
      )
      .order("venue_name", { ascending: true })
      .limit(500),
  ]);

  if (sponsorsResult.error)
    errors.push(`admin_sponsor_operations: ${sponsorsResult.error.message}`);
  if (venuesResult.error)
    errors.push(
      `admin_venue_partner_operations: ${venuesResult.error.message}`,
    );

  return {
    sponsors: sponsorsResult.error
      ? null
      : ((sponsorsResult.data as RawSponsorOperation[] | null) ?? []),
    venues: venuesResult.error
      ? null
      : ((venuesResult.data as RawVenueOperation[] | null) ?? []),
    errors,
  };
}
