import type { SupabaseClient } from "@supabase/supabase-js";

export type AgendaOpportunity = {
  id: string;
  opportunity_type: string;
  computed_status: string;
  configured_status: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  pole_name: string | null;
  venue_name: string | null;
  level: string | null;
  format_code: string | null;
  category_code: string | null;
  target_formations: number;
  max_formations: number;
  capacity_athletes: number;
  court_count: number;
  interested_count: number;
  ready_formations: number;
  reserved_count: number;
  waitlist_count: number;
  remaining_capacity: number;
  interested_not_served: number;
  waitlisted_not_served: number;
  ready_formations_above_capacity: number;
  second_court_opportunity: boolean;
};

export type InterestListItem = {
  opportunity_id: string;
  athlete_id: string | null;
  display_name: string | null;
  athlete_code: string | null;
  avatar_public: string | null;
  level: string | null;
  primary_pole: string | null;
  team_name: string | null;
  interest_mode: string;
  status: string;
  aggregate_only: boolean;
};

export async function getCurrentAthleteId(client: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;
  const { data, error } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function listAgendaOpportunities(client: SupabaseClient) {
  const { data, error } = await client
    .from("athlete_agenda_opportunities")
    .select("*")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AgendaOpportunity[];
}

export async function listInterestList(
  client: SupabaseClient,
  opportunityIds: string[],
) {
  if (!opportunityIds.length) return [] as InterestListItem[];
  const { data, error } = await client
    .from("interest_list_sanitized")
    .select("*")
    .in("opportunity_id", opportunityIds);
  if (error) throw error;
  return (data ?? []) as InterestListItem[];
}

export async function listMyDemandActivity(
  client: SupabaseClient,
  athleteId: string | null,
) {
  if (!athleteId)
    return {
      interests: [] as { opportunity_id: string; status: string }[],
      reservations: [] as { opportunity_id: string; status: string }[],
    };
  const [interests, reservations] = await Promise.all([
    client
      .from("session_interests")
      .select("opportunity_id,status")
      .eq("athlete_id", athleteId),
    client
      .from("activity_reservations")
      .select("opportunity_id,status")
      .eq("athlete_id", athleteId),
  ]);
  if (interests.error) throw interests.error;
  if (reservations.error) throw reservations.error;
  return {
    interests: interests.data ?? [],
    reservations: reservations.data ?? [],
  };
}

export async function listTrainingInterestWindows(client: SupabaseClient) {
  const { data, error } = await client
    .from("training_interest_windows")
    .select("*,poles(name)")
    .order("day_of_week")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminDemand(client: SupabaseClient) {
  const { data, error } = await client
    .from("admin_demand_dashboard")
    .select("*")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminAcquisition(client: SupabaseClient) {
  const { data, error } = await client
    .from("admin_acquisition_dashboard")
    .select("*")
    .order("visitors", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAthleteEngagement(
  client: SupabaseClient,
  athleteId: string,
) {
  const { data, error } = await client
    .from("admin_athlete_engagement")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
