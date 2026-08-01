import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import * as schemas from "@/lib/validation/athlete";
import * as repo from "@/server/repositories/athlete360.repository";
const admin = (actor: SessionIdentity) => assertAnyRole(actor.role, ["admin"]);
export async function createAthlete(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  admin(actor);
  return repo.insertAthlete360(
    client,
    schemas.createAthlete360Schema.parse(input),
  );
}
export async function updateOwnProfile(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  assertAnyRole(actor.role, ["athlete"]);
  return repo.updateOwnAthlete(
    client,
    schemas.updateOwnAthleteProfileSchema.parse(input),
  );
}
export async function updateByAdmin(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  admin(actor);
  const v = schemas.updateAthleteByAdminSchema.parse(input);
  const { athleteId, ...fields } = v;
  const payload = {
    public_name: fields.publicName,
    full_name: fields.fullName,
    birth_date: fields.birthDate,
    gender: fields.gender,
    dominant_hand: fields.dominantHand,
    height_cm: fields.heightCm,
    phone: fields.phone,
    email_contact: fields.emailContact,
    instagram_handle: fields.instagramHandle,
    city: fields.city,
    state: fields.state,
    bio: fields.bio,
    status: fields.status,
  };
  const { data, error } = await client
    .from("athletes")
    .update(payload)
    .eq("id", athleteId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
export async function assignProfile(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  admin(actor);
  const v = schemas.assignAthleteProfileSchema.parse(input);
  const { data, error } = await client
    .from("athletes")
    .update({ profile_id: v.profileId })
    .eq("id", v.athleteId)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
export async function setStatus(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
  status: "archived" | "active",
) {
  admin(actor);
  const v = schemas.athleteStatusSchema.parse(input);
  const { error } = await client
    .from("athletes")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
    })
    .eq("id", v.athleteId);
  if (error) throw error;
}
export async function assignLevel(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  admin(actor);
  const v = schemas.assignAthleteLevelSchema.parse(input);
  const { data, error } = await client.rpc("assign_athlete_level", {
    target_athlete_id: v.athleteId,
    target_season_id: v.seasonId,
    target_level: v.level,
    effective_at: v.startsAt,
    assignment_reason: v.reason ?? null,
  });
  if (error) throw error;
  return data;
}
export async function createNote(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  admin(actor);
  const v = schemas.createAthleteNoteSchema.parse(input);
  const { data, error } = await client
    .from("athlete_notes")
    .insert({
      athlete_id: v.athleteId,
      author_user_id: actor.userId,
      note_type: v.noteType,
      content: v.content,
      visibility: v.visibility,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
