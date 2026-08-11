export type RetentionFollowupStatus =
  | "pending"
  | "contacted"
  | "converted"
  | "waived";

export type RetentionFollowup = {
  id: string;
  sourceSessionId: string;
  sourceSessionName: string;
  sourceSessionEndsAt: string;
  athleteId: string;
  athleteName: string;
  athleteCode: string;
  participationNumber: number;
  cohort: "first_time" | "returning" | "recurring";
  status: RetentionFollowupStatus;
  dueAt: string;
  contactedAt: string | null;
  contactChannel: string | null;
  contactNotes: string | null;
  convertedAt: string | null;
  convertedSessionId: string | null;
  waiverReason: string | null;
  suggestedOpportunityId: string | null;
  suggestedOpportunityTitle: string | null;
  suggestedOpportunityStartsAt: string | null;
};

export type AdminRetentionSnapshot = {
  generatedAt: string;
  followups: RetentionFollowup[];
  metrics: {
    total: number;
    pending: number;
    contacted: number;
    converted: number;
    waived: number;
    overdue: number;
    conversionRate: number;
  };
  sourceErrors: string[];
};
