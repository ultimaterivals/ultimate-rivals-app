import { createClient } from "@/lib/supabase/server";

export type RawAthleteIdentity = {
  id: string;
  public_name: string;
  athlete_code: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  instagram_handle: string | null;
  status: string;
  primary_pole_id: string | null;
  gender: string;
};

export type RawAthleteReport = {
  athlete_id: string;
  athlete_code: string;
  public_name: string;
  level: string | null;
  ur_coin_balance: number | null;
  games: number | null;
  competitions: number | null;
  training_attendance: number | null;
  hunter_completed: number | null;
};

export type RawAthleteRanking = {
  id: string;
  season_id: string;
  cycle_id: string | null;
  level: string | null;
  category_code: string | null;
  format_code: string | null;
  team_name: string | null;
  pole_name: string | null;
  total_points: number | string;
  games_played: number | null;
  wins: number | null;
  losses: number | null;
  win_rate: number | string | null;
  current_position: number | null;
  general_position: number | null;
  previous_position: number | null;
  position_change: number | null;
  movement: string | null;
  refreshed_at: string;
};

export type RawAthletePackage = {
  id: string;
  package_id: string;
  units_total: number | null;
  units_used: number;
  ends_at: string | null;
};

export type RawCreditBalance = {
  athlete_id: string;
  athlete_package_id: string;
  available_units: number | null;
  reserved_units: number | null;
  consumed_units: number | null;
};

export type RawPackageDefinition = {
  id: string;
  name: string;
  code: string;
};

export type RawTeamMembership = {
  team_id: string;
};

export type RawTeam = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

export type RawReservation = {
  id: string;
  opportunity_id: string;
  status: string;
  eligibility: string;
  waitlist_position: number | null;
};

export type RawInterest = {
  id: string;
  opportunity_id: string;
  status: string;
  interest_mode: string;
};

export type RawAthleteOpportunity = {
  id: string;
  opportunity_type: string;
  computed_status: string;
  configured_status: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  pole_id: string | null;
  pole_name: string | null;
  venue_name: string | null;
  level: string | null;
  format_code: string | null;
  category_code: string | null;
  remaining_capacity: number | null;
};

export type RawBillingItem = {
  id: string;
  amount: number | string;
  status: string;
};

export type AthletePortalRepositoryData = {
  athlete: RawAthleteIdentity | null;
  report: RawAthleteReport | null;
  rankings: RawAthleteRanking[] | null;
  athletePackages: RawAthletePackage[] | null;
  creditBalances: RawCreditBalance[] | null;
  packageDefinitions: RawPackageDefinition[] | null;
  memberships: RawTeamMembership[] | null;
  teams: RawTeam[] | null;
  reservations: RawReservation[] | null;
  interests: RawInterest[] | null;
  opportunities: RawAthleteOpportunity[] | null;
  billingItems: RawBillingItem[] | null;
  errors: string[];
};

function pushError(errors: string[], source: string, message: string) {
  errors.push(`${source}: ${message}`);
}

export async function fetchAthletePortalRepositoryData({
  userId,
  now,
}: {
  userId: string;
  now: Date;
}): Promise<AthletePortalRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];

  const athleteResult = await supabase
    .from("athletes")
    .select(
      "id,public_name,athlete_code,avatar_url,city,state,bio,instagram_handle,status,primary_pole_id,gender",
    )
    .eq("profile_id", userId)
    .maybeSingle();

  if (athleteResult.error)
    pushError(errors, "athletes", athleteResult.error.message);

  const athlete = athleteResult.error
    ? null
    : ((athleteResult.data as RawAthleteIdentity | null) ?? null);

  if (!athlete) {
    return {
      athlete: null,
      report: null,
      rankings: null,
      athletePackages: null,
      creditBalances: null,
      packageDefinitions: null,
      memberships: null,
      teams: null,
      reservations: null,
      interests: null,
      opportunities: null,
      billingItems: null,
      errors,
    };
  }

  const opportunityEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [
    reportResult,
    rankingResult,
    packageResult,
    creditResult,
    membershipResult,
    reservationResult,
    interestResult,
    opportunityResult,
    billingResult,
  ] = await Promise.all([
    supabase
      .from("athlete_report_summary")
      .select(
        "athlete_id,athlete_code,public_name,level,ur_coin_balance,games,competitions,training_attendance,hunter_completed",
      )
      .eq("athlete_id", athlete.id)
      .maybeSingle(),
    supabase
      .from("individual_ranking")
      .select(
        "id,season_id,cycle_id,level,category_code,format_code,team_name,pole_name,total_points,games_played,wins,losses,win_rate,current_position,general_position,previous_position,position_change,movement,refreshed_at",
      )
      .eq("entity_id", athlete.id)
      .order("refreshed_at", { ascending: false })
      .limit(12),
    supabase
      .from("athlete_commercial_packages")
      .select("id,package_id,units_total,units_used,ends_at")
      .eq("athlete_id", athlete.id)
      .eq("status", "active"),
    supabase
      .from("athlete_credit_balances")
      .select(
        "athlete_id,athlete_package_id,available_units,reserved_units,consumed_units",
      )
      .eq("athlete_id", athlete.id),
    supabase
      .from("team_memberships")
      .select("team_id")
      .eq("athlete_id", athlete.id)
      .eq("status", "active"),
    supabase
      .from("activity_reservations")
      .select("id,opportunity_id,status,eligibility,waitlist_position")
      .eq("athlete_id", athlete.id)
      .in("status", ["reserved", "confirmed", "checked_in", "waitlisted"]),
    supabase
      .from("session_interests")
      .select("id,opportunity_id,status,interest_mode")
      .eq("athlete_id", athlete.id)
      .eq("status", "active"),
    supabase
      .from("athlete_agenda_opportunities")
      .select(
        "id,opportunity_type,computed_status,configured_status,title,starts_at,ends_at,pole_id,pole_name,venue_name,level,format_code,category_code,remaining_capacity",
      )
      .gte("starts_at", now.toISOString())
      .lte("starts_at", opportunityEnd.toISOString())
      .order("starts_at", { ascending: true })
      .limit(30),
    supabase
      .from("athlete_billing_items")
      .select("id,amount,status")
      .eq("athlete_id", athlete.id)
      .in("status", ["pending", "submitted"]),
  ]);

  const results = [
    ["athlete_report_summary", reportResult.error],
    ["individual_ranking", rankingResult.error],
    ["athlete_commercial_packages", packageResult.error],
    ["athlete_credit_balances", creditResult.error],
    ["team_memberships", membershipResult.error],
    ["activity_reservations", reservationResult.error],
    ["session_interests", interestResult.error],
    ["athlete_agenda_opportunities", opportunityResult.error],
    ["athlete_billing_items", billingResult.error],
  ] as const;

  for (const [source, error] of results) {
    if (error) pushError(errors, source, error.message);
  }

  const athletePackages = packageResult.error
    ? null
    : ((packageResult.data as RawAthletePackage[] | null) ?? []);
  const creditBalances = creditResult.error
    ? null
    : ((creditResult.data as RawCreditBalance[] | null) ?? []);
  const memberships = membershipResult.error
    ? null
    : ((membershipResult.data as RawTeamMembership[] | null) ?? []);

  const packageIds = [
    ...new Set((athletePackages ?? []).map((item) => item.package_id)),
  ];
  const teamIds = [...new Set((memberships ?? []).map((item) => item.team_id))];

  let packageDefinitions: RawPackageDefinition[] | null = [];
  if (packageIds.length > 0) {
    const definitionsResult = await supabase
      .from("packages")
      .select("id,name,code")
      .in("id", packageIds);
    if (definitionsResult.error) {
      pushError(errors, "packages", definitionsResult.error.message);
      packageDefinitions = null;
    } else {
      packageDefinitions =
        (definitionsResult.data as RawPackageDefinition[] | null) ?? [];
    }
  }

  let teams: RawTeam[] | null = [];
  if (teamIds.length > 0) {
    const teamsResult = await supabase
      .from("teams")
      .select("id,name,short_name,logo_url")
      .in("id", teamIds);
    if (teamsResult.error) {
      pushError(errors, "teams", teamsResult.error.message);
      teams = null;
    } else {
      teams = (teamsResult.data as RawTeam[] | null) ?? [];
    }
  }

  return {
    athlete,
    report: reportResult.error
      ? null
      : ((reportResult.data as RawAthleteReport | null) ?? null),
    rankings: rankingResult.error
      ? null
      : ((rankingResult.data as RawAthleteRanking[] | null) ?? []),
    athletePackages,
    creditBalances,
    packageDefinitions,
    memberships,
    teams,
    reservations: reservationResult.error
      ? null
      : ((reservationResult.data as RawReservation[] | null) ?? []),
    interests: interestResult.error
      ? null
      : ((interestResult.data as RawInterest[] | null) ?? []),
    opportunities: opportunityResult.error
      ? null
      : ((opportunityResult.data as RawAthleteOpportunity[] | null) ?? []),
    billingItems: billingResult.error
      ? null
      : ((billingResult.data as RawBillingItem[] | null) ?? []),
    errors,
  };
}
