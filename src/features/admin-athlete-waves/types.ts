export type AthleteWaveGateState = "ready" | "pending" | "blocked" | "review";

export type AthleteWaveGate = {
  key: string;
  label: string;
  state: AthleteWaveGateState;
  detail: string;
};

export type AthleteWaveCandidate = {
  athleteId: string;
  athleteCode: string;
  publicName: string;
  status: string;
  gender: string;
  poleId: string | null;
  poleName: string | null;
  readyToActivate: boolean;
  activationBlockers: string[];
  linked: boolean;
  inviteActive: boolean;
  inviteExpiresAt: string | null;
  availabilityCount: number;
  importSourceRow: number | null;
  importValidationStatus: string | null;
  selectionEvidence: "admin_decision_required";
};

export type AthleteActivationWaveMember = AthleteWaveCandidate & {
  selectionReason: string;
  priority: number;
  selectedAt: string;
  readyForPilot: boolean;
  gates: AthleteWaveGate[];
};

export type AthleteActivationWave = {
  id: string;
  name: string;
  targetSize: number;
  poleId: string | null;
  poleName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  members: AthleteActivationWaveMember[];
  selectedCount: number;
  readyCount: number;
};

export type AdminAthleteWavesSnapshot = {
  generatedAt: string;
  waves: AthleteActivationWave[];
  candidates: AthleteWaveCandidate[];
  metrics: {
    wavesOpen: number;
    selected: number;
    active: number;
    linked: number;
    categoryReady: number;
    availabilityReady: number;
    pilotReady: number;
  };
  sourceErrors: string[];
};

export type WaveInviteBundleItem = {
  athleteId: string;
  athleteCode: string;
  publicName: string;
  invitePath: string;
  expiresAt: string;
};

export type WaveInviteBundleState = {
  status: "idle" | "success" | "error";
  invites: WaveInviteBundleItem[];
  message: string | null;
};
