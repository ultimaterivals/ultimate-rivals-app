import type { SupabaseClient } from "@supabase/supabase-js";

export async function getScoringPanel(client: SupabaseClient, matchId: string) {
  const [score, rules, rallies, actions, result, versions, summary, gamePoint] =
    await Promise.all([
      client
        .from("match_scoreboard")
        .select("*")
        .eq("match_id", matchId)
        .single(),
      client
        .from("match_scoring_rules")
        .select("*")
        .eq("match_id", matchId)
        .single(),
      client
        .from("match_rally_effective")
        .select("*")
        .eq("match_id", matchId)
        .order("rally_number", { ascending: false }),
      client
        .from("match_technical_action_effective")
        .select("*")
        .eq("match_id", matchId),
      client
        .from("match_results")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle(),
      client
        .from("match_result_versions")
        .select("*")
        .eq("match_id", matchId)
        .order("version_number", { ascending: false }),
      client
        .from("match_technical_summary")
        .select("*")
        .eq("match_id", matchId),
      client
        .from("match_game_points")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle(),
    ]);
  for (const response of [
    score,
    rules,
    rallies,
    actions,
    result,
    versions,
    summary,
    gamePoint,
  ])
    if (response.error) throw response.error;
  return {
    scoreboard: score.data,
    rules: rules.data,
    rallies: rallies.data ?? [],
    actions: actions.data ?? [],
    result: result.data,
    versions: versions.data ?? [],
    summary: summary.data ?? [],
    gamePoint: gamePoint.data,
  };
}

export async function getAthleteStatistics(
  client: SupabaseClient,
  athleteId: string,
) {
  const { data, error } = await client
    .from("match_athlete_statistics")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
