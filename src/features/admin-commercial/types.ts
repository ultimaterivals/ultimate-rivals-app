export type SponsorOperation = {
  id: string;
  name: string;
  brandName: string | null;
  category: string | null;
  status: string;
  agreements: number;
  activeCashValue: number;
  plannedDeliveries: number;
  deliveredItems: number;
  pendingDeliveries: number;
};

export type VenueOperation = {
  id: string;
  name: string;
  poleName: string | null;
  partnershipStatus: string;
  billingModel: string | null;
  hourlyRate: number;
  revenueSharePercent: number;
  courtCount: number;
  availableWindows: number;
  activeEvents: number;
  verifiedRevenue: number;
  verifiedExpense: number;
  verifiedMargin: number;
};

export type AdminCommercialSnapshot = {
  sponsors: SponsorOperation[] | null;
  venues: VenueOperation[] | null;
  metrics: {
    sponsors: number;
    activeSponsorCash: number;
    pendingDeliveries: number;
    venues: number;
    availableWindows: number;
    activeVenueEvents: number;
    venueMargin: number;
  };
  sourceErrors: string[];
};
