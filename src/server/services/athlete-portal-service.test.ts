import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAthletePortalRepositoryData } from "@/server/repositories/athlete-portal-repository";
import { getAthletePortalSnapshot } from "./athlete-portal-service";

vi.mock("@/server/repositories/athlete-portal-repository", () => ({
  fetchAthletePortalRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAthletePortalRepositoryData);

describe("athlete portal service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("does not fabricate an athlete when the auth account is not linked", async () => {
    repositoryMock.mockResolvedValue({
      athlete: null,
      report: null,
      rankings: null,
      athletePackages: null,
      packageDefinitions: null,
      memberships: null,
      teams: null,
      reservations: null,
      interests: null,
      opportunities: null,
      billingItems: null,
      errors: [],
    });

    const snapshot = await getAthletePortalSnapshot({ userId: "user-1" });
    expect(snapshot.state).toBe("missing-athlete");
    expect(snapshot.identity).toBeNull();
  });

  it("derives credits and personal opportunity state", async () => {
    repositoryMock.mockResolvedValue({
      athlete: {
        id: "athlete-1",
        public_name: "Atleta",
        athlete_code: "UR001",
        avatar_url: null,
        city: "Contagem",
        state: "MG",
        bio: null,
        instagram_handle: null,
        status: "active",
        primary_pole_id: "pole-1",
      },
      report: {
        athlete_id: "athlete-1",
        athlete_code: "UR001",
        public_name: "Atleta",
        level: "N2",
        ur_coin_balance: 120,
        games: 4,
        competitions: 0,
        training_attendance: 1,
        hunter_completed: 0,
      },
      rankings: [],
      athletePackages: [
        {
          id: "athlete-package-1",
          package_id: "package-1",
          units_total: 4,
          units_used: 1,
          ends_at: null,
        },
      ],
      packageDefinitions: [{ id: "package-1", name: "Pacote 4", code: "P4" }],
      memberships: [],
      teams: [],
      reservations: [
        {
          opportunity_id: "op-1",
          status: "confirmed",
          waitlist_position: null,
        },
      ],
      interests: [],
      opportunities: [
        {
          id: "op-1",
          opportunity_type: "ur_play",
          computed_status: "SESSION_CONFIRMED",
          title: "UR Play",
          starts_at: "2026-08-12T23:00:00.000Z",
          ends_at: "2026-08-13T01:00:00.000Z",
          pole_id: "pole-1",
          pole_name: "Contagem",
          venue_name: "Arena",
          level: "N2",
          format_code: "doubles",
          category_code: "female",
        },
      ],
      billingItems: [],
      errors: [],
    });

    const snapshot = await getAthletePortalSnapshot({ userId: "user-1" });
    expect(snapshot.creditBalance).toBe(3);
    expect(snapshot.summary?.urCoinBalance).toBe(120);
    expect(snapshot.nextReservation?.personalReservationStatus).toBe(
      "confirmed",
    );
  });
});
