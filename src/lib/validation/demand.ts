export const interestModes = [
  "have_formation",
  "looking_for_partner",
  "available_to_join",
  "individual_interest",
] as const;

export const opportunityStatuses = [
  "collecting_interest",
  "forming",
  "almost_full",
  "confirmed",
  "full",
  "waitlist",
  "closed",
  "cancelled",
] as const;

export const attributionSources = [
  "direct",
  "instagram",
  "whatsapp",
  "google",
  "ads",
  "athlete_referral",
  "team_referral",
  "venue",
  "sponsor",
  "event",
  "media",
  "other",
] as const;

export type FormationFormat = "doubles" | "fours";
export type OpportunityStatus = (typeof opportunityStatuses)[number];
export type AttributionSource = (typeof attributionSources)[number];

export type FormationReadinessInput = {
  format: FormationFormat;
  acceptedActiveAthletes: number;
  reserveAthletes?: number;
};

export function requiredAthletesForFormation(format: FormationFormat) {
  return format === "doubles" ? 2 : 4;
}

export function isFormationReady(input: FormationReadinessInput) {
  return (
    input.acceptedActiveAthletes === requiredAthletesForFormation(input.format)
  );
}

export type DemandStatusInput = {
  configuredStatus?: "closed" | "cancelled" | null;
  readyFormations: number;
  targetFormations: number;
  maxFormations: number;
  capacityAthletes: number;
  reservedAthletes: number;
  interestedAthletes: number;
  waitlistedAthletes?: number;
};

export function computeOpportunityStatus(
  input: DemandStatusInput,
): OpportunityStatus {
  if (input.configuredStatus === "closed") return "closed";
  if (input.configuredStatus === "cancelled") return "cancelled";
  if (input.waitlistedAthletes && input.waitlistedAthletes > 0)
    return "waitlist";
  if (input.reservedAthletes >= input.capacityAthletes) return "full";
  if (input.readyFormations >= input.targetFormations) return "confirmed";
  if (
    input.targetFormations > 1 &&
    input.readyFormations === input.targetFormations - 1
  )
    return "almost_full";
  if (input.interestedAthletes > 0 || input.readyFormations > 0)
    return "forming";
  return "collecting_interest";
}

export function almostFullLabel(format: FormationFormat) {
  return format === "doubles"
    ? "ÚLTIMA DUPLA"
    : format === "fours"
      ? "ÚLTIMO QUARTETO"
      : "ÚLTIMA FORMAÇÃO";
}

export function hasSecondCourtOpportunity(input: {
  reservedAthletes: number;
  capacityAthletes: number;
  interestedAthletes: number;
  readyFormations: number;
  maxFormations: number;
}) {
  return (
    input.reservedAthletes >= input.capacityAthletes &&
    (input.interestedAthletes > input.reservedAthletes ||
      input.readyFormations > input.maxFormations)
  );
}

export function computeUnservedDemand(input: {
  interestedAthletes: number;
  reservedAthletes: number;
  waitlistedAthletes: number;
  readyFormations: number;
  maxFormations: number;
}) {
  return {
    interestedNotServed: Math.max(
      input.interestedAthletes - input.reservedAthletes,
      0,
    ),
    waitlistedNotServed: Math.max(input.waitlistedAthletes, 0),
    readyFormationsAboveCapacity: Math.max(
      input.readyFormations - input.maxFormations,
      0,
    ),
  };
}

export function normalizeAttributionSource(input: {
  utmSource?: string | null;
  referrerDomain?: string | null;
  athleteReferralCode?: string | null;
  teamReferralCode?: string | null;
  venueCode?: string | null;
  sponsorCode?: string | null;
  eventCode?: string | null;
}): AttributionSource {
  if (input.athleteReferralCode) return "athlete_referral";
  if (input.teamReferralCode) return "team_referral";
  if (input.venueCode) return "venue";
  if (input.sponsorCode) return "sponsor";
  if (input.eventCode) return "event";

  const raw = `${input.utmSource ?? ""} ${input.referrerDomain ?? ""}`
    .toLowerCase()
    .trim();

  if (!raw) return "direct";
  if (raw.includes("instagram")) return "instagram";
  if (raw.includes("whatsapp") || raw.includes("wa.me")) return "whatsapp";
  if (raw.includes("google")) return "google";
  if (raw.includes("ads") || raw.includes("cpc") || raw.includes("paid"))
    return "ads";
  if (raw.includes("media")) return "media";
  return "other";
}

export type FunnelCounts = {
  visitors: number;
  signups: number;
  profiles: number;
  interests: number;
  reservations: number;
  checkins: number;
  firstParticipations: number;
  secondParticipations: number;
};

const rate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;

export function computeFunnel(counts: FunnelCounts) {
  return {
    visitToSignup: rate(counts.signups, counts.visitors),
    signupToInterest: rate(counts.interests, counts.signups),
    interestToReservation: rate(counts.reservations, counts.interests),
    reservationToCheckin: rate(counts.checkins, counts.reservations),
    checkinToFirstParticipation: rate(
      counts.firstParticipations,
      counts.checkins,
    ),
    firstToSecondParticipation: rate(
      counts.secondParticipations,
      counts.firstParticipations,
    ),
  };
}

export function computeRetention(input: {
  participations30d: number;
  lastParticipationAt?: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const daysSinceLastParticipation = input.lastParticipationAt
    ? Math.floor(
        (now.getTime() - input.lastParticipationAt.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return {
    active7d:
      daysSinceLastParticipation !== null && daysSinceLastParticipation <= 7,
    active30d:
      daysSinceLastParticipation !== null && daysSinceLastParticipation <= 30,
    returningAthlete: input.participations30d >= 2,
    daysSinceLastParticipation,
  };
}
