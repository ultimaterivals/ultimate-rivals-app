import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { setPaymentStatusSchema } from "@/lib/validation/ur-play";
export async function setPayment(
  c: SupabaseClient,
  _a: SessionIdentity,
  input: unknown,
) {
  const v = setPaymentStatusSchema.parse(input);
  const { error } = await c.rpc("set_ur_play_payment", {
    target_registration: v.registrationId,
    target_status: v.status,
    target_method: v.method,
    target_reference: v.reference ?? null,
  });
  if (error) throw error;
}
