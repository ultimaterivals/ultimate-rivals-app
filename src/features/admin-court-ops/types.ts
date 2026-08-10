export type CourtOpsAthlete = {
  id: string;
  athleteCode: string;
  publicName: string;
  gender: string | null;
};

export type CourtOpsQueueEntry = {
  id: string;
  athleteId: string;
  athleteCode: string;
  publicName: string;
  gender: string | null;
  status: string;
  priorityScore: number | null;
  queuedAt: string;
  lastMatchEndedAt: string | null;
  currentMatchId: string | null;
};

export type CourtOpsSide = {
  id: string;
  code: "A" | "B";
  label: string;
  participants: CourtOpsAthlete[];
};

export type CourtOpsScoreboard = {
  pointsToWin: number;
  winBy: number;
  maxPoints: number | null;
  scoreA: number;
  scoreB: number;
  validRallies: number;
  nextRallyNumber: number;
  isGameOver: boolean;
  winnerSideId: string | null;
};

export type CourtOpsResult = {
  status: string;
  winnerSideId: string | null;
  scoreA: number;
  scoreB: number;
  homologatedAt: string | null;
};

export type CourtOpsTechnicalSummary = {
  athleteId: string;
  athleteCode: string;
  publicName: string;
  sideId: string;
  aces: number;
  attacks: number;
  blocks: number;
  defenses: number;
  assists: number;
};

export type CourtOpsRally = {
  id: string;
  rallyNumber: number;
  winningSideId: string;
  status: string;
  recordedAt: string;
};

export type CourtOpsRankingRun = {
  status: string;
  transactionCount: number;
  completedAt: string | null;
};

export type CourtOpsMatch = {
  id: string;
  code: string;
  sessionId: string;
  courtId: string;
  courtName: string;
  formatId: string;
  formatCode: string;
  formatName: string;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  level: string;
  status: string;
  scheduledOrder: number | null;
  calledAt: string | null;
  readyAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sides: CourtOpsSide[];
  scoreboard: CourtOpsScoreboard | null;
  result: CourtOpsResult | null;
  rallies: CourtOpsRally[];
  technicalSummary: CourtOpsTechnicalSummary[];
  rankingRun: CourtOpsRankingRun | null;
};

export type CourtOpsCourt = {
  id: string;
  name: string;
  position: number;
};

export type CourtOpsOption = {
  id: string;
  code: string;
  name: string;
};

export type CourtOpsSession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  readyForMatchmaking: boolean;
  poleName: string;
  venueName: string;
  courts: CourtOpsCourt[];
  queue: CourtOpsQueueEntry[];
  matches: CourtOpsMatch[];
};

export type AdminCourtOpsSnapshot = {
  generatedAt: string;
  sessions: CourtOpsSession[];
  formats: CourtOpsOption[];
  categories: CourtOpsOption[];
  metrics: {
    sessionsInProgress: number;
    waiting: number;
    called: number;
    playing: number;
    pendingReview: number;
    completed: number;
  };
  infrastructureReady: boolean;
  sourceErrors: string[];
};
