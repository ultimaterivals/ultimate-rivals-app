import type {
  AthleteOpportunity,
  AthletePackage,
  AthletePortalSnapshot,
  AthleteRanking,
  AthleteTeam,
} from "@/features/athlete-portal/types";
import { fetchAthletePortalRepositoryData } from "@/server/repositories/athlete-portal-repository";

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAthletePortalSnapshot({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<AthletePortalSnapshot> {
  const raw = await fetchAthletePortalRepositoryData({ userId, now });

  if (!raw.athlete) {
    return {
      generatedAt: now.toISOString(),
      state: raw.errors.length > 0 ? "partial" : "missing-athlete",
      identity: null,
      teams: null,
      packages: null,
      creditBalance: null,
      creditReserved: null,
      creditConsumed: null,
      summary: null,
      rankings: null,
      primaryRanking: null,
      opportunities: null,
      nextReservation: null,
      billing: null,
      sourceErrors: raw.errors,
    };
  }

  const definitions = new Map(
    (raw.packageDefinitions ?? []).map((definition) => [
      definition.id,
      definition,
    ]),
  );
  const balances = new Map(
    (raw.creditBalances ?? []).map((balance) => [
      balance.athlete_package_id,
      balance,
    ]),
  );

  const packages: AthletePackage[] | null = raw.athletePackages
    ? raw.athletePackages.map((item) => {
        const definition = definitions.get(item.package_id);
        const balance = balances.get(item.id);
        return {
          id: item.id,
          packageId: item.package_id,
          name: definition?.name ?? "Pacote UR",
          code: definition?.code ?? "UR",
          unitsTotal: item.units_total,
          unitsUsed: item.units_used,
          unitsRemaining: balance?.available_units ?? 0,
          unitsReserved: balance?.reserved_units ?? 0,
          unitsConsumed: balance?.consumed_units ?? item.units_used,
          endsAt: item.ends_at,
        };
      })
    : null;

  const creditBalance = raw.creditBalances
    ? raw.creditBalances.reduce(
        (total, item) => total + (item.available_units ?? 0),
        0,
      )
    : null;
  const creditReserved = raw.creditBalances
    ? raw.creditBalances.reduce(
        (total, item) => total + (item.reserved_units ?? 0),
        0,
      )
    : null;
  const creditConsumed = raw.creditBalances
    ? raw.creditBalances.reduce(
        (total, item) => total + (item.consumed_units ?? 0),
        0,
      )
    : null;

  const teams: AthleteTeam[] | null = raw.teams
    ? raw.teams.map((team) => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        logoUrl: team.logo_url,
      }))
    : null;

  const rankings: AthleteRanking[] | null = raw.rankings
    ? raw.rankings.map((ranking) => ({
        id: ranking.id,
        seasonId: ranking.season_id,
        cycleId: ranking.cycle_id,
        level: ranking.level,
        categoryCode: ranking.category_code,
        formatCode: ranking.format_code,
        teamName: ranking.team_name,
        poleName: ranking.pole_name,
        totalPoints: toNumber(ranking.total_points),
        gamesPlayed: ranking.games_played ?? 0,
        wins: ranking.wins ?? 0,
        losses: ranking.losses ?? 0,
        winRate: toNumber(ranking.win_rate),
        currentPosition: ranking.current_position,
        generalPosition: ranking.general_position,
        previousPosition: ranking.previous_position,
        positionChange: ranking.position_change,
        movement: ranking.movement,
        refreshedAt: ranking.refreshed_at,
      }))
    : null;

  const primaryRanking =
    rankings?.find((ranking) => ranking.cycleId === null) ??
    rankings?.[0] ??
    null;

  const reservations = new Map(
    (raw.reservations ?? []).map((reservation) => [
      reservation.opportunity_id,
      reservation,
    ]),
  );
  const interests = new Map(
    (raw.interests ?? []).map((interest) => [
      interest.opportunity_id,
      interest,
    ]),
  );

  const opportunities: AthleteOpportunity[] | null = raw.opportunities
    ? raw.opportunities.map((opportunity) => {
        const reservation = reservations.get(opportunity.id);
        const interest = interests.get(opportunity.id);
        return {
          id: opportunity.id,
          title: opportunity.title,
          opportunityType: opportunity.opportunity_type,
          status: opportunity.computed_status,
          configuredStatus: opportunity.configured_status,
          startsAt: opportunity.starts_at,
          endsAt: opportunity.ends_at,
          poleId: opportunity.pole_id,
          poleName: opportunity.pole_name,
          venueName: opportunity.venue_name,
          level: opportunity.level,
          formatCode: opportunity.format_code,
          categoryCode: opportunity.category_code,
          remainingCapacity: opportunity.remaining_capacity ?? 0,
          personalReservationId: reservation?.id ?? null,
          personalReservationStatus: reservation?.status ?? null,
          personalEligibilityStatus: reservation?.eligibility ?? null,
          waitlistPosition: reservation?.waitlist_position ?? null,
          personalInterestId: interest?.id ?? null,
          personalInterestStatus: interest?.status ?? null,
          personalInterestMode: interest?.interest_mode ?? null,
        };
      })
    : null;

  const nextReservation =
    opportunities?.find(
      (opportunity) =>
        opportunity.personalReservationStatus === "reserved" ||
        opportunity.personalReservationStatus === "confirmed" ||
        opportunity.personalReservationStatus === "checked_in" ||
        opportunity.personalReservationStatus === "waitlisted",
    ) ?? null;

  const billing = raw.billingItems
    ? {
        openItems: raw.billingItems.length,
        openAmount: raw.billingItems.reduce(
          (total, item) => total + toNumber(item.amount),
          0,
        ),
      }
    : null;

  return {
    generatedAt: now.toISOString(),
    state: raw.errors.length > 0 ? "partial" : "ready",
    identity: {
      id: raw.athlete.id,
      publicName: raw.athlete.public_name,
      athleteCode: raw.athlete.athlete_code,
      avatarUrl: raw.athlete.avatar_url,
      city: raw.athlete.city,
      state: raw.athlete.state,
      bio: raw.athlete.bio,
      instagramHandle: raw.athlete.instagram_handle,
      status: raw.athlete.status,
      primaryPoleId: raw.athlete.primary_pole_id,
    },
    teams,
    packages,
    creditBalance,
    creditReserved,
    creditConsumed,
    summary: raw.report
      ? {
          level: raw.report.level,
          urCoinBalance: raw.report.ur_coin_balance ?? 0,
          games: raw.report.games ?? 0,
          competitions: raw.report.competitions ?? 0,
          trainingAttendance: raw.report.training_attendance ?? 0,
          hunterCompleted: raw.report.hunter_completed ?? 0,
        }
      : null,
    rankings,
    primaryRanking,
    opportunities,
    nextReservation,
    billing,
    sourceErrors: raw.errors,
  };
}
