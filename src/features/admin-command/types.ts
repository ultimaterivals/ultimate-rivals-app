export type CommandDataStatus = "ready" | "partial" | "empty";

export type CommandSeason = {
  id: string;
  name: string;
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

export type CommandEvent = {
  id: string;
  name: string;
  eventType: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleName: string | null;
  venueName: string | null;
  openChecklistItems: number;
  conflictCount: number;
};

export type CommandDemandSignal = {
  id: string;
  title: string;
  status: string;
  signal: string | null;
  startsAt: string | null;
  endsAt: string | null;
  poleName: string | null;
  venueName: string | null;
  interestedCount: number;
  readyFormations: number;
  targetFormations: number;
  reservedCount: number;
  waitlistCount: number;
  remainingCapacity: number;
};

export type CommandFunnel = {
  visitors: number;
  signups: number;
  interests: number;
  reservations: number;
  firstParticipation: number;
  secondParticipation: number;
  returning: number;
};

export type CommandAlertSeverity =
  | "critical"
  | "attention"
  | "opportunity"
  | "info";

export type CommandAlert = {
  id: string;
  severity: CommandAlertSeverity;
  title: string;
  detail: string;
  href: string;
};

export type CommandAction = {
  id: string;
  priority: "high" | "medium" | "normal";
  title: string;
  detail: string;
  href: string;
};

export type AdminCommandSnapshot = {
  generatedAt: string;
  status: CommandDataStatus;
  season: CommandSeason | null;
  metrics: {
    todayEvents: number | null;
    next7DaysEvents: number | null;
    activeAthletes30d: number | null;
    revenue: number | null;
    expenses: number | null;
    firstParticipationOnly: number | null;
    overduePayments: number | null;
    overdueAmount: number | null;
    openObligations: number | null;
    openObligationsAmount: number | null;
  };
  funnel: CommandFunnel | null;
  upcomingEvents: CommandEvent[];
  demand: CommandDemandSignal[];
  alerts: CommandAlert[];
  actions: CommandAction[];
  sourceErrors: string[];
};
