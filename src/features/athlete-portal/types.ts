export type AthleteIdentity = {
  id: string;
  publicName: string;
  athleteCode: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  instagramHandle: string | null;
  status: string;
  primaryPoleId: string | null;
};

export type AthleteTeam = {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
};

export type AthletePackage = {
  id: string;
  packageId: string;
  name: string;
  code: string;
  unitsTotal: number | null;
  unitsUsed: number;
  unitsRemaining: number | null;
  endsAt: string | null;
};

export type AthleteRanking = {
  id: string;
  seasonId: string;
  cycleId: string | null;
  level: string | null;
  categoryCode: string | null;
  formatCode: string | null;
  teamName: string | null;
  poleName: string | null;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  currentPosition: number | null;
  generalPosition: number | null;
  previousPosition: number | null;
  positionChange: number | null;
  movement: string | null;
  refreshedAt: string;
};

export type AthleteOpportunity = {
  id: string;
  title: string;
  opportunityType: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  poleId: string | null;
  poleName: string | null;
  venueName: string | null;
  level: string | null;
  formatCode: string | null;
  categoryCode: string | null;
  personalReservationStatus: string | null;
  waitlistPosition: number | null;
  personalInterestStatus: string | null;
};

export type AthleteSeasonSummary = {
  level: string | null;
  urCoinBalance: number;
  games: number;
  competitions: number;
  trainingAttendance: number;
  hunterCompleted: number;
};

export type AthleteBillingSummary = {
  openItems: number;
  openAmount: number;
};

export type AthletePortalSnapshot = {
  generatedAt: string;
  state: "ready" | "missing-athlete" | "partial";
  identity: AthleteIdentity | null;
  teams: AthleteTeam[] | null;
  packages: AthletePackage[] | null;
  creditBalance: number | null;
  summary: AthleteSeasonSummary | null;
  rankings: AthleteRanking[] | null;
  primaryRanking: AthleteRanking | null;
  opportunities: AthleteOpportunity[] | null;
  nextReservation: AthleteOpportunity | null;
  billing: AthleteBillingSummary | null;
  sourceErrors: string[];
};
