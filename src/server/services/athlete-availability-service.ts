import type {
  AthleteAvailabilitySnapshot,
  AthleteAvailabilityWindow,
} from "@/features/athlete-availability/types";
import { fetchAthleteAvailabilityRepositoryData } from "@/server/repositories/athlete-availability-repository";

export async function getAthleteAvailabilitySnapshot(
  subject: string | { userId?: string | null; athleteId?: string | null },
): Promise<AthleteAvailabilitySnapshot> {
  const input =
    typeof subject === "string"
      ? { userId: subject, athleteId: null }
      : subject;
  const raw = await fetchAthleteAvailabilityRepositoryData(input);
  const poleNames = new Map(raw.poles.map((pole) => [pole.id, pole.name]));

  const windows: AthleteAvailabilityWindow[] = raw.windows.map((window) => ({
    id: window.id,
    dayOfWeek: window.day_of_week,
    startsAt: window.starts_at,
    endsAt: window.ends_at,
    poleId: window.pole_id,
    poleName: window.pole_id ? (poleNames.get(window.pole_id) ?? null) : null,
    modality: window.modality,
    formatCodes: window.format_codes ?? [],
    categoryCodes: window.category_codes ?? [],
    validFrom: window.valid_from,
    validUntil: window.valid_until,
    active: window.active,
  }));

  return {
    athleteId: raw.athleteId,
    windows,
    poles: raw.poles,
    sourceErrors: raw.errors,
  };
}
