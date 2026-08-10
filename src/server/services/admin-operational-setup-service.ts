import type { AdminOperationalSetupSnapshot } from "@/features/admin-setup/types";
import { fetchAdminOperationalSetupRepositoryData } from "@/server/repositories/admin-operational-setup-repository";

export async function getAdminOperationalSetupSnapshot(): Promise<AdminOperationalSetupSnapshot> {
  const raw = await fetchAdminOperationalSetupRepositoryData();

  return {
    seasons: raw.seasons
      ? raw.seasons.map((item) => ({
          id: item.id as string,
          name: item.name as string,
          code: item.code as string,
          startsAt: item.starts_at as string,
          endsAt: item.ends_at as string,
          status: item.status as string,
        }))
      : null,
    cycles: raw.cycles
      ? raw.cycles.map((item) => ({
          id: item.id as string,
          seasonId: item.season_id as string,
          cycleNumber: Number(item.cycle_number),
          name: item.name as string,
          startsAt: item.starts_at as string,
          endsAt: item.ends_at as string,
          status: item.status as string,
        }))
      : null,
    poles: raw.poles
      ? raw.poles.map((item) => ({
          id: item.id as string,
          name: item.name as string,
          slug: item.slug as string,
          city: item.city as string,
          state: String(item.state),
          status: item.status as string,
        }))
      : null,
    venues: raw.venues
      ? raw.venues.map((item) => ({
          id: item.id as string,
          poleId: item.pole_id as string,
          name: item.name as string,
          city: item.city as string,
          state: String(item.state),
          status: item.status as string,
        }))
      : null,
    courts: raw.courts
      ? raw.courts.map((item) => ({
          id: item.id as string,
          venueId: item.venue_id as string,
          name: item.name as string,
          sportType: item.sport_type as string,
          status: item.status as string,
        }))
      : null,
    sourceErrors: raw.errors,
  };
}
