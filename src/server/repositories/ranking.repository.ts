import type { SupabaseClient } from "@supabase/supabase-js";

export async function listRankingEngineMatches(client: SupabaseClient) {
  const { data, error } = await client
    .from("match_results")
    .select(
      "match_id,winner_side_id,score_a,score_b,result_status,homologated_at,matches(match_code,event_context,session_id)",
    )
    .in("result_status", ["homologated", "corrected", "void"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const matchIds = (data ?? []).map((row) => row.match_id);
  const { data: runs, error: runsError } = matchIds.length
    ? await client
        .from("ranking_processing_runs")
        .select("*")
        .eq("source_type", "match_result")
        .in("source_id", matchIds)
        .order("started_at", { ascending: false })
    : { data: [], error: null };
  if (runsError) throw runsError;
  return { matches: data ?? [], runs: runs ?? [] };
}

export async function getRankingEngineMatch(
  client: SupabaseClient,
  matchId: string,
) {
  const [result, transactions, runs] = await Promise.all([
    client
      .from("match_results")
      .select(
        "*,matches(match_code,event_context,session_id),match_sides!match_results_winner_side_id_fkey(side,label)",
      )
      .eq("match_id", matchId)
      .single(),
    client
      .from("ranking_transactions")
      .select(
        "*,athletes(public_name),ranking_rules(name,point_category),teams(name),poles(name)",
      )
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
    client
      .from("ranking_processing_runs")
      .select("*")
      .eq("source_type", "match_result")
      .eq("source_id", matchId)
      .order("started_at", { ascending: false }),
  ]);
  for (const response of [result, transactions, runs])
    if (response.error) throw response.error;
  return {
    result: result.data,
    transactions: transactions.data ?? [],
    runs: runs.data ?? [],
  };
}

export async function getAthletePoints(
  client: SupabaseClient,
  athleteId: string,
) {
  const [
    { data: totals, error: totalsError },
    { data: history, error: historyError },
  ] = await Promise.all([
    client
      .from("athlete_ranking_totals")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("season_id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("athlete_ranking_history")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false }),
  ]);
  if (totalsError) throw totalsError;
  if (historyError) throw historyError;
  return { totals, history: history ?? [] };
}
