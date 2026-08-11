export type PostSessionTaskKey =
  | "ranking_data"
  | "ur_coins"
  | "finance"
  | "incidents"
  | "development"
  | "media"
  | "retention"
  | "feedback"
  | "report";

export type PostSessionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "waived";

export type PostSessionTask = {
  id: string;
  key: PostSessionTaskKey;
  status: PostSessionTaskStatus;
  managedBy: "system" | "human";
  blocking: boolean;
  dueAt: string;
  notes: string | null;
  evidence: Record<string, unknown>;
  completedAt: string | null;
  waivedAt: string | null;
  waiverReason: string | null;
};

export type PostSessionReadiness = {
  totalTasks: number;
  completedTasks: number;
  waivedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  ready: boolean;
  closed: boolean;
};

export type PostSessionSession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleName: string;
  venueName: string;
  confirmedAthletes: number;
  presentAthletes: number;
  paymentConfirmed: number;
  paymentPending: number;
  tasks: PostSessionTask[];
  readiness: PostSessionReadiness;
  closure: {
    status: "closed" | "reopened";
    closedAt: string;
    notes: string | null;
    reopenedAt: string | null;
    reopenReason: string | null;
  } | null;
};

export type AdminPostSessionSnapshot = {
  sessions: PostSessionSession[];
  metrics: {
    total: number;
    pending: number;
    ready: number;
    closed: number;
    overdue: number;
  };
  sourceErrors: string[];
};
