export type TeamDoubleCategory = {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  registeredDoubles: number;
  activeDoubles: number;
  limit: number | null;
  maxReserves: number;
};

export type AdminTeamRow = {
  id: string;
  name: string;
  shortName: string | null;
  status: string;
  poleId: string | null;
  poleName: string | null;
  activeAthletes: number;
  rosterCount: number;
  tournamentRegistrations: number;
  doubles: TeamDoubleCategory[];
};

export type AdminTeamsSnapshot = {
  teams: AdminTeamRow[];
  metrics: {
    officialTeams: number;
    activeAthletes: number;
    registeredDoubles: number;
    openDoubleSlots: number;
    freeAgents: number;
  };
  categories: { id: string; code: string; name: string }[];
  sourceErrors: string[];
};
