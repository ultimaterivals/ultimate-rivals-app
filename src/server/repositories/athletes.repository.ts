import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateAthleteInput } from "@/lib/validation/domain";
import { ensureData } from "./repository-error";

export interface AthleteSummary {
  id: string;
  public_name: string;
  full_name: string;
  status: string;
}
export async function listAthletes(
  client: SupabaseClient,
): Promise<readonly AthleteSummary[]> {
  const { data, error } = await client
    .from("athletes")
    .select("id,public_name,full_name,status")
    .order("public_name");
  if (error) throw error;
  return data ?? [];
}
export async function insertAthlete(
  client: SupabaseClient,
  input: CreateAthleteInput,
): Promise<AthleteSummary> {
  const { data, error } = await client
    .from("athletes")
    .insert({
      profile_id: input.profileId ?? null,
      public_name: input.publicName,
      full_name: input.fullName,
      birth_date: input.birthDate ?? null,
      gender: input.gender,
      dominant_hand: input.dominantHand ?? null,
      height_cm: input.heightCm ?? null,
      bio: input.bio ?? null,
    })
    .select("id,public_name,full_name,status")
    .single();
  return ensureData(data, error);
}

export interface AthleteProfileView {
  publicName: string;
  level: string | null;
  team: string | null;
  pole: string | null;
}
export async function getAthleteProfile(
  client: SupabaseClient,
  profileId: string,
): Promise<AthleteProfileView | null> {
  const { data: athlete, error } = await client
    .from("athletes")
    .select("id,public_name")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!athlete) return null;
  const [{ data: level }, { data: membership }] = await Promise.all([
    client
      .from("athlete_levels")
      .select("level")
      .eq("athlete_id", athlete.id)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("team_memberships")
      .select("teams(name,poles(name))")
      .eq("athlete_id", athlete.id)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const teamData = membership?.teams;
  const team = Array.isArray(teamData) ? teamData[0] : teamData;
  const poleData = team?.poles;
  const pole = Array.isArray(poleData) ? poleData[0] : poleData;
  return {
    publicName: athlete.public_name,
    level: level?.level ?? null,
    team: team?.name ?? null,
    pole: pole?.name ?? null,
  };
}
