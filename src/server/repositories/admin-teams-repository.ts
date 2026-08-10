import { createClient } from "@/lib/supabase/server";

export type RawTeam = { id: string; name: string; short_name: string | null; status: string; primary_pole_id: string | null };
export type RawTeamSummary = { team_id: string; active_athletes: number | null; rosters: number | null; tournament_registrations: number | null };
export type RawRoster = { id: string; team_id: string; category_id: string; format_id: string; status: string };
export type RawCategory = { id: string; code: string; name: string; status: string };
export type RawFormat = { id: string; code: string; name: string; status: string };
export type RawPole = { id: string; name: string };
export type RawAthleteId = { id: string };
export type RawMembershipAthlete = { athlete_id: string };

export type AdminTeamsRepositoryData = {
  teams: RawTeam[] | null;
  summaries: RawTeamSummary[] | null;
  rosters: RawRoster[] | null;
  categories: RawCategory[] | null;
  formats: RawFormat[] | null;
  poles: RawPole[] | null;
  athletes: RawAthleteId[] | null;
  memberships: RawMembershipAthlete[] | null;
  errors: string[];
};

function addError(errors: string[], source: string, message: string) { errors.push(`${source}: ${message}`); }

export async function fetchAdminTeamsRepositoryData(): Promise<AdminTeamsRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const [teamsResult, summaryResult, rosterResult, categoryResult, formatResult, poleResult, athleteResult, membershipResult] = await Promise.all([
    supabase.from("teams").select("id,name,short_name,status,primary_pole_id").neq("status", "archived").order("name", { ascending: true }).limit(1000),
    supabase.from("team_report_summary").select("team_id,active_athletes,rosters,tournament_registrations").limit(1000),
    supabase.from("team_rosters").select("id,team_id,category_id,format_id,status").neq("status", "archived").limit(5000),
    supabase.from("competitive_categories").select("id,code,name,status").neq("status", "archived").order("name", { ascending: true }),
    supabase.from("competitive_formats").select("id,code,name,status").neq("status", "archived").order("name", { ascending: true }),
    supabase.from("poles").select("id,name"),
    supabase.from("athletes").select("id").is("archived_at", null).eq("status", "active").limit(5000),
    supabase.from("team_memberships").select("athlete_id").eq("status", "active").limit(5000),
  ]);

  const results = [["teams", teamsResult.error], ["team_report_summary", summaryResult.error], ["team_rosters", rosterResult.error], ["competitive_categories", categoryResult.error], ["competitive_formats", formatResult.error], ["poles", poleResult.error], ["athletes", athleteResult.error], ["team_memberships", membershipResult.error]] as const;
  for (const [source, error] of results) if (error) addError(errors, source, error.message);

  return {
    teams: teamsResult.error ? null : ((teamsResult.data as RawTeam[] | null) ?? []),
    summaries: summaryResult.error ? null : ((summaryResult.data as RawTeamSummary[] | null) ?? []),
    rosters: rosterResult.error ? null : ((rosterResult.data as RawRoster[] | null) ?? []),
    categories: categoryResult.error ? null : ((categoryResult.data as RawCategory[] | null) ?? []),
    formats: formatResult.error ? null : ((formatResult.data as RawFormat[] | null) ?? []),
    poles: poleResult.error ? null : ((poleResult.data as RawPole[] | null) ?? []),
    athletes: athleteResult.error ? null : ((athleteResult.data as RawAthleteId[] | null) ?? []),
    memberships: membershipResult.error ? null : ((membershipResult.data as RawMembershipAthlete[] | null) ?? []),
    errors,
  };
}
