import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import {
  addWalkInSchema,
  checkInAthleteSchema,
  undoCheckInSchema,
} from "@/lib/validation/ur-play";

export async function addWalkIn(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = addWalkInSchema.parse(input);
  const { data, error } = await client.rpc("walkin_ur_play", {
    target_session: value.sessionId,
    target_athlete: value.athleteId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
export async function checkIn(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = checkInAthleteSchema.parse(input);
  const { error } = await c.rpc("checkin_ur_play", {
    target_registration: v.registrationId,
    checkin_method: v.method,
    operation_id: v.operationId,
  });
  if (error) throw error;
}
export async function undo(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = undoCheckInSchema.parse(input);
  const { error } = await c.rpc("set_ur_play_attendance", {
    target_registration: v.registrationId,
    target_status: "expected",
  });
  if (error) throw error;
}
