import { createClient } from "@/lib/supabase/server";

type RawFollowup = {
  id: string;
  source_session_id: string;
  athlete_id: string;
  participation_number: number;
  cohort: string;
  status: string;
  suggested_opportunity_id: string | null;
  due_at: string;
  contacted_at: string | null;
  contact_channel: string | null;
  contact_notes: string | null;
  converted_at: string | null;
  converted_session_id: string | null;
  waiver_reason: string | null;
};

type RawAthlete = { id: string; public_name: string; athlete_code: string };
type RawSession = { id: string; name: string; ends_at: string };
type RawOpportunity = { id: string; title: string; starts_at: string | null };

export async function fetchAdminRetentionRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const followupsResult = await supabase
    .from("ur_play_retention_followups")
    .select(
      "id,source_session_id,athlete_id,participation_number,cohort,status,suggested_opportunity_id,due_at,contacted_at,contact_channel,contact_notes,converted_at,converted_session_id,waiver_reason",
    )
    .order("due_at", { ascending: true })
    .limit(1000);

  if (followupsResult.error) {
    errors.push(`ur_play_retention_followups: ${followupsResult.error.message}`);
    return {
      followups: [] as RawFollowup[],
      athletes: [] as RawAthlete[],
      sessions: [] as RawSession[],
      opportunities: [] as RawOpportunity[],
      errors,
    };
  }

  const followups = (followupsResult.data as RawFollowup[] | null) ?? [];
  if (followups.length === 0) {
    return {
      followups,
      athletes: [] as RawAthlete[],
      sessions: [] as RawSession[],
      opportunities: [] as RawOpportunity[],
      errors,
    };
  }

  const athleteIds = [...new Set(followups.map((row) => row.athlete_id))];
  const sessionIds = [
    ...new Set(
      followups.flatMap((row) =>
        row.converted_session_id
          ? [row.source_session_id, row.converted_session_id]
          : [row.source_session_id],
      ),
    ),
  ];
  const opportunityIds = [
    ...new Set(
      followups
        .map((row) => row.suggested_opportunity_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [athletesResult, sessionsResult, opportunitiesResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("id,public_name,athlete_code")
      .in("id", athleteIds),
    supabase
      .from("ur_play_sessions")
      .select("id,name,ends_at")
      .in("id", sessionIds),
    opportunityIds.length > 0
      ? supabase
          .from("demand_opportunities")
          .select("id,title,starts_at")
          .in("id", opportunityIds)
      : Promise.resolve({ data: [] as RawOpportunity[], error: null }),
  ]);

  if (athletesResult.error) errors.push(`athletes: ${athletesResult.error.message}`);
  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  if (opportunitiesResult.error)
    errors.push(`demand_opportunities: ${opportunitiesResult.error.message}`);

  return {
    followups,
    athletes: athletesResult.error
      ? []
      : ((athletesResult.data as RawAthlete[] | null) ?? []),
    sessions: sessionsResult.error
      ? []
      : ((sessionsResult.data as RawSession[] | null) ?? []),
    opportunities: opportunitiesResult.error
      ? []
      : ((opportunitiesResult.data as RawOpportunity[] | null) ?? []),
    errors,
  };
}
