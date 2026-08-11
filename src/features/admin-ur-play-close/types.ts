export type UrPlaySessionCloseReadiness = {
  sessionId: string;
  sessionStatus: string;
  totalMatches: number;
  openMatches: number;
  completedMatches: number;
  homologatedResults: number;
  pendingResults: number;
  pendingAttendance: number;
  ready: boolean;
};

export type AdminUrPlayCloseSnapshot = {
  sessions: UrPlaySessionCloseReadiness[];
  sourceErrors: string[];
};
