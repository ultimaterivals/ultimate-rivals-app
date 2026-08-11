export type FeedbackRequestStatus =
  | "pending"
  | "sent"
  | "responded"
  | "waived";

export type FeedbackChannel =
  | "app"
  | "whatsapp"
  | "email"
  | "instagram"
  | "phone"
  | "other";

export type FeedbackRequest = {
  id: string;
  sessionId: string;
  athleteId: string;
  athleteName: string;
  athleteCode: string;
  status: FeedbackRequestStatus;
  channel: FeedbackChannel | null;
  dispatchMode: "system" | "human" | null;
  dispatchEvidence: string | null;
  sentAt: string | null;
  score: number | null;
  comment: string | null;
  respondedAt: string | null;
  waiverReason: string | null;
};

export type FeedbackSession = {
  id: string;
  name: string;
  endsAt: string;
  closed: boolean;
  requests: FeedbackRequest[];
  metrics: {
    eligible: number;
    sent: number;
    responded: number;
    waived: number;
    pending: number;
    responseRatePct: number;
    averageRecommendationScore: number | null;
    standardNpsScore: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    targetAbove8: boolean | null;
    ready: boolean;
  };
};

export type AdminFeedbackSnapshot = {
  generatedAt: string;
  sessions: FeedbackSession[];
  metrics: {
    eligible: number;
    pendingDispatch: number;
    responses: number;
    responseRatePct: number;
    averageRecommendationScore: number | null;
    standardNpsScore: number | null;
    detractors: number;
  };
  sourceErrors: string[];
};
