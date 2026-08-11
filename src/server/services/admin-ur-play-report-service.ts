import type {
  AdminReportSnapshot,
  ReportAction,
  ReportActionPriority,
  ReportActionStatus,
  ReportTaskEvidence,
  SessionReport,
} from "@/features/admin-ur-play-report/types";
import { fetchAdminReportRepositoryData } from "@/server/repositories/admin-ur-play-report-repository";

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdminReportSnapshot(): Promise<AdminReportSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminReportRepositoryData();
  const sessions = new Map(raw.sessions.map((row) => [row.id, row]));
  const closed = new Set(
    raw.closures
      .filter((row) => row.status === "closed")
      .map((row) => row.session_id),
  );
  const now = new Date(generatedAt).getTime();

  const reports: SessionReport[] = raw.reports.map((report) => {
    const registrations = raw.registrations.filter(
      (row) => row.session_id === report.session_id,
    );
    const confirmed = registrations.filter(
      (row) => row.registration_status === "confirmed",
    );
    const present = confirmed.filter((row) =>
      ["checked_in", "present"].includes(row.attendance_status),
    );
    const taskRows = raw.tasks.filter(
      (row) =>
        row.session_id === report.session_id && row.task_key !== "report",
    );
    const taskEvidence = Object.fromEntries(
      taskRows.map((row) => [
        row.task_key,
        {
          status: row.status,
          evidence: row.evidence ?? {},
        } satisfies ReportTaskEvidence,
      ]),
    );
    const actions: ReportAction[] = raw.actions
      .filter((row) => row.report_id === report.id)
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority as ReportActionPriority,
        ownerId: row.owner_id,
        dueAt: row.due_at,
        status: row.status as ReportActionStatus,
        waiverReason: row.waiver_reason,
      }));
    const upstreamPending = taskRows.filter(
      (row) =>
        row.blocking && !["completed", "waived"].includes(row.status),
    ).length;
    const session = sessions.get(report.session_id);

    return {
      id: report.id,
      sessionId: report.session_id,
      sessionName: session?.name ?? "UR Play",
      endsAt: session?.ends_at ?? report.snapshot_at ?? generatedAt,
      status: report.status === "finalized" ? "finalized" : "draft",
      reportVersion: num(report.report_version),
      whatWorked: report.what_worked,
      risksAndFailures: report.risks_and_failures,
      keyLearning: report.key_learning,
      decisionSummary: report.decision_summary,
      snapshotAt: report.snapshot_at,
      finalizedAt: report.finalized_at,
      reopenReason: report.reopen_reason,
      closed360: closed.has(report.session_id),
      confirmedAthletes: confirmed.length,
      presentAthletes: present.length,
      attendanceRatePct:
        confirmed.length > 0
          ? Number(((present.length / confirmed.length) * 100).toFixed(2))
          : 0,
      upstreamTotal: taskRows.length,
      upstreamPending,
      taskEvidence,
      actions,
    };
  });

  const allActions = reports.flatMap((report) => report.actions);
  return {
    generatedAt,
    reports,
    metrics: {
      reports: reports.length,
      drafts: reports.filter((report) => report.status === "draft").length,
      finalized: reports.filter((report) => report.status === "finalized")
        .length,
      openActions: allActions.filter((action) => action.status === "open").length,
      overdueActions: allActions.filter(
        (action) =>
          action.status === "open" && new Date(action.dueAt).getTime() < now,
      ).length,
    },
    sourceErrors: raw.errors,
  };
}
