export type AcquisitionSource = {
  source: string;
  visitors: number;
  signups: number;
  interests: number;
  reservations: number;
  firstParticipation: number;
  secondParticipation: number;
  returning: number;
  signupToFirstRate: number | null;
  firstToSecondRate: number | null;
};

export type IntelligenceDemandSignal = {
  id: string;
  title: string;
  poleName: string | null;
  signal: string | null;
  interested: number;
  readyFormations: number;
  targetFormations: number;
  waitlist: number;
};

export type IntelligenceInsight = {
  id: string;
  type: "activation" | "retention" | "demand" | "acquisition";
  title: string;
  detail: string;
  href: string;
};

export type AdminIntelligenceSnapshot = {
  sources: AcquisitionSource[] | null;
  demand: IntelligenceDemandSignal[] | null;
  metrics: {
    trackedSources: number | null;
    signups: number | null;
    firstParticipation: number | null;
    secondParticipation: number | null;
    firstOnlyAthletes: number | null;
    active30d: number | null;
    atRisk: number | null;
    inactive: number | null;
    secondCourtSignals: number | null;
  };
  insights: IntelligenceInsight[];
  sourceErrors: string[];
};
