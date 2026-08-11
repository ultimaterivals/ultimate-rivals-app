import { createClient } from "@/lib/supabase/server";

type RawReport = {
  id: string;
  session_id: string;
  status: string;
  report_version: number;
  system_snapshot: Record<string, unknown> | null;
  snapshot_at: string | null;
  what_worked: string | null;
  risks_and_failures: string | null;
  key_learning: string | null;
  decision_summary: string | null;
  finalized_at: string | null;
  reopen_reason: string | null;
};

type RawAction = {
  id: string;
  report_id: string;
  session_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  owner_id: string;
  due_at: string;
  status: string;
  waiver_reason: string | null;
};

type RawSession = { id: string; name: string; ends_at: string };
type RawClosure = { session_id: string; status: string };
type RawRegistration = {
  session_id: string;
  registration_status: string;
  attendance_status: string;
};
type RawTask = {
  session_id: string;
  task_key: string;
  status: string;
  blocking: boolean;
  evidence: Record<string, unknown> | null;
};

export async function fetchAdminReportRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const reportsResult = await supabase
    .from("ur_play_session_reports")
    .select(
      "id,session_id,status,report_version,system_snapshot,snapshot_at,what_worked,risks_and_failures,key_learning,decision_summary,finalized_at,reopen_reason",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (reportsResult.error) {
    errors.push(`ur_play_session_reports: ${reportsResult.error.message}`);
    return {
      reports: [] as RawReport[],
      actions: [] as RawAction[],
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      registrations: [] as RawRegistration[],
      tasks: [] as RawTask[],
      errors,
    };
  }

  const reports = (reportsResult.data as RawReport[] | null) ?? [];
  const sessionIds = reports.map((row) => row.session_id);
  const reportIds = reports.map((row) => row.id);
  if (sessionIds.length === 0) {
    return {
      reports,
      actions: [] as RawAction[],
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      registrations: [] as RawRegistration[],
      tasks: [] as RawTask[],
      errors,
    };
  }

  const [actionsResult, sessionsResult, closuresResult, registrationsResult, tasksResult] =
    await Promise.all([
      supabase
        .from("ur_play_report_actions")
        .select(
          "id,report_id,session_id,title,description,category,priority,owner_id,due_at,status,waiver_reason",
        )
        .in("report_id", reportIds)
        .order("due_at", { ascending: true }),
      supabase
        .from("ur_play_sessions")
        .select("id,name,ends_at")
        .in("id", sessionIds),
      supabase
        .from("ur_play_post_session_closures")
        .select("session_id,status")
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_registrations")
        .select("session_id,registration_status,attendance_status")
        .in("session_id", sessionIds)
        .limit(10000),
      supabase
        .from("ur_play_post_session_tasks")
        .select("session_id,task_key,status,blocking,evidence")
        .in("session_id", sessionIds)
        .limit(10000),
    ]);

  if (actionsResult.error)
    errors.push(`ur_play_report_actions: ${actionsResult.error.message}`);
  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  if (closuresResult.error)
    errors.push(`ur_play_post_session_closures: ${closuresResult.error.message}`);
  if (registrationsResult.error)
    errors.push(`ur_play_registrations: ${registrationsResult.error.message}`);
  if (tasksResult.error)
    errors.push(`ur_play_post_session_tasks: ${tasksResult.error.message}`);

  return {
    reports,
    actions: actionsResult.error
      ? []
      : ((actionsResult.data as RawAction[] | null) ?? []),
    sessions: sessionsResult.error
      ? []
      : ((sessionsResult.data as RawSession[] | null) ?? []),
    closures: closuresResult.error
      ? []
      : ((closuresResult.data as RawClosure[] | null) ?? []),
    registrations: registrationsResult.error
      ? []
      : ((registrationsResult.data as RawRegistration[] | null) ?? []),
    tasks: tasksResult.error ? [] : ((tasksResult.data as RawTask[] | null) ?? []),
    errors,
  };
}
