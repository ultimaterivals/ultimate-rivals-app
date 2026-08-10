export type AdminUrPlaySession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleName: string | null;
  venueName: string | null;
  capacity: number;
  waitlistCapacity: number;
  priceAmount: number | null;
  readyForMatchmaking: boolean;
  registrations: number;
  confirmed: number;
  waitlisted: number;
  checkins: number;
  courts: number;
  staff: number;
  scopes: number;
  fillRate: number;
};

export type AdminUrPlaySnapshot = {
  sessions: AdminUrPlaySession[];
  metrics: {
    sessions: number;
    upcoming: number;
    capacity: number;
    confirmed: number;
    waitlisted: number;
    checkins: number;
    averageFillRate: number | null;
  };
  sourceErrors: string[];
};
