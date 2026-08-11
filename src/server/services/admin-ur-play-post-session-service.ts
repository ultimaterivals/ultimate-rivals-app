import type {
  AdminPostSessionSnapshot,
  PostSessionSession,
  PostSessionTask,
  PostSessionTaskKey,
  PostSessionTaskStatus,
} from "@/features/admin-ur-play-post-session/types";
import { fetchAdminPostSessionRepositoryData } from "@/server/repositories/admin-ur-play-post-session-repository";

export const POST_SESSION_TASKS: Array<{
  key: PostSessionTaskKey;
  label: string;
  description: string;
  sla: string;
}> = [
  {
    key: "ranking_data",
    label: "Dados & Ranking",
    description:
      "Confirma que todas as partidas homologadas foram processadas pelo motor oficial de ranking.",
    sla: "Até 24h",
  },
  {
    key: "ur_coins",
    label: "UR Coins",
    description:
      "Conciliação automática do ledger pelas regras ativas e pelas evidências homologadas de cada partida.",
    sla: "Até 24h",
  },
  {
    key: "finance",
    label: "Financeiro",
    description:
      "Conferir pagamentos, receitas, custos, estornos e divergências da operação.",
    sla: "Até 24h",
  },
  {
    key: "incidents",
    label: "Ocorrências",
    description:
      "Revisar lesões, conflitos, problemas de quadra e demais ocorrências; registrar quando aplicável.",
    sla: "Até 24h",
  },
  {
    key: "development",
    label: "Desenvolvimento & Nivelamento",
    description:
      "Revisar atletas que exigem nivelamento, reavaliação técnica ou acompanhamento de evolução.",
    sla: "Até 24h",
  },
  {
    key: "media",
    label: "Mídia",
    description:
      "Organizar e publicar resultados, destaques, imagens e ativos narrativos da sessão.",
    sla: "Até 48h",
  },
  {
    key: "retention",
    label: "CRM & Retenção",
    description:
      "Executar o próximo contato, estimular segunda participação e tratar atletas em risco de não retornar.",
    sla: "Até 48h",
  },
  {
    key: "feedback",
    label: "Feedback / NPS",
    description:
      "Disparar e registrar o ciclo de feedback da experiência para alimentar melhorias operacionais.",
    sla: "Até 48h",
  },
  {
    key: "report",
    label: "Relatório & Aprendizados",
    description:
      "Consolidar o que funcionou, falhas, decisões e ajustes que devem entrar na próxima sessão.",
    sla: "Até 48h",
  },
];

function int(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdminPostSessionSnapshot(): Promise<AdminPostSessionSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminPostSessionRepositoryData();
  const poles = new Map(raw.poles.map((row) => [row.id, row.name]));
  const venues = new Map(raw.venues.map((row) => [row.id, row.name]));
  const readiness = new Map(
    raw.readiness.map((row) => [row.sessionId, row.row]),
  );
  const closures = new Map(raw.closures.map((row) => [row.session_id, row]));

  const sessions: PostSessionSession[] = raw.sessions.map((session) => {
    const registrations = raw.registrations.filter(
      (row) =>
        row.session_id === session.id &&
        row.registration_status === "confirmed",
    );
    const taskRows = raw.tasks.filter((row) => row.session_id === session.id);
    const tasks: PostSessionTask[] = POST_SESSION_TASKS.flatMap(
      (definition) => {
        const row = taskRows.find((item) => item.task_key === definition.key);
        if (!row) return [];
        return [
          {
            id: row.id,
            key: definition.key,
            status: row.status as PostSessionTaskStatus,
            managedBy: row.managed_by === "system" ? "system" : "human",
            blocking: row.blocking,
            dueAt: row.due_at,
            notes: row.notes,
            evidence: row.evidence ?? {},
            completedAt: row.completed_at,
            waivedAt: row.waived_at,
            waiverReason: row.waiver_reason,
          },
        ];
      },
    );
    const row = readiness.get(session.id);
    const closure = closures.get(session.id);

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      poleName: poles.get(session.pole_id) ?? "Polo",
      venueName: venues.get(session.venue_id) ?? "Local",
      confirmedAthletes: registrations.length,
      presentAthletes: registrations.filter((item) =>
        ["checked_in", "present"].includes(item.attendance_status),
      ).length,
      paymentConfirmed: registrations.filter((item) =>
        ["paid", "not_required", "waived"].includes(item.payment_status),
      ).length,
      paymentPending: registrations.filter(
        (item) => item.payment_status === "pending",
      ).length,
      tasks,
      readiness: {
        totalTasks: int(row?.total_tasks),
        completedTasks: int(row?.completed_tasks),
        waivedTasks: int(row?.waived_tasks),
        pendingTasks: int(row?.pending_tasks),
        overdueTasks: int(row?.overdue_tasks),
        ready: Boolean(row?.ready),
        closed: Boolean(row?.closed),
      },
      closure: closure
        ? {
            status: closure.status === "reopened" ? "reopened" : "closed",
            closedAt: closure.closed_at,
            notes: closure.notes,
            reopenedAt: closure.reopened_at,
            reopenReason: closure.reopen_reason,
          }
        : null,
    };
  });

  return {
    generatedAt,
    sessions,
    metrics: {
      total: sessions.length,
      pending: sessions.filter(
        (session) => !session.readiness.closed && !session.readiness.ready,
      ).length,
      ready: sessions.filter(
        (session) => session.readiness.ready && !session.readiness.closed,
      ).length,
      closed: sessions.filter((session) => session.readiness.closed).length,
      overdue: sessions.filter((session) => session.readiness.overdueTasks > 0)
        .length,
    },
    sourceErrors: raw.errors,
  };
}
