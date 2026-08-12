import { createClient } from "@/lib/supabase/server";

export type RawAuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  request_id: string | null;
};

export async function fetchAdminAuditLogs() {
  const supabase = await createClient();
  const result = await supabase
    .from("audit_logs")
    .select(
      "id,actor_user_id,action,entity_type,entity_id,metadata,created_at,request_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    entries: result.error ? [] : ((result.data as RawAuditLog[] | null) ?? []),
    errors: result.error ? [`audit_logs: ${result.error.message}`] : [],
  };
}
