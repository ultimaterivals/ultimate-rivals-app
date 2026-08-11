import { createClient } from "@/lib/supabase/server";

export type RawAvailabilityWindow = {
  id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  pole_id: string | null;
  modality: string;
  format_codes: string[] | null;
  category_codes: string[] | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
};

export type RawAvailabilityPole = {
  id: string;
  name: string;
};

export async function fetchAthleteAvailabilityRepositoryData({
  userId,
  athleteId: explicitAthleteId,
}: {
  userId?: string | null;
  athleteId?: string | null;
}) {
  const supabase = await createClient();
  const errors: string[] = [];

  let athleteId = explicitAthleteId ?? null;

  if (!athleteId && userId) {
    const athleteResult = await supabase
      .from("athletes")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (athleteResult.error) {
      errors.push(`athletes: ${athleteResult.error.message}`);
    }

    athleteId = athleteResult.data?.id ?? null;
  }

  const polesResult = await supabase
    .from("poles")
    .select("id,name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (polesResult.error) {
    errors.push(`poles: ${polesResult.error.message}`);
  }

  if (!athleteId) {
    return {
      athleteId: null,
      windows: [] as RawAvailabilityWindow[],
      poles: polesResult.error
        ? []
        : ((polesResult.data as RawAvailabilityPole[] | null) ?? []),
      errors,
    };
  }

  const windowsResult = await supabase
    .from("athlete_availability_windows")
    .select(
      "id,day_of_week,starts_at,ends_at,pole_id,modality,format_codes,category_codes,valid_from,valid_until,active",
    )
    .eq("athlete_id", athleteId)
    .eq("active", true)
    .order("day_of_week", { ascending: true })
    .order("starts_at", { ascending: true });

  if (windowsResult.error) {
    errors.push(`athlete_availability_windows: ${windowsResult.error.message}`);
  }

  return {
    athleteId,
    windows: windowsResult.error
      ? []
      : ((windowsResult.data as RawAvailabilityWindow[] | null) ?? []),
    poles: polesResult.error
      ? []
      : ((polesResult.data as RawAvailabilityPole[] | null) ?? []),
    errors,
  };
}
