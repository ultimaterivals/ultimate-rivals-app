export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "monitoring" | "resolved" | "closed_no_action";
export type IncidentType =
  | "injury"
  | "medical"
  | "conflict"
  | "behavior"
  | "court_safety"
  | "equipment"
  | "operational"
  | "other";

export type IncidentDeskSession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

export type IncidentDeskIncident = {
  id: string;
  sessionId: string;
  athleteId: string | null;
  athleteName: string | null;
  athleteCode: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string;
  description: string;
  immediateAction: string | null;
  followUpRequired: boolean;
  followUpNotes: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
};

export type IncidentReadiness = {
  sessionStatus: string;
  totalIncidents: number;
  openIncidents: number;
  monitoringIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  criticalOpenIncidents: number;
  followUpOpen: number;
  reviewConfirmed: boolean;
  noIncidentsDeclared: boolean;
  ready: boolean;
};

export type IncidentReview = {
  status: string;
  reviewedAt: string;
  noIncidents: boolean;
  notes: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
};

export type AdminIncidentDeskSnapshot = {
  sessions: IncidentDeskSession[];
  selectedSession: IncidentDeskSession | null;
  incidents: IncidentDeskIncident[];
  readiness: IncidentReadiness | null;
  review: IncidentReview | null;
  sourceErrors: string[];
};
