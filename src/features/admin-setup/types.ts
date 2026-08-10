export type SetupSeason = {
  id: string;
  name: string;
  code: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type SetupCycle = {
  id: string;
  seasonId: string;
  cycleNumber: number;
  name: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type SetupPole = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: string;
};

export type SetupVenue = {
  id: string;
  poleId: string;
  name: string;
  city: string;
  state: string;
  status: string;
};

export type SetupCourt = {
  id: string;
  venueId: string;
  name: string;
  sportType: string;
  status: string;
};

export type AdminOperationalSetupSnapshot = {
  seasons: SetupSeason[] | null;
  cycles: SetupCycle[] | null;
  poles: SetupPole[] | null;
  venues: SetupVenue[] | null;
  courts: SetupCourt[] | null;
  sourceErrors: string[];
};
