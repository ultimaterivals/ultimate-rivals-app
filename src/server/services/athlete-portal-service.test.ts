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
      development: null,
      rankings: null,
      athletePackages: null,
      creditBalances: null,
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

  it("derives available credits from the ledger balance and maps personal agenda state", async () => {
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
        gender: "female",
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
      development: {
        athlete_id: "athlete-1",
        plan_id: "plan-1",
        level_snapshot: "N2",
        priority_1: "Recepção",
        priority_2: null,
        priority_3: null,
        goal_30_days: "Participar de quatro sessões oficiais",
        hunter_goal: "Concluir missão da semana",
        review_at: "2026-09-01T12:00:00.000Z",
        hunter_status: "in_progress",
        hunter_mission: "Dominar a recepção",
        hunter_theme: "fundamentos",
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
      creditBalances: [
        {
          athlete_id: "athlete-1",
          athlete_package_id: "athlete-package-1",
          available_units: 2,
          reserved_units: 1,
          consumed_units: 1,
        },
      ],
      packageDefinitions: [{ id: "package-1", name: "Pacote 4", code: "P4" }],
      memberships: [],
      teams: [],
      reservations: [
        {
          id: "reservation-1",
          opportunity_id: "op-1",
          status: "confirmed",
          eligibility: "pending",
          waitlist_position: null,
        },
      ],
      interests: [
        {
          id: "interest-1",
          opportunity_id: "op-2",
          status: "active",
          interest_mode: "looking_for_partner",
        },
      ],
      opportunities: [
        {
          id: "op-1",
          opportunity_type: "ur_play",
          computed_status: "SESSION_CONFIRMED",
          configured_status: "confirmed",
          title: "UR Play",
          starts_at: "2026-08-12T23:00:00.000Z",
          ends_at: "2026-08-13T01:00:00.000Z",
          pole_id: "pole-1",
          pole_name: "Contagem",
          venue_name: "Arena",
          level: "N2",
          format_code: "doubles",
          category_code: "female",
          remaining_capacity: 3,
        },
        {
          id: "op-2",
          opportunity_type: "ur_play",
          computed_status: "FORMING",
          configured_status: "forming",
          title: "UR Play 2",
          starts_at: "2026-08-15T23:00:00.000Z",
          ends_at: "2026-08-16T01:00:00.000Z",
          pole_id: "pole-1",
          pole_name: "Contagem",
          venue_name: "Arena",
          level: null,
          format_code: null,
          category_code: null,
          remaining_capacity: 0,
        },
      ],
      billingItems: [],
      errors: [],
    });

    const snapshot = await getAthletePortalSnapshot({ userId: "user-1" });
    expect(snapshot.creditBalance).toBe(2);
    expect(snapshot.creditReserved).toBe(1);
    expect(snapshot.creditConsumed).toBe(1);
    expect(snapshot.packages?.[0]?.unitsRemaining).toBe(2);
    expect(snapshot.summary?.urCoinBalance).toBe(120);
    expect(snapshot.development?.priorities).toEqual(["Recepção"]);
    expect(snapshot.development?.hunterMission).toBe("Dominar a recepção");
    expect(snapshot.identity?.gender).toBe("female");
    expect(snapshot.nextReservation?.personalReservationId).toBe(
      "reservation-1",
    );
    expect(snapshot.nextReservation?.personalEligibilityStatus).toBe("pending");
    expect(snapshot.opportunities?.[1]?.personalInterestMode).toBe(
      "looking_for_partner",
    );
    expect(snapshot.opportunities?.[1]?.remainingCapacity).toBe(0);
  });
});
