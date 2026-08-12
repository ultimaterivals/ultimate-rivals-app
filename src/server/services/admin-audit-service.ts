import type { AdminAuditSnapshot } from "@/features/admin-audit/types";
import { fetchAdminAuditLogs } from "@/server/repositories/admin-audit-repository";

export async function getAdminAuditSnapshot(): Promise<AdminAuditSnapshot> {
  const raw = await fetchAdminAuditLogs();

  return {
    status: raw.errors.length > 0 ? "partial" : raw.entries.length ? "ready" : "empty",
    entries: raw.entries.map((entry) => ({
      id: entry.id,
      actorUserId: entry.actor_user_id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: entry.metadata,
      createdAt: entry.created_at,
      requestId: entry.request_id,
    })),
    sourceErrors: raw.errors,
  };
}
