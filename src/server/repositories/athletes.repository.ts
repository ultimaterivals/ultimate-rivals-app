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
  id: string;
  athleteCode: string;
  publicName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  avatarSignedUrl: string | null;
  showProfilePhotoPublicly: boolean;
  heightCm: number | null;
  dominantHand: string | null;
  status: string;
  level: string | null;
  team: string | null;
  pole: string | null;
  teamLogoUrl: string | null;
  membershipRole: string | null;
  formations: readonly {
    id: string;
    name: string | null;
    level: string;
    format: string | null;
    category: string | null;
  }[];
}
export async function getAthleteProfile(
  client: SupabaseClient,
  profileId: string,
): Promise<AthleteProfileView | null> {
  const { data: athlete, error } = await client
    .from("athletes")
    .select(
      "id,athlete_code,public_name,bio,avatar_url,avatar_storage_path,show_profile_photo_publicly,height_cm,dominant_hand,status",
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!athlete) return null;
  const [{ data: level }, { data: membership }, { data: rosterMemberships }] =
    await Promise.all([
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
        .select("membership_type,teams(name,logo_url,poles(name))")
        .eq("athlete_id", athlete.id)
        .eq("status", "active")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("team_roster_members")
        .select(
          "team_rosters(id,name,level,status,competitive_formats(name),competitive_categories(name))",
        )
        .eq("athlete_id", athlete.id)
        .eq("status", "active"),
    ]);
  const teamData = membership?.teams;
  const team = Array.isArray(teamData) ? teamData[0] : teamData;
  const poleData = team?.poles;
  const pole = Array.isArray(poleData) ? poleData[0] : poleData;
  const avatarPath = athlete.avatar_storage_path ?? athlete.avatar_url ?? null;
  const { data: signedAvatar } = avatarPath
    ? await client.storage
        .from("athlete-avatars")
        .createSignedUrl(avatarPath, 60 * 10)
    : { data: null };
  return {
    id: athlete.id,
    athleteCode: athlete.athlete_code,
    publicName: athlete.public_name,
    bio: athlete.bio,
    avatarUrl: athlete.avatar_url,
    avatarPath,
    avatarSignedUrl: signedAvatar?.signedUrl ?? null,
    showProfilePhotoPublicly: Boolean(athlete.show_profile_photo_publicly),
    heightCm: athlete.height_cm,
    dominantHand: athlete.dominant_hand,
    status: athlete.status,
    level: level?.level ?? null,
    team: team?.name ?? null,
    pole: pole?.name ?? null,
    teamLogoUrl: team?.logo_url ?? null,
    membershipRole: membership?.membership_type ?? null,
    formations: (rosterMemberships ?? []).flatMap((row) => {
      const raw = row.team_rosters;
      const roster = Array.isArray(raw) ? raw[0] : raw;
      if (!roster || roster.status === "archived") return [];
      const format = Array.isArray(roster.competitive_formats)
        ? roster.competitive_formats[0]
        : roster.competitive_formats;
      const category = Array.isArray(roster.competitive_categories)
        ? roster.competitive_categories[0]
        : roster.competitive_categories;
      return [
        {
          id: roster.id,
          name: roster.name,
          level: roster.level,
          format: format?.name ?? null,
          category: category?.name ?? null,
        },
      ];
    }),
  };
}
