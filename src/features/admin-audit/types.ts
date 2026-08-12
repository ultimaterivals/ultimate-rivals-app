export type AdminAuditEntry = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  requestId: string | null;
};

export type AdminAuditSnapshot = {
  status: "ready" | "empty" | "partial";
  entries: AdminAuditEntry[];
  sourceErrors: string[];
};
