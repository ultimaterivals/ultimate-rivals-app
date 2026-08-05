import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAthleteDevelopmentExperience(
  client: SupabaseClient,
  athleteId: string,
) {
  const [summary, training, feedback, hunterThemes] = await Promise.all([
    client
      .from("athlete_development_summary")
      .select("*")
      .eq("athlete_id", athleteId)
      .maybeSingle(),
    client
      .from("training_attendance")
      .select(
        "status,training_sessions(id,starts_at,ends_at,focus,skills,training_programs(name))",
      )
      .eq("athlete_id", athleteId)
      .order("id", { ascending: false })
      .limit(5),
    client
      .from("training_feedback")
      .select("id,feedback,created_at,training_sessions(focus)")
      .eq("athlete_id", athleteId)
      .eq("visible_to_athlete", true)
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("hunter_themes")
      .select("week_number,code,name")
      .order("week_number"),
  ]);

  for (const response of [summary, training, feedback, hunterThemes]) {
    if (response.error) throw response.error;
  }

  return {
    summary: summary.data,
    training: training.data ?? [],
    feedback: feedback.data ?? [],
    hunterThemes: hunterThemes.data ?? [],
  };
}
