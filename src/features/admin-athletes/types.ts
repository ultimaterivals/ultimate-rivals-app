export type AdminAthleteSegment =
  | "all"
  | "active30"
  | "first-only"
  | "at-risk"
  | "inactive"
  | "free-agents";

export type AdminAthleteRow = {
  id: string;
  publicName: string;
  athleteCode: string;
  status: string;
  poleId: string | null;
  poleName: string | null;
  level: string | null;
  source: string | null;
  participations30d: number;
  active30d: boolean;
  firstParticipationAt: string | null;
  secondParticipationAt: string | null;
  lastParticipationAt: string | null;
  daysSinceLastParticipation: number | null;
  returningAthlete: boolean;
  games: number;
  urCoinBalance: number;
  teamNames: string[];
};

export type AdminAthleteMetrics = {
  total: number;
  active30d: number;
  firstOnly: number;
  atRisk: number;
  inactive: number;
  freeAgents: number;
};

export type AdminAthletesSnapshot = {
  rows: AdminAthleteRow[];
  filteredRows: AdminAthleteRow[];
  metrics: AdminAthleteMetrics;
  poles: { id: string; name: string }[];
  query: {
    search: string;
    segment: AdminAthleteSegment;
    poleId: string | null;
  };
  sourceErrors: string[];
};
