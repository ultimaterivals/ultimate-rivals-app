export type AthleteAvailabilityWindow = {
  id: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  poleId: string | null;
  poleName: string | null;
  modality: string;
  formatCodes: string[];
  categoryCodes: string[];
  validFrom: string;
  validUntil: string | null;
  active: boolean;
};

export type AthleteAvailabilitySnapshot = {
  athleteId: string | null;
  windows: AthleteAvailabilityWindow[];
  poles: { id: string; name: string }[];
  sourceErrors: string[];
};
