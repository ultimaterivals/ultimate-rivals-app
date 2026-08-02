import type { SupabaseClient } from "@supabase/supabase-js";
import {
  correctRallySchema,
  recordRallySchema,
  reverseRallySchema,
} from "@/lib/validation/scoring";

export async function recordRally(client: SupabaseClient, input: unknown) {
  const value = recordRallySchema.parse(input);
  const { data, error } = await client.rpc("record_match_rally", {
    target_match: value.matchId,
    target_winning_side: value.winningSideId,
    expected_rally_number: value.expectedRallyNumber,
    client_sequence: value.clientSequence,
    client_recorded_at: value.clientRecordedAt,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function correctRally(client: SupabaseClient, input: unknown) {
  const value = correctRallySchema.parse(input);
  const { data, error } = await client.rpc("correct_match_rally", {
    target_rally: value.rallyId,
    target_correction: value.correctionType,
    replacement_winning_side: value.replacementWinningSideId,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function reverseRally(client: SupabaseClient, input: unknown) {
  const value = reverseRallySchema.parse(input);
  return correctRally(client, {
    ...value,
    correctionType: "reverse",
    replacementWinningSideId: null,
  });
}
