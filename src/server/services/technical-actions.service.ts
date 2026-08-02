import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recordTechnicalActionSchema,
  voidTechnicalActionSchema,
} from "@/lib/validation/scoring";

export async function recordTechnicalAction(
  client: SupabaseClient,
  input: unknown,
) {
  const value = recordTechnicalActionSchema.parse(input);
  const { data, error } = await client.rpc("record_match_technical_action", {
    target_rally: value.rallyId,
    target_athlete: value.athleteId,
    target_action: value.actionType,
    correction_reason: value.correctionReason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function voidTechnicalAction(
  client: SupabaseClient,
  input: unknown,
) {
  const value = voidTechnicalActionSchema.parse(input);
  const { data, error } = await client.rpc("void_match_technical_action", {
    target_rally: value.rallyId,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
