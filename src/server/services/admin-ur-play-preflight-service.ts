import type {
  AdminUrPlayPreflightSnapshot,
  UrPlayPreflightCheck,
  UrPlayPreflightCheckKey,
  UrPlayPreflightSession,
} from "@/features/admin-ur-play-preflight/types";
import { fetchAdminUrPlayPreflightRepositoryData } from "@/server/repositories/admin-ur-play-preflight-repository";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";

type CheckDefinition = {
  key: UrPlayPreflightCheckKey;
  label: string;
  description: string;
  critical: boolean;
};

export const urPlayPreflightCheckDefinitions: readonly CheckDefinition[] = [
  {
    key: "court_access_confirmed",
    label: "Acesso à quadra confirmado",
    description:
      "Reserva, responsável do espaço e horário de entrada foram conferidos.",
    critical: true,
  },
  {
    key: "balls_score_ready",
    label: "Bolas e controle de placar prontos",
    description:
      "Bolas, placar/apito e material mínimo da quadra estão disponíveis.",
    critical: true,
  },
  {
    key: "first_aid_ready",
    label: "Primeiros socorros disponíveis",
    description:
      "Kit básico e procedimento de resposta a ocorrência foram conferidos.",
    critical: true,
  },
  {
    key: "device_offline_ready",
    label: "Dispositivo e modo offline testados",
    description:
      "Celular/tablet, bateria, carregamento e operação offline foram testados antes da sessão.",
    critical: true,
  },
  {
    key: "operation_owner_ready",
    label: "Responsável da operação definido",
    description:
      "Existe uma pessoa claramente responsável por conduzir a sessão e decidir exceções.",
    critical: true,
  },
  {
    key: "athlete_briefing_ready",
    label: "Briefing dos atletas preparado",
    description:
      "Horário, local, formato, check-in e orientações essenciais foram confirmados para os participantes.",
    critical: true,
  },
  {
    key: "media_ready",
    label: "Plano de mídia pronto",
    description:
      "Captação mínima, responsáveis e momentos prioritários foram definidos quando houver mídia.",
    critical: false,
  },
  {
    key: "reception_ready",
    label: "Recepção e identificação prontas",
    description:
      "Fluxo de chegada, chamada e orientação inicial foi organizado.",
    critical: false,
  },
  {
    key: "water_support_ready",
    label: "Água e suporte conferidos",
    description:
      "Condições básicas de hidratação e apoio operacional foram verificadas.",
    critical: false,
  },
] as const;

const statusPriority = new Map([
  ["in_progress", 0],
  ["checkin_open", 1],
  ["registration_closed", 2],
  ["registration_open", 3],
  ["published", 4],
  ["draft", 5],
]);

export async function getAdminUrPlayPreflightSnapshot(
  now = new Date(),
): Promise<AdminUrPlayPreflightSnapshot> {
  const courtOps = await getAdminCourtOpsSnapshot(now);
  const sessions = courtOps.sessions
    .filter((session) => !["completed", "cancelled"].includes(session.status))
    .sort((a, b) => {
      const status =
        (statusPriority.get(a.status) ?? 9) -
        (statusPriority.get(b.status) ?? 9);
      if (status !== 0) return status;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  const raw = await fetchAdminUrPlayPreflightRepositoryData(
    sessions.map((session) => session.id),
  );

  const formatCodes = new Map(
    courtOps.formats.map((format) => [format.id, format.code]),
  );

  const mapped: UrPlayPreflightSession[] = sessions.map((session) => {
    const sessionChecks = raw.checks.filter(
      (check) => check.session_id === session.id,
    );
    const checks: UrPlayPreflightCheck[] = urPlayPreflightCheckDefinitions.map(
      (definition) => {
        const stored = sessionChecks.find(
          (check) => check.check_key === definition.key,
        );
        return {
          ...definition,
          checked: Boolean(stored?.is_checked),
          note: stored?.note ? String(stored.note) : null,
          updatedAt: stored?.updated_at ? String(stored.updated_at) : null,
        };
      },
    );

    const registrations = raw.registrations.filter(
      (registration) => registration.session_id === session.id,
    );
    const confirmedRegistrations = registrations.filter(
      (registration) => registration.registration_status === "confirmed",
    ).length;
    const waitlistedRegistrations = registrations.filter(
      (registration) => registration.registration_status === "waitlisted",
    ).length;
    const checkedIn = raw.checkins.filter(
      (checkin) =>
        checkin.session_id === session.id && checkin.status === "active",
    ).length;
    const staffAssigned = raw.staff.filter((staff) => {
      if (staff.session_id !== session.id || staff.status !== "active") return false;
      const startsAt = new Date(staff.starts_at).getTime();
      const endsAt = staff.ends_at ? new Date(staff.ends_at).getTime() : null;
      return startsAt <= now.getTime() && (endsAt === null || endsAt > now.getTime());
    }).length;
    const sessionFormatCodes = [
      ...new Set(
        raw.scopes
          .filter((scope) => scope.session_id === session.id)
          .map((scope) => formatCodes.get(scope.format_id))
          .filter((code): code is string => Boolean(code)),
      ),
    ];
    const minimumAthletes = sessionFormatCodes.includes("fours")
      ? 8
      : sessionFormatCodes.includes("doubles")
        ? 4
        : 0;

    const automaticGates = [
      {
        key: "session" as const,
        label: "Sessão operacional",
        ready: [
          "published",
          "registration_open",
          "registration_closed",
          "checkin_open",
          "in_progress",
        ].includes(session.status),
        detail: `Status atual: ${session.status}.`,
      },
      {
        key: "court" as const,
        label: "Quadra vinculada",
        ready: session.courts.length > 0,
        detail:
          session.courts.length > 0
            ? `${session.courts.length} quadra(s) ativa(s) vinculada(s).`
            : "Nenhuma quadra ativa está vinculada à sessão.",
      },
      {
        key: "participants" as const,
        label: "Grupo mínimo confirmado",
        ready:
          minimumAthletes > 0 && confirmedRegistrations >= minimumAthletes,
        detail:
          minimumAthletes > 0
            ? `${confirmedRegistrations}/${minimumAthletes} atletas confirmados para formar ao menos um confronto completo.`
            : "O formato da sessão ainda não permite calcular o grupo mínimo.",
      },
    ];

    const critical = checks.filter((check) => check.critical);
    const support = checks.filter((check) => !check.critical);

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      poleName: session.poleName,
      venueName: session.venueName,
      courts: session.courts.length,
      confirmedRegistrations,
      waitlistedRegistrations,
      checkedIn,
      staffAssigned,
      formatCodes: sessionFormatCodes,
      minimumAthletes,
      automaticGates,
      checks,
      criticalReady: critical.filter((check) => check.checked).length,
      criticalTotal: critical.length,
      supportReady: support.filter((check) => check.checked).length,
      supportTotal: support.length,
      ready:
        automaticGates.every((gate) => gate.ready) &&
        critical.every((check) => check.checked),
    };
  });

  return {
    sessions: mapped,
    currentSession: mapped[0] ?? null,
    sourceErrors: [...new Set([...courtOps.sourceErrors, ...raw.errors])],
  };
}
