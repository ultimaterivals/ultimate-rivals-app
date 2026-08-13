export type ReportStatus = "draft" | "finalized";
export type ReportActionStatus = "open" | "completed" | "waived";
export type ReportActionPriority = "low" | "medium" | "high" | "critical";

export type ReportTaskEvidence = {
  status: string;
  evidence: Record<string, unknown>;
};

export type ReportAction = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: ReportActionPriority;
  ownerId: string;
  dueAt: string;
  status: ReportActionStatus;
  waiverReason: string | null;
};

export type SessionReport = {
  id: string;
  sessionId: string;
  sessionName: string;
  endsAt: string;
  status: ReportStatus;
  reportVersion: number;
  whatWorked: string | null;
  risksAndFailures: string | null;
  keyLearning: string | null;
  decisionSummary: string | null;
  snapshotAt: string | null;
  finalizedAt: string | null;
  reopenReason: string | null;
  closed360: boolean;
  confirmedAthletes: number;
  presentAthletes: number;
  attendanceRatePct: number;
  upstreamTotal: number;
  upstreamPending: number;
  taskEvidence: Record<string, ReportTaskEvidence>;
  actions: ReportAction[];
};

export type AdminReportSnapshot = {
  generatedAt: string;
  reports: SessionReport[];
  metrics: {
    reports: number;
    drafts: number;
    finalized: number;
    openActions: number;
    overdueActions: number;
  };
  sourceErrors: string[];
};
