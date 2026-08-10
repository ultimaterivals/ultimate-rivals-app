export type QuarterSeasonWeek = {
  id: string;
  seasonId: string;
  weekNumber: number;
  name: string;
  phase: string;
  objective: string;
  primaryProduct: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type QuarterSeasonCompatibilityCycle = {
  id: string;
  seasonId: string;
  cycleNumber: number;
  name: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type QuarterSeason = {
  id: string;
  name: string;
  code: string;
  startsAt: string;
  endsAt: string;
  status: string;
  weeks: QuarterSeasonWeek[];
  compatibilityCycles: QuarterSeasonCompatibilityCycle[];
  currentWeek: QuarterSeasonWeek | null;
  structureReady: boolean;
};

export type AdminQuarterSeasonSnapshot = {
  seasons: QuarterSeason[];
  currentSeason: QuarterSeason | null;
  sourceErrors: string[];
};
