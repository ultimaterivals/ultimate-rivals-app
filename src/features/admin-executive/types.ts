export type ExecutiveSourceStatus = "empty" | "partial" | "ready";
export type ExecutiveCriticality = "critical" | "essential" | "support";
export type ExecutiveAssignmentStatus =
  | "planned"
  | "active"
  | "paused"
  | "ended";
export type ExecutivePriority = "p0" | "p1" | "p2" | "p3";
export type ExecutiveWorkStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "review"
  | "done"
  | "cancelled";
export type ExecutiveSignal = "green" | "yellow" | "red";

export type ExecutiveWorkstream = {
  id: string;
  code: string;
  name: string;
  purpose: string;
  position: number;
  functionCount: number;
  coveredFunctionCount: number;
  openWorkItemCount: number;
};

export type ExecutiveFunction = {
  id: string;
  workstreamId: string;
  code: string;
  title: string;
  mission: string;
  criticality: ExecutiveCriticality;
  expectedOutcomes: string[];
  performanceIndicators: string[];
  decisionAuthority: string;
  weeklyRitual: string | null;
  assignment: {
    id: string;
    profileId: string;
    displayName: string;
    status: ExecutiveAssignmentStatus;
    reviewDueAt: string | null;
    allocationPercent: number;
  } | null;
};

export type ExecutiveWorkItem = {
  id: string;
  workstreamId: string;
  functionId: string | null;
  assigneeProfileId: string | null;
  assigneeName: string | null;
  title: string;
  description: string | null;
  priority: ExecutivePriority;
  status: ExecutiveWorkStatus;
  signal: ExecutiveSignal;
  dueAt: string | null;
  acceptanceCriteria: string;
  resultSummary: string | null;
  evidenceUrl: string | null;
  blockedReason: string | null;
};

export type ExecutiveProfile = {
  id: string;
  displayName: string;
  role: string;
};

export type AdminExecutiveSnapshot = {
  status: ExecutiveSourceStatus;
  workstreams: ExecutiveWorkstream[];
  functions: ExecutiveFunction[];
  workItems: ExecutiveWorkItem[];
  profiles: ExecutiveProfile[];
  focusItems: ExecutiveWorkItem[];
  criticalItems: ExecutiveWorkItem[];
  metrics: {
    workstreams: number;
    functions: number;
    coveredFunctions: number;
    criticalUncovered: number;
    activeFocus: number;
    blocked: number;
    overdue: number;
  };
  sourceErrors: string[];
};
