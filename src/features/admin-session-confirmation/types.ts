export type PendingUrPlayOpportunity = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleId: string;
  venueId: string | null;
  courtId: string | null;
  level: string | null;
  formatCode: string | null;
  categoryCode: string | null;
  minFormations: number;
  targetFormations: number;
  capacityAthletes: number;
  interestedCount: number;
  readyFormations: number;
};

export type AdminSessionConfirmationSnapshot = {
  opportunities: PendingUrPlayOpportunity[] | null;
  sourceErrors: string[];
};
