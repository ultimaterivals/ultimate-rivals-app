import { createClient } from "@/lib/supabase/server";

export type RawAdminAthlete = {
  id: string;
  public_name: string;
  athlete_code: string;
  status: string;
  primary_pole_id: string | null;
};

export type RawAdminEngagement = {
  athlete_id: string;
  source: string | null;
  first_participation_at: string | null;
  second_participation_at: string | null;
  last_participation_at: string | null;
  participations_30d: number | null;
  active_30d: boolean | null;
  returning_athlete: boolean | null;
  days_since_last_participation: number | null;
};

export type RawAdminAthleteReport = {
  athlete_id: string;
  level: string | null;
  ur_coin_balance: number | null;
  games: number | null;
};

export type RawAdminMembership = {
  athlete_id: string;
  team_id: string;
};

export type RawAdminTeam = {
  id: string;
  name: string;
};

export type RawAdminPole = {
  id: string;
  name: string;
};

export type AdminAthletesRepositoryData = {
  athletes: RawAdminAthlete[] | null;
  engagement: RawAdminEngagement[] | null;
  reports: RawAdminAthleteReport[] | null;
  memberships: RawAdminMembership[] | null;
  teams: RawAdminTeam[] | null;
  poles: RawAdminPole[] | null;
  errors: string[];
};

function addError(errors: string[], source: string, message: string) {
  errors.push(`${source}: ${message}`);
}

export async function fetchAdminAthletesRepositoryData(): Promise<AdminAthletesRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    athletesResult,
    engagementResult,
    reportResult,
    membershipResult,
    teamsResult,
    polesResult,
  ] = await Promise.all([
    supabase
      .from("athletes")
      .select("id,public_name,athlete_code,status,primary_pole_id")
      .is("archived_at", null)
      .order("public_name", { ascending: true })
      .limit(2000),
    supabase
      .from("admin_athlete_engagement")
      .select(
        "athlete_id,source,first_participation_at,second_participation_at,last_participation_at,participations_30d,active_30d,returning_athlete,days_since_last_participation",
      )
      .limit(2000),
    supabase
      .from("athlete_report_summary")
      .select("athlete_id,level,ur_coin_balance,games")
      .limit(2000),
    supabase
      .from("team_memberships")
      .select("athlete_id,team_id")
      .eq("status", "active")
      .limit(5000),
    supabase
      .from("teams")
      .select("id,name")
      .neq("status", "archived")
      .limit(1000),
    supabase.from("poles").select("id,name").order("name", { ascending: true }),
  ]);

  const results = [
    ["athletes", athletesResult.error],
    ["admin_athlete_engagement", engagementResult.error],
    ["athlete_report_summary", reportResult.error],
    ["team_memberships", membershipResult.error],
    ["teams", teamsResult.error],
    ["poles", polesResult.error],
  ] as const;
  for (const [source, error] of results) {
    if (error) addError(errors, source, error.message);
  }

  return {
    athletes: athletesResult.error
      ? null
      : ((athletesResult.data as RawAdminAthlete[] | null) ?? []),
    engagement: engagementResult.error
      ? null
      : ((engagementResult.data as RawAdminEngagement[] | null) ?? []),
    reports: reportResult.error
      ? null
      : ((reportResult.data as RawAdminAthleteReport[] | null) ?? []),
    memberships: membershipResult.error
      ? null
      : ((membershipResult.data as RawAdminMembership[] | null) ?? []),
    teams: teamsResult.error
      ? null
      : ((teamsResult.data as RawAdminTeam[] | null) ?? []),
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawAdminPole[] | null) ?? []),
    errors,
  };
}
