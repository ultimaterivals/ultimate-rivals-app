import type {
  AdminCommandSnapshot,
  CommandAction,
  CommandAlert,
  CommandDemandSignal,
  CommandEvent,
  CommandFunnel,
  CommandSeason,
} from "@/features/admin-command/types";
import {
  fetchAdminCommandRepositoryData,
  type RawAcquisitionRow,
} from "@/server/repositories/admin-command-repository";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const HOUR = 60 * 60 * 1000;

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function sumAcquisition(rows: RawAcquisitionRow[]): CommandFunnel {
  return rows.reduce<CommandFunnel>(
    (total, row) => ({
      visitors: total.visitors + (row.visitors ?? 0),
      signups: total.signups + (row.signups ?? 0),
      interests: total.interests + (row.interests ?? 0),
      reservations: total.reservations + (row.reservations ?? 0),
      firstParticipation:
        total.firstParticipation + (row.first_participation ?? 0),
      secondParticipation:
        total.secondParticipation + (row.second_participation ?? 0),
      returning: total.returning + (row.returning ?? 0),
    }),
    {
      visitors: 0,
      signups: 0,
      interests: 0,
      reservations: 0,
      firstParticipation: 0,
      secondParticipation: 0,
      returning: 0,
    },
  );
}

export async function getAdminCommandSnapshot(
  now = new Date(),
): Promise<AdminCommandSnapshot> {
  const raw = await fetchAdminCommandRepositoryData(now);
  const today = dateKey(now);

  const season: CommandSeason | null = raw.season
    ? {
        id: raw.season.id,
        name: raw.season.name,
        code: raw.season.code,
        status: raw.season.status,
        startsAt: raw.season.starts_at,
        endsAt: raw.season.ends_at,
      }
    : null;

  const upcomingEvents: CommandEvent[] = (raw.calendar ?? []).map((event) => ({
    id: event.id,
    name: event.name,
    eventType: event.event_type,
    status: event.status,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    poleName: event.pole_name,
    venueName: event.venue_name,
    openChecklistItems: event.open_checklist_items ?? 0,
    conflictCount: event.conflict_count ?? 0,
  }));

  const demand: CommandDemandSignal[] = (raw.demand ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    signal: item.demand_signal,
    startsAt: item.starts_at,
    endsAt: item.ends_at,
    poleName: item.pole_name,
    venueName: item.venue_name,
    interestedCount: item.interested_count ?? 0,
    readyFormations: item.ready_formations ?? 0,
    targetFormations: item.target_formations,
    reservedCount: item.reserved_count ?? 0,
    waitlistCount: item.waitlist_count ?? 0,
    remainingCapacity: item.remaining_capacity ?? 0,
  }));

  const todayEvents = raw.calendar
    ? upcomingEvents.filter(
        (event) => dateKey(new Date(event.startsAt)) === today,
      ).length
    : null;

  const overdueAmount = raw.overduePayments
    ? raw.overduePayments.reduce(
        (total, payment) => total + toNumber(payment.amount),
        0,
      )
    : null;

  const openObligationsAmount = raw.obligations
    ? raw.obligations.reduce(
        (total, obligation) => total + toNumber(obligation.amount),
        0,
      )
    : null;

  const alerts: CommandAlert[] = [];

  for (const event of upcomingEvents) {
    if (event.conflictCount > 0) {
      alerts.push({
        id: `event-conflict-${event.id}`,
        severity: "critical",
        title: `Conflito na agenda: ${event.name}`,
        detail: `${event.conflictCount} conflito(s) operacional(is) detectado(s).`,
        href: "/admin/agenda",
      });
    }

    const hoursUntilEvent =
      (new Date(event.startsAt).getTime() - now.getTime()) / HOUR;
    if (
      hoursUntilEvent >= 0 &&
      hoursUntilEvent <= 48 &&
      event.openChecklistItems > 0
    ) {
      alerts.push({
        id: `event-checklist-${event.id}`,
        severity: "attention",
        title: `Checklist aberto: ${event.name}`,
        detail: `${event.openChecklistItems} item(ns) ainda precisam ser concluídos antes da operação.`,
        href: "/admin/agenda",
      });
    }
  }

  for (const item of demand) {
    if (item.signal === "SECOND_COURT_OPPORTUNITY") {
      alerts.push({
        id: `demand-second-court-${item.id}`,
        severity: "opportunity",
        title: `Demanda para expansão: ${item.title}`,
        detail: `${item.interestedCount} interessado(s), ${item.waitlistCount} em espera. Avalie uma segunda quadra.`,
        href: "/admin/agenda",
      });
    } else if (item.signal === "READY_TO_OPEN") {
      alerts.push({
        id: `demand-ready-${item.id}`,
        severity: "opportunity",
        title: `Sessão pronta para avaliação: ${item.title}`,
        detail: `${item.interestedCount} interessado(s) já formam sinal suficiente para abertura.`,
        href: "/admin/agenda",
      });
    } else if (item.signal === "ALMOST_FULL") {
      alerts.push({
        id: `demand-almost-full-${item.id}`,
        severity: "attention",
        title: `Últimas vagas: ${item.title}`,
        detail: `${item.readyFormations}/${item.targetFormations} formações prontas.`,
        href: "/admin/agenda",
      });
    }
  }

  if (raw.overduePayments && raw.overduePayments.length > 0) {
    alerts.push({
      id: "payments-overdue",
      severity: "attention",
      title: "Cobranças vencidas exigem revisão",
      detail: `${raw.overduePayments.length} cobrança(s) somando R$ ${overdueAmount?.toFixed(2)}.`,
      href: "/admin/financeiro",
    });
  }

  if (raw.firstParticipationOnly && raw.firstParticipationOnly > 0) {
    alerts.push({
      id: "athletes-first-only",
      severity: "attention",
      title: "Atletas ainda não chegaram à segunda participação",
      detail: `${raw.firstParticipationOnly} atleta(s) precisam de acompanhamento de ativação.`,
      href: "/admin/atletas",
    });
  }

  const actions: CommandAction[] = [];

  if (!season) {
    actions.push({
      id: "configure-season",
      priority: "high",
      title: "Configurar a temporada operacional",
      detail: "Nenhuma temporada atual foi encontrada na fonte de dados.",
      href: "/admin/ecossistema",
    });
  }

  const criticalAlert = alerts.find((alert) => alert.severity === "critical");
  if (criticalAlert) {
    actions.push({
      id: `action-${criticalAlert.id}`,
      priority: "high",
      title: criticalAlert.title,
      detail: criticalAlert.detail,
      href: criticalAlert.href,
    });
  }

  const expansion = alerts.find(
    (alert) =>
      alert.id.startsWith("demand-second-court") ||
      alert.id.startsWith("demand-ready"),
  );
  if (expansion) {
    actions.push({
      id: `action-${expansion.id}`,
      priority: "medium",
      title: expansion.title,
      detail: expansion.detail,
      href: expansion.href,
    });
  }

  if (raw.firstParticipationOnly && raw.firstParticipationOnly > 0) {
    actions.push({
      id: "action-second-participation",
      priority: "medium",
      title: "Conduzir atletas à segunda participação",
      detail: `${raw.firstParticipationOnly} atleta(s) estão no principal ponto de ativação do funil.`,
      href: "/admin/atletas",
    });
  }

  if (raw.overduePayments && raw.overduePayments.length > 0) {
    actions.push({
      id: "action-overdue-payments",
      priority: "medium",
      title: "Revisar cobranças vencidas",
      detail: `${raw.overduePayments.length} cobrança(s) estão pendentes ou submetidas após o vencimento.`,
      href: "/admin/financeiro",
    });
  }

  if (raw.calendar && raw.calendar.length === 0) {
    actions.push({
      id: "action-plan-calendar",
      priority: "normal",
      title: "Planejar os próximos 7 dias",
      detail:
        "Nenhuma operação futura foi encontrada na agenda para a próxima semana.",
      href: "/admin/agenda",
    });
  }

  const hasAnyData = Boolean(
    season ||
    raw.calendar?.length ||
    raw.demand?.length ||
    raw.acquisition?.length ||
    raw.activeAthletes30d ||
    raw.overduePayments?.length ||
    raw.obligations?.length,
  );

  return {
    generatedAt: now.toISOString(),
    status: raw.errors.length > 0 ? "partial" : hasAnyData ? "ready" : "empty",
    season,
    metrics: {
      todayEvents,
      next7DaysEvents: raw.calendar ? raw.calendar.length : null,
      activeAthletes30d: raw.activeAthletes30d,
      revenue: raw.summary ? toNumber(raw.summary.revenue) : null,
      expenses: raw.summary ? toNumber(raw.summary.expenses) : null,
      firstParticipationOnly: raw.firstParticipationOnly,
      overduePayments: raw.overduePayments ? raw.overduePayments.length : null,
      overdueAmount,
      openObligations: raw.obligations ? raw.obligations.length : null,
      openObligationsAmount,
    },
    funnel: raw.acquisition ? sumAcquisition(raw.acquisition) : null,
    upcomingEvents,
    demand,
    alerts: alerts.slice(0, 8),
    actions: actions.slice(0, 5),
    sourceErrors: raw.errors,
  };
}
