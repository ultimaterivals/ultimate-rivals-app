import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATHLETE_MIRROR_COOKIE } from "@/lib/auth/athlete-mirror-policy";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface AthleteViewerContext {
  athleteId: string;
  profileId: string | null;
  isMirror: boolean;
  identity: Awaited<ReturnType<typeof requireAnyRole>>;
  athlete: {
    id: string;
    publicName: string;
    athleteCode: string;
  };
}

export async function requireAthleteViewer(): Promise<AthleteViewerContext> {
  const identity = await requireAnyRole(["athlete", "admin"]);
  const client = await createClient();

  if (identity.role === "athlete") {
    const { data: athlete, error } = await client
      .from("athletes")
      .select("id,profile_id,public_name,athlete_code")
      .eq("profile_id", identity.userId)
      .maybeSingle();
    if (error) throw error;
    if (!athlete) redirect("/athlete/profile");
    return {
      athleteId: athlete.id,
      profileId: athlete.profile_id,
      isMirror: false,
      identity,
      athlete: {
        id: athlete.id,
        publicName: athlete.public_name,
        athleteCode: athlete.athlete_code,
      },
    };
  }

  const athleteId = (await cookies()).get(ATHLETE_MIRROR_COOKIE)?.value;
  if (!athleteId) redirect("/admin/preview");
  const { data: athlete, error } = await client
    .from("athletes")
    .select("id,profile_id,public_name,athlete_code")
    .eq("id", athleteId)
    .maybeSingle();
  if (error) throw error;
  if (!athlete) redirect("/admin/preview?invalid=1");

  return {
    athleteId: athlete.id,
    profileId: athlete.profile_id,
    isMirror: true,
    identity,
    athlete: {
      id: athlete.id,
      publicName: athlete.public_name,
      athleteCode: athlete.athlete_code,
    },
  };
}
