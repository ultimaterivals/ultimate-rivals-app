import type {
  AdminCommercialSnapshot,
  SponsorOperation,
  VenueOperation,
} from "@/features/admin-commercial/types";
import { fetchAdminCommercialRepositoryData } from "@/server/repositories/admin-commercial-repository";

function number(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdminCommercialSnapshot(): Promise<AdminCommercialSnapshot> {
  const raw = await fetchAdminCommercialRepositoryData();
  const sponsors: SponsorOperation[] | null = raw.sponsors
    ? raw.sponsors.map((item) => ({
        id: item.sponsor_id,
        name: item.name,
        brandName: item.brand_name,
        category: item.category,
        status: item.status,
        agreements: item.agreements ?? 0,
        activeCashValue: number(item.active_cash_value),
        plannedDeliveries: item.planned_deliveries ?? 0,
        deliveredItems: item.delivered_items ?? 0,
        pendingDeliveries: Math.max(
          (item.planned_deliveries ?? 0) - (item.delivered_items ?? 0),
          0,
        ),
      }))
    : null;

  const venues: VenueOperation[] | null = raw.venues
    ? raw.venues.map((item) => ({
        id: item.venue_id,
        name: item.venue_name,
        poleName: item.pole_name,
        partnershipStatus: item.partnership_status,
        billingModel: item.billing_model,
        hourlyRate: number(item.hourly_rate),
        revenueSharePercent: number(item.revenue_share_percent),
        courtCount: item.court_count ?? 0,
        availableWindows: item.available_windows ?? 0,
        activeEvents: item.active_events ?? 0,
        verifiedRevenue: number(item.verified_revenue),
        verifiedExpense: number(item.verified_expense),
        verifiedMargin: number(item.verified_margin),
      }))
    : null;

  return {
    sponsors,
    venues,
    metrics: {
      sponsors: sponsors?.length ?? 0,
      activeSponsorCash: (sponsors ?? []).reduce(
        (sum, item) => sum + item.activeCashValue,
        0,
      ),
      pendingDeliveries: (sponsors ?? []).reduce(
        (sum, item) => sum + item.pendingDeliveries,
        0,
      ),
      venues: venues?.length ?? 0,
      availableWindows: (venues ?? []).reduce(
        (sum, item) => sum + item.availableWindows,
        0,
      ),
      activeVenueEvents: (venues ?? []).reduce(
        (sum, item) => sum + item.activeEvents,
        0,
      ),
      venueMargin: (venues ?? []).reduce(
        (sum, item) => sum + item.verifiedMargin,
        0,
      ),
    },
    sourceErrors: raw.errors,
  };
}
