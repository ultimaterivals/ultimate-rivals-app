import { createClient } from "@/lib/supabase/server";

export type RawCourtOpsSession = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string;
  venue_id: string;
  ready_for_matchmaking: boolean;
};
export type RawSessionCourt = {
  session_id: string;
  court_id: string;
  position: number;
  status: string;
};
export type RawCourt = { id: string; venue_id: string; name: string; status: string };
export type RawVenue = { id: string; pole_id: string; name: string; status: string };
export type RawPole = { id: string; name: string };
export type RawOption = { id: string; code: string; name: string; status: string };
export type RawQueueEntry = {
  id: string;
  session_id: string;
  athlete_id: string;
  status: string;
  queued_at: string;
  priority_score: number | string | null;
  last_match_ended_at: string | null;
  current_match_id: string | null;
};
export type RawMatch = {
  id: string;
  match_code: string;
  session_id: string;
  court_id: string;
  format_id: string;
  category_id: string | null;
  level: string;
  status: string;
  scheduled_order: number | null;
  called_at: string | null;
  ready_at: string | null;
  started_at: string | null;
  ended_at: string | null;
};
export type RawSide = {
  id: string;
  match_id: string;
  side: "A" | "B";
  label: string | null;
};
export type RawParticipant = {
  id: string;
  match_id: string;
  side_id: string;
  athlete_id: string;
  status: string;
  position_order: number;
};
export type RawAthletePublic = {
  athlete_id: string;
  athlete_code: string;
  public_name: string;
};
export type RawAthleteGender = { id: string; gender: string };
export type RawScoreboard = {
  match_id: string;
  points_to_win: number | null;
  win_by: number | null;
  max_points: number | null;
  score_a: number | null;
  score_b: number | null;
  valid_rallies: number | null;
  next_rally_number: number | null;
  is_game_over: boolean | null;
  winner_side_id: string | null;
};
export type RawResult = {
  match_id: string;
  winner_side_id: string | null;
  score_a: number;
  score_b: number;
  result_status: string;
  homologated_at: string | null;
};
export type RawRally = {
  id: string;
  match_id: string;
  rally_number: number;
  winning_side_id: string;
  status: string;
  recorded_at: string;
};
export type RawTechnicalSummary = {
  match_id: string;
  athlete_id: string;
  side_id: string;
  aces: number | null;
  attacks: number | null;
  blocks: number | null;
  defenses: number | null;
  assists: number | null;
};
export type RawRankingRun = {
  source_id: string;
  status: string;
  transaction_count: number;
  completed_at: string | null;
  started_at: string;
};

export async function fetchAdminCourtOpsRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    sessionsResult,
    sessionCourtsResult,
    courtsResult,
    venuesResult,
    polesResult,
    formatsResult,
    categoriesResult,
    queueResult,
    matchesResult,
    sidesResult,
    participantsResult,
    athletePublicResult,
    athleteGenderResult,
    scoreboardResult,
    resultsResult,
    ralliesResult,
    technicalResult,
    rankingRunsResult,
  ] = await Promise.all([
    supabase
      .from("ur_play_sessions")
      .select("id,name,status,starts_at,ends_at,pole_id,venue_id,ready_for_matchmaking")
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false })
      .limit(150),
    supabase
      .from("ur_play_session_courts")
      .select("session_id,court_id,position,status")
      .limit(2000),
    supabase.from("courts").select("id,venue_id,name,status").limit(1000),
    supabase.from("venues").select("id,pole_id,name,status").limit(1000),
    supabase.from("poles").select("id,name").limit(100),
    supabase
      .from("competitive_formats")
      .select("id,code,name,status")
      .eq("status", "active"),
    supabase
      .from("competitive_categories")
      .select("id,code,name,status")
      .eq("status", "active"),
    supabase
      .from("match_queue_entries")
      .select(
        "id,session_id,athlete_id,status,queued_at,priority_score,last_match_ended_at,current_match_id",
      )
      .limit(10000),
    supabase
      .from("matches")
      .select(
        "id,match_code,session_id,court_id,format_id,category_id,level,status,scheduled_order,called_at,ready_at,started_at,ended_at",
      )
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase.from("match_sides").select("id,match_id,side,label").limit(6000),
    supabase
      .from("match_participants")
      .select("id,match_id,side_id,athlete_id,status,position_order")
      .limit(20000),
    supabase
      .from("athlete_public_profiles")
      .select("athlete_id,athlete_code,public_name")
      .limit(10000),
    supabase.from("athletes").select("id,gender").limit(10000),
    supabase
      .from("match_scoreboard")
      .select(
        "match_id,points_to_win,win_by,max_points,score_a,score_b,valid_rallies,next_rally_number,is_game_over,winner_side_id",
      )
      .limit(3000),
    supabase
      .from("match_results")
      .select("match_id,winner_side_id,score_a,score_b,result_status,homologated_at")
      .limit(3000),
    supabase
      .from("match_rallies")
      .select("id,match_id,rally_number,winning_side_id,status,recorded_at")
      .order("rally_number", { ascending: true })
      .limit(30000),
    supabase
      .from("match_technical_summary")
      .select("match_id,athlete_id,side_id,aces,attacks,blocks,defenses,assists")
      .limit(20000),
    supabase
      .from("ranking_processing_runs")
      .select("source_id,status,transaction_count,completed_at,started_at")
      .eq("source_type", "match_result")
      .order("started_at", { ascending: false })
      .limit(5000),
  ]);

  const results = [
    ["ur_play_sessions", sessionsResult.error],
    ["ur_play_session_courts", sessionCourtsResult.error],
    ["courts", courtsResult.error],
    ["venues", venuesResult.error],
    ["poles", polesResult.error],
    ["competitive_formats", formatsResult.error],
    ["competitive_categories", categoriesResult.error],
    ["match_queue_entries", queueResult.error],
    ["matches", matchesResult.error],
    ["match_sides", sidesResult.error],
    ["match_participants", participantsResult.error],
    ["athlete_public_profiles", athletePublicResult.error],
    ["athletes.gender", athleteGenderResult.error],
    ["match_scoreboard", scoreboardResult.error],
    ["match_results", resultsResult.error],
    ["match_rallies", ralliesResult.error],
    ["match_technical_summary", technicalResult.error],
    ["ranking_processing_runs", rankingRunsResult.error],
  ] as const;
  for (const [source, error] of results) {
    if (error) errors.push(`${source}: ${error.message}`);
  }

  return {
    sessions: sessionsResult.error
      ? null
      : ((sessionsResult.data as RawCourtOpsSession[] | null) ?? []),
    sessionCourts: sessionCourtsResult.error
      ? null
      : ((sessionCourtsResult.data as RawSessionCourt[] | null) ?? []),
    courts: courtsResult.error
      ? null
      : ((courtsResult.data as RawCourt[] | null) ?? []),
    venues: venuesResult.error
      ? null
      : ((venuesResult.data as RawVenue[] | null) ?? []),
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawPole[] | null) ?? []),
    formats: formatsResult.error
      ? null
      : ((formatsResult.data as RawOption[] | null) ?? []),
    categories: categoriesResult.error
      ? null
      : ((categoriesResult.data as RawOption[] | null) ?? []),
    queue: queueResult.error
      ? null
      : ((queueResult.data as RawQueueEntry[] | null) ?? []),
    matches: matchesResult.error
      ? null
      : ((matchesResult.data as RawMatch[] | null) ?? []),
    sides: sidesResult.error
      ? null
      : ((sidesResult.data as RawSide[] | null) ?? []),
    participants: participantsResult.error
      ? null
      : ((participantsResult.data as RawParticipant[] | null) ?? []),
    athletePublic: athletePublicResult.error
      ? null
      : ((athletePublicResult.data as RawAthletePublic[] | null) ?? []),
    athleteGenders: athleteGenderResult.error
      ? null
      : ((athleteGenderResult.data as RawAthleteGender[] | null) ?? []),
    scoreboards: scoreboardResult.error
      ? null
      : ((scoreboardResult.data as RawScoreboard[] | null) ?? []),
    results: resultsResult.error
      ? null
      : ((resultsResult.data as RawResult[] | null) ?? []),
    rallies: ralliesResult.error
      ? null
      : ((ralliesResult.data as RawRally[] | null) ?? []),
    technical: technicalResult.error
      ? null
      : ((technicalResult.data as RawTechnicalSummary[] | null) ?? []),
    rankingRuns: rankingRunsResult.error
      ? null
      : ((rankingRunsResult.data as RawRankingRun[] | null) ?? []),
    errors,
  };
}
