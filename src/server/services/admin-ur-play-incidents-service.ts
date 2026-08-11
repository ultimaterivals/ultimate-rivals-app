import type {
  AdminIncidentDeskSnapshot,
  IncidentDeskIncident,
  IncidentReadiness,
  IncidentReview,
} from "@/features/admin-ur-play-incidents/types";
import { fetchAdminIncidentDeskRepositoryData } from "@/server/repositories/admin-ur-play-incidents-repository";

type ReadinessRow = Record<string, unknown>;

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function booleanValue(value: unknown) {
  return value === true;
}

function mapReadiness(row: ReadinessRow | null): IncidentReadiness | null {
  if (!row) return null;
  return {
    sessionStatus: String(row.session_status ?? ""),
    totalIncidents: numberValue(row.total_incidents),
    openIncidents: numberValue(row.open_incidents),
    monitoringIncidents: numberValue(row.monitoring_incidents),
    resolvedIncidents: numberValue(row.resolved_incidents),
    criticalIncidents: numberValue(row.critical_incidents),
    criticalOpenIncidents: numberValue(row.critical_open_incidents),
    followUpOpen: numberValue(row.follow_up_open),
    reviewConfirmed: booleanValue(row.review_confirmed),
    noIncidentsDeclared: booleanValue(row.no_incidents_declared),
    ready: booleanValue(row.ready),
  };
}

export async function getAdminIncidentDeskSnapshot(
  requestedSessionId?: string,
): Promise<AdminIncidentDeskSnapshot> {
  const raw = await fetchAdminIncidentDeskRepositoryData(requestedSessionId);
  const athletes = new Map(
    raw.athletes.map((athlete) => [athlete.id, athlete]),
  );
  const selectedSession =
    raw.sessions.find((session) => session.id === raw.selectedSessionId) ??
    null;

  const incidents: IncidentDeskIncident[] = raw.incidents.map((incident) => {
    const athlete = incident.athlete_id
      ? athletes.get(incident.athlete_id)
      : null;
    return {
      id: incident.id,
      sessionId: incident.session_id,
      athleteId: incident.athlete_id,
      athleteName: athlete?.public_name ?? null,
      athleteCode: athlete?.athlete_code ?? null,
      type: incident.incident_type as IncidentDeskIncident["type"],
      severity: incident.severity as IncidentDeskIncident["severity"],
      status: incident.status as IncidentDeskIncident["status"],
      occurredAt: incident.occurred_at,
      description: incident.description,
      immediateAction: incident.immediate_action,
      followUpRequired: incident.follow_up_required,
      followUpNotes: incident.follow_up_notes,
      resolutionNotes: incident.resolution_notes,
      resolvedAt: incident.resolved_at,
    };
  });

  const review: IncidentReview | null = raw.review
    ? {
        status: raw.review.status,
        reviewedAt: raw.review.reviewed_at,
        noIncidents: raw.review.no_incidents,
        notes: raw.review.notes,
        reopenedAt: raw.review.reopened_at,
        reopenReason: raw.review.reopen_reason,
      }
    : null;

  return {
    sessions: raw.sessions.map((session) => ({
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
    })),
    selectedSession: selectedSession
      ? {
          id: selectedSession.id,
          name: selectedSession.name,
          status: selectedSession.status,
          startsAt: selectedSession.starts_at,
          endsAt: selectedSession.ends_at,
        }
      : null,
    incidents,
    readiness: mapReadiness(raw.readiness as ReadinessRow | null),
    review,
    sourceErrors: raw.errors,
  };
}
