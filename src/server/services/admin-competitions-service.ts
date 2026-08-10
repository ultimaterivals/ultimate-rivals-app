import type {
  AdminCompetitionsSnapshot,
  CompetitionGateItem,
} from "@/features/admin-competitions/types";
import { fetchAdminCompetitionsRepositoryData } from "@/server/repositories/admin-competitions-repository";

export async function getAdminCompetitionsSnapshot(): Promise<AdminCompetitionsSnapshot> {
  const raw = await fetchAdminCompetitionsRepositoryData();
  const divisionsByTournament = new Map<string, string[]>();
  for (const division of raw.divisions ?? []) {
    const current = divisionsByTournament.get(division.tournament_id) ?? [];
    current.push(division.id);
    divisionsByTournament.set(division.tournament_id, current);
  }

  const competitions = (raw.tournaments ?? []).map((tournament) => {
    const divisionIds = new Set(divisionsByTournament.get(tournament.id) ?? []);
    const registrations = (raw.registrations ?? []).filter((registration) =>
      divisionIds.has(registration.division_id),
    );
    const matches = (raw.matches ?? []).filter((match) =>
      divisionIds.has(match.division_id),
    );
    const staffAssignments = (raw.staff ?? []).filter(
      (staff) =>
        staff.tournament_id === tournament.id && staff.status !== "cancelled",
    ).length;
    const prizePlans = (raw.prizes ?? []).filter(
      (plan) => plan.tournament_id === tournament.id && plan.status !== "void",
    ).length;
    const openChecklistItems = tournament.calendar_event_id
      ? (raw.checklists ?? []).filter(
          (item) =>
            item.calendar_event_id === tournament.calendar_event_id &&
            item.status !== "completed" &&
            item.status !== "waived",
        ).length
      : 0;
    const eligibleRegistrations = registrations.filter(
      (registration) =>
        registration.eligibility_status === "eligible" ||
        registration.eligibility_status === "approved",
    ).length;

    const gate: CompetitionGateItem[] = [
      {
        key: "date",
        label: "Data",
        complete: Boolean(tournament.starts_at && tournament.ends_at),
        detail:
          tournament.starts_at && tournament.ends_at
            ? "Período definido"
            : "Definir período",
      },
      {
        key: "venue",
        label: "Quadra",
        complete: Boolean(tournament.venue_id),
        detail: tournament.venue_id ? "Local vinculado" : "Vincular local",
      },
      {
        key: "divisions",
        label: "Divisões",
        complete: divisionIds.size > 0,
        detail: `${divisionIds.size} divisão(ões)`,
      },
      {
        key: "registration",
        label: "Inscrições",
        complete: registrations.length > 0,
        detail: `${registrations.length} inscrição(ões)`,
      },
      {
        key: "prize",
        label: "Premiação",
        complete: prizePlans > 0,
        detail: prizePlans > 0 ? `${prizePlans} plano(s)` : "Sem plano",
      },
      {
        key: "staff",
        label: "Staff",
        complete: staffAssignments > 0,
        detail: `${staffAssignments} designação(ões)`,
      },
      {
        key: "checklist",
        label: "Checklist",
        complete: openChecklistItems === 0,
        detail:
          openChecklistItems === 0
            ? "Sem pendências"
            : `${openChecklistItems} pendência(s)`,
      },
    ];
    const readiness = Math.round(
      (gate.filter((item) => item.complete).length / gate.length) * 100,
    );

    return {
      id: tournament.id,
      product: tournament.product,
      name: tournament.name,
      status: tournament.status,
      startsAt: tournament.starts_at,
      endsAt: tournament.ends_at,
      poleId: tournament.pole_id,
      venueId: tournament.venue_id,
      calendarEventId: tournament.calendar_event_id,
      divisions: divisionIds.size,
      registrations: registrations.length,
      eligibleRegistrations,
      matches: matches.length,
      staffAssignments,
      prizePlans,
      openChecklistItems,
      gate,
      readiness,
    };
  });

  return {
    competitions,
    metrics: {
      competitions: competitions.length,
      published: competitions.filter((item) =>
        [
          "published",
          "registration_open",
          "in_progress",
          "completed",
          "official",
        ].includes(item.status),
      ).length,
      registrations: competitions.reduce(
        (sum, item) => sum + item.registrations,
        0,
      ),
      matches: competitions.reduce((sum, item) => sum + item.matches, 0),
      gatesReady: competitions.filter((item) => item.readiness === 100).length,
    },
    sourceErrors: raw.errors,
  };
}
