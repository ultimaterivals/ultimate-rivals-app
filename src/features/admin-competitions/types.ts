export type CompetitionGateItem = {
  key: string;
  label: string;
  complete: boolean;
  detail: string;
};

export type AdminCompetitionRow = {
  id: string;
  product: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleId: string | null;
  venueId: string | null;
  calendarEventId: string | null;
  divisions: number;
  registrations: number;
  eligibleRegistrations: number;
  matches: number;
  staffAssignments: number;
  prizePlans: number;
  openChecklistItems: number;
  gate: CompetitionGateItem[];
  readiness: number;
};

export type AdminCompetitionsSnapshot = {
  competitions: AdminCompetitionRow[];
  metrics: {
    competitions: number;
    published: number;
    registrations: number;
    matches: number;
    gatesReady: number;
  };
  sourceErrors: string[];
};
