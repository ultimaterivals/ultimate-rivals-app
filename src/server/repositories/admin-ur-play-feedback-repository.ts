import { createClient } from "@/lib/supabase/server";

type RawRequest = {
  id: string;
  session_id: string;
  athlete_id: string;
  status: string;
  channel: string | null;
  dispatch_mode: string | null;
  dispatch_evidence: string | null;
  sent_at: string | null;
  recommendation_score: number | null;
  response_comment: string | null;
  responded_at: string | null;
  waiver_reason: string | null;
};

type RawAthlete = { id: string; public_name: string; athlete_code: string };
type RawSession = { id: string; name: string; ends_at: string };
type RawClosure = { session_id: string; status: string };

export async function fetchAdminFeedbackRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const requestsResult = await supabase
    .from("ur_play_feedback_requests")
    .select(
      "id,session_id,athlete_id,status,channel,dispatch_mode,dispatch_evidence,sent_at,recommendation_score,response_comment,responded_at,waiver_reason",
    )
    .order("created_at", { ascending: false })
    .limit(3000);

  if (requestsResult.error) {
    errors.push(`ur_play_feedback_requests: ${requestsResult.error.message}`);
    return {
      requests: [] as RawRequest[],
      athletes: [] as RawAthlete[],
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      errors,
    };
  }

  const requests = (requestsResult.data as RawRequest[] | null) ?? [];
  if (requests.length === 0) {
    return {
      requests,
      athletes: [] as RawAthlete[],
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      errors,
    };
  }

  const athleteIds = [...new Set(requests.map((row) => row.athlete_id))];
  const sessionIds = [...new Set(requests.map((row) => row.session_id))];
  const [athletesResult, sessionsResult, closuresResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("id,public_name,athlete_code")
      .in("id", athleteIds),
    supabase
      .from("ur_play_sessions")
      .select("id,name,ends_at")
      .in("id", sessionIds),
    supabase
      .from("ur_play_post_session_closures")
      .select("session_id,status")
      .in("session_id", sessionIds),
  ]);

  if (athletesResult.error)
    errors.push(`athletes: ${athletesResult.error.message}`);
  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  if (closuresResult.error)
    errors.push(
      `ur_play_post_session_closures: ${closuresResult.error.message}`,
    );

  return {
    requests,
    athletes: athletesResult.error
      ? []
      : ((athletesResult.data as RawAthlete[] | null) ?? []),
    sessions: sessionsResult.error
      ? []
      : ((sessionsResult.data as RawSession[] | null) ?? []),
    closures: closuresResult.error
      ? []
      : ((closuresResult.data as RawClosure[] | null) ?? []),
    errors,
  };
}
