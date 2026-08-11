import { createClient } from "@/lib/supabase/server";

type RawSession = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

type RawIncident = {
  id: string;
  session_id: string;
  athlete_id: string | null;
  incident_type: string;
  severity: string;
  status: string;
  occurred_at: string;
  description: string;
  immediate_action: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
};

type RawAthlete = { id: string; public_name: string; athlete_code: string };
type RawReview = {
  status: string;
  reviewed_at: string;
  no_incidents: boolean;
  notes: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
};

export async function fetchAdminIncidentDeskRepositoryData(
  requestedSessionId?: string,
) {
  const supabase = await createClient();
  const errors: string[] = [];

  const sessionsResult = await supabase
    .from("ur_play_sessions")
    .select("id,name,status,starts_at,ends_at")
    .in("status", ["in_progress", "completed"])
    .order("starts_at", { ascending: false })
    .limit(100);

  if (sessionsResult.error) {
    return {
      sessions: [] as RawSession[],
      selectedSessionId: null as string | null,
      incidents: [] as RawIncident[],
      athletes: [] as RawAthlete[],
      review: null as RawReview | null,
      readiness: null,
      errors: [`ur_play_sessions: ${sessionsResult.error.message}`],
    };
  }

  const sessions = (sessionsResult.data as RawSession[] | null) ?? [];
  const selectedSessionId =
    sessions.find((session) => session.id === requestedSessionId)?.id ??
    sessions[0]?.id ??
    null;

  if (!selectedSessionId) {
    return {
      sessions,
      selectedSessionId,
      incidents: [] as RawIncident[],
      athletes: [] as RawAthlete[],
      review: null as RawReview | null,
      readiness: null,
      errors,
    };
  }

  const [incidentsResult, reviewResult, readinessResult] = await Promise.all([
    supabase
      .from("ur_play_incidents")
      .select(
        "id,session_id,athlete_id,incident_type,severity,status,occurred_at,description,immediate_action,follow_up_required,follow_up_notes,resolution_notes,resolved_at",
      )
      .eq("session_id", selectedSessionId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("ur_play_incident_reviews")
      .select("status,reviewed_at,no_incidents,notes,reopened_at,reopen_reason")
      .eq("session_id", selectedSessionId)
      .maybeSingle(),
    supabase.rpc("get_ur_play_incident_snapshot", {
      target_session: selectedSessionId,
    }),
  ]);

  if (incidentsResult.error)
    errors.push(`ur_play_incidents: ${incidentsResult.error.message}`);
  if (reviewResult.error)
    errors.push(`ur_play_incident_reviews: ${reviewResult.error.message}`);
  if (readinessResult.error)
    errors.push(
      `get_ur_play_incident_snapshot: ${readinessResult.error.message}`,
    );

  const incidents = incidentsResult.error
    ? []
    : ((incidentsResult.data as RawIncident[] | null) ?? []);
  const athleteIds = [
    ...new Set(
      incidents
        .map((incident) => incident.athlete_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  let athletes: RawAthlete[] = [];
  if (athleteIds.length > 0) {
    const athletesResult = await supabase
      .from("athletes")
      .select("id,public_name,athlete_code")
      .in("id", athleteIds);
    if (athletesResult.error)
      errors.push(`athletes: ${athletesResult.error.message}`);
    else athletes = (athletesResult.data as RawAthlete[] | null) ?? [];
  }

  const readinessRows = Array.isArray(readinessResult.data)
    ? readinessResult.data
    : readinessResult.data
      ? [readinessResult.data]
      : [];

  return {
    sessions,
    selectedSessionId,
    incidents,
    athletes,
    review: reviewResult.error
      ? null
      : ((reviewResult.data as RawReview | null) ?? null),
    readiness: readinessResult.error ? null : (readinessRows[0] ?? null),
    errors,
  };
}
