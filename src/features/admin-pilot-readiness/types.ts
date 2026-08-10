export type PilotReadinessState = "ready" | "blocked" | "attention";

export type PilotReadinessGate = {
  key: string;
  label: string;
  state: PilotReadinessState;
  detail: string;
  href: string;
  actionLabel: string;
};

export type AdminPilotReadinessSnapshot = {
  generatedAt: string;
  status: "go" | "no_go";
  readyGates: number;
  totalGates: number;
  currentWave: {
    id: string;
    name: string;
    status: string;
    targetSize: number;
    selectedCount: number;
    readyCount: number;
    poleId: string | null;
    poleName: string | null;
  } | null;
  targetSession: {
    id: string;
    name: string;
    status: string;
    startsAt: string;
    poleId: string;
    poleName: string;
    venueName: string;
    courts: number;
  } | null;
  gates: PilotReadinessGate[];
  nextAction: PilotReadinessGate | null;
  sourceErrors: string[];
};
