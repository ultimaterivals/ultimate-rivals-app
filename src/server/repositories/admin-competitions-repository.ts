import { createClient } from "@/lib/supabase/server";

export type RawTournament = {
  id: string;
  product: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string | null;
  venue_id: string | null;
  calendar_event_id: string | null;
};
export type RawDivision = { id: string; tournament_id: string; status: string };
export type RawRegistration = {
  division_id: string;
  status: string;
  eligibility_status: string;
};
export type RawTournamentMatch = {
  id: string;
  division_id: string;
  match_id: string | null;
};
export type RawStaff = { tournament_id: string; status: string };
export type RawPrizePlan = {
  id: string;
  tournament_id: string;
  status: string;
};
export type RawChecklist = { calendar_event_id: string; status: string };

export async function fetchAdminCompetitionsRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    tournamentsResult,
    divisionsResult,
    registrationsResult,
    matchesResult,
    staffResult,
    prizesResult,
    checklistResult,
  ] = await Promise.all([
    supabase
      .from("tournaments")
      .select(
        "id,product,name,status,starts_at,ends_at,pole_id,venue_id,calendar_event_id",
      )
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(500),
    supabase
      .from("tournament_divisions")
      .select("id,tournament_id,status")
      .limit(2000),
    supabase
      .from("tournament_registrations")
      .select("division_id,status,eligibility_status")
      .limit(5000),
    supabase
      .from("tournament_matches")
      .select("id,division_id,match_id")
      .limit(5000),
    supabase
      .from("tournament_staff_assignments")
      .select("tournament_id,status")
      .limit(5000),
    supabase
      .from("tournament_prize_plans")
      .select("id,tournament_id,status")
      .limit(1000),
    supabase
      .from("event_checklists")
      .select("calendar_event_id,status")
      .limit(5000),
  ]);
  const results = [
    ["tournaments", tournamentsResult.error],
    ["tournament_divisions", divisionsResult.error],
    ["tournament_registrations", registrationsResult.error],
    ["tournament_matches", matchesResult.error],
    ["tournament_staff_assignments", staffResult.error],
    ["tournament_prize_plans", prizesResult.error],
    ["event_checklists", checklistResult.error],
  ] as const;
  for (const [source, error] of results)
    if (error) errors.push(`${source}: ${error.message}`);
  return {
    tournaments: tournamentsResult.error
      ? null
      : ((tournamentsResult.data as RawTournament[] | null) ?? []),
    divisions: divisionsResult.error
      ? null
      : ((divisionsResult.data as RawDivision[] | null) ?? []),
    registrations: registrationsResult.error
      ? null
      : ((registrationsResult.data as RawRegistration[] | null) ?? []),
    matches: matchesResult.error
      ? null
      : ((matchesResult.data as RawTournamentMatch[] | null) ?? []),
    staff: staffResult.error
      ? null
      : ((staffResult.data as RawStaff[] | null) ?? []),
    prizes: prizesResult.error
      ? null
      : ((prizesResult.data as RawPrizePlan[] | null) ?? []),
    checklists: checklistResult.error
      ? null
      : ((checklistResult.data as RawChecklist[] | null) ?? []),
    errors,
  };
}
