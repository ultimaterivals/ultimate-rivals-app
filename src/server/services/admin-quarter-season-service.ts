import type {
  AdminQuarterSeasonSnapshot,
  QuarterSeason,
  QuarterSeasonCompatibilityCycle,
  QuarterSeasonWeek,
} from "@/features/admin-quarter-season/types";
import { fetchAdminQuarterSeasonRepositoryData } from "@/server/repositories/admin-quarter-season-repository";

export async function getAdminQuarterSeasonSnapshot(
  now = new Date(),
): Promise<AdminQuarterSeasonSnapshot> {
  const raw = await fetchAdminQuarterSeasonRepositoryData();

  const weeks = raw.weeks.map(
    (item): QuarterSeasonWeek => ({
      id: String(item.id),
      seasonId: String(item.season_id),
      weekNumber: Number(item.week_number),
      name: String(item.name),
      phase: String(item.phase),
      objective: String(item.objective),
      primaryProduct: item.primary_product
        ? String(item.primary_product)
        : null,
      startsAt: String(item.starts_at),
      endsAt: String(item.ends_at),
      status: String(item.status),
    }),
  );

  const cycles = raw.cycles.map(
    (item): QuarterSeasonCompatibilityCycle => ({
      id: String(item.id),
      seasonId: String(item.season_id),
      cycleNumber: Number(item.cycle_number),
      name: String(item.name),
      startsAt: String(item.starts_at),
      endsAt: String(item.ends_at),
      status: String(item.status),
    }),
  );

  const seasons: QuarterSeason[] = raw.seasons.map((item) => {
    const seasonWeeks = weeks
      .filter((week) => week.seasonId === String(item.id))
      .sort((a, b) => a.weekNumber - b.weekNumber);
    const compatibilityCycles = cycles
      .filter((cycle) => cycle.seasonId === String(item.id))
      .sort((a, b) => a.cycleNumber - b.cycleNumber);
    const currentWeek =
      seasonWeeks.find(
        (week) =>
          now.getTime() >= new Date(week.startsAt).getTime() &&
          now.getTime() < new Date(week.endsAt).getTime(),
      ) ?? null;

    return {
      id: String(item.id),
      name: String(item.name),
      code: String(item.code),
      startsAt: String(item.starts_at),
      endsAt: String(item.ends_at),
      status: String(item.status),
      weeks: seasonWeeks,
      compatibilityCycles,
      currentWeek,
      structureReady:
        seasonWeeks.length === 13 && compatibilityCycles.length === 3,
    };
  });

  const currentSeason =
    seasons.find((season) =>
      ["active", "registration"].includes(season.status),
    ) ??
    seasons.find((season) => season.status === "draft") ??
    seasons[0] ??
    null;

  return {
    seasons,
    currentSeason,
    sourceErrors: raw.errors,
  };
}
