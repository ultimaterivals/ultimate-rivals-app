import type { SupabaseClient } from "@supabase/supabase-js";
export async function getSeasonDetail(c: SupabaseClient, id: string) {
  const { data: season, error } = await c
    .from("seasons")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const [cycles, levels, processes, reviews] = await Promise.all([
    c
      .from("season_cycles")
      .select("*")
      .eq("season_id", id)
      .order("cycle_number"),
    c
      .from("athlete_levels")
      .select("level")
      .eq("season_id", id)
      .eq("status", "active"),
    c
      .from("athlete_leveling_processes")
      .select("id,status,completed_observations,required_observations")
      .eq("season_id", id),
    c
      .from("level_change_reviews")
      .select("id,status")
      .eq("season_id", id)
      .eq("status", "pending"),
  ]);
  for (const r of [cycles, levels, processes, reviews])
    if (r.error) throw r.error;
  const distribution = Object.fromEntries(
    ["leveling", "n3", "n2", "n1"].map((x) => [
      x,
      (levels.data ?? []).filter((v) => v.level === x).length,
    ]),
  );
  return {
    season,
    cycles: cycles.data ?? [],
    distribution,
    processes: processes.data ?? [],
    pendingReviews: reviews.data ?? [],
  };
}
export async function listLeveling(c: SupabaseClient) {
  const { data, error } = await c
    .from("athlete_leveling_processes")
    .select(
      "id,athlete_id,season_id,status,completed_observations,required_observations,athletes(public_name,athlete_code,team_memberships(status,teams(name,poles(name)))),seasons(name)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getDevelopment(c: SupabaseClient, athleteId: string) {
  const [levels, assessments, reviews, protections] = await Promise.all([
    c
      .from("athlete_levels")
      .select("level,starts_at,ends_at,status,reason,seasons(name)")
      .eq("athlete_id", athleteId)
      .order("starts_at", { ascending: false }),
    c
      .from("athlete_assessments")
      .select(
        "id,assessment_type,scope,context,athlete_feedback,overall_score,status,assessed_at,athlete_assessment_scores(score,assessment_criteria(name,category))",
      )
      .eq("athlete_id", athleteId)
      .eq("athlete_visible", true)
      .order("assessed_at", { ascending: false }),
    c
      .from("level_change_reviews")
      .select(
        "current_level,proposed_level,review_type,status,decision_reason,created_at,reviewed_at",
      )
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false }),
    c
      .from("athlete_level_protections")
      .select("level,starts_at,ends_at,reason")
      .eq("athlete_id", athleteId)
      .gt("ends_at", new Date().toISOString()),
  ]);
  for (const r of [levels, assessments, reviews, protections])
    if (r.error) throw r.error;
  return {
    levels: levels.data ?? [],
    assessments: assessments.data ?? [],
    reviews: reviews.data ?? [],
    protections: protections.data ?? [],
  };
}
