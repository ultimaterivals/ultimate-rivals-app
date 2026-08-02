import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import {
  addReserveSchema,
  confirmReservePresenceSchema,
  promoteReserveToStarterSchema,
  removeReserveSchema,
} from "@/lib/validation/court-ops";

export async function addReserve(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = addReserveSchema.parse(input);
  const { data, error } = await client.rpc("add_match_reserve", {
    target_match: value.matchId,
    target_side: value.sideId,
    target_athlete: value.athleteId,
    target_roster: value.rosterId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function removeReserve(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = removeReserveSchema.parse(input);
  const { data, error } = await client.rpc("remove_match_reserve", {
    target_member: value.memberId,
    disposition: value.disposition,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function confirmReservePresence(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = confirmReservePresenceSchema.parse(input);
  const { data, error } = await client.rpc("set_match_reserve_presence", {
    target_member: value.memberId,
    target_presence: value.presence,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}

export async function promoteReserveToStarter(
  client: SupabaseClient,
  _actor: SessionIdentity,
  input: unknown,
) {
  const value = promoteReserveToStarterSchema.parse(input);
  const { data, error } = await client.rpc("promote_match_reserve", {
    target_reserve: value.reserveMemberId,
    target_participant: value.participantId,
    outgoing_disposition: value.outgoingDisposition,
    reason: value.reason,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
