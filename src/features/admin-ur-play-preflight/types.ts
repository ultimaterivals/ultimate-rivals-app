export type UrPlayPreflightCheckKey =
  | "court_access_confirmed"
  | "balls_score_ready"
  | "first_aid_ready"
  | "device_offline_ready"
  | "operation_owner_ready"
  | "athlete_briefing_ready"
  | "media_ready"
  | "reception_ready"
  | "water_support_ready";

export type UrPlayPreflightCheck = {
  key: UrPlayPreflightCheckKey;
  label: string;
  description: string;
  critical: boolean;
  checked: boolean;
  note: string | null;
  updatedAt: string | null;
};

export type UrPlayPreflightAutomaticGate = {
  key: "session" | "court" | "participants";
  label: string;
  ready: boolean;
  detail: string;
};

export type UrPlayPreflightSession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleName: string;
  venueName: string;
  courts: number;
  confirmedRegistrations: number;
  waitlistedRegistrations: number;
  checkedIn: number;
  staffAssigned: number;
  formatCodes: string[];
  minimumAthletes: number;
  automaticGates: UrPlayPreflightAutomaticGate[];
  checks: UrPlayPreflightCheck[];
  criticalReady: number;
  criticalTotal: number;
  supportReady: number;
  supportTotal: number;
  ready: boolean;
};

export type AdminUrPlayPreflightSnapshot = {
  sessions: UrPlayPreflightSession[];
  currentSession: UrPlayPreflightSession | null;
  sourceErrors: string[];
};
