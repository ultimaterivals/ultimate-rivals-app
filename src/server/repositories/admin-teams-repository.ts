import { createClient } from "@/lib/supabase/server";

export type RawTeam = {
  id: string;
  name: string;
  short_name: string | null;
  status: string;
  primary_pole_id: string | null;
};
export type RawTeamSummary = {
  team_id: string;
  active_athletes: number | null;
  rosters: number | null;
  tournament_registrations: number | null;
};
export type RawRoster = {
  id: string;
  team_id: string;
  category_id: string;
  format_id: string;
  status: string;
};
export type RawCategory = {
  id: string;
  code: string;
  name: string;
  status: string;
};
export type RawFormat = {
  id: string;
  code: string;
  name: string;
  status: string;
};
export type RawTeamCompetitionParameter = {
  format_code: string;
  max_formations_per_team_category: number | null;
  required_starters: number;
  max_reserves: number;
};
export type RawPole = { id: string; name: string };
export type RawAthleteId = { id: string };
export type RawAthleteIdentity = {
  id: string;
  public_name: string;
  full_name: string;
};
export type RawMembershipAthlete = { athlete_id: string };
export type RawSeason = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
};
export type RawFormation = {
  id: string;
  season_id: string;
  format_id: string;
  category_id: string | null;
  level: string | null;
  team_id: string | null;
  pole_id: string | null;
  display_name: string;
  status: string;
};
export type RawFormationMember = {
  formation_id: string;
  athlete_id: string;
  position_order: number;
};

export type AdminTeamsRepositoryData = {
  teams: RawTeam[] | null;
  summaries: RawTeamSummary[] | null;
  rosters: RawRoster[] | null;
  categories: RawCategory[] | null;
  formats: RawFormat[] | null;
  parameters: RawTeamCompetitionParameter[] | null;
  poles: RawPole[] | null;
  athletes: RawAthleteId[] | null;
  athleteIdentities: RawAthleteIdentity[] | null;
  memberships: RawMembershipAthlete[] | null;
  activeSeason: RawSeason | null;
  formations: RawFormation[] | null;
  formationMembers: RawFormationMember[] | null;
  errors: string[];
};

function addError(errors: string[], source: string, message: string) {
  errors.push(`${source}: ${message}`);
}

export async function fetchAdminTeamsRepositoryData(): Promise<AdminTeamsRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    teamsResult,
    summaryResult,
    rosterResult,
    categoryResult,
    formatResult,
    parameterResult,
    poleResult,
    athleteResult,
    athleteIdentityResult,
    membershipResult,
    seasonResult,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id,name,short_name,status,primary_pole_id")
      .neq("status", "archived")
      .order("name", { ascending: true })
      .limit(1000),
    supabase
      .from("team_report_summary")
      .select("team_id,active_athletes,rosters,tournament_registrations")
      .limit(1000),
    supabase
      .from("team_rosters")
      .select("id,team_id,category_id,format_id,status")
      .neq("status", "archived")
      .limit(5000),
    supabase
      .from("competitive_categories")
      .select("id,code,name,status")
      .neq("status", "archived")
      .order("name", { ascending: true }),
    supabase
      .from("competitive_formats")
      .select("id,code,name,status")
      .neq("status", "archived")
      .order("name", { ascending: true }),
    supabase
      .from("team_competition_parameters")
      .select(
        "format_code,max_formations_per_team_category,required_starters,max_reserves",
      )
      .order("format_code", { ascending: true }),
    supabase.from("poles").select("id,name"),
    supabase
      .from("athletes")
      .select("id")
      .is("archived_at", null)
      .eq("status", "active")
      .limit(5000),
    supabase
      .from("athletes")
      .select("id,public_name,full_name")
      .is("archived_at", null)
      .limit(5000),
    supabase
      .from("team_memberships")
      .select("athlete_id")
      .eq("status", "active")
      .limit(5000),
    supabase
      .from("seasons")
      .select("id,name,starts_at,ends_at")
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const activeSeason = seasonResult.error
    ? null
    : ((seasonResult.data as RawSeason | null) ?? null);
  const [formationResult, formationMemberResult] = activeSeason
    ? await Promise.all([
        supabase
          .from("competition_formations")
          .select(
            "id,season_id,format_id,category_id,level,team_id,pole_id,display_name,status",
          )
          .eq("season_id", activeSeason.id)
          .eq("status", "active")
          .order("display_name", { ascending: true })
          .limit(5000),
        supabase
          .from("competition_formation_members")
          .select("formation_id,athlete_id,position_order")
          .limit(10000),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const results = [
    ["teams", teamsResult.error],
    ["team_report_summary", summaryResult.error],
    ["team_rosters", rosterResult.error],
    ["competitive_categories", categoryResult.error],
    ["competitive_formats", formatResult.error],
    ["team_competition_parameters", parameterResult.error],
    ["poles", poleResult.error],
    ["athletes", athleteResult.error],
    ["athlete identities", athleteIdentityResult.error],
    ["team_memberships", membershipResult.error],
    ["active season", seasonResult.error],
    ["competition_formations", formationResult.error],
    ["competition_formation_members", formationMemberResult.error],
  ] as const;
  for (const [source, error] of results)
    if (error) addError(errors, source, error.message);

  return {
    teams: teamsResult.error
      ? null
      : ((teamsResult.data as RawTeam[] | null) ?? []),
    summaries: summaryResult.error
      ? null
      : ((summaryResult.data as RawTeamSummary[] | null) ?? []),
    rosters: rosterResult.error
      ? null
      : ((rosterResult.data as RawRoster[] | null) ?? []),
    categories: categoryResult.error
      ? null
      : ((categoryResult.data as RawCategory[] | null) ?? []),
    formats: formatResult.error
      ? null
      : ((formatResult.data as RawFormat[] | null) ?? []),
    parameters: parameterResult.error
      ? null
      : ((parameterResult.data as RawTeamCompetitionParameter[] | null) ?? []),
    poles: poleResult.error
      ? null
      : ((poleResult.data as RawPole[] | null) ?? []),
    athletes: athleteResult.error
      ? null
      : ((athleteResult.data as RawAthleteId[] | null) ?? []),
    athleteIdentities: athleteIdentityResult.error
      ? null
      : ((athleteIdentityResult.data as RawAthleteIdentity[] | null) ?? []),
    memberships: membershipResult.error
      ? null
      : ((membershipResult.data as RawMembershipAthlete[] | null) ?? []),
    activeSeason,
    formations: formationResult.error
      ? null
      : ((formationResult.data as RawFormation[] | null) ?? []),
    formationMembers: formationMemberResult.error
      ? null
      : ((formationMemberResult.data as RawFormationMember[] | null) ?? []),
    errors,
  };
}
