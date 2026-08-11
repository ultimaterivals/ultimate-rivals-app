export type MediaDeliverableStatus =
  | "pending"
  | "in_progress"
  | "published"
  | "waived";

export type MediaChannel =
  | "instagram_post"
  | "instagram_story"
  | "reel"
  | "youtube"
  | "whatsapp"
  | "app"
  | "other";

export type MediaDeliverable = {
  id: string;
  sessionId: string;
  key: string;
  label: string;
  description: string;
  status: MediaDeliverableStatus;
  blocking: boolean;
  dueAt: string;
  channel: MediaChannel | null;
  publicationUrl: string | null;
  mediaAssetId: string | null;
  notes: string | null;
  publishedAt: string | null;
  waiverReason: string | null;
};

export type MediaSession = {
  id: string;
  name: string;
  endsAt: string;
  closed: boolean;
  deliverables: MediaDeliverable[];
  counts: {
    total: number;
    blocking: number;
    published: number;
    waived: number;
    pending: number;
    overdue: number;
    ready: boolean;
  };
};

export type AdminMediaSnapshot = {
  generatedAt: string;
  sessions: MediaSession[];
  metrics: {
    total: number;
    published: number;
    pending: number;
    overdue: number;
    readySessions: number;
  };
  sourceErrors: string[];
};