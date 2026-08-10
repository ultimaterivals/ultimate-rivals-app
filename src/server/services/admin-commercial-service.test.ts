import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminCommercialRepositoryData } from "@/server/repositories/admin-commercial-repository";
import { getAdminCommercialSnapshot } from "./admin-commercial-service";

vi.mock("@/server/repositories/admin-commercial-repository", () => ({
  fetchAdminCommercialRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminCommercialRepositoryData);

describe("admin commercial service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("derives pending sponsor deliveries and venue margin", async () => {
    repositoryMock.mockResolvedValue({
      sponsors: [
        {
          sponsor_id: "s1",
          name: "Marca",
          brand_name: "Marca",
          category: "performance",
          status: "active",
          agreements: 1,
          active_cash_value: 10000,
          planned_deliveries: 5,
          delivered_items: 3,
        },
      ],
      venues: [
        {
          venue_id: "v1",
          venue_name: "Arena",
          pole_name: "Contagem",
          partnership_status: "active",
          billing_model: "fixed_hour",
          hourly_rate: 100,
          revenue_share_percent: 0,
          court_count: 2,
          available_windows: 4,
          active_events: 2,
          verified_revenue: 1000,
          verified_expense: 400,
          verified_margin: 600,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminCommercialSnapshot();
    expect(snapshot.metrics.pendingDeliveries).toBe(2);
    expect(snapshot.metrics.activeSponsorCash).toBe(10000);
    expect(snapshot.metrics.venueMargin).toBe(600);
  });
});
