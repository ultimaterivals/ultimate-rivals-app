import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminFinanceRepositoryData } from "@/server/repositories/admin-finance-repository";
import { getAdminFinanceSnapshot } from "./admin-finance-service";

vi.mock("@/server/repositories/admin-finance-repository", () => ({
  fetchAdminFinanceRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminFinanceRepositoryData);

describe("admin finance service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("keeps verified and projected finance separate", async () => {
    repositoryMock.mockResolvedValue({
      payments: [],
      obligations: [],
      events: [
        {
          calendar_event_id: "e1",
          tournament_id: null,
          ur_play_session_id: "s1",
          season_id: "season",
          pole_id: null,
          venue_id: null,
          verified_revenue: 500,
          projected_revenue: 700,
          verified_expense: 200,
          projected_expense: 250,
          verified_margin: 300,
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminFinanceSnapshot();
    expect(snapshot.metrics.verifiedRevenue).toBe(500);
    expect(snapshot.metrics.projectedRevenue).toBe(700);
    expect(snapshot.metrics.verifiedMargin).toBe(300);
  });

  it("calculates outstanding charge amount and open obligations", async () => {
    repositoryMock.mockResolvedValue({
      payments: [
        {
          id: "p1",
          description: "Pacote",
          amount: 120,
          status: "submitted",
          due_at: null,
          athlete_name: "Atleta",
          team_name: null,
          product_name: null,
          package_name: "Pacote 4",
          paid_amount: 40,
        },
      ],
      obligations: [
        {
          obligation_type: "repass",
          plan_id: "plan",
          tournament_id: null,
          source_name: "Temporada",
          allocation_id: "a1",
          label: "Equipe 1",
          status: "approved",
          amount: 1500,
          athlete_name: null,
          team_name: "Equipe",
        },
      ],
      events: [],
      errors: [],
    });

    const snapshot = await getAdminFinanceSnapshot();
    expect(snapshot.metrics.openChargeAmount).toBe(80);
    expect(snapshot.metrics.openObligationAmount).toBe(1500);
  });
});
