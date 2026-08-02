import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import {
  cancelMatchSchema,
  createMatchSchema,
  replaceMatchParticipantSchema,
} from "@/lib/validation/court-ops";

export async function createMatch(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = createMatchSchema.parse(input);
  const { data, error } = await client.rpc(
    "create_court_ops_match_with_squad",
    {
      target_session: value.sessionId,
      target_court: value.courtId,
      target_format: value.formatId,
      target_category: value.categoryId,
      target_level: value.level,
      side_a: value.sideA,
      side_b: value.sideB,
      side_a_reserves: value.sideAReserves,
      side_b_reserves: value.sideBReserves,
      side_a_roster: value.sideARosterId,
      side_b_roster: value.sideBRosterId,
      operation_id: value.operationId,
    },
  );
  if (error) throw error;
  return data;
}
export async function transitionMatch(
  client: SupabaseClient,
  _actor: SessionIdentity,
  matchId: string,
  status: "called" | "ready" | "in_progress" | "cancelled" | "abandoned",
  reason: string | null,
  operationId: string,
) {
  const { data, error } = await client.rpc("transition_court_ops_match", {
    target_match: matchId,
    target_status: status,
    reason,
    operation_id: operationId,
  });
  if (error) throw error;
  return data;
}
export async function cancelMatch(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  const value = cancelMatchSchema.parse(input);
  return transitionMatch(
    client,
    actor,
    value.matchId,
    "cancelled",
    value.reason,
    value.operationId,
  );
}
export async function replaceParticipant(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = replaceMatchParticipantSchema.parse(input);
  const { data, error } = await client.rpc("replace_match_participant", {
    target_participant: value.participantId,
    replacement_athlete: value.athleteId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
