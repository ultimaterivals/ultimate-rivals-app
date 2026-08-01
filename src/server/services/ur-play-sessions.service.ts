import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import {
  createUrPlaySessionSchema,
  transitionUrPlaySessionSchema,
} from "@/lib/validation/ur-play";
export async function createSession(
  c: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
  courtIds: string[],
  scopes: {
    formatId: string | null;
    categoryId: string | null;
    level: string | null;
  }[],
) {
  assertAnyRole(a.role, ["admin"]);
  const v = createUrPlaySessionSchema.parse(input);
  const { data, error } = await c
    .from("ur_play_sessions")
    .insert({
      season_id: v.seasonId,
      season_cycle_id: v.seasonCycleId ?? null,
      pole_id: v.poleId,
      venue_id: v.venueId,
      name: v.name,
      session_date: v.sessionDate,
      starts_at: v.startsAt,
      ends_at: v.endsAt,
      registration_opens_at: v.registrationOpensAt ?? null,
      registration_closes_at: v.registrationClosesAt ?? null,
      checkin_opens_at: v.checkinOpensAt ?? null,
      checkin_closes_at: v.checkinClosesAt ?? null,
      capacity: v.capacity,
      waitlist_capacity: v.waitlistCapacity ?? null,
      price_amount: v.priceAmount ?? null,
      notes: v.notes ?? null,
      created_by: a.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  for (const [index, courtId] of courtIds.entries()) {
    const { error: e } = await c
      .from("ur_play_session_courts")
      .insert({ session_id: data.id, court_id: courtId, position: index + 1 });
    if (e) throw e;
  }
  for (const scope of scopes) {
    const { error: e } = await c
      .from("ur_play_session_scopes")
      .insert({
        session_id: data.id,
        format_id: scope.formatId,
        category_id: scope.categoryId,
        level: scope.level,
      });
    if (e) throw e;
  }
  return data;
}
export async function transitionSession(
  c: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  assertAnyRole(a.role, ["admin", "operator"]);
  const v = transitionUrPlaySessionSchema.parse(input);
  const { error } = await c.rpc("transition_ur_play_session", {
    target_session_id: v.sessionId,
    target_status: v.status,
    cancel_reason: v.reason ?? null,
  });
  if (error) throw error;
}
