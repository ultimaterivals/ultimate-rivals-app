import type { SupabaseClient } from "@supabase/supabase-js";
import {
  homologateMatchSchema,
  requestMatchCorrectionSchema,
  submitMatchForReviewSchema,
  voidMatchSchema,
} from "@/lib/validation/scoring";

export async function submitForReview(client: SupabaseClient, input: unknown) {
  const value = submitMatchForReviewSchema.parse(input);
  const { data, error } = await client.rpc("submit_match_for_review", {
    target_match: value.matchId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function homologateResult(client: SupabaseClient, input: unknown) {
  const value = homologateMatchSchema.parse(input);
  const { data, error } = await client.rpc("homologate_match_result", {
    target_match: value.matchId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function requestCorrection(
  client: SupabaseClient,
  input: unknown,
) {
  const value = requestMatchCorrectionSchema.parse(input);
  const { data, error } = await client.rpc("request_match_result_correction", {
    target_match: value.matchId,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function voidResult(client: SupabaseClient, input: unknown) {
  const value = voidMatchSchema.parse(input);
  const { data, error } = await client.rpc("void_match_result", {
    target_match: value.matchId,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
