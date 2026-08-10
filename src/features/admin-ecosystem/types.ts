export type EcosystemEvidenceStatus =
  | "evidence"
  | "no-evidence"
  | "not-instrumented"
  | "unavailable";

export type EcosystemArea = {
  id: string;
  name: string;
  purpose: string;
  href: string | null;
  source: string | null;
  evidenceCount: number | null;
  status: EcosystemEvidenceStatus;
  note: string;
};

export type ManagementCycle = {
  cadence: "Diário" | "Semanal" | "Mensal" | "Trimestral" | "Anual";
  purpose: string;
  items: string[];
};

export type AdminEcosystemSnapshot = {
  areas: EcosystemArea[];
  metrics: {
    totalAreas: number;
    instrumentedAreas: number;
    areasWithEvidence: number;
    areasWithoutEvidence: number;
    notInstrumented: number;
    evidenceCoveragePercent: number | null;
  };
  cycles: ManagementCycle[];
  sourceErrors: string[];
};
