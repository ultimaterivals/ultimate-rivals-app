import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import {
  registerAthleteSchema,
  cancelRegistrationSchema,
} from "@/lib/validation/ur-play";
export async function register(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = registerAthleteSchema.parse(input);
  const { data, error } = await c.rpc("register_ur_play", {
    target_session: v.sessionId,
    target_athlete: v.athleteId,
    target_source: v.source,
    operation_id: v.operationId,
  });
  if (error) throw error;
  return data;
}
export async function cancel(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = cancelRegistrationSchema.parse(input);
  const { error } = await c.rpc("cancel_ur_play_registration", {
    target_registration: v.registrationId,
    reason: v.reason,
    operation_id: v.operationId,
  });
  if (error) throw error;
}
