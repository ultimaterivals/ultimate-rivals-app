import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import { assignSessionStaffSchema } from "@/lib/validation/ur-play";
export async function assignStaff(
  c: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  assertAnyRole(a.role, ["admin"]);
  const v = assignSessionStaffSchema.parse(input);
  const { error } = await c
    .from("ur_play_session_staff")
    .insert({
      session_id: v.sessionId,
      profile_id: v.profileId,
      role: v.role,
      starts_at: v.startsAt,
    });
  if (error) throw error;
}
