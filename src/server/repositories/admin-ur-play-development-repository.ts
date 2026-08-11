import { createClient } from "@/lib/supabase/server";

type RawCase = {
  id: string;
  session_id: string;
  athlete_id: string;
  leveling_process_id: string | null;
  current_level: string | null;
  reasons: unknown;
  evidence: Record<string, unknown> | null;
  status: string;
  recommended_action: string | null;
  resolution_action: string | null;
  resolution_notes: string | null;
  due_at: string;
  resolved_at: string | null;
  waiver_reason: string | null;
};

type RawAthlete = { id: string; public_name: string; athlete_code: string };
type RawSession = { id: string; name: string; ends_at: string };

export async function fetchAdminDevelopmentRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const sessionsResult = await supabase
    .from("ur_play_sessions")
    .select("id,name,ends_at")
    .eq("status", "completed")
    .order("ends_at", { ascending: false })
    .limit(100);

  if (sessionsResult.error) {
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
    return {
      cases: [] as RawCase[],
      athletes: [] as RawAthlete[],
      sessions: [] as RawSession[],
      errors,
    };
  }

  const sessions = (sessionsResult.data as RawSession[] | null) ?? [];
  if (sessions.length === 0) {
    return {
      cases: [] as RawCase[],
      athletes: [] as RawAthlete[],
      sessions,
      errors,
    };
  }

  const sessionIds = sessions.map((row) => row.id);
  const casesResult = await supabase
    .from("ur_play_development_cases")
    .select(
      "id,session_id,athlete_id,leveling_process_id,current_level,reasons,evidence,status,recommended_action,resolution_action,resolution_notes,due_at,resolved_at,waiver_reason",
    )
    .in("session_id", sessionIds)
    .order("due_at", { ascending: true })
    .limit(2000);

  if (casesResult.error) {
    errors.push(`ur_play_development_cases: ${casesResult.error.message}`);
    return {
      cases: [] as RawCase[],
      athletes: [] as RawAthlete[],
      sessions,
      errors,
    };
  }

  const cases = (casesResult.data as RawCase[] | null) ?? [];
  const athleteIds = [...new Set(cases.map((row) => row.athlete_id))];
  const athletesResult =
    athleteIds.length > 0
      ? await supabase
          .from("athletes")
          .select("id,public_name,athlete_code")
          .in("id", athleteIds)
      : { data: [] as RawAthlete[], error: null };

  if (athletesResult.error) errors.push(`athletes: ${athletesResult.error.message}`);

  return {
    cases,
    athletes: athletesResult.error
      ? []
      : ((athletesResult.data as RawAthlete[] | null) ?? []),
    sessions,
    errors,
  };
}
