import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { setAttendanceSchema } from "@/lib/validation/ur-play";
export async function setAttendance(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = setAttendanceSchema.parse(input);
  const { error } = await c.rpc("set_ur_play_attendance", {
    target_registration: v.registrationId,
    target_status: v.status,
  });
  if (error) throw error;
}
