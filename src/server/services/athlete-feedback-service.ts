import { createClient } from "@/lib/supabase/server";

export type AthleteFeedbackRequest = {
  id: string;
  sessionId: string;
  sessionName: string;
  sessionEndsAt: string;
  status: "sent" | "responded";
  score: number | null;
  comment: string | null;
  respondedAt: string | null;
};

export async function getAthleteFeedbackSnapshot(userId: string) {
  const supabase = await createClient();
  const errors: string[] = [];
  const athleteResult = await supabase
    .from("athletes")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (athleteResult.error) {
    errors.push(`athletes: ${athleteResult.error.message}`);
    return { requests: [] as AthleteFeedbackRequest[], sourceErrors: errors };
  }
  if (!athleteResult.data?.id) {
    return { requests: [] as AthleteFeedbackRequest[], sourceErrors: errors };
  }

  const requestsResult = await supabase
    .from("ur_play_feedback_requests")
    .select(
      "id,session_id,status,recommendation_score,response_comment,responded_at,created_at",
    )
    .eq("athlete_id", athleteResult.data.id)
    .in("status", ["sent", "responded"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestsResult.error) {
    errors.push(`ur_play_feedback_requests: ${requestsResult.error.message}`);
    return { requests: [] as AthleteFeedbackRequest[], sourceErrors: errors };
  }

  const rows = requestsResult.data ?? [];
  const sessionIds = [...new Set(rows.map((row) => row.session_id))];
  const sessionsResult =
    sessionIds.length > 0
      ? await supabase
          .from("ur_play_sessions")
          .select("id,name,ends_at")
          .in("id", sessionIds)
      : { data: [], error: null };

  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  const sessionMap = new Map(
    (sessionsResult.data ?? []).map((row) => [row.id, row]),
  );

  return {
    requests: rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      sessionName: sessionMap.get(row.session_id)?.name ?? "UR Play",
      sessionEndsAt: sessionMap.get(row.session_id)?.ends_at ?? row.created_at,
      status: row.status as "sent" | "responded",
      score: row.recommendation_score,
      comment: row.response_comment,
      respondedAt: row.responded_at,
    })),
    sourceErrors: errors,
  };
}
