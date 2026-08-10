import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATHLETE_PREVIEW_COOKIE } from "@/lib/auth/athlete-preview-policy";
import { getSessionIdentity } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AthleteViewerContext = {
  athleteId: string;
  userId: string | null;
  isPreview: boolean;
  athlete: {
    id: string;
    publicName: string;
    athleteCode: string;
  };
};

export async function requireAthleteViewer(): Promise<AthleteViewerContext> {
  const identity = await getSessionIdentity();
  if (!identity) redirect("/login");

  const client = await createClient();

  if (identity.role === "athlete") {
    const { data: athlete, error } = await client
      .from("athletes")
      .select("id,profile_id,public_name,athlete_code")
      .eq("profile_id", identity.userId)
      .maybeSingle();

    if (error) throw error;
    if (!athlete) redirect("/athlete/perfil");

    return {
      athleteId: athlete.id,
      userId: identity.userId,
      isPreview: false,
      athlete: {
        id: athlete.id,
        publicName: athlete.public_name,
        athleteCode: athlete.athlete_code,
      },
    };
  }

  if (identity.role !== "admin") redirect("/admin");

  const athleteId = (await cookies()).get(ATHLETE_PREVIEW_COOKIE)?.value;
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
    userId: athlete.profile_id,
    isPreview: true,
    athlete: {
      id: athlete.id,
      publicName: athlete.public_name,
      athleteCode: athlete.athlete_code,
    },
  };
}
