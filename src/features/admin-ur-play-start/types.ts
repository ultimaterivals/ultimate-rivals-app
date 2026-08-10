export type UrPlaySessionStartReadiness = {
  sessionId: string;
  sessionStatus: string;
  criticalReady: number;
  criticalTotal: number;
  courtReady: boolean;
  minimumAthletes: number;
  checkedIn: number;
  ready: boolean;
  error: string | null;
};

export type AdminUrPlayStartSnapshot = {
  sessions: UrPlaySessionStartReadiness[];
  sourceErrors: string[];
};
