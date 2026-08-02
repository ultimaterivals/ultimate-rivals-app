import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { setQueueStatusSchema } from "@/lib/validation/court-ops";
export async function setQueueStatus(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = setQueueStatusSchema.parse(input);
  const { data, error } = await client.rpc("set_match_queue_status", {
    target_entry: value.entryId,
    target_status: value.status,
  });
  if (error) throw error;
  return data;
}
