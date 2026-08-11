export type DevelopmentCaseStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "waived";

export type DevelopmentResolutionAction =
  | "continue_observation"
  | "start_leveling_process"
  | "queue_level_review"
  | "development_followup_recorded"
  | "no_change_required"
  | "other";

export type DevelopmentCase = {
  id: string;
  sessionId: string;
  sessionName: string;
  sessionEndsAt: string;
  athleteId: string;
  athleteName: string;
  athleteCode: string;
  currentLevel: string | null;
  levelingProcessId: string | null;
  reasons: string[];
  evidence: Record<string, unknown>;
  status: DevelopmentCaseStatus;
  recommendedAction: string | null;
  resolutionAction: string | null;
  resolutionNotes: string | null;
  dueAt: string;
  resolvedAt: string | null;
  waiverReason: string | null;
};

export type DevelopmentSession = {
  id: string;
  name: string;
  endsAt: string;
  cases: DevelopmentCase[];
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    waived: number;
    overdue: number;
  };
};

export type AdminDevelopmentSnapshot = {
  generatedAt: string;
  sessions: DevelopmentSession[];
  metrics: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    waived: number;
    overdue: number;
  };
  sourceErrors: string[];
};