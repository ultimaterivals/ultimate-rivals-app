import { createClient } from "@/lib/supabase/server";

type RawSession = {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string;
  venue_id: string;
};

type RawTask = {
  id: string;
  session_id: string;
  task_key: string;
  status: string;
  managed_by: string;
  blocking: boolean;
  due_at: string;
  notes: string | null;
  evidence: Record<string, unknown> | null;
  completed_at: string | null;
  waived_at: string | null;
  waiver_reason: string | null;
};

type RawClosure = {
  session_id: string;
  status: string;
  closed_at: string;
  notes: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
};

type RawRegistration = {
  session_id: string;
  registration_status: string;
  attendance_status: string;
  payment_status: string;
};

type RawLookup = { id: string; name: string };

export async function fetchAdminPostSessionRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const [sessionsResult, polesResult, venuesResult] = await Promise.all([
    supabase
      .from("ur_play_sessions")
      .select("id,name,status,starts_at,ends_at,pole_id,venue_id")
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(100),
    supabase.from("poles").select("id,name").limit(100),
    supabase.from("venues").select("id,name").limit(1000),
  ]);

  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  if (polesResult.error) errors.push(`poles: ${polesResult.error.message}`);
  if (venuesResult.error) errors.push(`venues: ${venuesResult.error.message}`);

  const sessions = sessionsResult.error
    ? []
    : ((sessionsResult.data as RawSession[] | null) ?? []);
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return {
      sessions,
      poles: (polesResult.data as RawLookup[] | null) ?? [],
      venues: (venuesResult.data as RawLookup[] | null) ?? [],
      tasks: [] as RawTask[],
      closures: [] as RawClosure[],
      registrations: [] as RawRegistration[],
      readiness: [] as Array<{
        sessionId: string;
        row: Record<string, unknown> | null;
      }>,
      errors,
    };
  }

  const [tasksResult, closuresResult, registrationsResult, ...readinessResults] =
    await Promise.all([
      supabase
        .from("ur_play_post_session_tasks")
        .select(
          "id,session_id,task_key,status,managed_by,blocking,due_at,notes,evidence,completed_at,waived_at,waiver_reason",
        )
        .in("session_id", sessionIds)
        .order("due_at", { ascending: true }),
      supabase
        .from("ur_play_post_session_closures")
        .select(
          "session_id,status,closed_at,notes,reopened_at,reopen_reason",
        )
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_registrations")
        .select(
          "session_id,registration_status,attendance_status,payment_status",
        )
        .in("session_id", sessionIds)
        .limit(10000),
      ...sessionIds.map((sessionId) =>
        supabase.rpc("get_ur_play_post_session_readiness", {
          target_session: sessionId,
        }),
      ),
    ]);

  if (tasksResult.error)
    errors.push(`ur_play_post_session_tasks: ${tasksResult.error.message}`);
  if (closuresResult.error)
    errors.push(`ur_play_post_session_closures: ${closuresResult.error.message}`);
  if (registrationsResult.error)
    errors.push(`ur_play_registrations: ${registrationsResult.error.message}`);

  const readiness = readinessResults.map((result, index) => {
    if (result.error) {
      errors.push(
        `post_session_readiness ${sessionIds[index]}: ${result.error.message}`,
      );
      return { sessionId: sessionIds[index], row: null };
    }
    const raw = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      sessionId: sessionIds[index],
      row: (raw as Record<string, unknown> | null) ?? null,
    };
  });

  return {
    sessions,
    poles: polesResult.error
      ? []
      : ((polesResult.data as RawLookup[] | null) ?? []),
    venues: venuesResult.error
      ? []
      : ((venuesResult.data as RawLookup[] | null) ?? []),
    tasks: tasksResult.error
      ? []
      : ((tasksResult.data as RawTask[] | null) ?? []),
    closures: closuresResult.error
      ? []
      : ((closuresResult.data as RawClosure[] | null) ?? []),
    registrations: registrationsResult.error
      ? []
      : ((registrationsResult.data as RawRegistration[] | null) ?? []),
    readiness,
    errors,
  };
}
