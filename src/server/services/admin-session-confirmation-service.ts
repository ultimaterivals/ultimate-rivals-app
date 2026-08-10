import type { AdminSessionConfirmationSnapshot } from "@/features/admin-session-confirmation/types";
import { fetchAdminSessionConfirmationRepositoryData } from "@/server/repositories/admin-session-confirmation-repository";

export async function getAdminSessionConfirmationSnapshot(): Promise<AdminSessionConfirmationSnapshot> {
  const raw = await fetchAdminSessionConfirmationRepositoryData();
  const metrics = new Map((raw.demand ?? []).map((item) => [item.id, item]));

  return {
    opportunities: raw.opportunities
      ? raw.opportunities.map((item) => {
          const demand = metrics.get(item.id);
          return {
            id: item.id,
            title: item.title,
            status: item.status,
            startsAt: item.starts_at,
            endsAt: item.ends_at,
            poleId: item.pole_id,
            venueId: item.venue_id,
            courtId: item.court_id,
            level: item.level,
            formatCode: item.format_code,
            categoryCode: item.category_code,
            minFormations: item.min_formations,
            targetFormations: item.target_formations,
            capacityAthletes: item.capacity_athletes,
            interestedCount: demand?.interested_count ?? 0,
            readyFormations: demand?.ready_formations ?? 0,
          };
        })
      : null,
    sourceErrors: raw.errors,
  };
}
